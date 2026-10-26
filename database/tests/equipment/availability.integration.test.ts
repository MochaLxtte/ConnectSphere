import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import type { EquipmentAvailabilityContext } from '../../../backend/src/modules/equipment/availability-types.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let technician: WorkflowActor;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
const startsAt = '2031-01-12T02:00:00.000Z';
const endsAt = '2031-01-12T06:00:00.000Z';
const middle = '2031-01-12T04:00:00.000Z';
const base = '/api/equipment/availability/events';

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  technician = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
});
afterAll(async () => { await fixture?.destroy(); });

function app(actor: WorkflowActor | null = technician, pool = fixture.pool) {
  // Only identity verification is substituted. Every application query uses real PostgreSQL.
  return createApp({ database: pool, workspace: { pool, authenticate: async () => actor } });
}

async function event(status: 'APPROVED' | 'CONFIRMED' | 'DRAFT' | 'SUBMITTED' | 'REJECTED' = 'APPROVED', start = startsAt, end = endsAt) {
  return fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id,
    status, startsAt: start, endsAt: end, name: `Equipment planning ${randomUUID()}` });
}

async function equipment(options: { total?: number; damaged?: number; maintenance?: number; active?: boolean } = {}) {
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO equipment_types
    (id, name, category, total_quantity, damaged_quantity, maintenance_quantity, is_active)
    VALUES ($1, $2, 'AV', $3, $4, $5, $6)`,
  [id, `Projector ${id}`, options.total ?? 10, options.damaged ?? 2, options.maintenance ?? 1, options.active ?? true]);
  return id;
}

async function line(eventId: string, equipmentId: string, quantity: number,
  status: 'REQUESTED' | 'RESERVED' | 'REJECTED' | 'CANCELLED' = 'REQUESTED', start = startsAt, end = endsAt) {
  const id = randomUUID();
  const decided = status === 'RESERVED' || status === 'REJECTED';
  await fixture.pool.query(`INSERT INTO equipment_requests
    (id, event_request_id, equipment_type_id, requested_by, quantity, status, starts_at, ends_at,
     decided_by, decided_at, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Saved equipment need')`,
  [id, eventId, equipmentId, coordinator.id, quantity, status, start, end,
    decided ? technician.id : null, decided ? new Date() : null]);
  return id;
}

async function context(eventId: string, pool = fixture.pool): Promise<EquipmentAvailabilityContext> {
  const response = await request(app(technician, pool)).get(`${base}/${eventId}`).expect(200);
  expect(response.headers['cache-control']).toBe('no-store');
  return response.body as EquipmentAvailabilityContext;
}

async function saved(eventId: string) {
  const current = await context(eventId);
  return request(app()).post(`${base}/${eventId}`)
    .send({ mode: 'saved', requirementsVersion: current.requirementsVersion });
}

async function whatIf(eventId: string, items: { equipmentTypeId: string; quantity: number }[],
  start = startsAt, end = endsAt) {
  const current = await context(eventId);
  return request(app()).post(`${base}/${eventId}`)
    .send({ mode: 'what-if', requirementsVersion: current.requirementsVersion, startsAt: start, endsAt: end, items });
}

async function snapshot() {
  const tables = ['event_requests', 'equipment_requests', 'equipment_types', 'event_status_history', 'notifications'];
  return Object.fromEntries(await Promise.all(tables.map(async table =>
    [table, (await fixture.pool.query(`SELECT * FROM ${table} ORDER BY id`)).rows])));
}

describe('KAN-9 read-only equipment availability against real PostgreSQL', () => {
  it('lists only eligible events and returns minimal context with saved requirements and referenced inactive equipment', async () => {
    const approved = await event();
    const confirmed = await event('CONFIRMED');
    const draft = await event('DRAFT');
    const active = await equipment();
    const inactiveSaved = await equipment({ active: false });
    const inactiveOther = await equipment({ active: false });
    await fixture.pool.query('UPDATE event_requests SET equipment_requirements=$2 WHERE id=$1',
      [approved, 'Projectors and microphones']);
    const savedId = await line(approved, inactiveSaved, 2, 'REJECTED');
    const cancelledId = await line(approved, active, 1, 'CANCELLED');
    const listed = await request(app()).get(base).expect(200);
    expect(listed.body.items.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining([approved, confirmed]));
    expect(listed.body.items.map((item: { id: string }) => item.id)).not.toContain(draft);
    const current = await context(approved);
    expect(current.event).toMatchObject({ id: approved, status: 'APPROVED', equipmentRequirements: 'Projectors and microphones' });
    expect(current.requirementsVersion).toMatch(/^[a-f0-9]{64}$/);
    expect(current.equipmentTypes.find(item => item.id === active)).toMatchObject({ totalQuantity: 10,
      damagedQuantity: 2, maintenanceQuantity: 1, isActive: true });
    expect(current.equipmentTypes.map(item => item.id)).toContain(inactiveSaved);
    expect(current.equipmentTypes.map(item => item.id)).not.toContain(inactiveOther);
    expect(current.savedRequests.map(item => item.id)).toContain(savedId);
    expect(current.savedRequests.map(item => item.id)).not.toContain(cancelledId);
    for (const response of [current, listed.body]) {
      expect(JSON.stringify(response)).not.toContain(organiser.id);
      expect(JSON.stringify(response)).not.toContain(coordinator.id);
    }
  });

  it('uses operational stock minus simultaneous peak, with half-open adjacency and equality allowed', async () => {
    const target = await event();
    // Each committed reservation matches its event period under the KAN-26 integrity guard.
    const competing = await event('APPROVED', startsAt, middle);
    const adjacent = await event('APPROVED', middle, endsAt);
    const type = await equipment();
    await line(target, type, 3);
    await line(competing, type, 4, 'RESERVED', startsAt, middle);
    await line(adjacent, type, 3, 'RESERVED', middle, endsAt);
    // These overlap but consume no stock, unlike RESERVED lines.
    for (const status of ['REQUESTED', 'REJECTED', 'CANCELLED'] as const) await line(competing, type, 100, status);
    const before = await snapshot();
    const response = await saved(target);
    expect(response.status).toBe(200);
    expect(response.body.assessment).toMatchObject({ eventId: target, outcome: 'FULFILLABLE', advisory: true, mode: 'saved' });
    expect(response.body.assessment.items).toEqual([expect.objectContaining({ equipmentTypeId: type,
      totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1, operationalQuantity: 7,
      requestedQuantity: 3, peakReservedQuantity: 4, availableQuantity: 3, shortfallQuantity: 0 })]);
    expect(JSON.stringify(response.body)).not.toContain(competing);
    expect(await snapshot()).toEqual(before);
    const excess = await whatIf(target, [{ equipmentTypeId: type, quantity: 4 }]);
    expect(excess.status).toBe(200);
    expect(excess.body.assessment).toMatchObject({ outcome: 'SHORTFALL', mode: 'what-if',
      items: [expect.objectContaining({ availableQuantity: 3, shortfallQuantity: 1 })] });
    expect(await snapshot()).toEqual(before);
  });

  it('sums simultaneous reservations rather than taking the biggest individual reservation', async () => {
    const target = await event();
    const competing = await event('APPROVED', startsAt, middle);
    const overlapping = await event('APPROVED', '2031-01-12T03:00:00Z', endsAt);
    const type = await equipment();
    await line(competing, type, 4, 'RESERVED', startsAt, middle);
    await line(overlapping, type, 3, 'RESERVED', '2031-01-12T03:00:00Z', endsAt);
    const response = await whatIf(target, [{ equipmentTypeId: type, quantity: 1 }]);
    expect(response.status).toBe(200);
    expect(response.body.assessment).toMatchObject({ outcome: 'SHORTFALL', items: [expect.objectContaining({
      peakReservedQuantity: 7, availableQuantity: 0, shortfallQuantity: 1 })] });
  });

  it('fulfils mixed equipment types at equality and reports only the deficient type without writing records', async () => {
    const target = await event();
    const competing = await event();
    const typeA = await equipment({ total: 10, damaged: 2, maintenance: 1 });
    const typeB = await equipment({ total: 5, damaged: 0, maintenance: 0 });
    await line(competing, typeA, 4, 'RESERVED');
    await line(target, typeA, 3);
    await line(target, typeB, 1);
    const before = await snapshot();

    const equality = await saved(target);
    expect(equality.status).toBe(200);
    expect(equality.body.assessment).toMatchObject({ outcome: 'FULFILLABLE', mode: 'saved', advisory: true });
    expect(equality.body.assessment.items).toHaveLength(2);
    expect(equality.body.assessment.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ equipmentTypeId: typeA, requestedQuantity: 3, operationalQuantity: 7,
        peakReservedQuantity: 4, availableQuantity: 3, shortfallQuantity: 0 }),
      expect.objectContaining({ equipmentTypeId: typeB, requestedQuantity: 1, operationalQuantity: 5,
        peakReservedQuantity: 0, availableQuantity: 5, shortfallQuantity: 0 }),
    ]));
    expect(await snapshot()).toEqual(before);

    const shortage = await whatIf(target, [
      { equipmentTypeId: typeA, quantity: 4 }, { equipmentTypeId: typeB, quantity: 1 },
    ]);
    expect(shortage.status).toBe(200);
    expect(shortage.body.assessment).toMatchObject({ outcome: 'SHORTFALL', mode: 'what-if', advisory: true });
    expect(shortage.body.assessment.items).toHaveLength(2);
    expect(shortage.body.assessment.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ equipmentTypeId: typeA, requestedQuantity: 4,
        operationalQuantity: 7, peakReservedQuantity: 4, availableQuantity: 3, shortfallQuantity: 1 }),
      expect.objectContaining({ equipmentTypeId: typeB, requestedQuantity: 1,
        operationalQuantity: 5, peakReservedQuantity: 0, availableQuantity: 5, shortfallQuantity: 0 }),
    ]));
    expect(await snapshot()).toEqual(before);
  });

  it('preserves PostgreSQL microsecond overlap and adjacency boundaries', async () => {
    const target = await event();
    const competing = await event('APPROVED', startsAt, '2031-01-12T04:00:00.000501Z');
    const type = await equipment();
    await line(competing, type, 4, 'RESERVED', startsAt, '2031-01-12T04:00:00.000501Z');
    const touching = await whatIf(target, [{ equipmentTypeId: type, quantity: 7 }], '2031-01-12T04:00:00.000501Z', endsAt);
    expect(touching.status).toBe(200);
    expect(touching.body.assessment).toMatchObject({ outcome: 'FULFILLABLE',
      items: [expect.objectContaining({ peakReservedQuantity: 0, availableQuantity: 7 })] });
    const overlapping = await whatIf(target, [{ equipmentTypeId: type, quantity: 7 }], '2031-01-12T04:00:00.000500Z', endsAt);
    expect(overlapping.status).toBe(200);
    expect(overlapping.body.assessment).toMatchObject({ outcome: 'SHORTFALL',
      items: [expect.objectContaining({ peakReservedQuantity: 4, availableQuantity: 3, shortfallQuantity: 4 })] });
  });

  it('aggregates saved duplicate lines and excludes those reservations only in saved mode', async () => {
    const target = await event();
    const competing = await event();
    const type = await equipment();
    await line(target, type, 3, 'RESERVED');
    await line(target, type, 2, 'RESERVED');
    await line(competing, type, 2, 'RESERVED');
    const before = await snapshot();
    const actual = await saved(target);
    expect(actual.status).toBe(200);
    expect(actual.body.assessment).toMatchObject({ outcome: 'FULFILLABLE', items: [expect.objectContaining({
      requestedQuantity: 5, peakReservedQuantity: 2, availableQuantity: 5, shortfallQuantity: 0 })] });
    const hypothetical = await whatIf(target, [{ equipmentTypeId: type, quantity: 3 }, { equipmentTypeId: type, quantity: 2 }]);
    expect(hypothetical.status).toBe(200);
    expect(hypothetical.body.assessment).toMatchObject({ outcome: 'SHORTFALL', items: [expect.objectContaining({
      requestedQuantity: 5, peakReservedQuantity: 7, availableQuantity: 0, shortfallQuantity: 5 })] });
    expect(await snapshot()).toEqual(before);
  });

  it('reports every equipment type and its exact deficit, including inactive and zero-operational pools', async () => {
    const target = await event();
    const inactive = await equipment({ active: false });
    const zero = await equipment({ damaged: 8, maintenance: 2 });
    const limited = await equipment({ total: 3, damaged: 1, maintenance: 0 });
    await line(target, inactive, 2);
    await line(target, zero, 1);
    await line(target, limited, 3, 'REJECTED');
    const response = await saved(target);
    expect(response.status).toBe(200);
    expect(response.body.assessment.outcome).toBe('SHORTFALL');
    expect(response.body.assessment.items).toHaveLength(3);
    expect(response.body.assessment.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ equipmentTypeId: inactive, isActive: false, operationalQuantity: 0, availableQuantity: 0, shortfallQuantity: 2 }),
      expect.objectContaining({ equipmentTypeId: zero, operationalQuantity: 0, availableQuantity: 0, shortfallQuantity: 1 }),
      expect.objectContaining({ equipmentTypeId: limited, operationalQuantity: 2, availableQuantity: 2, shortfallQuantity: 1 }),
    ]));
  });

  it.each(['event text', 'saved quantity', 'saved status', 'saved period'] as const)(
    'rejects stale %s even when updated_at was not changed', async change => {
      const target = await event();
      const type = await equipment();
      const lineId = await line(target, type, 1);
      const current = await context(target);
      if (change === 'event text') await fixture.pool.query("UPDATE event_requests SET equipment_requirements='Changed requirement' WHERE id=$1", [target]);
      if (change === 'saved quantity') await fixture.pool.query('UPDATE equipment_requests SET quantity=2 WHERE id=$1', [lineId]);
      if (change === 'saved status') await fixture.pool.query("UPDATE equipment_requests SET status='CANCELLED' WHERE id=$1", [lineId]);
      if (change === 'saved period') await fixture.pool.query("UPDATE equipment_requests SET ends_at='2031-01-12T07:00:00Z' WHERE id=$1", [lineId]);
      const before = await snapshot();
      const response = await request(app()).post(`${base}/${target}`).send({ mode: 'saved', requirementsVersion: current.requirementsVersion });
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EQUIPMENT_CONTEXT_CHANGED');
      expect(await snapshot()).toEqual(before);
    });

  it('refuses mismatched saved periods and missing saved requirements instead of silently retiming or passing', async () => {
    const target = await event();
    const empty = await saved(target);
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('EQUIPMENT_REQUIREMENTS_EMPTY');
    const type = await equipment();
    const lineId = await line(target, type, 1, 'REQUESTED', startsAt, middle);
    const before = await snapshot();
    const mismatch = await saved(target);
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.error.code).toBe('EQUIPMENT_REQUEST_PERIOD_MISMATCH');
    expect(await snapshot()).toEqual(before);
    await fixture.pool.query("UPDATE equipment_requests SET status='CANCELLED' WHERE id=$1", [lineId]);
    expect((await saved(target)).body.error.code).toBe('EQUIPMENT_REQUIREMENTS_EMPTY');
  });

  it('reads current reservation and stock changes without accepting a stale cached capacity result', async () => {
    const target = await event();
    const competing = await event();
    const type = await equipment();
    await line(target, type, 3);
    const current = await context(target);
    await line(competing, type, 5, 'RESERVED');
    await fixture.pool.query('UPDATE equipment_types SET damaged_quantity=3 WHERE id=$1', [type]);
    const response = await request(app()).post(`${base}/${target}`).send({ mode: 'saved', requirementsVersion: current.requirementsVersion });
    expect(response.status).toBe(200);
    expect(response.body.assessment).toMatchObject({ outcome: 'SHORTFALL', items: [expect.objectContaining({
      operationalQuantity: 6, peakReservedQuantity: 5, availableQuantity: 1, shortfallQuantity: 2 })] });
  });

  it('reports a newly deactivated selected type as a shortfall without dropping the unsaved demand', async () => {
    const target = await event();
    const type = await equipment();
    const current = await context(target);
    expect(current.equipmentTypes.find(item => item.id === type)?.isActive).toBe(true);
    // The user's open form still contains this type, but the next check must read its current state.
    await fixture.pool.query('UPDATE equipment_types SET is_active=false WHERE id=$1', [type]);
    const before = await snapshot();
    const response = await request(app()).post(`${base}/${target}`).send({ mode: 'what-if',
      requirementsVersion: current.requirementsVersion, startsAt, endsAt,
      items: [{ equipmentTypeId: type, quantity: 2 }] });
    expect(response.status).toBe(200);
    expect(response.body.assessment).toMatchObject({ outcome: 'SHORTFALL', items: [expect.objectContaining({
      equipmentTypeId: type, requestedQuantity: 2, isActive: false,
      operationalQuantity: 0, availableQuantity: 0, shortfallQuantity: 2 })] });
    expect(response.body.assessment.items).toHaveLength(1);
    expect(await snapshot()).toEqual(before);
  });

  it('protects all three endpoints from anonymous and every non-technical role without changing records', async () => {
    const target = await event();
    const current = await context(target);
    const before = await snapshot();
    const actors: (WorkflowActor | null)[] = [null];
    for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as UserRole[]) {
      actors.push({ id: randomUUID(), role });
    }
    for (const actor of actors) {
      const expected = actor ? 403 : 401;
      const api = app(actor);
      for (const response of [await request(api).get(base), await request(api).get(`${base}/${target}`),
        await request(api).post(`${base}/${target}`).send({ mode: 'saved', requirementsVersion: current.requirementsVersion })]) {
        expect(response.status).toBe(expected);
        expect(response.body.error.code).toBe(actor ? 'ACTION_FORBIDDEN' : 'AUTHENTICATION_REQUIRED');
        expect(JSON.stringify(response.body)).not.toContain(target);
      }
    }
    expect(await snapshot()).toEqual(before);
  });

  it('refuses ineligible and missing events for direct context and assessment calls', async () => {
    for (const target of [await event('DRAFT'), await event('SUBMITTED'), await event('REJECTED'), randomUUID()]) {
      const response = await request(app()).get(`${base}/${target}`);
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
      const assessment = await request(app()).post(`${base}/${target}`)
        .send({ mode: 'saved', requirementsVersion: 'a'.repeat(64) });
      expect(assessment.status).toBe(404);
      expect(assessment.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
    }
  });

  it('rejects invalid or empty quantities, unknown equipment, and overflow when aggregating duplicate lines', async () => {
    const target = await event();
    const type = await equipment();
    const current = await context(target);
    const before = await snapshot();
    for (const items of [[], [{ equipmentTypeId: type, quantity: 0 }], [{ equipmentTypeId: type, quantity: 1.5 }],
      [{ equipmentTypeId: type, quantity: 2_147_483_647 }, { equipmentTypeId: type, quantity: 1 }]]) {
      const response = await request(app()).post(`${base}/${target}`)
        .send({ mode: 'what-if', requirementsVersion: current.requirementsVersion, startsAt, endsAt, items });
      expect(response.status).toBe(400);
    }
    const unknown = await whatIf(target, [{ equipmentTypeId: randomUUID(), quantity: 1 }]);
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe('EQUIPMENT_TYPE_NOT_FOUND');
    expect(await snapshot()).toEqual(before);
  });

  it('works with a PostgreSQL session that prohibits all writes', async () => {
    const target = await event();
    const type = await equipment();
    await line(target, type, 2);
    const before = await snapshot();
    const url = new URL(fixture.pool.options.connectionString!);
    url.searchParams.set('options', `${url.searchParams.get('options')} -c default_transaction_read_only=on`);
    const readOnlyPool = new pg.Pool({ connectionString: url.toString() });
    try {
      expect((await readOnlyPool.query('SHOW transaction_read_only')).rows[0]).toEqual({ transaction_read_only: 'on' });
      const api = app(technician, readOnlyPool);
      await request(api).get(base).expect(200);
      const current = await context(target, readOnlyPool);
      const response = await request(api).post(`${base}/${target}`)
        .send({ mode: 'saved', requirementsVersion: current.requirementsVersion }).expect(200);
      expect(response.body.assessment.outcome).toBe('FULFILLABLE');
    } finally {
      await readOnlyPool.end();
    }
    expect(await snapshot()).toEqual(before);
  });
});
