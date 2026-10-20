import { describe, expect, it } from 'vitest';
import {
  assessVenueSuitability, intervalWithinVenueHours,
  type SuitabilityEvent, type SuitabilityVenue,
} from '../../src/modules/venues/suitability-rules.js';
import type { VenueSuitabilityInput } from '../../src/modules/venues/suitability-input.js';

const event: SuitabilityEvent = {
  id: 'event', name: 'Orientation', startsAt: '2026-12-01T02:00:00Z', endsAt: '2026-12-01T04:00:00Z',
  expectedAttendance: 50, venueRequirements: 'Projector and theatre seating', accessibilityNeeds: 'Wheelchair access',
};
const venue: SuitabilityVenue & { isActive: boolean } = {
  id: 'venue', name: 'Hall', capacity: 50, facilities: ['Projector'], accessibilityFeatures: ['Hearing loop'],
  layouts: ['Theatre'], wheelchairAccessible: true, opensAt: '08:00:00', closesAt: '22:00:00', setupMinutes: 0, turnaroundMinutes: 0, isActive: true,
};
const input: VenueSuitabilityInput = {
  venueId: venue.id, requirementsVersion: 'a'.repeat(64), facilities: ['projector'], accessibility: ['HEARING LOOP'],
  layout: ' theatre ', wheelchairRequired: true, requirementsConfirmed: true, unresolvedRequirements: null,
};
const now = '2026-10-04T00:00:00.000Z';
const clear = { booked: false, blocked: false };

describe('KAN-52 suitability assessment', () => {
  it('passes exact capacity and every required case-insensitive value without changing inputs', () => {
    const before = JSON.stringify({ event, venue, input });
    expect(assessVenueSuitability(event, venue, input, clear, now)).toMatchObject({
      eventId: 'event', eventName: 'Orientation', venueId: 'venue', venueName: 'Hall', checkedAt: now, outcome: 'SUITABLE',
      checks: Array.from({ length: 7 }, () => expect.objectContaining({ status: 'PASS' })),
    });
    expect(JSON.stringify({ event, venue, input })).toBe(before);
  });
  it.each([
    { key: 'venueActive', change: { isActive: false } },
    { key: 'capacity', change: { capacity: 49 } },
    { key: 'facilities', change: { facilities: ['Projector screen'] } },
    { key: 'accessibility', change: { accessibilityFeatures: ['Ramp'] } },
    { key: 'accessibility', change: { wheelchairAccessible: false } },
    { key: 'layout', change: { layouts: ['Classroom'] } },
    { key: 'availability', change: { closesAt: '11:00' } },
  ])('reports a specific $key failure even when everything else passes', ({ key, change }) => {
    const result = assessVenueSuitability(event, { ...venue, ...change }, input, clear, now);
    expect(result.outcome).toBe('UNSUITABLE');
    expect(result.checks.filter(check => check.status === 'FAIL').map(check => check.key)).toEqual([key]);
  });
  it('requires every facility and accessibility value, not merely one matching value', () => {
    const result = assessVenueSuitability(event, venue, { ...input,
      facilities: ['Projector', 'Stage'], accessibility: ['Hearing loop', 'Lift'],
    }, clear, now);
    expect(result.checks.find(check => check.key === 'facilities')).toMatchObject({ status: 'FAIL', message: expect.stringContaining('Stage') });
    expect(result.checks.find(check => check.key === 'accessibility')).toMatchObject({ status: 'FAIL', message: expect.stringContaining('Lift') });
  });
  it.each([{ booked: true, blocked: false }, { booked: false, blocked: true }])('fails for a current conflict %j', conflicts => {
    const result = assessVenueSuitability(event, venue, input, conflicts, now);
    expect(result.outcome).toBe('UNSUITABLE');
    expect(result.checks.find(check => check.key === 'availability')?.status).toBe('FAIL');
  });
  it.each([{ expectedAttendance: null }, { startsAt: null },
    { endsAt: null }, { startsAt: 'invalid' }, { endsAt: event.startsAt }])('does not call incomplete event data suitable %j', change => {
    expect(assessVenueSuitability({ ...event, ...change }, venue, input, clear, now).outcome).toBe('NEEDS_REVIEW');
  });
});

describe('KAN-52-AC101 expected attendance 0 is a known value', () => {
  const capacity = (result: ReturnType<typeof assessVenueSuitability>) =>
    result.checks.find(check => check.key === 'capacity')!;

  it('assesses 0 against venue capacity and passes it, so an otherwise suitable venue is SUITABLE', () => {
    const result = assessVenueSuitability({ ...event, expectedAttendance: 0 }, venue, input, clear, now);
    expect(capacity(result)).toEqual({
      key: 'capacity', status: 'PASS', message: 'Expected attendance (0) fits the venue capacity (50).',
    });
    expect(result.outcome).toBe('SUITABLE');
  });

  it('keeps missing attendance distinguishable from 0', () => {
    const missing = capacity(assessVenueSuitability({ ...event, expectedAttendance: null }, venue, input, clear, now));
    const zero = capacity(assessVenueSuitability({ ...event, expectedAttendance: 0 }, venue, input, clear, now));
    expect(missing).toMatchObject({ status: 'UNKNOWN', message: expect.stringContaining('no expected attendance') });
    expect(zero.status).toBe('PASS');
    expect(zero.message).not.toBe(missing.message);
  });

  it.each([-1, 2.5, Number.NaN])('still treats the unusable value %s as unknown, not as a count', expectedAttendance => {
    const result = assessVenueSuitability({ ...event, expectedAttendance }, venue, input, clear, now);
    expect(capacity(result)).toMatchObject({ status: 'UNKNOWN', message: expect.stringContaining('valid expected attendance') });
    expect(result.outcome).toBe('NEEDS_REVIEW');
  });

  it.each([
    ['a required facility is missing', { facilities: [] }, {}, {}],
    ['the venue is booked', {}, { booked: true, blocked: false }, {}],
    ['the venue is blocked', {}, { booked: false, blocked: true }, {}],
    ['the venue is inactive', {}, {}, { isActive: false }],
  ])('other requirements still decide suitability when attendance is 0: %s', (_label, venueChange, conflicts, venueFlag) => {
    const result = assessVenueSuitability(
      { ...event, expectedAttendance: 0 }, { ...venue, ...venueChange, ...venueFlag },
      input, { ...clear, ...conflicts }, now,
    );
    expect(capacity(result).status).toBe('PASS');
    expect(result.outcome).toBe('UNSUITABLE');
  });

  it('does not call a 0-attendance event suitable while requirements are unconfirmed', () => {
    const result = assessVenueSuitability(
      { ...event, expectedAttendance: 0 }, venue, { ...input, requirementsConfirmed: false }, clear, now,
    );
    expect(capacity(result).status).toBe('PASS');
    expect(result.outcome).toBe('NEEDS_REVIEW');
  });

  it('still fails an attendance above capacity, and passes exactly at capacity', () => {
    expect(capacity(assessVenueSuitability({ ...event, expectedAttendance: 51 }, venue, input, clear, now)).status).toBe('FAIL');
    expect(capacity(assessVenueSuitability({ ...event, expectedAttendance: 50 }, venue, input, clear, now)).status).toBe('PASS');
  });
});

describe('KAN-52 suitability assessment (requirements and conflicts)', () => {
  it.each([{ requirementsConfirmed: false }, { unresolvedRequirements: 'Check noise restrictions' }])('requires review for unconfirmed/unresolved requirements %j', change => {
    const result = assessVenueSuitability(event, venue, { ...input, ...change }, clear, now);
    expect(result.outcome).toBe('NEEDS_REVIEW');
    expect(result.checks.find(check => check.key === 'requirements')?.status).toBe('UNKNOWN');
  });
  it('keeps a known failure visible when other requirements remain unknown', () => {
    expect(assessVenueSuitability({ ...event, startsAt: null }, { ...venue, capacity: 1 },
      { ...input, requirementsConfirmed: false }, clear, now).outcome).toBe('UNSUITABLE');
  });
  it('does not fail requirements the coordinator has not yet confirmed', () => {
    const result = assessVenueSuitability(event, { ...venue, facilities: [], accessibilityFeatures: [], layouts: [], wheelchairAccessible: false },
      { ...input, requirementsConfirmed: false }, clear, now);
    expect(result.outcome).toBe('NEEDS_REVIEW');
    expect(result.checks.filter(check => ['facilities', 'accessibility', 'layout'].includes(check.key))
      .map(check => check.status)).toEqual(['UNKNOWN', 'UNKNOWN', 'UNKNOWN']);
  });
  it('does not require facilities, accessibility or layouts explicitly marked inapplicable', () => {
    expect(assessVenueSuitability(event, { ...venue, facilities: [], accessibilityFeatures: [], layouts: [], wheelchairAccessible: false },
      { ...input, facilities: [], accessibility: [], layout: null, wheelchairRequired: false }, clear, now).outcome).toBe('SUITABLE');
  });
});

describe('KAN-52 whole-period Singapore opening hours', () => {
  it.each([
    ['2026-12-01T08:00:00+08:00', '2026-12-01T22:00:00+08:00', '08:00', '22:00', true],
    ['2026-12-01T07:59:59+08:00', '2026-12-01T22:00:00+08:00', '08:00', '22:00', false],
    ['2026-12-01T08:00:00+08:00', '2026-12-01T22:00:01+08:00', '08:00', '22:00', false],
    ['2026-12-01T10:00:00+08:00', '2026-12-02T12:00:00+08:00', '08:00', '22:00', false],
    ['2026-12-01T23:00:00+08:00', '2026-12-02T01:00:00+08:00', null, null, true],
    ['2026-12-01T23:00:00+08:00', '2026-12-05T01:00:00+08:00', '00:00', '24:00', true],
    ['2026-12-01T23:00:00+08:00', '2026-12-02T00:00:00+08:00', '08:00', null, true],
    ['2026-12-01T23:00:00+08:00', '2026-12-02T00:00:00.001+08:00', '08:00', null, false],
    ['2026-12-01T00:00:00+08:00', '2026-12-01T10:00:00+08:00', null, '10:00', true],
    ['2026-12-01T08:00:00+08:00', '2026-12-01T22:00:00+08:00', '08:00:00.000001', '22:00', false],
    ['2026-12-01T08:00:00+08:00', '2026-12-01T08:00:00+08:00', null, null, null],
  ] as const)('checks %s to %s against %s/%s', (start, end, opens, closes, expected) => {
    expect(intervalWithinVenueHours(start, end, opens, closes)).toBe(expected);
  });
});
