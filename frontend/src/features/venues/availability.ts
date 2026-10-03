import type { UnavailablePeriod, VenueAvailability } from './api/availability';

/** Singapore has no daylight saving; its offset from UTC is a fixed 8 hours. */
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
const TIME_ZONE = 'Asia/Singapore';
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const dayLabel = new Intl.DateTimeFormat('en-SG', {
  weekday: 'short', day: 'numeric', month: 'short', timeZone: TIME_ZONE,
});
const weekLabel = new Intl.DateTimeFormat('en-SG', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE,
});
const instantLabel = new Intl.DateTimeFormat('en-SG', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  hourCycle: 'h23', timeZone: TIME_ZONE,
});

/** What fills one stretch of a day's bar. */
export type SegmentStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'CLOSED';

/** Times within a day are milliseconds after 00:00 Singapore time, from 0 to DAY_MS. */
export interface DaySegment {
  status: SegmentStatus;
  start: number;
  end: number;
}

/** A free stretch of opening hours, or one recorded period clipped to the day. */
export type AgendaItem =
  | { kind: 'AVAILABLE'; start: number; end: number }
  | { kind: 'RECORDED'; start: number; end: number; period: UnavailablePeriod; clipped: boolean };

export type DayStatus = 'AVAILABLE' | 'PARTLY_AVAILABLE' | 'UNAVAILABLE';

export interface CalendarDay {
  /** The Singapore date as `YYYY-MM-DD`. */
  key: string;
  segments: DaySegment[];
  agenda: AgendaItem[];
  status: DayStatus;
}

/** A Singapore calendar day as `YYYY-MM-DD`, or null when the value is not a real date. */
export function parseDateKey(value: unknown): string | null {
  const match = typeof value === 'string' ? DATE_KEY.exec(value) : null;
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? value as string : null;
}

/** The Singapore calendar day containing an instant. */
export function singaporeDateKey(instant: number | string | Date): string {
  return new Date(new Date(instant).getTime() + SGT_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant at which a Singapore day starts. */
function dayStart(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day) - SGT_OFFSET_MS;
}

export function addDays(dateKey: string, days: number): string {
  return singaporeDateKey(dayStart(dateKey) + days * DAY_MS);
}

/** Monday of the Singapore week containing the day. */
export function startOfWeek(dateKey: string): string {
  const weekday = new Date(dayStart(dateKey) + SGT_OFFSET_MS).getUTCDay();
  return addDays(dateKey, -((weekday + 6) % 7));
}

/** The API window for the week starting on `weekStart`: Monday 00:00 to the next Monday 00:00. */
export function weekWindow(weekStart: string): { from: string; to: string } {
  return {
    from: new Date(dayStart(weekStart)).toISOString(),
    to: new Date(dayStart(addDays(weekStart, 7))).toISOString(),
  };
}

function clockTime(value: string | null, fallback: number): number {
  const match = value ? /^(\d{2}):(\d{2})$/.exec(value) : null;
  return match ? (Number(match[1]) * 60 + Number(match[2])) * MINUTE_MS : fallback;
}

/** Daily opening hours; a missing bound leaves that end of the day unrestricted. */
export function openingHours(venue: Pick<VenueAvailability, 'opensAt' | 'closesAt'>) {
  return { opens: clockTime(venue.opensAt, 0), closes: clockTime(venue.closesAt, DAY_MS) };
}

/**
 * One venue's day. Periods are half-open, so one ending exactly at midnight belongs to the earlier
 * day only. Where a booking and a blocked period overlap, the bar shows the block and the agenda
 * lists both, so neither recorded period is hidden.
 */
export function calendarDay(venue: VenueAvailability, key: string): CalendarDay {
  const start = dayStart(key);
  const end = start + DAY_MS;
  const { opens, closes } = openingHours(venue);
  const recorded = venue.unavailable.flatMap((period) => {
    const from = Date.parse(period.startsAt);
    const to = Date.parse(period.endsAt);
    if (!(from < end && to > start)) return [];
    return [{
      kind: 'RECORDED' as const, period, clipped: from < start || to > end,
      start: Math.max(from, start) - start, end: Math.min(to, end) - start,
    }];
  });

  const edges = [...new Set([0, DAY_MS, opens, closes, ...recorded.flatMap((item) => [item.start, item.end])])]
    .sort((left, right) => left - right);
  const segments: DaySegment[] = [];
  for (const [index, from] of edges.slice(0, -1).entries()) {
    const to = edges[index + 1]!;
    const covering = recorded.filter((item) => item.start <= from && item.end >= to);
    const status: SegmentStatus = covering.some((item) => item.period.kind === 'BLOCKED') ? 'BLOCKED'
      : covering.length > 0 ? 'BOOKED'
        : from >= opens && to <= closes ? 'AVAILABLE' : 'CLOSED';
    const previous = segments.at(-1);
    if (previous?.status === status) previous.end = to;
    else segments.push({ status, start: from, end: to });
  }

  const available = segments.filter((segment) => segment.status === 'AVAILABLE');
  const availableMs = available.reduce((total, segment) => total + segment.end - segment.start, 0);
  const agenda: AgendaItem[] = [
    ...available.map(({ start: from, end: to }) => ({ kind: 'AVAILABLE' as const, start: from, end: to })),
    ...recorded,
  ].sort((left, right) => left.start - right.start || left.end - right.end);
  return {
    key, segments, agenda,
    status: availableMs === 0 ? 'UNAVAILABLE' : availableMs === closes - opens ? 'AVAILABLE' : 'PARTLY_AVAILABLE',
  };
}

export function calendarWeek(venue: VenueAvailability, weekStart: string): CalendarDay[] {
  return Array.from({ length: 7 }, (_, index) => calendarDay(venue, addDays(weekStart, index)));
}

/** Whole hours spanning the opening hours and every recorded period shown in the week. */
export function timelineRange(venue: VenueAvailability, days: readonly CalendarDay[]) {
  let { opens: start, closes: end } = openingHours(venue);
  for (const item of days.flatMap((day) => day.agenda)) {
    if (item.kind === 'AVAILABLE') continue;
    start = Math.min(start, item.start);
    end = Math.max(end, item.end);
  }
  return { start: Math.floor(start / HOUR_MS) * HOUR_MS, end: Math.ceil(end / HOUR_MS) * HOUR_MS };
}

/** Hour marks for the scale, spaced so the labels stay legible on narrow screens. */
export function hourTicks({ start, end }: { start: number; end: number }): number[] {
  const hours = (end - start) / HOUR_MS;
  const step = (hours <= 8 ? 1 : hours <= 16 ? 2 : 4) * HOUR_MS;
  const ticks: number[] = [];
  for (let tick = start; tick <= end; tick += step) ticks.push(tick);
  return ticks;
}

/** `08:00`; the end of the day is shown as `24:00`. */
export function formatClock(time: number): string {
  const minutes = Math.round(time / MINUTE_MS);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function formatTimeRange(start: number, end: number): string {
  return start === 0 && end === DAY_MS ? 'all day' : `${formatClock(start)} – ${formatClock(end)}`;
}

/** `Mon, 5 Oct`. */
export function formatDay(dateKey: string): string {
  return dayLabel.format(dayStart(dateKey));
}

/** `5–11 Oct 2026` for the Monday-to-Sunday week. */
export function formatWeek(weekStart: string): string {
  return weekLabel.formatRange(dayStart(weekStart), dayStart(addDays(weekStart, 6)));
}

/** `Sun, 4 Oct, 18:00` in Singapore time. */
export function formatInstant(value: string): string {
  return instantLabel.format(new Date(value));
}

export function formatOpeningHours(venue: Pick<VenueAvailability, 'opensAt' | 'closesAt'>): string {
  if (!venue.opensAt && !venue.closesAt) return 'No set opening hours';
  return `Open ${venue.opensAt ?? '00:00'} – ${venue.closesAt ?? '24:00'} daily`;
}
