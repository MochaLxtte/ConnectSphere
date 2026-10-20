import type { PoolClient } from 'pg';
import { releaseHold } from './booking-service.js';
import {
  inActorTransaction, iso, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { parseBlockSubmission } from './block-input.js';
import {
  clearOutageImpacts, listBlockImpacts, recordOutageImpacts, type AffectedArrangement,
} from './outage-impact.js';

export interface VenueBlock {
  id: string;
  venueId: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  /** KAN-81: the approved arrangements this outage affects, with their recovery state. */
  affected: AffectedArrangement[];
}

type BlockRow = Omit<VenueBlock, 'startsAt' | 'endsAt' | 'createdAt' | 'affected'> & {
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

function serialize(row: BlockRow, affected: AffectedArrangement[]): VenueBlock {
  return {
    ...row, startsAt: iso(row.startsAt), endsAt: iso(row.endsAt), createdAt: iso(row.createdAt), affected,
  };
}

const lockActiveVenue = async (client: Pick<PoolClient, 'query'>, venueId: string) => {
  const venue = await client.query<{ isActive: boolean }>(
    'SELECT is_active AS "isActive" FROM venues WHERE id = $1 FOR UPDATE', [venueId]);
  return venue.rows[0];
};

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
  return Promise.all(found.rows.map(async (row) => serialize(row, await listBlockImpacts(pool, row.id))));
}

/**
 * KAN-55-AC1-AC7: Venue Staff record a mandatory-reason unavailability period for one venue.
 *
 * KAN-81-AC2 (CR-2) replaces KAN-55's refusal of a block that overlaps an APPROVED booking: the
 * outage is saved and every affected arrangement is flagged for recovery in the same transaction
 * (AC3/AC4). The venue row lock is the same one booking submission and approval take, so an outage
 * and an approval for that venue never interleave (AC10). Booking rows are not locked or updated.
 */
export async function createVenueBlock(
  { pool }: WorkflowDependencies,
  { actor, venueId, input }: { actor: WorkflowActor; venueId: string; input: unknown },
): Promise<VenueBlock> {
  requireVenueStaff(actor);
  const submission = parseBlockSubmission(input);
  return inActorTransaction(pool, actor.id, async (client) => {
    const venue = await lockActiveVenue(client, venueId);
    if (!venue) throw new WorkflowError('NOT_FOUND', 'VENUE_NOT_FOUND', 'The venue was not found.');
    if (!venue.isActive) conflict('VENUE_INACTIVE', 'This venue is no longer active.');

    // KAN-83-AC10: an operational block invalidates any live hold it overlaps. Each hold is
    // released with the block's reason and its coordinator is notified; approved bookings are kept
    // and flagged for recovery below (KAN-81). Hold writers lock booking -> venue, so rows another writer has
    // locked are skipped instead of waited for: that writer then needs this venue lock, sees the
    // committed block and refuses itself (no deadlock, no hold surviving the block).
    const held = await client.query<{ id: string }>(
      `SELECT id FROM venue_bookings WHERE venue_id = $1 AND status = 'HELD'
        AND hold_expires_at > clock_timestamp() AND starts_at < $3 AND ends_at > $2
        ORDER BY id FOR UPDATE SKIP LOCKED`,
      [venueId, submission.startsAt, submission.endsAt],
    );
    for (const hold of held.rows) {
      await releaseHold(client, hold.id, actor.id, `Venue unavailable: ${submission.reason}`);
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO venue_unavailability (venue_id, starts_at, ends_at, reason, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [venueId, submission.startsAt, submission.endsAt, submission.reason, actor.id],
    );
    const blockId = inserted.rows[0]!.id;
    const affected = await recordOutageImpacts(client, {
      blockId, venueId, startsAt: submission.startsAt, endsAt: submission.endsAt,
      reason: submission.reason, actorId: actor.id,
    });
    const saved = await client.query<BlockRow>(`${blockSelect} WHERE u.id = $1`, [blockId]);
    return serialize(saved.rows[0]!, affected);
  });
}

/**
 * Removal (beyond KAN-55's listed criteria). KAN-81-AC11: under the venue lock, the block's open
 * recovery flags are cleared and kept as history, then the block is deleted. Bookings still covered
 * by another remaining outage keep that outage's flag; nothing is re-approved. Returns the IDs of
 * the bookings whose flag from this outage was cleared.
 */
export async function deleteVenueBlock(
  { pool }: WorkflowDependencies, { actor, blockId }: { actor: WorkflowActor; blockId: string },
): Promise<{ clearedBookingIds: string[] }> {
  requireVenueStaff(actor);
  const notFound = () => new WorkflowError('NOT_FOUND', 'VENUE_BLOCK_NOT_FOUND',
    'The venue-unavailability block was not found.');
  return inActorTransaction(pool, actor.id, async (client) => {
    const found = await client.query<{ venueId: string }>(
      'SELECT venue_id AS "venueId" FROM venue_unavailability WHERE id = $1', [blockId]);
    if (!found.rows[0]) throw notFound();
    await lockActiveVenue(client, found.rows[0].venueId);

    const clearedBookingIds = await clearOutageImpacts(client, blockId);
    const deleted = await client.query('DELETE FROM venue_unavailability WHERE id = $1', [blockId]);
    if (deleted.rowCount !== 1) throw notFound();
    return { clearedBookingIds };
  });
}
