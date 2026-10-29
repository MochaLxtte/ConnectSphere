import { getJson, postJson } from '../../../lib/api-client.js';

export interface EquipmentType { id: string; name: string; category: string | null }
export interface EquipmentLine {
  id: string; eventRequestId: string; eventName: string | null; equipmentTypeId: string;
  equipmentType: string; quantity: number; startsAt: string; endsAt: string;
  technicalRequirements: string | null; status: string; revision: string; decisionReason: string | null;
  eventStatus: string;
  notes?: string | null;
}
export interface EquipmentLineInput {
  equipmentTypeId: string; quantity: number; startsAt: string; endsAt: string; technicalRequirements: string | null;
}
export interface EquipmentPlan {
  eventRequestId: string; status: string; items: EquipmentLine[]; revision: string;
  eventStatus: string; eventStartsAt: string | null; eventEndsAt: string | null;
  /** KAN-84: a confirmed event is editable while its safety review requests technical changes. */
  technicalRemediation?: boolean;
}

export async function fetchEquipmentTypes(signal?: AbortSignal): Promise<EquipmentType[]> {
  return (await getJson<{ items: EquipmentType[] }>('/api/equipment-types', signal)).items;
}
export async function fetchEquipmentRequests(eventId: string, signal?: AbortSignal): Promise<EquipmentLine[]> {
  const result = await getJson<{ plan: EquipmentPlan }>(`/api/events/${encodeURIComponent(eventId)}/equipment-requests`, signal);
  return result.plan.items;
}
export async function fetchEquipmentPlan(eventId: string, signal?: AbortSignal) {
  return (await getJson<{ plan: EquipmentPlan }>(
    `/api/events/${encodeURIComponent(eventId)}/equipment-requests`, signal)).plan;
}
export async function saveEquipmentLines(eventId: string, lines: EquipmentLineInput[], notRequired: boolean, revision: string, signal?: AbortSignal) {
  return postJson<{ request: { status: string; lines: EquipmentLine[] } }>(
    `/api/events/${encodeURIComponent(eventId)}/equipment-requests`, { lines, notRequired, revision }, signal);
}
export async function reviewEquipmentLine(id: string, decision: 'RESERVED' | 'REJECTED', revision: string, reason?: string, signal?: AbortSignal) {
  return postJson<{ request: EquipmentLine }>(`/api/equipment-requests/${encodeURIComponent(id)}/review`,
    { decision, revision, ...(reason ? { reason } : {}) }, signal);
}
export async function cancelEquipmentLine(id: string, reason: string, revision: string, signal?: AbortSignal) {
  return postJson<{ request: EquipmentLine }>(`/api/equipment-requests/${encodeURIComponent(id)}/cancel`, { reason, revision }, signal);
}
export async function replaceEquipmentLine(id: string, replacement: EquipmentLineInput, revision: string, signal?: AbortSignal) {
  return postJson(`/api/equipment-requests/${encodeURIComponent(id)}/replace`, { replacement, revision }, signal);
}
export async function cancelEvent(eventId: string, reason: string, signal?: AbortSignal) {
  return postJson<{ cancellation: { status: string; cancelledAt: string; reason: string } }>(
    `/api/events/${encodeURIComponent(eventId)}/cancel`, { reason, confirmAffectedArrangements: true }, signal);
}
/** KAN-61: readiness checklist and the saved confirmation (actor and time). */
export interface ReadinessCheck { key: 'VENUE' | 'EQUIPMENT' | 'CHANGE_REQUEST'; ready: boolean; message: string }
export interface ConfirmationRecord { confirmedBy: string | null; confirmedByName: string | null; confirmedAt: string }
export interface EventConfirmation {
  eventRequestId: string; status: string; started: boolean; canConfirm: boolean;
  readiness: { ready: boolean; checks: ReadinessCheck[] } | null;
  confirmation: ConfirmationRecord | null;
}
export async function fetchConfirmation(eventId: string, signal?: AbortSignal) {
  return getJson<EventConfirmation>(`/api/events/${encodeURIComponent(eventId)}/confirmation`, signal);
}
export async function confirmEvent(eventId: string, signal?: AbortSignal) {
  return postJson<{ confirmation: { status: string; changed: boolean; confirmation: ConfirmationRecord | null } }>(
    `/api/events/${encodeURIComponent(eventId)}/confirm`, {}, signal);
}

export async function fetchCancellation(eventId: string, signal?: AbortSignal) {
  return getJson<{ cancellation: { status: string; cancelledAt: string; reason: string } | null }>(
    `/api/events/${encodeURIComponent(eventId)}/cancellation`, signal);
}

export interface EventCompletion {
  eventRequestId: string; status: 'COMPLETED'; completedById: string; completedByName: string | null;
  completedAt: string; releasedEquipmentRequests: number;
}
/** KAN-10: the server decides whether the event has ended, by its own clock. */
export function completeEvent(eventId: string, signal?: AbortSignal) {
  return postJson<{ completion: EventCompletion }>(`/api/events/${encodeURIComponent(eventId)}/complete`, {}, signal);
}
export function fetchCompletion(eventId: string, signal?: AbortSignal) {
  return getJson<{ completion: EventCompletion | null }>(`/api/events/${encodeURIComponent(eventId)}/completion`, signal);
}
