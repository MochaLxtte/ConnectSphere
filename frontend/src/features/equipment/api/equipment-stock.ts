import { getJson, patchJson } from '../../../lib/api-client.js';

export type EquipmentStockStatus = 'AVAILABLE' | 'PARTLY_UNAVAILABLE' | 'UNAVAILABLE';

export interface EquipmentStockItem {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
  totalQuantity: number;
  damagedQuantity: number;
  maintenanceQuantity: number;
  operationalQuantity: number;
  unavailableQuantity: number;
  status: EquipmentStockStatus;
  revision: number;
  shortfallEventCount: number;
  updatedAt: string;
}

export interface EquipmentStockQuantities {
  totalQuantity: number;
  damagedQuantity: number;
  maintenanceQuantity: number;
}

export interface EquipmentStockChange {
  id: string;
  revision: number;
  changedById: string;
  changedByName: string | null;
  changedAt: string;
  reason: string;
  previous: EquipmentStockQuantities;
  next: EquipmentStockQuantities;
}

export interface EquipmentStockShortfall {
  eventId: string;
  eventName: string | null;
  startsAt: string;
  endsAt: string;
  reservedQuantity: number;
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
  changed: boolean;
  notifiedEvents: number;
}

export interface EquipmentStockUpdate extends Partial<EquipmentStockQuantities> {
  expectedRevision: number;
  reason: string;
}

export const stockStatusLabel: Record<EquipmentStockStatus, string> = {
  AVAILABLE: 'Available', PARTLY_UNAVAILABLE: 'Partly unavailable', UNAVAILABLE: 'Unavailable',
};

export async function fetchEquipmentStock(signal?: AbortSignal): Promise<EquipmentStockItem[]> {
  return (await getJson<{ items: EquipmentStockItem[] }>('/api/equipment/stock', signal)).items;
}

export function fetchEquipmentStockDetail(typeId: string, signal?: AbortSignal): Promise<EquipmentStockDetail> {
  return getJson(`/api/equipment/stock/${encodeURIComponent(typeId)}`, signal);
}

export function updateEquipmentStock(typeId: string, update: EquipmentStockUpdate, signal?: AbortSignal): Promise<EquipmentStockUpdateResult> {
  return patchJson(`/api/equipment/stock/${encodeURIComponent(typeId)}`, update, signal);
}
