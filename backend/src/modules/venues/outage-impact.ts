import type { PoolClient } from 'pg';
import { iso, WorkflowError, type WorkflowActor, type WorkflowDependencies } from '../events/workflow-support.js';

export type RecoveryStatus = 'RECOVERY_REQUIRED' | 'RESOLVED' | 'CLEARED';

/** One approved venue arrangement affected by one operational outage (KAN-81-AC3/AC4). */
export interface AffectedArrangement {
  impactId: string;
  status: RecoveryStatus;
  bookingId: string;
  eventRequestId: string;
  eventName: string | null;
  bookingStartsAt: string;
  bookingEndsAt: string;
}

/** Venue Staff recovery view (KAN-81-AC6/AC12): the arrangement plus the outage that affected it. */
export interface RecoveryArrangement extends AffectedArrangement {
  blockId: string | null;
  venueId: string;
  venueName: string;
  outageStartsAt: string;
  outageEndsAt: string;
  outageReason: string;
}

type Timestamps<T, K extends keyof T> = Omit<T, K> & { [P in K]: Date };
type AffectedRow = Timestamps<AffectedArrangement, 'bookingStartsAt' | 'bookingEndsAt'>;
type RecoveryRow = Timestamps<RecoveryArrangement, 'bookingStartsAt' | 'bookingEndsAt' | 'outageStartsAt' | 'outageEndsAt'>;

const serializeAffected = (row: AffectedRow): AffectedArrangement => ({
  impactId: row.impactId, status: row.status, bookingId: row.bookingId, eventRequestId: row.eventRequestId,
  eventName: row.eventName, bookingStartsAt: iso(row.bookingStartsAt), bookingEndsAt: iso(row.bookingEndsAt),
});

/**
 * KAN-81-AC3: the one place that decides which bookings an outage affects. A non-ended APPROVED
 * booking at the same venue whose interval overlaps the outage, half-open so exact adjacency is
 * unaffected. KAN-78: it compares the buffered occupied interval from venue_booking_intervals, so
 * an outage covering only a booking's setup or turnaround also affects it. KAN-83 live holds are
 * released by the block itself before this runs, so only approved bookings are recorded.
 */
export const AFFECTED_BOOKING_CONDITION = `b.venue_id = $1 AND b.status = 'APPROVED'
  AND b.ends_at > now() AND b.occupied_starts_at < $3 AND b.occupied_ends_at > $2`;

const affectedSelect = `SELECT i.id AS "impactId", i.status, b.id AS "bookingId",
  b.event_request_id AS "eventRequestId", e.name AS "eventName",
  b.starts_at AS "bookingStartsAt", b.ends_at AS "bookingEndsAt"
  FROM venue_outage_impacts i
  JOIN venue_bookings b ON b.id = i.venue_booking_id
  JOIN event_requests e ON e.id = b.event_request_id`;

/**
 * KAN-81-AC3/AC4/AC11: record each affected arrangement for a just-saved outage. Call it inside
 * the transaction that holds the venue row lock, so a booking approved first is always found and
 * an approval waiting for the lock then sees the block (AC10). Booking rows are never updated.
 * Reprocessing the same outage adds nothing (unique index).
 */
export async function recordOutageImpacts(
  client: Pick<PoolClient, 'query'>,
  outage: { blockId: string; venueId: string; startsAt: string; endsAt: string; reason: string; actorId: string },
): Promise<AffectedArrangement[]> {
  await client.query(
    `INSERT INTO venue_outage_impacts
       (unavailability_id, venue_booking_id, venue_id, outage_starts_at, outage_ends_at, outage_reason, recorded_by)
     SELECT $4, b.id, b.venue_id, $2, $3, $5, $6 FROM venue_booking_intervals b
     WHERE ${AFFECTED_BOOKING_CONDITION}
     ON CONFLICT (unavailability_id, venue_booking_id) WHERE unavailability_id IS NOT NULL DO NOTHING`,
    [outage.venueId, outage.startsAt, outage.endsAt, outage.blockId, outage.reason, outage.actorId],
  );
  return listBlockImpacts(client, outage.blockId);
}

/** The arrangements one outage affects, earliest booking first. */
export async function listBlockImpacts(
  client: Pick<PoolClient, 'query'>, blockId: string,
): Promise<AffectedArrangement[]> {
  const found = await client.query<AffectedRow>(
    `${affectedSelect} WHERE i.unavailability_id = $1 ORDER BY b.starts_at ASC, b.id ASC`, [blockId],
  );
  return found.rows.map(serializeAffected);
}

/**
 * KAN-81-AC11: removing an outage clears only its own open flags and keeps their history. A booking
 * still overlapped by another remaining outage keeps that outage's own open flag. Nothing is
 * re-approved, and the booking rows are not touched. Returns the booking IDs that were cleared.
 */
export async function clearOutageImpacts(client: Pick<PoolClient, 'query'>, blockId: string): Promise<string[]> {
  const cleared = await client.query<{ bookingId: string }>(
    `UPDATE venue_outage_impacts SET status = 'CLEARED', updated_at = now()
     WHERE unavailability_id = $1 AND status = 'RECOVERY_REQUIRED'
     RETURNING venue_booking_id AS "bookingId"`,
    [blockId],
  );
  return cleared.rows.map((row) => row.bookingId).sort();
}

/** KAN-81-AC6/AC12 (Venue Staff side): every recorded arrangement impact, newest outage first. */
export async function listRecoveryArrangements(
  { pool }: WorkflowDependencies,
  { actor, status }: { actor: WorkflowActor; status: RecoveryStatus | undefined },
): Promise<RecoveryArrangement[]> {
  if (actor.role !== 'VENUE_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only Venue Staff can view venue recovery.');
  }
  const found = await pool.query<RecoveryRow>(
    `SELECT i.id AS "impactId", i.status, b.id AS "bookingId", b.event_request_id AS "eventRequestId",
       e.name AS "eventName", b.starts_at AS "bookingStartsAt", b.ends_at AS "bookingEndsAt",
       i.unavailability_id AS "blockId", i.venue_id AS "venueId", v.name AS "venueName",
       i.outage_starts_at AS "outageStartsAt", i.outage_ends_at AS "outageEndsAt", i.outage_reason AS "outageReason"
     FROM venue_outage_impacts i
     JOIN venue_bookings b ON b.id = i.venue_booking_id
     JOIN event_requests e ON e.id = b.event_request_id
     JOIN venues v ON v.id = i.venue_id
     WHERE ($1::text IS NULL OR i.status = $1)
     ORDER BY i.outage_starts_at DESC, b.starts_at ASC, i.id ASC`,
    [status ?? null],
  );
  return found.rows.map((row) => ({
    ...serializeAffected(row), blockId: row.blockId, venueId: row.venueId, venueName: row.venueName,
    outageStartsAt: iso(row.outageStartsAt), outageEndsAt: iso(row.outageEndsAt), outageReason: row.outageReason,
  }));
}

/** One outage recorded against a booking, as shown with that booking (KAN-81-AC6, phase 2). */
export interface BookingRecovery {
  impactId: string;
  status: RecoveryStatus;
  outageStartsAt: string;
  outageEndsAt: string;
  outageReason: string;
}

/**
 * A correlated subquery for a venue_bookings row aliased `b`: every outage impact on the booking,
 * earliest outage first. json_agg renders timestamps in the session time zone, so callers pass the
 * result through serializeRecovery.
 */
export const BOOKING_RECOVERY_SQL = `COALESCE((
  SELECT json_agg(json_build_object('impactId', i.id, 'status', i.status,
    'outageStartsAt', i.outage_starts_at, 'outageEndsAt', i.outage_ends_at, 'outageReason', i.outage_reason)
    ORDER BY i.outage_starts_at, i.id)
  FROM venue_outage_impacts i WHERE i.venue_booking_id = b.id), '[]'::json)`;

export const serializeRecovery = (items: BookingRecovery[]): BookingRecovery[] => items.map((item) => ({
  impactId: item.impactId, status: item.status, outageStartsAt: iso(item.outageStartsAt),
  outageEndsAt: iso(item.outageEndsAt), outageReason: item.outageReason,
}));

/** Who to tell about one outage's open impacts: each affected booking with its event's current coordinator. */
export interface OutageNotificationTarget {
  eventId: string;
  eventName: string | null;
  organiserId: string;
  coordinatorId: string | null;
  bookingId: string;
  venueName: string;
  bookingStartsAt: Date;
  bookingEndsAt: Date;
}

export async function listOutageNotificationTargets(
  client: Pick<PoolClient, 'query'>, blockId: string,
): Promise<OutageNotificationTarget[]> {
  const found = await client.query<OutageNotificationTarget>(
    `SELECT e.id AS "eventId", e.name AS "eventName", e.organiser_id AS "organiserId",
       e.coordinator_id AS "coordinatorId", b.id AS "bookingId", v.name AS "venueName",
       b.starts_at AS "bookingStartsAt", b.ends_at AS "bookingEndsAt"
     FROM venue_outage_impacts i
     JOIN venue_bookings b ON b.id = i.venue_booking_id
     JOIN event_requests e ON e.id = b.event_request_id
     JOIN venues v ON v.id = b.venue_id
     WHERE i.unavailability_id = $1 AND i.status = 'RECOVERY_REQUIRED'
     ORDER BY e.id, b.starts_at, b.id`,
    [blockId],
  );
  return found.rows;
}

/** KAN-81-AC7/AC8: whether a booking still has an outage that nobody has resolved or removed. */
export async function hasOpenRecovery(client: Pick<PoolClient, 'query'>, bookingId: string): Promise<boolean> {
  const found = await client.query<{ open: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM venue_outage_impacts WHERE venue_booking_id = $1 AND status = 'RECOVERY_REQUIRED') AS open`,
    [bookingId],
  );
  return found.rows[0]?.open === true;
}

/**
 * KAN-81-AC8: an approved replacement resolves the original's open flags and cancels the original. The
 * row stays as history. The conflict trigger fires only for APPROVED rows, so cancelling is allowed
 * even while the original overlaps an outage. The caller holds the original's row lock.
 */
export async function resolveReplacedBooking(client: Pick<PoolClient, 'query'>, originalBookingId: string): Promise<void> {
  await client.query(
    `UPDATE venue_outage_impacts SET status = 'RESOLVED', updated_at = now()
     WHERE venue_booking_id = $1 AND status = 'RECOVERY_REQUIRED'`, [originalBookingId]);
  await client.query(
    `UPDATE venue_bookings SET status = 'CANCELLED', updated_at = now() WHERE id = $1`, [originalBookingId]);
}

const STATUSES: readonly RecoveryStatus[] = ['RECOVERY_REQUIRED', 'RESOLVED', 'CLEARED'];

/** The optional ?status= filter on the recovery list. */
export function parseRecoveryFilter(query: Record<string, unknown>): RecoveryStatus | undefined {
  if (Object.keys(query).some((key) => key !== 'status')) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_RECOVERY_FILTER', 'Only a status filter is supported.');
  }
  const status = query.status;
  if (status === undefined) return undefined;
  if (typeof status !== 'string' || !(STATUSES as readonly string[]).includes(status)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_RECOVERY_FILTER',
      `status must be one of ${STATUSES.join(', ')}.`);
  }
  return status as RecoveryStatus;
}
