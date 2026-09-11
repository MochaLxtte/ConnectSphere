import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../auth/types.js';
import type { EventRecord, EventStatus } from './types.js';

export type QueueActor = Pick<AuthenticatedUser, 'id' | 'role'>;
export type ReviewableRequest = Pick<EventRecord, 'id' | 'organiserId' | 'coordinatorId' | 'status'>;

/**
 * KAN-33 scope decision (documented in docs/requirements/assumptions-and-questions.md):
 * the coordinator queue/detail surfaces only requests actively awaiting an outcome.
 * Draft, approved and rejected requests are excluded here; KAN-16 owns organiser-facing
 * status/outcome display once a decision exists.
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

export class SubmittedRequestNotFoundError extends Error {
  readonly code = 'EVENT_REQUEST_NOT_FOUND';

  constructor() {
    super('The event request does not exist.');
    this.name = 'SubmittedRequestNotFoundError';
  }
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

const detailColumns = `
  id, organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status,
  name, purpose, description, starts_at AS "startsAt", ends_at AS "endsAt",
  expected_attendance AS "expectedAttendance", venue_requirements AS "venueRequirements",
  accessibility_needs AS "accessibilityNeeds", equipment_requirements AS "equipmentRequirements",
  registration_required AS "registrationRequired",
  created_at AS "createdAt", updated_at AS "updatedAt"
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

/**
 * Fetch full detail for one reviewable request. Unauthorised, non-coordinator, draft and
 * already-decided requests all raise the same not-found error so a caller cannot learn
 * whether a protected request exists (mirrors the KAN-36 review handler's masking).
 */
export async function getReviewableRequestDetail(
  { pool, canViewRequest }: SubmittedRequestQueryDependencies,
  actor: QueueActor,
  id: string,
): Promise<EventRecord> {
  const result = await pool.query<EventRecord & ReviewableRequest>(
    `SELECT ${detailColumns} FROM event_requests WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) throw new SubmittedRequestNotFoundError();

  const reviewable = (REVIEWABLE_STATUSES as readonly EventStatus[]).includes(row.status);
  if (actor.role !== 'EVENT_COORDINATOR' || !reviewable) throw new SubmittedRequestNotFoundError();

  const authorised = await canViewRequest(actor, row);
  if (!authorised) throw new SubmittedRequestNotFoundError();

  return row;
}
