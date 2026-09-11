import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../auth/types.js';
import type { EventRecord } from './types.js';
import { parseReviewInput, type ReviewDecision } from './review-input.js';
import { assertCanMakeInitialReview, ReviewEligibilityError } from './review-eligibility.js';

export type ReviewActor = Pick<AuthenticatedUser, 'id' | 'role'>;
export type ReviewRequest = Pick<EventRecord, 'id' | 'organiserId' | 'coordinatorId' | 'status'>;

export interface ReviewPersistenceDependencies {
  pool: Pick<Pool, 'connect'>;
  /** Required server-side policy for this actor and the locked request; no default grants access. */
  canReviewRequest(
    reviewer: ReviewActor,
    request: ReviewRequest,
    client: PoolClient,
  ): boolean | Promise<boolean>;
}

interface RecordReviewCommand {
  eventRequestId: string;
  /** Obtained from verified authentication, never from the submitted JSON body. */
  reviewer: ReviewActor | null;
  input: unknown;
}

export interface SavedReview {
  reviewId: string;
  eventRequestId: string;
  reviewedBy: string;
  decision: ReviewDecision;
  reason: string | null;
}

export class ReviewRequestNotFoundError extends Error {
  readonly code = 'EVENT_REQUEST_NOT_FOUND';

  constructor() {
    super('The event request does not exist.');
    this.name = 'ReviewRequestNotFoundError';
  }
}

/** Save an initial decision and its resulting status together, using the existing schema. */
export async function recordInitialReview(
  { pool, canReviewRequest }: ReviewPersistenceDependencies,
  { eventRequestId, reviewer, input }: RecordReviewCommand,
): Promise<SavedReview> {
  const review = parseReviewInput(input);
  if (!reviewer || reviewer.role !== 'EVENT_COORDINATOR') {
    throw new ReviewEligibilityError(
      'REVIEW_FORBIDDEN',
      'You are not authorised to review this event request.',
    );
  }

  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');

    // Competing decisions must wait here, then inspect the latest committed request state.
    const requests = await client.query<ReviewRequest>(`
      SELECT id, organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status
      FROM event_requests WHERE id = $1 FOR UPDATE
    `, [eventRequestId]);
    const request = requests.rows[0];
    if (!request) throw new ReviewRequestNotFoundError();

    const authorised = await canReviewRequest(reviewer, request, client);
    // Read review history after acquiring the lock so this statement sees a prior winner's commit.
    const existing = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (SELECT 1 FROM event_reviews WHERE event_request_id = $1) AS exists
    `, [request.id]);
    assertCanMakeInitialReview({
      reviewerRole: reviewer.role,
      canReviewRequest: authorised,
      status: request.status,
      hasRecordedDecision: existing.rows[0]!.exists,
    });

    const inserted = await client.query<{ id: string }>(`
      INSERT INTO event_reviews (event_request_id, reviewed_by, decision, reason)
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [request.id, reviewer.id, review.decision, review.reason]);
    const saved = inserted.rows[0];
    if (!saved) throw new Error('The review decision could not be recorded.');

    const updated = await client.query(`
      UPDATE event_requests SET status = $1, updated_at = now() WHERE id = $2
    `, [review.decision, request.id]);
    if (updated.rowCount !== 1) throw new Error('The event request status could not be updated.');

    await client.query('COMMIT');
    return {
      reviewId: saved.id,
      eventRequestId: request.id,
      reviewedBy: reviewer.id,
      decision: review.decision,
      reason: review.reason,
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Discard a connection whose transaction could not be cleaned up.
      releaseError = rollbackError instanceof Error ? rollbackError : new Error('Rollback failed.');
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}
