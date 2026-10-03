import type { Pool } from 'pg';
import { parseDraftCreateInput, type DraftUpdateInput } from './draft-update-input.js';
import {
  draftColumnByField, draftSelectColumns, toDraftEventRecord,
  type DraftActor, type DraftEventRecord, type DraftRow,
} from './update-draft.js';

export interface CreateDraftDependencies {
  pool: Pick<Pool, 'connect'>;
}

interface CreateDraftCommand {
  /** Obtained from verified authentication, never from the submitted JSON body. */
  actor: DraftActor | null;
  input: unknown;
}

export class DraftCreateForbiddenError extends Error {
  readonly code = 'DRAFT_CREATE_FORBIDDEN';

  constructor() {
    super('Only event organisers can create an event request.');
    this.name = 'DraftCreateForbiddenError';
  }
}

/** Create a DRAFT owned by the verified organiser; any supplied fields follow the PATCH rules. */
export async function createDraft(
  { pool }: CreateDraftDependencies,
  { actor, input }: CreateDraftCommand,
): Promise<DraftEventRecord> {
  const initial = parseDraftCreateInput(input);
  if (!actor || actor.role !== 'EVENT_ORGANISER') throw new DraftCreateForbiddenError();

  const fields = Object.keys(initial) as (keyof DraftUpdateInput)[];
  const columns = ['organiser_id', 'status', ...fields.map((field) => draftColumnByField[field])];
  const placeholders = ['$1', `'DRAFT'`, ...fields.map((_, index) => `$${index + 2}`)];
  const values = fields.map((field) => initial[field]);

  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    // Attribute the initial status-history row to the organiser (see migration 004).
    await client.query(`SELECT set_config('app.actor_id', $1, true)`, [actor.id]);

    const created = await client.query<DraftRow>(`
      INSERT INTO event_requests (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING ${draftSelectColumns}
    `, [actor.id, ...values]);
    const saved = created.rows[0];
    if (!saved) throw new Error('The draft could not be created.');

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
