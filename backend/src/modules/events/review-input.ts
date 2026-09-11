export type ReviewDecision = 'APPROVED' | 'REJECTED';

export interface ReviewInput {
  decision: ReviewDecision;
  reason: string | null;
}

/** The future HTTP handler can distinguish invalid input from unexpected failures. */
export class ReviewInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewInputError';
  }
}

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
    throw new ReviewInputError('Decision must be APPROVED or REJECTED.');
  }

  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
    throw new ReviewInputError('Reason must be text or null.');
  }

  // Preserve a missing explanation as null; a later policy check can require one when needed.
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  return { decision: body.decision, reason: reason || null };
}
