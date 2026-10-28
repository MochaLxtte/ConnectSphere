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

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Olivia Organiser');
  otherOrganiser = await fixture.createUser('EVENT_ORGANISER', 'Other Organiser');
  coordinator = await fixture.createUser('EVENT_COORDINATOR', 'Cora Coordinator');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR', 'Other Coordinator');
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

async function createEvent(status: EventStatus, coordinatorId: string | null = coordinator.id) {
  return fixture.createEvent({ organiserId: organiser.id, coordinatorId, status });
}

async function stored(id: string) {
  const found = await fixture.pool.query(
    `SELECT status, coordinator_id AS "coordinatorId", name, purpose, description, revision,
       expected_attendance AS "expectedAttendance", starts_at AS "startsAt"
     FROM event_requests WHERE id = $1`, [id]);
  return found.rows[0];
}

async function edits(id: string) {
  const found = await fixture.pool.query(
    `SELECT revision, edited_by AS "editedBy", editor_role AS "editorRole", event_status AS "eventStatus", changes
     FROM event_request_edits WHERE event_request_id = $1 ORDER BY revision`, [id]);
  return found.rows;
}

describe('KAN-66 migration 016 revision trigger', () => {
  it('starts at 1 and advances on every update, ignoring a written value', async () => {
    const id = await createEvent('SUBMITTED');
    expect((await stored(id)).revision).toBe(1);
    await fixture.pool.query("UPDATE event_requests SET status = 'UNDER_REVIEW' WHERE id = $1", [id]);
    expect((await stored(id)).revision).toBe(2);
    await fixture.pool.query('UPDATE event_requests SET revision = 99, name = $2 WHERE id = $1', [id, 'Renamed']);
    expect((await stored(id)).revision).toBe(3);
  });

  it('keeps the audit table private to the API role and requires a non-empty change set', async () => {
    const id = await createEvent('SUBMITTED');
    await expect(fixture.pool.query(
      `INSERT INTO event_request_edits (event_request_id, revision, edited_by, editor_role, event_status, changes)
       VALUES ($1, 2, $2, 'EVENT_ORGANISER', 'SUBMITTED', '{}')`, [id, organiser.id],
    )).rejects.toMatchObject({ code: '23514' });
    const rls = await fixture.pool.query(
      "SELECT relrowsecurity FROM pg_class WHERE relname = 'event_request_edits' AND relnamespace = current_schema()::regnamespace",
    );
    expect(rls.rows[0].relrowsecurity).toBe(true);
  });
});

describe('KAN-66 owner edits before approval', () => {
  it.each(['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'] as const)(
    'KAN-66-AC101/AC3 saves a %s edit, keeps status and assignment, audits it and shows it after refresh',
    async (status) => {
      const id = await createEvent(status);
      const app = appFor(organiser);
      const opened = await request(app).get(`/api/events/${id}`);
      expect(opened.body.actions).toMatchObject({ canEditDetails: true, editMode: 'PRE_APPROVAL' });

      const response = await request(app).patch(`/api/events/${id}`).send({
        purpose: 'Updated purpose', expectedAttendance: 80, expectedRevision: opened.body.revision,
      });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status, coordinatorId: coordinator.id, purpose: 'Updated purpose', expectedAttendance: 80,
        revision: opened.body.revision + 1,
      });

      const refreshed = await request(app).get(`/api/events/${id}`);
      expect(refreshed.body).toMatchObject({ purpose: 'Updated purpose', expectedAttendance: 80, status });
      expect(await edits(id)).toEqual([{
        revision: opened.body.revision + 1, editedBy: organiser.id, editorRole: 'EVENT_ORGANISER', eventStatus: status,
        changes: { purpose: { from: 'Purpose', to: 'Updated purpose' }, expectedAttendance: { from: 50, to: 80 } },
      }]);
      // KAN-66-AC5: no status-history row is added by an ordinary edit.
      expect((await fixture.history(id)).length).toBe(1);
    },
  );

  it('KAN-66-AC101 refuses an edit that would make the request incomplete, without writing', async () => {
    const id = await createEvent('SUBMITTED');
    const before = await stored(id);
    const response = await request(appFor(organiser)).patch(`/api/events/${id}`)
      .send({ venueRequirements: '  ', endsAt: '2026-12-01T01:00:00Z', expectedRevision: before.revision });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'SUBMISSION_INVALID', missingFields: ['venueRequirements'],
      fieldErrors: { endsAt: 'The end must be after the start.' },
    });
    expect(await stored(id)).toEqual(before);
    expect(await edits(id)).toEqual([]);
  });

  it('KAN-66-AC103 requires expectedRevision after submission', async () => {
    const id = await createEvent('SUBMITTED');
    const response = await request(appFor(organiser)).patch(`/api/events/${id}`).send({ name: 'No revision' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('EXPECTED_REVISION_REQUIRED');
    expect((await stored(id)).name).toBe('Open day');
  });

  it('KAN-66-AC103 lets exactly one of two concurrent edits from the same revision win', async () => {
    const id = await createEvent('SUBMITTED');
    const app = appFor(organiser);
    const { revision } = await stored(id);
    const results = await Promise.all([
      request(app).patch(`/api/events/${id}`).send({ name: 'First tab', expectedRevision: revision }),
      request(app).patch(`/api/events/${id}`).send({ name: 'Second tab', expectedRevision: revision }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const loser = results.find((result) => result.status === 409)!;
    expect(loser.body.error.code).toBe('EVENT_REVISION_CONFLICT');
    const winner = results.find((result) => result.status === 200)!;
    expect((await stored(id)).name).toBe(winner.body.name);
    expect(await edits(id)).toHaveLength(1);
  });

  it('KAN-66-AC102 does not let the assigned coordinator edit before approval', async () => {
    const id = await createEvent('UNDER_REVIEW');
    const app = appFor(coordinator);
    const opened = await request(app).get(`/api/events/${id}`);
    expect(opened.body.actions).toMatchObject({ canEditDetails: false, editMode: null, editableFields: [] });
    const response = await request(app).patch(`/api/events/${id}`).send({ name: 'x', expectedRevision: opened.body.revision });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('EDIT_ROLE_NOT_PERMITTED');
  });
});

describe('KAN-66 approved and confirmed events', () => {
  it.each(['APPROVED', 'CONFIRMED'] as const)(
    'KAN-66-AC102 lets the assigned coordinator rename a %s event and audits it', async (status) => {
      const id = await createEvent(status);
      const app = appFor(coordinator);
      const opened = await request(app).get(`/api/events/${id}`);
      expect(opened.body.actions).toMatchObject({
        canEditDetails: true, editMode: 'PLANNING', editableFields: ['name', 'description'],
      });
      const response = await request(app).patch(`/api/events/${id}`)
        .send({ name: 'Open day 2026', description: 'Updated agenda', expectedRevision: opened.body.revision });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ name: 'Open day 2026', description: 'Updated agenda', status });
      expect((await edits(id))[0]).toMatchObject({ editorRole: 'EVENT_COORDINATOR', eventStatus: status });
    },
  );

  it('KAN-66-AC6/AC7/AC8 sends significant fields to KAN-15 and leaves the event unchanged', async () => {
    const id = await createEvent('APPROVED');
    const before = await stored(id);
    for (const field of ['startsAt', 'expectedAttendance', 'venueRequirements', 'equipmentRequirements']) {
      const value = field === 'startsAt' ? '2026-12-01T03:00:00Z' : field === 'expectedAttendance' ? 500 : 'Changed';
      const response = await request(appFor(coordinator)).patch(`/api/events/${id}`)
        .send({ [field]: value, expectedRevision: before.revision });
      expect(response.status).toBe(409);
      expect(response.body.error).toMatchObject({ code: 'SIGNIFICANT_CHANGE_REQUIRED', fields: [field] });
    }
    const owner = await request(appFor(organiser)).patch(`/api/events/${id}`)
      .send({ expectedAttendance: 10, expectedRevision: before.revision });
    expect(owner.status).toBe(409);
    expect(owner.body.error.code).toBe('SIGNIFICANT_CHANGE_REQUIRED');
    expect(await stored(id)).toEqual(before);
  });

  it('KAN-66-AC102 refuses an organiser name edit after approval', async () => {
    const id = await createEvent('APPROVED');
    const response = await request(appFor(organiser)).patch(`/api/events/${id}`)
      .send({ name: 'Organiser rename', expectedRevision: 1 });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('EDIT_ROLE_NOT_PERMITTED');
  });

  it('KAN-66-AC5 leaves venue arrangements and unrelated events unchanged', async () => {
    const id = await createEvent('APPROVED');
    const unrelated = await createEvent('APPROVED');
    const venue = await fixture.pool.query<{ id: string }>(
      "INSERT INTO venues (name, capacity) VALUES ($1, 100) RETURNING id", [`Hall ${randomUUID()}`],
    );
    await fixture.pool.query(
      `INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, starts_at, ends_at)
       VALUES ($1, $2, $3, '2026-12-01T02:00:00Z', '2026-12-01T06:00:00Z')`,
      [id, venue.rows[0]!.id, coordinator.id],
    );
    const bookings = () => fixture.pool.query(
      'SELECT status, starts_at, ends_at, updated_at FROM venue_bookings WHERE event_request_id = $1', [id],
    ).then((result) => result.rows);
    const bookingsBefore = await bookings();
    const unrelatedBefore = await stored(unrelated);

    const response = await request(appFor(coordinator)).patch(`/api/events/${id}`)
      .send({ name: 'Renamed only', expectedRevision: (await stored(id)).revision });
    expect(response.status).toBe(200);
    expect(await bookings()).toEqual(bookingsBefore);
    expect(await stored(unrelated)).toEqual(unrelatedBefore);
  });

  it.each(['REJECTED', 'CANCELLED', 'COMPLETED'] as const)('refuses edits to a %s event', async (status) => {
    const id = await createEvent(status);
    const response = await request(appFor(coordinator)).patch(`/api/events/${id}`)
      .send({ name: 'x', expectedRevision: 1 });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EVENT_NOT_EDITABLE');
  });
});

describe('KAN-66-AC4 unauthorised edits', () => {
  it.each([
    ['another organiser', () => otherOrganiser, 'SUBMITTED'],
    ['an unassigned coordinator', () => otherCoordinator, 'APPROVED'],
  ] as const)('hides the event from %s and leaves it unchanged', async (_name, actor, status) => {
    const id = await createEvent(status);
    const before = await stored(id);
    const response = await request(appFor(actor())).patch(`/api/events/${id}`)
      .send({ name: 'Intrusion', expectedRevision: before.revision });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
    expect(await stored(id)).toEqual(before);
  });

  it('refuses server-owned and unknown fields even when the client sends them', async () => {
    const id = await createEvent('SUBMITTED');
    for (const field of ['status', 'coordinatorId', 'organiserId', 'revision']) {
      const response = await request(appFor(organiser)).patch(`/api/events/${id}`)
        .send({ name: 'x', [field]: 'forged', expectedRevision: 1 });
      expect(response.status).toBe(400);
      expect(response.body.error).toEqual({ code: 'INVALID_DRAFT_UPDATE', message: `Unsupported field: ${field}.` });
    }
    expect((await stored(id)).name).toBe('Open day');
  });
});

describe('KAN-66-AC101 stale reviewers must refresh', () => {
  it('refuses an initial decision made on a revision older than the organiser edit', async () => {
    const id = await createEvent('UNDER_REVIEW');
    const reviewerView = await request(appFor(coordinator)).get(`/api/events/${id}`);
    await request(appFor(organiser)).patch(`/api/events/${id}`)
      .send({ expectedAttendance: 400, expectedRevision: reviewerView.body.revision });

    const stale = await request(appFor(coordinator)).post(`/api/events/${id}/reviews`)
      .send({ decision: 'APPROVED', expectedRevision: reviewerView.body.revision });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('EVENT_REVISION_CONFLICT');
    expect((await stored(id)).status).toBe('UNDER_REVIEW');
    expect((await fixture.pool.query('SELECT 1 FROM event_reviews WHERE event_request_id = $1', [id])).rowCount).toBe(0);

    const refreshed = await request(appFor(coordinator)).get(`/api/events/${id}`);
    expect(refreshed.body.expectedAttendance).toBe(400);
    const current = await request(appFor(coordinator)).post(`/api/events/${id}/reviews`)
      .send({ decision: 'APPROVED', expectedRevision: refreshed.body.revision });
    expect(current.status).toBe(201);
  });

  it('refuses stale start-review and clarification requests, and accepts current ones', async () => {
    const id = await createEvent('SUBMITTED');
    const { revision } = await stored(id);
    await request(appFor(organiser)).patch(`/api/events/${id}`).send({ name: 'Edited', expectedRevision: revision });

    const staleStart = await request(appFor(coordinator)).post(`/api/events/${id}/start-review`)
      .send({ expectedRevision: revision });
    expect(staleStart.status).toBe(409);
    expect(staleStart.body.error.code).toBe('EVENT_REVISION_CONFLICT');
    const staleQuestion = await request(appFor(coordinator)).post(`/api/events/${id}/clarifications`)
      .send({ message: 'Which hall?', expectedRevision: revision });
    expect(staleQuestion.status).toBe(409);
    expect((await stored(id)).status).toBe('SUBMITTED');

    const started = await request(appFor(coordinator)).post(`/api/events/${id}/start-review`)
      .send({ expectedRevision: revision + 1 });
    expect(started.status).toBe(200);
    const asked = await request(appFor(coordinator)).post(`/api/events/${id}/clarifications`)
      .send({ message: 'Which hall?', expectedRevision: revision + 2 });
    expect(asked.status).toBe(201);
  });

  it('keeps reviewer actions working for clients that do not send a revision', async () => {
    const id = await createEvent('SUBMITTED');
    expect((await request(appFor(coordinator)).post(`/api/events/${id}/start-review`)).status).toBe(200);
    expect((await request(appFor(coordinator)).post(`/api/events/${id}/reviews`)
      .send({ decision: 'REJECTED', reason: 'Not feasible' })).status).toBe(201);
  });
});
