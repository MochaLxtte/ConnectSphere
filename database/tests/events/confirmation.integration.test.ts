import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';
import { confirmEvent, getEventConfirmation } from '../../../backend/src/modules/events/confirmation.js';
import { WorkflowError, type WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';

let f: WorkflowFixture;
let owner: WorkflowActor, coordinator: WorkflowActor, other: WorkflowActor, technical: WorkflowActor, venueStaff: WorkflowActor;
const start = '2035-01-01T02:00:00Z';
const end = '2035-01-01T05:00:00Z';

beforeAll(async () => {
  f = await createWorkflowFixture();
  owner = await f.createUser('EVENT_ORGANISER');
  coordinator = await f.createUser('EVENT_COORDINATOR', 'Casey Coordinator');
  other = await f.createUser('EVENT_COORDINATOR');
  technical = await f.createUser('TECHNICAL_SUPPORT_STAFF');
  venueStaff = await f.createUser('VENUE_STAFF');
});
afterAll(async () => { await f?.destroy(); });

/** A fully ready APPROVED event: one approved venue booking and one reserved equipment line. */
async function readyEvent(options: { startsAt?: string; endsAt?: string; equipment?: 'RESERVED' | 'REQUESTED' } = {}) {
  const startsAt = options.startsAt ?? start;
  const endsAt = options.endsAt ?? end;
  const id = await f.createEvent({ organiserId: owner.id, coordinatorId: coordinator.id, status: 'APPROVED', startsAt, endsAt });
  const type = randomUUID();
  await f.pool.query('INSERT INTO equipment_types(id, name, total_quantity) VALUES ($1, $2, 3)', [type, `Projector ${type}`]);
  const line = randomUUID();
  const reserved = (options.equipment ?? 'RESERVED') === 'RESERVED';
  await f.pool.query(`INSERT INTO equipment_requests(id, event_request_id, equipment_type_id, requested_by, quantity,
      starts_at, ends_at, status, decided_by, decided_at)
    VALUES ($1, $2, $3, $4, 2, $5, $6, $7, $8, CASE WHEN $8::uuid IS NULL THEN NULL ELSE now() END)`,
  [line, id, type, coordinator.id, startsAt, endsAt, reserved ? 'RESERVED' : 'REQUESTED', reserved ? technical.id : null]);
  const venue = randomUUID();
  await f.pool.query('INSERT INTO venues(id, name, capacity) VALUES ($1, $2, 100)', [venue, `Hall ${venue}`]);
  const booking = (await f.pool.query<{ id: string }>(`INSERT INTO venue_bookings(event_request_id, venue_id, requested_by,
      status, starts_at, ends_at, decided_by, decided_at)
    VALUES ($1, $2, $3, 'APPROVED', $4, $5, $6, now()) RETURNING id`,
  [id, venue, coordinator.id, startsAt, endsAt, venueStaff.id])).rows[0]!.id;
  return { id, type, line, venue, booking };
}

const confirm = (id: string, actor = coordinator) => confirmEvent(f.pool, { eventRequestId: id, actor, input: {} });
async function refusal(promise: Promise<unknown>): Promise<WorkflowError> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(WorkflowError);
  return error as WorkflowError;
}
const confirmations = async (id: string) => (await f.history(id)).filter(row => row.to_status === 'CONFIRMED');

describe('KAN-61 event confirmation on real PostgreSQL', () => {
  it('TC-06-04: records the actor and time, notifies once and stays confirmed after refresh', async () => {
    const { id } = await readyEvent();
    const result = await confirm(id);
    expect(result).toMatchObject({ status: 'CONFIRMED', changed: true,
      confirmation: { confirmedBy: coordinator.id, confirmedByName: 'Casey Coordinator' } });
    expect((await f.eventRow(id)).status).toBe('CONFIRMED');
    expect(await confirmations(id)).toEqual([{ from_status: 'APPROVED', to_status: 'CONFIRMED', changed_by: coordinator.id }]);
    // KAN-80-AC3 through migration 019: organiser, coordinator and arrangement staff, once each.
    const notices = (await f.notifications(id)).filter(row => row.type === 'EVENT_CONFIRMED');
    expect(notices.map(row => row.recipient_id).sort()).toEqual([owner.id, coordinator.id, technical.id, venueStaff.id].sort());
    // The organiser sees the outcome after a fresh read.
    const view = await getEventConfirmation(f.pool, { eventRequestId: id, actor: owner });
    expect(view).toMatchObject({ status: 'CONFIRMED', canConfirm: false, confirmation: { confirmedBy: coordinator.id } });
  });

  it('TC-06-05: a repeated confirmation changes nothing and sends nothing new', async () => {
    const { id } = await readyEvent();
    await confirm(id);
    const before = await f.notifications(id);
    expect(await confirm(id)).toMatchObject({ changed: false, status: 'CONFIRMED' });
    expect(await confirmations(id)).toHaveLength(1);
    expect(await f.notifications(id)).toEqual(before);
  });

  it('TC-06-05: two simultaneous confirmations produce exactly one transition', async () => {
    const { id } = await readyEvent();
    const results = await Promise.all([confirm(id), confirm(id)]);
    expect(results.map(result => result.changed).sort()).toEqual([false, true]);
    expect(await confirmations(id)).toHaveLength(1);
  });

  it('TC-06-01: the organiser, a different coordinator and a former coordinator cannot confirm', async () => {
    const { id } = await readyEvent();
    expect((await refusal(confirm(id, owner))).kind).toBe('FORBIDDEN');
    expect((await refusal(confirm(id, other))).code).toBe('EVENT_REQUEST_NOT_FOUND');
    await f.pool.query('UPDATE event_requests SET coordinator_id = $2 WHERE id = $1', [id, other.id]);
    expect((await refusal(confirm(id))).code).toBe('EVENT_REQUEST_NOT_FOUND');
    expect((await f.eventRow(id)).status).toBe('APPROVED');
    expect(await confirm(id, other)).toMatchObject({ changed: true });
  });

  it('TC-06-02: a submitted or under-review request cannot skip initial approval', async () => {
    for (const status of ['SUBMITTED', 'UNDER_REVIEW'] as const) {
      const id = await f.createEvent({ organiserId: owner.id, coordinatorId: coordinator.id, status, startsAt: start, endsAt: end });
      expect((await refusal(confirm(id))).code).toBe('EVENT_NOT_CONFIRMABLE');
      expect((await f.eventRow(id)).status).toBe(status);
    }
  });

  it('TC-06-03 / KAN-61-AC105: a booking still requiring outage recovery blocks confirmation', async () => {
    const { id, booking, venue } = await readyEvent();
    await f.pool.query(`INSERT INTO venue_outage_impacts(venue_booking_id, venue_id, outage_starts_at, outage_ends_at, outage_reason)
      VALUES ($1, $2, $3, $4, 'Flooding')`, [booking, venue, start, end]);
    const error = await refusal(confirm(id));
    expect(error.code).toBe('EVENT_NOT_READY');
    expect(error.message).toMatch(/1 venue booking still requiring outage recovery/);
    // Once recovery is resolved the event can be confirmed.
    await f.pool.query("UPDATE venue_outage_impacts SET status = 'RESOLVED' WHERE venue_booking_id = $1", [booking]);
    expect(await confirm(id)).toMatchObject({ changed: true });
  });

  it('TC-06-03: pending venue, unreserved equipment and a pending change each block confirmation', async () => {
    const pendingVenue = await readyEvent();
    const hall = randomUUID();
    await f.pool.query('INSERT INTO venues(id, name, capacity) VALUES ($1, $2, 80)', [hall, `Annex ${hall}`]);
    await f.pool.query(`INSERT INTO venue_bookings(event_request_id, venue_id, requested_by, status, starts_at, ends_at)
      VALUES ($1, $2, $3, 'PENDING', $4, $5)`, [pendingVenue.id, hall, coordinator.id, start, end]);
    expect((await refusal(confirm(pendingVenue.id))).message).toMatch(/1 venue arrangement awaiting approval/);

    const unreserved = await readyEvent({ equipment: 'REQUESTED' });
    expect((await refusal(confirm(unreserved.id))).message).toMatch(/must be reserved/);

    const changing = await readyEvent();
    await f.pool.query(`INSERT INTO event_change_requests(event_request_id, requested_by, proposed_changes, previous, base_revision)
      VALUES ($1, $2, '{"purpose": "New purpose"}', '{"purpose": "Purpose"}', 1)`, [changing.id, owner.id]);
    expect((await refusal(confirm(changing.id))).message).toMatch(/pending change request/);

    for (const { id } of [pendingVenue, unreserved, changing]) {
      expect((await f.eventRow(id)).status).toBe('APPROVED');
      expect(await confirmations(id)).toEqual([]);
    }
  });

  it('TC-06-03 / KAN-61-AC102: explicit Not Required equipment does not block confirmation', async () => {
    const id = await f.createEvent({ organiserId: owner.id, coordinatorId: coordinator.id, status: 'APPROVED', startsAt: start, endsAt: end });
    const venue = randomUUID();
    await f.pool.query('INSERT INTO venues(id, name, capacity) VALUES ($1, $2, 100)', [venue, `Hall ${venue}`]);
    await f.pool.query(`INSERT INTO venue_bookings(event_request_id, venue_id, requested_by, status, starts_at, ends_at, decided_by, decided_at)
      VALUES ($1, $2, $3, 'APPROVED', $4, $5, $6, now())`, [id, venue, coordinator.id, start, end, venueStaff.id]);
    expect((await refusal(confirm(id))).message).toMatch(/Record equipment as Not Required/);
    await f.pool.query("UPDATE event_requests SET equipment_plan_status = 'NOT_REQUIRED' WHERE id = $1", [id]);
    expect(await confirm(id)).toMatchObject({ changed: true });
  });

  it('TC-06-05: a change request committed while confirmation waits is seen and blocks it', async () => {
    const { id } = await readyEvent();
    const blocker = await f.pool.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM event_requests WHERE id = $1 FOR UPDATE', [id]);
      await blocker.query(`INSERT INTO event_change_requests(event_request_id, requested_by, proposed_changes, previous, base_revision)
        VALUES ($1, $2, '{"purpose": "Late change"}', '{"purpose": "Purpose"}', 1)`, [id, owner.id]);
      const waiting = confirm(id).catch((caught: unknown) => caught);
      await new Promise(resolve => setTimeout(resolve, 200));
      await blocker.query('COMMIT');
      const outcome = await waiting;
      expect(outcome).toBeInstanceOf(WorkflowError);
      expect((outcome as WorkflowError).code).toBe('EVENT_NOT_READY');
    } finally {
      await blocker.query('ROLLBACK').catch(() => undefined);
      blocker.release();
    }
    expect((await f.eventRow(id)).status).toBe('APPROVED');
  });

  it('refuses confirmation once the event has started', async () => {
    const { id } = await readyEvent({ startsAt: '2020-01-01T02:00:00Z', endsAt: '2020-01-01T05:00:00Z' });
    expect((await refusal(confirm(id))).code).toBe('EVENT_ALREADY_STARTED');
    expect((await getEventConfirmation(f.pool, { eventRequestId: id, actor: coordinator })).canConfirm).toBe(false);
  });

  it('TC-06-05: a failure after the status write rolls back status, history and notifications', async () => {
    const { id } = await readyEvent();
    await f.pool.query(`CREATE FUNCTION kan61_fail() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected failure'; END $$`);
    await f.pool.query(`CREATE TRIGGER kan61_fail AFTER INSERT ON event_status_history FOR EACH ROW
      WHEN (NEW.to_status = 'CONFIRMED') EXECUTE FUNCTION kan61_fail()`);
    try {
      await expect(confirm(id)).rejects.toThrow('injected failure');
    } finally {
      await f.pool.query('DROP TRIGGER kan61_fail ON event_status_history');
      await f.pool.query('DROP FUNCTION kan61_fail()');
    }
    expect((await f.eventRow(id)).status).toBe('APPROVED');
    expect(await confirmations(id)).toEqual([]);
    expect((await f.notifications(id)).filter(row => row.type === 'EVENT_CONFIRMED')).toEqual([]);
  });
});
