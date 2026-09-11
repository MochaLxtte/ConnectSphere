import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
  return { event: event.rows[0], reviews: reviews.rows };
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
      eventRequestId, reviewer: coordinator, input: { decision: 'REJECTED' },
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
          eventRequestId, reviewer: coordinator, input: { decision },
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
      decision: winner.value.decision, reason: null,
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
    expect(await readState(eventRequestId)).toEqual({ event: undefined, reviews: [] });
  });
});
