import { getJson, postJson } from '../../../lib/api-client.js';
import type { EquipmentAvailabilityContext } from './equipment-availability.js';

export interface EquipmentReservationRequest {
  id: string;
  equipmentTypeId: string;
  equipmentName: string;
  quantity: number;
  status: 'REQUESTED' | 'RESERVED' | 'REJECTED' | 'CANCELLED';
  startsAt: string;
  endsAt: string;
  notes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  releasedBy: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  releaseCause: 'MANUAL_CANCELLATION' | 'EVENT_CANCELLED' | 'EVENT_COMPLETED' | null;
  canReserve: boolean;
  canCancel: boolean;
}

export interface EquipmentReservationContext {
  event: EquipmentAvailabilityContext['event'];
  requirementsVersion: string;
  requests: EquipmentReservationRequest[];
  readiness: {
    status: 'NO_REQUIREMENTS' | 'PENDING' | 'READY' | 'SHORTFALL' | 'INVALID_REQUIREMENTS';
    activeCount: number;
    reservedCount: number;
    message: string;
  };
}

export interface EquipmentReservationResult {
  changed: boolean;
  context: EquipmentReservationContext;
}

const base = '/api/equipment/reservations/events' as const;
export function fetchEquipmentReservations(eventId: string, signal?: AbortSignal): Promise<EquipmentReservationContext> {
  return getJson(`${base}/${encodeURIComponent(eventId)}`, signal);
}
export function reserveEquipmentRequest(eventId: string, requestId: string, requirementsVersion: string,
  signal?: AbortSignal): Promise<EquipmentReservationResult> {
  return postJson(`${base}/${encodeURIComponent(eventId)}/requests/${encodeURIComponent(requestId)}/reserve`,
    { requirementsVersion }, signal);
}
export function cancelEquipmentReservation(eventId: string, requestId: string, requirementsVersion: string,
  reason: string, signal?: AbortSignal): Promise<EquipmentReservationResult> {
  return postJson(`${base}/${encodeURIComponent(eventId)}/requests/${encodeURIComponent(requestId)}/cancel`,
    { requirementsVersion, reason }, signal);
}
