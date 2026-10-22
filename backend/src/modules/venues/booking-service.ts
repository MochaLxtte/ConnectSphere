import type { Pool, PoolClient } from 'pg';
import type { EventStatus } from '../events/types.js';
import {
  inActorTransaction, iso, isoOrNull, lockEventRequest, requireRelation, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { parseBookingDecision, parseBookingSubmission } from './booking-input.js';
import { recordNotifications } from '../notifications/notify.js';
import { bookingDecisionNotifications } from '../notifications/trigger-matrix.js';
import {
  BOOKING_RECOVERY_SQL, hasOpenRecovery, resolveReplacedBooking, serializeRecovery, type BookingRecovery,
} from './outage-impact.js';
import { isOpenForRange } from './venue-search.js';
import type { BookingSubmissionInput } from './booking-input.js';

export type VenueBookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface VenueBooking {
  id: string;
  eventRequestId: string;
  eventName: string | null;
  eventStatus: EventStatus;
  venueId: string;
  venueName: string;
  status: VenueBookingStatus;
  occupiedStartsAt?: string;
  occupiedEndsAt?: string;
  warnings?: string[];
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
  /** KAN-81: outages recorded against this booking and their recovery state, earliest first. */
  recovery: BookingRecovery[];
  /** KAN-81-AC7: the outage-affected booking this request replaces, if any. */
  replacesBookingId: string | null;
}

type BookingRow = Omit<VenueBooking,
  'startsAt' | 'endsAt' | 'decidedAt' | 'createdAt' | 'updatedAt' | 'eventStartsAt' | 'eventEndsAt'> & {
  startsAt: Date; endsAt: Date; decidedAt: Date | null; createdAt: Date; updatedAt: Date;
  eventStartsAt: Date | null; eventEndsAt: Date | null;
};

const bookingSelect = `SELECT b.occupied_starts_at AS "occupiedStartsAt",
  b.occupied_ends_at AS "occupiedEndsAt", venue_booking_warnings(b.id) AS warnings, b.id, b.event_request_id AS "eventRequestId",
  e.name AS "eventName", e.status AS "eventStatus", b.venue_id AS "venueId",
  v.name AS "venueName", b.status, b.starts_at AS "startsAt", b.ends_at AS "endsAt",
  b.layout, b.notes, b.decided_by AS "decidedBy", b.decided_at AS "decidedAt",
  b.decision_reason AS "decisionReason", b.created_at AS "createdAt", b.updated_at AS "updatedAt",
  e.starts_at AS "eventStartsAt", e.ends_at AS "eventEndsAt", e.purpose, e.description,
  e.expected_attendance AS "expectedAttendance", e.venue_requirements AS "venueRequirements",
  e.accessibility_needs AS "accessibilityNeeds", ${BOOKING_RECOVERY_SQL} AS recovery,
  b.replaces_booking_id AS "replacesBookingId"
  FROM venue_booking_intervals b JOIN event_requests e ON e.id = b.event_request_id
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
    ...(row.occupiedStartsAt ? { occupiedStartsAt: iso(row.occupiedStartsAt), occupiedEndsAt: iso(row.occupiedEndsAt!) } : {}),
    decidedAt: isoOrNull(row.decidedAt), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
    eventStartsAt: isoOrNull(row.eventStartsAt), eventEndsAt: isoOrNull(row.eventEndsAt),
    recovery: serializeRecovery(row.recovery),
  };
}

/**
 * The current schema has no per-venue staff allocation: every verified Venue Staff may review.
 * KAN-78 lists approved bookings with buffer warnings; an outage overlap alone is left out because
 * KAN-81 recovery (GET /api/venues/recovery) already handles it and staff cannot decide it here.
 */
export async function listVenueBookings(
  { pool }: WorkflowDependencies,
  { actor, eventRequestId }: { actor: WorkflowActor; eventRequestId?: string },
): Promise<VenueBooking[]> {
  requireReader(actor);
  const found = await pool.query<BookingRow>(`${bookingSelect}
    WHERE (($1 = 'VENUE_STAFF' AND (b.status = 'PENDING' OR (b.status = 'APPROVED'
        AND cardinality(array_remove(venue_booking_warnings(b.id), 'OPERATIONAL_BLOCK_OVERLAP')) > 0))) OR
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

/** Called after the venue lock; all current buffers and reservations share one snapshot. */
async function assertOccupiedIntervalAvailable(client: Pick<PoolClient, 'query'>,
  venueId: string, startsAt: string | Date, endsAt: string | Date, bookingId: string | null = null) {
  const result = await client.query<{ booked: boolean; blocked: boolean; withinHours: boolean }>(
    `SELECT venue_interval_within_hours(occupied.s, occupied.e, v.opens_at, v.closes_at) AS "withinHours",
      EXISTS(SELECT 1 FROM venue_booking_intervals b WHERE b.venue_id = v.id
        AND ($4::uuid IS NULL OR b.id <> $4) AND b.status = 'APPROVED'
        AND b.occupied_starts_at < occupied.e AND b.occupied_ends_at > occupied.s) AS booked,
      EXISTS(SELECT 1 FROM venue_unavailability u WHERE u.venue_id = v.id
        AND u.starts_at < occupied.e AND u.ends_at > occupied.s) AS blocked
      FROM venues v CROSS JOIN LATERAL (SELECT
        venue_occupied_start($2::timestamptz, v.setup_minutes) AS s,
        venue_occupied_end($3::timestamptz, v.turnaround_minutes) AS e) occupied
      WHERE v.id = $1`, [venueId, startsAt, endsAt, bookingId]);
  const current = result.rows[0]!;
  if (!current.withinHours) conflict('VENUE_OUTSIDE_OPERATING_HOURS',
    'The occupied interval is outside valid venue operating hours; restricted cross-day windows are unsupported.');
  if (current.booked) conflict('VENUE_BOOKING_CONFLICT', 'The venue already has an approved booking during the occupied period.');
  if (current.blocked) conflict('VENUE_UNAVAILABLE', 'The venue is blocked during the occupied period.');
}

const TERMINAL_EVENT_STATUSES: readonly EventStatus[] = ['REJECTED', 'CANCELLED', 'COMPLETED'];
/** KAN-81-AC7: a replacement is for an event whose venue planning is already approved. */
const REPLACEMENT_EVENT_STATUSES: readonly EventStatus[] = ['APPROVED', 'CONFIRMED'];

const replacementNotNeeded = () => conflict('REPLACEMENT_NOT_NEEDED',
  'The booking being replaced no longer needs recovery. Refresh to see its current state.');

/**
 * KAN-81-AC7: the original must be a booking of the same event that still needs recovery. It is only
 * read here, not locked; approval locks it and checks again.
 */
async function assertReplaceable(
  client: Pick<PoolClient, 'query'>, eventRequestId: string, eventStatus: EventStatus, originalBookingId: string,
): Promise<void> {
  if (!REPLACEMENT_EVENT_STATUSES.includes(eventStatus)) {
    conflict('EVENT_NOT_ELIGIBLE_FOR_REPLACEMENT', 'A replacement venue can only be requested for an approved or confirmed event.');
  }
  const original = await client.query<{ eventRequestId: string }>(
    'SELECT event_request_id AS "eventRequestId" FROM venue_bookings WHERE id = $1', [originalBookingId]);
  if (original.rows[0]?.eventRequestId !== eventRequestId) throw bookingNotFound();
  if (!(await hasOpenRecovery(client, originalBookingId))) replacementNotNeeded();
}

/**
 * KAN-81-AC7 (21 October decision): a replacement must pass the objective suitability checks. The
 * venue must fit the expected attendance and be open for the whole period. Interpretation-dependent
 * checks stay advisory (KAN-52). Call after the venue row is locked.
 */
async function assertObjectivelySuitable(
  client: Pick<PoolClient, 'query'>, eventRequestId: string, submission: BookingSubmissionInput,
): Promise<void> {
  const found = await client.query<{ capacity: number; opensAt: string | null; closesAt: string | null; attendance: number | null }>(
    `SELECT v.capacity, v.opens_at::text AS "opensAt", v.closes_at::text AS "closesAt",
       e.expected_attendance AS attendance FROM venues v, event_requests e WHERE v.id = $1 AND e.id = $2`,
    [submission.venueId, eventRequestId]);
  const fit = found.rows[0]!;
  if (fit.attendance !== null && fit.capacity < fit.attendance) {
    conflict('VENUE_CAPACITY_TOO_SMALL', "This venue cannot hold the event's expected attendance.");
  }
  if (!isOpenForRange(fit, submission.startsAt, submission.endsAt)) {
    conflict('VENUE_CLOSED_DURING_PERIOD', 'This venue is not open for the whole requested period.');
  }
}

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
    if (submission.replacesBookingId !== null) {
      await assertReplaceable(client, eventRequestId, event.status, submission.replacesBookingId);
    }
    const venue = await client.query<{ isActive: boolean }>(
      'SELECT is_active AS "isActive" FROM venues WHERE id = $1 FOR UPDATE', [submission.venueId]);
    if (!venue.rows[0]) throw new WorkflowError('NOT_FOUND', 'VENUE_NOT_FOUND', 'The venue was not found.');
    if (!venue.rows[0].isActive) conflict('VENUE_INACTIVE', 'This venue is no longer active.');

    // KAN-53/KAN-54: a pending request does not reserve the venue, but must not be
    // submitted for a period already reserved or blocked. Read after acquiring the
    // venue lock so approvals/blocks committed while waiting are included.
    await assertOccupiedIntervalAvailable(client, submission.venueId, submission.startsAt, submission.endsAt);
    if (submission.replacesBookingId !== null) await assertObjectivelySuitable(client, eventRequestId, submission);

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, starts_at, ends_at, layout, notes,
         replaces_booking_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [eventRequestId, submission.venueId, actor.id, submission.startsAt, submission.endsAt,
        submission.layout, submission.notes, submission.replacesBookingId],
    );
    return readBooking(client, inserted.rows[0]!.id, actor);
  });
}

/**
 * No event status or other booking rows change as part of a booking decision. KAN-64-AC203/AC207: its
 * notifications are written in the same transaction, so a refused or rolled-back decision sends none.
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
      const locked = await client.query<{
        status: VenueBookingStatus; eventRequestId: string; venueId: string; startsAt: Date; endsAt: Date;
        replacesBookingId: string | null;
      }>(`SELECT status, event_request_id AS "eventRequestId", venue_id AS "venueId",
        starts_at AS "startsAt", ends_at AS "endsAt", replaces_booking_id AS "replacesBookingId"
        FROM venue_bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]);
      const booking = locked.rows[0];
      if (!booking) throw bookingNotFound();
      if (booking.status !== 'PENDING') {
        conflict('BOOKING_ALREADY_DECIDED', 'This booking is no longer pending a decision.');
      }

      if (decision.decision === 'APPROVED') {
        // Lock order: booking -> event -> venue. The event and venue must remain eligible
        // until commit. Rejection still works if either has become unsuitable meanwhile.
        const event = await client.query<{ status: EventStatus }>(
          'SELECT status FROM event_requests WHERE id = $1 FOR UPDATE', [booking.eventRequestId]);
        // KAN-81-AC7: a replacement may also be approved for a confirmed event.
        const approvable = booking.replacesBookingId === null ? ['APPROVED'] : REPLACEMENT_EVENT_STATUSES;
        if (!approvable.includes(event.rows[0]?.status as EventStatus)) {
          conflict('EVENT_NOT_APPROVED', 'Only a booking for an approved event request can be approved.');
        }
        const venue = await client.query<{ isActive: boolean }>(
          'SELECT is_active AS "isActive" FROM venues WHERE id = $1 FOR UPDATE', [booking.venueId]);
        if (!venue.rows[0]?.isActive) conflict('VENUE_INACTIVE', 'This venue is no longer active.');

        // A separate statement after acquiring the venue lock sees approvals committed
        // while we waited. Half-open occupied intervals allow exact adjacency.
        await assertOccupiedIntervalAvailable(client, booking.venueId, booking.startsAt, booking.endsAt, bookingId);

        // KAN-81-AC8: lock the original last (after booking -> event -> venue) and approve only while it
        // still needs recovery, so a second replacement or a removed outage cannot double-book the event.
        if (booking.replacesBookingId !== null) {
          await client.query('SELECT id FROM venue_bookings WHERE id = $1 FOR UPDATE', [booking.replacesBookingId]);
          if (!(await hasOpenRecovery(client, booking.replacesBookingId))) replacementNotNeeded();
        }
      }

      await client.query(`UPDATE venue_bookings SET status = $1, decided_by = $2,
        decided_at = now(), decision_reason = $3, updated_at = now() WHERE id = $4`,
      [decision.decision, actor.id, decision.reason, bookingId]);
      if (decision.decision === 'APPROVED' && booking.replacesBookingId !== null) {
        await resolveReplacedBooking(client, booking.replacesBookingId);
      }

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
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23P01'
      && 'constraint' in error) {
      if (error.constraint === 'venue_bookings_no_overlap') {
        conflict('VENUE_BOOKING_CONFLICT', 'The venue already has an approved booking during the occupied period.');
      }
      if (error.constraint === 'venue_bookings_within_hours') {
        conflict('VENUE_OUTSIDE_OPERATING_HOURS', 'The occupied interval is outside valid venue operating hours; restricted cross-day windows are unsupported.');
      }
      if (error.constraint === 'venue_bookings_not_blocked') {
        conflict('VENUE_UNAVAILABLE', 'The venue is blocked during the occupied period.');
      }
    }
    throw error;
  }
}
