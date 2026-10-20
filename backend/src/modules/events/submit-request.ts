import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../auth/types.js';
import type { EventRecord } from './types.js';
import { assertReadyForSubmission } from './submit-input.js';
import { assertCanSubmit, SubmitEligibilityError } from './submit-eligibility.js';
import { recordNotifications } from '../notifications/notify.js';
import { submissionNotifications } from '../notifications/trigger-matrix.js';

export type SubmitActor = Pick<AuthenticatedUser, 'id' | 'role'>;

export interface SubmitRequestDependencies {
  pool: Pick<Pool, 'connect'>;
}

interface SubmitCommand {
  eventRequestId: string;
  /** Obtained from verified authentication, never from the submitted JSON body. */
  actor: SubmitActor | null;
}

export class SubmitRequestNotFoundError extends Error {
  readonly code = 'EVENT_REQUEST_NOT_FOUND';

  constructor() {
    super('The event request does not exist.');
    this.name = 'SubmitRequestNotFoundError';
  }
}

export class DraftAssignmentConflictError extends Error {
  readonly code = 'DRAFT_ALREADY_ASSIGNED';

  constructor() {
    super('This draft already has a coordinator assignment. Ask the team to check its assignment before submitting.');
    this.name = 'DraftAssignmentConflictError';
  }
}

type EventRow = Omit<EventRecord, 'startsAt' | 'endsAt' | 'createdAt' | 'updatedAt'> & {
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const iso = (value: Date | string): string => new Date(value).toISOString();

const selectColumns = `
  id, organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status,
  name, purpose, description, starts_at AS "startsAt", ends_at AS "endsAt",
  expected_attendance AS "expectedAttendance", venue_requirements AS "venueRequirements",
  accessibility_needs AS "accessibilityNeeds", equipment_requirements AS "equipmentRequirements",
  registration_required AS "registrationRequired",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

/** Registration times are read only to validate the submission; they are not part of the response. */
type LockedEventRow = EventRow & {
  registrationOpensAt: Date | string | null;
  registrationClosesAt: Date | string | null;
};

const lockColumns = `${selectColumns},
  registration_opens_at AS "registrationOpensAt", registration_closes_at AS "registrationClosesAt"`;

function toEventRecord(row: EventRow): EventRecord {
  return {
    ...row,
    startsAt: row.startsAt === null ? null : iso(row.startsAt),
    endsAt: row.endsAt === null ? null : iso(row.endsAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

/** KAN-79: submit an owned, complete draft to the Lead queue without allocating it. */
export async function submitEventRequest(
  { pool }: SubmitRequestDependencies,
  { eventRequestId, actor }: SubmitCommand,
): Promise<EventRecord> {
  if (!actor || actor.role !== 'EVENT_ORGANISER') {
    throw new SubmitEligibilityError(
      'SUBMIT_FORBIDDEN',
      'You are not authorised to submit this event request.',
    );
  }

  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query("SELECT set_config('app.actor_id', $1, true)", [actor.id]);

    // Competing submissions or a concurrent edit must wait here, then see the latest committed state.
    const requests = await client.query<LockedEventRow>(`
      SELECT ${lockColumns} FROM event_requests WHERE id = $1 FOR UPDATE
    `, [eventRequestId]);
    const found = requests.rows[0];
    if (!found) throw new SubmitRequestNotFoundError();

    assertCanSubmit({
      actorId: actor.id,
      actorRole: actor.role,
      ownerId: found.organiserId,
      status: found.status,
    });
    assertReadyForSubmission({
      ...toEventRecord(found),
      registrationOpensAt: found.registrationOpensAt === null ? null : iso(found.registrationOpensAt),
      registrationClosesAt: found.registrationClosesAt === null ? null : iso(found.registrationClosesAt),
    });

    // Keep unexpected prepared assignments intact for investigation. Submission never
    // closes history or silently removes a coordinator to force the new queue policy.
    const existingAssignment = await client.query(
      'SELECT 1 FROM coordinator_assignments WHERE event_request_id = $1 AND unassigned_at IS NULL',
      [found.id],
    );
    if (found.coordinatorId !== null || existingAssignment.rows.length > 0) {
      throw new DraftAssignmentConflictError();
    }

    const updated = await client.query<EventRow>(`
      UPDATE event_requests SET status = 'SUBMITTED', updated_at = now()
      WHERE id = $1
      RETURNING ${selectColumns}
    `, [eventRequestId]);
    const saved = updated.rows[0];
    if (!saved) throw new Error('The event request could not be submitted.');

    // KAN-64-AC201/AC207: written in this transaction, so a failed submission leaves none.
    await recordNotifications(client, submissionNotifications(saved));

    await client.query('COMMIT');
    return toEventRecord(saved);
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
