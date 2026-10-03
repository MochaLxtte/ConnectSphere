import { parseObjectBody, requiredText, WorkflowError } from '../events/workflow-support.js';

export interface BlockSubmissionInput {
  startsAt: string;
  endsAt: string;
  reason: string;
}

function requiredDateTime(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  if (Number.isNaN(parsed)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', `${field} must be an ISO 8601 date-time.`);
  }
  return new Date(parsed).toISOString();
}

/**
 * KAN-55: the venue is chosen via the URL path, not this body. A reason is mandatory
 * (KAN-55-AC4/AC5), unlike KAN-8's optional decision reason.
 */
export function parseBlockSubmission(input: unknown): BlockSubmissionInput {
  const body = parseObjectBody(input, ['startsAt', 'endsAt', 'reason']);
  const startsAt = requiredDateTime(body, 'startsAt');
  const endsAt = requiredDateTime(body, 'endsAt');
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_BLOCK_PERIOD', 'endsAt must be after startsAt.');
  }
  return { startsAt, endsAt, reason: requiredText(body, 'reason') };
}
