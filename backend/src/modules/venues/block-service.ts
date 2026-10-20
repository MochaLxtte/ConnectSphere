import {
  inActorTransaction, iso, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { parseBlockSubmission } from './block-input.js';

export interface VenueBlock {
  id: string;
  venueId: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

type BlockRow = Omit<VenueBlock, 'startsAt' | 'endsAt' | 'createdAt'> & {
  startsAt: Date; endsAt: Date; createdAt: Date;
};

const blockSelect = `SELECT u.id, u.venue_id AS "venueId", v.name AS "venueName",
  u.starts_at AS "startsAt", u.ends_at AS "endsAt", u.reason, u.created_by AS "createdBy",
  u.created_at AS "createdAt"
  FROM venue_unavailability u JOIN venues v ON v.id = u.venue_id`;

function requireVenueStaff(actor: WorkflowActor): void {
  if (actor.role !== 'VENUE_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN',
      'Only Venue Staff can manage venue-unavailability blocks.');
  }
}

function serialize(row: BlockRow): VenueBlock {
  return { ...row, startsAt: iso(row.startsAt), endsAt: iso(row.endsAt), createdAt: iso(row.createdAt) };
}

function conflict(code: string, message: string): never {
  throw new WorkflowError('CONFLICT', code, message);
}

/** KAN-55-AC1/AC7: one venue's recorded blocks, earliest first. */
export async function listVenueBlocks(
  { pool }: WorkflowDependencies, { actor, venueId }: { actor: WorkflowActor; venueId: string },
): Promise<VenueBlock[]> {
  requireVenueStaff(actor);
  const found = await pool.query<BlockRow>(
    `${blockSelect} WHERE u.venue_id = $1 ORDER BY u.starts_at ASC, u.id ASC`, [venueId],
  );
  return found.rows.map(serialize);
}

/**
 * KAN-55-AC1-AC7: Venue Staff record a mandatory-reason unavailability period for one venue.
 * An existing APPROVED booking must not be silently displaced by a later block (open policy
 * question, see the decision record): creation is refused with VENUE_BOOKING_CONFLICT if the
 * new period overlaps one. This is an application-level check; no new migration/trigger guards it.
 */
export async function createVenueBlock(
  { pool }: WorkflowDependencies,
  { actor, venueId, input }: { actor: WorkflowActor; venueId: string; input: unknown },
): Promise<VenueBlock> {
  requireVenueStaff(actor);
  const submission = parseBlockSubmission(input);
  return inActorTransaction(pool, actor.id, async (client) => {
    const venue = await client.query<{ isActive: boolean }>(
      'SELECT is_active AS "isActive" FROM venues WHERE id = $1 FOR UPDATE', [venueId]);
    if (!venue.rows[0]) throw new WorkflowError('NOT_FOUND', 'VENUE_NOT_FOUND', 'The venue was not found.');
    if (!venue.rows[0].isActive) conflict('VENUE_INACTIVE', 'This venue is no longer active.');

    const clash = await client.query<{ booked: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM venue_booking_intervals WHERE venue_id = $1 AND status = 'APPROVED'
        AND occupied_starts_at < $3 AND occupied_ends_at > $2) AS booked`,
      [venueId, submission.startsAt, submission.endsAt],
    );
    if (clash.rows[0]!.booked) {
      conflict('VENUE_BOOKING_CONFLICT', 'An approved booking already exists during this period.');
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO venue_unavailability (venue_id, starts_at, ends_at, reason, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [venueId, submission.startsAt, submission.endsAt, submission.reason, actor.id],
    );
    const saved = await client.query<BlockRow>(`${blockSelect} WHERE u.id = $1`, [inserted.rows[0]!.id]);
    return serialize(saved.rows[0]!);
  });
}

/** Amendment/removal is implementation scope beyond KAN-55's listed acceptance criteria. */
export async function deleteVenueBlock(
  { pool }: WorkflowDependencies, { actor, blockId }: { actor: WorkflowActor; blockId: string },
): Promise<void> {
  requireVenueStaff(actor);
  const deleted = await pool.query('DELETE FROM venue_unavailability WHERE id = $1', [blockId]);
  if (deleted.rowCount !== 1) {
    throw new WorkflowError('NOT_FOUND', 'VENUE_BLOCK_NOT_FOUND', 'The venue-unavailability block was not found.');
  }
}
