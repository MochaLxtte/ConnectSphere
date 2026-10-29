import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import { isAssignedCoordinator } from '../../../backend/src/modules/events/coordinator-access.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let otherOrganiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;
let venueStaff: WorkflowActor;
let attendee: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Olivia Organiser');
  otherOrganiser = await fixture.createUser('EVENT_ORGANISER', 'Other Organiser');
  coordinator = await fixture.createUser('EVENT_COORDINATOR', 'Cora Coordinator');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR', 'Other Coordinator');
  venueStaff = await fixture.createUser('VENUE_STAFF', 'Vic Venue');
  attendee = await fixture.createUser('ATTENDEE', 'Ada Attendee');
});

afterAll(async () => {
  await fixture.destroy();
});

/** The real routers with the production assignment policy and a fixed verified actor. */
function appFor(actor: WorkflowActor) {
  const { pool } = fixture;
  const policy = (reviewer: WorkflowActor, event: { coordinatorId: string | null }) =>
    isAssignedCoordinator(reviewer, event);
  return createApp({
    database: pool,
    submittedRequests: { pool, authenticate: async () => actor, canViewRequest: policy, canReviewRequest: policy },
    reviews: { pool, authenticate: async () => actor, canReviewRequest: policy },
    workspace: { pool, authenticate: async () => actor },
  });
}

const createEvent = (status: EventStatus = 'APPROVED') =>
  fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status });

async function stored(id: string) {
  const found = await fixture.pool.query(
    `SELECT status, purpose, revision, expected_attendance AS "expectedAttendance",
       starts_at AS "startsAt", equipment_requirements AS "equipmentRequirements"
     FROM event_requests WHERE id = $1`, [id]);
  return found.rows[0];
}

const revisionOf = async (id: string) => (await stored(id)).revision as number;
const base = (id: string) => `/api/events/${id}/change-requests`;

async function submit(id: string, changes: Record<string, unknown>, actor = organiser) {
  return request(appFor(actor)).post(base(id)).send({ changes, expectedRevision: await revisionOf(id) });
}

async function decide(id: string, changeId: string, body: Record<string, unknown>, actor = coordinator) {
  return request(appFor(actor)).post(`${base(id)}/${changeId}/decision`)
    .send({ ...body, expectedRevision: await revisionOf(id) });
}

async function venueBooking(eventId: string, status: 'PENDING' | 'APPROVED' = 'PENDING') {
  const venue = await fixture.pool.query<{ id: string }>(
    'INSERT INTO venues (name, capacity) VALUES ($1, 100) RETURNING id', [`Hall ${randomUUID()}`]);
  const booking = await fixture.pool.query<{ id: string }>(
    `INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, status, starts_at, ends_at, decided_by, decided_at)
     VALUES ($1, $2, $3, $4, '2026-12-01T02:00:00Z', '2026-12-01T06:00:00Z',
       CASE WHEN $4 = 'APPROVED' THEN $5::uuid END, CASE WHEN $4 = 'APPROVED' THEN now() END) RETURNING id`,
    [eventId, venue.rows[0]!.id, coordinator.id, status, venueStaff.id]);
  return booking.rows[0]!.id;
}

async function equipmentRequest(eventId: string) {
  const type = await fixture.pool.query<{ id: string }>(
    'INSERT INTO equipment_types (name, total_quantity) VALUES ($1, 10) RETURNING id', [`Mic ${randomUUID()}`]);
  const line = await fixture.pool.query<{ id: string }>(
    `INSERT INTO equipment_requests (event_request_id, equipment_type_id, requested_by, quantity, starts_at, ends_at)
     VALUES ($1, $2, $3, 2, '2026-12-01T02:00:00Z', '2026-12-01T06:00:00Z') RETURNING id`,
    [eventId, type.rows[0]!.id, coordinator.id]);
  return line.rows[0]!.id;
}

const statusOf = async (table: 'venue_bookings' | 'equipment_requests', id: string) =>
  (await fixture.pool.query(`SELECT status FROM ${table} WHERE id = $1`, [id])).rows[0]!.status as string;

describe('KAN-15 migration 017 completes the 004 table', () => {
  it('allows one pending request per event and requires a reason for rejection, privately', async () => {
    const id = await createEvent();
    const insert = (status = 'PENDING') => fixture.pool.query(
      `INSERT INTO event_change_requests (event_request_id, requested_by, status, proposed_changes, previous, base_revision)
       VALUES ($1, $2, $3, '{"purpose":"x"}', '{"purpose":"y"}', 1)`, [id, organiser.id, status]);
    await insert();
    await expect(insert()).rejects.toMatchObject({ code: '23505' });
    await expect(fixture.pool.query(
      `INSERT INTO event_change_requests (event_request_id, requested_by, status, proposed_changes, previous, base_revision,
         decided_by, decided_at) VALUES ($1, $2, 'REJECTED', '{"purpose":"x"}', '{}', 1, $2, now())`,
      [id, coordinator.id])).rejects.toMatchObject({ code: '23514' });
    await expect(fixture.pool.query(
      `INSERT INTO event_change_requests (event_request_id, requested_by, proposed_changes, previous, base_revision)
       VALUES ($1, $2, '{}', '{}', 1)`, [id, organiser.id])).rejects.toMatchObject({ code: '23514' });
    const rls = await fixture.pool.query(
      "SELECT relrowsecurity FROM pg_class WHERE relname = 'event_change_requests' AND relnamespace = current_schema()::regnamespace");
    expect(rls.rows[0].relrowsecurity).toBe(true);
  });
});

describe('KAN-15 submit and review', () => {
  it('KAN-15-AC1/AC2/AC3/AC10 saves a pending request without changing the event and notifies both people', async () => {
    const id = await createEvent();
    const before = await stored(id);
    const response = await submit(id, { expectedAttendance: 80, purpose: 'Purpose' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: 'PENDING', proposed: { expectedAttendance: 80 }, previous: { expectedAttendance: 50 },
      baseRevision: before.revision, current: { expectedAttendance: 50 }, outdated: false,
      impact: { affectedKinds: ['VENUE'], canApprove: true },
    });
    expect(await stored(id)).toEqual(before);

    const listed = await request(appFor(coordinator)).get(base(id));
    expect(listed.status).toBe(200);
    expect(listed.body.items).toEqual([response.body]);
    const notices = await fixture.notifications(id);
    expect(notices.map((row) => [row.type, row.recipient_id]).sort()).toEqual([
      ['CHANGE_REQUEST_SUBMITTED', coordinator.id], ['CHANGE_REQUEST_SUBMITTED', organiser.id],
    ].sort());
  });

  it('KAN-15-AC101 lets only one of two concurrent submissions become pending', async () => {
    const id = await createEvent('CONFIRMED');
    const revision = await revisionOf(id);
    const app = appFor(organiser);
    const results = await Promise.all([
      request(app).post(base(id)).send({ changes: { purpose: 'First' }, expectedRevision: revision }),
      request(app).post(base(id)).send({ changes: { purpose: 'Second' }, expectedRevision: revision }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(results.find((result) => result.status === 409)!.body.error.code).toBe('CHANGE_REQUEST_ALREADY_PENDING');
  });

  it('KAN-15-AC9/AC102 refuses other users, ordinary fields and events that are not approved', async () => {
    const id = await createEvent();
    expect((await submit(id, { purpose: 'x' }, otherOrganiser)).status).toBe(404);
    expect((await request(appFor(otherCoordinator)).get(base(id))).status).toBe(404);
    expect((await request(appFor(attendee)).get(base(id))).status).toBe(403);
    const named = await submit(id, { name: 'Renamed' });
    expect(named.status).toBe(400);
    expect(named.body.error.code).toBe('CHANGE_REQUEST_FIELD_NOT_ALLOWED');
    const submitted = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'SUBMITTED' });
    expect((await submit(submitted, { purpose: 'x' })).body.error.code).toBe('CHANGE_REQUEST_NOT_ALLOWED');
  });

  it('KAN-15-AC5/AC6/AC105 rejection needs a reason and leaves the event unchanged', async () => {
    const id = await createEvent();
    const change = (await submit(id, { purpose: 'New purpose' })).body;
    const before = await stored(id);
    const missing = await decide(id, change.id, { decision: 'REJECTED' });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('REJECTION_REASON_REQUIRED');
    const rejected = await decide(id, change.id, { decision: 'REJECTED', reason: 'Not this term.' });
    expect(rejected.status).toBe(200);
    expect(rejected.body).toMatchObject({ status: 'REJECTED', decisionReason: 'Not this term.', decidedById: coordinator.id });
    expect(await stored(id)).toEqual(before);
    const seen = await request(appFor(organiser)).get(base(id));
    expect(seen.body.items[0]).toMatchObject({ status: 'REJECTED', decisionReason: 'Not this term.' });
    expect((await fixture.notifications(id)).some((row) => row.type === 'CHANGE_REQUEST_REJECTED' && row.recipient_id === organiser.id))
      .toBe(true);
  });

  it('KAN-15-AC6/AC104 approval applies the values, audits them, and cancels affected pending arrangements only', async () => {
    const id = await createEvent();
    const pendingVenue = await venueBooking(id);
    const pendingEquipment = await equipmentRequest(id);
    const change = (await submit(id, { expectedAttendance: 90 })).body;
    expect(change.impact.pending.map((item: { id: string }) => item.id)).toEqual([pendingVenue]);

    const approved = await decide(id, change.id, { decision: 'APPROVED' });
    expect(approved.status).toBe(200);
    const after = await stored(id);
    expect(approved.body).toMatchObject({
      status: 'APPROVED', appliedRevision: after.revision,
      cancelledArrangements: { venueBookings: [pendingVenue], equipmentRequests: [] },
    });
    expect(after.expectedAttendance).toBe(90);
    expect(await statusOf('venue_bookings', pendingVenue)).toBe('CANCELLED');
    expect(await statusOf('equipment_requests', pendingEquipment)).toBe('REQUESTED');
    const audit = await fixture.pool.query(
      'SELECT editor_role, changes FROM event_request_edits WHERE event_request_id = $1', [id]);
    expect(audit.rows).toEqual([{ editor_role: 'EVENT_COORDINATOR', changes: { expectedAttendance: { from: 50, to: 90 } } }]);
    expect((await fixture.notifications(id)).find((row) => row.type === 'CHANGE_REQUEST_APPROVED' && row.recipient_id === organiser.id)!.message)
      .toContain('1 pending arrangement was cancelled');
    expect((await fixture.notifications(id)).some((row) => row.type === 'CHANGE_REQUEST_APPROVED' && row.recipient_id === coordinator.id)).toBe(true);
  });

  it('KAN-15-AC7 a date change cancels pending venue and equipment arrangements together', async () => {
    const id = await createEvent();
    const pendingVenue = await venueBooking(id);
    const pendingEquipment = await equipmentRequest(id);
    const change = (await submit(id, { startsAt: '2026-12-01T03:00:00Z' })).body;
    expect((await decide(id, change.id, { decision: 'APPROVED' })).status).toBe(200);
    expect(await statusOf('venue_bookings', pendingVenue)).toBe('CANCELLED');
    expect(await statusOf('equipment_requests', pendingEquipment)).toBe('CANCELLED');
    const released = (await fixture.pool.query(`SELECT released_by, released_at, release_reason,
      release_cause, revision, decided_at FROM equipment_requests WHERE id = $1`, [pendingEquipment])).rows[0];
    expect(released).toMatchObject({ released_by: coordinator.id, release_cause: 'MANUAL_CANCELLATION',
      revision: 2, decided_at: null });
    expect(released.released_at).toBeInstanceOf(Date);
    expect(released.release_reason).toContain('approved change request');
    expect((await stored(id)).startsAt).toEqual(new Date('2026-12-01T03:00:00Z'));
  });

  it.each([
    { equipmentRequirements: '10 microphones' },
    { startsAt: '2026-12-01T03:00:00Z' },
  ])('KAN-15/KAN-63 approval invalidates Not Required after equipment-impacting changes: %j', async (changes) => {
    const id = await createEvent();
    await fixture.pool.query("UPDATE event_requests SET equipment_plan_status = 'NOT_REQUIRED' WHERE id = $1", [id]);
    const change = (await submit(id, changes)).body;
    expect(change.impact.affectedKinds).toContain('EQUIPMENT');
    const approved = await decide(id, change.id, { decision: 'APPROVED' });
    expect(approved.status).toBe(200);
    const plan = (await fixture.pool.query('SELECT equipment_plan_status, revision FROM event_requests WHERE id = $1', [id])).rows[0];
    expect(plan.equipment_plan_status).toBe('REQUIRED');
    expect(plan.revision).toBe(approved.body.appliedRevision);
    const refreshed = await request(appFor(coordinator)).get(`/api/events/${id}/equipment-requests`);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.plan.status).toBe('REQUIRED');
  });

  it('KAN-15/KAN-63 rejection or unrelated approval preserves a no-equipment declaration', async () => {
    const id = await createEvent();
    await fixture.pool.query("UPDATE event_requests SET equipment_plan_status = 'NOT_REQUIRED' WHERE id = $1", [id]);
    const change = (await submit(id, { equipmentRequirements: '10 microphones' })).body;
    expect((await decide(id, change.id, { decision: 'REJECTED', reason: 'No equipment change needed.' })).status).toBe(200);
    const purpose = (await submit(id, { purpose: 'New event purpose' })).body;
    expect((await decide(id, purpose.id, { decision: 'APPROVED' })).status).toBe(200);
    expect((await fixture.pool.query('SELECT equipment_plan_status FROM event_requests WHERE id = $1', [id])).rows[0])
      .toEqual({ equipment_plan_status: 'NOT_REQUIRED' });
  });

  it('KAN-15-AC8/AC103 refuses approval over a confirmed booking or active registrations, changing nothing', async () => {
    const id = await createEvent();
    const confirmedVenue = await venueBooking(id, 'APPROVED');
    const change = (await submit(id, { startsAt: '2026-12-01T03:00:00Z' })).body;
    expect(change.impact).toMatchObject({ canApprove: false, confirmed: [{ id: confirmedVenue, status: 'APPROVED' }] });
    const before = await stored(id);
    const refused = await decide(id, change.id, { decision: 'APPROVED' });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('CANCEL_AND_RESUBMIT_REQUIRED');
    expect(await stored(id)).toEqual(before);
    expect(await statusOf('venue_bookings', confirmedVenue)).toBe('APPROVED');

    const registered = await createEvent();
    await fixture.pool.query('INSERT INTO event_registrations (event_request_id, attendee_id) VALUES ($1, $2)', [registered, attendee.id]);
    const registrationChange = (await submit(registered, { endsAt: '2026-12-01T08:00:00Z' })).body;
    expect(registrationChange.impact).toMatchObject({ activeRegistrations: 1, canApprove: false });
  });

  it('KAN-15-AC105 refuses a stale coordinator page, an outdated request and anyone but the assigned coordinator', async () => {
    const id = await createEvent();
    const change = (await submit(id, { purpose: 'New purpose' })).body;
    // The coordinator's page shows this revision; an unrelated rename then moves the event on.
    const shown = await revisionOf(id);
    await fixture.pool.query("UPDATE event_requests SET name = 'Renamed elsewhere' WHERE id = $1", [id]);
    const stale = await request(appFor(coordinator)).post(`${base(id)}/${change.id}/decision`)
      .send({ decision: 'APPROVED', expectedRevision: shown });
    expect(stale.body.error.code).toBe('EVENT_REVISION_CONFLICT');
    expect((await decide(id, change.id, { decision: 'APPROVED' }, otherCoordinator)).status).toBe(404);
    expect((await decide(id, change.id, { decision: 'APPROVED' }, organiser)).status).toBe(403);

    await fixture.pool.query("UPDATE event_requests SET purpose = 'Changed elsewhere' WHERE id = $1", [id]);
    const outdated = await decide(id, change.id, { decision: 'APPROVED' });
    expect(outdated.status).toBe(409);
    expect(outdated.body.error.code).toBe('CHANGE_REQUEST_OUTDATED');
  });

  it('serialises two coordinator decisions so exactly one wins', async () => {
    const id = await createEvent();
    const change = (await submit(id, { purpose: 'New purpose' })).body;
    const revision = await revisionOf(id);
    const app = appFor(coordinator);
    const results = await Promise.all([
      request(app).post(`${base(id)}/${change.id}/decision`).send({ decision: 'APPROVED', expectedRevision: revision }),
      request(app).post(`${base(id)}/${change.id}/decision`).send({ decision: 'REJECTED', reason: 'No', expectedRevision: revision }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  });

  it('lets the owner withdraw a pending request, then submit a new one', async () => {
    const id = await createEvent();
    const change = (await submit(id, { purpose: 'First idea' })).body;
    const withdrawn = await request(appFor(organiser)).post(`${base(id)}/${change.id}/withdraw`).send({});
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.status).toBe('WITHDRAWN');
    expect((await request(appFor(organiser)).post(`${base(id)}/${change.id}/withdraw`).send({})).status).toBe(409);
    expect((await decide(id, change.id, { decision: 'APPROVED' })).body.error.code).toBe('CHANGE_REQUEST_NOT_PENDING');
    expect((await submit(id, { purpose: 'Second idea' })).status).toBe(201);
  });
});
