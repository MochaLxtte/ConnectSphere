import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import type {
  ReviewActor,
  ReviewPersistenceDependencies,
  ReviewRequest,
} from '../../../backend/src/modules/events/review-decision.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import { ALL_EDITABLE_FIELDS, ORDINARY_FIELDS } from '../../../backend/src/modules/events/planning-edit-policy.js';
import { migrate } from '../../migrate.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
const pool = new pg.Pool({
  connectionString: scopedUrl.toString(), max: 4,
  connectionTimeoutMillis: 5_000, statement_timeout: 5_000,
});
const organiser: ReviewActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const otherOrganiser: ReviewActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const coordinator: ReviewActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const otherCoordinator: ReviewActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const createdAt = '2026-09-06T01:00:00.000Z';
const updatedAt = '2026-09-07T01:00:00.000Z';

// Fixture-only assignment policy, not a decision about production visibility or delegation.
const assignedCoordinator = (actor: ReviewActor, event: ReviewRequest) =>
  actor.id === event.coordinatorId;

function appFor(
  actor: ReviewActor,
  canReviewRequest: ReviewPersistenceDependencies['canReviewRequest'] = assignedCoordinator,
) {
  // Synthetic verified identity exercises the composed routes; live login belongs to KAN-25.
  const authenticate = async () => actor;
  return createApp({
    database: pool,
    submittedRequests: {
      pool, authenticate, canViewRequest: assignedCoordinator, canReviewRequest,
    },
    reviews: { pool, authenticate, canReviewRequest },
  });
}

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  for (const actor of [organiser, otherOrganiser, coordinator, otherCoordinator]) {
    await pool.query(
      'INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, $3, $4)',
      [actor.id, `${actor.id}@example.test`, actor.role, actor.role],
    );
  }
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

async function createEvent(
  status: EventStatus = 'SUBMITTED',
  coordinatorId: string | null = coordinator.id,
): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO event_requests (id, organiser_id, coordinator_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, organiser.id, coordinatorId, status, createdAt, updatedAt],
  );
  return id;
}

describe('KAN-34 / KAN-33 / KAN-16 shared request detail with PostgreSQL', () => {
  it('returns an owned incomplete draft without losing null, zero or false fields', async () => {
    const id = await createEvent('DRAFT', null);
    await pool.query(
      `UPDATE event_requests SET expected_attendance = 0, registration_required = false,
       starts_at = '2026-09-18T10:00:00+08:00', ends_at = '2026-09-18T12:00:00+08:00'
       WHERE id = $1`,
      [id],
    );

    const response = await request(appFor(organiser)).get(`/api/events/${id}`);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      id, organiserId: organiser.id, coordinatorId: null, status: 'DRAFT',
      name: null, purpose: null, description: null,
      startsAt: '2026-09-18T02:00:00.000Z', endsAt: '2026-09-18T04:00:00.000Z',
      expectedAttendance: 0, venueRequirements: null, accessibilityNeeds: null,
      equipmentRequirements: null, registrationRequired: false,
      registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null,
      // KAN-66: the insert starts at revision 1 and the fixture UPDATE above advances it once.
      revision: 2, createdAt, updatedAt,
      review: null,
      actions: {
        canEditDraft: true, canMakeInitialDecision: false,
        canEditDetails: false, editMode: 'DRAFT', editableFields: [...ALL_EDITABLE_FIELDS],
      },
    });
  });

  it('returns the same submitted request with caller-specific actions and includes it in the queue', async () => {
    const id = await createEvent();
    const coordinatorApp = appFor(coordinator);
    const coordinatorDetail = await request(coordinatorApp).get(`/api/events/${id}`);
    const organiserDetail = await request(appFor(organiser)).get(`/api/events/${id}`);

    expect(coordinatorDetail.status).toBe(200);
    expect(organiserDetail.status).toBe(200);
    expect(coordinatorDetail.body).toMatchObject({
      id, status: 'SUBMITTED', review: null,
      actions: { canEditDraft: false, canMakeInitialDecision: true },
    });
    // KAN-66-AC101: before approval only the owner may edit, with full submission validation.
    expect(coordinatorDetail.body.actions).toMatchObject({ canEditDetails: false, editMode: null, editableFields: [] });
    expect(organiserDetail.body).toEqual({
      ...coordinatorDetail.body,
      actions: {
        canEditDraft: false, canMakeInitialDecision: false,
        canEditDetails: true, editMode: 'PRE_APPROVAL', editableFields: [...ALL_EDITABLE_FIELDS],
      },
    });
    const queue = await request(coordinatorApp).get('/api/events');
    expect(queue.status).toBe(200);
    expect(queue.body.items).toContainEqual(expect.objectContaining({ id, status: 'SUBMITTED' }));
  });

  it.each([
    { name: 'another organiser', actor: otherOrganiser, status: 'SUBMITTED' },
    { name: 'an unrelated coordinator', actor: otherCoordinator, status: 'SUBMITTED' },
    { name: 'the assigned coordinator viewing a draft', actor: coordinator, status: 'DRAFT' },
  ] as const)('masks access denied to $name with the same response as a missing request', async ({ actor, status }) => {
    const id = await createEvent(status);
    const app = appFor(actor);
    const denied = await request(app).get(`/api/events/${id}`);
    const missing = await request(app).get(`/api/events/${randomUUID()}`);

    expect(denied.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(denied.body).toEqual(missing.body);
    expect(denied.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
    expect(denied.headers['cache-control']).toBe('no-store');
  });

  it('allows coordinator visibility independently of permission to record a decision', async () => {
    const id = await createEvent();
    const app = appFor(coordinator, () => false);
    const detail = await request(app).get(`/api/events/${id}`);

    expect(detail.status).toBe(200);
    expect(detail.body.actions).toEqual({
      canEditDraft: false, canMakeInitialDecision: false,
      canEditDetails: false, editMode: null, editableFields: [],
    });
    const denied = await request(app).post(`/api/events/${id}/reviews`).send({ decision: 'APPROVED' });
    expect(denied.status).toBe(404);
    expect(denied.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
    const refreshed = await request(app).get(`/api/events/${id}`);
    expect(refreshed.body).toEqual(detail.body);
  });

  it.each(['UNDER_REVIEW', 'CLARIFICATION_REQUESTED'] as const)(
    'keeps %s readable and offers the decision only once no clarification is pending',
    async (status) => {
      const id = await createEvent(status);
      for (const actor of [coordinator, organiser]) {
        const response = await request(appFor(actor)).get(`/api/events/${id}`);
        expect(response.status).toBe(200);
        const canMakeInitialDecision = status === 'UNDER_REVIEW' && actor === coordinator;
        expect(response.body).toMatchObject({
          id, status, review: null,
          actions: { canEditDraft: false, canMakeInitialDecision },
        });
      }
    },
  );

  it.each(['APPROVED', 'REJECTED'] as const)(
    'KAN-36 records %s and both roles can refresh the outcome after it leaves the queue',
    async (decision) => {
      const id = await createEvent();
      const coordinatorApp = appFor(coordinator);
      const reason = decision === 'REJECTED' ? 'The venue is unavailable.' : undefined;
      const saved = await request(coordinatorApp)
        .post(`/api/events/${id}/reviews`)
        .send({ decision, reason });
      expect(saved.status).toBe(201);

      const stored = await pool.query<{ created_at: Date }>(
        'SELECT created_at FROM event_reviews WHERE id = $1',
        [saved.body.reviewId],
      );
      const expectedReview = {
        ...saved.body, reason: reason ?? null,
        createdAt: stored.rows[0]!.created_at.toISOString(),
      };
      const coordinatorDetail = await request(coordinatorApp).get(`/api/events/${id}`);
      const organiserDetail = await request(appFor(organiser)).get(`/api/events/${id}`);
      for (const response of [coordinatorDetail, organiserDetail]) {
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          id, status: decision, review: expectedReview,
          actions: { canEditDraft: false, canMakeInitialDecision: false },
        });
      }
      // KAN-66-AC102: only the assigned coordinator may edit an approved event's name/description.
      const planning = decision === 'APPROVED';
      expect(coordinatorDetail.body.actions).toMatchObject({
        canEditDetails: planning, editMode: planning ? 'PLANNING' : null,
        editableFields: planning ? [...ORDINARY_FIELDS] : [],
      });
      expect(organiserDetail.body.actions).toMatchObject({ canEditDetails: false, editMode: null, editableFields: [] });
      const { actions: _coordinatorActions, ...coordinatorRecord } = coordinatorDetail.body;
      const { actions: _organiserActions, ...organiserRecord } = organiserDetail.body;
      expect(organiserRecord).toEqual(coordinatorRecord);

      const queue = await request(coordinatorApp).get('/api/events');
      expect(queue.status).toBe(200);
      expect(queue.body.items).not.toContainEqual(expect.objectContaining({ id }));
    },
  );

  it('returns the first recorded decision deterministically and disables another initial decision', async () => {
    const id = await createEvent();
    const firstReviewId = '10000000-0000-4000-8000-000000000001';
    const sameTimeReviewId = '10000000-0000-4000-8000-000000000002';
    const firstReviewAt = '2026-09-08T03:00:00.000Z';
    // Deliberately inconsistent history checks selection and action flags independently of status.
    await pool.query(
      `INSERT INTO event_reviews (id, event_request_id, reviewed_by, decision, reason, created_at)
       VALUES ($1, $2, $3, 'REJECTED', 'Later record.', '2026-09-09T03:00:00Z'),
              ($4, $2, $3, 'REJECTED', 'Same timestamp, higher ID.', $6),
              ($5, $2, $3, 'APPROVED', 'Initial decision.', $6)`,
      [randomUUID(), id, coordinator.id, sameTimeReviewId, firstReviewId, firstReviewAt],
    );
    const app = appFor(coordinator);
    const response = await request(app).get(`/api/events/${id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id, status: 'SUBMITTED',
      review: {
        reviewId: firstReviewId, eventRequestId: id, reviewedBy: coordinator.id,
        decision: 'APPROVED', reason: 'Initial decision.', createdAt: firstReviewAt,
      },
      actions: { canEditDraft: false, canMakeInitialDecision: false },
    });
    const duplicate = await request(app).post(`/api/events/${id}/reviews`)
      .send({ decision: 'REJECTED', reason: 'Second decision.' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('REVIEW_ALREADY_DECIDED');
  });
});
