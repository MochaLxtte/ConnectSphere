import { getJson, postJson } from '../../../lib/api-client';
import type { ReviewRequestDetail } from '../../reviews/types';
import type { EventRequestDetail, SaveEventDraftInput } from '../types';

/** Create event request or draft */
export async function createEventRequest(
  data: SaveEventDraftInput,
  action: 'DRAFT' | 'SUBMIT' = 'DRAFT'
): Promise<EventRequestDetail> {
  const result = await postJson<{ request: EventRequestDetail }>('/api/events', {
    action,
    data,
  });
  return result.request;
}

/** Organiser and coordinator detail views share the same response contract. */
export type EventRequestDetail = ReviewRequestDetail;

export function fetchEventRequestDetail(id: string, signal?: AbortSignal): Promise<EventRequestDetail> {
  return getJson<EventRequestDetail>(`/api/events/${encodeURIComponent(id)}`, signal);
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