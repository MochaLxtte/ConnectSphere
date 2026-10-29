import { peakEquipmentReservations, type EquipmentReservation } from './availability-rules.js';
import type { EquipmentStockStatus } from './stock-types.js';

export interface StockQuantities {
  isActive: boolean;
  totalQuantity: number;
  damagedQuantity: number;
  maintenanceQuantity: number;
}

/** The figure KAN-9 availability and KAN-26 reservation already use: an inactive type has none. */
export function operationalQuantity(stock: StockQuantities): number {
  return stock.isActive ? stock.totalQuantity - stock.damagedQuantity - stock.maintenanceQuantity : 0;
}

export function stockStatus(stock: StockQuantities): EquipmentStockStatus {
  const operational = operationalQuantity(stock);
  if (operational <= 0) return 'UNAVAILABLE';
  return stock.damagedQuantity + stock.maintenanceQuantity > 0 ? 'PARTLY_UNAVAILABLE' : 'AVAILABLE';
}

export interface ReservedLine extends EquipmentReservation {
  eventId: string;
}

export interface LineShortfall {
  eventId: string;
  reservedQuantity: number;
  peakReservedQuantity: number;
  shortfallQuantity: number;
}

/**
 * Which events hold reservations that the operational stock no longer covers. A line is affected when,
 * at some instant of its own period, everything reserved at once is more than the operational stock.
 * Reservations are never changed here; this only reports the gap (KAN-18-AC102). An event with several
 * lines is reported once, at its largest gap.
 */
export function findStockShortfalls(operational: number, lines: readonly ReservedLine[]): LineShortfall[] {
  const byEvent = new Map<string, LineShortfall>();
  for (const line of lines) {
    const peak = peakEquipmentReservations(lines, line.startsAt, line.endsAt);
    const shortfall = peak - operational;
    if (shortfall <= 0) continue;
    const reserved = lines.filter(other => other.eventId === line.eventId).reduce((sum, other) => sum + other.quantity, 0);
    const existing = byEvent.get(line.eventId);
    if (!existing || shortfall > existing.shortfallQuantity) {
      byEvent.set(line.eventId, { eventId: line.eventId, reservedQuantity: reserved, peakReservedQuantity: peak, shortfallQuantity: shortfall });
    }
  }
  return [...byEvent.values()].sort((a, b) => a.eventId < b.eventId ? -1 : 1);
}
