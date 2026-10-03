import {
  optionalText, parseObjectBody, UUID_PATTERN, WorkflowError,
} from '../events/workflow-support.js';

export interface BookingDecisionInput {
  decision: 'APPROVED' | 'REJECTED';
  reason: string | null;
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
