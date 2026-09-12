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
