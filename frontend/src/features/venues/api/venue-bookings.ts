import { getJson, postJson } from '../../../lib/api-client';

export type VenueBookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type VenueBookingDecision = 'APPROVED' | 'REJECTED';

/** Booking timing is saved on the request; event requirements are the latest event values. */
export interface VenueBooking {
  id: string;
  eventRequestId: string;
  eventName: string | null;
  eventStatus: string;
  venueId: string;
  venueName: string;
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
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  purpose: string | null;
  description: string | null;
  expectedAttendance: number | null;
  venueRequirements: string | null;
  accessibilityNeeds: string | null;
}

export function venueBookingStatusLabel(status: VenueBookingStatus): string {
  return { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled' }[status];
}

/** The API scopes staff to pending requests and coordinators to their currently assigned events. */
export async function fetchVenueBookings(eventRequestId?: string, signal?: AbortSignal): Promise<VenueBooking[]> {
  const query = eventRequestId ? `?eventRequestId=${encodeURIComponent(eventRequestId)}` : '';
  return (await getJson<{ items: VenueBooking[] }>(`/api/venue-bookings${query}`, signal)).items;
}

export async function fetchVenueBooking(id: string, signal?: AbortSignal): Promise<VenueBooking> {
  return (await getJson<{ booking: VenueBooking }>(`/api/venue-bookings/${encodeURIComponent(id)}`, signal)).booking;
}

export async function decideVenueBooking(
  id: string, decision: VenueBookingDecision, reason: string, signal?: AbortSignal,
): Promise<VenueBooking> {
  return (await postJson<{ booking: VenueBooking }>(`/api/venue-bookings/${encodeURIComponent(id)}/decision`, {
    decision, reason: reason.trim() || null,
  }, signal)).booking;
}
