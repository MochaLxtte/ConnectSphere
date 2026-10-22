import { getJson, patchJson } from '../../../lib/api-client';

/** KAN-50: a venue as maintained by Venue Staff; the same shape the venue search returns. */
export interface CatalogueVenue {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  layouts: string[];
  facilities: string[];
  accessibilityFeatures: string[];
  wheelchairAccessible: boolean;
  opensAt: string | null; // "HH:MM" Singapore time; null = unrestricted
  closesAt: string | null;
  /** KAN-77: whole minutes needed before and after each booking (0-1440). */
  setupMinutes: number;
  turnaroundMinutes: number;
  affectedBookings?: { id: string; warnings: string[] }[];
  updatedAt: string;
}

/** Only fields present are changed; an omitted field stays as saved. */
export interface CatalogueVenueUpdate {
  location?: string | null;
  capacity?: number;
  facilities?: string[];
  accessibilityFeatures?: string[];
  wheelchairAccessible?: boolean;
  layouts?: string[];
  opensAt?: string | null;
  closesAt?: string | null;
  /** A changed buffer is sent with the value it replaces, so a stale edit is refused (409). */
  setupMinutes?: number;
  expectedSetupMinutes?: number;
  turnaroundMinutes?: number;
  expectedTurnaroundMinutes?: number;
}

const base = '/api/venues/catalogue' as const;
const one = (venueId: string) => `${base}/${encodeURIComponent(venueId)}` as const;

export async function fetchCatalogueVenues(signal?: AbortSignal): Promise<CatalogueVenue[]> {
  return (await getJson<{ items: CatalogueVenue[] }>(base, signal)).items;
}

export async function fetchCatalogueVenue(venueId: string, signal?: AbortSignal): Promise<CatalogueVenue> {
  return (await getJson<{ venue: CatalogueVenue }>(one(venueId), signal)).venue;
}

export async function updateCatalogueVenue(
  venueId: string, update: CatalogueVenueUpdate, signal?: AbortSignal,
): Promise<CatalogueVenue> {
  return (await patchJson<{ venue: CatalogueVenue }>(one(venueId), update, signal)).venue;
}
