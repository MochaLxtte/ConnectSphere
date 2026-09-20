import type { Pool, PoolClient } from 'pg';
import { EquipmentNotFoundError } from './errors.js';
import type { EquipmentAvailability, EquipmentAvailabilityItem } from './types.js';

type Queryable = Pick<Pool | PoolClient, 'query'>;

export interface ReservedInterval {
  startsAt: Date | string | number;
  endsAt: Date | string | number;
  quantity: number;
}

export interface AvailabilityWindow {
  from: Date;
  to: Date;
}

function toMillis(value: Date | string | number): number {
  return value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
}

/**
 * CF-16: the highest simultaneous reserved quantity inside the half-open window [from, to).
 * Sweeps the interval boundaries instead of summing every overlapping reservation, so two
 * back-to-back reservations inside the window are not counted at the same time.
 */
export function computeReservedPeak(
  reservations: readonly ReservedInterval[],
  from: Date | string | number,
  to: Date | string | number,
): number {
  const windowStart = toMillis(from);
  const windowEnd = toMillis(to);
  if (!(windowEnd > windowStart)) return 0;

  const boundaries: { at: number; change: number }[] = [];
  for (const reservation of reservations) {
    const start = Math.max(toMillis(reservation.startsAt), windowStart);
    const end = Math.min(toMillis(reservation.endsAt), windowEnd);
    if (!(end > start) || !(reservation.quantity > 0)) continue;
    boundaries.push({ at: start, change: reservation.quantity }, { at: end, change: -reservation.quantity });
  }
  // Releases sort before pick-ups at the same instant because intervals are half-open.
  boundaries.sort((a, b) => a.at - b.at || a.change - b.change);

  let current = 0;
  let peak = 0;
  for (const boundary of boundaries) {
    current += boundary.change;
    if (current > peak) peak = current;
  }
  return peak;
}

export function availableQuantity(totalQuantity: number, reservedPeak: number): number {
  return Math.max(0, totalQuantity - reservedPeak);
}

export interface ReservedRow {
  id: string;
  equipmentTypeId: string;
  startsAt: Date;
  endsAt: Date;
  quantity: number;
}

/** RESERVED rows overlapping the window, optionally ignoring one request (the one being decided). */
export async function readReservedIntervals(
  database: Queryable,
  equipmentTypeIds: readonly string[],
  window: AvailabilityWindow,
  excludeRequestId: string | null = null,
): Promise<Map<string, ReservedRow[]>> {
  const grouped = new Map<string, ReservedRow[]>();
  if (equipmentTypeIds.length === 0) return grouped;
  const result = await database.query<ReservedRow>(`
    SELECT id, equipment_type_id AS "equipmentTypeId", starts_at AS "startsAt", ends_at AS "endsAt", quantity
    FROM equipment_requests
    WHERE equipment_type_id = ANY($1::uuid[]) AND status = 'RESERVED'
      AND starts_at < $3 AND ends_at > $2
      AND ($4::uuid IS NULL OR id <> $4::uuid)
  `, [equipmentTypeIds, window.from, window.to, excludeRequestId]);
  for (const row of result.rows) {
    const rows = grouped.get(row.equipmentTypeId);
    if (rows) rows.push(row);
    else grouped.set(row.equipmentTypeId, [row]);
  }
  return grouped;
}

/** CF-16: availability of one type. Inactive types are visible to Technical Support only. */
export async function getEquipmentAvailability(
  database: Queryable,
  equipmentTypeId: string,
  window: AvailabilityWindow,
  options: { includeInactive: boolean },
): Promise<EquipmentAvailability> {
  const types = await database.query<{ totalQuantity: number; isActive: boolean }>(`
    SELECT total_quantity AS "totalQuantity", is_active AS "isActive"
    FROM equipment_types WHERE id = $1
  `, [equipmentTypeId]);
  const type = types.rows[0];
  if (!type || (!type.isActive && !options.includeInactive)) {
    throw new EquipmentNotFoundError('EQUIPMENT_NOT_FOUND');
  }
  const reserved = await readReservedIntervals(database, [equipmentTypeId], window);
  const reservedPeak = computeReservedPeak(reserved.get(equipmentTypeId) ?? [], window.from, window.to);
  return {
    equipmentTypeId,
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    totalQuantity: type.totalQuantity,
    reservedPeak,
    available: availableQuantity(type.totalQuantity, reservedPeak),
  };
}

/** CF-16: availability of every active type for one period; feeds the request form's picker. */
export async function listEquipmentAvailability(
  database: Queryable,
  window: AvailabilityWindow,
): Promise<EquipmentAvailabilityItem[]> {
  const types = await database.query<{
    id: string; name: string; category: string | null; totalQuantity: number;
  }>(`
    SELECT id, name, category, total_quantity AS "totalQuantity"
    FROM equipment_types WHERE is_active ORDER BY lower(name), id
  `);
  const reserved = await readReservedIntervals(database, types.rows.map((type) => type.id), window);
  return types.rows.map((type) => {
    const reservedPeak = computeReservedPeak(reserved.get(type.id) ?? [], window.from, window.to);
    return {
      equipmentTypeId: type.id,
      name: type.name,
      category: type.category,
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      totalQuantity: type.totalQuantity,
      reservedPeak,
      available: availableQuantity(type.totalQuantity, reservedPeak),
    };
  });
}
