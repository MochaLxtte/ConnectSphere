import { ApiError } from '../../lib/api-client';
import { clearLocalSession } from '../auth/session.js';

// Q-07 (provisional): all venue times are shown in Singapore time, which has a fixed UTC+8 offset.
const TIME_ZONE = 'Asia/Singapore';
const OFFSET_MS = 8 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

const dateTimeFormat = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE });
const dayFormat = new Intl.DateTimeFormat('en-SG', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TIME_ZONE });

function parse(value: string | number): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null): string {
  const date = value ? parse(value) : null;
  return date ? dateTimeFormat.format(date) : 'Time unavailable';
}

export function formatDay(value: string | number): string {
  const date = parse(value);
  return date ? dayFormat.format(date) : 'Date unavailable';
}

/** 24-hour "HH:MM" in Singapore time. */
export function formatClock(value: string | number): string {
  const date = parse(value);
  return date ? timeFormat.format(date) : '--:--';
}

export function formatInterval(startsAt: string, endsAt: string): string {
  return `${formatDateTime(startsAt)} to ${formatDateTime(endsAt)}`;
}

export function formatOperatingHours(opensAt: string | null, closesAt: string | null): string {
  if (!opensAt && !closesAt) return 'Open all day';
  return `${opensAt ?? '00:00'} to ${closesAt ?? '24:00'}`;
}

/** A datetime-local value ("YYYY-MM-DDTHH:MM") is read as Singapore time. */
export function singaporeInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = parse(`${value}:00+08:00`);
  return date ? date.toISOString() : null;
}

/** The instant of Monday 00:00 Singapore time for the week containing `now`, moved by whole weeks. */
export function singaporeWeekStart(now: number, weekOffset = 0): number {
  const local = new Date(now + OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceMonday);
  return mondayLocal - OFFSET_MS + weekOffset * 7 * DAY_MS;
}

export interface DaySlot {
  key: string;
  label: string;
  kind: 'BOOKING' | 'BLOCKED';
  detail: string | null;
  blockId: string | null;
}

export interface AgendaDay {
  start: number;
  label: string;
  slots: DaySlot[];
}

interface Busy {
  kind: 'BOOKING' | 'BLOCKED';
  startsAt: string;
  endsAt: string;
  id?: string;
  eventName?: string | null;
  reason?: string | null;
}

/** CF-09: split busy intervals across the seven Singapore days of a week, clipping at midnight. */
export function buildWeekAgenda(weekStart: number, busy: readonly Busy[]): AgendaDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const start = weekStart + index * DAY_MS;
    const end = start + DAY_MS;
    const slots = busy
      .map((interval) => ({ interval, from: Date.parse(interval.startsAt), to: Date.parse(interval.endsAt) }))
      .filter(({ from, to }) => from < end && to > start)
      .sort((a, b) => a.from - b.from)
      .map(({ interval, from, to }): DaySlot => ({
        key: `${interval.kind}-${interval.startsAt}-${interval.endsAt}-${interval.id ?? ""}`,
        label: `${from <= start ? '00:00' : formatClock(from)} to ${to >= end ? '24:00' : formatClock(to)}`,
        kind: interval.kind,
        detail: (interval.kind === 'BOOKING' ? interval.eventName : interval.reason)?.trim() || null,
        blockId: interval.kind === 'BLOCKED' ? interval.id ?? null : null,
      }));
    return { start, label: formatDay(start), slots };
  });
}

export function splitTags(text: string): string[] {
  return [...new Set(text.split(',').map((tag) => tag.trim()).filter(Boolean))];
}

const bookingStatusLabels: Record<string, string> = {
  PENDING: 'Pending decision', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled',
};

export function bookingStatusLabel(status: string): string {
  return bookingStatusLabels[status] ?? 'Status unavailable';
}

export interface LoadFailure {
  message: string;
  signIn: boolean;
  retryable: boolean;
}

/** Shared read-failure policy: 401 forgets the local identity; 403/404 are final; others can be retried. */
export function describeLoadFailure(error: unknown, subject: string): LoadFailure {
  if (error instanceof ApiError && error.status === 401) {
    clearLocalSession();
    return { message: `Sign in to view ${subject}.`, signIn: true, retryable: false };
  }
  if (error instanceof ApiError && [400, 403, 404].includes(error.status)) {
    return {
      message: `${subject.charAt(0).toUpperCase()}${subject.slice(1)} is unavailable or you do not have permission to view it.`,
      signIn: false, retryable: false,
    };
  }
  return { message: `We could not load ${subject}. Please try again.`, signIn: false, retryable: true };
}

/** Message for a failed write; a 401 also forgets the local identity. */
export function describeActionFailure(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 401) {
    clearLocalSession();
    return 'Your session has expired. Sign in again to continue.';
  }
  return error instanceof ApiError && error.status >= 400 && error.status < 500 ? error.message : fallback;
}
