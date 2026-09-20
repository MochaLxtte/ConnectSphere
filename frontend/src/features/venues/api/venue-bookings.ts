import { getJson, postJson } from '../../../lib/api-client';
import type { Suitability, SuitabilityCheck } from './venues';

export type VenueBookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface VenueBooking {
  id: string;
  eventRequestId: string;
  venueId: string;
  venueName: string;
  requestedBy: string;
  status: VenueBookingStatus;
  startsAt: string;
  endsAt: string;
  layout: string | null;
  notes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** CF-12/Q-08: failed suitability checks come back as warnings; the request is still recorded. */
export interface RequestedVenueBooking extends VenueBooking {
  suitability: Suitability;
  warnings: SuitabilityCheck[];
}

export interface BookingConflict {
  bookingId: string;
  status: 'PENDING' | 'APPROVED';
  eventName: string | null;
  startsAt: string;
  endsAt: string;
}

/** CF-13/CF-14: what venue staff see before deciding. */
export interface VenueBookingQueueItem extends VenueBooking {
  eventName: string | null;
  organiserName: string;
  expectedAttendance: number | null;
  suitability: Suitability;
  conflicts: BookingConflict[];
}

export interface VenueBookingRequest {
  eventRequestId: string;
  venueId: string;
  startsAt?: string;
  endsAt?: string;
  layout?: string | null;
  notes?: string | null;
}

export async function fetchEventVenueBookings(eventRequestId: string, signal?: AbortSignal): Promise<VenueBooking[]> {
  const params = new URLSearchParams({ eventRequestId });
  return (await getJson<{ items: VenueBooking[] }>(`/api/venue-bookings?${params}`, signal)).items;
}

export async function fetchVenueBookingQueue(
  status: VenueBookingStatus = 'PENDING', signal?: AbortSignal,
): Promise<VenueBookingQueueItem[]> {
  const params = new URLSearchParams({ status });
  return (await getJson<{ items: VenueBookingQueueItem[] }>(`/api/venue-bookings?${params}`, signal)).items;
}

export function requestVenueBooking(input: VenueBookingRequest): Promise<RequestedVenueBooking> {
  return postJson<RequestedVenueBooking>('/api/venue-bookings', input);
}

export function cancelVenueBooking(id: string): Promise<VenueBooking> {
  return postJson<VenueBooking>(`/api/venue-bookings/${encodeURIComponent(id)}/cancel`, {});
}

export function decideVenueBooking(
  id: string, decision: 'APPROVED' | 'REJECTED', reason?: string,
): Promise<VenueBooking> {
  return postJson<VenueBooking>(
    `/api/venue-bookings/${encodeURIComponent(id)}/decision`,
    { decision, reason: reason?.trim() || null },
  );
}
