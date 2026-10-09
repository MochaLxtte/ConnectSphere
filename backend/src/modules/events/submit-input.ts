import type { DraftRegistrationFields } from './draft-update-input.js';
import type { EventDraftFields } from './types.js';

export const MANDATORY_SUBMISSION_FIELDS = [
  'name', 'purpose', 'startsAt', 'endsAt', 'expectedAttendance', 'venueRequirements',
] as const satisfies readonly (keyof EventDraftFields)[];

/** The submitted draft as stored: timestamps are ISO strings, registration settings are optional. */
export type SubmissionDraft = Partial<EventDraftFields> &
  Pick<Partial<DraftRegistrationFields>, 'registrationOpensAt' | 'registrationClosesAt'>;

/** A value that is present but not acceptable, with the message to show next to that field. */
export interface SubmissionFieldProblem {
  field: string;
  message: string;
}

/**
 * Team implementation assumption while Q-03 remains open; see
 * docs/requirements/assumptions-and-questions.md (13 September and 9 October 2026 entries).
 */
export class SubmissionValidationError extends Error {
  constructor(
    public readonly missingFields: string[],
    public readonly invalidFields: SubmissionFieldProblem[] = [],
  ) {
    const parts: string[] = [];
    if (missingFields.length > 0) {
      parts.push(`The following fields must be completed before submission: ${missingFields.join(', ')}.`);
    }
    if (invalidFields.length > 0) parts.push(invalidFields.map((problem) => problem.message).join(' '));
    super(parts.join(' '));
    this.name = 'SubmissionValidationError';
  }
}

/** Blank text is missing, exactly as `null` is; the browser form already stores it as `null`. */
const isBlank = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

function timestamp(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Check the stored draft only; ownership and workflow state are checked separately. Every problem
 * is reported at once. An expected attendance of 0 is deliberately still accepted (open question
 * in the 9 October 2026 decision entry).
 */
export function assertReadyForSubmission(draft: SubmissionDraft): void {
  const missingFields = MANDATORY_SUBMISSION_FIELDS.filter((field) => isBlank(draft[field]));
  const invalidFields: SubmissionFieldProblem[] = [];

  // A value that is present but not a date can never be ordered, so it is reported as invalid.
  const unreadable = (field: 'startsAt' | 'endsAt' | 'registrationOpensAt' | 'registrationClosesAt') => {
    if (isBlank(draft[field]) || timestamp(draft[field]) !== null) return false;
    invalidFields.push({ field, message: 'Enter a valid date and time.' });
    return true;
  };

  const startsAt = unreadable('startsAt') ? null : timestamp(draft.startsAt);
  const endsAt = unreadable('endsAt') ? null : timestamp(draft.endsAt);
  if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
    invalidFields.push({ field: 'endsAt', message: 'The end must be after the start.' });
  }

  if (draft.registrationRequired === true) {
    const opensAt = unreadable('registrationOpensAt') ? null : timestamp(draft.registrationOpensAt);
    const closesAt = unreadable('registrationClosesAt') ? null : timestamp(draft.registrationClosesAt);
    if (opensAt !== null && closesAt !== null && closesAt <= opensAt) {
      invalidFields.push({ field: 'registrationClosesAt', message: 'Registration must close after it opens.' });
    }
  }

  if (missingFields.length > 0 || invalidFields.length > 0) {
    throw new SubmissionValidationError(missingFields, invalidFields);
  }
}
