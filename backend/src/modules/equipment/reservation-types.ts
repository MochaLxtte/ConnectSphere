import type { EquipmentAvailabilityContext } from './availability-types.js';

export type EquipmentReleaseCause = 'MANUAL_CANCELLATION' | 'EVENT_CANCELLED' | 'EVENT_COMPLETED';

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
  releaseCause: EquipmentReleaseCause | null;
  canReserve: boolean;
  canCancel: boolean;
}

export interface EquipmentReadiness {
  status: 'NO_REQUIREMENTS' | 'PENDING' | 'READY' | 'SHORTFALL' | 'INVALID_REQUIREMENTS';
  activeCount: number;
  reservedCount: number;
  message: string;
}

export interface EquipmentReservationContext {
  event: EquipmentAvailabilityContext['event'];
  requirementsVersion: string;
  requests: EquipmentReservationRequest[];
  readiness: EquipmentReadiness;
}

export interface EquipmentReservationResult {
  changed: boolean;
  context: EquipmentReservationContext;
}
