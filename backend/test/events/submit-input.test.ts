import { describe, expect, it } from 'vitest';
import {
  assertReadyForSubmission,
  SubmissionValidationError,
  MANDATORY_SUBMISSION_FIELDS,
} from '../../src/modules/events/submit-input.js';

const completeDraft = {
  name: 'Career Fair',
  purpose: 'Recruitment',
  startsAt: '2026-10-01T09:00:00.000Z',
  endsAt: '2026-10-01T17:00:00.000Z',
  expectedAttendance: 0,
  venueRequirements: 'Hall A',
};

describe('KAN-6 submission completeness', () => {
  it('allows a draft with every mandatory field populated', () => {
    expect(() => assertReadyForSubmission(completeDraft)).not.toThrow();
  });

  it('treats an expectedAttendance of 0 as present, not missing', () => {
    expect(() => assertReadyForSubmission({ ...completeDraft, expectedAttendance: 0 })).not.toThrow();
  });

  it.each(MANDATORY_SUBMISSION_FIELDS)('rejects a draft missing %s', (field) => {
    const draft = { ...completeDraft, [field]: null };
    expect(() => assertReadyForSubmission(draft)).toThrow(SubmissionValidationError);
  });

  it('reports every missing field at once, not just the first', () => {
    const draft = { ...completeDraft, name: null, venueRequirements: null };
    try {
      assertReadyForSubmission(draft);
      throw new Error('Expected assertReadyForSubmission to throw.');
    } catch (error) {
      expect(error).toBeInstanceOf(SubmissionValidationError);
      expect((error as SubmissionValidationError).missingFields).toEqual(['name', 'venueRequirements']);
    }
  });

  it('does not require description, accessibilityNeeds, equipmentRequirements or registrationRequired', () => {
    expect(() => assertReadyForSubmission({
      ...completeDraft,
      description: null,
      accessibilityNeeds: null,
      equipmentRequirements: null,
      registrationRequired: null,
    })).not.toThrow();
  });

  it('lists all mandatory fields in the error message', () => {
    try {
      assertReadyForSubmission({ ...completeDraft, name: null, purpose: null });
      throw new Error('Expected assertReadyForSubmission to throw.');
    } catch (error) {
      expect((error as Error).message).toContain('name');
      expect((error as Error).message).toContain('purpose');
    }
  });
});

const problemsOf = (draft: Parameters<typeof assertReadyForSubmission>[0]) => {
  try {
    assertReadyForSubmission(draft);
  } catch (error) {
    if (error instanceof SubmissionValidationError) return error;
    throw error;
  }
  return null;
};

describe('KAN-59 blank mandatory text counts as missing (S1-DEF-04, KAN-6-AC2)', () => {
  it.each(['name', 'purpose', 'venueRequirements'] as const)('rejects a blank %s', (field) => {
    for (const blank of ['', ' ', '   ', '\t', '\n', ' \t\n ']) {
      const error = problemsOf({ ...completeDraft, [field]: blank });
      expect(error, `blank ${JSON.stringify(blank)}`).not.toBeNull();
      expect(error!.missingFields).toEqual([field]);
      expect(error!.invalidFields).toEqual([]);
    }
  });

  it('accepts text with surrounding whitespace as present', () => {
    expect(() => assertReadyForSubmission({ ...completeDraft, name: '  Career Fair  ' })).not.toThrow();
  });

  it('accepts "None / Not Required" style text for the optional needs, and does not require them', () => {
    expect(() => assertReadyForSubmission({
      ...completeDraft, accessibilityNeeds: 'None', equipmentRequirements: 'Not Required',
    })).not.toThrow();
    expect(() => assertReadyForSubmission({
      ...completeDraft, description: '', accessibilityNeeds: '   ', equipmentRequirements: '',
    })).not.toThrow();
  });

  it('keeps the original missing-only message so existing clients are unaffected', () => {
    const error = problemsOf({ ...completeDraft, name: '  ', purpose: null })!;
    expect(error.message).toBe('The following fields must be completed before submission: name, purpose.');
    expect(error.invalidFields).toEqual([]);
  });
});

describe('KAN-59 the event end must be after its start (S1-DEF-04, KAN-6-AC2)', () => {
  const start = '2026-10-01T09:00:00.000Z';

  it('accepts an end after the start, even by one millisecond', () => {
    expect(() => assertReadyForSubmission({ ...completeDraft, startsAt: start, endsAt: '2026-10-01T09:00:00.001Z' }))
      .not.toThrow();
  });

  it.each([
    ['equal to the start', start],
    ['one millisecond before the start', '2026-10-01T08:59:59.999Z'],
    ['a day before the start', '2026-09-30T09:00:00.000Z'],
  ])('refuses an end %s and names the field', (_label, endsAt) => {
    const error = problemsOf({ ...completeDraft, startsAt: start, endsAt })!;
    expect(error.missingFields).toEqual([]);
    expect(error.invalidFields).toEqual([{ field: 'endsAt', message: 'The end must be after the start.' }]);
    expect(error.message).toBe('The end must be after the start.');
  });

  it('treats an offset time and the equivalent UTC time as the same instant', () => {
    expect(problemsOf({ ...completeDraft, startsAt: '2026-10-01T17:00:00+08:00', endsAt: '2026-10-01T09:00:00Z' })!
      .invalidFields).toEqual([{ field: 'endsAt', message: 'The end must be after the start.' }]);
  });

  it('reports a missing end as missing only, without an ordering complaint', () => {
    const error = problemsOf({ ...completeDraft, endsAt: null })!;
    expect(error.missingFields).toEqual(['endsAt']);
    expect(error.invalidFields).toEqual([]);
  });

  it.each(['startsAt', 'endsAt'] as const)('flags an unreadable %s as invalid instead of skipping the check', (field) => {
    const error = problemsOf({ ...completeDraft, [field]: 'not-a-date' })!;
    expect(error.missingFields).toEqual([]);
    expect(error.invalidFields).toEqual([{ field, message: 'Enter a valid date and time.' }]);
  });
});

describe('KAN-59 registration window is checked only while registration is required (S1-DEF-04)', () => {
  const required = { ...completeDraft, registrationRequired: true };
  const opens = '2026-09-20T00:00:00.000Z';

  it('accepts a window that closes after it opens, and a blank capacity meaning no limit', () => {
    expect(() => assertReadyForSubmission({
      ...required, registrationOpensAt: opens, registrationClosesAt: '2026-09-20T00:00:00.001Z',
    })).not.toThrow();
  });

  it.each([
    ['equal to the opening', opens],
    ['before the opening', '2026-09-19T23:59:59.999Z'],
  ])('refuses a registration close %s', (_label, registrationClosesAt) => {
    const error = problemsOf({ ...required, registrationOpensAt: opens, registrationClosesAt })!;
    expect(error.invalidFields).toEqual([
      { field: 'registrationClosesAt', message: 'Registration must close after it opens.' },
    ]);
    expect(error.missingFields).toEqual([]);
  });

  it('does not require both times, or either', () => {
    expect(() => assertReadyForSubmission({ ...required })).not.toThrow();
    expect(() => assertReadyForSubmission({ ...required, registrationOpensAt: opens })).not.toThrow();
    expect(() => assertReadyForSubmission({ ...required, registrationClosesAt: opens })).not.toThrow();
  });

  it.each([false, null, undefined])('ignores a reversed window when registrationRequired is %s', (registrationRequired) => {
    expect(() => assertReadyForSubmission({
      ...completeDraft,
      ...(registrationRequired === undefined ? {} : { registrationRequired }),
      registrationOpensAt: opens,
      registrationClosesAt: '2026-09-01T00:00:00.000Z',
    })).not.toThrow();
  });

  it.each(['registrationOpensAt', 'registrationClosesAt'] as const)('flags an unreadable %s while required', (field) => {
    const error = problemsOf({ ...required, [field]: 'soon' })!;
    expect(error.invalidFields).toEqual([{ field, message: 'Enter a valid date and time.' }]);
  });

  it('ignores an unreadable registration time when registration is not required', () => {
    expect(() => assertReadyForSubmission({ ...completeDraft, registrationRequired: false, registrationOpensAt: 'soon' }))
      .not.toThrow();
  });
});

describe('KAN-59 every problem is reported together', () => {
  it('lists missing fields and invalid values in one error with a combined message', () => {
    const error = problemsOf({
      ...completeDraft, name: '  ', venueRequirements: null,
      startsAt: '2026-10-02T09:00:00.000Z', endsAt: '2026-10-01T09:00:00.000Z',
      registrationRequired: true, registrationOpensAt: '2026-09-21T00:00:00Z', registrationClosesAt: '2026-09-20T00:00:00Z',
    })!;
    expect(error.missingFields).toEqual(['name', 'venueRequirements']);
    expect(error.invalidFields.map((problem) => problem.field)).toEqual(['endsAt', 'registrationClosesAt']);
    expect(error.message).toBe(
      'The following fields must be completed before submission: name, venueRequirements. '
      + 'The end must be after the start. Registration must close after it opens.',
    );
  });

  it('still accepts an expected attendance of 0 (open question in the 9 October decision entry)', () => {
    expect(() => assertReadyForSubmission({ ...completeDraft, expectedAttendance: 0 })).not.toThrow();
  });
});
