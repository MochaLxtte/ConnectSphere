/** KAN-18: Technical Support maintains pooled stock and records operational losses. */
export type EquipmentStockStatus = 'AVAILABLE' | 'PARTLY_UNAVAILABLE' | 'UNAVAILABLE';

export interface EquipmentStockItem {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
  totalQuantity: number;
  damagedQuantity: number;
  maintenanceQuantity: number;
  /** total - damaged - maintenance, or 0 for an inactive type (the same figure availability checks use). */
  operationalQuantity: number;
  /** Units out of service: damaged + maintenance. */
  unavailableQuantity: number;
  status: EquipmentStockStatus;
  /** The version a stock form must quote to change this row (KAN-18-AC103). */
  revision: number;
  /** Events whose reservations currently exceed operational stock. */
  shortfallEventCount: number;
  updatedAt: string;
}

export interface EquipmentStockChange {
  id: string;
  revision: number;
  changedById: string;
  changedByName: string | null;
  changedAt: string;
  reason: string;
  previous: { totalQuantity: number; damagedQuantity: number; maintenanceQuantity: number };
  next: { totalQuantity: number; damagedQuantity: number; maintenanceQuantity: number };
}

/** A reservation the current operational stock can no longer fully cover. The reservation is kept. */
export interface EquipmentStockShortfall {
  eventId: string;
  eventName: string | null;
  startsAt: string;
  endsAt: string;
  reservedQuantity: number;
  /** Most units reserved at once, across every event, while this event is running. */
  peakReservedQuantity: number;
  operationalQuantity: number;
  shortfallQuantity: number;
}

export interface EquipmentStockDetail {
  item: EquipmentStockItem;
  history: EquipmentStockChange[];
  shortfalls: EquipmentStockShortfall[];
}

export interface EquipmentStockUpdateResult extends EquipmentStockDetail {
  /** False when the submitted quantities already matched; nothing was written. */
  changed: boolean;
  /** Coordinators notified of a shortfall by this change. */
  notifiedEvents: number;
}

export interface EquipmentStockUpdateInput {
  expectedRevision: number;
  totalQuantity?: number;
  damagedQuantity?: number;
  maintenanceQuantity?: number;
  reason: string;
}
