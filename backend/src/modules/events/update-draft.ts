import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../auth/types.js';
import type { EventRecord } from './types.js';
import {
  parseEventUpdateInput, type DraftRegistrationFields, type DraftUpdateInput,
} from './draft-update-input.js';
import { DraftEligibilityError } from './draft-eligibility.js';
import { assertCanEditFields } from './planning-edit-policy.js';
import { assertReadyForSubmission } from './submit-input.js';
import { assertExpectedRevision, parseExpectedRevision } from './workflow-support.js';

export type DraftActor = Pick<AuthenticatedUser, 'id' | 'role'>;

export interface UpdateDraftDependencies {
  pool: Pick<Pool, 'connect'>;
}

interface UpdateDraftCommand {
  eventRequestId: string;
  /** Obtained from verified authentication, never from the submitted JSON body. */
  actor: DraftActor | null;
  input: unknown;
}

export class DraftRequestNotFoundError extends Error {
  readonly code = 'EVENT_REQUEST_NOT_FOUND';

  constructor() {
    super('The event request does not exist.');
    this.name = 'DraftRequestNotFoundError';
  }
}

/** The flat event shape returned by draft writes, including the CF-18 registration settings. */
export type DraftEventRecord = EventRecord & DraftRegistrationFields & {
  /** KAN-66: send back as `expectedRevision` with the next edit. */
  revision: number;
};

type DraftDateField = 'startsAt' | 'endsAt' | 'registrationOpensAt' | 'registrationClosesAt';

export type DraftRow = Omit<DraftEventRecord, DraftDateField | 'createdAt' | 'updatedAt'> & {
  [field in DraftDateField]: Date | string | null;
} & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

const iso = (value: Date | string): string => new Date(value).toISOString();

export const draftColumnByField: Record<keyof DraftUpdateInput, string> = {
  name: 'name',
  purpose: 'purpose',
  description: 'description',
  startsAt: 'starts_at',
  endsAt: 'ends_at',
  expectedAttendance: 'expected_attendance',
  venueRequirements: 'venue_requirements',
  accessibilityNeeds: 'accessibility_needs',
  equipmentRequirements: 'equipment_requirements',
  registrationRequired: 'registration_required',
  registrationCapacity: 'registration_capacity',
  registrationOpensAt: 'registration_opens_at',
  registrationClosesAt: 'registration_closes_at',
};

export const draftSelectColumns = `
  id, organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status,
  name, purpose, description, starts_at AS "startsAt", ends_at AS "endsAt",
  expected_attendance AS "expectedAttendance", venue_requirements AS "venueRequirements",
  accessibility_needs AS "accessibilityNeeds", equipment_requirements AS "equipmentRequirements",
  registration_required AS "registrationRequired",
  registration_capacity AS "registrationCapacity",
  registration_opens_at AS "registrationOpensAt", registration_closes_at AS "registrationClosesAt",
  revision, created_at AS "createdAt", updated_at AS "updatedAt"
`;

export function toDraftEventRecord(row: DraftRow): DraftEventRecord {
  return {
    ...row,
    startsAt: row.startsAt === null ? null : iso(row.startsAt),
    endsAt: row.endsAt === null ? null : iso(row.endsAt),
    registrationOpensAt: row.registrationOpensAt === null ? null : iso(row.registrationOpensAt),
    registrationClosesAt: row.registrationClosesAt === null ? null : iso(row.registrationClosesAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

const dateFields = new Set<keyof DraftUpdateInput>([
  'startsAt', 'endsAt', 'registrationOpensAt', 'registrationClosesAt',
]);

/** Equal stored and requested values, comparing instants rather than their offset spelling. */
function sameValue(field: keyof DraftUpdateInput, stored: unknown, requested: unknown): boolean {
  if (dateFields.has(field) && typeof stored === 'string' && typeof requested === 'string') {
    return Date.parse(stored) === Date.parse(requested);
  }
  return stored === requested;
}

/**
 * Save an event request's changed fields; unsupplied fields are untouched.
 * KAN-34 drafts keep their incomplete-draft rules. KAN-66 adds owner edits before approval
 * (complete submission validation) and assigned-coordinator name/description edits after
 * approval. Those require the displayed revision and write an audit row in the same transaction.
 */
export async function updateEventRequest(
  { pool }: UpdateDraftDependencies,
  { eventRequestId, actor, input }: UpdateDraftCommand,
): Promise<DraftEventRecord> {
  const { changes, expectedRevision: suppliedRevision } = parseEventUpdateInput(input);
  if (!actor || (actor.role !== 'EVENT_ORGANISER' && actor.role !== 'EVENT_COORDINATOR')) {
    throw new DraftEligibilityError(
      'DRAFT_EDIT_FORBIDDEN',
      'You are not authorised to edit this event request.',
    );
  }

  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query("SELECT set_config('app.actor_id', $1, true)", [actor.id]);

    // Competing edits, reviews or a concurrent submission wait here, then see the latest commit.
    const requests = await client.query<DraftRow>(`
      SELECT ${draftSelectColumns} FROM event_requests WHERE id = $1 FOR UPDATE
    `, [eventRequestId]);
    const found = requests.rows[0];
    if (!found) throw new DraftRequestNotFoundError();
    const current = toDraftEventRecord(found);

    const fields = Object.keys(changes) as (keyof DraftUpdateInput)[];
    const mode = assertCanEditFields({
      actorId: actor.id,
      actorRole: actor.role,
      ownerId: current.organiserId,
      coordinatorId: current.coordinatorId,
      status: current.status,
    }, fields);

    // Drafts keep KAN-34's contract, so the revision is optional there and checked if sent.
    const expectedRevision = parseExpectedRevision(suppliedRevision, mode !== 'DRAFT');
    assertExpectedRevision(current.revision, expectedRevision);

    const changed = fields.filter((field) => !sameValue(field, current[field], changes[field]));
    // A repeated save of the same values creates no revision or audit entry.
    if (changed.length === 0) {
      await client.query('COMMIT');
      return current;
    }

    if (mode !== 'DRAFT') {
      // KAN-66-AC101: a submitted request must remain complete and valid after the edit.
      assertReadyForSubmission({ ...current, ...changes });
    }

    const setClauses = changed.map((field, index) => `${draftColumnByField[field]} = $${index + 2}`);
    const values = changed.map((field) => changes[field]);
    const updated = await client.query<DraftRow>(`
      UPDATE event_requests SET ${setClauses.join(', ')}, updated_at = now()
      WHERE id = $1
      RETURNING ${draftSelectColumns}
    `, [eventRequestId, ...values]);
    const saved = updated.rows[0];
    if (!saved) throw new Error('The event request could not be updated.');
    const record = toDraftEventRecord(saved);

    if (mode !== 'DRAFT') {
      // KAN-66-AC103: who changed which fields, from what to what, at which revision.
      const audit = Object.fromEntries(changed.map((field) => [field, { from: current[field], to: record[field] }]));
      await client.query(`
        INSERT INTO event_request_edits
          (event_request_id, revision, edited_by, editor_role, event_status, changes)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [record.id, record.revision, actor.id, actor.role, record.status, JSON.stringify(audit)]);
    }

    await client.query('COMMIT');
    return record;
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
