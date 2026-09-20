import { getJson, postJson } from '../../../lib/api-client';

/** CF-06: one row of the status audit trail. */
export interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedById: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface CancellationResult {
  eventRequestId: string;
  status: 'CANCELLED';
  cancelledVenueBookings: number;
  cancelledEquipmentRequests: number;
  notifiedAttendees: number;
}

const event = (id: string) => `/api/events/${encodeURIComponent(id)}` as const;

export async function fetchStatusHistory(eventRequestId: string, signal?: AbortSignal): Promise<StatusHistoryEntry[]> {
  return (await getJson<{ items: StatusHistoryEntry[] }>(`${event(eventRequestId)}/history`, signal)).items;
}

export function confirmEvent(eventRequestId: string, signal?: AbortSignal) {
  return postJson<{ eventRequestId: string; status: 'CONFIRMED' }>(`${event(eventRequestId)}/confirm`, {}, signal);
}

export function cancelEvent(eventRequestId: string, reason: string, signal?: AbortSignal) {
  return postJson<CancellationResult>(`${event(eventRequestId)}/cancel`, { reason }, signal);
}

export function completeEvent(eventRequestId: string, signal?: AbortSignal) {
  return postJson<{ eventRequestId: string; status: 'COMPLETED' }>(`${event(eventRequestId)}/complete`, {}, signal);
}
