import { describe, expect, it } from 'vitest';
import type { BlockedPeriod, BookedPeriod, VenueAvailability } from './api/availability';
import {
  addDays, calendarDay, calendarWeek, DAY_MS, formatClock, formatDay, formatInstant, formatOpeningHours,
  formatTimeRange, formatWeek, hourTicks, HOUR_MS, parseDateKey, singaporeDateKey, startOfWeek, timelineRange,
  weekWindow,
} from './availability';

const hour = (hours: number) => hours * HOUR_MS;
const sgt = (value: string) => new Date(`${value}:00+08:00`).toISOString();

function venue(overrides: Partial<VenueAvailability> = {}): VenueAvailability {
  return {
    id: 'venue-1', name: 'Harbour Hall', location: null, capacity: 300, opensAt: '08:00', closesAt: '22:00',
    unavailable: [], ...overrides,
  };
}

function booking(id: string, from: string, to: string, event: BookedPeriod['event'] = null): BookedPeriod {
  return { id, kind: 'BOOKING', startsAt: sgt(from), endsAt: sgt(to), event };
}

function block(id: string, from: string, to: string, reason: string | null = 'Maintenance'): BlockedPeriod {
  return { id, kind: 'BLOCKED', startsAt: sgt(from), endsAt: sgt(to), reason };
}

describe('KAN-51 Singapore calendar weeks', () => {
  it('places instants on Singapore days across UTC midnight', () => {
    expect(singaporeDateKey('2026-10-04T15:59:59.999Z')).toBe('2026-10-04');
    expect(singaporeDateKey('2026-10-04T16:00:00.000Z')).toBe('2026-10-05');
  });

  it('accepts only real YYYY-MM-DD dates', () => {
    expect(parseDateKey('2026-10-05')).toBe('2026-10-05');
    expect(parseDateKey('2028-02-29')).toBe('2028-02-29');
    for (const value of ['2026-02-29', '2026-13-01', '05/10/2026', '2026-10-5', '', null, ['2026-10-05']]) {
      expect(parseDateKey(value), String(value)).toBeNull();
    }
  });

  it('starts each week on Monday and asks for Monday-to-Monday in UTC', () => {
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05');
    expect(startOfWeek('2026-10-07')).toBe('2026-10-05');
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05');
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekWindow('2026-10-05')).toEqual({ from: '2026-10-04T16:00:00.000Z', to: '2026-10-11T16:00:00.000Z' });
  });

  it('labels days, weeks and instants in Singapore time', () => {
    expect(formatDay('2026-10-05')).toBe('Mon, 5 Oct');
    expect(formatWeek('2026-10-05')).toBe('5–11 Oct 2026');
    // ICU versions differ in the width of the spaces around a range dash.
    expect(formatWeek('2026-12-28').replace(/\s/g, ' ')).toBe('28 Dec 2026 – 3 Jan 2027');
    expect(formatInstant('2026-10-04T10:00:00.000Z')).toBe('Sun, 4 Oct, 18:00');
  });
});

describe('KAN-51 venue day availability', () => {
  it('treats free opening hours as available and the rest of the day as closed', () => {
    const day = calendarDay(venue(), '2026-10-05');
    expect(day.segments).toEqual([
      { status: 'CLOSED', start: 0, end: hour(8) },
      { status: 'AVAILABLE', start: hour(8), end: hour(22) },
      { status: 'CLOSED', start: hour(22), end: DAY_MS },
    ]);
    expect(day.agenda).toEqual([{ kind: 'AVAILABLE', start: hour(8), end: hour(22) }]);
    expect(day.status).toBe('AVAILABLE');
  });

  it('treats a venue without opening hours as available all day', () => {
    const day = calendarDay(venue({ opensAt: null, closesAt: null }), '2026-10-05');
    expect(day.segments).toEqual([{ status: 'AVAILABLE', start: 0, end: DAY_MS }]);
    expect(formatTimeRange(day.agenda[0]!.start, day.agenda[0]!.end)).toBe('all day');
  });

  it('separates confirmed bookings and blocked periods from the available time around them', () => {
    const fair = booking('b1', '2026-10-05T10:00', '2026-10-05T12:00', { id: 'event-1', name: 'Career fair' });
    const maintenance = block('k1', '2026-10-05T15:00', '2026-10-05T16:30');
    const day = calendarDay(venue({ unavailable: [fair, maintenance] }), '2026-10-05');

    expect(day.segments).toEqual([
      { status: 'CLOSED', start: 0, end: hour(8) },
      { status: 'AVAILABLE', start: hour(8), end: hour(10) },
      { status: 'BOOKED', start: hour(10), end: hour(12) },
      { status: 'AVAILABLE', start: hour(12), end: hour(15) },
      { status: 'BLOCKED', start: hour(15), end: hour(16.5) },
      { status: 'AVAILABLE', start: hour(16.5), end: hour(22) },
      { status: 'CLOSED', start: hour(22), end: DAY_MS },
    ]);
    expect(day.agenda).toEqual([
      { kind: 'AVAILABLE', start: hour(8), end: hour(10) },
      { kind: 'RECORDED', start: hour(10), end: hour(12), period: fair, clipped: false },
      { kind: 'AVAILABLE', start: hour(12), end: hour(15) },
      { kind: 'RECORDED', start: hour(15), end: hour(16.5), period: maintenance, clipped: false },
      { kind: 'AVAILABLE', start: hour(16.5), end: hour(22) },
    ]);
    expect(day.status).toBe('PARTLY_AVAILABLE');
  });

  it('uses half-open boundaries, so touching periods neither overlap nor spill onto another day', () => {
    const endsAtMidnight = booking('b0', '2026-10-04T20:00', '2026-10-05T00:00');
    const morning = booking('b1', '2026-10-05T10:00', '2026-10-05T12:00');
    const backToBack = booking('b2', '2026-10-05T12:00', '2026-10-05T14:00');
    const startsAtMidnight = booking('b3', '2026-10-06T00:00', '2026-10-06T02:00');
    const day = calendarDay(venue({ unavailable: [endsAtMidnight, morning, backToBack, startsAtMidnight] }), '2026-10-05');

    expect(day.agenda.flatMap((item) => (item.kind === 'RECORDED' ? [item.period.id] : []))).toEqual(['b1', 'b2']);
    expect(day.segments.filter((segment) => segment.status === 'BOOKED'))
      .toEqual([{ status: 'BOOKED', start: hour(10), end: hour(14) }]);
  });

  it('clips a period spanning several days to each day it covers', () => {
    const renovation = block('k2', '2026-10-05T18:00', '2026-10-07T09:00', 'Renovation');
    const week = calendarWeek(venue({ unavailable: [renovation] }), '2026-10-05');

    expect(week.map((day) => day.key)).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ]);
    expect(week[0]!.agenda.at(-1)).toEqual({ kind: 'RECORDED', start: hour(18), end: DAY_MS, period: renovation, clipped: true });
    expect(week[1]!.agenda).toEqual([{ kind: 'RECORDED', start: 0, end: DAY_MS, period: renovation, clipped: true }]);
    expect(week[2]!.agenda[0]).toEqual({ kind: 'RECORDED', start: 0, end: hour(9), period: renovation, clipped: true });
    expect(week.slice(0, 4).map((day) => day.status))
      .toEqual(['PARTLY_AVAILABLE', 'UNAVAILABLE', 'PARTLY_AVAILABLE', 'AVAILABLE']);
  });

  it('shows a block above an overlapping booking on the bar but lists both periods', () => {
    const fair = booking('b1', '2026-10-05T10:00', '2026-10-05T12:00');
    const inspection = block('k3', '2026-10-05T11:00', '2026-10-05T13:00', null);
    const day = calendarDay(venue({ unavailable: [fair, inspection] }), '2026-10-05');

    expect(day.segments.slice(1, 5)).toEqual([
      { status: 'AVAILABLE', start: hour(8), end: hour(10) },
      { status: 'BOOKED', start: hour(10), end: hour(11) },
      { status: 'BLOCKED', start: hour(11), end: hour(13) },
      { status: 'AVAILABLE', start: hour(13), end: hour(22) },
    ]);
    expect(day.agenda.flatMap((item) => (item.kind === 'RECORDED' ? [item.period.id] : []))).toEqual(['b1', 'k3']);
  });

  it('keeps a period outside opening hours visible without reducing the open time', () => {
    const early = block('k4', '2026-10-05T06:00', '2026-10-05T07:00');
    const day = calendarDay(venue({ unavailable: [early] }), '2026-10-05');

    expect(day.segments.slice(0, 3)).toEqual([
      { status: 'CLOSED', start: 0, end: hour(6) },
      { status: 'BLOCKED', start: hour(6), end: hour(7) },
      { status: 'CLOSED', start: hour(7), end: hour(8) },
    ]);
    expect(day.status).toBe('AVAILABLE');
  });
});

describe('KAN-51 timeline scale and labels', () => {
  it('fits the scale to opening hours, widened to whole hours around any recorded period', () => {
    const late = venue({ unavailable: [booking('b5', '2026-10-08T21:30', '2026-10-08T22:45')] });
    const early = venue({ unavailable: [block('k4', '2026-10-06T06:15', '2026-10-06T07:00')] });

    expect(timelineRange(venue(), calendarWeek(venue(), '2026-10-05'))).toEqual({ start: hour(8), end: hour(22) });
    expect(timelineRange(late, calendarWeek(late, '2026-10-05'))).toEqual({ start: hour(8), end: hour(23) });
    expect(timelineRange(early, calendarWeek(early, '2026-10-05'))).toEqual({ start: hour(6), end: hour(22) });
    expect(timelineRange(venue({ opensAt: null, closesAt: null }), [])).toEqual({ start: 0, end: DAY_MS });
  });

  it('spaces hour marks by the length of the scale', () => {
    expect(hourTicks({ start: hour(9), end: hour(17) })).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17].map(hour));
    expect(hourTicks({ start: hour(8), end: hour(22) })).toEqual([8, 10, 12, 14, 16, 18, 20, 22].map(hour));
    expect(hourTicks({ start: 0, end: DAY_MS })).toEqual([0, 4, 8, 12, 16, 20, 24].map(hour));
  });

  it('formats clock times, ranges and opening hours', () => {
    expect(formatClock(hour(8))).toBe('08:00');
    expect(formatClock(hour(16.5))).toBe('16:30');
    expect(formatClock(DAY_MS)).toBe('24:00');
    expect(formatTimeRange(hour(22), DAY_MS)).toBe('22:00 – 24:00');
    expect(formatOpeningHours(venue())).toBe('Open 08:00 – 22:00 daily');
    expect(formatOpeningHours(venue({ opensAt: '10:00', closesAt: null }))).toBe('Open 10:00 – 24:00 daily');
    expect(formatOpeningHours(venue({ opensAt: null, closesAt: null }))).toBe('No set opening hours');
  });
});
