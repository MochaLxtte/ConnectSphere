import type { UserRole } from '../auth/types.js';
import type { EventStatus } from './types.js';

export interface SubmitEligibilityContext {
  /** From verified identity, never from the request body. */
  actorId: string;
  actorRole: UserRole | null;
  /** From the stored request, never from the request body. */
  ownerId: string;
  status: EventStatus;
}

export type SubmitEligibilityErrorCode = 'SUBMIT_FORBIDDEN' | 'REQUEST_NOT_SUBMITTABLE';

export class SubmitEligibilityError extends Error {
  constructor(
    public readonly code: SubmitEligibilityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SubmitEligibilityError';
  }
}

/**
 * Check eligibility to submit a draft without changing data.
 * The future database transaction must recheck this under its row lock.
 */
export function assertCanSubmit(context: SubmitEligibilityContext): void {
  // Check ownership first so a caller who does not own this request learns nothing about its state.
  if (context.actorRole !== 'EVENT_ORGANISER' || context.actorId !== context.ownerId) {
    throw new SubmitEligibilityError(
      'SUBMIT_FORBIDDEN',
      'You are not authorised to submit this event request.',
    );
  }

  if (context.status !== 'DRAFT') {
    throw new SubmitEligibilityError(
      'REQUEST_NOT_SUBMITTABLE',
      'This event request is not a draft and cannot be submitted.',
    );
  }
}
