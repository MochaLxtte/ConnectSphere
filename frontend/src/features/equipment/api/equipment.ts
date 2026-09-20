import { getJson, postJson } from '../../../lib/api-client';
import { patchJson } from './http';

/** CF-15/Q-09 (provisional): equipment is pooled by type with one total quantity. */
export interface EquipmentType {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  totalQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentTypeInput {
  name: string;
  category: string | null;
  description: string | null;
  totalQuantity: number;
  isActive: boolean;
}

/** CF-16: quantities for the half-open period [from, to). */
export interface EquipmentAvailability {
  equipmentTypeId: string;
  from: string;
  to: string;
  totalQuantity: number;
  reservedPeak: number;
  available: number;
}

export interface EquipmentAvailabilityItem extends EquipmentAvailability {
  name: string;
  category: string | null;
}

function windowQuery(from: string, to: string): string {
  return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

export async function fetchEquipmentTypes(
  filter: { q?: string; category?: string } = {}, signal?: AbortSignal,
): Promise<EquipmentType[]> {
  const query = new URLSearchParams();
  if (filter.q?.trim()) query.set('q', filter.q.trim());
  if (filter.category?.trim()) query.set('category', filter.category.trim());
  const text = query.toString();
  const suffix = text ? `?${text}` : '';
  return (await getJson<{ items: EquipmentType[] }>(`/api/equipment${suffix}`, signal)).items;
}

export function fetchEquipmentType(id: string, signal?: AbortSignal): Promise<EquipmentType> {
  return getJson<EquipmentType>(`/api/equipment/${encodeURIComponent(id)}`, signal);
}

export function createEquipmentType(input: EquipmentTypeInput): Promise<EquipmentType> {
  return postJson<EquipmentType>('/api/equipment', input);
}

export function updateEquipmentType(id: string, input: Partial<EquipmentTypeInput>): Promise<EquipmentType> {
  return patchJson<EquipmentType>(`/api/equipment/${encodeURIComponent(id)}`, input);
}

export function fetchEquipmentAvailability(
  id: string, from: string, to: string, signal?: AbortSignal,
): Promise<EquipmentAvailability> {
  return getJson<EquipmentAvailability>(
    `/api/equipment/${encodeURIComponent(id)}/availability?${windowQuery(from, to)}`, signal,
  );
}

/** Availability of every active type at once; used by the catalogue and the request form. */
export async function fetchAllEquipmentAvailability(
  from: string, to: string, signal?: AbortSignal,
): Promise<EquipmentAvailabilityItem[]> {
  // The route echoes the resolved window alongside the items; only the items are used here.
  const result = await getJson<{ from: string; to: string; items: EquipmentAvailabilityItem[] }>(
    `/api/equipment/availability?${windowQuery(from, to)}`, signal,
  );
  return result.items;
}
