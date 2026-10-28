import {
  optionalText, parseObjectBody, requiredText, UUID_PATTERN, WorkflowError,
} from '../events/workflow-support.js';

export interface BookingDecisionInput {
  decision: 'APPROVED' | 'REJECTED';
  reason: string | null;
}

export interface BookingSubmissionInput {
  venueId: string;
  startsAt: string;
  endsAt: string;
  layout: string | null;
  notes: string | null;
  /** KAN-81-AC7: the outage-affected booking of the same event that this request replaces. */
  replacesBookingId: string | null;
}

// Require an explicit instant, independent of the server's time zone. Millisecond precision
// matches the API's ISO output; PostgreSQL supports AD years starting at 0001.
const BOOKING_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function requiredDateTime(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  const match = typeof value === 'string' ? BOOKING_DATE_TIME.exec(value) : null;
  if (!match) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT',
      `${field} must be an ISO 8601 date-time with Z or a time zone offset.`);
  }
  const [year, month, day] = match.slice(1, 4).map(Number) as [number, number, number];
  // Date.parse rolls 30 February into March. Validate the supplied calendar date separately.
  // setUTCFullYear preserves years 0001–0099 instead of Date.UTC's implicit 1900 offset.
  const calendarDay = new Date(0);
  calendarDay.setUTCFullYear(year, month - 1, day);
  const parsed = Date.parse(value as string);
  const instant = new Date(parsed);
  if (year < 1 || calendarDay.getUTCFullYear() !== year || calendarDay.getUTCMonth() !== month - 1
    || calendarDay.getUTCDate() !== day || !Number.isFinite(parsed)
    || instant.getUTCFullYear() < 1 || instant.getUTCFullYear() > 9999) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', `${field} must be a valid date-time.`);
  }
  return instant.toISOString();
}

/** KAN-53: a coordinator selects a venue and timing for an event they are authorised to coordinate. */
export function parseBookingSubmission(input: unknown): BookingSubmissionInput {
  const body = parseObjectBody(input, ['venueId', 'startsAt', 'endsAt', 'layout', 'notes', 'replacesBookingId']);
  const venueId = body.venueId;
  if (typeof venueId !== 'string' || !UUID_PATTERN.test(venueId)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_VENUE_ID', 'venueId must be a UUID.');
  }
  const startsAt = requiredDateTime(body, 'startsAt');
  const endsAt = requiredDateTime(body, 'endsAt');
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_BOOKING_PERIOD', 'endsAt must be after startsAt.');
  }
  const replaces = body.replacesBookingId;
  if (replaces !== undefined && replaces !== null && (typeof replaces !== 'string' || !UUID_PATTERN.test(replaces))) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_REPLACED_BOOKING_ID', 'replacesBookingId must be a UUID or null.');
  }
  return {
    venueId, startsAt, endsAt,
    layout: optionalText(body, 'layout'),
    notes: optionalText(body, 'notes'),
    replacesBookingId: typeof replaces === 'string' ? replaces : null,
  };
}

export function parseBookingDecision(input: unknown): BookingDecisionInput {
  const body = parseObjectBody(input, ['decision', 'reason']);
  if (body.decision !== 'APPROVED' && body.decision !== 'REJECTED') {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_BOOKING_DECISION',
      'decision must be APPROVED or REJECTED.');
  }
  return { decision: body.decision, reason: optionalText(body, 'reason') };
}

export function parseBookingFilter(query: Record<string, unknown>): string | undefined {
  if (Object.keys(query).some((key) => key !== 'eventRequestId')) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', 'Only eventRequestId is supported.');
  }
  const id = query.eventRequestId;
  if (id === undefined) return undefined;
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_EVENT_REQUEST_ID',
      'eventRequestId must be a UUID.');
  }
  return id;
}

export interface HoldPlacementInput {
  expiresAt: string;
}

export interface HoldCancellationInput {
  reason: string;
}

/**
 * KAN-83-AC1: the hold deadline is an explicit instant with Z or an offset. Whether it is in
 * the future and no later than the occupied start is checked against the database clock.
 */
export function parseHoldPlacement(input: unknown): HoldPlacementInput {
  const body = parseObjectBody(input, ['expiresAt']);
  if (body.expiresAt === undefined || body.expiresAt === null) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_HOLD_EXPIRY', 'expiresAt is required.');
  }
  try {
    return { expiresAt: requiredDateTime(body, 'expiresAt') };
  } catch (error) {
    // requiredDateTime only throws WorkflowError; keep its message under the hold-specific code.
    throw new WorkflowError('INVALID_INPUT', 'INVALID_HOLD_EXPIRY', (error as Error).message);
  }
}

/** KAN-82-AC4: cancelling one venue arrangement needs a trimmed, nonempty reason. */
export function parseArrangementCancellation(input: unknown): HoldCancellationInput {
  const body = parseObjectBody(input, ['reason']);
  return { reason: requiredText(body, 'reason') };
}

/** KAN-83-AC10: cancelling a hold needs a trimmed, nonempty reason. */
export function parseHoldCancellation(input: unknown): HoldCancellationInput {
  const body = parseObjectBody(input, ['reason']);
  return { reason: requiredText(body, 'reason') };
}
