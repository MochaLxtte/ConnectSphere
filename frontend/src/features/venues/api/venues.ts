import { getJson, postJson } from '../../../lib/api-client';
import { sendJson } from './http';

/** CF-08: operating hours are "HH:MM" in Singapore time; null means unrestricted. */
export interface Venue {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  layouts: string[];
  facilities: string[];
  accessibilityFeatures: string[];
  wheelchairAccessible: boolean;
  opensAt: string | null;
  closesAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VenueInput = Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>;

/** CF-10: empty values are left out of the query string. */
export interface VenueFilters {
  q?: string;
  minCapacity?: number | null;
  facilities?: string[];
  accessibilityFeatures?: string[];
  wheelchairAccessible?: boolean;
  layout?: string;
  availableFrom?: string | null;
  availableTo?: string | null;
}

export interface BusyInterval {
  kind: 'BOOKING' | 'BLOCKED';
  startsAt: string;
  endsAt: string;
  /** Present only for venue staff and coordinators. */
  id?: string;
  eventName?: string | null;
  reason?: string | null;
}

export interface VenueAvailability {
  venueId: string;
  from: string;
  to: string;
  timezone: string;
  operatingHours: { opensAt: string | null; closesAt: string | null };
  busy: BusyInterval[];
}

export type SuitabilityCode = 'ACTIVE' | 'CAPACITY' | 'ACCESSIBILITY' | 'OPERATING_HOURS' | 'AVAILABILITY';

export interface SuitabilityCheck {
  code: SuitabilityCode;
  passed: boolean;
  message: string;
}

export interface Suitability {
  suitable: boolean;
  checks: SuitabilityCheck[];
}

export interface Unavailability {
  id: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export function venueQuery(filters: VenueFilters): string {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.minCapacity) params.set('minCapacity', String(filters.minCapacity));
  if (filters.facilities?.length) params.set('facilities', filters.facilities.join(','));
  if (filters.accessibilityFeatures?.length) {
    params.set('accessibilityFeatures', filters.accessibilityFeatures.join(','));
  }
  if (filters.wheelchairAccessible) params.set('wheelchairAccessible', 'true');
  if (filters.layout?.trim()) params.set('layout', filters.layout.trim());
  if (filters.availableFrom && filters.availableTo) {
    params.set('availableFrom', filters.availableFrom);
    params.set('availableTo', filters.availableTo);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchVenues(filters: VenueFilters = {}, signal?: AbortSignal): Promise<Venue[]> {
  return (await getJson<{ items: Venue[] }>(`/api/venues${venueQuery(filters)}`, signal)).items;
}

export function fetchVenue(id: string, signal?: AbortSignal): Promise<Venue> {
  return getJson<Venue>(`/api/venues/${encodeURIComponent(id)}`, signal);
}

export function createVenue(input: VenueInput): Promise<Venue> {
  return postJson<Venue>('/api/venues', input);
}

export function updateVenue(id: string, input: Partial<VenueInput>): Promise<Venue> {
  return sendJson<Venue>('PATCH', `/api/venues/${encodeURIComponent(id)}`, input);
}

export function fetchVenueAvailability(
  id: string, from: string, to: string, signal?: AbortSignal,
): Promise<VenueAvailability> {
  const params = new URLSearchParams({ from, to });
  return getJson<VenueAvailability>(`/api/venues/${encodeURIComponent(id)}/availability?${params}`, signal);
}

export function fetchVenueSuitability(
  id: string, eventRequestId: string, signal?: AbortSignal,
): Promise<Suitability> {
  const params = new URLSearchParams({ eventRequestId });
  return getJson<Suitability>(`/api/venues/${encodeURIComponent(id)}/suitability?${params}`, signal);
}

export function blockVenue(
  id: string, input: { startsAt: string; endsAt: string; reason?: string | null },
): Promise<Unavailability> {
  return postJson<Unavailability>(`/api/venues/${encodeURIComponent(id)}/unavailability`, input);
}

export function unblockVenue(id: string, blockId: string): Promise<{ deleted: boolean }> {
  return sendJson<{ deleted: boolean }>(
    'DELETE', `/api/venues/${encodeURIComponent(id)}/unavailability/${encodeURIComponent(blockId)}`,
  );
}
