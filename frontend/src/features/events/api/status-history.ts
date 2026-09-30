import { getJson } from '../../../lib/api-client';

/** CF-06: one row of the status audit trail. */
export interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedById: string | null;
  changedByName: string | null;
  createdAt: string;
}

const event = (id: string) => `/api/events/${encodeURIComponent(id)}` as const;

export async function fetchStatusHistory(eventRequestId: string, signal?: AbortSignal): Promise<StatusHistoryEntry[]> {
  return (await getJson<{ items: StatusHistoryEntry[] }>(`${event(eventRequestId)}/history`, signal)).items;
}

