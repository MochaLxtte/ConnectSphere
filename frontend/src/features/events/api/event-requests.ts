import { getJson, patchJson } from '../../../lib/api-client';
import type { ReviewRequestDetail } from '../../reviews/types';

/** Organiser and coordinator detail views share the same response contract. */
export type EventRequestDetail = ReviewRequestDetail;

export function fetchEventRequestDetail(id: string, signal?: AbortSignal): Promise<EventRequestDetail> {
  return getJson<EventRequestDetail>(`/api/events/${encodeURIComponent(id)}`, signal);
}

/** KAN-34: PATCH body for an owned draft. Omit a field to leave it unchanged; send null to clear it. */
export interface EventDraftUpdate {
  name?: string | null;
  purpose?: string | null;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  expectedAttendance?: number | null;
  venueRequirements?: string | null;
  accessibilityNeeds?: string | null;
  equipmentRequirements?: string | null;
  registrationRequired?: boolean | null;
}

export function updateEventDraft(
  id: string,
  input: EventDraftUpdate,
  signal?: AbortSignal,
): Promise<EventRequestDetail> {
  return patchJson<EventRequestDetail>(`/api/events/${encodeURIComponent(id)}`, input, signal);
}

/** KAN-16: summary from the organiser's ownership-scoped list. */
export interface EventRequestListItem {
  id: string;
  name: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchEventRequests(signal?: AbortSignal): Promise<EventRequestListItem[]> {
  const result = await getJson<{ items: EventRequestListItem[] }>('/api/events?scope=all', signal);
  return result.items;
}
