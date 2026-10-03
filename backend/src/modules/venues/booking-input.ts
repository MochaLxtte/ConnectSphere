import {
  optionalText, parseObjectBody, UUID_PATTERN, WorkflowError,
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
}

function requiredDateTime(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  if (Number.isNaN(parsed)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', `${field} must be an ISO 8601 date-time.`);
  }
  return new Date(parsed).toISOString();
}

/** KAN-53: a coordinator selects a venue and timing for an event they are authorised to coordinate. */
export function parseBookingSubmission(input: unknown): BookingSubmissionInput {
  const body = parseObjectBody(input, ['venueId', 'startsAt', 'endsAt', 'layout', 'notes']);
  const venueId = body.venueId;
  if (typeof venueId !== 'string' || !UUID_PATTERN.test(venueId)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_VENUE_ID', 'venueId must be a UUID.');
  }
  const startsAt = requiredDateTime(body, 'startsAt');
  const endsAt = requiredDateTime(body, 'endsAt');
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_BOOKING_PERIOD', 'endsAt must be after startsAt.');
  }
  return {
    venueId, startsAt, endsAt,
    layout: optionalText(body, 'layout'),
    notes: optionalText(body, 'notes'),
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
