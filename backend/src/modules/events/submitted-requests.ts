import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../auth/types.js';
import type { EventRecord, EventStatus } from './types.js';

export type QueueActor = Pick<AuthenticatedUser, 'id' | 'role'>;
export type ReviewableRequest = Pick<EventRecord, 'id' | 'organiserId' | 'coordinatorId' | 'status'>;

/**
 * Queue membership only: shared request detail has separate visibility rules so an
 * authorised reader can still view an outcome after the request leaves this queue.
 */
export const REVIEWABLE_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'CLARIFICATION_REQUESTED',
] as const satisfies readonly EventStatus[];

export interface SubmittedRequestQueryDependencies {
  pool: Pick<Pool, 'query'>;
  /**
   * Required server-side visibility policy; there is no default that grants access.
   * KAN-29 (coordinator assignment) and Q-02 are unresolved, so callers (tests, and the
   * eventual production wiring once KAN-29 lands) must supply this explicitly rather than
   * this module assuming every coordinator may see every request.
   */
  canViewRequest(actor: QueueActor, request: ReviewableRequest): boolean | Promise<boolean>;
}

export interface SubmittedRequestSummary {
  id: string;
  name: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

const listColumns = `
  id, organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status,
  name, created_at AS "createdAt", updated_at AS "updatedAt"
`;

/** List reviewable requests visible to this actor. Non-coordinators see an empty queue. */
export async function listReviewableRequests(
  { pool, canViewRequest }: SubmittedRequestQueryDependencies,
  actor: QueueActor,
): Promise<SubmittedRequestSummary[]> {
  if (actor.role !== 'EVENT_COORDINATOR') return [];

  const result = await pool.query<SubmittedRequestSummary & ReviewableRequest>(
    `SELECT ${listColumns} FROM event_requests WHERE status = ANY($1) ORDER BY created_at ASC`,
    [REVIEWABLE_STATUSES],
  );

  const visible: SubmittedRequestSummary[] = [];
  for (const row of result.rows) {
    // Filter in the repository, not just the service, per docs/architecture/api-contract.md.
    if (await canViewRequest(actor, row)) {
      visible.push({
        id: row.id,
        name: row.name,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }
  }
  return visible;
}

/** List this organiser's own saved drafts. Self-ownership needs no separate visibility policy. */
export async function listOwnedDrafts(
  { pool }: Pick<SubmittedRequestQueryDependencies, 'pool'>,
  actor: QueueActor,
): Promise<SubmittedRequestSummary[]> {
  if (actor.role !== 'EVENT_ORGANISER') return [];

  const result = await pool.query<SubmittedRequestSummary>(
    `SELECT ${listColumns} FROM event_requests WHERE organiser_id = $1 AND status = 'DRAFT' ORDER BY updated_at DESC`,
    [actor.id],
  );
  return result.rows.map(({ id, name, status, createdAt, updatedAt }) => ({ id, name, status, createdAt, updatedAt }));
}
