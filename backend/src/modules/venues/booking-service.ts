import type { Pool, PoolClient } from 'pg';
import type { EventStatus } from '../events/types.js';
import {
  inActorTransaction, iso, isoOrNull, lockEventRequest, requireRelation, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { recordNotifications } from '../notifications/notify.js';
import { bookingDecisionNotifications } from '../notifications/trigger-matrix.js';
import {
  parseBookingDecision, parseBookingSubmission, parseHoldCancellation, parseHoldPlacement,
} from './booking-input.js';
import { effectiveBookingStatusSql, occupiedStart, occupyingBookingSql } from './occupancy.js';
import { intervalWithinVenueHours } from './suitability-rules.js';

/** KAN-83 adds HELD (live or awaiting expiry) and EXPIRED (deadline passed without approval). */
export type VenueBookingStatus = 'PENDING' | 'HELD' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface VenueBooking {
  id: string;
  eventRequestId: string;
  eventName: string | null;
  eventStatus: EventStatus;
  venueId: string;
  venueName: string;
  status: VenueBookingStatus;
  startsAt: string;
  endsAt: string;
  layout: string | null;
  notes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  purpose: string | null;
  description: string | null;
  expectedAttendance: number | null;
  venueRequirements: string | null;
  accessibilityNeeds: string | null;
  /** KAN-83: hold deadline and audit. Kept after approval, expiry, rejection or cancellation. */
  holdExpiresAt: string | null;
  heldBy: string | null;
  heldAt: string | null;
  expiredAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

type BookingRow = Omit<VenueBooking,
  'startsAt' | 'endsAt' | 'decidedAt' | 'createdAt' | 'updatedAt' | 'eventStartsAt' | 'eventEndsAt'
  | 'holdExpiresAt' | 'heldAt' | 'expiredAt' | 'cancelledAt'> & {
  startsAt: Date; endsAt: Date; decidedAt: Date | null; createdAt: Date; updatedAt: Date;
  eventStartsAt: Date | null; eventEndsAt: Date | null;
  holdExpiresAt: Date | null; heldAt: Date | null; expiredAt: Date | null; cancelledAt: Date | null;
};

const bookingSelect = `SELECT b.id, b.event_request_id AS "eventRequestId",
  e.name AS "eventName", e.status AS "eventStatus", b.venue_id AS "venueId",
  v.name AS "venueName", ${effectiveBookingStatusSql('b')} AS status,
  b.starts_at AS "startsAt", b.ends_at AS "endsAt",
  b.layout, b.notes, b.decided_by AS "decidedBy", b.decided_at AS "decidedAt",
  b.decision_reason AS "decisionReason", b.created_at AS "createdAt", b.updated_at AS "updatedAt",
  e.starts_at AS "eventStartsAt", e.ends_at AS "eventEndsAt", e.purpose, e.description,
  e.expected_attendance AS "expectedAttendance", e.venue_requirements AS "venueRequirements",
  e.accessibility_needs AS "accessibilityNeeds",
  b.hold_expires_at AS "holdExpiresAt", b.held_by AS "heldBy", b.held_at AS "heldAt",
  b.expired_at AS "expiredAt", b.cancelled_by AS "cancelledBy", b.cancelled_at AS "cancelledAt",
  b.cancellation_reason AS "cancellationReason"
  FROM venue_bookings b JOIN event_requests e ON e.id = b.event_request_id
  JOIN venues v ON v.id = b.venue_id`;

const bookingNotFound = () => new WorkflowError('NOT_FOUND', 'VENUE_BOOKING_NOT_FOUND',
  'The venue booking request was not found.');

function requireReader(actor: WorkflowActor) {
  if (actor.role !== 'VENUE_STAFF' && actor.role !== 'EVENT_COORDINATOR') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN',
      'Only Venue Staff and assigned Event Coordinators can view venue booking requests.');
  }
}

function serialize(row: BookingRow): VenueBooking {
  return {
    ...row, startsAt: iso(row.startsAt), endsAt: iso(row.endsAt),
    decidedAt: isoOrNull(row.decidedAt), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
    eventStartsAt: isoOrNull(row.eventStartsAt), eventEndsAt: isoOrNull(row.eventEndsAt),
    holdExpiresAt: isoOrNull(row.holdExpiresAt), heldAt: isoOrNull(row.heldAt),
    expiredAt: isoOrNull(row.expiredAt), cancelledAt: isoOrNull(row.cancelledAt),
  };
}

/** The current schema has no per-venue staff allocation: every verified Venue Staff may review. */
export async function listVenueBookings(
  { pool }: WorkflowDependencies,
  { actor, eventRequestId }: { actor: WorkflowActor; eventRequestId?: string },
): Promise<VenueBooking[]> {
  requireReader(actor);
  const found = await pool.query<BookingRow>(`${bookingSelect}
    -- Venue Staff work queue: pending requests and live holds (KAN-83-AC2).
    WHERE (($1 = 'VENUE_STAFF' AND ${effectiveBookingStatusSql('b')} IN ('PENDING', 'HELD')) OR
      ($1 = 'EVENT_COORDINATOR' AND e.coordinator_id = $2 AND e.status <> 'DRAFT'))
      AND ($3::uuid IS NULL OR b.event_request_id = $3)
    ORDER BY b.created_at ASC, b.id ASC`, [actor.role, actor.id, eventRequestId ?? null]);
  return found.rows.map(serialize);
}

async function readBooking(database: Pick<Pool, 'query'> | Pick<PoolClient, 'query'>,
  bookingId: string, actor: WorkflowActor): Promise<VenueBooking> {
  const found = await database.query<BookingRow>(`${bookingSelect}
    WHERE b.id = $1 AND ($2 = 'VENUE_STAFF' OR
      (e.coordinator_id = $3 AND e.status <> 'DRAFT'))`, [bookingId, actor.role, actor.id]);
  if (!found.rows[0]) throw bookingNotFound();
  return serialize(found.rows[0]);
}

export async function getVenueBooking(
  { pool }: WorkflowDependencies, { bookingId, actor }: { bookingId: string; actor: WorkflowActor },
): Promise<VenueBooking> {
  requireReader(actor);
  return readBooking(pool, bookingId, actor);
}

function conflict(code: string, message: string): never {
  throw new WorkflowError('CONFLICT', code, message);
}

const TERMINAL_EVENT_STATUSES: readonly EventStatus[] = ['REJECTED', 'CANCELLED', 'COMPLETED'];

/**
 * KAN-53: only the event's currently assigned coordinator may request a venue, and only while
 * the event has not reached a terminal outcome. Eligible event states beyond that are an
 * implementation default awaiting team/customer confirmation (S2-T11/S2-T12), not an agreed rule.
 * Submitting never approves the booking (AC9); it stays PENDING until Venue Staff decide (KAN-8).
 */
export async function createVenueBooking(
  { pool }: WorkflowDependencies,
  { eventRequestId, actor, input }: { eventRequestId: string; actor: WorkflowActor; input: unknown },
): Promise<VenueBooking> {
  if (actor.role !== 'EVENT_COORDINATOR') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN',
      'Only the assigned Event Coordinator can submit a venue booking request.');
  }
  const submission = parseBookingSubmission(input);
  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['ASSIGNED_COORDINATOR'],
      'Only the assigned Event Coordinator can submit a venue booking request for this event.');
    if (TERMINAL_EVENT_STATUSES.includes(event.status)) {
      conflict('EVENT_NOT_ELIGIBLE',
        'A venue booking cannot be requested for a rejected, cancelled or completed event.');
    }
    const venue = await client.query<{ isActive: boolean }>(
      'SELECT is_active AS "isActive" FROM venues WHERE id = $1 FOR UPDATE', [submission.venueId]);
    if (!venue.rows[0]) throw new WorkflowError('NOT_FOUND', 'VENUE_NOT_FOUND', 'The venue was not found.');
    if (!venue.rows[0].isActive) conflict('VENUE_INACTIVE', 'This venue is no longer active.');

    // KAN-53/KAN-54: a pending request does not reserve the venue, but must not be
    // submitted for a period already reserved or blocked. Read after acquiring the
    // venue lock so approvals/blocks committed while waiting are included.
    const clashes = await readClashes(client, submission.venueId, null,
      submission.startsAt, submission.endsAt);
    raiseClash(clashes);

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, starts_at, ends_at, layout, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [eventRequestId, submission.venueId, actor.id, submission.startsAt, submission.endsAt,
        submission.layout, submission.notes],
    );
    return readBooking(client, inserted.rows[0]!.id, actor);
  });
}

interface Clashes { booked: boolean; held: boolean; blocked: boolean }

/**
 * Read after the venue (or booking) lock so writes committed while waiting are included.
 * Uses clock_timestamp(): a hold that expired while this writer waited no longer counts.
 * `excludeBookingId` leaves out the booking being decided or held (KAN-83-AC5).
 */
async function readClashes(
  client: Pick<PoolClient, 'query'>, venueId: string, excludeBookingId: string | null,
  startsAt: Date | string, endsAt: Date | string,
): Promise<Clashes> {
  const found = await client.query<Clashes>(`SELECT
    EXISTS(SELECT 1 FROM venue_bookings b WHERE b.venue_id = $1 AND b.id IS DISTINCT FROM $2::uuid
      AND b.status = 'APPROVED' AND b.starts_at < $4 AND b.ends_at > $3) AS booked,
    EXISTS(SELECT 1 FROM venue_bookings b WHERE b.venue_id = $1 AND b.id IS DISTINCT FROM $2::uuid
      AND b.status = 'HELD' AND ${occupyingBookingSql('b', 'clock_timestamp()')}
      AND b.starts_at < $4 AND b.ends_at > $3) AS held,
    EXISTS(SELECT 1 FROM venue_unavailability WHERE venue_id = $1
      AND starts_at < $4 AND ends_at > $3) AS blocked`,
  [venueId, excludeBookingId, startsAt, endsAt]);
  return found.rows[0]!;
}

function raiseClash(clashes: Clashes): void {
  if (clashes.booked) {
    conflict('VENUE_BOOKING_CONFLICT', 'The venue already has an approved booking during this period.');
  }
  if (clashes.held) {
    conflict('VENUE_HELD', 'The venue is temporarily held for another request during this period.');
  }
  if (clashes.blocked) conflict('VENUE_UNAVAILABLE', 'The venue is blocked during this period.');
}

interface LockedBooking {
  status: VenueBookingStatus;
  eventRequestId: string;
  venueId: string;
  startsAt: Date;
  endsAt: Date;
  holdExpiresAt: Date | null;
  /** Evaluated with clock_timestamp() after the row lock: true only for a live hold. */
  holdLive: boolean;
}

async function lockBooking(client: Pick<PoolClient, 'query'>, bookingId: string): Promise<LockedBooking> {
  const locked = await client.query<Omit<LockedBooking, 'holdLive'>>(`SELECT status,
    event_request_id AS "eventRequestId", venue_id AS "venueId", starts_at AS "startsAt",
    ends_at AS "endsAt", hold_expires_at AS "holdExpiresAt"
    FROM venue_bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
  const booking = locked.rows[0];
  if (!booking) throw bookingNotFound();
  // A separate statement after the lock: the clock is read once this writer owns the row.
  const clock = await client.query<{ holdLive: boolean }>(
    'SELECT ($1::timestamptz IS NOT NULL AND $1::timestamptz > clock_timestamp()) AS "holdLive"',
    [booking.holdExpiresAt]);
  return { ...booking, holdLive: booking.status === 'HELD' && clock.rows[0]!.holdLive };
}

function holdExpired(): never {
  conflict('HOLD_EXPIRED',
    'This hold reached its deadline and the venue period was released. Ask the coordinator to submit a new request.');
}

/** Map the database trigger's exclusion errors to the same API conflicts as the app checks. */
function mapTriggerConflict(error: unknown): void {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23P01'
    && 'constraint' in error) {
    if (error.constraint === 'venue_bookings_no_overlap') {
      // Same contract as before KAN-83; the app checks above name a live hold as VENUE_HELD.
      conflict('VENUE_BOOKING_CONFLICT', 'The venue already has an approved booking during this period.');
    }
    if (error.constraint === 'venue_bookings_not_blocked') {
      conflict('VENUE_UNAVAILABLE', 'The venue is blocked during this period.');
    }
  }
}

/**
 * KAN-8 decision, extended by KAN-83: a PENDING request or a live HELD request can be approved
 * or rejected. Approving a hold converts its provisional reservation into the approved booking
 * in one row update, so the period is never reserved twice (AC5). A hold at or past its deadline
 * cannot be approved or rejected: it is already released (AC6/AC9). No event status changes.
 */
export async function decideVenueBooking(
  { pool }: WorkflowDependencies,
  { bookingId, actor, input }: { bookingId: string; actor: WorkflowActor; input: unknown },
): Promise<VenueBooking> {
  if (actor.role !== 'VENUE_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN',
      'Only Venue Staff can approve or reject venue booking requests.');
  }
  const decision = parseBookingDecision(input);
  try {
    return await inActorTransaction(pool, actor.id, async (client) => {
      const booking = await lockBooking(client, bookingId);
      if (booking.status === 'HELD' && !booking.holdLive) holdExpired();
      if (booking.status !== 'PENDING' && booking.status !== 'HELD') {
        conflict('BOOKING_ALREADY_DECIDED', 'This booking is no longer pending a decision.');
      }

      if (decision.decision === 'APPROVED') {
        // Lock order: booking -> event -> venue. The event and venue must remain eligible
        // until commit. Rejection still works if either has become unsuitable meanwhile.
        const event = await client.query<{ status: EventStatus }>(
          'SELECT status FROM event_requests WHERE id = $1 FOR UPDATE', [booking.eventRequestId]);
        if (event.rows[0]?.status !== 'APPROVED') {
          conflict('EVENT_NOT_APPROVED', 'Only a booking for an approved event request can be approved.');
        }
        const venue = await client.query<{ isActive: boolean }>(
          'SELECT is_active AS "isActive" FROM venues WHERE id = $1 FOR UPDATE', [booking.venueId]);
        if (!venue.rows[0]?.isActive) conflict('VENUE_INACTIVE', 'This venue is no longer active.');
        // Recheck the deadline after every lock wait (KAN-83-AC9): never approve late.
        if (booking.status === 'HELD') {
          const still = await client.query<{ live: boolean }>(
            'SELECT $1::timestamptz > clock_timestamp() AS live', [booking.holdExpiresAt]);
          if (!still.rows[0]!.live) holdExpired();
        }
        raiseClash(await readClashes(client, booking.venueId, bookingId, booking.startsAt, booking.endsAt));
      }

      await client.query(`UPDATE venue_bookings SET status = $1, decided_by = $2,
        decided_at = now(), decision_reason = $3, updated_at = now() WHERE id = $4`,
      [decision.decision, actor.id, decision.reason, bookingId]);

      // Share-lock the event so the coordinator notified is the one assigned when this commits.
      const context = await client.query<{
        name: string | null; organiserId: string; coordinatorId: string | null; venueName: string;
      }>(`SELECT e.name, e.organiser_id AS "organiserId", e.coordinator_id AS "coordinatorId",
          v.name AS "venueName"
        FROM venue_bookings b JOIN event_requests e ON e.id = b.event_request_id
        JOIN venues v ON v.id = b.venue_id WHERE b.id = $1 FOR SHARE OF e`, [bookingId]);
      const notified = context.rows[0];
      if (!notified) throw new Error('The booking decision notifications could not be prepared.');
      await recordNotifications(client, bookingDecisionNotifications(
        { id: booking.eventRequestId, name: notified.name, organiserId: notified.organiserId,
          coordinatorId: notified.coordinatorId },
        { id: bookingId, decision: decision.decision, reason: decision.reason, venueName: notified.venueName,
          startsAt: booking.startsAt, endsAt: booking.endsAt },
        actor.id,
      ));
      return readBooking(client, bookingId, actor);
    });
  } catch (error) {
    // Keep database-trigger protection useful to callers if another writer reaches it.
    mapTriggerConflict(error);
    throw error;
  }
}

const singaporeDeadline = (column: string) =>
  `to_char(${column} AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY HH24:MI')`;

async function notifyCoordinator(
  client: Pick<PoolClient, 'query'>, bookingId: string, type: string, title: string, messageSql: string,
): Promise<void> {
  // KAN-83-AC7: written in the same transaction as the hold change; no row when unassigned.
  await client.query(`INSERT INTO notifications (recipient_id, event_request_id, type, title, message)
    SELECT e.coordinator_id, e.id, $2, $3, ${messageSql}
    FROM venue_bookings b JOIN event_requests e ON e.id = b.event_request_id
    JOIN venues v ON v.id = b.venue_id
    WHERE b.id = $1 AND e.coordinator_id IS NOT NULL`, [bookingId, type, title]);
}

/**
 * KAN-83-AC1/AC2/AC3/AC7: Venue Staff explicitly place a hold on one PENDING request. The
 * deadline must be strictly after the database clock and no later than the occupied start.
 * Event, venue, suitability, opening hours and every occupying booking or block are rechecked
 * under the booking -> event -> venue locks. A rejected attempt writes nothing.
 */
export async function placeVenueHold(
  { pool }: WorkflowDependencies,
  { bookingId, actor, input }: { bookingId: string; actor: WorkflowActor; input: unknown },
): Promise<VenueBooking> {
  if (actor.role !== 'VENUE_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only Venue Staff can place a venue hold.');
  }
  const { expiresAt } = parseHoldPlacement(input);
  try {
    return await inActorTransaction(pool, actor.id, async (client) => {
      const booking = await lockBooking(client, bookingId);
      if (booking.status === 'HELD' && booking.holdLive) {
        conflict('BOOKING_ALREADY_HELD', 'This request already has a live hold. Approve, reject or cancel it instead.');
      }
      if (booking.status !== 'PENDING') {
        conflict('BOOKING_NOT_PENDING', 'Only a pending venue request can be held.');
      }
      const event = await client.query<{ status: EventStatus; expectedAttendance: number | null }>(
        `SELECT status, expected_attendance AS "expectedAttendance"
         FROM event_requests WHERE id = $1 FOR UPDATE`, [booking.eventRequestId]);
      if (event.rows[0]?.status !== 'APPROVED') {
        conflict('EVENT_NOT_APPROVED', 'Only a request for an approved event can be held.');
      }
      const venue = await client.query<{
        isActive: boolean; capacity: number; opensAt: string | null; closesAt: string | null;
      }>(`SELECT is_active AS "isActive", capacity, to_char(opens_at, 'HH24:MI') AS "opensAt",
        to_char(closes_at, 'HH24:MI') AS "closesAt" FROM venues WHERE id = $1 FOR UPDATE`, [booking.venueId]);
      const place = venue.rows[0];
      if (!place?.isActive) conflict('VENUE_INACTIVE', 'This venue is no longer active.');
      const attendance = event.rows[0]!.expectedAttendance;
      if (attendance !== null && attendance > place.capacity) {
        conflict('VENUE_UNSUITABLE', 'The venue capacity is below the expected attendance.');
      }
      const withinHours = intervalWithinVenueHours(booking.startsAt.toISOString(), booking.endsAt.toISOString(),
        place.opensAt, place.closesAt);
      if (withinHours !== true) {
        conflict('OUTSIDE_VENUE_HOURS', 'The requested period is outside the venue opening hours.');
      }

      // Deadline checks use the database clock, read after every lock (KAN-83-AC1/AC8).
      const timing = await client.query<{ future: boolean; beforeStart: boolean }>(
        `SELECT $1::timestamptz > clock_timestamp() AS future, $1::timestamptz <= $2::timestamptz AS "beforeStart"`,
        [expiresAt, occupiedStart(booking.startsAt)]);
      if (!timing.rows[0]!.future) {
        throw new WorkflowError('INVALID_INPUT', 'INVALID_HOLD_EXPIRY', 'The hold deadline must be in the future.');
      }
      if (!timing.rows[0]!.beforeStart) {
        throw new WorkflowError('INVALID_INPUT', 'INVALID_HOLD_EXPIRY',
          'The hold deadline must be no later than the start of the booked period.');
      }
      raiseClash(await readClashes(client, booking.venueId, bookingId, booking.startsAt, booking.endsAt));

      await client.query(`UPDATE venue_bookings SET status = 'HELD', hold_expires_at = $2,
        held_by = $3, held_at = now(), updated_at = now() WHERE id = $1`, [bookingId, expiresAt, actor.id]);
      await notifyCoordinator(client, bookingId, 'VENUE_HOLD_PLACED', 'Venue hold placed',
        `format('%s is held for %s until %s (Singapore time). Venue Staff must approve the booking before then, or the hold is released.',
          v.name, coalesce(e.name, 'your event'), ${singaporeDeadline('b.hold_expires_at')})`);
      return readBooking(client, bookingId, actor);
    });
  } catch (error) {
    mapTriggerConflict(error);
    throw error;
  }
}

/**
 * KAN-83-AC10: Venue Staff release one live hold with a reason. Only that booking changes; its
 * hold details stay as history. Later cancellation stories reuse releaseHold().
 */
export async function cancelVenueHold(
  { pool }: WorkflowDependencies,
  { bookingId, actor, input }: { bookingId: string; actor: WorkflowActor; input: unknown },
): Promise<VenueBooking> {
  if (actor.role !== 'VENUE_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only Venue Staff can cancel a venue hold.');
  }
  const { reason } = parseHoldCancellation(input);
  return inActorTransaction(pool, actor.id, async (client) => {
    const booking = await lockBooking(client, bookingId);
    if (booking.status === 'HELD' && !booking.holdLive) holdExpired();
    if (booking.status !== 'HELD') conflict('BOOKING_NOT_HELD', 'This request does not have a live hold.');
    await releaseHold(client, bookingId, actor.id, reason);
    return readBooking(client, bookingId, actor);
  });
}

/** Shared held-state release: the caller holds the booking lock and has checked it is HELD. */
export async function releaseHold(
  client: Pick<PoolClient, 'query'>, bookingId: string, actorId: string, reason: string,
): Promise<void> {
  await client.query(`UPDATE venue_bookings SET status = 'CANCELLED', cancelled_by = $2,
    cancelled_at = now(), cancellation_reason = $3, updated_at = now() WHERE id = $1 AND status = 'HELD'`,
  [bookingId, actorId, reason]);
  await notifyCoordinator(client, bookingId, 'VENUE_HOLD_CANCELLED', 'Venue hold cancelled',
    `format('The hold on %s for %s was cancelled: %s', v.name, coalesce(e.name, 'your event'), b.cancellation_reason)`);
}

/**
 * KAN-83-AC6/AC8: mark overdue holds EXPIRED and notify once. Idempotent; safe to run from
 * several API instances and from pg_cron at the same time. Returns the number expired.
 */
export async function expireVenueHolds(database: Pick<Pool, 'query'>): Promise<number> {
  const result = await database.query<{ expired: number }>('SELECT expire_venue_holds() AS expired');
  return result.rows[0]!.expired;
}
