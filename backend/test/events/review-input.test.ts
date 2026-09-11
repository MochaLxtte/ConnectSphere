import { describe, expect, it } from 'vitest';
import { parseReviewInput, ReviewInputError } from '../../src/modules/events/review-input.js';

describe('KAN-36 review request input', () => {
  it.each(['APPROVED', 'REJECTED'] as const)('accepts a %s decision', (decision) => {
    expect(parseReviewInput({ decision })).toEqual({ decision, reason: null });
  });

  it.each([undefined, null, '', ' \n\t '])('normalizes an absent or blank reason: %j', (reason) => {
    expect(parseReviewInput({ decision: 'REJECTED', reason })).toEqual({
      decision: 'REJECTED',
      reason: null,
    });
  });

  it('trims the explanation without changing the supplied object', () => {
    const input = Object.freeze({ decision: 'REJECTED', reason: '  Please revise the dates.  ' });

    expect(parseReviewInput(input)).toEqual({
      decision: 'REJECTED',
      reason: 'Please revise the dates.',
    });
    expect(input.reason).toBe('  Please revise the dates.  ');
  });

  it.each([undefined, null, [], 'APPROVED', 42, true])('rejects a non-object body: %j', (body) => {
    expect(() => parseReviewInput(body)).toThrow(ReviewInputError);
  });

  it.each([undefined, null, '', 'approved', 'DRAFT', 'SUBMITTED', 42])(
    'rejects a missing or unsupported decision: %j',
    (decision) => {
      expect(() => parseReviewInput({ decision })).toThrow(
        'Decision must be APPROVED or REJECTED.',
      );
    },
  );

  it.each([42, false, [], {}])('rejects a non-text reason: %j', (reason) => {
    expect(() => parseReviewInput({ decision: 'REJECTED', reason })).toThrow(
      'Reason must be text or null.',
    );
  });

  it.each(['reviewedBy', 'reviewed_by', 'organiserId', 'role', 'status', 'unexpected'])(
    'rejects a caller-supplied %s field',
    (field) => {
      expect(() => parseReviewInput({ decision: 'APPROVED', [field]: 'forged' })).toThrow(
        'Only decision and reason may be supplied.',
      );
    },
  );
});
