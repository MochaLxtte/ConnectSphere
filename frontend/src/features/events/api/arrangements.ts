import { getJson, postJson } from '../../../lib/api-client';

export interface EquipmentType { id: string; name: string; category: string | null }
export interface EquipmentLine {
  id: string; eventRequestId: string; eventName: string | null; equipmentTypeId: string;
  equipmentType: string; quantity: number; startsAt: string; endsAt: string;
  technicalRequirements: string | null; status: string; revision: number; decisionReason: string | null;
}
export interface EquipmentLineInput {
  equipmentTypeId: string; quantity: number; startsAt: string; endsAt: string; technicalRequirements: string | null;
}

export async function fetchEquipmentTypes(signal?: AbortSignal): Promise<EquipmentType[]> {
  return (await getJson<{ items: EquipmentType[] }>('/api/equipment-types', signal)).items;
}
export async function fetchEquipmentRequests(eventId: string, signal?: AbortSignal): Promise<EquipmentLine[]> {
  const result = await getJson<{ plan: { items: EquipmentLine[]; status: string } }>(`/api/events/${encodeURIComponent(eventId)}/equipment-requests`, signal);
  return result.plan.items;
}
export async function fetchEquipmentPlan(eventId: string, signal?: AbortSignal) {
  return (await getJson<{ plan: { items: EquipmentLine[]; status: string } }>(
    `/api/events/${encodeURIComponent(eventId)}/equipment-requests`, signal)).plan;
}
export async function saveEquipmentLines(eventId: string, lines: EquipmentLineInput[], notRequired = false) {
  return postJson<{ request: { status: string; lines: EquipmentLine[] } }>(
    `/api/events/${encodeURIComponent(eventId)}/equipment-requests`, { lines, notRequired });
}
export async function reviewEquipmentLine(id: string, decision: 'RESERVED' | 'REJECTED', reason?: string) {
  return postJson<{ request: EquipmentLine }>(`/api/equipment-requests/${encodeURIComponent(id)}/review`,
    { decision, ...(reason ? { reason } : {}) });
}
export async function cancelEquipmentLine(id: string, reason: string) {
  return postJson<{ request: EquipmentLine }>(`/api/equipment-requests/${encodeURIComponent(id)}/cancel`, { reason });
}
export async function cancelEvent(eventId: string, reason: string) {
  return postJson<{ cancellation: { status: string; cancelledAt: string; reason: string } }>(
    `/api/events/${encodeURIComponent(eventId)}/cancel`, { reason, confirmAffectedArrangements: true });
}
export async function fetchCancellation(eventId: string) {
  return getJson<{ cancellation: { status: string; cancelledAt: string; reason: string } | null }>(
    `/api/events/${encodeURIComponent(eventId)}/cancellation`);
}
