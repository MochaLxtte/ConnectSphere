import { uuidPattern, VENUE_BOOKING_STATUSES, type VenueBookingStatus } from './types.js';
import { parseIsoTimestamp } from './venue-input.js';

export type BookingInputErrorCode = 'INVALID_VENUE_BOOKING_INPUT' | 'INVALID_VENUE_BOOKING_QUERY';

export class BookingInputError extends Error {
  constructor(readonly code: BookingInputErrorCode, message: string) {
    super(message);
    this.name = 'BookingInputError';
  }
}

export interface BookingRequestInput {
  eventRequestId: string;
  venueId: string;
  /** Both null means "use the event's own interval". */
  startsAt: string | null;
  endsAt: string | null;
  layout: string | null;
  notes: string | null;
}

export interface BookingDecisionInput {
  decision: 'APPROVED' | 'REJECTED';
  reason: string | null;
}

export type BookingListQuery =
  | { kind: 'EVENT'; eventRequestId: string }
  | { kind: 'QUEUE'; status: VenueBookingStatus };

function asObject(input: unknown, label: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BookingInputError('INVALID_VENUE_BOOKING_INPUT', `${label} must be a JSON object.`);
  }
  return input as Record<string, unknown>;
}

function optionalText(body: Record<string, unknown>, field: string, maxLength: number): string | null {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new BookingInputError('INVALID_VENUE_BOOKING_INPUT', `${field} must be text or null.`);
  }
  if (value.trim().length > maxLength) {
    throw new BookingInputError('INVALID_VENUE_BOOKING_INPUT', `${field} must be at most ${maxLength} characters.`);
  }
  return value.trim() || null;
}

/** CF-12: requester identity and status are never accepted from the body. */
export function parseBookingRequestInput(input: unknown): BookingRequestInput {
  const body = asObject(input, 'The booking request');
  const allowed = ['eventRequestId', 'venueId', 'startsAt', 'endsAt', 'layout', 'notes'];
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    throw new BookingInputError(
      'INVALID_VENUE_BOOKING_INPUT',
      'Only eventRequestId, venueId, startsAt, endsAt, layout and notes may be supplied.',
    );
  }
  for (const field of ['eventRequestId', 'venueId'] as const) {
    if (typeof body[field] !== 'string' || !uuidPattern.test(body[field])) {
      throw new BookingInputError('INVALID_VENUE_BOOKING_INPUT', `${field} must be a UUID.`);
    }
  }

  const hasStart = body.startsAt !== undefined && body.startsAt !== null;
  const hasEnd = body.endsAt !== undefined && body.endsAt !== null;
  if (hasStart !== hasEnd) {
    throw new BookingInputError('INVALID_VENUE_BOOKING_INPUT', 'Supply both startsAt and endsAt, or neither.');
  }
  let startsAt: string | null = null;
  let endsAt: string | null = null;
  if (hasStart) {
    startsAt = parseIsoTimestamp(body.startsAt);
    endsAt = parseIsoTimestamp(body.endsAt);
    if (!startsAt || !endsAt) {
      throw new BookingInputError(
        'INVALID_VENUE_BOOKING_INPUT', 'startsAt and endsAt must be ISO 8601 timestamps with an offset.',
      );
    }
    if (endsAt <= startsAt) {
      throw new BookingInputError('INVALID_VENUE_BOOKING_INPUT', 'endsAt must be later than startsAt.');
    }
  }

  return {
    eventRequestId: body.eventRequestId as string,
    venueId: body.venueId as string,
    startsAt, endsAt,
    layout: optionalText(body, 'layout', 80),
    notes: optionalText(body, 'notes', 2000),
  };
}

/** CF-13: a rejection must explain itself; an approval may. */
export function parseBookingDecisionInput(input: unknown): BookingDecisionInput {
  const body = asObject(input, 'The booking decision');
  if (Object.keys(body).some((key) => key !== 'decision' && key !== 'reason')) {
    throw new BookingInputError('INVALID_VENUE_BOOKING_INPUT', 'Only decision and reason may be supplied.');
  }
  if (body.decision !== 'APPROVED' && body.decision !== 'REJECTED') {
    throw new BookingInputError('INVALID_VENUE_BOOKING_INPUT', 'decision must be APPROVED or REJECTED.');
  }
  const reason = optionalText(body, 'reason', 1000);
  if (body.decision === 'REJECTED' && !reason) {
    throw new BookingInputError('INVALID_VENUE_BOOKING_INPUT', 'A reason is required when rejecting a booking.');
  }
  return { decision: body.decision, reason };
}

/** Venue staff read a status queue (default PENDING); organisers and coordinators read one event. */
export function parseBookingListQuery(query: unknown, staff: boolean): BookingListQuery {
  const params = (typeof query === 'object' && query !== null ? query : {}) as Record<string, unknown>;
  const allowed = staff ? 'status' : 'eventRequestId';
  if (Object.keys(params).some((name) => name !== allowed)) {
    throw new BookingInputError('INVALID_VENUE_BOOKING_QUERY', `Only the ${allowed} parameter is supported.`);
  }
  if (staff) {
    const status = params.status ?? 'PENDING';
    if (typeof status !== 'string' || !(VENUE_BOOKING_STATUSES as readonly string[]).includes(status)) {
      throw new BookingInputError(
        'INVALID_VENUE_BOOKING_QUERY', `status must be one of ${VENUE_BOOKING_STATUSES.join(', ')}.`,
      );
    }
    return { kind: 'QUEUE', status: status as VenueBookingStatus };
  }
  const eventRequestId = params.eventRequestId;
  if (typeof eventRequestId !== 'string' || !uuidPattern.test(eventRequestId)) {
    throw new BookingInputError('INVALID_VENUE_BOOKING_QUERY', 'eventRequestId must be a UUID.');
  }
  return { kind: 'EVENT', eventRequestId };
}
