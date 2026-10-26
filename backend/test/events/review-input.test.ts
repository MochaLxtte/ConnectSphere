import { describe, expect, it } from 'vitest';
import {
  parseReviewInput,
  REVIEW_REASON_MAX_LENGTH,
  ReviewInputError,
} from '../../src/modules/events/review-input.js';

describe('KAN-36 review request input', () => {
  it('accepts an APPROVED decision without a reason', () => {
    expect(parseReviewInput({ decision: 'APPROVED' })).toEqual({ decision: 'APPROVED', reason: null });
  });

  it.each([undefined, null, '', ' \n\t '])('normalizes an absent or blank approval reason: %j', (reason) => {
    expect(parseReviewInput({ decision: 'APPROVED', reason })).toEqual({
      decision: 'APPROVED',
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
        'Only decision, reason and expectedRevision may be supplied.',
      );
    },
  );
});

describe('KAN-66 reviewer revision', () => {
  it('passes a positive whole-number expectedRevision through and omits it when absent', () => {
    expect(parseReviewInput({ decision: 'APPROVED', expectedRevision: 3 }))
      .toEqual({ decision: 'APPROVED', reason: null, expectedRevision: 3 });
    expect(parseReviewInput({ decision: 'APPROVED' })).toEqual({ decision: 'APPROVED', reason: null });
  });

  it.each([0, -1, 1.5, '3', null])('rejects expectedRevision %j with a field-specific error', (expectedRevision) => {
    try {
      parseReviewInput({ decision: 'APPROVED', expectedRevision });
      throw new Error('expected a failure');
    } catch (error) {
      expect(error).toBeInstanceOf(ReviewInputError);
      expect(error).toMatchObject({ field: 'expectedRevision', message: 'expectedRevision must be a positive whole number.' });
    }
  });
});

describe('KAN-60 required rejection reason', () => {
  it.each([undefined, null, '', ' ', ' \n\t '])(
    'KAN-60-AC1 refuses a rejection with a missing or blank reason: %j',
    (reason) => {
      const attempt = () => parseReviewInput({ decision: 'REJECTED', reason });
      expect(attempt).toThrow(ReviewInputError);
      expect(attempt).toThrow('Enter a reason to reject this event request.');
      try { attempt(); } catch (error) { expect((error as ReviewInputError).field).toBe('reason'); }
    },
  );

  it('KAN-60-AC1 refuses a rejection that supplies no reason property at all', () => {
    expect(() => parseReviewInput({ decision: 'REJECTED' }))
      .toThrow('Enter a reason to reject this event request.');
  });

  it('KAN-60-AC101 accepts a trimmed rejection reason at exactly the shared limit', () => {
    expect(REVIEW_REASON_MAX_LENGTH).toBe(2000);
    const reason = 'r'.repeat(REVIEW_REASON_MAX_LENGTH);
    expect(parseReviewInput({ decision: 'REJECTED', reason: `  ${reason}\n` }))
      .toEqual({ decision: 'REJECTED', reason });
  });

  it.each(['REJECTED', 'APPROVED'] as const)(
    'KAN-60-AC101 refuses a %s reason one character over the shared limit, naming the field',
    (decision) => {
      const attempt = () => parseReviewInput({ decision, reason: 'r'.repeat(REVIEW_REASON_MAX_LENGTH + 1) });
      expect(attempt).toThrow('Reason must be at most 2000 characters.');
      try { attempt(); } catch (error) { expect((error as ReviewInputError).field).toBe('reason'); }
    },
  );

  it('KAN-60-AC101 checks the limit after trimming surrounding whitespace', () => {
    const reason = `   ${'r'.repeat(REVIEW_REASON_MAX_LENGTH)}   `;
    expect(parseReviewInput({ decision: 'REJECTED', reason }).reason).toHaveLength(REVIEW_REASON_MAX_LENGTH);
  });

  it('KAN-60-AC4 keeps an approval reason optional but still saves one when given', () => {
    expect(parseReviewInput({ decision: 'APPROVED', reason: '  Venue confirmed.  ' }))
      .toEqual({ decision: 'APPROVED', reason: 'Venue confirmed.' });
  });

  it('names the decision field for an unsupported decision', () => {
    try {
      parseReviewInput({ decision: 'MAYBE' });
      expect.unreachable();
    } catch (error) {
      expect((error as ReviewInputError).field).toBe('decision');
    }
  });

  it('does not name a field for whole-body errors', () => {
    try {
      parseReviewInput([]);
      expect.unreachable();
    } catch (error) {
      expect((error as ReviewInputError).field).toBeUndefined();
    }
  });
});
