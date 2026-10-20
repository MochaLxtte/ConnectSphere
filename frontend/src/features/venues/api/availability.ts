import { getJson } from '../../../lib/api-client';

/** KAN-51: a confirmed (APPROVED) venue booking, or since KAN-83 a live temporary hold. */
export interface BookedPeriod {
  id: string;
  kind: 'BOOKING';
  startsAt: string;
  endsAt: string;
  /** Only sent to the event's assigned coordinator; null for every other reader. */
  event: { id: string; name: string | null } | null;
  /** KAN-83: the deadline of a live temporary hold; null (or absent) for an approved booking. */
  heldUntil?: string | null;
}

/** KAN-51: a recorded period of operational unavailability. */
export interface BlockedPeriod {
  id: string;
  kind: 'BLOCKED';
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export type UnavailablePeriod = BookedPeriod | BlockedPeriod;

export interface VenueAvailability {
  id: string;
  name: string;
  location: string | null;
  capacity: number;
  /** Daily opening hours in Singapore time as HH:MM; null means unrestricted. */
  opensAt: string | null;
  closesAt: string | null;
  /** Whole periods overlapping the requested window, earliest first. */
  unavailable: UnavailablePeriod[];
}

export interface VenueAvailabilityWindow {
  from: string;
  to: string;
  items: VenueAvailability[];
}

/** Every active venue with the confirmed bookings and blocked periods in the window. */
export function fetchVenueAvailability(
  from: string, to: string, signal?: AbortSignal,
): Promise<VenueAvailabilityWindow> {
  const query = new URLSearchParams({ from, to });
  return getJson<VenueAvailabilityWindow>(`/api/venues/availability?${query.toString()}`, signal);
}
