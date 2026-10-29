import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import type { EquipmentStockDetail, EquipmentStockItem } from '../../../backend/src/modules/equipment/stock-types.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let technician: WorkflowActor;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;
const day = (hour: number, minutes = 0) => `2031-01-12T${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000000Z`;
const stock = '/api/equipment/stock';

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  technician = await fixture.createUser('TECHNICAL_SUPPORT_STAFF', 'Taylor Technician');
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
});
afterAll(async () => { await fixture?.destroy(); });

function app(actor: WorkflowActor | null = technician) {
  // Only identity verification is substituted; services, transactions, triggers and constraints are real.
  return createApp({ database: fixture.pool, workspace: { pool: fixture.pool, authenticate: async () => actor } });
}

async function type(total = 10, damaged = 0, maintenance = 0, active = true) {
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO equipment_types
    (id,name,category,total_quantity,damaged_quantity,maintenance_quantity,is_active) VALUES($1,$2,'AV',$3,$4,$5,$6)`,
  [id, `Stock item ${id}`, total, damaged, maintenance, active]);
  return id;
}

async function event(owner: WorkflowActor = coordinator, start = day(2), end = day(6), status: 'APPROVED' | 'CONFIRMED' = 'APPROVED') {
  return fixture.createEvent({ organiserId: organiser.id, coordinatorId: owner.id, status, startsAt: start, endsAt: end,
    name: `Stock event ${randomUUID()}` });
}

async function reservedLine(eventId: string, typeId: string, quantity: number, start = day(2), end = day(6)) {
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO equipment_requests
    (id,event_request_id,equipment_type_id,requested_by,quantity,status,starts_at,ends_at,decided_by,decided_at,notes)
    VALUES($1,$2,$3,$4,$5,'RESERVED',$6,$7,$8,now(),'Fixture')`,
  [id, eventId, typeId, coordinator.id, quantity, start, end, technician.id]);
  return id;
}

async function requestedLine(eventId: string, typeId: string, quantity: number, start = day(2), end = day(6)) {
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO equipment_requests
    (id,event_request_id,equipment_type_id,requested_by,quantity,starts_at,ends_at,notes)
    VALUES($1,$2,$3,$4,$5,$6,$7,'Fixture')`, [id, eventId, typeId, coordinator.id, quantity, start, end]);
  return id;
}

const detail = async (typeId: string): Promise<EquipmentStockDetail> => (await request(app()).get(`${stock}/${typeId}`).expect(200)).body;
const change = (typeId: string, body: Record<string, unknown>, actor: WorkflowActor | null = technician) =>
  request(app(actor)).patch(`${stock}/${typeId}`).send(body);
const row = async (typeId: string) => (await fixture.pool.query('SELECT * FROM equipment_types WHERE id=$1', [typeId])).rows[0];
const history = async (typeId: string) => (await fixture.pool.query(
  'SELECT * FROM equipment_stock_changes WHERE equipment_type_id=$1 ORDER BY revision', [typeId])).rows;
const notices = async (recipient: string, eventId?: string) => (await fixture.pool.query(
  `SELECT * FROM notifications WHERE type='EQUIPMENT_STOCK_SHORTFALL' AND recipient_id=$1 AND ($2::uuid IS NULL OR event_request_id=$2) ORDER BY created_at`,
  [recipient, eventId ?? null])).rows;

describe('KAN-18 equipment stock and operational status against real PostgreSQL', () => {
  it('KAN-18-AC1 shows every type with its operational quantity, status and revision to Technical Support Staff', async () => {
    const full = await type(10, 0, 0);
    const partly = await type(10, 2, 1);
    const none = await type(4, 3, 1);
    const inactive = await type(5, 0, 0, false);
    const response = await request(app()).get(stock).expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const items: EquipmentStockItem[] = response.body.items;
    const find = (id: string) => items.find(item => item.id === id)!;
    expect(find(full)).toMatchObject({ operationalQuantity: 10, unavailableQuantity: 0, status: 'AVAILABLE', revision: 0, shortfallEventCount: 0 });
    expect(find(partly)).toMatchObject({ totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1, operationalQuantity: 7, unavailableQuantity: 3, status: 'PARTLY_UNAVAILABLE' });
    expect(find(none)).toMatchObject({ operationalQuantity: 0, status: 'UNAVAILABLE' });
    expect(find(inactive)).toMatchObject({ isActive: false, operationalQuantity: 0, status: 'UNAVAILABLE' });
  });

  it('KAN-18-AC2/AC3 marks equipment unavailable, saves it with a revision and history, and shows it after a reload', async () => {
    const id = await type(10, 0, 0);
    const response = await change(id, { expectedRevision: 0, damagedQuantity: 2, maintenanceQuantity: 1, reason: 'Two dropped, one in service.' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ changed: true, notifiedEvents: 0,
      item: { damagedQuantity: 2, maintenanceQuantity: 1, operationalQuantity: 7, status: 'PARTLY_UNAVAILABLE', revision: 1 } });
    expect(await row(id)).toMatchObject({ total_quantity: 10, damaged_quantity: 2, maintenance_quantity: 1, stock_revision: 1 });
    const fresh = await detail(id);
    expect(fresh.item).toMatchObject({ damagedQuantity: 2, maintenanceQuantity: 1, revision: 1 });
    expect(fresh.history).toHaveLength(1);
    expect(fresh.history[0]).toMatchObject({ revision: 1, changedById: technician.id, changedByName: 'Taylor Technician',
      reason: 'Two dropped, one in service.', previous: { totalQuantity: 10, damagedQuantity: 0, maintenanceQuantity: 0 },
      next: { totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1 } });
    expect(Number.isNaN(Date.parse(fresh.history[0]!.changedAt))).toBe(false);
  });

  it('KAN-18-AC4 does not count unavailable equipment when availability is checked for an event', async () => {
    const id = await type(10, 0, 0);
    const approved = await event();
    const context = (await request(app()).get(`/api/equipment/availability/events/${approved}`).expect(200)).body;
    const check = () => request(app()).post(`/api/equipment/availability/events/${approved}`).send({
      mode: 'what-if', requirementsVersion: context.requirementsVersion, startsAt: day(2), endsAt: day(6),
      items: [{ equipmentTypeId: id, quantity: 8 }] });
    expect((await check()).body.assessment.items[0]).toMatchObject({ operationalQuantity: 10, availableQuantity: 10, shortfallQuantity: 0 });
    await change(id, { expectedRevision: 0, damagedQuantity: 4, maintenanceQuantity: 2, reason: 'Batch recalled.' }).expect(200);
    expect((await check()).body.assessment.items[0]).toMatchObject({ operationalQuantity: 4, availableQuantity: 4, shortfallQuantity: 4 });
  });

  it('KAN-18-AC5/AC6 blocks a new reservation while unavailable and allows it once the equipment is restored', async () => {
    const id = await type(10, 0, 0);
    await change(id, { expectedRevision: 0, damagedQuantity: 6, reason: 'Water damage.' }).expect(200);
    const approved = await event();
    const wanted = await requestedLine(approved, id, 8);
    const reserve = async () => {
      const context = (await request(app()).get(`/api/equipment/reservations/events/${approved}`).expect(200)).body;
      return request(app()).post(`/api/equipment/reservations/events/${approved}/requests/${wanted}/reserve`)
        .send({ requirementsVersion: context.requirementsVersion });
    };
    const blocked = await reserve();
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('EQUIPMENT_STOCK_CONFLICT');
    expect((await fixture.pool.query('SELECT status FROM equipment_requests WHERE id=$1', [wanted])).rows[0].status).toBe('REQUESTED');
    // the database guard holds even if the service were bypassed
    await expect(fixture.pool.query(`UPDATE equipment_requests SET status='RESERVED', decided_by=$2, decided_at=now() WHERE id=$1`,
      [wanted, technician.id])).rejects.toMatchObject({ constraint: 'equipment_requests_within_pool' });
    const restored = await change(id, { expectedRevision: 1, damagedQuantity: 0, reason: 'Repaired and tested.' });
    expect(restored.body).toMatchObject({ changed: true, item: { operationalQuantity: 10, status: 'AVAILABLE', revision: 2 } });
    expect((await reserve()).status).toBe(200);
    expect((await fixture.pool.query('SELECT status FROM equipment_requests WHERE id=$1', [wanted])).rows[0].status).toBe('RESERVED');
    expect((await history(id)).map(item => [item.revision, item.new_damaged_quantity])).toEqual([[1, 6], [2, 0]]);
  });

  it.each([
    ['a negative quantity', { damagedQuantity: -1 }],
    ['a fractional quantity', { maintenanceQuantity: 1.5 }],
    ['a text quantity', { totalQuantity: '5' }],
    ['no quantity at all', {}],
    ['damaged plus maintenance above the total', { damagedQuantity: 6, maintenanceQuantity: 5 }],
    ['a total below the existing damaged quantity', { totalQuantity: 1 }],
  ])('KAN-18-AC101 refuses %s and changes nothing', async (_name, fields) => {
    const id = await type(10, 3, 0);
    const before = await row(id);
    const response = await change(id, { expectedRevision: 0, reason: 'Attempt', ...fields });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_EQUIPMENT_STOCK_INPUT');
    expect(await row(id)).toEqual(before);
    expect(await history(id)).toEqual([]);
  });

  it('KAN-18-AC101 requires a reason and the revision, and rejects unknown fields', async () => {
    const id = await type();
    for (const body of [{ expectedRevision: 0, damagedQuantity: 1 }, { expectedRevision: 0, damagedQuantity: 1, reason: '  ' },
      { damagedQuantity: 1, reason: 'x' }, { expectedRevision: 0, damagedQuantity: 1, reason: 'x', isActive: false }]) {
      expect((await change(id, body)).status).toBe(400);
    }
    expect(await history(id)).toEqual([]);
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as UserRole[])(
    'KAN-18-AC101 does not let %s see or alter stock', async role => {
      const id = await type(10, 0, 0);
      const before = await row(id);
      const other = await fixture.createUser(role);
      expect((await request(app(other)).get(stock)).status).toBe(403);
      expect((await request(app(other)).get(`${stock}/${id}`)).status).toBe(403);
      expect((await change(id, { expectedRevision: 0, damagedQuantity: 5, reason: 'Not allowed' }, other)).status).toBe(403);
      expect(await row(id)).toEqual(before);
      expect(await history(id)).toEqual([]);
    });

  it('KAN-18-AC101 refuses a signed-out caller and an unknown type', async () => {
    const id = await type();
    expect((await request(app(null)).get(stock)).status).toBe(401);
    expect((await change(id, { expectedRevision: 0, damagedQuantity: 1, reason: 'x' }, null)).status).toBe(401);
    expect((await change(randomUUID(), { expectedRevision: 0, damagedQuantity: 1, reason: 'x' })).body.error.code).toBe('EQUIPMENT_TYPE_NOT_FOUND');
    expect((await request(app()).get(`${stock}/not-a-uuid`)).status).toBe(400);
  });

  it('KAN-18-AC101 removes a technician whose role changed before the write', async () => {
    const id = await type();
    const demoted = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
    await fixture.pool.query(`UPDATE app_users SET role='EVENT_ORGANISER' WHERE id=$1`, [demoted.id]);
    const response = await change(id, { expectedRevision: 0, damagedQuantity: 1, reason: 'Stale session' }, demoted);
    expect(response.status).toBe(403);
    expect((await row(id)).damaged_quantity).toBe(0);
  });

  it('KAN-18-AC101 raising the total adds stock without touching the operational losses', async () => {
    const id = await type(10, 2, 1);
    const response = await change(id, { expectedRevision: 0, totalQuantity: 15, reason: 'New delivery.' });
    expect(response.body.item).toMatchObject({ totalQuantity: 15, damagedQuantity: 2, maintenanceQuantity: 1, operationalQuantity: 12 });
  });

  it('KAN-18-AC102 keeps existing reservations, reports the shortfall and tells only the affected coordinator once', async () => {
    const id = await type(10, 0, 0);
    const affected = await event(coordinator, day(2), day(6));
    const unaffected = await event(otherCoordinator, day(10), day(12));
    const line = await reservedLine(affected, id, 7, day(2), day(6));
    await reservedLine(unaffected, id, 2, day(10), day(12));
    const response = await change(id, { expectedRevision: 0, damagedQuantity: 5, reason: 'Fault found in batch.' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ changed: true, notifiedEvents: 1, item: { operationalQuantity: 5, shortfallEventCount: 1 } });
    expect(response.body.shortfalls).toEqual([expect.objectContaining({
      eventId: affected, reservedQuantity: 7, peakReservedQuantity: 7, operationalQuantity: 5, shortfallQuantity: 2 })]);
    expect((await fixture.pool.query('SELECT status,quantity FROM equipment_requests WHERE id=$1', [line])).rows[0])
      .toEqual({ status: 'RESERVED', quantity: 7 });
    expect((await fixture.eventRow(affected)).status).toBe('APPROVED');
    const told = await notices(coordinator.id, affected);
    expect(told).toHaveLength(1);
    expect(told[0].message).toContain('is 2 short');
    expect(await notices(otherCoordinator.id)).toEqual([]);
    expect(await notices(technician.id)).toEqual([]);
    expect(await notices(organiser.id)).toEqual([]);
    // it appears in the coordinator's inbox with a link they may use
    const inbox = await request(app(coordinator)).get('/api/notifications').expect(200);
    expect(inbox.body.items.find((item: { type: string }) => item.type === 'EQUIPMENT_STOCK_SHORTFALL'))
      .toMatchObject({ event: { id: affected }, link: `/reviews/${affected}` });
  });

  it('KAN-18-AC102 prevents more over-allocation until the shortfall is resolved', async () => {
    const id = await type(10, 0, 0);
    const holder = await event(coordinator, day(2), day(6));
    await reservedLine(holder, id, 7);
    await change(id, { expectedRevision: 0, damagedQuantity: 5, reason: 'Fault found.' }).expect(200);
    const newcomer = await event(otherCoordinator, day(3), day(5));
    const wanted = await requestedLine(newcomer, id, 1, day(3), day(5));
    const context = (await request(app()).get(`/api/equipment/reservations/events/${newcomer}`).expect(200)).body;
    const attempt = await request(app()).post(`/api/equipment/reservations/events/${newcomer}/requests/${wanted}/reserve`)
      .send({ requirementsVersion: context.requirementsVersion });
    expect(attempt.status).toBe(409);
    expect(attempt.body.error.code).toBe('EQUIPMENT_STOCK_CONFLICT');
    const resolved = await change(id, { expectedRevision: 1, damagedQuantity: 3, reason: 'Two repaired.' });
    expect(resolved.body).toMatchObject({ notifiedEvents: 0, shortfalls: [], item: { shortfallEventCount: 0 } });
  });

  it('KAN-18-AC102 reports each overlapping event and nothing for separate periods', async () => {
    const id = await type(10, 0, 0);
    const first = await event(coordinator, day(2), day(6));
    const second = await event(otherCoordinator, day(4), day(8));
    const apart = await event(coordinator, day(12), day(14));
    await reservedLine(first, id, 6, day(2), day(6));
    await reservedLine(second, id, 4, day(4), day(8));
    await reservedLine(apart, id, 6, day(12), day(14));
    const response = await change(id, { expectedRevision: 0, maintenanceQuantity: 2, reason: 'Scheduled service.' });
    expect(response.body.shortfalls.map((gap: { eventId: string; shortfallQuantity: number }) => [gap.eventId, gap.shortfallQuantity]).sort())
      .toEqual([[first, 2], [second, 2]].sort());
    expect(response.body.notifiedEvents).toBe(2);
    expect(await notices(coordinator.id, apart)).toEqual([]);
  });

  it('KAN-18-AC102 does not notify when stock is restored or raised', async () => {
    const id = await type(10, 0, 0);
    const holder = await event();
    await reservedLine(holder, id, 7);
    await change(id, { expectedRevision: 0, damagedQuantity: 5, reason: 'Loss.' }).expect(200);
    expect(await notices(coordinator.id, holder)).toHaveLength(1);
    await change(id, { expectedRevision: 1, damagedQuantity: 4, reason: 'One repaired, still short.' }).expect(200);
    await change(id, { expectedRevision: 2, totalQuantity: 20, reason: 'Delivery.' }).expect(200);
    expect(await notices(coordinator.id, holder)).toHaveLength(1);
  });

  it('KAN-18-AC102 treats a released (cancelled) reservation as no longer in need of cover', async () => {
    const id = await type(10, 0, 0);
    const holder = await event();
    const line = await reservedLine(holder, id, 7);
    await fixture.pool.query(`UPDATE equipment_requests SET status='CANCELLED', released_at=now(), released_by=$2,
      release_cause='MANUAL_CANCELLATION', release_reason='Not needed' WHERE id=$1`, [line, coordinator.id]);
    const response = await change(id, { expectedRevision: 0, damagedQuantity: 9, reason: 'Loss.' });
    expect(response.body).toMatchObject({ shortfalls: [], notifiedEvents: 0 });
  });

  it('KAN-18-AC103 refuses a stale stock form without overwriting newer quantities', async () => {
    const id = await type(10, 0, 0);
    await change(id, { expectedRevision: 0, damagedQuantity: 2, reason: 'First change.' }).expect(200);
    const stale = await change(id, { expectedRevision: 0, damagedQuantity: 9, reason: 'From an old form.' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('EQUIPMENT_STOCK_REVISION_CONFLICT');
    expect(await row(id)).toMatchObject({ damaged_quantity: 2, stock_revision: 1 });
    expect(await history(id)).toHaveLength(1);
  });

  it('KAN-18-AC103 refuses a stale form even when the quantities have returned to the earlier values', async () => {
    const id = await type(10, 0, 0);
    await change(id, { expectedRevision: 0, damagedQuantity: 2, reason: 'Down.' }).expect(200);
    await change(id, { expectedRevision: 1, damagedQuantity: 0, reason: 'Back up.' }).expect(200);
    expect((await change(id, { expectedRevision: 0, maintenanceQuantity: 4, reason: 'Old form.' })).status).toBe(409);
    expect((await row(id)).maintenance_quantity).toBe(0);
  });

  it('KAN-18-AC103 lets exactly one of two simultaneous changes from the same form win', async () => {
    const id = await type(10, 0, 0);
    const results = await Promise.all([
      change(id, { expectedRevision: 0, damagedQuantity: 1, reason: 'Technician A.' }),
      change(id, { expectedRevision: 0, damagedQuantity: 2, reason: 'Technician B.' }),
    ]);
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    const saved = await history(id);
    expect(saved).toHaveLength(1);
    expect((await row(id)).stock_revision).toBe(1);
    expect((await row(id)).damaged_quantity).toBe(saved[0].new_damaged_quantity);
  });

  it('KAN-18-AC103 answers a retry of a change that already committed with the saved state, once', async () => {
    const id = await type(10, 0, 0);
    const holder = await event();
    await reservedLine(holder, id, 7);
    const body = { expectedRevision: 0, damagedQuantity: 5, reason: 'Fault found.' };
    expect((await change(id, body)).body).toMatchObject({ changed: true, notifiedEvents: 1 });
    const retry = await change(id, body);
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ changed: false, notifiedEvents: 0, item: { revision: 1, damagedQuantity: 5 } });
    expect(await history(id)).toHaveLength(1);
    expect(await notices(coordinator.id, holder)).toHaveLength(1);
    // a different change on the same stale revision is still refused
    expect((await change(id, { ...body, damagedQuantity: 6 })).status).toBe(409);
  });

  it('KAN-18-AC103 records nothing when the submitted quantities already match', async () => {
    const id = await type(10, 2, 0);
    const response = await change(id, { expectedRevision: 0, damagedQuantity: 2, reason: 'No difference.' });
    expect(response.body).toMatchObject({ changed: false, item: { revision: 0 } });
    expect(await history(id)).toEqual([]);
  });

  it('rolls the whole change back, including its history, if a notification cannot be written', async () => {
    const id = await type(10, 0, 0);
    const holder = await event();
    await reservedLine(holder, id, 7);
    await fixture.pool.query(`CREATE FUNCTION stock_notice_fails() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.type = 'EQUIPMENT_STOCK_SHORTFALL' THEN RAISE EXCEPTION 'notice failed'; END IF; RETURN NEW; END $$`);
    await fixture.pool.query('CREATE TRIGGER stock_notice_fails BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION stock_notice_fails()');
    try {
      const failed = await change(id, { expectedRevision: 0, damagedQuantity: 5, reason: 'Fault found.' });
      expect(failed.status).toBe(500);
    } finally {
      await fixture.pool.query('DROP TRIGGER stock_notice_fails ON notifications');
      await fixture.pool.query('DROP FUNCTION stock_notice_fails()');
    }
    expect(await row(id)).toMatchObject({ damaged_quantity: 0, stock_revision: 0 });
    expect(await history(id)).toEqual([]);
    expect(await notices(coordinator.id, holder)).toEqual([]);
  });

  it('keeps stock history append-only and unreachable by the Data API roles', async () => {
    const id = await type();
    await change(id, { expectedRevision: 0, damagedQuantity: 1, reason: 'Recorded.' }).expect(200);
    await expect(fixture.pool.query('UPDATE equipment_stock_changes SET reason=$2 WHERE equipment_type_id=$1', [id, 'Edited']))
      .rejects.toMatchObject({ constraint: 'equipment_stock_changes_append_only' });
    await expect(fixture.pool.query('DELETE FROM equipment_stock_changes WHERE equipment_type_id=$1', [id]))
      .rejects.toMatchObject({ constraint: 'equipment_stock_changes_append_only' });
    const rls = await fixture.pool.query(`SELECT relrowsecurity FROM pg_class WHERE relname='equipment_stock_changes' AND relnamespace=current_schema()::regnamespace`);
    expect(rls.rows[0].relrowsecurity).toBe(true);
    await expect(fixture.pool.query(`INSERT INTO equipment_stock_changes (equipment_type_id,revision,changed_by,reason,
      previous_total_quantity,previous_damaged_quantity,previous_maintenance_quantity,new_total_quantity,new_damaged_quantity,new_maintenance_quantity)
      VALUES ($1,9,$2,'Too much',5,0,0,5,4,3)`, [id, technician.id])).rejects.toMatchObject({ constraint: 'equipment_stock_changes_new_within_total' });
  });

  it('keeps the list scoped to what a technician needs: stock only, no event or personal detail', async () => {
    const id = await type(10, 0, 0);
    const holder = await event();
    await reservedLine(holder, id, 7);
    await change(id, { expectedRevision: 0, damagedQuantity: 5, reason: 'Fault found.' }).expect(200);
    const response = await request(app()).get(`${stock}/${id}`).expect(200);
    expect(JSON.stringify(response.body)).not.toContain(coordinator.id);
    expect(JSON.stringify(response.body)).not.toContain(organiser.id);
  });
});

describe('KAN-18 specified case scenarios (TC-16-01 to TC-16-05) with their stated figures', () => {
  it('TC-16-01 marks one more unit damaged on EQ-A (10/2/1), saves it, and leaves EQ-B unchanged after a reload', async () => {
    const a = await type(10, 2, 1);
    const b = await type(10, 2, 1);
    const response = await change(a, { expectedRevision: 0, damagedQuantity: 3, reason: 'One more unit dropped.' });
    expect(response.status).toBe(200);
    const reloaded = await detail(a);
    expect(reloaded.item).toMatchObject({ totalQuantity: 10, damagedQuantity: 3, maintenanceQuantity: 1, operationalQuantity: 6, revision: 1 });
    expect((await detail(b)).item).toMatchObject({ totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1, operationalQuantity: 7, revision: 0 });
  });

  it('TC-16-02 counts only the 7 operational units of EQ-A (10 with 2 damaged and 1 in maintenance): 8 shows a 1-unit shortfall and cannot be reserved', async () => {
    const a = await type(10, 2, 1);
    const approved = await event();
    const wanted = await requestedLine(approved, a, 8);
    const availability = (await request(app()).get(`/api/equipment/availability/events/${approved}`).expect(200)).body;
    const checked = await request(app()).post(`/api/equipment/availability/events/${approved}`)
      .send({ mode: 'saved', requirementsVersion: availability.requirementsVersion }).expect(200);
    expect(checked.body.assessment.items[0]).toMatchObject({ operationalQuantity: 7, availableQuantity: 7, shortfallQuantity: 1 });
    const reservation = (await request(app()).get(`/api/equipment/reservations/events/${approved}`).expect(200)).body;
    const refused = await request(app()).post(`/api/equipment/reservations/events/${approved}/requests/${wanted}/reserve`)
      .send({ requirementsVersion: reservation.requirementsVersion });
    expect(refused.status).toBe(409);
    expect((await fixture.pool.query('SELECT status FROM equipment_requests WHERE id=$1', [wanted])).rows[0].status).toBe('REQUESTED');
  });

  it('TC-16-03 keeps a restored unit when a second session still holds the old totals', async () => {
    const a = await type(10, 2, 1);
    const first = (await detail(a)).item.revision;
    const second = (await detail(a)).item.revision;
    expect((await change(a, { expectedRevision: first, damagedQuantity: 1, reason: 'One unit repaired.' })).status).toBe(200);
    const stale = await change(a, { expectedRevision: second, totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1, reason: 'Old totals.' });
    expect(stale.status).toBe(409);
    expect((await detail(a)).item).toMatchObject({ damagedQuantity: 1, operationalQuantity: 8 });
    const approved = await event();
    const context = (await request(app()).get(`/api/equipment/availability/events/${approved}`).expect(200)).body;
    const what = await request(app()).post(`/api/equipment/availability/events/${approved}`).send({
      mode: 'what-if', requirementsVersion: context.requirementsVersion, startsAt: day(2), endsAt: day(6), items: [{ equipmentTypeId: a, quantity: 8 }] });
    expect(what.body.assessment.items[0]).toMatchObject({ operationalQuantity: 8, shortfallQuantity: 0 });
  });

  it('TC-16-04 saves (10, 2, 1) with actor, time and reason, refuses (-1, 0, 0), (10, 8, 3) and (10, 1.5, 0), and refuses O1', async () => {
    const a = await type(10, 0, 0);
    const saved = await change(a, { expectedRevision: 0, totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1, reason: 'Inspection results.' });
    expect(saved.status).toBe(200);
    const recorded = (await history(a))[0];
    expect(recorded).toMatchObject({ changed_by: technician.id, reason: 'Inspection results.', new_total_quantity: 10, new_damaged_quantity: 2, new_maintenance_quantity: 1 });
    expect(recorded.changed_at).toBeInstanceOf(Date);
    for (const bad of [{ totalQuantity: -1, damagedQuantity: 0, maintenanceQuantity: 0 }, { totalQuantity: 10, damagedQuantity: 8, maintenanceQuantity: 3 },
      { totalQuantity: 10, damagedQuantity: 1.5, maintenanceQuantity: 0 }]) {
      expect((await change(a, { expectedRevision: 1, reason: 'Invalid attempt.', ...bad })).status).toBe(400);
    }
    const owner = await fixture.createUser('EVENT_ORGANISER');
    expect((await change(a, { expectedRevision: 1, damagedQuantity: 1, reason: 'Retry as organiser.' }, owner)).status).toBe(403);
    expect(await row(a)).toMatchObject({ total_quantity: 10, damaged_quantity: 2, maintenance_quantity: 1, stock_revision: 1 });
    expect(await history(a)).toHaveLength(1);
  });

  it('TC-16-05 flags a 1-unit shortfall for E-A (7 reserved) when 4 of 10 units are damaged, with a coordinator notice, and not E-B (2 reserved, disjoint)', async () => {
    const a = await type(10, 0, 0);
    const eventA = await event(coordinator, day(2), day(6));
    const eventB = await event(otherCoordinator, day(10), day(12));
    const lineA = await reservedLine(eventA, a, 7, day(2), day(6));
    const lineB = await reservedLine(eventB, a, 2, day(10), day(12));
    const response = await change(a, { expectedRevision: 0, damagedQuantity: 4, reason: 'Four units damaged.' });
    expect(response.body.shortfalls).toEqual([expect.objectContaining({ eventId: eventA, shortfallQuantity: 1, reservedQuantity: 7, operationalQuantity: 6 })]);
    expect((await notices(coordinator.id, eventA))).toHaveLength(1);
    expect(await notices(otherCoordinator.id, eventB)).toEqual([]);
    expect((await fixture.pool.query('SELECT id,status,quantity FROM equipment_requests WHERE id = ANY($1) ORDER BY quantity DESC', [[lineA, lineB]])).rows)
      .toEqual([{ id: lineA, status: 'RESERVED', quantity: 7 }, { id: lineB, status: 'RESERVED', quantity: 2 }]);
    expect((await fixture.history(eventA)).map((entry: { to_status: string }) => entry.to_status)).toEqual(['APPROVED']);
  });
});
