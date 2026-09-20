import { describe, expect, it } from 'vitest';
import {
  assessVenueSuitability, type SuitabilityEvent, type SuitabilityVenue,
} from '../../src/modules/venues/suitability.js';

const venue: SuitabilityVenue = {
  capacity: 100, wheelchairAccessible: false, accessibilityFeatures: [],
  opensAt: '08:00', closesAt: '22:00', isActive: true,
};
// 10:00 to 12:00 in Singapore.
const event: SuitabilityEvent = {
  startsAt: '2026-10-01T02:00:00.000Z', endsAt: '2026-10-01T04:00:00.000Z',
  expectedAttendance: 80, accessibilityNeeds: null,
};

function check(result: ReturnType<typeof assessVenueSuitability>, code: string) {
  const found = result.checks.find((item) => item.code === code);
  if (!found) throw new Error(`Missing ${code} check.`);
  return found;
}

describe('CF-11 assessVenueSuitability', () => {
  it('passes every check for a fitting venue and reports all five codes', () => {
    const result = assessVenueSuitability(venue, event);
    expect(result.suitable).toBe(true);
    expect(result.checks.map((item) => item.code))
      .toEqual(['ACTIVE', 'CAPACITY', 'ACCESSIBILITY', 'OPERATING_HOURS', 'AVAILABILITY']);
    expect(result.checks.every((item) => item.passed && item.message.length > 0)).toBe(true);
  });

  it('accepts capacity equal to attendance and fails below it', () => {
    expect(check(assessVenueSuitability(venue, { ...event, expectedAttendance: 100 }), 'CAPACITY').passed).toBe(true);
    const result = assessVenueSuitability(venue, { ...event, expectedAttendance: 101 });
    expect(check(result, 'CAPACITY').passed).toBe(false);
    expect(result.suitable).toBe(false);
  });

  it('only requires accessibility provisions when the event states needs', () => {
    const needs = { ...event, accessibilityNeeds: 'Step-free access' };
    expect(check(assessVenueSuitability(venue, { ...event, accessibilityNeeds: '   ' }), 'ACCESSIBILITY').passed).toBe(true);
    expect(check(assessVenueSuitability(venue, needs), 'ACCESSIBILITY').passed).toBe(false);
    expect(check(assessVenueSuitability({ ...venue, wheelchairAccessible: true }, needs), 'ACCESSIBILITY').passed).toBe(true);
    expect(check(assessVenueSuitability({ ...venue, accessibilityFeatures: ['Hearing loop'] }, needs), 'ACCESSIBILITY').passed).toBe(true);
  });

  it('evaluates operating hours in Asia/Singapore rather than UTC', () => {
    // 00:30 to 02:00 UTC is 08:30 to 10:00 in Singapore: inside 08:00-22:00 although outside it in UTC.
    const morning = { ...event, startsAt: '2026-10-01T00:30:00Z', endsAt: '2026-10-01T02:00:00Z' };
    expect(check(assessVenueSuitability(venue, morning), 'OPERATING_HOURS').passed).toBe(true);
    // 13:00 to 15:00 UTC is 21:00 to 23:00 in Singapore: past closing.
    const late = { ...event, startsAt: '2026-10-01T13:00:00Z', endsAt: '2026-10-01T15:00:00Z' };
    expect(check(assessVenueSuitability(venue, late), 'OPERATING_HOURS').passed).toBe(false);
  });

  it('allows an event on the exact opening and closing boundaries, and rejects overnight events', () => {
    const fullDay = { ...event, startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-01T14:00:00Z' };
    expect(check(assessVenueSuitability(venue, fullDay), 'OPERATING_HOURS').passed).toBe(true);
    const overnight = { ...event, startsAt: '2026-10-01T12:00:00Z', endsAt: '2026-10-02T02:00:00Z' };
    expect(check(assessVenueSuitability(venue, overnight), 'OPERATING_HOURS').passed).toBe(false);
  });

  it('treats missing hours as unrestricted, including database HH:MM:SS values', () => {
    const overnight = { ...event, startsAt: '2026-10-01T12:00:00Z', endsAt: '2026-10-02T02:00:00Z' };
    expect(check(assessVenueSuitability({ ...venue, opensAt: null, closesAt: null }, overnight), 'OPERATING_HOURS').passed).toBe(true);
    expect(check(assessVenueSuitability({ ...venue, opensAt: '08:00:00', closesAt: null }, event), 'OPERATING_HOURS').passed).toBe(true);
    expect(check(assessVenueSuitability({ ...venue, opensAt: '11:00:00', closesAt: null }, event), 'OPERATING_HOURS').passed).toBe(false);
  });

  it('fails availability for an overlap but allows back-to-back intervals', () => {
    const adjacent = [
      { startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-01T02:00:00Z' },
      { startsAt: '2026-10-01T04:00:00Z', endsAt: '2026-10-01T06:00:00Z' },
    ];
    expect(check(assessVenueSuitability({ ...venue, busy: adjacent }, event), 'AVAILABILITY').passed).toBe(true);
    const overlapping = [{ startsAt: '2026-10-01T03:59:00Z', endsAt: '2026-10-01T06:00:00Z' }];
    const result = assessVenueSuitability({ ...venue, busy: overlapping }, event);
    expect(check(result, 'AVAILABILITY').passed).toBe(false);
    expect(result.suitable).toBe(false);
  });

  it('flags an inactive venue and an event without a schedule', () => {
    expect(check(assessVenueSuitability({ ...venue, isActive: false }, event), 'ACTIVE').passed).toBe(false);
    const unscheduled = assessVenueSuitability(venue, { ...event, startsAt: null, endsAt: null });
    expect(check(unscheduled, 'OPERATING_HOURS').passed).toBe(false);
    expect(check(unscheduled, 'AVAILABILITY').passed).toBe(false);
    expect(check(assessVenueSuitability(venue, { ...event, expectedAttendance: null }), 'CAPACITY').passed).toBe(true);
  });
});
