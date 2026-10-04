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
    ['2028-02-29T10:00:00+08:00', '2028-02-29T02:00:00.000Z'],
    ['2000-02-29T10:00Z', '2000-02-29T10:00:00.000Z'],
    ['0004-02-29T10:00:00Z', '0004-02-29T10:00:00.000Z'],
    ['0099-12-31T10:00:00Z', '0099-12-31T10:00:00.000Z'],
    ['2027-01-01T00:15:00.125+08:00', '2026-12-31T16:15:00.125Z'],
    ['2026-12-31T23:15:00-05:30', '2027-01-01T04:45:00.000Z'],
  ])('preserves the instant for valid calendar date %s', (value, expected) => {
    const followingHour = new Date(Date.parse(expected) + 3_600_000).toISOString();
    const parsed = parseBookingSubmission({ venueId, startsAt: value, endsAt: followingHour });
    expect(parsed.startsAt).toBe(expected);
    expect(parsed.endsAt).toBe(followingHour);
    expect(parseBookingSubmission({ venueId, startsAt: parsed.startsAt, endsAt: parsed.endsAt })).toEqual(parsed);
  });
  it.each([
    '12', 'January 1, 2027', '2027-01-01', '2027-01-01T10:00:00',
    '2027-02-30T10:00:00+08:00', '2027-02-29T10:00:00Z', '1900-02-29T10:00:00Z',
    '2027-04-31T10:00:00Z', '2027-13-01T10:00:00Z', '2027-01-00T10:00:00Z',
    '2027-01-01T24:30:00Z', '2027-01-01T10:60:00Z', '2027-01-01T10:00:00+24:00',
    '2027-01-01T10:00:00+08:60', '2027-01-01T10:00:00Z extra', '0000-01-01T10:00:00Z',
    '0001-01-01T00:00:00+08:00',
  ])('rejects invalid or ambiguous booking timestamp %s in either field', (value) => {
    for (const field of ['startsAt', 'endsAt']) {
      try {
        parseBookingSubmission({ venueId, startsAt, endsAt, [field]: value });
        expect.fail(`Expected ${field} to reject ${value}`);
      } catch (error) {
        expect(error).toMatchObject({ kind: 'INVALID_INPUT', code: 'INVALID_INPUT' });
      }
    }
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
