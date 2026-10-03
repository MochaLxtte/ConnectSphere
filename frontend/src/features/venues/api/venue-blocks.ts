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

export async function deleteVenueBlock(venueId: string, blockId: string, signal?: AbortSignal): Promise<void> {
  await deleteJson<{ id: string }>(`${base(venueId)}/${encodeURIComponent(blockId)}`, signal);
}
