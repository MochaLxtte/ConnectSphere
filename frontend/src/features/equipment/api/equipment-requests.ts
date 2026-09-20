import { getJson, postJson } from '../../../lib/api-client';
import { patchJson } from './http';

export type EquipmentRequestStatus = 'REQUESTED' | 'RESERVED' | 'REJECTED' | 'CANCELLED';

export interface EquipmentRequest {
  id: string;
  eventRequestId: string;
  equipmentTypeId: string;
  equipmentName: string;
  equipmentCategory: string | null;
  requestedBy: string;
  quantity: number;
  status: EquipmentRequestStatus;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** CF-17: what Technical Support sees, including availability for the request's own period. */
export interface EquipmentRequestQueueItem extends EquipmentRequest {
  eventName: string | null;
  organiserName: string;
  requesterName: string;
  totalQuantity: number;
  reservedPeak: number;
  available: number;
}

export interface EquipmentRequestCreateInput {
  eventRequestId: string;
  equipmentTypeId: string;
  quantity: number;
  /** Omit both to use the event's own period. */
  startsAt?: string;
  endsAt?: string;
  notes?: string | null;
}

export interface EquipmentRequestUpdateInput {
  quantity?: number;
  startsAt?: string;
  endsAt?: string;
  notes?: string | null;
}

export interface EquipmentDecisionInput {
  decision: 'RESERVED' | 'REJECTED';
  reason?: string | null;
}

export async function fetchEventEquipmentRequests(
  eventRequestId: string, signal?: AbortSignal,
): Promise<EquipmentRequest[]> {
  const result = await getJson<{ items: EquipmentRequest[] }>(
    `/api/equipment-requests?eventRequestId=${encodeURIComponent(eventRequestId)}`, signal,
  );
  return result.items;
}

export async function fetchEquipmentRequestQueue(
  status: EquipmentRequestStatus = 'REQUESTED', signal?: AbortSignal,
): Promise<EquipmentRequestQueueItem[]> {
  const result = await getJson<{ items: EquipmentRequestQueueItem[] }>(
    `/api/equipment-requests?status=${encodeURIComponent(status)}`, signal,
  );
  return result.items;
}

export function createEquipmentRequest(input: EquipmentRequestCreateInput): Promise<EquipmentRequest> {
  return postJson<EquipmentRequest>('/api/equipment-requests', input);
}

export function updateEquipmentRequest(id: string, input: EquipmentRequestUpdateInput): Promise<EquipmentRequest> {
  return patchJson<EquipmentRequest>(`/api/equipment-requests/${encodeURIComponent(id)}`, input);
}

export function cancelEquipmentRequest(id: string): Promise<EquipmentRequest> {
  return postJson<EquipmentRequest>(`/api/equipment-requests/${encodeURIComponent(id)}/cancel`, {});
}

export function decideEquipmentRequest(id: string, input: EquipmentDecisionInput): Promise<EquipmentRequest> {
  return postJson<EquipmentRequest>(`/api/equipment-requests/${encodeURIComponent(id)}/decision`, input);
}
