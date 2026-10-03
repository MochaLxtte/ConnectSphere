import { describe, expect, it } from 'vitest';
import { parseBookingDecision, parseBookingFilter } from '../../src/modules/venues/booking-input.js';

describe('KAN-8 venue booking decision input', () => {
  it.each(['APPROVED', 'REJECTED'] as const)('accepts %s with optional trimmed information', (decision) => {
    expect(parseBookingDecision({ decision, reason: '  Reviewed venue requirements.  ' }))
      .toEqual({ decision, reason: 'Reviewed venue requirements.' });
    for (const reason of [undefined, null, '   ']) {
      expect(parseBookingDecision({ decision, reason })).toEqual({ decision, reason: null });
    }
  });
  it('accepts the maximum reason length', () => {
    expect(parseBookingDecision({ decision: 'REJECTED', reason: 'a'.repeat(2000) }).reason).toHaveLength(2000);
  });
  it.each([null, [], '', { decision: 'PENDING' }, { decision: 'approved' }, {},
    { decision: 'APPROVED', decidedBy: 'spoofed' }, { decision: 'APPROVED', reason: 1 },
    { decision: 'REJECTED', reason: 'a'.repeat(2001) }])('rejects malformed input %j', (input) => {
    expect(() => parseBookingDecision(input)).toThrow();
  });
  it('supports only an optional scalar event UUID filter', () => {
    const id = '12345678-1234-1234-1234-123456789abc';
    expect(parseBookingFilter({})).toBeUndefined();
    expect(parseBookingFilter({ eventRequestId: id })).toBe(id);
    for (const query of [{ status: 'APPROVED' }, { eventRequestId: 'invalid' },
      { eventRequestId: [id, id] }, { eventRequestId: { id } }]) {
      expect(() => parseBookingFilter(query)).toThrow();
    }
  });
});
