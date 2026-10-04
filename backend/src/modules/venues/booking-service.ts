import type { Pool, PoolClient } from 'pg';
import type { EventStatus } from '../events/types.js';
import {
  inActorTransaction, iso, isoOrNull, lockEventRequest, requireRelation, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { parseBookingDecision, parseBookingSubmission } from './booking-input.js';

export type VenueBookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

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
}

type BookingRow = Omit<VenueBooking,
  'startsAt' | 'endsAt' | 'decidedAt' | 'createdAt' | 'updatedAt' | 'eventStartsAt' | 'eventEndsAt'> & {
  startsAt: Date; endsAt: Date; decidedAt: Date | null; createdAt: Date; updatedAt: Date;
  eventStartsAt: Date | null; eventEndsAt: Date | null;
};

const bookingSelect = `SELECT b.id, b.event_request_id AS "eventRequestId",
  e.name AS "eventName", e.status AS "eventStatus", b.venue_id AS "venueId",
  v.name AS "venueName", b.status, b.starts_at AS "startsAt", b.ends_at AS "endsAt",
  b.layout, b.notes, b.decided_by AS "decidedBy", b.decided_at AS "decidedAt",
  b.decision_reason AS "decisionReason", b.created_at AS "createdAt", b.updated_at AS "updatedAt",
  e.starts_at AS "eventStartsAt", e.ends_at AS "eventEndsAt", e.purpose, e.description,
  e.expected_attendance AS "expectedAttendance", e.venue_requirements AS "venueRequirements",
  e.accessibility_needs AS "accessibilityNeeds"
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
  };
}

/** The current schema has no per-venue staff allocation: every verified Venue Staff may review. */
export async function listVenueBookings(
  { pool }: WorkflowDependencies,
  { actor, eventRequestId }: { actor: WorkflowActor; eventRequestId?: string },
): Promise<VenueBooking[]> {
  requireReader(actor);
  const found = await pool.query<BookingRow>(`${bookingSelect}
    WHERE (($1 = 'VENUE_STAFF' AND b.status = 'PENDING') OR
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
    const clashes = await client.query<{ booked: boolean; blocked: boolean }>(`SELECT
      EXISTS(SELECT 1 FROM venue_bookings WHERE venue_id = $1 AND status = 'APPROVED'
        AND starts_at < $3 AND ends_at > $2) AS booked,
      EXISTS(SELECT 1 FROM venue_unavailability WHERE venue_id = $1
        AND starts_at < $3 AND ends_at > $2) AS blocked`,
    [submission.venueId, submission.startsAt, submission.endsAt]);
    if (clashes.rows[0]!.booked) {
      conflict('VENUE_BOOKING_CONFLICT', 'The venue already has an approved booking during this period.');
    }
    if (clashes.rows[0]!.blocked) conflict('VENUE_UNAVAILABLE', 'The venue is blocked during this period.');

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, starts_at, ends_at, layout, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [eventRequestId, submission.venueId, actor.id, submission.startsAt, submission.endsAt,
        submission.layout, submission.notes],
    );
    return readBooking(client, inserted.rows[0]!.id, actor);
  });
}

/** No event status, notifications or other booking rows change as part of a booking decision. */
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
      }>(`SELECT status, event_request_id AS "eventRequestId", venue_id AS "venueId",
        starts_at AS "startsAt", ends_at AS "endsAt" FROM venue_bookings WHERE id = $1 FOR UPDATE`,
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
        if (event.rows[0]?.status !== 'APPROVED') {
          conflict('EVENT_NOT_APPROVED', 'Only a booking for an approved event request can be approved.');
        }
        const venue = await client.query<{ isActive: boolean }>(
          'SELECT is_active AS "isActive" FROM venues WHERE id = $1 FOR UPDATE', [booking.venueId]);
        if (!venue.rows[0]?.isActive) conflict('VENUE_INACTIVE', 'This venue is no longer active.');

        // A separate statement after acquiring the venue lock sees approvals committed
        // while we waited. Half-open intervals allow back-to-back bookings, with no buffer.
        const clashes = await client.query<{ booked: boolean; blocked: boolean }>(`SELECT
          EXISTS(SELECT 1 FROM venue_bookings WHERE venue_id = $1 AND id <> $2
            AND status = 'APPROVED' AND starts_at < $4 AND ends_at > $3) AS booked,
          EXISTS(SELECT 1 FROM venue_unavailability WHERE venue_id = $1
            AND starts_at < $4 AND ends_at > $3) AS blocked`,
        [booking.venueId, bookingId, booking.startsAt, booking.endsAt]);
        if (clashes.rows[0]!.booked) {
          conflict('VENUE_BOOKING_CONFLICT', 'The venue already has an approved booking during this period.');
        }
        if (clashes.rows[0]!.blocked) conflict('VENUE_UNAVAILABLE', 'The venue is blocked during this period.');
      }

      await client.query(`UPDATE venue_bookings SET status = $1, decided_by = $2,
        decided_at = now(), decision_reason = $3, updated_at = now() WHERE id = $4`,
      [decision.decision, actor.id, decision.reason, bookingId]);
      return readBooking(client, bookingId, actor);
    });
  } catch (error) {
    // Keep database-trigger protection useful to callers if another writer reaches it.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23P01'
      && 'constraint' in error) {
      if (error.constraint === 'venue_bookings_no_overlap') {
        conflict('VENUE_BOOKING_CONFLICT', 'The venue already has an approved booking during this period.');
      }
      if (error.constraint === 'venue_bookings_not_blocked') {
        conflict('VENUE_UNAVAILABLE', 'The venue is blocked during this period.');
      }
    }
    throw error;
  }
}
