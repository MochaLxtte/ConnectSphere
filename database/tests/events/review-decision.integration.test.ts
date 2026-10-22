import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import {
  recordInitialReview,
  ReviewRequestNotFoundError,
  type ReviewActor,
  type ReviewRequest,
  type SavedReview,
} from '../../../backend/src/modules/events/review-decision.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import { migrate } from '../../migrate.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
scopedUrl.searchParams.set('application_name', schema);
const pool = new pg.Pool({
  connectionString: scopedUrl.toString(), max: 4,
  connectionTimeoutMillis: 5_000, statement_timeout: 5_000,
});
const organiser: ReviewActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const coordinator: ReviewActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const otherCoordinator: ReviewActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const originalUpdatedAt = new Date('2026-09-01T00:00:00.000Z');

const dependencies = {
  pool,
  // Fixture-only policy; this does not establish the application's assignment rules.
  canReviewRequest: (reviewer: ReviewActor, event: ReviewRequest) =>
    reviewer.id === event.coordinatorId,
};

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  for (const actor of [organiser, coordinator, otherCoordinator]) {
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

async function createEvent(status: EventStatus = 'SUBMITTED'): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO event_requests (id, organiser_id, coordinator_id, status, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, organiser.id, coordinator.id, status, originalUpdatedAt],
  );
  return id;
}

async function readState(id: string) {
  const event = await pool.query('SELECT status, updated_at FROM event_requests WHERE id = $1', [id]);
  const reviews = await pool.query(
    `SELECT id, event_request_id, reviewed_by, decision, reason
     FROM event_reviews WHERE event_request_id = $1`,
    [id],
  );
  const history = await pool.query(
    'SELECT from_status, to_status FROM event_status_history WHERE event_request_id = $1 ORDER BY created_at, id',
    [id],
  );
  const notifications = await pool.query(
    'SELECT recipient_id, type FROM notifications WHERE event_request_id = $1 ORDER BY created_at, id',
    [id],
  );
  return { event: event.rows[0], reviews: reviews.rows, history: history.rows, notifications: notifications.rows };
}

describe('KAN-36 review decision persistence', () => {
  it.each(['APPROVED', 'REJECTED'] as const)('records %s and the matching request status', async (decision) => {
    const eventRequestId = await createEvent();
    const saved = await recordInitialReview(dependencies, {
      eventRequestId,
      reviewer: coordinator,
      input: { decision, reason: '  Availability checked.  ' },
    });

    expect(saved).toEqual({
      reviewId: expect.any(String), eventRequestId, reviewedBy: coordinator.id,
      decision, reason: 'Availability checked.',
    });
    const state = await readState(eventRequestId);
    expect(state.event.status).toBe(decision);
    expect(state.event.updated_at).not.toEqual(originalUpdatedAt);
    expect(state.reviews).toEqual([{
      id: saved.reviewId, event_request_id: eventRequestId, reviewed_by: coordinator.id,
      decision, reason: 'Availability checked.',
    }]);
  });

  it.each([
    { name: 'an unrelated coordinator', reviewer: otherCoordinator, status: 'SUBMITTED', code: 'REVIEW_FORBIDDEN' },
    { name: 'an organiser', reviewer: organiser, status: 'SUBMITTED', code: 'REVIEW_FORBIDDEN' },
    { name: 'an unauthenticated actor', reviewer: null, status: 'SUBMITTED', code: 'REVIEW_FORBIDDEN' },
    { name: 'a draft request', reviewer: coordinator, status: 'DRAFT', code: 'REQUEST_NOT_REVIEWABLE' },
  ] as const)('leaves data unchanged for $name', async ({ reviewer, status, code }) => {
    const eventRequestId = await createEvent(status);
    const before = await readState(eventRequestId);
    await expect(recordInitialReview(dependencies, {
      eventRequestId, reviewer, input: { decision: 'APPROVED' },
    })).rejects.toMatchObject({ code });
    expect(await readState(eventRequestId)).toEqual(before);
  });

  it('refuses another decision when a review exists even if the request still says SUBMITTED', async () => {
    const eventRequestId = await createEvent();
    // Deliberately inconsistent fixture exercises the stored-review check independently of status.
    await pool.query(
      "INSERT INTO event_reviews (event_request_id, reviewed_by, decision) VALUES ($1, $2, 'APPROVED')",
      [eventRequestId, coordinator.id],
    );
    const before = await readState(eventRequestId);
    await expect(recordInitialReview(dependencies, {
      eventRequestId, reviewer: coordinator, input: { decision: 'REJECTED', reason: 'Dates conflict.' },
    })).rejects.toMatchObject({ code: 'REVIEW_ALREADY_DECIDED' });
    expect(await readState(eventRequestId)).toEqual(before);
  });

  it('commits only one of two competing approval and rejection attempts', async () => {
    const eventRequestId = await createEvent();
    const blocker = await pool.connect();
    let pending: Promise<PromiseSettledResult<SavedReview>[]> | undefined;
    let results: PromiseSettledResult<SavedReview>[] = [];
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM event_requests WHERE id = $1 FOR UPDATE', [eventRequestId]);
      pending = Promise.allSettled(
        ['APPROVED', 'REJECTED'].map((decision) => recordInitialReview(dependencies, {
          // KAN-60: both attempts carry a reason so either decision is valid input.
          eventRequestId, reviewer: coordinator, input: { decision, reason: 'Competing decision.' },
        })),
      );
      // Prove both writers reached a database lock before letting either finish.
      await expect.poll(async () => {
        const waiting = await admin.query<{ count: number }>(`
          SELECT count(*)::integer AS count FROM pg_stat_activity
          WHERE application_name = $1 AND wait_event_type = 'Lock'
        `, [schema]);
        return waiting.rows[0]!.count;
      }, { timeout: 3_000 }).toBe(2);
    } finally {
      try {
        await blocker.query('ROLLBACK');
      } finally {
        // Discard the blocker even if rollback fails, and settle every started attempt.
        blocker.release(true);
        if (pending) results = await pending;
      }
    }
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: 'rejected', reason: expect.objectContaining({ code: 'REVIEW_ALREADY_DECIDED' }),
      }),
    ]));
    const winner = results.find((result) => result.status === 'fulfilled');
    if (!winner || winner.status !== 'fulfilled') throw new Error('Expected one committed decision.');
    const state = await readState(eventRequestId);
    expect(state.event.status).toBe(winner.value.decision);
    expect(state.reviews).toEqual([{
      id: winner.value.reviewId, event_request_id: eventRequestId, reviewed_by: coordinator.id,
      decision: winner.value.decision, reason: 'Competing decision.',
    }]);
  });

  it('rolls back the review insert when the subsequent status update fails', async () => {
    const eventRequestId = await createEvent();
    const before = await readState(eventRequestId);
    // In this private test schema only, force the second write to fail.
    // NOT VALID leaves previous test fixtures alone while checking new updates.
    await pool.query(`ALTER TABLE event_requests ADD CONSTRAINT test_block_review_status
      CHECK (status NOT IN ('APPROVED', 'REJECTED')) NOT VALID`);
    try {
      await expect(recordInitialReview(dependencies, {
        eventRequestId, reviewer: coordinator, input: { decision: 'APPROVED' },
      })).rejects.toMatchObject({ code: '23514' });
      expect(await readState(eventRequestId)).toEqual(before);
    } finally {
      await pool.query('ALTER TABLE event_requests DROP CONSTRAINT test_block_review_status');
    }
  });

  it('reports a missing request without recording a decision', async () => {
    const eventRequestId = randomUUID();
    await expect(recordInitialReview(dependencies, {
      eventRequestId, reviewer: coordinator, input: { decision: 'APPROVED' },
    })).rejects.toBeInstanceOf(ReviewRequestNotFoundError);
    expect(await readState(eventRequestId)).toEqual({
      event: undefined, reviews: [], history: [], notifications: [],
    });
  });

  it('persists a decision through HTTP using the verified actor and request policy', async () => {
    const eventRequestId = await createEvent();
    const app = createApp({
      database: pool,
      // Test fixture identity only; live authentication belongs to KAN-25.
      reviews: { ...dependencies, authenticate: async () => coordinator },
    });
    const response = await request(app)
      .post(`/api/events/${eventRequestId}/reviews`)
      .send({ decision: 'APPROVED', reason: '  Ready to proceed.  ' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      reviewId: expect.any(String), eventRequestId, reviewedBy: coordinator.id,
      decision: 'APPROVED', reason: 'Ready to proceed.',
    });
    const state = await readState(eventRequestId);
    expect(state.event.status).toBe('APPROVED');
    expect(state.reviews).toEqual([{
      id: response.body.reviewId, event_request_id: eventRequestId,
      reviewed_by: coordinator.id, decision: 'APPROVED', reason: 'Ready to proceed.',
    }]);
  });

  it('hides another coordinator\'s request through HTTP and leaves it unchanged', async () => {
    const eventRequestId = await createEvent();
    const before = await readState(eventRequestId);
    const app = createApp({
      database: pool,
      reviews: { ...dependencies, authenticate: async () => otherCoordinator },
    });
    const forbidden = await request(app)
      .post(`/api/events/${eventRequestId}/reviews`)
      .send({ decision: 'REJECTED', reason: 'Not suitable.' });
    const missing = await request(app)
      .post(`/api/events/${randomUUID()}/reviews`)
      .send({ decision: 'REJECTED', reason: 'Not suitable.' });

    expect(forbidden.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(forbidden.body).toEqual(missing.body);
    expect(await readState(eventRequestId)).toEqual(before);
  });
});

describe('KAN-60 required rejection reason persistence', () => {
  const httpApp = () => createApp({
    database: pool,
    reviews: { ...dependencies, authenticate: async () => coordinator },
  });

  it.each([undefined, null, '', '   \n\t '])(
    'KAN-60-AC3/AC102 writes no decision, status, history or notification for reason %j',
    async (reason) => {
      const eventRequestId = await createEvent('UNDER_REVIEW');
      const before = await readState(eventRequestId);
      await expect(recordInitialReview(dependencies, {
        eventRequestId, reviewer: coordinator, input: { decision: 'REJECTED', reason },
      })).rejects.toMatchObject({ name: 'ReviewInputError', field: 'reason' });
      const response = await request(httpApp())
        .post(`/api/events/${eventRequestId}/reviews`)
        .send(reason === undefined ? { decision: 'REJECTED' } : { decision: 'REJECTED', reason });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({ code: 'INVALID_REVIEW_INPUT', field: 'reason' });
      expect(await readState(eventRequestId)).toEqual(before);
    },
  );

  it('KAN-60-AC101 refuses an over-long reason without changing the request', async () => {
    const eventRequestId = await createEvent();
    const before = await readState(eventRequestId);
    const response = await request(httpApp())
      .post(`/api/events/${eventRequestId}/reviews`)
      .send({ decision: 'REJECTED', reason: 'x'.repeat(2001) });
    expect(response.status).toBe(400);
    expect(response.body.error.field).toBe('reason');
    expect(await readState(eventRequestId)).toEqual(before);
  });

  it('KAN-60-AC102 keeps the earlier decision checks: a decided request still reports REVIEW_ALREADY_DECIDED', async () => {
    const eventRequestId = await createEvent('APPROVED');
    await pool.query(
      "INSERT INTO event_reviews (event_request_id, reviewed_by, decision) VALUES ($1, $2, 'APPROVED')",
      [eventRequestId, coordinator.id],
    );
    const response = await request(httpApp())
      .post(`/api/events/${eventRequestId}/reviews`)
      .send({ decision: 'REJECTED', reason: 'Late rejection.' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('REVIEW_ALREADY_DECIDED');
  });

  it('KAN-60-AC2 saves the trimmed reason on the rejection and shows it on the detail read after a reload', async () => {
    const eventRequestId = await createEvent();
    const response = await request(httpApp())
      .post(`/api/events/${eventRequestId}/reviews`)
      .send({ decision: 'REJECTED', reason: '  The venue capacity is too small.  ' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ decision: 'REJECTED', reason: 'The venue capacity is too small.' });
    const state = await readState(eventRequestId);
    expect(state.event.status).toBe('REJECTED');
    expect(state.reviews).toEqual([expect.objectContaining({
      id: response.body.reviewId, decision: 'REJECTED', reason: 'The venue capacity is too small.',
    })]);
    // The decision adds exactly one status transition after the fixture's own creation entry.
    expect(state.history.at(-1)).toEqual({ from_status: 'SUBMITTED', to_status: 'REJECTED' });
    expect(state.history.filter((row) => row.to_status === 'REJECTED')).toHaveLength(1);
  });

  it('KAN-60-AC4 still records an approval without a reason', async () => {
    const eventRequestId = await createEvent();
    const response = await request(httpApp())
      .post(`/api/events/${eventRequestId}/reviews`)
      .send({ decision: 'APPROVED' });
    expect(response.status).toBe(201);
    expect((await readState(eventRequestId)).reviews).toEqual([expect.objectContaining({
      decision: 'APPROVED', reason: null,
    })]);
  });
});
