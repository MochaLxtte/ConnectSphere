import type { UserRole } from '../auth/types.js';
import type { EventStatus } from './types.js';

export interface DraftEditContext {
  /** From verified identity, never from the request body. */
  actorId: string;
  actorRole: UserRole | null;
  /** From the stored request, never from the request body. */
  ownerId: string;
  status: EventStatus;
}

/** KAN-66 adds the last three codes for post-submission edits; see planning-edit-policy.ts. */
export type DraftEligibilityErrorCode =
  | 'DRAFT_EDIT_FORBIDDEN'
  | 'DRAFT_NOT_EDITABLE'
  | 'EVENT_NOT_EDITABLE'
  | 'EDIT_ROLE_NOT_PERMITTED'
  | 'SIGNIFICANT_CHANGE_REQUIRED';

export class DraftEligibilityError extends Error {
  constructor(
    public readonly code: DraftEligibilityErrorCode,
    message: string,
    /** For SIGNIFICANT_CHANGE_REQUIRED: the refused fields, so the UI can point to KAN-15. */
    public readonly fields: readonly string[] = [],
  ) {
    super(message);
    this.name = 'DraftEligibilityError';
  }
}

/**
 * Check eligibility to edit a draft without changing data.
 * The future database transaction must recheck this under its row lock.
 */
export function assertCanEditDraft(context: DraftEditContext): void {
  // Check ownership first so a caller who does not own this request learns nothing about its state.
  if (context.actorRole !== 'EVENT_ORGANISER' || context.actorId !== context.ownerId) {
    throw new DraftEligibilityError(
      'DRAFT_EDIT_FORBIDDEN',
      'You are not authorised to edit this event request.',
    );
  }

  if (context.status !== 'DRAFT') {
    throw new DraftEligibilityError(
      'DRAFT_NOT_EDITABLE',
      'This event request is no longer a draft and cannot be edited.',
    );
  }
}
