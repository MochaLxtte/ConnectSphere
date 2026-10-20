import { randomBytes, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import {
  assignCoordinator, getLeadEventDetail, listAssignments, reassignCoordinator,
} from '../../../backend/src/modules/events/assignment.js';
import { listClarifications } from '../../../backend/src/modules/events/clarifications.js';
import { listStatusHistory } from '../../../backend/src/modules/events/status-history.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let owner: Profile;
let lead: Profile;
let otherLead: Profile;
let alex: Profile;
let blair: Profile;
let casey: Profile;
let staff: Profile;
let app: ReturnType<typeof createRuntimeApp>;
const supabaseUrl = 'https://kan65-auth.example.test';
const secret = randomBytes(32).toString('hex');
const signingKey = new TextEncoder().encode(secret);
type Profile = WorkflowActor & { uid: string };
const activeStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED'] as const;

async function profile(role: UserRole, name: string = role): Promise<Profile> {
  const actor = await fixture.createUser(role, name);
  const uid = randomUUID();
  await fixture.pool.query('UPDATE app_users SET supabase_user_id=$1, coordinator_available=$2 WHERE id=$3',
    [uid, role === 'EVENT_COORDINATOR', actor.id]);
  return { ...actor, uid };
}

beforeAll(async () => {
  vi.stubEnv('SUPABASE_URL', supabaseUrl);
  vi.stubEnv('SUPABASE_JWT_SECRET', secret);
  fixture = await createWorkflowFixture();
  owner = await profile('EVENT_ORGANISER');
  lead = await profile('EVENT_COORDINATOR_LEAD', 'First Lead');
  otherLead = await profile('EVENT_COORDINATOR_LEAD', 'Second Lead');
  alex = await profile('EVENT_COORDINATOR', 'Alex');
  blair = await profile('EVENT_COORDINATOR', 'Blair');
  casey = await profile('EVENT_COORDINATOR', 'Casey');
  staff = await profile('VENUE_STAFF');
  app = createRuntimeApp({ pool: fixture.pool, isProduction: false });
});
afterAll(async () => {
  try { await fixture?.destroy(); } finally { vi.unstubAllEnvs(); }
});

async function login(actor: Profile) {
  const token = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' })
    .setIssuer(`${supabaseUrl}/auth/v1`).setSubject(actor.uid).setIssuedAt().setExpirationTime('1h').sign(signingKey);
  const session = request.agent(app);
  const response = await session.post('/api/auth/login').send({ accessToken: token });
  expect(response.status).toBe(200);
  return session;
}

async function assigned(status: EventStatus = 'SUBMITTED') {
  const id = await fixture.createEvent({ organiserId: owner.id, status });
  const initial = await assignCoordinator(fixture.dependencies, {
    eventRequestId: id, actor: lead, input: { coordinatorId: alex.id, note: 'Original allocation' },
  });
  return { id, version: initial.assignmentId };
}

const handover = (id: string, version: string, coordinatorId = blair.id, actor: WorkflowActor = lead,
  reason = '  Covering the original coordinator\'s leave.  ') => reassignCoordinator(fixture.dependencies, {
  eventRequestId: id, actor, input: { coordinatorId, expectedAssignmentVersion: version, reason },
});

async function assignments(id: string) {
  return (await fixture.pool.query('SELECT * FROM coordinator_assignments WHERE event_request_id=$1 ORDER BY assigned_at, id', [id])).rows;
}

async function snapshot(id: string) {
  const related = {} as Record<string, unknown[]>;
  for (const table of ['event_reviews', 'event_clarifications', 'venue_bookings', 'equipment_requests',
    'event_registrations', 'event_status_history', 'notifications']) {
    related[table] = (await fixture.pool.query(`SELECT * FROM ${table} WHERE event_request_id=$1 ORDER BY id`, [id])).rows;
  }
  return {
    event: (await fixture.pool.query('SELECT * FROM event_requests WHERE id=$1', [id])).rows[0],
    assignments: await assignments(id), related,
  };
}

async function venueBooking(eventId: string) {
  const venueId = randomUUID();
  const bookingId = randomUUID();
  await fixture.pool.query(`INSERT INTO venues (id,name,capacity,layouts) VALUES ($1,$2,100,ARRAY['Theatre'])`,
    [venueId, `KAN-65 hall ${venueId}`]);
  await fixture.pool.query(`INSERT INTO venue_bookings
    (id,event_request_id,venue_id,requested_by,status,starts_at,ends_at,layout,decided_by,decided_at)
    SELECT $1,id,$2,$3,'APPROVED',starts_at,ends_at,'Theatre',$4,now() FROM event_requests WHERE id=$5`,
  [bookingId, venueId, alex.id, staff.id, eventId]);
  return { venueId, bookingId };
}

describe('KAN-65 atomic versioned coordinator handovers against PostgreSQL', () => {
  it.each(activeStatuses)('hands over %s with one shared audit boundary and no status change', async (status) => {
    const { id, version } = await assigned(status);
    const before = await snapshot(id);
    const beforeTime = (await fixture.pool.query('SELECT clock_timestamp() AS time')).rows[0].time as Date;
    const result = await handover(id, version);
    const afterTime = (await fixture.pool.query('SELECT clock_timestamp() AS time')).rows[0].time as Date;
    expect(result).toEqual({ eventRequestId: id, assignmentId: expect.any(String),
      coordinatorId: blair.id, previousCoordinatorId: alex.id, changed: true });
    expect(result.assignmentId).not.toBe(version);
    const after = await snapshot(id);
    expect(after.event).toEqual({ ...before.event, coordinator_id: blair.id, updated_at: expect.any(Date) });
    expect(after.related).toEqual(before.related);
    expect(after.assignments).toHaveLength(2);
    const old = after.assignments.find((row) => row.id === version)!;
    const current = after.assignments.find((row) => row.id === result.assignmentId)!;
    expect(old).toEqual({ ...before.assignments[0], unassigned_at: current.assigned_at });
    expect(current).toMatchObject({ coordinator_id: blair.id, assigned_by: lead.id,
      assignment_method: 'MANUAL', note: "Covering the original coordinator's leave.", unassigned_at: null });
    expect(after.event.updated_at).toEqual(current.assigned_at);
    // Verify equality inside PostgreSQL too: JS Date truncates its microsecond precision.
    expect((await fixture.pool.query(`SELECT old.unassigned_at = current.assigned_at AS adjacent,
      e.updated_at = current.assigned_at AS same_update
      FROM coordinator_assignments old JOIN coordinator_assignments current ON current.event_request_id=old.event_request_id
      JOIN event_requests e ON e.id=current.event_request_id WHERE old.id=$1 AND current.id=$2`,
    [version, result.assignmentId])).rows[0]).toEqual({ adjacent: true, same_update: true });
    expect(current.assigned_at.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(current.assigned_at.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    const detail = await getLeadEventDetail(fixture.dependencies, { eventRequestId: id, actor: otherLead });
    expect(detail).toMatchObject({ coordinatorId: blair.id, assignmentVersion: current.id,
      actions: { canAssignCoordinator: false, canReassignCoordinator: true } });
  });

  it('preserves event information, approval, clarification, venue/equipment arrangements and registrations', async () => {
    const { id, version } = await assigned('CONFIRMED');
    await venueBooking(id);
    await fixture.pool.query(`INSERT INTO event_reviews (event_request_id,reviewed_by,decision,reason)
      VALUES ($1,$2,'APPROVED','Original approval')`, [id, alex.id]);
    await fixture.pool.query(`INSERT INTO event_clarifications
      (event_request_id,requested_by,message,response,responded_at)
      VALUES ($1,$2,'Original question','Original answer',now())`, [id, alex.id]);
    const equipmentId = randomUUID();
    await fixture.pool.query('INSERT INTO equipment_types (id,name,total_quantity) VALUES ($1,$2,20)',
      [equipmentId, `KAN-65 microphones ${equipmentId}`]);
    await fixture.pool.query(`INSERT INTO equipment_requests
      (event_request_id,equipment_type_id,requested_by,quantity,status,starts_at,ends_at)
      SELECT id,$2,$3,2,'REQUESTED',starts_at,ends_at FROM event_requests WHERE id=$1`, [id, equipmentId, alex.id]);
    const attendee = await profile('ATTENDEE');
    await fixture.pool.query('INSERT INTO event_registrations (event_request_id,attendee_id) VALUES ($1,$2)', [id, attendee.id]);
    const before = await snapshot(id);
    await handover(id, version);
    const after = await snapshot(id);
    expect(after.related).toEqual(before.related);
    expect(after.event).toEqual({ ...before.event, coordinator_id: blair.id, updated_at: expect.any(Date) });
    // KAN-64 delivery is deliberately pending: a handover does not invent notifications.
    expect(after.related.notifications).toEqual([]);
  });

  it('treats the current coordinator as a true no-op without timestamps, history or other changes', async () => {
    const { id, version } = await assigned();
    const before = await snapshot(id);
    expect(await handover(id, version, alex.id)).toEqual({ eventRequestId: id, assignmentId: version,
      coordinatorId: alex.id, previousCoordinatorId: alex.id, changed: false });
    expect(await snapshot(id)).toEqual(before);
  });

  it('preserves a same-target no-op even when the existing coordinator is no longer available', async () => {
    const current = await profile('EVENT_COORDINATOR');
    const id = await fixture.createEvent({ organiserId: owner.id });
    const initial = await assignCoordinator(fixture.dependencies, {
      eventRequestId: id, actor: lead, input: { coordinatorId: current.id },
    });
    await fixture.pool.query('UPDATE app_users SET coordinator_available=false WHERE id=$1', [current.id]);
    const before = await snapshot(id);
    expect((await handover(id, initial.assignmentId, current.id)).changed).toBe(false);
    expect(await snapshot(id)).toEqual(before);
  });

  it('never creates a negative interval for an assignment whose stored start is ahead of the database clock', async () => {
    const { id, version } = await assigned();
    await fixture.pool.query("UPDATE coordinator_assignments SET assigned_at=clock_timestamp()+interval '1 minute' WHERE id=$1", [version]);
    const result = await handover(id, version);
    expect((await fixture.pool.query(`SELECT old.unassigned_at>=old.assigned_at AS valid_interval,
      old.unassigned_at=current.assigned_at AS adjacent
      FROM coordinator_assignments old JOIN coordinator_assignments current ON current.event_request_id=old.event_request_id
      WHERE old.id=$1 AND current.id=$2`, [version, result.assignmentId])).rows[0])
      .toEqual({ valid_interval: true, adjacent: true });
  });

  it('rejects an old version even after A-to-B-to-A returns to the original coordinator', async () => {
    const { id, version } = await assigned();
    const first = await handover(id, version);
    const second = await handover(id, first.assignmentId, alex.id, otherLead);
    const before = await snapshot(id);
    for (const target of [alex.id, casey.id]) {
      await expect(handover(id, version, target)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'ASSIGNMENT_VERSION_CONFLICT' });
      expect(await snapshot(id)).toEqual(before);
    }
    expect(second.assignmentId).not.toBe(version);
    expect(before.assignments.filter((row) => row.unassigned_at === null)).toHaveLength(1);
  });

  it.each(['DRAFT', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const)('rejects a %s event without mutating history', async (status) => {
    const { id, version } = await assigned();
    await fixture.pool.query('UPDATE event_requests SET status=$1 WHERE id=$2', [status, id]);
    const before = await snapshot(id);
    await expect(handover(id, version)).rejects.toMatchObject({ code: status === 'DRAFT' ? 'EVENT_REQUEST_NOT_FOUND' : 'ASSIGNMENT_NOT_ALLOWED' });
    expect(await snapshot(id)).toEqual(before);
  });

  it('rejects unassigned requests and preserves missing or inconsistent history', async () => {
    const unassigned = await fixture.createEvent({ organiserId: owner.id });
    const missing = await fixture.createEvent({ organiserId: owner.id, coordinatorId: alex.id });
    const mismatch = await assigned();
    await fixture.pool.query('UPDATE coordinator_assignments SET coordinator_id=$1 WHERE id=$2', [casey.id, mismatch.version]);
    for (const id of [unassigned, missing, mismatch.id]) {
      const before = await snapshot(id);
      await expect(handover(id, mismatch.version)).rejects.toMatchObject({ kind: 'CONFLICT' });
      expect(await snapshot(id)).toEqual(before);
      const detail = await getLeadEventDetail(fixture.dependencies, { eventRequestId: id, actor: lead });
      expect(detail.actions.canReassignCoordinator).toBe(false);
      expect(detail.assignmentVersion).toBeNull();
    }
  });

  it('rejects missing, unavailable and non-coordinator targets without closing the original assignment', async () => {
    const unavailable = await profile('EVENT_COORDINATOR');
    await fixture.pool.query('UPDATE app_users SET coordinator_available=false WHERE id=$1', [unavailable.id]);
    const { id, version } = await assigned();
    const before = await snapshot(id);
    for (const target of [randomUUID(), unavailable.id, owner.id, lead.id, staff.id]) {
      await expect(handover(id, version, target)).rejects.toMatchObject({ code: 'INVALID_COORDINATOR' });
      expect(await snapshot(id)).toEqual(before);
    }
  });

  it.each(['availability', 'role'] as const)('rechecks a target after a concurrent %s update commits', async (change) => {
    const target = await profile('EVENT_COORDINATOR');
    const { id, version } = await assigned();
    const before = await snapshot(id);
    const editor = await fixture.pool.connect();
    let pending: Promise<PromiseSettledResult<Awaited<ReturnType<typeof handover>>>[]> | undefined;
    let results: PromiseSettledResult<Awaited<ReturnType<typeof handover>>>[] = [];
    try {
      await editor.query('BEGIN');
      await editor.query(change === 'availability'
        ? 'UPDATE app_users SET coordinator_available=false WHERE id=$1'
        : "UPDATE app_users SET role='VENUE_STAFF' WHERE id=$1", [target.id]);
      pending = Promise.allSettled([handover(id, version, target.id)]);
      await expect.poll(async () => (await fixture.pool.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE application_name=current_setting('application_name') AND wait_event_type='Lock' AND pid<>pg_backend_pid()`)).rows[0].count,
      { timeout: 3000 }).toBe(1);
      await editor.query('COMMIT');
    } finally {
      await editor.query('ROLLBACK');
      editor.release(true);
      if (pending) results = await pending;
    }
    expect(results).toEqual([expect.objectContaining({ status: 'rejected', reason: expect.objectContaining({ code: 'INVALID_COORDINATOR' }) })]);
    expect(await snapshot(id)).toEqual(before);
  });

  it('serializes two Leads using one version into one handover and one clear stale conflict', async () => {
    const { id, version } = await assigned();
    const blocker = await fixture.pool.connect();
    let pending: Promise<PromiseSettledResult<Awaited<ReturnType<typeof handover>>>[]> | undefined;
    let results: PromiseSettledResult<Awaited<ReturnType<typeof handover>>>[] = [];
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM event_requests WHERE id=$1 FOR UPDATE', [id]);
      pending = Promise.allSettled([handover(id, version), handover(id, version, casey.id, otherLead)]);
      await expect.poll(async () => (await fixture.pool.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE application_name=current_setting('application_name') AND wait_event_type='Lock' AND pid<>pg_backend_pid()`)).rows[0].count,
      { timeout: 3000 }).toBe(2);
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release(true);
      if (pending) results = await pending;
    }
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({ reason: { code: 'ASSIGNMENT_VERSION_CONFLICT' } });
    const winner = results.find((result) => result.status === 'fulfilled');
    if (winner?.status !== 'fulfilled') throw new Error('Expected one committed handover.');
    const rows = await assignments(id);
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.unassigned_at === null)).toEqual([expect.objectContaining({
      id: winner.value.assignmentId, coordinator_id: winner.value.coordinatorId,
      assigned_by: winner.value.coordinatorId === blair.id ? lead.id : otherLead.id,
    })]);
    expect((await fixture.eventRow(id)).coordinator_id).toBe(winner.value.coordinatorId);
  });

  it.each(['history insert', 'event update'] as const)('rolls back the closed assignment and all writes when the %s fails', async (failure) => {
    const { id, version } = await assigned();
    const before = await snapshot(id);
    const table = failure === 'history insert' ? 'coordinator_assignments' : 'event_requests';
    const operation = failure === 'history insert' ? 'INSERT' : 'UPDATE OF coordinator_id';
    await fixture.pool.query(`CREATE FUNCTION reject_test_handover() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected handover-save failure'; END $$;
      CREATE TRIGGER reject_test_handover BEFORE ${operation} ON ${table}
      FOR EACH ROW EXECUTE FUNCTION reject_test_handover();`);
    try {
      await expect(handover(id, version)).rejects.toThrow('Injected handover-save failure');
      expect(await snapshot(id)).toEqual(before);
    } finally {
      await fixture.pool.query(`DROP TRIGGER reject_test_handover ON ${table}; DROP FUNCTION reject_test_handover()`);
    }
    expect((await handover(id, version)).changed).toBe(true);
    expect(await assignments(id)).toHaveLength(2);
  });
});

const protectedReads = [
  { name: 'assignment history', table: 'coordinator_assignments', read: listAssignments },
  { name: 'clarifications', table: 'event_clarifications', read: listClarifications },
  { name: 'status history', table: 'event_status_history', read: listStatusHistory },
] as const;

describe('KAN-65 protected history reads serialize with handovers', () => {
  it.each(protectedReads)('lets an authorised $name read finish before the handover commits', async ({ table, read }) => {
    const { id, version } = await assigned();
    const blocker = await fixture.pool.connect();
    let reading: Promise<PromiseSettledResult<unknown>[]> | undefined;
    let writing: Promise<PromiseSettledResult<unknown>[]> | undefined;
    let readResult: PromiseSettledResult<unknown>[] = [];
    let writeResult: PromiseSettledResult<unknown>[] = [];
    try {
      await blocker.query('BEGIN');
      // Pause the real child SELECT after it has acquired the event's shared lock.
      await blocker.query(`LOCK TABLE ${table} IN ACCESS EXCLUSIVE MODE`);
      reading = Promise.allSettled([read(fixture.dependencies, { eventRequestId: id, actor: alex })]);
      await expect.poll(async () => (await fixture.pool.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE application_name=current_setting('application_name') AND wait_event_type='Lock' AND pid<>pg_backend_pid()`)).rows[0].count,
      { timeout: 3000 }).toBe(1);
      writing = Promise.allSettled([handover(id, version)]);
      await expect.poll(async () => (await fixture.pool.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE application_name=current_setting('application_name') AND wait_event_type='Lock' AND pid<>pg_backend_pid()`)).rows[0].count,
      { timeout: 3000 }).toBe(2);
      expect((await fixture.eventRow(id)).coordinator_id).toBe(alex.id);
      await blocker.query('COMMIT');
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release(true);
      if (reading) readResult = await reading;
      if (writing) writeResult = await writing;
    }
    expect(readResult).toEqual([expect.objectContaining({ status: 'fulfilled' })]);
    expect(writeResult).toEqual([expect.objectContaining({ status: 'fulfilled' })]);
    await expect(read(fixture.dependencies, { eventRequestId: id, actor: alex })).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect((await fixture.eventRow(id)).coordinator_id).toBe(blair.id);
  });

  it.each(protectedReads)('denies a former coordinator $name read that waits behind a handover', async ({ read }) => {
    const { id, version } = await assigned();
    const blocker = await fixture.pool.connect();
    let reading: Promise<PromiseSettledResult<unknown>[]> | undefined;
    let writing: Promise<PromiseSettledResult<unknown>[]> | undefined;
    let readResult: PromiseSettledResult<unknown>[] = [];
    let writeResult: PromiseSettledResult<unknown>[] = [];
    try {
      await blocker.query('BEGIN');
      // Pause the handover on its target check after it has locked the event.
      await blocker.query('SELECT id FROM app_users WHERE id=$1 FOR NO KEY UPDATE', [blair.id]);
      writing = Promise.allSettled([handover(id, version)]);
      await expect.poll(async () => (await fixture.pool.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE application_name=current_setting('application_name') AND wait_event_type='Lock' AND pid<>pg_backend_pid()`)).rows[0].count,
      { timeout: 3000 }).toBe(1);
      reading = Promise.allSettled([read(fixture.dependencies, { eventRequestId: id, actor: alex })]);
      await expect.poll(async () => (await fixture.pool.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE application_name=current_setting('application_name') AND wait_event_type='Lock' AND pid<>pg_backend_pid()`)).rows[0].count,
      { timeout: 3000 }).toBe(2);
      await blocker.query('COMMIT');
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release(true);
      if (reading) readResult = await reading;
      if (writing) writeResult = await writing;
    }
    expect(writeResult).toEqual([expect.objectContaining({ status: 'fulfilled' })]);
    expect(readResult).toEqual([expect.objectContaining({ status: 'rejected',
      reason: expect.objectContaining({ code: 'EVENT_REQUEST_NOT_FOUND' }) })]);
    expect((await fixture.eventRow(id)).coordinator_id).toBe(blair.id);
  });
});

describe('KAN-65 signed runtime sessions transfer assignment permissions immediately', () => {
  it('revokes the previous coordinator across reads and writes while preserving organiser access', async () => {
    const { id, version } = await assigned();
    const previous = await login(alex);
    const next = await login(blair);
    const organiser = await login(owner);
    const leadSession = await login(lead);
    const path = `/api/events/${id}`;
    expect((await previous.get(path)).status).toBe(200);
    expect((await next.get(path)).status).toBe(404);
    const response = await leadSession.post(`${path}/coordinator/reassign`).send({
      coordinatorId: blair.id, expectedAssignmentVersion: version, reason: 'Coordinator leave cover',
    });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toMatchObject({ changed: true, previousCoordinatorId: alex.id, coordinatorId: blair.id });
    for (const suffix of ['', '/clarifications', '/history', '/assignments']) {
      expect((await previous.get(`${path}${suffix}`)).status, `previous coordinator ${suffix}`).toBe(404);
      expect((await next.get(`${path}${suffix}`)).status, `new coordinator ${suffix}`).toBe(200);
      expect((await organiser.get(`${path}${suffix}`)).status, `organiser ${suffix}`).toBe(200);
    }
    expect((await previous.get('/api/events')).body.items.map((item: { id: string }) => item.id)).not.toContain(id);
    expect((await next.get('/api/events')).body.items.map((item: { id: string }) => item.id)).toContain(id);
    const before = await snapshot(id);
    expect((await previous.post(`${path}/start-review`)).status).toBe(404);
    expect((await previous.post(`${path}/clarifications`).send({ message: 'Stale question' })).status).toBe(404);
    expect((await previous.post(`${path}/reviews`).send({ decision: 'APPROVED' })).status).toBe(404);
    expect(await snapshot(id)).toEqual(before);
    expect((await next.post(`${path}/start-review`)).status).toBe(200);
    expect((await next.post(`${path}/reviews`).send({ decision: 'APPROVED' })).status).toBe(201);
  });

  it('allows the newly assigned coordinator to ask a clarification and the organiser to answer it', async () => {
    const { id, version } = await assigned();
    await handover(id, version);
    const next = await login(blair);
    const organiser = await login(owner);
    const asked = await next.post(`/api/events/${id}/clarifications`).send({ message: 'Confirm the room layout.' });
    expect(asked.status).toBe(201);
    const answered = await organiser.post(`/api/events/${id}/clarifications/${asked.body.clarificationId}/response`)
      .send({ response: 'Theatre seating.' });
    expect(answered.status).toBe(200);
    expect(answered.body.status).toBe('SUBMITTED');
  });

  it('transfers venue booking and suitability access without changing existing venue arrangements', async () => {
    const { id, version } = await assigned('APPROVED');
    const { venueId, bookingId } = await venueBooking(id);
    const previous = await login(alex);
    const next = await login(blair);
    const context = await previous.get(`/api/events/${id}/venue-suitability`);
    expect(context.status).toBe(200);
    await handover(id, version);
    const before = await snapshot(id);
    expect((await previous.get(`/api/events/${id}/venue-suitability`)).status).toBe(404);
    expect((await next.get(`/api/events/${id}/venue-suitability`)).status).toBe(200);
    expect((await previous.get(`/api/venue-bookings/${bookingId}`)).status).toBe(404);
    expect((await next.get(`/api/venue-bookings/${bookingId}`)).status).toBe(200);
    expect((await previous.get('/api/venue-bookings').query({ eventRequestId: id })).body.items).toEqual([]);
    expect((await next.get('/api/venue-bookings').query({ eventRequestId: id })).body.items).toHaveLength(1);
    const bookingBody = { venueId, startsAt: '2026-12-01T07:00:00Z', endsAt: '2026-12-01T08:00:00Z', layout: 'Theatre' };
    expect((await previous.post(`/api/events/${id}/venue-bookings`).send(bookingBody)).status).toBe(404);
    expect(await snapshot(id)).toEqual(before);
    const assessment = await next.post(`/api/events/${id}/venue-suitability`).send({
      venueId, requirementsVersion: (await next.get(`/api/events/${id}/venue-suitability`)).body.requirementsVersion,
      facilities: [], accessibility: [], layout: 'Theatre', wheelchairRequired: false,
      requirementsConfirmed: true, unresolvedRequirements: null,
    });
    expect(assessment.status).toBe(200);
    expect(await snapshot(id)).toEqual(before);
    // The incoming coordinator can also create arrangements, while the old approved
    // booking remains unchanged and attributed to its original requester.
    const secondVenue = randomUUID();
    await fixture.pool.query(`INSERT INTO venues (id,name,capacity,layouts) VALUES ($1,$2,100,ARRAY['Theatre'])`,
      [secondVenue, `KAN-65 new hall ${secondVenue}`]);
    const booked = await next.post(`/api/events/${id}/venue-bookings`).send({
      venueId: secondVenue, startsAt: '2026-12-01T02:00:00Z', endsAt: '2026-12-01T06:00:00Z', layout: 'Theatre',
    });
    expect(booked.status).toBe(201);
    expect(booked.body.booking).toMatchObject({ status: 'PENDING' });
    expect((await fixture.pool.query('SELECT requested_by FROM venue_bookings WHERE id=$1', [booked.body.booking.id])).rows[0])
      .toEqual({ requested_by: blair.id });
    const afterBooking = await snapshot(id);
    expect(afterBooking.related.venue_bookings).toContainEqual(before.related.venue_bookings![0]);
  });

  it('returns an HTTP conflict for a competing stale page and leaves the winning assignment untouched', async () => {
    const { id, version } = await assigned();
    const first = await login(lead);
    const second = await login(otherLead);
    const path = `/api/events/${id}/coordinator/reassign`;
    const initial = await first.post(path).send({ coordinatorId: blair.id, expectedAssignmentVersion: version, reason: 'First handover' });
    expect(initial.status).toBe(200);
    const before = await snapshot(id);
    const stale = await second.post(path).send({ coordinatorId: casey.id, expectedAssignmentVersion: version, reason: 'Stale handover' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('ASSIGNMENT_VERSION_CONFLICT');
    expect(await snapshot(id)).toEqual(before);
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'denies %s reassignment without writes', async (role) => {
      const actor = await profile(role);
      const { id, version } = await assigned();
      const session = await login(actor);
      const before = await snapshot(id);
      expect((await session.post(`/api/events/${id}/coordinator/reassign`).send({
        coordinatorId: blair.id, reason: 'Not authorised', expectedAssignmentVersion: version,
      })).status).toBe(403);
      expect(await snapshot(id)).toEqual(before);
    },
  );

  it('requires a session and rechecks a revoked Lead role for a previously signed-in account', async () => {
    const revoked = await profile('EVENT_COORDINATOR_LEAD');
    const { id, version } = await assigned();
    const input = { coordinatorId: blair.id, reason: 'Cover', expectedAssignmentVersion: version };
    const before = await snapshot(id);
    expect((await request(app).post(`/api/events/${id}/coordinator/reassign`).send(input)).status).toBe(401);
    const session = await login(revoked);
    await fixture.pool.query("UPDATE app_users SET role='EVENT_COORDINATOR' WHERE id=$1", [revoked.id]);
    expect((await session.post(`/api/events/${id}/coordinator/reassign`).send(input)).status).toBe(403);
    expect(await snapshot(id)).toEqual(before);
  });
});
