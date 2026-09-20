import type { Pool, PoolClient } from 'pg';
import { notify, type NotificationInput } from '../notifications/notify.js';
import type { BookingDecisionInput, BookingRequestInput } from './booking-input.js';
import { bookingNotFound, databaseErrorInfo, eventNotFound, VenueRuleError, venueNotFound } from './errors.js';
import { canArrangeVenueFor, loadArrangeableEvent, loadBusyIntervals } from './event-access.js';
import { assessVenueSuitability } from './suitability.js';
import { toIso, withTransaction } from './transaction.js';
import type {
  BookingConflict, Interval, SuitabilityCheck, SuitabilityResult, VenueActor, VenueBookingQueueItem,
  VenueBookingRecord, VenueBookingStatus,
} from './types.js';

type Database = Pick<Pool | PoolClient, 'query'>;

interface BookingRow extends Omit<
  VenueBookingRecord, 'startsAt' | 'endsAt' | 'decidedAt' | 'createdAt' | 'updatedAt'
> {
  startsAt: Date;
  endsAt: Date;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const bookingColumns = `
  b.id, b.event_request_id AS "eventRequestId", b.venue_id AS "venueId", v.name AS "venueName",
  b.requested_by AS "requestedBy", b.status, b.starts_at AS "startsAt", b.ends_at AS "endsAt",
  b.layout, b.notes, b.decided_by AS "decidedBy", b.decided_at AS "decidedAt",
  b.decision_reason AS "decisionReason", b.created_at AS "createdAt", b.updated_at AS "updatedAt"`;

function toBooking(row: BookingRow): VenueBookingRecord {
  return {
    id: row.id, eventRequestId: row.eventRequestId, venueId: row.venueId, venueName: row.venueName,
    requestedBy: row.requestedBy, status: row.status,
    startsAt: toIso(row.startsAt), endsAt: toIso(row.endsAt), layout: row.layout, notes: row.notes,
    decidedBy: row.decidedBy, decidedAt: toIso(row.decidedAt), decisionReason: row.decisionReason,
    createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt),
  };
}

async function readBooking(database: Database, bookingId: string): Promise<VenueBookingRecord> {
  const result = await database.query<BookingRow>(`
    SELECT ${bookingColumns} FROM venue_bookings b JOIN venues v ON v.id = b.venue_id WHERE b.id = $1
  `, [bookingId]);
  const row = result.rows[0];
  if (!row) throw new Error('The venue booking could not be read back.');
  return toBooking(row);
}

const eventLabel = (name: string | null) => name?.trim() || 'Untitled event request';

export interface RequestedBooking extends VenueBookingRecord {
  suitability: SuitabilityResult;
  /** Q-08 (provisional): failed checks are warnings; the request is still recorded. */
  warnings: SuitabilityCheck[];
}

/**
 * CF-12: locking the event row serialises competing requests for the same event, so the
 * duplicate check below cannot be passed twice at once.
 */
export async function requestVenueBooking(
  pool: Pick<Pool, 'connect'>, actor: VenueActor, input: BookingRequestInput,
): Promise<RequestedBooking> {
  return withTransaction(pool, async (client) => {
    const event = await loadArrangeableEvent(client, actor, input.eventRequestId, true);
    if (!event) throw eventNotFound();
    if (event.status !== 'APPROVED' && event.status !== 'CONFIRMED') {
      throw new VenueRuleError(
        'CONFLICT', 'EVENT_NOT_BOOKABLE', 'Venues can be requested only for approved or confirmed events.',
      );
    }

    const venues = await client.query<{
      capacity: number; layouts: string[]; accessibilityFeatures: string[];
      wheelchairAccessible: boolean; opensAt: string | null; closesAt: string | null; isActive: boolean;
    }>(`
      SELECT capacity, layouts, accessibility_features AS "accessibilityFeatures",
        wheelchair_accessible AS "wheelchairAccessible", to_char(opens_at, 'HH24:MI') AS "opensAt",
        to_char(closes_at, 'HH24:MI') AS "closesAt", is_active AS "isActive"
      FROM venues WHERE id = $1 FOR SHARE
    `, [input.venueId]);
    const venue = venues.rows[0];
    if (!venue) throw venueNotFound();
    if (!venue.isActive) {
      throw new VenueRuleError('CONFLICT', 'VENUE_INACTIVE', 'This venue is not currently open for bookings.');
    }

    const startsAt = input.startsAt ?? event.startsAt;
    const endsAt = input.endsAt ?? event.endsAt;
    if (!startsAt || !endsAt || endsAt <= startsAt) {
      throw new VenueRuleError(
        'CONFLICT', 'EVENT_NOT_BOOKABLE', 'The event has no valid start and end time; supply a booking period.',
      );
    }
    if (input.layout && venue.layouts.length
      && !venue.layouts.some((layout) => layout.toLowerCase() === input.layout!.toLowerCase())) {
      throw new VenueRuleError('INVALID', 'INVALID_VENUE_BOOKING_INPUT', 'layout must be one of the venue\'s layouts.');
    }

    const duplicates = await client.query(`
      SELECT 1 FROM venue_bookings
      WHERE event_request_id = $1 AND venue_id = $2 AND status IN ('PENDING', 'APPROVED')
        AND starts_at < $4 AND ends_at > $3
      LIMIT 1
    `, [event.id, input.venueId, startsAt, endsAt]);
    if (duplicates.rows.length) {
      throw new VenueRuleError(
        'CONFLICT', 'VENUE_BOOKING_DUPLICATE',
        'This event already has a pending or approved booking for this venue in this period.',
      );
    }

    const inserted = await client.query<{ id: string }>(`
      INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, starts_at, ends_at, layout, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [event.id, input.venueId, actor.id, startsAt, endsAt, input.layout, input.notes]);
    const booking = await readBooking(client, inserted.rows[0]!.id);

    const busy = await loadBusyIntervals(client, input.venueId, { startsAt, endsAt });
    const suitability = assessVenueSuitability({ ...venue, busy }, { ...event, startsAt, endsAt });

    const staff = await client.query<{ id: string }>(
      "SELECT id FROM app_users WHERE role = 'VENUE_STAFF' AND id <> $1", [actor.id],
    );
    await notify(client, staff.rows.map((member): NotificationInput => ({
      recipientId: member.id, eventRequestId: event.id, type: 'VENUE_BOOKING_REQUESTED',
      title: 'New venue booking request',
      message: `${booking.venueName} has been requested for "${eventLabel(event.name)}".`,
    })));

    return { ...booking, suitability, warnings: suitability.checks.filter((check) => !check.passed) };
  });
}

/** CF-12: bookings of one event, for its owner organiser or assigned coordinator only. */
export async function listEventBookings(
  database: Database, actor: VenueActor, eventRequestId: string,
): Promise<VenueBookingRecord[]> {
  const event = await loadArrangeableEvent(database, actor, eventRequestId);
  if (!event) throw eventNotFound();
  const result = await database.query<BookingRow>(`
    SELECT ${bookingColumns} FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
    WHERE b.event_request_id = $1 ORDER BY b.created_at DESC, b.id
  `, [eventRequestId]);
  return result.rows.map(toBooking);
}

interface QueueRow extends BookingRow {
  eventName: string | null;
  organiserName: string;
  expectedAttendance: number | null;
  accessibilityNeeds: string | null;
  capacity: number;
  accessibilityFeatures: string[];
  wheelchairAccessible: boolean;
  opensAt: string | null;
  closesAt: string | null;
  isActive: boolean;
}

/** CF-13/CF-14: the staff queue surfaces suitability warnings and conflicts before a decision. */
export async function listBookingQueue(
  database: Database, status: VenueBookingStatus,
): Promise<VenueBookingQueueItem[]> {
  const queue = await database.query<QueueRow>(`
    SELECT ${bookingColumns}, e.name AS "eventName", o.display_name AS "organiserName",
      e.expected_attendance AS "expectedAttendance", e.accessibility_needs AS "accessibilityNeeds",
      v.capacity, v.accessibility_features AS "accessibilityFeatures",
      v.wheelchair_accessible AS "wheelchairAccessible", to_char(v.opens_at, 'HH24:MI') AS "opensAt",
      to_char(v.closes_at, 'HH24:MI') AS "closesAt", v.is_active AS "isActive"
    FROM venue_bookings b
    JOIN venues v ON v.id = b.venue_id
    JOIN event_requests e ON e.id = b.event_request_id
    JOIN app_users o ON o.id = e.organiser_id
    WHERE b.status = $1
    ORDER BY b.starts_at, b.created_at, b.id
  `, [status]);
  if (!queue.rows.length) return [];

  const ids = queue.rows.map((row) => row.id);
  const conflicts = await database.query<{
    forBookingId: string; bookingId: string; status: 'PENDING' | 'APPROVED';
    startsAt: Date; endsAt: Date; eventName: string | null;
  }>(`
    SELECT b.id AS "forBookingId", other.id AS "bookingId", other.status,
      other.starts_at AS "startsAt", other.ends_at AS "endsAt", e.name AS "eventName"
    FROM venue_bookings b
    JOIN venue_bookings other ON other.venue_id = b.venue_id AND other.id <> b.id
      AND other.status IN ('PENDING', 'APPROVED')
      AND other.starts_at < b.ends_at AND other.ends_at > b.starts_at
    JOIN event_requests e ON e.id = other.event_request_id
    WHERE b.id = ANY($1::uuid[])
    ORDER BY other.starts_at, other.id
  `, [ids]);
  const blocks = await database.query<{ forBookingId: string; startsAt: Date; endsAt: Date }>(`
    SELECT b.id AS "forBookingId", u.starts_at AS "startsAt", u.ends_at AS "endsAt"
    FROM venue_bookings b
    JOIN venue_unavailability u ON u.venue_id = b.venue_id
      AND u.starts_at < b.ends_at AND u.ends_at > b.starts_at
    WHERE b.id = ANY($1::uuid[])
  `, [ids]);

  return queue.rows.map((row) => {
    const own: BookingConflict[] = conflicts.rows
      .filter((conflict) => conflict.forBookingId === row.id)
      .map((conflict) => ({
        bookingId: conflict.bookingId, status: conflict.status, eventName: conflict.eventName,
        startsAt: toIso(conflict.startsAt), endsAt: toIso(conflict.endsAt),
      }));
    const busy: Interval[] = [
      ...own.filter((conflict) => conflict.status === 'APPROVED'),
      ...blocks.rows.filter((block) => block.forBookingId === row.id)
        .map((block) => ({ startsAt: toIso(block.startsAt), endsAt: toIso(block.endsAt) })),
    ];
    const booking = toBooking(row);
    return {
      ...booking,
      eventName: row.eventName, organiserName: row.organiserName,
      expectedAttendance: row.expectedAttendance,
      suitability: assessVenueSuitability({ ...row, busy }, {
        startsAt: booking.startsAt, endsAt: booking.endsAt,
        expectedAttendance: row.expectedAttendance, accessibilityNeeds: row.accessibilityNeeds,
      }),
      conflicts: own,
    };
  });
}

interface LockedBooking {
  id: string;
  eventRequestId: string;
  venueId: string;
  venueName: string;
  requestedBy: string;
  status: VenueBookingStatus;
  startsAt: Date;
  endsAt: Date;
  organiserId: string;
  coordinatorId: string | null;
  eventStatus: string;
  eventName: string | null;
}

async function lockBooking(client: PoolClient, bookingId: string): Promise<LockedBooking | undefined> {
  const result = await client.query<LockedBooking>(`
    SELECT b.id, b.event_request_id AS "eventRequestId", b.venue_id AS "venueId", v.name AS "venueName",
      b.requested_by AS "requestedBy", b.status, b.starts_at AS "startsAt", b.ends_at AS "endsAt",
      e.organiser_id AS "organiserId", e.coordinator_id AS "coordinatorId",
      e.status AS "eventStatus", e.name AS "eventName"
    FROM venue_bookings b
    JOIN venues v ON v.id = b.venue_id
    JOIN event_requests e ON e.id = b.event_request_id
    WHERE b.id = $1 FOR UPDATE OF b
  `, [bookingId]);
  return result.rows[0];
}

/** CF-12: the requester, or whoever may currently arrange venues for the event, can cancel. */
export async function cancelVenueBooking(
  pool: Pick<Pool, 'connect'>, actor: VenueActor, bookingId: string,
): Promise<VenueBookingRecord> {
  return withTransaction(pool, async (client) => {
    const booking = await lockBooking(client, bookingId);
    // An unrelated user must not learn whether this booking exists or its state.
    if (!booking || !(booking.requestedBy === actor.id || canArrangeVenueFor(actor, booking))) {
      throw bookingNotFound();
    }
    if (booking.status !== 'PENDING' && booking.status !== 'APPROVED') {
      throw new VenueRuleError(
        'CONFLICT', 'VENUE_BOOKING_NOT_CANCELLABLE', 'Only pending or approved bookings can be cancelled.',
      );
    }
    await client.query(
      "UPDATE venue_bookings SET status = 'CANCELLED', updated_at = now() WHERE id = $1", [booking.id],
    );

    const recipients = new Set<string>([booking.requestedBy, booking.organiserId]);
    if (booking.status === 'APPROVED') {
      const staff = await client.query<{ id: string }>("SELECT id FROM app_users WHERE role = 'VENUE_STAFF'");
      for (const member of staff.rows) recipients.add(member.id);
    }
    recipients.delete(actor.id);
    await notify(client, [...recipients].map((recipientId): NotificationInput => ({
      recipientId, eventRequestId: booking.eventRequestId, type: 'VENUE_BOOKING_CANCELLED',
      title: 'Venue booking cancelled',
      message: `The ${booking.venueName} booking for "${eventLabel(booking.eventName)}" was cancelled.`,
    })));
    return readBooking(client, booking.id);
  });
}

async function conflictingIntervals(
  database: Database, booking: Pick<LockedBooking, 'id' | 'venueId' | 'startsAt' | 'endsAt'>,
) {
  return loadBusyIntervals(
    database, booking.venueId,
    { startsAt: toIso(booking.startsAt), endsAt: toIso(booking.endsAt) }, booking.id,
  );
}

/**
 * CF-13/CF-14: the booking row lock serialises decisions on one booking; the database trigger
 * locks the venue row and refuses an approval that overlaps an approved booking or a block.
 */
export async function decideVenueBooking(
  pool: Pick<Pool, 'connect' | 'query'>, actor: VenueActor, bookingId: string, input: BookingDecisionInput,
): Promise<VenueBookingRecord> {
  let attempted: LockedBooking | undefined;
  try {
    return await withTransaction(pool, async (client) => {
      const booking = await lockBooking(client, bookingId);
      if (!booking) throw bookingNotFound();
      if (booking.status !== 'PENDING') {
        throw new VenueRuleError('CONFLICT', 'VENUE_BOOKING_NOT_PENDING', 'Only pending bookings can be decided.');
      }
      if (input.decision === 'APPROVED'
        && booking.eventStatus !== 'APPROVED' && booking.eventStatus !== 'CONFIRMED') {
        throw new VenueRuleError(
          'CONFLICT', 'EVENT_NOT_BOOKABLE', 'The event is no longer approved, so its booking cannot be approved.',
        );
      }
      attempted = booking;
      await client.query(`
        UPDATE venue_bookings SET status = $2, decided_by = $3, decided_at = now(),
          decision_reason = $4, updated_at = now()
        WHERE id = $1
      `, [booking.id, input.decision, actor.id, input.reason]);

      const approved = input.decision === 'APPROVED';
      const recipients = new Set([booking.requestedBy, booking.organiserId]);
      recipients.delete(actor.id);
      await notify(client, [...recipients].map((recipientId): NotificationInput => ({
        recipientId, eventRequestId: booking.eventRequestId,
        type: approved ? 'VENUE_BOOKING_APPROVED' : 'VENUE_BOOKING_REJECTED',
        title: approved ? 'Venue booking approved' : 'Venue booking rejected',
        message: `The ${booking.venueName} booking for "${eventLabel(booking.eventName)}" was `
          + `${approved ? 'approved' : 'rejected'}${input.reason ? `: ${input.reason}` : '.'}`,
      })));
      return readBooking(client, booking.id);
    });
  } catch (error) {
    const { code, constraint } = databaseErrorInfo(error);
    if (code !== '23P01' || !attempted) throw error;
    if (constraint === 'venue_bookings_no_overlap') {
      const conflicts = (await conflictingIntervals(pool, attempted)).filter((busy) => busy.kind === 'BOOKING');
      throw new VenueRuleError(
        'CONFLICT', 'VENUE_BOOKING_CONFLICT',
        'The venue already has an approved booking in this period.', { conflicts },
      );
    }
    if (constraint === 'venue_bookings_not_blocked') {
      const conflicts = (await conflictingIntervals(pool, attempted)).filter((busy) => busy.kind === 'BLOCKED');
      throw new VenueRuleError(
        'CONFLICT', 'VENUE_UNAVAILABLE', 'The venue is blocked in this period.', { conflicts },
      );
    }
    throw error;
  }
}
