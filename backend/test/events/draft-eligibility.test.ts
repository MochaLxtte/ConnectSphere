import { describe, expect, it } from 'vitest';
import {
  assertCanEditDraft,
  DraftEligibilityError,
  type DraftEditContext,
  type DraftEligibilityErrorCode,
} from '../../src/modules/events/draft-eligibility.js';

const owner = '10000000-0000-4000-8000-000000000001';
const eligibleRequest: DraftEditContext = {
  actorId: owner,
  actorRole: 'EVENT_ORGANISER',
  ownerId: owner,
  status: 'DRAFT',
};

function expectDenied(context: DraftEditContext, code: DraftEligibilityErrorCode) {
  expect(() => assertCanEditDraft(context)).toThrow(
    expect.objectContaining({ name: 'DraftEligibilityError', code }),
  );
}

describe('KAN-34 draft edit eligibility', () => {
  it('allows the owning organiser to edit their own draft', () => {
    expect(() => assertCanEditDraft(eligibleRequest)).not.toThrow();
  });

  it.each(['EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE', null] as const)(
    'denies the %s role even when the ID happens to match the owner',
    (actorRole) => {
      expectDenied({ ...eligibleRequest, actorRole }, 'DRAFT_EDIT_FORBIDDEN');
    },
  );

  it('denies an organiser who does not own the request', () => {
    expectDenied({ ...eligibleRequest, actorId: 'someone-else' }, 'DRAFT_EDIT_FORBIDDEN');
  });

  it('checks ownership before revealing that the request is no longer a draft', () => {
    expectDenied(
      { ...eligibleRequest, actorId: 'someone-else', status: 'APPROVED' },
      'DRAFT_EDIT_FORBIDDEN',
    );
  });

  it.each(['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED'] as const)(
    'denies editing once the request is %s',
    (status) => {
      expectDenied({ ...eligibleRequest, status }, 'DRAFT_NOT_EDITABLE');
    },
  );

  it('provides a distinguishable error for the future HTTP handler', () => {
    expect(() => assertCanEditDraft({ ...eligibleRequest, status: 'SUBMITTED' })).toThrow(
      DraftEligibilityError,
    );
  });
});
