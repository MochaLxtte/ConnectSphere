import { MAX_TEXT_LENGTH } from './workflow-support.js';

export type ReviewDecision = 'APPROVED' | 'REJECTED';

export interface ReviewInput {
  decision: ReviewDecision;
  reason: string | null;
}

/** The submitted field an input error refers to, so clients can show it beside that field. */
export type ReviewInputField = 'decision' | 'reason';

/** The HTTP handler can distinguish invalid input from unexpected failures. */
export class ReviewInputError extends Error {
  constructor(message: string, readonly field?: ReviewInputField) {
    super(message);
    this.name = 'ReviewInputError';
  }
}

/** KAN-60: the same trimmed limit as other workflow explanations. */
export const REVIEW_REASON_MAX_LENGTH = MAX_TEXT_LENGTH;

/** Validate request data only; permissions and allowed state changes are checked separately. */
export function parseReviewInput(input: unknown): ReviewInput {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ReviewInputError('The review must be a JSON object.');
  }

  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== 'decision' && key !== 'reason')) {
    throw new ReviewInputError('Only decision and reason may be supplied.');
  }

  if (body.decision !== 'APPROVED' && body.decision !== 'REJECTED') {
    throw new ReviewInputError('Decision must be APPROVED or REJECTED.', 'decision');
  }

  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
    throw new ReviewInputError('Reason must be text or null.', 'reason');
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length > REVIEW_REASON_MAX_LENGTH) {
    throw new ReviewInputError(`Reason must be at most ${REVIEW_REASON_MAX_LENGTH} characters.`, 'reason');
  }
  // KAN-60: a rejection must explain itself; approval keeps an optional reason (KAN-60-AC4).
  if (body.decision === 'REJECTED' && reason === '') {
    throw new ReviewInputError('Enter a reason to reject this event request.', 'reason');
  }
  return { decision: body.decision, reason: reason || null };
}
