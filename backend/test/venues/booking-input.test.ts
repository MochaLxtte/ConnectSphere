import { describe, expect, it } from 'vitest';
import {
  parseBookingDecision, parseBookingFilter, parseBookingSubmission,
} from '../../src/modules/venues/booking-input.js';

const venueId = '12345678-1234-1234-1234-123456789abc';
const startsAt = '2026-12-01T02:00:00.000Z';
const endsAt = '2026-12-01T06:00:00.000Z';

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

describe('KAN-53 venue booking submission input', () => {
  it('accepts a full submission and normalises dates and optional text', () => {
    expect(parseBookingSubmission({
      venueId, startsAt, endsAt, layout: '  Theatre  ', notes: '  Projector required  ',
    })).toEqual({ venueId, startsAt, endsAt, layout: 'Theatre', notes: 'Projector required' });
  });
  it('accepts the minimal submission with layout and notes omitted', () => {
    expect(parseBookingSubmission({ venueId, startsAt, endsAt }))
      .toEqual({ venueId, startsAt, endsAt, layout: null, notes: null });
    expect(parseBookingSubmission({ venueId, startsAt, endsAt, layout: null, notes: '   ' }))
      .toEqual({ venueId, startsAt, endsAt, layout: null, notes: null });
  });
  it('normalises a date-time to an ISO string', () => {
    expect(parseBookingSubmission({ venueId, startsAt: '2026-12-01T10:00:00+08:00', endsAt }).startsAt)
      .toBe('2026-12-01T02:00:00.000Z');
  });
  it.each([
    null, [], '', {},
    { startsAt, endsAt },
    { venueId: 'not-a-uuid', startsAt, endsAt },
    { venueId: 123, startsAt, endsAt },
    { venueId, endsAt },
    { venueId, startsAt },
    { venueId, startsAt: 'not-a-date', endsAt },
    { venueId, startsAt, endsAt: 'not-a-date' },
    { venueId, startsAt: endsAt, endsAt: startsAt },
    { venueId, startsAt, endsAt: startsAt },
    { venueId, startsAt, endsAt, layout: 1 },
    { venueId, startsAt, endsAt, notes: 'a'.repeat(2001) },
    { venueId, startsAt, endsAt, decidedBy: 'spoofed' },
  ])('rejects malformed input %j', (input) => {
    expect(() => parseBookingSubmission(input)).toThrow();
  });
});
