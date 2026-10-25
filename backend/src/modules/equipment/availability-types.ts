/** KAN-9: read-only equipment checks; neither mode writes a request or reservation. */
export interface EquipmentEventSummary {
  id: string;
  name: string | null;
  status: 'APPROVED' | 'CONFIRMED';
  startsAt: string | null;
  endsAt: string | null;
}

export interface EquipmentTypeSummary {
  id: string;
  name: string;
  category: string | null;
  totalQuantity: number;
  damagedQuantity: number;
  maintenanceQuantity: number;
  isActive: boolean;
}

export interface SavedEquipmentRequest {
  id: string;
  equipmentTypeId: string;
  quantity: number;
  status: 'REQUESTED' | 'RESERVED' | 'REJECTED';
  startsAt: string;
  endsAt: string;
  notes: string | null;
}

export interface EquipmentAvailabilityContext {
  event: EquipmentEventSummary & { equipmentRequirements: string | null };
  requirementsVersion: string;
  equipmentTypes: EquipmentTypeSummary[];
  savedRequests: SavedEquipmentRequest[];
}

export type EquipmentAvailabilityInput = {
  mode: 'saved';
  requirementsVersion: string;
} | {
  mode: 'what-if';
  requirementsVersion: string;
  startsAt: string;
  endsAt: string;
  items: { equipmentTypeId: string; quantity: number }[];
};

export interface EquipmentAvailabilityItem {
  equipmentTypeId: string;
  equipmentTypeName: string;
  requestedQuantity: number;
  totalQuantity: number;
  damagedQuantity: number;
  maintenanceQuantity: number;
  operationalQuantity: number;
  peakReservedQuantity: number;
  availableQuantity: number;
  shortfallQuantity: number;
  isActive: boolean;
}

export interface EquipmentAvailabilityAssessment {
  eventId: string;
  eventName: string | null;
  mode: EquipmentAvailabilityInput['mode'];
  startsAt: string;
  endsAt: string;
  checkedAt: string;
  advisory: true;
  outcome: 'FULFILLABLE' | 'SHORTFALL';
  items: EquipmentAvailabilityItem[];
}
