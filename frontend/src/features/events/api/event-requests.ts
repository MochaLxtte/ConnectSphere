import { getJson } from '../../../lib/api-client';

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
