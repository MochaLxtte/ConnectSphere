import { equipmentInstant, equipmentPeriod } from './availability-input.js';
import type { EquipmentAvailabilityItem, EquipmentTypeSummary } from './availability-types.js';

export interface EquipmentReservation {
  id: string;
  equipmentTypeId: string;
  quantity: number;
  startsAt: string;
  endsAt: string;
}

/** Maximum concurrent demand in [start, end), never a sum of nonconcurrent bookings. */
export function peakEquipmentReservations(
  reservations: readonly EquipmentReservation[], startsAt: string, endsAt: string,
  excludedIds: ReadonlySet<string> = new Set(),
): number {
  const { start, end } = equipmentPeriod(startsAt, endsAt);
  const changes = new Map<bigint, number>();
  for (const reservation of reservations) {
    if (excludedIds.has(reservation.id)) continue;
    const reservationStart = equipmentInstant(reservation.startsAt, 'reservation.startsAt');
    const reservationEnd = equipmentInstant(reservation.endsAt, 'reservation.endsAt');
    if (reservationStart >= end || reservationEnd <= start) continue;
    const clippedStart = reservationStart < start ? start : reservationStart;
    const clippedEnd = reservationEnd > end ? end : reservationEnd;
    changes.set(clippedStart, (changes.get(clippedStart) ?? 0) + reservation.quantity);
    changes.set(clippedEnd, (changes.get(clippedEnd) ?? 0) - reservation.quantity);
  }
  let current = 0;
  let peak = 0;
  // A Map has unique instants; same-instant starts and ends already share one delta.
  for (const [, change] of [...changes].sort(([a], [b]) => a < b ? -1 : 1)) {
    current += change;
    peak = Math.max(peak, current);
  }
  return peak;
}

export function assessEquipmentItem(
  type: EquipmentTypeSummary, requestedQuantity: number,
  reservations: readonly EquipmentReservation[], startsAt: string, endsAt: string,
  excludedIds: ReadonlySet<string>,
): EquipmentAvailabilityItem {
  const operationalQuantity = type.isActive
    ? type.totalQuantity - type.damagedQuantity - type.maintenanceQuantity : 0;
  const peakReservedQuantity = peakEquipmentReservations(
    reservations.filter(reservation => reservation.equipmentTypeId === type.id), startsAt, endsAt, excludedIds,
  );
  const availableQuantity = Math.max(0, operationalQuantity - peakReservedQuantity);
  return {
    equipmentTypeId: type.id, equipmentTypeName: type.name, requestedQuantity,
    totalQuantity: type.totalQuantity, damagedQuantity: type.damagedQuantity,
    maintenanceQuantity: type.maintenanceQuantity, operationalQuantity, peakReservedQuantity,
    availableQuantity, shortfallQuantity: Math.max(0, requestedQuantity - availableQuantity), isActive: type.isActive,
  };
}
