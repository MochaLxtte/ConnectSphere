import { deleteJson, getJson, postJson } from '../../../lib/api-client';

/** KAN-55: a recorded venue-unavailability block. */
export interface VenueBlock {
  id: string;
  venueId: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  /** KAN-81: approved arrangements this outage affects, with their recovery state. */
  affected: AffectedArrangement[];
}

export type RecoveryStatus = 'RECOVERY_REQUIRED' | 'RESOLVED' | 'CLEARED';

export interface AffectedArrangement {
  impactId: string;
  status: RecoveryStatus;
  bookingId: string;
  eventRequestId: string;
  eventName: string | null;
  bookingStartsAt: string;
  bookingEndsAt: string;
}

/** KAN-81: an affected arrangement with the outage that affected it (Venue Staff recovery list). */
export interface RecoveryArrangement extends AffectedArrangement {
  blockId: string | null;
  venueId: string;
  venueName: string;
  outageStartsAt: string;
  outageEndsAt: string;
  outageReason: string;
}

export interface VenueBlockSubmissionInput {
  startsAt: string;
  endsAt: string;
  reason: string;
}

const base = (venueId: string) => `/api/venues/${encodeURIComponent(venueId)}/unavailability` as const;

export async function fetchVenueBlocks(venueId: string, signal?: AbortSignal): Promise<VenueBlock[]> {
  return (await getJson<{ items: VenueBlock[] }>(base(venueId), signal)).items;
}

export async function createVenueBlock(
  venueId: string, input: VenueBlockSubmissionInput, signal?: AbortSignal,
): Promise<VenueBlock> {
  return (await postJson<{ block: VenueBlock }>(base(venueId), input, signal)).block;
}

/** Returns the bookings whose recovery flag from this outage was cleared (KAN-81-AC11). */
export async function deleteVenueBlock(venueId: string, blockId: string, signal?: AbortSignal): Promise<string[]> {
  return (await deleteJson<{ id: string; clearedBookingIds: string[] }>(
    `${base(venueId)}/${encodeURIComponent(blockId)}`, signal)).clearedBookingIds;
}

export async function fetchRecoveryArrangements(
  status: RecoveryStatus | undefined, signal?: AbortSignal,
): Promise<RecoveryArrangement[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return (await getJson<{ items: RecoveryArrangement[] }>(`/api/venues/recovery${query}`, signal)).items;
}
