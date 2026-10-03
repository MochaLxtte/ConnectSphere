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

/** The app shows Singapore time, so a datetime-local value is read as UTC+8. */
export function localToIso(value: string): string {
  return new Date(`${value}+08:00`).toISOString();
}

function toQuery(filters: VenueFilters): string {
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