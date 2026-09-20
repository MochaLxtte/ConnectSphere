import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../auth/types.js';
import type { EventRecord } from './types.js';
import {
  parseDraftUpdateInput, type DraftRegistrationFields, type DraftUpdateInput,
} from './draft-update-input.js';
import { assertCanEditDraft, DraftEligibilityError } from './draft-eligibility.js';

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
export type DraftEventRecord = EventRecord & DraftRegistrationFields;

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
  created_at AS "createdAt", updated_at AS "updatedAt"
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

/** Save an owned draft's changed fields, using the existing schema; unsupplied fields are untouched. */
export async function updateOwnedDraft(
  { pool }: UpdateDraftDependencies,
  { eventRequestId, actor, input }: UpdateDraftCommand,
): Promise<DraftEventRecord> {
  const changes = parseDraftUpdateInput(input);
  if (!actor || actor.role !== 'EVENT_ORGANISER') {
    throw new DraftEligibilityError(
      'DRAFT_EDIT_FORBIDDEN',
      'You are not authorised to edit this event request.',
    );
  }

  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');

    // Competing edits or a concurrent submission must wait here, then see the latest committed state.
    const requests = await client.query<Pick<EventRecord, 'id' | 'organiserId' | 'status'>>(`
      SELECT id, organiser_id AS "organiserId", status
      FROM event_requests WHERE id = $1 FOR UPDATE
    `, [eventRequestId]);
    const found = requests.rows[0];
    if (!found) throw new DraftRequestNotFoundError();

    assertCanEditDraft({
      actorId: actor.id,
      actorRole: actor.role,
      ownerId: found.organiserId,
      status: found.status,
    });

    const fields = Object.keys(changes) as (keyof DraftUpdateInput)[];
    const setClauses = fields.map((field, index) => `${draftColumnByField[field]} = $${index + 2}`);
    const values = fields.map((field) => changes[field]);

    const updated = await client.query<DraftRow>(`
      UPDATE event_requests SET ${setClauses.join(', ')}, updated_at = now()
      WHERE id = $1
      RETURNING ${draftSelectColumns}
    `, [eventRequestId, ...values]);
    const saved = updated.rows[0];
    if (!saved) throw new Error('The draft could not be updated.');

    await client.query('COMMIT');
    return toDraftEventRecord(saved);
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
