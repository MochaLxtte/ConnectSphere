import { describe, expect, it } from 'vitest';
import {
  assertCanSubmit,
  SubmitEligibilityError,
  type SubmitEligibilityContext,
  type SubmitEligibilityErrorCode,
} from '../../src/modules/events/submit-eligibility.js';

const owner = '10000000-0000-4000-8000-000000000001';
const eligibleRequest: SubmitEligibilityContext = {
  actorId: owner,
  actorRole: 'EVENT_ORGANISER',
  ownerId: owner,
  status: 'DRAFT',
};

function expectDenied(context: SubmitEligibilityContext, code: SubmitEligibilityErrorCode) {
  expect(() => assertCanSubmit(context)).toThrow(
    expect.objectContaining({ name: 'SubmitEligibilityError', code }),
  );
}

describe('KAN-6 submit eligibility', () => {
  it('allows the owning organiser to submit their own draft', () => {
    expect(() => assertCanSubmit(eligibleRequest)).not.toThrow();
  });

  it.each(['EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE', null] as const)(
    'denies the %s role even when the ID happens to match the owner',
    (actorRole) => {
      expectDenied({ ...eligibleRequest, actorRole }, 'SUBMIT_FORBIDDEN');
    },
  );

  it('denies an organiser who does not own the request', () => {
    expectDenied({ ...eligibleRequest, actorId: 'someone-else' }, 'SUBMIT_FORBIDDEN');
  });

  it('checks ownership before revealing that the request is no longer a draft', () => {
    expectDenied(
      { ...eligibleRequest, actorId: 'someone-else', status: 'SUBMITTED' },
      'SUBMIT_FORBIDDEN',
    );
  });

  it.each(['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED'] as const)(
    'denies submitting a request that is already %s',
    (status) => {
      expectDenied({ ...eligibleRequest, status }, 'REQUEST_NOT_SUBMITTABLE');
    },
  );

  it('provides a distinguishable error for the future HTTP handler', () => {
    expect(() => assertCanSubmit({ ...eligibleRequest, status: 'SUBMITTED' })).toThrow(
      SubmitEligibilityError,
    );
  });
});
