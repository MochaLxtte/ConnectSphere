import type { Interval, SuitabilityCheck, SuitabilityResult } from './types.js';

export interface SuitabilityVenue {
  capacity: number;
  wheelchairAccessible: boolean;
  accessibilityFeatures: readonly string[];
  /** "HH:MM" (or "HH:MM:SS") in Asia/Singapore; null means unrestricted. */
  opensAt: string | null;
  closesAt: string | null;
  isActive: boolean;
  /** Approved bookings and blocked periods that may overlap the event; omitted means none known. */
  busy?: readonly Interval[];
}

export interface SuitabilityEvent {
  startsAt: string | null;
  endsAt: string | null;
  expectedAttendance: number | null;
  accessibilityNeeds: string | null;
}

// Q-07 (provisional): Singapore has no daylight saving, so a fixed UTC+8 offset is exact.
const SINGAPORE_OFFSET_MINUTES = 8 * 60;
const MINUTES_PER_DAY = 24 * 60;

function minutesOfDay(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function operatingHoursCheck(venue: SuitabilityVenue, start: number, end: number): SuitabilityCheck {
  const code = 'OPERATING_HOURS';
  if (venue.opensAt === null && venue.closesAt === null) {
    return { code, passed: true, message: 'The venue has no operating-hour restriction.' };
  }
  const opens = venue.opensAt === null ? 0 : minutesOfDay(venue.opensAt);
  const closes = venue.closesAt === null ? MINUTES_PER_DAY : minutesOfDay(venue.closesAt);
  const startMinutes = Math.floor(start / 60_000) + SINGAPORE_OFFSET_MINUTES;
  const startOfDay = ((startMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  // Measuring the end from the start's local day makes any overnight interval exceed closing time.
  const endOfDay = startOfDay + Math.ceil((end - start) / 60_000);
  const hours = `${venue.opensAt?.slice(0, 5) ?? '00:00'} to ${venue.closesAt?.slice(0, 5) ?? '24:00'}`;
  const passed = startOfDay >= opens && endOfDay <= closes;
  return {
    code, passed,
    message: passed
      ? `The event is within the venue's operating hours (${hours}, Singapore time).`
      : `The event is outside the venue's operating hours (${hours}, Singapore time).`,
  };
}

/**
 * CF-11/Q-08 (provisional): pure suitability assessment. A failed check is a warning for the
 * requester and venue staff, not a hard block on requesting a booking.
 */
export function assessVenueSuitability(venue: SuitabilityVenue, event: SuitabilityEvent): SuitabilityResult {
  const checks: SuitabilityCheck[] = [];
  checks.push({
    code: 'ACTIVE', passed: venue.isActive,
    message: venue.isActive ? 'The venue is open for bookings.' : 'The venue is not currently open for bookings.',
  });

  if (event.expectedAttendance === null) {
    checks.push({ code: 'CAPACITY', passed: true, message: 'The event has no expected attendance to compare with the capacity.' });
  } else {
    const passed = venue.capacity >= event.expectedAttendance;
    checks.push({
      code: 'CAPACITY', passed,
      message: passed
        ? `Capacity ${venue.capacity} covers the expected attendance of ${event.expectedAttendance}.`
        : `Capacity ${venue.capacity} is below the expected attendance of ${event.expectedAttendance}.`,
    });
  }

  if (!event.accessibilityNeeds?.trim()) {
    checks.push({ code: 'ACCESSIBILITY', passed: true, message: 'The event lists no accessibility needs.' });
  } else {
    const passed = venue.wheelchairAccessible || venue.accessibilityFeatures.length > 0;
    checks.push({
      code: 'ACCESSIBILITY', passed,
      message: passed
        ? 'The venue lists accessibility provisions; confirm they meet the event\'s stated needs.'
        : 'The event has accessibility needs but the venue lists no accessibility provisions.',
    });
  }

  const start = event.startsAt ? Date.parse(event.startsAt) : Number.NaN;
  const end = event.endsAt ? Date.parse(event.endsAt) : Number.NaN;
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    const message = 'The event has no valid start and end time to check.';
    checks.push({ code: 'OPERATING_HOURS', passed: false, message });
    checks.push({ code: 'AVAILABILITY', passed: false, message });
  } else {
    checks.push(operatingHoursCheck(venue, start, end));
    const clashes = (venue.busy ?? []).filter(
      (busy) => Date.parse(busy.startsAt) < end && Date.parse(busy.endsAt) > start,
    ).length;
    checks.push({
      code: 'AVAILABILITY', passed: clashes === 0,
      message: clashes === 0
        ? 'The venue has no approved booking or blocked period in this time.'
        : 'The venue already has an approved booking or blocked period in this time.',
    });
  }

  return { suitable: checks.every((check) => check.passed), checks };
}
