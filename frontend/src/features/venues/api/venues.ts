import { getJson } from '../../../lib/api-client.js';

/** Form values as entered; converted to a query string on search. */
export interface VenueFilters {
  startsAt: string; // <input type="datetime-local"> value, read as Singapore time
  endsAt: string;
  attendance: string | number; // number inputs produce numbers via v-model
  capacity: string | number;
  location: string;
  layout: string;
  wheelchairAccessible: boolean;
  accessibility: string[];
  facilities: string[];
}

export interface VenueResult {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  layouts: string[];
  facilities: string[];
  accessibilityFeatures: string[];
  wheelchairAccessible: boolean;
  opensAt: string | null; // "HH:MM"
  closesAt: string | null;
  updatedAt: string;
}

export interface VenueFilterOptions {
  layouts: string[];
  facilities: string[];
  accessibility: string[];
}

export function emptyFilters(): VenueFilters {
  return {
    startsAt: '', endsAt: '', attendance: '', capacity: '', location: '', layout: '',
    wheelchairAccessible: false, accessibility: [], facilities: [],
  };
}

/** Number inputs hold numbers (or ''), so every value is converted before it is trimmed. */
function asText(value: unknown): string {
  return String(value ?? '').trim();
}

export function hasActiveFilters(filters: VenueFilters): boolean {
  return Object.values(filters).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return asText(value) !== '';
  });
}

/* ---------------------------------------------------------------------------------------------
 * Event period (KAN-12-AC14 and KAN-12-AC101)
 * ------------------------------------------------------------------------------------------- */

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * True only for a real calendar date and clock time such as "2026-10-20T14:00".
 * Date.parse and new Date() are NOT used to decide this, because they can silently roll an
 * impossible date over (30 Feb 2026 becomes 2 Mar 2026).
 */
export function isRealLocalDateTime(value: string): boolean {
  const match = LOCAL_DATE_TIME.exec(value);
  if (match === null) return false;
  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part ?? 0));
  if (year! < 1000 || month! < 1 || month! > 12) return false;
  const daysInMonth = new Date(Date.UTC(year!, month!, 0)).getUTCDate(); // day 0 of next month
  return day! >= 1 && day! <= daysInMonth && hour! <= 23 && minute! <= 59 && second! <= 59;
}

/** The app shows Singapore time, so a datetime-local value is read as UTC+8. Refuses impossible dates. */
export function localToIso(value: string): string {
  if (!isRealLocalDateTime(value)) throw new RangeError(`"${value}" is not a real date and time.`);
  return new Date(`${value}+08:00`).toISOString();
}

export interface PeriodErrors {
  startsAt: string;
  endsAt: string;
}

export const NOT_A_REAL_DATE = 'This is not a real date and time. Check the day, month and time.';
export const INCOMPLETE_DATE = 'Enter a complete date and time.';
export const MISSING_START = 'Enter a start time, or clear the end time.';
export const MISSING_END = 'Enter an end time, or clear the start time.';
export const END_NOT_AFTER_START = 'The end time must be after the start time.';

/**
 * Field-level feedback for the event period. An empty string means "no problem with this field".
 * `unreadable` says the browser holds text it could not turn into a value (a half-typed or
 * impossible date), which shows up as an empty value but should not read as "left blank".
 */
export function validatePeriod(
  startsAt: string,
  endsAt: string,
  unreadable: { startsAt?: boolean; endsAt?: boolean } = {},
): PeriodErrors {
  const errors: PeriodErrors = { startsAt: '', endsAt: '' };
  const check = (field: keyof PeriodErrors, value: string) => {
    if (value !== '' && !isRealLocalDateTime(value)) errors[field] = NOT_A_REAL_DATE;
    else if (value === '' && unreadable[field]) errors[field] = INCOMPLETE_DATE;
  };
  check('startsAt', startsAt);
  check('endsAt', endsAt);
  if (errors.startsAt || errors.endsAt) return errors;

  if (startsAt === '' && endsAt === '') return errors;
  if (startsAt === '') errors.startsAt = MISSING_START;
  else if (endsAt === '') errors.endsAt = MISSING_END;
  else if (Date.parse(localToIso(endsAt)) <= Date.parse(localToIso(startsAt))) {
    errors.endsAt = END_NOT_AFTER_START;
  }
  return errors;
}

export const periodHasErrors = (errors: PeriodErrors): boolean => errors.startsAt !== '' || errors.endsAt !== '';

function toQuery(filters: VenueFilters): string {
  // Refuse a bad period here too, so no request is ever built from an invalid or silently changed date.
  const errors = validatePeriod(filters.startsAt, filters.endsAt);
  if (periodHasErrors(errors)) throw new RangeError(errors.startsAt || errors.endsAt);

  const params = new URLSearchParams();
  const set = (key: string, value: string | number) => {
    const trimmed = asText(value);
    if (trimmed !== '') params.set(key, trimmed);
  };
  if (filters.startsAt && filters.endsAt) {
    set('startsAt', localToIso(filters.startsAt));
    set('endsAt', localToIso(filters.endsAt));
  }
  set('attendance', filters.attendance);
  set('capacity', filters.capacity);
  set('location', filters.location);
  set('layout', filters.layout);
  if (filters.wheelchairAccessible) params.set('wheelchairAccessible', 'true');
  for (const feature of filters.accessibility) params.append('accessibility', feature);
  for (const facility of filters.facilities) params.append('facilities', facility);
  return params.toString();
}

export async function searchVenues(filters: VenueFilters, signal?: AbortSignal): Promise<VenueResult[]> {
  const query = toQuery(filters);
  const response = await getJson<{ items: VenueResult[] }>(
    `/api/venues/search-venues${query ? `?${query}` : ''}`,
    signal,
  );
  return response.items;
}

export function fetchVenueFilterOptions(signal?: AbortSignal): Promise<VenueFilterOptions> {
  return getJson<VenueFilterOptions>('/api/venues/filter-options', signal);
}