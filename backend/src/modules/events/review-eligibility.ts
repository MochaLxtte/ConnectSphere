import type { UserRole } from '../auth/types.js';
import type { EventStatus } from './types.js';

export interface InitialReviewContext {
  /** From verified identity and server-side permission checks for this request. */
  reviewerRole: UserRole | null;
  canReviewRequest: boolean;
  /** From the stored request and its review records, never from the request body. */
  status: EventStatus;
  hasRecordedDecision: boolean;
}

export type ReviewEligibilityErrorCode =
  | 'REVIEW_FORBIDDEN'
  | 'REVIEW_ALREADY_DECIDED'
  | 'REQUEST_NOT_REVIEWABLE';

export class ReviewEligibilityError extends Error {
  constructor(
    public readonly code: ReviewEligibilityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ReviewEligibilityError';
  }
}

/**
 * Check eligibility for either an initial approval or rejection without changing data.
 * The future database transaction must recheck this while protecting against competing decisions.
 */
export function assertCanMakeInitialReview(context: InitialReviewContext): void {
  // Check permission first so an unauthorised caller learns nothing about the request's state.
  if (context.reviewerRole !== 'EVENT_COORDINATOR' || !context.canReviewRequest) {
    throw new ReviewEligibilityError(
      'REVIEW_FORBIDDEN',
      'You are not authorised to review this event request.',
    );
  }

  if (context.hasRecordedDecision || context.status === 'APPROVED' || context.status === 'REJECTED') {
    throw new ReviewEligibilityError(
      'REVIEW_ALREADY_DECIDED',
      'This event request already has a review decision.',
    );
  }

  // A coordinator may decide directly or after marking the request as under review.
  // A pending clarification must be answered first, which returns the request to SUBMITTED.
  if (context.status !== 'SUBMITTED' && context.status !== 'UNDER_REVIEW') {
    throw new ReviewEligibilityError(
      'REQUEST_NOT_REVIEWABLE',
      'This event request is not awaiting a supported initial review decision.',
    );
  }
}
