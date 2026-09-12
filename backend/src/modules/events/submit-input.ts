import type { EventDraftFields } from './types.js';

export const MANDATORY_SUBMISSION_FIELDS = [
  'name', 'purpose', 'startsAt', 'endsAt', 'expectedAttendance', 'venueRequirements',
] as const satisfies readonly (keyof EventDraftFields)[];

/**
 * Team implementation assumption while Q-03 remains open; see
 * docs/requirements/assumptions-and-questions.md (13 September 2026 entry).
 */
export class SubmissionValidationError extends Error {
  constructor(public readonly missingFields: string[]) {
    super(`The following fields must be completed before submission: ${missingFields.join(', ')}.`);
    this.name = 'SubmissionValidationError';
  }
}

/** Check the stored draft's completeness only; ownership and workflow state are checked separately. */
export function assertReadyForSubmission(draft: Partial<EventDraftFields>): void {
  const missingFields = MANDATORY_SUBMISSION_FIELDS.filter(
    (field) => draft[field] === null || draft[field] === undefined,
  );
  if (missingFields.length > 0) {
    throw new SubmissionValidationError(missingFields);
  }
}
