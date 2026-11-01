import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';
import { confirmEvent } from '../../../backend/src/modules/events/confirmation.js';
import {
  decideSafetyReview, getEventSafety, getSafetyReview, listSafetyQueue, startPreparation, submitSafetyReview,
} from '../../../backend/src/modules/safety/service.js';
import { WorkflowError, type WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';

let f: WorkflowFixture;
let owner: WorkflowActor, coordinator: WorkflowActor, officer: WorkflowActor;
let venueStaff: WorkflowActor, technical: WorkflowActor;
const start = '2035-03-01T02:00:00Z';
const end = '2035-03-01T05:00:00Z';

beforeAll(async () => {
  f = await createWorkflowFixture();
  owner = await f.createUser('EVENT_ORGANISER');
  coordinator = await f.createUser('EVENT_COORDINATOR', 'Casey Coordinator');
  officer = await f.createUser('SAFETY_OFFICER', 'Sam Safety');
  venueStaff = await f.createUser('VENUE_STAFF');
  technical = await f.createUser('TECHNICAL_SUPPORT_STAFF');
});
afterAll(async () => { await f?.destroy(); });

/** An APPROVED event with one approved venue booking and one reserved equipment line. */
async function readyEvent() {
  const id = await f.createEvent({ organiserId: owner.id, coordinatorId: coordinator.id, status: 'APPROVED', startsAt: start, endsAt: end });
  const type = randomUUID();
  await f.pool.query('INSERT INTO equipment_types(id, name, total_quantity) VALUES ($1, $2, 3)', [type, `Speaker ${type}`]);
  const line = randomUUID();
  await f.pool.query(`INSERT INTO equipment_requests(id, event_request_id, equipment_type_id, requested_by, quantity,
      starts_at, ends_at, status, decided_by, decided_at)
    VALUES ($1, $2, $3, $4, 2, $5, $6, 'RESERVED', $7, now())`, [line, id, type, coordinator.id, start, end, technical.id]);
  const venue = randomUUID();
  await f.pool.query(`INSERT INTO venues(id, name, capacity, layouts) VALUES ($1, $2, 120, '{Theatre,Banquet}')`, [venue, `Hall ${venue}`]);
  const booking = (await f.pool.query<{ id: string }>(`INSERT INTO venue_bookings(event_request_id, venue_id, requested_by,
      status, starts_at, ends_at, layout, decided_by, decided_at)
    VALUES ($1, $2, $3, 'APPROVED', $4, $5, 'Theatre', $6, now()) RETURNING id`,
  [id, venue, coordinator.id, start, end, venueStaff.id])).rows[0]!.id;
  return { id, venue, booking, line, type };
}

const notes = { emergencyAccess: 'Two exits on the east side', equipmentPlacement: 'Speakers on stage wings', crowdMovement: null };
const submit = (id: string, actor = coordinator, input: unknown = notes) => submitSafetyReview(f.pool, { eventRequestId: id, actor, input });
async function fingerprintOf(reviewId: string) {
  return (await getSafetyReview(f.pool, { reviewId, actor: officer })).review.fingerprint;
}
async function decide(reviewId: string, input: Record<string, unknown>, actor = officer) {
  return decideSafetyReview(f.pool, { reviewId, actor, input: { fingerprint: await fingerprintOf(reviewId), ...input } });
}
async function refusal(promise: Promise<unknown>): Promise<WorkflowError> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(WorkflowError);
  return error as WorkflowError;
}
const safety = (id: string, actor = coordinator) => getEventSafety(f.pool, { eventRequestId: id, actor });

describe('KAN-84-AC9 permanent safety approval invalidation', () => {
  it('does not revive a decided approval after a change and exact restoration without an intervening read', async () => {
    const { id, venue } = await readyEvent();
    const review = (await submit(id)).review;
    await decide(review.id, { decision: 'APPROVED' });
    await confirmEvent(f.pool, { eventRequestId: id, actor: coordinator, input: {} });
    await startPreparation(f.pool, { eventRequestId: id, actor: coordinator, input: {} });
    await f.pool.query('UPDATE venues SET setup_minutes = 15 WHERE id = $1', [venue]);
    await f.pool.query('UPDATE venues SET setup_minutes = 0 WHERE id = $1', [venue]);
    expect(await safety(id)).toMatchObject({ outcome: 'STALE', canSubmit: true, canStartPreparation: false,
      preparation: { blocked: true }, rounds: [{ id: review.id, status: 'APPROVED' }] });
    expect((await refusal(startPreparation(f.pool, { eventRequestId: id, actor: coordinator, input: {} }))).code)
      .toBe('SAFETY_APPROVAL_STALE');
    expect((await getSafetyReview(f.pool, { reviewId: review.id, actor: officer })).stale).toBe(true);
    const next = (await submit(id)).review;
    await decide(next.id, { decision: 'APPROVED' });
    expect(await startPreparation(f.pool, { eventRequestId: id, actor: coordinator, input: {} }))
      .toEqual({ eventRequestId: id, changed: true });
    expect(await safety(id)).toMatchObject({ outcome: 'APPROVED', preparation: { blocked: false } });
  });

  it.each([
    ['event attendance', 'UPDATE event_requests SET expected_attendance = 60 WHERE id = $1', 'UPDATE event_requests SET expected_attendance = 50 WHERE id = $1', 'id'],
    ['booking layout', "UPDATE venue_bookings SET layout = 'Banquet' WHERE id = $1", "UPDATE venue_bookings SET layout = 'Theatre' WHERE id = $1", 'booking'],
    ['equipment stock', 'UPDATE equipment_types SET maintenance_quantity = 1 WHERE id = $1', 'UPDATE equipment_types SET maintenance_quantity = 0 WHERE id = $1', 'type'],
    ['equipment requirements', "UPDATE equipment_requests SET technical_requirements = 'Keep clear of exits' WHERE id = $1", 'UPDATE equipment_requests SET technical_requirements = NULL WHERE id = $1', 'line'],
    ['venue facilities', "UPDATE venues SET facilities = '{Projector}' WHERE id = $1", "UPDATE venues SET facilities = '{}' WHERE id = $1", 'venue'],
  ] as const)('latches %s changes through restoration, once per review', async (_label, change, restore, key) => {
    const event = await readyEvent();
    const review = (await submit(event.id)).review;
    await decide(review.id, { decision: 'APPROVED' });
    await f.pool.query(change, [event[key]]);
    await f.pool.query(restore, [event[key]]);
    expect((await safety(event.id)).outcome).toBe('STALE');
    expect((await f.pool.query('SELECT review_id FROM safety_approval_invalidations WHERE review_id = $1', [review.id])).rows)
      .toEqual([{ review_id: review.id }]);
    await expect(f.pool.query('DELETE FROM safety_approval_invalidations WHERE review_id = $1', [review.id]))
      .rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query("UPDATE safety_approval_invalidations SET source = 'rewritten' WHERE review_id = $1", [review.id]))
      .rejects.toMatchObject({ code: '23514' });
  });

  it('preserves pending restore, but checks supplemental context before an officer can approve', async () => {
    const event = await readyEvent();
    const review = (await submit(event.id)).review;
    await f.pool.query("UPDATE equipment_requests SET technical_requirements = 'New placement' WHERE id = $1", [event.line]);
    expect((await safety(event.id)).pendingStale).toBe(true);
    expect((await listSafetyQueue(f.pool, officer)).items.find(row => row.id === review.id)?.stale).toBe(true);
    expect((await refusal(decide(review.id, { decision: 'APPROVED' }))).code).toBe('SAFETY_REVIEW_STALE');
    await f.pool.query('UPDATE equipment_requests SET technical_requirements = NULL WHERE id = $1', [event.line]);
    await decide(review.id, { decision: 'APPROVED' });
    expect((await safety(event.id)).outcome).toBe('APPROVED');
  });

  it('does not invalidate no-op, ordinary text or unrelated venue edits; rolls back an aborted source change', async () => {
    const event = await readyEvent(), unrelated = await readyEvent();
    const review = (await submit(event.id)).review;
    await decide(review.id, { decision: 'APPROVED' });
    await f.pool.query("UPDATE event_requests SET name = 'Renamed', description = 'New prose', purpose = 'Other prose' WHERE id = $1", [event.id]);
    await f.pool.query('UPDATE venues SET setup_minutes = setup_minutes WHERE id = $1', [event.venue]);
    await f.pool.query('UPDATE venues SET setup_minutes = 15 WHERE id = $1', [unrelated.venue]);
    const client = await f.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE venues SET setup_minutes = 15 WHERE id = $1', [event.venue]);
      expect((await client.query('SELECT 1 FROM safety_approval_invalidations WHERE review_id = $1', [review.id])).rowCount).toBe(1);
      await client.query('ROLLBACK');
    } finally { client.release(); }
    expect((await safety(event.id)).outcome).toBe('APPROVED');
    expect((await f.pool.query('SELECT 1 FROM safety_approval_invalidations WHERE review_id = $1', [review.id])).rowCount).toBe(0);
  });

  it('invalidates all reviewed events using a shared venue, without touching unrelated or pending reviews', async () => {
    const first = await readyEvent(), second = await readyEvent(), unrelated = await readyEvent(), pending = await readyEvent();
    // Separate times avoid creating a booking conflict in this shared-venue fixture.
    await f.pool.query("UPDATE venue_bookings SET venue_id = $2, starts_at = starts_at + interval '1 day', ends_at = ends_at + interval '1 day' WHERE id = $1", [second.booking, first.venue]);
    for (const event of [first, second, unrelated]) {
      const review = (await submit(event.id)).review;
      await decide(review.id, { decision: 'APPROVED' });
    }
    await submit(pending.id);
    await f.pool.query('UPDATE venues SET setup_minutes = 15 WHERE id = $1', [first.venue]);
    await f.pool.query('UPDATE venues SET setup_minutes = 0 WHERE id = $1', [first.venue]);
    expect((await safety(first.id)).outcome).toBe('STALE');
    expect((await safety(second.id)).outcome).toBe('STALE');
    expect((await safety(unrelated.id)).outcome).toBe('APPROVED');
    expect((await safety(pending.id)).outcome).toBe('PENDING');
  });

  it('latches a buffer-overlapping operational block even if it is removed before a read; ignores adjacent blocks', async () => {
    const event = await readyEvent();
    await f.pool.query('UPDATE venues SET setup_minutes = 15 WHERE id = $1', [event.venue]);
    const review = (await submit(event.id)).review;
    await decide(review.id, { decision: 'APPROVED' });
    const block = async (startsAt: string, endsAt: string) => (await f.pool.query<{ id: string }>(
      `INSERT INTO venue_unavailability(venue_id, starts_at, ends_at, reason, created_by)
       VALUES ($1, $2, $3, 'Maintenance', $4) RETURNING id`, [event.venue, startsAt, endsAt, venueStaff.id])).rows[0]!.id;
    const adjacent = await block('2035-03-01T01:00:00Z', '2035-03-01T01:45:00Z');
    expect((await safety(event.id)).outcome).toBe('APPROVED');
    await f.pool.query('DELETE FROM venue_unavailability WHERE id = $1', [adjacent]);
    const overlapping = await block('2035-03-01T01:30:00Z', '2035-03-01T01:50:00Z');
    await f.pool.query('DELETE FROM venue_unavailability WHERE id = $1', [overlapping]);
    expect((await safety(event.id)).outcome).toBe('STALE');
  });

  it('keeps new evidence tables and helper functions inaccessible through public/API roles', async () => {
    const names = ['safety_approval_invalidations', 'safety_review_context_baselines'];
    const tables = await f.pool.query(`SELECT c.relname, c.relrowsecurity AS rls,
      EXISTS(SELECT 1 FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) p WHERE p.grantee = 0) AS public_access
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = current_schema() AND c.relname = ANY($1) ORDER BY c.relname`, [names]);
    expect(tables.rows).toEqual(names.map(relname => ({ relname, rls: true, public_access: false })));
    const functions = await f.pool.query(`SELECT p.proname, p.proconfig,
      EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a WHERE a.grantee = 0) AS public_access
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = current_schema() AND p.proname IN ('safety_context_fingerprint', 'capture_safety_review_context',
        'protect_safety_invalidation_evidence', 'invalidate_safety_approval', 'invalidate_safety_on_arrangement_change',
        'invalidate_safety_on_unavailability')`);
    expect(functions.rows).toHaveLength(6);
    for (const row of functions.rows) {
      expect(row.public_access).toBe(false);
      expect(row.proconfig.join(' ')).toMatch(/search_path=test_.*pg_temp/);
    }
    const grants = await f.pool.query(`SELECT r.rolname, c.relname,
      has_table_privilege(r.oid, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS access
      FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE r.rolname IN ('anon','authenticated','service_role') AND n.nspname = current_schema() AND c.relname = ANY($1)`, [names]);
    for (const row of grants.rows) expect(row.access).toBe(false);
  });

  async function waitForLock(queryFragment: string) {
    await expect.poll(async () => (await f.pool.query(`SELECT count(*)::integer AS count FROM pg_stat_activity
      WHERE application_name = current_setting('application_name') AND pid <> pg_backend_pid()
        AND wait_event_type = 'Lock' AND query LIKE $1`, [`%${queryFragment}%`])).rows[0]!.count,
    { timeout: 3000 }).toBeGreaterThan(0);
  }

  it.each([
    ['venues', 'setup_minutes', 'venue'], ['equipment_types', 'maintenance_quantity', 'type'],
  ] as const)('serializes approval before %s change: the waiting edit invalidates the committed decision', async (table, column, key) => {
    const event = await readyEvent();
    const review = (await submit(event.id)).review;
    const fingerprint = await fingerprintOf(review.id);
    const guard = await f.pool.connect();
    let approval: Promise<unknown> | undefined, edit: Promise<unknown> | undefined;
    try {
      await guard.query('BEGIN');
      await guard.query('SELECT id FROM safety_reviews WHERE id = $1 FOR UPDATE', [review.id]);
      approval = decideSafetyReview(f.pool, { reviewId: review.id, actor: officer, input: { decision: 'APPROVED', fingerprint } });
      await waitForLock('FOR UPDATE OF s');
      edit = f.pool.query(`UPDATE ${table} SET ${column} = 1 WHERE id = $1`, [event[key]]);
      await waitForLock(`UPDATE ${table} SET ${column}`);
      await guard.query('COMMIT');
      await approval; await edit;
    } finally {
      await guard.query('ROLLBACK'); guard.release();
      await Promise.allSettled([approval, edit].filter(Boolean));
    }
    await f.pool.query(`UPDATE ${table} SET ${column} = 0 WHERE id = $1`, [event[key]]);
    expect((await safety(event.id)).outcome).toBe('STALE');
  });

  it.each([
    ['venues', 'setup_minutes', 'venue', 'ORDER BY v.id FOR SHARE'],
    ['equipment_types', 'maintenance_quantity', 'type', 'ORDER BY t.id FOR UPDATE'],
  ] as const)('serializes %s change first: the waiting approval refuses newer arrangements', async (table, column, key, lockQuery) => {
    const event = await readyEvent();
    const review = (await submit(event.id)).review;
    const fingerprint = await fingerprintOf(review.id);
    const guard = await f.pool.connect();
    let approval: Promise<unknown> | undefined;
    try {
      await guard.query('BEGIN');
      await guard.query(`UPDATE ${table} SET ${column} = 1 WHERE id = $1`, [event[key]]);
      approval = decideSafetyReview(f.pool, { reviewId: review.id, actor: officer, input: { decision: 'APPROVED', fingerprint } })
        .catch((error: unknown) => error);
      await waitForLock(lockQuery);
      await guard.query('COMMIT');
      expect(await approval).toMatchObject({ code: 'SAFETY_REVIEW_STALE' });
    } finally {
      await guard.query('ROLLBACK'); guard.release();
      await approval;
    }
    expect((await safety(event.id)).outcome).toBe('PENDING');
  });
});
