import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';
import { confirmEvent } from '../../../backend/src/modules/events/confirmation.js';
import { listNotifications } from '../../../backend/src/modules/notifications/inbox.js';
import {
  decideSafetyReview, getEventSafety, getSafetyReview, listSafetyQueue, startPreparation, submitSafetyReview,
} from '../../../backend/src/modules/safety/service.js';
import { WorkflowError, type WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';

let f: WorkflowFixture;
let owner: WorkflowActor, coordinator: WorkflowActor, other: WorkflowActor, officer: WorkflowActor, officer2: WorkflowActor;
let venueStaff: WorkflowActor, technical: WorkflowActor;
const start = '2035-03-01T02:00:00Z';
const end = '2035-03-01T05:00:00Z';

beforeAll(async () => {
  f = await createWorkflowFixture();
  owner = await f.createUser('EVENT_ORGANISER');
  coordinator = await f.createUser('EVENT_COORDINATOR', 'Casey Coordinator');
  other = await f.createUser('EVENT_COORDINATOR');
  officer = await f.createUser('SAFETY_OFFICER', 'Sam Safety');
  officer2 = await f.createUser('SAFETY_OFFICER');
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

describe('KAN-84 safety review on real PostgreSQL', () => {
  it('TC-06-21 / KAN-84-AC2/AC101: only ready arrangements can be submitted; outage recovery blocks', async () => {
    const { id, booking, venue } = await readyEvent();
    await f.pool.query(`INSERT INTO venue_outage_impacts(venue_booking_id, venue_id, outage_starts_at, outage_ends_at, outage_reason)
      VALUES ($1, $2, $3, $4, 'Fire alarm fault')`, [booking, venue, start, end]);
    const blocked = await refusal(submit(id));
    expect(blocked.code).toBe('EVENT_NOT_READY');
    expect(blocked.message).toMatch(/outage recovery/);
    expect((await safety(id)).canSubmit).toBe(false);
    await f.pool.query("UPDATE venue_outage_impacts SET status = 'RESOLVED' WHERE venue_booking_id = $1", [booking]);
    const { review } = await submit(id);
    expect(review).toMatchObject({ round: 1, status: 'PENDING', missingNotes: ['crowdMovement'] });
    // Only the assigned coordinator may submit.
    expect((await refusal(submit(id, other))).code).toBe('EVENT_REQUEST_NOT_FOUND');
    expect((await refusal(submit(id, owner))).kind).toBe('FORBIDDEN');
  });

  it('TC-06-20/30 / KAN-84-AC1/AC11: every Safety Officer is notified and only officers use the queue', async () => {
    const { id } = await readyEvent();
    const { review } = await submit(id);
    for (const actor of [officer, officer2]) {
      const notices = (await listNotifications(f.dependencies, actor)).filter(n => n.type === 'SAFETY_REVIEW_SUBMITTED');
      expect(notices).toEqual(expect.arrayContaining([expect.objectContaining({ link: `/safety-reviews/${review.id}`, event: null })]));
    }
    expect((await listSafetyQueue(f.pool, officer)).items.map(item => item.id)).toContain(review.id);
    for (const actor of [coordinator, owner, venueStaff]) {
      expect((await refusal(listSafetyQueue(f.pool, actor))).kind).toBe('FORBIDDEN');
      expect((await refusal(getSafetyReview(f.pool, { reviewId: review.id, actor }))).kind).toBe('FORBIDDEN');
    }
  });

  it('TC-06-22 / KAN-84-AC3: the officer sees attendance, venues, layouts, equipment and missing notes', async () => {
    const { id } = await readyEvent();
    const { review } = await submit(id);
    const detail = await getSafetyReview(f.pool, { reviewId: review.id, actor: officer });
    expect(detail.event).toMatchObject({ expectedAttendance: 50, venueRequirements: 'A hall' });
    expect(detail.venues).toEqual([expect.objectContaining({ capacity: 120, layouts: ['Theatre', 'Banquet'],
      bookedLayout: 'Theatre', needsRecovery: false })]);
    expect(detail.equipment).toEqual([expect.objectContaining({ quantity: 2, status: 'RESERVED' })]);
    expect(detail.review).toMatchObject({ emergencyAccess: 'Two exits on the east side', crowdMovement: null,
      missingNotes: ['crowdMovement'] });
    expect(detail).toMatchObject({ stale: false, canDecide: true });
  });

  it('TC-06-23/24 / KAN-84-AC4/AC5: approval and rejection are recorded once; reject leaves arrangements intact', async () => {
    const approved = await readyEvent();
    const first = (await submit(approved.id)).review;
    expect((await decide(first.id, { decision: 'APPROVED' })).review).toMatchObject({ status: 'APPROVED', decidedByName: 'Sam Safety' });
    expect((await safety(approved.id)).outcome).toBe('APPROVED');
    const coordinatorNotices = (await listNotifications(f.dependencies, coordinator)).filter(n => n.type === 'SAFETY_REVIEW_APPROVED');
    expect(coordinatorNotices).toHaveLength(1);

    const rejected = await readyEvent();
    const round = (await submit(rejected.id)).review;
    expect((await refusal(decide(round.id, { decision: 'REJECTED', notes: '   ' }))).kind).toBe('INVALID_INPUT');
    await decide(round.id, { decision: 'REJECTED', notes: 'No accessible exit route.' });
    expect((await f.eventRow(rejected.id)).status).toBe('APPROVED');
    const bookings = await f.pool.query("SELECT status FROM venue_bookings WHERE event_request_id = $1", [rejected.id]);
    expect(bookings.rows).toEqual([{ status: 'APPROVED' }]);
    expect((await safety(rejected.id)).outcome).toBe('REJECTED');
    // A new round may be submitted after rejection.
    expect((await submit(rejected.id)).review.round).toBe(2);
  });

  it('TC-06-25/26 / KAN-84-AC6/AC7: request changes informs the area staff and keeps prior rounds', async () => {
    const { id } = await readyEvent();
    const first = (await submit(id)).review;
    expect((await refusal(decide(first.id, { decision: 'CHANGES_REQUESTED', notes: 'Move speakers', areas: [] }))).kind).toBe('INVALID_INPUT');
    await decide(first.id, { decision: 'CHANGES_REQUESTED', notes: 'Move speakers away from exits.', areas: ['TECHNICAL', 'VENUE'] });
    expect((await listNotifications(f.dependencies, venueStaff)).some(n => n.type === 'SAFETY_CHANGES_REQUESTED'
      && n.message.includes('venue changes'))).toBe(true);
    expect((await listNotifications(f.dependencies, technical)).some(n => n.type === 'SAFETY_CHANGES_REQUESTED'
      && n.message.includes('technical changes'))).toBe(true);
    const view = await safety(id);
    expect(view).toMatchObject({ outcome: 'CHANGES_REQUESTED', canSubmit: true });
    expect(view.rounds[0]).toMatchObject({ requestedAreas: ['VENUE', 'TECHNICAL'], decisionNotes: 'Move speakers away from exits.' });
    const second = (await submit(id, coordinator, { ...notes, crowdMovement: 'One-way flow to the foyer' })).review;
    expect(second.round).toBe(2);
    expect((await refusal(submit(id))).code).toBe('SAFETY_REVIEW_PENDING');
    expect((await safety(id)).rounds.map(round => [round.round, round.status])).toEqual([[2, 'PENDING'], [1, 'CHANGES_REQUESTED']]);
  });

  it('TC-06-29 / KAN-84-AC10: opposite simultaneous decisions leave exactly one, repeats are no-ops, history is immutable', async () => {
    const { id } = await readyEvent();
    const round = (await submit(id)).review;
    const fingerprint = await fingerprintOf(round.id);
    const outcomes = await Promise.allSettled([
      decideSafetyReview(f.pool, { reviewId: round.id, actor: officer, input: { decision: 'APPROVED', fingerprint } }),
      decideSafetyReview(f.pool, { reviewId: round.id, actor: officer2, input: { decision: 'REJECTED', notes: 'Unsafe', fingerprint } }),
    ]);
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1);
    const failure = outcomes.find(outcome => outcome.status === 'rejected') as PromiseRejectedResult;
    expect((failure.reason as WorkflowError).code).toBe('SAFETY_REVIEW_DECIDED');
    const saved = (await safety(id)).rounds[0]!;
    const before = (await f.notifications(id)).length;
    expect((await decideSafetyReview(f.pool, { reviewId: round.id, actor: officer,
      input: { decision: saved.status, notes: saved.decisionNotes ?? undefined, fingerprint } })).changed).toBe(false);
    expect((await f.notifications(id)).length).toBe(before);
    await expect(f.pool.query("UPDATE safety_reviews SET decision_notes = 'rewritten' WHERE id = $1", [round.id]))
      .rejects.toThrow(/cannot be changed/);
  });

  it('TC-06-28 / KAN-84-AC9/AC10: a changed arrangement makes approval stale; name edits do not', async () => {
    const { id } = await readyEvent();
    const pending = (await submit(id)).review;
    await f.pool.query('UPDATE event_requests SET expected_attendance = 90 WHERE id = $1', [id]);
    expect((await refusal(decide(pending.id, { decision: 'APPROVED' }))).code).toBe('SAFETY_REVIEW_STALE');
    expect((await safety(id)).pendingStale).toBe(true);
    await decide(pending.id, { decision: 'CHANGES_REQUESTED', notes: 'Attendance changed; resubmit.', areas: ['VENUE'] });

    const approved = (await submit(id)).review;
    await decide(approved.id, { decision: 'APPROVED' });
    await f.pool.query("UPDATE event_requests SET name = 'Renamed dinner', description = 'New text' WHERE id = $1", [id]);
    expect((await safety(id)).outcome).toBe('APPROVED');
    await f.pool.query('UPDATE event_requests SET expected_attendance = 110 WHERE id = $1', [id]);
    expect((await safety(id)).outcome).toBe('STALE');
    expect((await safety(id)).canSubmit).toBe(true);
  });

  it('TC-06-27 / KAN-84-AC8/AC9: preparation needs confirmation and current approval, and blocks after a change', async () => {
    const { id, type } = await readyEvent();
    const round = (await submit(id)).review;
    await decide(round.id, { decision: 'APPROVED' });
    const prepare = () => startPreparation(f.pool, { eventRequestId: id, actor: coordinator, input: {} });
    expect((await refusal(prepare())).code).toBe('EVENT_NOT_CONFIRMED');
    await confirmEvent(f.pool, { eventRequestId: id, actor: coordinator, input: {} });
    expect((await safety(id, owner)).canStartPreparation).toBe(false);
    expect((await safety(id)).canStartPreparation).toBe(true);
    expect((await refusal(startPreparation(f.pool, { eventRequestId: id, actor: owner, input: {} }))).kind).toBe('FORBIDDEN');
    expect(await prepare()).toEqual({ eventRequestId: id, changed: true });
    expect(await prepare()).toEqual({ eventRequestId: id, changed: false });
    expect((await safety(id, owner)).preparation).toMatchObject({ startedByName: 'Casey Coordinator', blocked: false });
    // An operational stock loss changes the reviewed arrangement.
    await f.pool.query('UPDATE equipment_types SET maintenance_quantity = 1 WHERE id = $1', [type]);
    expect((await safety(id)).preparation).toMatchObject({ blocked: true });
    expect((await refusal(prepare())).code).toBe('SAFETY_APPROVAL_STALE');
    const reround = (await submit(id)).review;
    await decide(reround.id, { decision: 'APPROVED' });
    expect(await prepare()).toEqual({ eventRequestId: id, changed: true });
    expect((await safety(id)).preparation).toMatchObject({ blocked: false });
  });

  it('a failure while notifying rolls back the submitted round', async () => {
    const { id } = await readyEvent();
    await f.pool.query(`CREATE FUNCTION kan84_fail() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected failure'; END $$`);
    await f.pool.query(`CREATE TRIGGER kan84_fail BEFORE INSERT ON notifications FOR EACH ROW
      WHEN (NEW.type = 'SAFETY_REVIEW_SUBMITTED') EXECUTE FUNCTION kan84_fail()`);
    try {
      await expect(submit(id)).rejects.toThrow('injected failure');
    } finally {
      await f.pool.query('DROP TRIGGER kan84_fail ON notifications');
      await f.pool.query('DROP FUNCTION kan84_fail()');
    }
    expect((await f.pool.query('SELECT 1 FROM safety_reviews WHERE event_request_id = $1', [id])).rowCount).toBe(0);
  });
});
