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

/**
 * KAN-33 / S1-DEF-02: requests that have left the initial-review queue after a decision,
 * listed so their coordinator can reopen them for follow-up. Drafts are never included.
 */
export const FOLLOW_UP_STATUSES = [
  'APPROVED',
  'REJECTED',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
] as const satisfies readonly EventStatus[];

export interface SubmittedRequestQueryDependencies {
  pool: Pick<Pool, 'query'>;
  /**
   * Required server-side visibility policy; there is no default that grants access.
   * The runtime supplies the Sprint 1 assigned-coordinator policy. Keep this explicit
   * so queue membership cannot accidentally grant access to another coordinator's requests.
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
export function listReviewableRequests(
  dependencies: SubmittedRequestQueryDependencies,
  actor: QueueActor,
): Promise<SubmittedRequestSummary[]> {
  return listCoordinatorRequests(dependencies, actor, REVIEWABLE_STATUSES, 'created_at ASC');
}

/** Decided/follow-up requests visible to this coordinator, most recently changed first. */
export function listFollowUpRequests(
  dependencies: SubmittedRequestQueryDependencies,
  actor: QueueActor,
): Promise<SubmittedRequestSummary[]> {
  return listCoordinatorRequests(dependencies, actor, FOLLOW_UP_STATUSES, 'updated_at DESC');
}

async function listCoordinatorRequests(
  { pool, canViewRequest }: SubmittedRequestQueryDependencies,
  actor: QueueActor,
  statuses: readonly EventStatus[],
  orderBy: 'created_at ASC' | 'updated_at DESC',
): Promise<SubmittedRequestSummary[]> {
  if (actor.role !== 'EVENT_COORDINATOR') return [];

  const result = await pool.query<SubmittedRequestSummary & ReviewableRequest>(
    `SELECT ${listColumns} FROM event_requests WHERE status = ANY($1) ORDER BY ${orderBy}`,
    [statuses],
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
  dependencies: Pick<SubmittedRequestQueryDependencies, 'pool'>,
  actor: QueueActor,
): Promise<SubmittedRequestSummary[]> {
  return listOwnedRequests(dependencies, actor, 'drafts');
}

/** Ownership comes from the authenticated actor; scope only changes the status filter. */
export async function listOwnedRequests(
  { pool }: Pick<SubmittedRequestQueryDependencies, 'pool'>,
  actor: QueueActor,
  scope: 'drafts' | 'all' = 'all',
): Promise<SubmittedRequestSummary[]> {
  if (actor.role !== 'EVENT_ORGANISER') return [];

  const statusFilter = scope === 'all' ? '' : " AND status = 'DRAFT'";
  const result = await pool.query<SubmittedRequestSummary>(
    `SELECT ${listColumns} FROM event_requests WHERE organiser_id = $1${statusFilter} ORDER BY updated_at DESC`,
    [actor.id],
  );
  return result.rows.map(({ id, name, status, createdAt, updatedAt }) => ({ id, name, status, createdAt, updatedAt }));
}
