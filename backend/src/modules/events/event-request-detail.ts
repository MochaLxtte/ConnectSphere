import type { EventRecord } from './types.js';
import type { DraftRegistrationFields } from './draft-update-input.js';
import type { ReviewActor, ReviewPersistenceDependencies, SavedReview } from './review-decision.js';
import type { SubmittedRequestQueryDependencies } from './submitted-requests.js';
import { editPermissionFor, type EditableField, type EditMode } from './planning-edit-policy.js';

export interface EventRequestDetail extends EventRecord, DraftRegistrationFields {
  /** KAN-66: send as `expectedRevision` with edits and reviewer actions. */
  revision: number;
  review: (SavedReview & { createdAt: string }) | null;
  actions: {
    canEditDraft: boolean;
    canMakeInitialDecision: boolean;
    /** KAN-66: a non-draft direct edit is available; the server rechecks it when saving. */
    canEditDetails: boolean;
    editMode: EditMode | null;
    editableFields: readonly EditableField[];
  };
}

export interface EventRequestDetailDependencies extends ReviewPersistenceDependencies {
  canViewRequest: SubmittedRequestQueryDependencies['canViewRequest'];
}

export class EventRequestNotFoundError extends Error {
  readonly code = 'EVENT_REQUEST_NOT_FOUND';

  constructor() {
    super('The event request was not found.');
    this.name = 'EventRequestNotFoundError';
  }
}

type DetailRow = Omit<EventRecord, 'startsAt' | 'endsAt' | 'createdAt' | 'updatedAt'> & {
  registrationCapacity: number | null;
  registrationOpensAt: Date | string | null;
  registrationClosesAt: Date | string | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  revision: number;
  review: EventRequestDetail['review'];
};

const iso = (value: Date | string): string => new Date(value).toISOString();

/** Shared read for owned drafts, organiser outcomes and authorised coordinator detail. */
export async function getEventRequestDetail(
  { pool, canViewRequest, canReviewRequest }: EventRequestDetailDependencies,
  actor: ReviewActor,
  id: string,
): Promise<EventRequestDetail> {
  if (actor.role !== 'EVENT_ORGANISER' && actor.role !== 'EVENT_COORDINATOR') {
    throw new EventRequestNotFoundError();
  }

  const client = await pool.connect();
  try {
    // One SELECT keeps the request status and recorded outcome in the same snapshot.
    // Scope organiser reads in SQL; coordinator relationship policy is checked below.
    const result = await client.query<DetailRow>(`
      SELECT e.id, e.organiser_id AS "organiserId", e.coordinator_id AS "coordinatorId", e.status,
        e.name, e.purpose, e.description, e.starts_at AS "startsAt", e.ends_at AS "endsAt",
        e.expected_attendance AS "expectedAttendance", e.venue_requirements AS "venueRequirements",
        e.accessibility_needs AS "accessibilityNeeds", e.equipment_requirements AS "equipmentRequirements",
        e.registration_required AS "registrationRequired",
        e.registration_capacity AS "registrationCapacity",
        e.registration_opens_at AS "registrationOpensAt",
        e.registration_closes_at AS "registrationClosesAt",
        e.revision, e.created_at AS "createdAt", e.updated_at AS "updatedAt",
        (SELECT json_build_object(
          'reviewId', r.id, 'eventRequestId', r.event_request_id, 'reviewedBy', r.reviewed_by,
          'decision', r.decision, 'reason', r.reason, 'createdAt', r.created_at
        ) FROM event_reviews r WHERE r.event_request_id = e.id
          ORDER BY r.created_at ASC, r.id ASC LIMIT 1) AS review
      FROM event_requests e
      WHERE e.id = $1 AND (
        ($2 = 'EVENT_ORGANISER' AND e.organiser_id = $3)
        OR ($2 = 'EVENT_COORDINATOR' AND e.status <> 'DRAFT')
      )
    `, [id, actor.role, actor.id]);
    const row = result.rows[0];
    if (!row) throw new EventRequestNotFoundError();

    const ownsRequest = actor.role === 'EVENT_ORGANISER' && row.organiserId === actor.id;
    const visible = ownsRequest || (actor.role === 'EVENT_COORDINATOR' && row.status !== 'DRAFT'
      && await canViewRequest(actor, row));
    if (!visible) throw new EventRequestNotFoundError();

    // Viewing permission never grants write permission. POST rechecks under its row lock.
    const canMakeInitialDecision = actor.role === 'EVENT_COORDINATOR'
      && (row.status === 'SUBMITTED' || row.status === 'UNDER_REVIEW') && row.review === null
      && await canReviewRequest(actor, row, client);
    const edit = editPermissionFor({
      actorId: actor.id,
      actorRole: actor.role,
      ownerId: row.organiserId,
      coordinatorId: row.coordinatorId,
      status: row.status,
    });

    return {
      ...row,
      startsAt: row.startsAt === null ? null : iso(row.startsAt),
      endsAt: row.endsAt === null ? null : iso(row.endsAt),
      registrationOpensAt: row.registrationOpensAt === null ? null : iso(row.registrationOpensAt),
      registrationClosesAt: row.registrationClosesAt === null ? null : iso(row.registrationClosesAt),
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
      review: row.review === null ? null : { ...row.review, createdAt: iso(row.review.createdAt) },
      actions: {
        canEditDraft: ownsRequest && row.status === 'DRAFT',
        canMakeInitialDecision,
        canEditDetails: edit !== null && edit.mode !== 'DRAFT',
        editMode: edit?.mode ?? null,
        editableFields: edit?.fields ?? [],
      },
    };
  } finally {
    client.release();
  }
}
