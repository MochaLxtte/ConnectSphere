import { describe, expect, it } from 'vitest';
import {
  assertCanMakeInitialReview,
  ReviewEligibilityError,
  type InitialReviewContext,
  type ReviewEligibilityErrorCode,
} from '../../src/modules/events/review-eligibility.js';

const eligibleRequest: InitialReviewContext = {
  reviewerRole: 'EVENT_COORDINATOR',
  canReviewRequest: true,
  status: 'SUBMITTED',
  hasRecordedDecision: false,
};

function expectDenied(context: InitialReviewContext, code: ReviewEligibilityErrorCode) {
  expect(() => assertCanMakeInitialReview(context)).toThrow(
    expect.objectContaining({ name: 'ReviewEligibilityError', code }),
  );
}

describe('KAN-36 initial review eligibility', () => {
  it('allows an authorised coordinator to decide an undecided submitted request', () => {
    expect(() => assertCanMakeInitialReview(eligibleRequest)).not.toThrow();
  });

  it.each([
    'EVENT_ORGANISER',
    'VENUE_STAFF',
    'TECHNICAL_SUPPORT_STAFF',
    'ATTENDEE',
    null,
  ] as const)('denies the %s role even when the request permission flag is true', (reviewerRole) => {
    expectDenied({ ...eligibleRequest, reviewerRole }, 'REVIEW_FORBIDDEN');
  });

  it('denies a coordinator without permission for this specific request', () => {
    expectDenied({ ...eligibleRequest, canReviewRequest: false }, 'REVIEW_FORBIDDEN');
  });

  it('checks permission before revealing that a request already has a decision', () => {
    expectDenied(
      { ...eligibleRequest, canReviewRequest: false, status: 'APPROVED', hasRecordedDecision: true },
      'REVIEW_FORBIDDEN',
    );
  });

  it('prevents a decision on a draft', () => {
    expectDenied({ ...eligibleRequest, status: 'DRAFT' }, 'REQUEST_NOT_REVIEWABLE');
  });

  it.each(['APPROVED', 'REJECTED'] as const)(
    'prevents a second decision on a %s request even if its review-record flag is false',
    (status) => {
      expectDenied({ ...eligibleRequest, status }, 'REVIEW_ALREADY_DECIDED');
    },
  );

  it('prevents a second decision when a review exists but the status still says SUBMITTED', () => {
    expectDenied({ ...eligibleRequest, hasRecordedDecision: true }, 'REVIEW_ALREADY_DECIDED');
  });

  it('allows a decision once the coordinator has marked the request as under review', () => {
    expect(() => assertCanMakeInitialReview({ ...eligibleRequest, status: 'UNDER_REVIEW' })).not.toThrow();
  });

  it('blocks a decision while a clarification is still awaiting the organiser', () => {
    expectDenied({ ...eligibleRequest, status: 'CLARIFICATION_REQUESTED' }, 'REQUEST_NOT_REVIEWABLE');
  });

  it('provides a distinguishable error for the future HTTP handler', () => {
    expect(() =>
      assertCanMakeInitialReview({ ...eligibleRequest, status: 'DRAFT' }),
    ).toThrow(ReviewEligibilityError);
  });
});
