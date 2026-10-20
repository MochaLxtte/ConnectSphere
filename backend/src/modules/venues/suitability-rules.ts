import { requirementKey, type VenueSuitabilityInput } from './suitability-input.js';

export interface SuitabilityEvent {
  id: string;
  name: string | null;
  startsAt: string | null;
  endsAt: string | null;
  expectedAttendance: number | null;
  venueRequirements: string | null;
  accessibilityNeeds: string | null;
}

export interface SuitabilityVenue {
  id: string;
  name: string;
  capacity: number;
  facilities: string[];
  accessibilityFeatures: string[];
  layouts: string[];
  wheelchairAccessible: boolean;
  opensAt: string | null;
  closesAt: string | null;
  /** KAN-77: planning input only; KAN-78 applies the buffers to availability. */
  setupMinutes: number;
  turnaroundMinutes: number;
}

export interface SuitabilityCheck {
  key: 'venueActive' | 'capacity' | 'facilities' | 'accessibility' | 'layout' | 'availability' | 'requirements';
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  message: string;
}

export interface SuitabilityAssessment {
  eventId: string;
  eventName: string | null;
  venueId: string;
  venueName: string;
  checkedAt: string;
  outcome: 'SUITABLE' | 'UNSUITABLE' | 'NEEDS_REVIEW';
  checks: SuitabilityCheck[];
}

const DAY_MS = 86_400_000;
const SGT_OFFSET_MS = 8 * 3_600_000;

function clockMilliseconds(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);
  const fraction = Number(`0.${match[4] ?? '0'}`);
  if (hour > 24 || minute > 59 || second > 59 || (hour === 24 && (minute || second || fraction))) return null;
  return ((hour * 60 + minute) * 60 + second + fraction) * 1000;
}

/** Check the whole continuous interval, not merely the start/end clock faces. */
export function intervalWithinVenueHours(
  startsAt: string, endsAt: string, opensAt: string | null, closesAt: string | null,
): boolean | null {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  const opens = clockMilliseconds(opensAt, 0);
  const closes = clockMilliseconds(closesAt, DAY_MS);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start
    || opens === null || closes === null || closes <= opens) return null;
  if (opens === 0 && closes === DAY_MS) return true;
  const localStart = start + SGT_OFFSET_MS;
  const localEnd = end + SGT_OFFSET_MS;
  const firstDay = Math.floor(localStart / DAY_MS);
  // An end exactly at midnight belongs only to the previous day for [start,end).
  const lastDay = Math.ceil(localEnd / DAY_MS) - 1;
  if (firstDay !== lastDay) return false;
  return localStart - firstDay * DAY_MS >= opens && localEnd - firstDay * DAY_MS <= closes;
}

function missingValues(required: string[], actual: string[]): string[] {
  const available = new Set(actual.map(requirementKey));
  return required.filter(value => !available.has(requirementKey(value)));
}

/** This is an assessment at read time, never an allocation, booking or approval. */
export function assessVenueSuitability(
  event: SuitabilityEvent,
  venue: SuitabilityVenue & { isActive: boolean },
  input: VenueSuitabilityInput,
  conflicts: { booked: boolean; blocked: boolean },
  checkedAt: string,
): SuitabilityAssessment {
  const checks: SuitabilityCheck[] = [];
  const add = (key: SuitabilityCheck['key'], status: SuitabilityCheck['status'], message: string) =>
    checks.push({ key, status, message });
  add('venueActive', venue.isActive ? 'PASS' : 'FAIL', venue.isActive
    ? 'The venue is active.' : 'The venue is inactive.');

  // KAN-52-AC101: 0 is a known, permitted attendance (submission accepts it), so it is checked
  // against capacity like any other count. Only a missing or unusable value leaves capacity unknown.
  if (event.expectedAttendance === null) {
    add('capacity', 'UNKNOWN', 'The event has no expected attendance yet, so capacity cannot be checked.');
  } else if (!Number.isInteger(event.expectedAttendance) || event.expectedAttendance < 0) {
    add('capacity', 'UNKNOWN', 'The event needs a valid expected attendance before capacity can be checked.');
  } else {
    const fits = event.expectedAttendance <= venue.capacity;
    add('capacity', fits ? 'PASS' : 'FAIL', fits
      ? `Expected attendance (${event.expectedAttendance}) fits the venue capacity (${venue.capacity}).`
      : `Expected attendance (${event.expectedAttendance}) exceeds the venue capacity (${venue.capacity}).`);
  }

  const missingFacilities = missingValues(input.facilities, venue.facilities);
  add('facilities', !input.requirementsConfirmed ? 'UNKNOWN' : missingFacilities.length ? 'FAIL' : 'PASS', !input.requirementsConfirmed
    ? 'Confirm the event facilities requirements before checking them.' : missingFacilities.length
    ? `Missing required facilities: ${missingFacilities.join(', ')}.`
    : input.facilities.length ? 'All specified facilities are available.' : 'No facilities were specified as required.');

  const missingAccessibility = missingValues(input.accessibility, venue.accessibilityFeatures);
  const wheelchairMissing = input.wheelchairRequired && !venue.wheelchairAccessible;
  add('accessibility', !input.requirementsConfirmed ? 'UNKNOWN' : missingAccessibility.length || wheelchairMissing ? 'FAIL' : 'PASS',
    !input.requirementsConfirmed ? 'Confirm the event accessibility requirements before checking them.'
      : missingAccessibility.length || wheelchairMissing
      ? [missingAccessibility.length ? `Missing accessibility features: ${missingAccessibility.join(', ')}.` : '',
        wheelchairMissing ? 'Wheelchair access is required but unavailable.' : ''].filter(Boolean).join(' ')
      : input.accessibility.length || input.wheelchairRequired
        ? 'All specified accessibility requirements are met.' : 'No accessibility features were specified as required.');

  const layoutMissing = input.layout !== null && !venue.layouts.some(layout => requirementKey(layout) === requirementKey(input.layout!));
  add('layout', !input.requirementsConfirmed ? 'UNKNOWN' : layoutMissing ? 'FAIL' : 'PASS', !input.requirementsConfirmed
    ? 'Confirm the event layout requirement before checking it.' : layoutMissing
    ? `Required layout is unavailable: ${input.layout}.`
    : input.layout ? 'The required layout is available.' : 'No layout was specified as required.');

  const hours = event.startsAt !== null && event.endsAt !== null
    ? intervalWithinVenueHours(event.startsAt, event.endsAt, venue.opensAt, venue.closesAt) : null;
  if (hours === null) {
    add('availability', 'UNKNOWN', 'Valid event timing and venue opening hours are needed to check availability.');
  } else {
    const failures = [!hours ? 'the event extends outside the venue opening hours' : '',
      conflicts.booked ? 'an approved booking overlaps the event period' : '',
      conflicts.blocked ? 'an operational block overlaps the event period' : ''].filter(Boolean);
    add('availability', failures.length ? 'FAIL' : 'PASS', failures.length
      ? `The venue is unavailable: ${failures.join('; ')}.`
      : 'The event period is within opening hours and has no overlapping approved booking or operational block.');
  }

  add('requirements', input.requirementsConfirmed && input.unresolvedRequirements === null ? 'PASS' : 'UNKNOWN',
    !input.requirementsConfirmed ? 'Confirm the structured requirements against the event information before relying on this result.'
      : input.unresolvedRequirements !== null ? 'Some event requirements still need manual review.'
        : 'The coordinator confirmed the structured requirements and reported no unresolved requirements.');
  return {
    eventId: event.id, eventName: event.name, venueId: venue.id, venueName: venue.name, checkedAt,
    outcome: checks.some(check => check.status === 'FAIL') ? 'UNSUITABLE'
      : checks.some(check => check.status === 'UNKNOWN') ? 'NEEDS_REVIEW' : 'SUITABLE',
    checks,
  };
}
