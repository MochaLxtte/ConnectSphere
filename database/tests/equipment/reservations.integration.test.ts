import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import type { EquipmentReservationContext } from '../../../backend/src/modules/equipment/reservation-types.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let technician: WorkflowActor;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
const start = '2031-01-12T02:00:00.000000Z';
const end = '2031-01-12T06:00:00.000000Z';
const base = '/api/equipment/reservations/events';

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  technician = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
});
afterAll(async () => { await fixture?.destroy(); });

function app(actor: WorkflowActor | null = technician) {
  // Substitute identity only: services, transactions, triggers and constraints use real PostgreSQL.
  return createApp({ database: fixture.pool, workspace: { pool: fixture.pool, authenticate: async () => actor } });
}

async function event(startsAt = start, endsAt = end) {
  return fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id,
    status: 'APPROVED', startsAt, endsAt, name: `Reservation ${randomUUID()}` });
}

async function equipment(total = 10, damaged = 2, maintenance = 1) {
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO equipment_types
    (id,name,total_quantity,damaged_quantity,maintenance_quantity) VALUES($1,$2,$3,$4,$5)`,
  [id, `Equipment ${id}`, total, damaged, maintenance]);
  return id;
}

async function line(eventId: string, typeId: string, quantity: number, startsAt = start, endsAt = end) {
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO equipment_requests
    (id,event_request_id,equipment_type_id,requested_by,quantity,starts_at,ends_at,notes)
    VALUES($1,$2,$3,$4,$5,$6,$7,'Fixture requirement')`,
  [id, eventId, typeId, coordinator.id, quantity, startsAt, endsAt]);
  return id;
}

async function context(eventId: string): Promise<EquipmentReservationContext> {
  const response = await request(app()).get(`${base}/${eventId}`).expect(200);
  expect(response.headers['cache-control']).toBe('no-store');
  return response.body;
}

async function reserve(eventId: string, requestId: string, version?: string) {
  const requirementsVersion = version ?? (await context(eventId)).requirementsVersion;
  return request(app()).post(`${base}/${eventId}/requests/${requestId}/reserve`).send({ requirementsVersion });
}

async function cancel(eventId: string, requestId: string, reason = 'Equipment is no longer needed.', version?: string) {
  const requirementsVersion = version ?? (await context(eventId)).requirementsVersion;
  return request(app()).post(`${base}/${eventId}/requests/${requestId}/cancel`).send({ requirementsVersion, reason });
}

async function row(id: string) {
  return (await fixture.pool.query('SELECT * FROM equipment_requests WHERE id=$1', [id])).rows[0];
}

async function snapshot(eventId: string) {
  return {
    event: await fixture.eventRow(eventId),
    lines: (await fixture.pool.query('SELECT * FROM equipment_requests WHERE event_request_id=$1 ORDER BY id', [eventId])).rows,
    history: await fixture.history(eventId),
    notifications: (await fixture.pool.query('SELECT * FROM notifications WHERE event_request_id=$1 ORDER BY id', [eventId])).rows,
  };
}

async function waitForLock(queryFragment: string) {
  const applicationName = new URL(fixture.pool.options.connectionString!).searchParams.get('application_name');
  for (let attempt = 0; attempt < 100; attempt++) {
    const waiting = await fixture.pool.query(`SELECT 1 FROM pg_stat_activity
      WHERE application_name=$1 AND wait_event_type='Lock' AND strpos(query,$2)>0`, [applicationName, queryFragment]);
    if (waiting.rows.length) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error(`The competing reservation did not wait on its expected lock: ${queryFragment}`);
}

describe('KAN-26 equipment reservations against real PostgreSQL', () => {
  it('reserves the full saved quantity independently of venue approval and persists one decision plus recipient notices', async () => {
    const id = await event();
    const type = await equipment();
    const requestId = await line(id, type, 7);
    const before = await context(id);
    expect(before.readiness.status).toBe('PENDING');
    const response = await reserve(id, requestId, before.requirementsVersion);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ changed: true, context: { readiness: { status: 'READY' } } });
    expect(await row(requestId)).toMatchObject({ status: 'RESERVED', quantity: 7, decided_by: technician.id,
      released_at: null, release_cause: null, event_request_id: id, equipment_type_id: type });
    expect((await row(requestId)).decided_at).toBeInstanceOf(Date);
    expect((await context(id)).requests[0]).toMatchObject({ id: requestId, status: 'RESERVED', canReserve: false, canCancel: true });
    expect((await fixture.eventRow(id)).status).toBe('APPROVED');
    expect((await fixture.pool.query('SELECT * FROM venue_bookings WHERE event_request_id=$1', [id])).rows).toEqual([]);
    const notices = (await fixture.pool.query('SELECT recipient_id,equipment_request_id FROM notifications WHERE event_request_id=$1', [id])).rows;
    expect(notices).toEqual(expect.arrayContaining([
      { recipient_id: coordinator.id, equipment_request_id: requestId },
      { recipient_id: technician.id, equipment_request_id: requestId },
    ]));
    expect(notices).toHaveLength(2);
    const retry = await reserve(id, requestId, before.requirementsVersion);
    expect(retry.status).toBe(200);
    expect(retry.body.changed).toBe(false);
    expect((await fixture.notifications(id))).toHaveLength(2);
  });

  it('serializes competing events and reserves at most operational stock', async () => {
    const type = await equipment(7, 1, 1);
    const a = await event(); const b = await event();
    const ar = await line(a, type, 3); const br = await line(b, type, 3);
    const [ac, bc] = await Promise.all([context(a), context(b)]);
    const results = await Promise.all([reserve(a, ar, ac.requirementsVersion), reserve(b, br, bc.requirementsVersion)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(results.find(r => r.status === 409)?.body.error.code).toBe('EQUIPMENT_STOCK_CONFLICT');
    const committed = await fixture.pool.query("SELECT quantity FROM equipment_requests WHERE equipment_type_id=$1 AND status='RESERVED'", [type]);
    expect(committed.rows).toEqual([{ quantity: 3 }]);
    expect((await fixture.pool.query('SELECT total_quantity FROM equipment_types WHERE id=$1', [type])).rows).toEqual([{ total_quantity: 7 }]);
  });

  it('makes concurrent retries on the same line idempotent without duplicate notices', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 3);
    const version = (await context(id)).requirementsVersion;
    const results = await Promise.all([reserve(id, requestId, version), reserve(id, requestId, version)]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(results.map(r => r.body.changed).sort()).toEqual([false, true]);
    expect(await fixture.notifications(id)).toHaveLength(2);
    expect((await row(requestId)).status).toBe('RESERVED');
  });

  it('manually cancels once, preserves the reservation decision and never increments stock', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 3);
    expect((await reserve(id, requestId)).status).toBe(200);
    const reserved = await row(requestId);
    const version = (await context(id)).requirementsVersion;
    const response = await cancel(id, requestId, '  Replacement required.  ', version);
    expect(response.status).toBe(200);
    expect(response.body.changed).toBe(true);
    const released = await row(requestId);
    expect(released).toMatchObject({ status: 'CANCELLED', release_cause: 'MANUAL_CANCELLATION',
      release_reason: 'Replacement required.', released_by: technician.id,
      decided_by: reserved.decided_by, decided_at: reserved.decided_at, quantity: reserved.quantity });
    expect(released.released_at).toBeInstanceOf(Date);
    expect((await cancel(id, requestId, 'Replacement required.', version)).body.changed).toBe(false);
    expect(await row(requestId)).toEqual(released);
    expect((await context(id)).readiness.status).toBe('NO_REQUIREMENTS');
    expect((await fixture.pool.query('SELECT total_quantity FROM equipment_types WHERE id=$1', [type])).rows).toEqual([{ total_quantity: 10 }]);
    expect((await reserve(id, requestId)).status).toBe(409);
  });

  it('releases on actual cancellation and completion transitions once, preserving other events and unknown actors', async () => {
    const type = await equipment(20, 0, 0);
    const ids = await Promise.all([event(), event(), event()]);
    const lines = await Promise.all(ids.map(id => line(id, type, 2)));
    for (let i = 0; i < ids.length; i++) expect((await reserve(ids[i]!, lines[i]!)).status).toBe(200);
    const decisions = await Promise.all(lines.map(row));
    // Real SQL transitions exercise the migration hook. The absent lifecycle API/UI is not simulated.
    const client = await fixture.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.actor_id',$1,true)", [coordinator.id]);
      await client.query("UPDATE event_requests SET status='CANCELLED' WHERE id=$1", [ids[0]]);
      await client.query('COMMIT');
    } finally { client.release(); }
    await fixture.pool.query("UPDATE event_requests SET status='CONFIRMED' WHERE id=$1", [ids[1]]);
    await fixture.pool.query("UPDATE event_requests SET status='COMPLETED' WHERE id=$1", [ids[1]]);
    const releasedA = await row(lines[0]!); const releasedB = await row(lines[1]!);
    expect(releasedA).toMatchObject({ status: 'CANCELLED', release_cause: 'EVENT_CANCELLED', released_by: coordinator.id,
      decided_by: decisions[0].decided_by, decided_at: decisions[0].decided_at });
    expect(releasedB).toMatchObject({ status: 'CANCELLED', release_cause: 'EVENT_COMPLETED', released_by: null,
      decided_by: decisions[1].decided_by, decided_at: decisions[1].decided_at });
    await fixture.pool.query("UPDATE event_requests SET status='CANCELLED' WHERE id=$1", [ids[0]]);
    await fixture.pool.query("UPDATE event_requests SET status='COMPLETED' WHERE id=$1", [ids[1]]);
    expect(await row(lines[0]!)).toEqual(releasedA); expect(await row(lines[1]!)).toEqual(releasedB);
    expect(await row(lines[2]!)).toEqual(decisions[2]);
    expect((await fixture.pool.query('SELECT total_quantity FROM equipment_types WHERE id=$1', [type])).rows).toEqual([{ total_quantity: 20 }]);
  });

  it('allows exact half-open adjacency and refuses a one-microsecond overlap', async () => {
    const boundary = '2031-01-12T04:00:00.000501Z';
    const beforeBoundary = '2031-01-12T04:00:00.000500Z';
    const type = await equipment(5, 0, 0);
    const first = await event(start, boundary); const second = await event(boundary, end);
    const overlapping = await event(beforeBoundary, end);
    const firstLine = await line(first, type, 5, start, boundary);
    const secondLine = await line(second, type, 5, boundary, end);
    const overlapLine = await line(overlapping, type, 1, beforeBoundary, end);
    expect((await reserve(first, firstLine)).status).toBe(200);
    expect((await reserve(second, secondLine)).status).toBe(200);
    expect((await context(first)).requests[0]?.endsAt).toBe(boundary);
    const denied = await reserve(overlapping, overlapLine);
    expect(denied.status).toBe(409);
    expect(denied.body.error.code).toBe('EQUIPMENT_STOCK_CONFLICT');
    expect((await row(overlapLine)).status).toBe('REQUESTED');
  });

  it('uses peak simultaneous consumption rather than summing disjoint reservations', async () => {
    const middle = '2031-01-12T04:00:00.000000Z';
    const type = await equipment(10, 2, 1);
    const first = await event(start, middle); const second = await event(middle, end); const target = await event();
    const a = await line(first, type, 4, start, middle); const b = await line(second, type, 3, middle, end);
    const c = await line(target, type, 3);
    expect((await reserve(first, a)).status).toBe(200);
    expect((await reserve(second, b)).status).toBe(200);
    expect((await reserve(target, c)).status).toBe(200);
    expect((await context(target)).readiness.status).toBe('READY');
  });

  it('requires every active full line and current stock for readiness, without treating empty requirements as ready', async () => {
    const id = await event(); const a = await equipment(); const b = await equipment();
    expect((await context(id)).readiness).toMatchObject({ status: 'NO_REQUIREMENTS', activeCount: 0, reservedCount: 0 });
    const ar = await line(id, a, 3); const br = await line(id, b, 2);
    expect((await reserve(id, ar)).body.context.readiness).toMatchObject({ status: 'PENDING', activeCount: 2, reservedCount: 1 });
    expect((await reserve(id, br)).body.context.readiness).toMatchObject({ status: 'READY', activeCount: 2, reservedCount: 2 });
    const reserved = await row(ar);
    // A later operational loss preserves the reservation and makes its fulfilment visibly unsafe.
    await fixture.pool.query('UPDATE equipment_types SET damaged_quantity=8 WHERE id=$1', [a]);
    expect((await context(id)).readiness.status).toBe('SHORTFALL');
    expect(await row(ar)).toEqual(reserved);
    await fixture.pool.query('UPDATE equipment_types SET damaged_quantity=2 WHERE id=$1', [a]);
    expect((await context(id)).readiness.status).toBe('READY');
    await fixture.pool.query('UPDATE equipment_types SET is_active=false WHERE id=$1', [b]);
    expect((await context(id)).readiness.status).toBe('SHORTFALL');
    expect((await row(br)).status).toBe('RESERVED');
  });

  it('refuses stale saved requirements without overwriting a newer quantity or creating notifications', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 3);
    const version = (await context(id)).requirementsVersion;
    await fixture.pool.query('UPDATE equipment_requests SET quantity=4 WHERE id=$1', [requestId]);
    const before = await snapshot(id);
    const result = await reserve(id, requestId, version);
    expect(result.status).toBe(409); expect(result.body.error.code).toBe('EQUIPMENT_CONTEXT_CHANGED');
    expect(await snapshot(id)).toEqual(before);
  });

  it('refuses old successful reserve and cancellation replays after another saved requirement changes', async () => {
    const id = await event(); const type = await equipment();
    const requestId = await line(id, type, 2); const otherLine = await line(id, type, 1);
    const reserveVersion = (await context(id)).requirementsVersion;
    const reserved = await reserve(id, requestId, reserveVersion);
    expect(reserved.status).toBe(200); expect(reserved.body.changed).toBe(true);
    await fixture.pool.query('UPDATE equipment_requests SET quantity=2 WHERE id=$1', [otherLine]);
    const beforeReserveReplay = await snapshot(id);
    const reserveReplay = await reserve(id, requestId, reserveVersion);
    expect(reserveReplay.status).toBe(409); expect(reserveReplay.body.error.code).toBe('EQUIPMENT_CONTEXT_CHANGED');
    expect(await snapshot(id)).toEqual(beforeReserveReplay);

    const cancelVersion = (await context(id)).requirementsVersion;
    const cancelled = await cancel(id, requestId, 'Recorded release reason.', cancelVersion);
    expect(cancelled.status).toBe(200); expect(cancelled.body.changed).toBe(true);
    const released = await row(requestId);
    await fixture.pool.query('UPDATE equipment_requests SET quantity=3 WHERE id=$1', [otherLine]);
    const beforeCancelReplay = await snapshot(id);
    const cancelReplay = await cancel(id, requestId, 'Recorded release reason.', cancelVersion);
    expect(cancelReplay.status).toBe(409); expect(cancelReplay.body.error.code).toBe('EQUIPMENT_CONTEXT_CHANGED');
    expect(await snapshot(id)).toEqual(beforeCancelReplay);
    expect(await row(requestId)).toEqual(released);
    expect(await fixture.notifications(id)).toHaveLength(2);
  });

  it('refuses partial quantity overrides, invalid stored periods, missing assignment and non-approved events', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 3);
    const version = (await context(id)).requirementsVersion;
    const overridden = await request(app()).post(`${base}/${id}/requests/${requestId}/reserve`)
      .send({ requirementsVersion: version, quantity: 1 });
    expect(overridden.status).toBe(400); expect((await row(requestId)).quantity).toBe(3);
    await fixture.pool.query("UPDATE equipment_requests SET ends_at=ends_at-interval '1 microsecond' WHERE id=$1", [requestId]);
    expect((await context(id)).readiness.status).toBe('INVALID_REQUIREMENTS');
    expect((await reserve(id, requestId)).body.error.code).toBe('EQUIPMENT_REQUEST_PERIOD_MISMATCH');
    await fixture.pool.query('UPDATE equipment_requests SET ends_at=$2 WHERE id=$1', [requestId, end]);
    await fixture.pool.query('UPDATE event_requests SET coordinator_id=NULL WHERE id=$1', [id]);
    expect((await reserve(id, requestId)).body.error.code).toBe('EQUIPMENT_COORDINATOR_REQUIRED');
    await fixture.pool.query("UPDATE event_requests SET coordinator_id=$2,status='CONFIRMED' WHERE id=$1", [id, coordinator.id]);
    expect((await context(id)).requests[0]?.canReserve).toBe(false);
    const rejected = await reserve(id, requestId);
    expect(rejected.status).toBe(409); expect(rejected.body.error.code).toBe('EQUIPMENT_EVENT_NOT_APPROVED');
    expect((await row(requestId)).status).toBe('REQUESTED');
    expect(await fixture.notifications(id)).toEqual([]);
  });

  it('rechecks role permissions in PostgreSQL and hides another event line from the requested event', async () => {
    const id = await event(); const other = await event(); const type = await equipment();
    const requestId = await line(id, type, 2); const otherLine = await line(other, type, 2);
    const version = (await context(id)).requirementsVersion;
    const before = await snapshot(id);
    for (const actor of [null, organiser, coordinator,
      await fixture.createUser('EVENT_COORDINATOR_LEAD'), await fixture.createUser('VENUE_STAFF'), await fixture.createUser('ATTENDEE')]) {
      const expected = actor ? 403 : 401;
      expect((await request(app(actor)).get(`${base}/${id}`)).status).toBe(expected);
      expect((await request(app(actor)).post(`${base}/${id}/requests/${requestId}/reserve`).send({ requirementsVersion: version })).status).toBe(expected);
      expect((await request(app(actor)).post(`${base}/${id}/requests/${requestId}/cancel`).send({ requirementsVersion: version, reason: 'Cancel' })).status).toBe(expected);
    }
    const revoked = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
    await fixture.pool.query("UPDATE app_users SET role='ATTENDEE' WHERE id=$1", [revoked.id]);
    expect((await request(app(revoked)).post(`${base}/${id}/requests/${requestId}/reserve`).send({ requirementsVersion: version })).status).toBe(403);
    const foreign = await reserve(id, otherLine, version);
    expect(foreign.status).toBe(404); expect(foreign.body.error.code).toBe('EQUIPMENT_REQUEST_NOT_FOUND');
    expect(await snapshot(id)).toEqual(before);
    expect((await row(otherLine)).status).toBe('REQUESTED');
  });

  it('rolls back the decision and every notice if a deferred notification constraint fails at commit', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 2);
    const before = await snapshot(id);
    await fixture.pool.query(`CREATE FUNCTION fail_kan26_notice() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected deferred notification failure'; END $$`);
    await fixture.pool.query(`CREATE CONSTRAINT TRIGGER fail_kan26_notice AFTER INSERT ON notifications
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fail_kan26_notice()`);
    try {
      expect((await reserve(id, requestId)).status).toBe(500);
      expect(await snapshot(id)).toEqual(before);
    } finally {
      await fixture.pool.query('DROP TRIGGER fail_kan26_notice ON notifications');
      await fixture.pool.query('DROP FUNCTION fail_kan26_notice()');
    }
    expect((await reserve(id, requestId)).status).toBe(200);
    expect(await fixture.notifications(id)).toHaveLength(2);
  });

  it('enforces release metadata completeness and preserves original decision, allocation and release history', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 2);
    expect((await reserve(id, requestId)).status).toBe(200);
    const original = await row(requestId);
    for (const fields of [
      "status='CANCELLED'",
      "status='CANCELLED',released_at=now(),release_reason='Reason'",
      "status='CANCELLED',released_at=now(),release_reason='Reason',release_cause='MANUAL_CANCELLATION'",
      "status='CANCELLED',release_reason='Reason',release_cause='EVENT_CANCELLED'",
      "status='CANCELLED',released_at=now(),release_reason=' ',release_cause='EVENT_CANCELLED'",
      "status='CANCELLED',released_at=now(),release_reason='Reason',release_cause='EVENT_CANCELLED',quantity=1",
      "status='REJECTED'", 'quantity=1', "starts_at=starts_at+interval '1 microsecond'", 'decided_by=NULL',
    ]) {
      await expect(fixture.pool.query(`UPDATE equipment_requests SET ${fields} WHERE id=$1`, [requestId]))
        .rejects.toMatchObject({ code: '23514' });
      expect(await row(requestId)).toEqual(original);
    }
    expect((await cancel(id, requestId)).status).toBe(200);
    const released = await row(requestId);
    for (const fields of ["release_cause='EVENT_COMPLETED'", 'released_by=NULL', 'released_at=NULL',
      "release_reason='Changed reason'", "status='RESERVED'", "status='REQUESTED'", 'decided_at=now()', 'quantity=1']) {
      await expect(fixture.pool.query(`UPDATE equipment_requests SET ${fields} WHERE id=$1`, [requestId]))
        .rejects.toMatchObject({ code: '23514' });
    }
    expect(await row(requestId)).toEqual(released);
  });

  it('applies operational and eligibility guards to direct database reservation writes too', async () => {
    const id = await event(); const type = await equipment(10, 2, 1); const requestId = await line(id, type, 8);
    const sql = "UPDATE equipment_requests SET status='RESERVED',decided_by=$2,decided_at=now() WHERE id=$1";
    await expect(fixture.pool.query(sql, [requestId, technician.id])).rejects.toMatchObject({ code: '23P01', constraint: 'equipment_requests_within_pool' });
    await fixture.pool.query('UPDATE equipment_requests SET quantity=7 WHERE id=$1', [requestId]);
    await fixture.pool.query("UPDATE event_requests SET status='SUBMITTED' WHERE id=$1", [id]);
    await expect(fixture.pool.query(sql, [requestId, technician.id])).rejects.toMatchObject({ code: '23514', constraint: 'equipment_reservation_event_approved' });
    await fixture.pool.query("UPDATE event_requests SET status='APPROVED',ends_at=ends_at+interval '1 microsecond' WHERE id=$1", [id]);
    await expect(fixture.pool.query(sql, [requestId, technician.id])).rejects.toMatchObject({ code: '23514', constraint: 'equipment_reservation_event_period' });
    await fixture.pool.query('UPDATE event_requests SET ends_at=$2 WHERE id=$1', [id, end]);
    await fixture.pool.query('UPDATE equipment_types SET is_active=false WHERE id=$1', [type]);
    await expect(fixture.pool.query(sql, [requestId, technician.id])).rejects.toMatchObject({ code: '23P01' });
    expect((await row(requestId)).status).toBe('REQUESTED');
  });

  it('serializes a simultaneous terminal transition with reservation without leaving terminal stock committed', async () => {
    const type = await equipment(); const id = await event(); const requestId = await line(id, type, 2);
    const version = (await context(id)).requirementsVersion;
    const [response] = await Promise.all([reserve(id, requestId, version),
      fixture.pool.query("UPDATE event_requests SET status='CANCELLED' WHERE id=$1", [id])]);
    expect([200, 409]).toContain(response.status);
    const final = await row(requestId);
    expect(final.status).not.toBe('RESERVED');
    if (response.status === 200) {
      expect(final).toMatchObject({ status: 'CANCELLED', release_cause: 'EVENT_CANCELLED' });
      expect(await fixture.notifications(id)).toHaveLength(2);
    } else {
      expect(final).toMatchObject({ status: 'REQUESTED', release_cause: null });
      expect(await fixture.notifications(id)).toEqual([]);
    }
    expect((await fixture.eventRow(id)).status).toBe('CANCELLED');
  });

  it('serializes manual cancellation and event completion while retaining exactly one release cause', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 2);
    expect((await reserve(id, requestId)).status).toBe(200);
    const version = (await context(id)).requirementsVersion;
    const [response] = await Promise.all([cancel(id, requestId, 'Manual return', version),
      fixture.pool.query("UPDATE event_requests SET status='COMPLETED' WHERE id=$1", [id])]);
    expect([200, 409]).toContain(response.status);
    const released = await row(requestId);
    expect(released.status).toBe('CANCELLED');
    expect(released.release_cause).toBe(response.status === 200 ? 'MANUAL_CANCELLATION' : 'EVENT_COMPLETED');
    await fixture.pool.query("UPDATE event_requests SET status='COMPLETED' WHERE id=$1", [id]);
    expect(await row(requestId)).toEqual(released);
    expect(await fixture.notifications(id)).toHaveLength(2);
  });

  it.each(['damage', 'deactivation'] as const)('rechecks %s after waiting for a concurrent stock writer', async change => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 7);
    const version = (await context(id)).requirementsVersion;
    const writer = await fixture.pool.connect();
    let pending: ReturnType<typeof reserve> | undefined;
    try {
      await writer.query('BEGIN');
      await writer.query('SELECT id FROM equipment_types WHERE id=$1 FOR UPDATE', [type]);
      pending = reserve(id, requestId, version);
      await waitForLock('SELECT t.id FROM equipment_types');
      await writer.query(change === 'damage'
        ? 'UPDATE equipment_types SET damaged_quantity=3 WHERE id=$1'
        : 'UPDATE equipment_types SET is_active=false WHERE id=$1', [type]);
      await writer.query('COMMIT');
      const response = await pending;
      expect(response.status).toBe(409); expect(response.body.error.code).toBe('EQUIPMENT_STOCK_CONFLICT');
      expect((await row(requestId)).status).toBe('REQUESTED');
      expect(await fixture.notifications(id)).toEqual([]);
    } finally {
      await writer.query('ROLLBACK'); writer.release();
      await pending;
    }
  });

  it('notifies the current coordinator after waiting for a reassignment transaction', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 2);
    const nextCoordinator = await fixture.createUser('EVENT_COORDINATOR');
    const version = (await context(id)).requirementsVersion;
    const writer = await fixture.pool.connect();
    let pending: ReturnType<typeof reserve> | undefined;
    try {
      await writer.query('BEGIN');
      await writer.query('SELECT id FROM event_requests WHERE id=$1 FOR UPDATE', [id]);
      pending = reserve(id, requestId, version);
      await waitForLock('SELECT status, coordinator_id');
      await writer.query('UPDATE event_requests SET coordinator_id=$2 WHERE id=$1', [id, nextCoordinator.id]);
      await writer.query('COMMIT');
      expect((await pending).status).toBe(200);
      const recipients = (await fixture.notifications(id)).map(n => n.recipient_id);
      expect(recipients).toContain(nextCoordinator.id); expect(recipients).toContain(technician.id);
      expect(recipients).not.toContain(coordinator.id);
    } finally {
      await writer.query('ROLLBACK'); writer.release();
      await pending;
    }
  });

  it('refuses a demoted assigned coordinator without recording a reservation or undeliverable confirmation', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 2);
    const assigned = await fixture.createUser('EVENT_COORDINATOR');
    await fixture.pool.query('UPDATE event_requests SET coordinator_id=$2 WHERE id=$1', [id, assigned.id]);
    const version = (await context(id)).requirementsVersion;
    await fixture.pool.query("UPDATE app_users SET role='ATTENDEE' WHERE id=$1", [assigned.id]);
    const before = await snapshot(id);
    const response = await reserve(id, requestId, version);
    expect(response.status).toBe(409); expect(response.body.error.code).toBe('EQUIPMENT_COORDINATOR_REQUIRED');
    expect(await snapshot(id)).toEqual(before);
  });

  it('limits equipment notifications to their recipients and current permissions, including terminal historical acknowledgements', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 2);
    expect((await reserve(id, requestId)).status).toBe(200);
    const notices = (await fixture.pool.query('SELECT id,recipient_id FROM notifications WHERE event_request_id=$1', [id])).rows;
    const technicalNotice = notices.find(n => n.recipient_id === technician.id)!;
    const coordinatorNotice = notices.find(n => n.recipient_id === coordinator.id)!;
    const techInbox = await request(app()).get('/api/notifications').expect(200);
    expect(techInbox.body.items.find((n: { id: string }) => n.id === technicalNotice.id))
      .toMatchObject({ link: `/equipment/availability/${id}`, event: null, booking: null, read: false });
    const otherTechnical = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
    const unrelated = await request(app(otherTechnical)).get('/api/notifications').expect(200);
    expect(unrelated.body.items).toEqual([]);
    await request(app(otherTechnical)).post(`/api/notifications/${technicalNotice.id}/read`).expect(404);
    const nextCoordinator = await fixture.createUser('EVENT_COORDINATOR');
    await fixture.pool.query('UPDATE event_requests SET coordinator_id=$2 WHERE id=$1', [id, nextCoordinator.id]);
    const oldInbox = await request(app(coordinator)).get('/api/notifications').expect(200);
    expect(oldInbox.body.items.some((n: { id: string }) => n.id === coordinatorNotice.id)).toBe(false);
    await request(app(coordinator)).post(`/api/notifications/${coordinatorNotice.id}/read`).expect(404);
    await fixture.pool.query("UPDATE event_requests SET status='CANCELLED' WHERE id=$1", [id]);
    const terminal = await request(app()).get('/api/notifications').expect(200);
    expect(terminal.body.items.find((n: { id: string }) => n.id === technicalNotice.id))
      .toMatchObject({ link: null, event: null, message: expect.stringContaining('no longer open for equipment planning') });
    await request(app()).get(`${base}/${id}`).expect(404);
    await request(app()).post(`/api/notifications/${technicalNotice.id}/read`).expect(200);
    const changedRoleInbox = await request(app({ id: technician.id, role: 'ATTENDEE' })).get('/api/notifications').expect(200);
    expect(changedRoleInbox.body.items.some((n: { id: string }) => n.id === technicalNotice.id)).toBe(false);
  });

  it('uses bigint capacity checks at the PostgreSQL integer limit without overflowing the total demand', async () => {
    const type = await equipment(2_147_483_647, 0, 0);
    const a = await event(); const b = await event();
    const ar = await line(a, type, 2_147_483_647); const br = await line(b, type, 1);
    expect((await reserve(a, ar)).status).toBe(200);
    expect((await reserve(b, br)).body.error.code).toBe('EQUIPMENT_STOCK_CONFLICT');
    await expect(fixture.pool.query("UPDATE equipment_requests SET status='RESERVED',decided_by=$2,decided_at=now() WHERE id=$1",
      [br, technician.id])).rejects.toMatchObject({ code: '23P01', constraint: 'equipment_requests_within_pool' });
    expect((await row(ar)).quantity).toBe(2_147_483_647); expect((await row(br)).status).toBe('REQUESTED');
  });

  it('serializes competing direct database allocations through the migration guard', async () => {
    const type = await equipment(5, 0, 0);
    const a = await event(); const b = await event();
    const ar = await line(a, type, 3); const br = await line(b, type, 3);
    const sql = "UPDATE equipment_requests SET status='RESERVED',decided_by=$2,decided_at=now() WHERE id=$1";
    const results = await Promise.allSettled([
      fixture.pool.query(sql, [ar, technician.id]), fixture.pool.query(sql, [br, technician.id]),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find(result => result.status === 'rejected');
    expect(failure?.status === 'rejected' && failure.reason).toMatchObject({ code: '23P01', constraint: 'equipment_requests_within_pool' });
    expect((await fixture.pool.query("SELECT sum(quantity)::integer AS quantity FROM equipment_requests WHERE equipment_type_id=$1 AND status='RESERVED'", [type])).rows)
      .toEqual([{ quantity: 3 }]);
  });

  it('rolls back terminal release metadata and status history together when the surrounding transaction fails', async () => {
    const id = await event(); const type = await equipment(); const requestId = await line(id, type, 2);
    expect((await reserve(id, requestId)).status).toBe(200);
    const before = await snapshot(id);
    const client = await fixture.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.actor_id',$1,true)", [coordinator.id]);
      await client.query("UPDATE event_requests SET status='CANCELLED' WHERE id=$1", [id]);
      expect((await client.query('SELECT status,release_cause FROM equipment_requests WHERE id=$1', [requestId])).rows)
        .toEqual([{ status: 'CANCELLED', release_cause: 'EVENT_CANCELLED' }]);
      await expect(client.query('SELECT 1/0')).rejects.toMatchObject({ code: '22012' });
      await client.query('ROLLBACK');
    } finally { await client.query('ROLLBACK'); client.release(); }
    expect(await snapshot(id)).toEqual(before);
  });
});
