import { describe, expect, it } from 'vitest';
import { findStockShortfalls, operationalQuantity, stockStatus, type ReservedLine } from '../../src/modules/equipment/stock-rules.js';

const stock = (over: Partial<Parameters<typeof operationalQuantity>[0]> = {}) =>
  ({ isActive: true, totalQuantity: 10, damagedQuantity: 0, maintenanceQuantity: 0, ...over });
const line = (id: string, eventId: string, quantity: number, from: string, to: string): ReservedLine => ({
  id, eventId, equipmentTypeId: 'type', quantity,
  startsAt: `2031-01-12T${from}:00.000000Z`, endsAt: `2031-01-12T${to}:00.000000Z`,
});

describe('KAN-18 operational quantity and status', () => {
  it('KAN-18-AC4 counts only units that are neither damaged nor under maintenance', () => {
    expect(operationalQuantity(stock())).toBe(10);
    expect(operationalQuantity(stock({ damagedQuantity: 2, maintenanceQuantity: 3 }))).toBe(5);
    expect(operationalQuantity(stock({ damagedQuantity: 4, maintenanceQuantity: 6 }))).toBe(0);
  });
  it('treats an inactive type as having no operational units, as availability checks do', () => {
    expect(operationalQuantity(stock({ isActive: false }))).toBe(0);
    expect(stockStatus(stock({ isActive: false }))).toBe('UNAVAILABLE');
  });
  it('KAN-18-AC1 labels full, partly unavailable and wholly unavailable stock', () => {
    expect(stockStatus(stock())).toBe('AVAILABLE');
    expect(stockStatus(stock({ maintenanceQuantity: 1 }))).toBe('PARTLY_UNAVAILABLE');
    expect(stockStatus(stock({ damagedQuantity: 1 }))).toBe('PARTLY_UNAVAILABLE');
    expect(stockStatus(stock({ damagedQuantity: 6, maintenanceQuantity: 4 }))).toBe('UNAVAILABLE');
    expect(stockStatus(stock({ totalQuantity: 0 }))).toBe('UNAVAILABLE');
  });
});

describe('KAN-18-AC102 stock shortfalls keep reservations and name the gap', () => {
  it('reports nothing while operational stock covers everything reserved at once', () => {
    expect(findStockShortfalls(10, [line('a', 'e1', 6, '02:00', '06:00'), line('b', 'e2', 4, '02:00', '06:00')])).toEqual([]);
    expect(findStockShortfalls(6, [line('a', 'e1', 6, '02:00', '06:00')])).toEqual([]);
  });
  it('reports a single event whose reservation exceeds operational stock', () => {
    expect(findStockShortfalls(4, [line('a', 'e1', 6, '02:00', '06:00')]))
      .toEqual([{ eventId: 'e1', reservedQuantity: 6, peakReservedQuantity: 6, shortfallQuantity: 2 }]);
  });
  it('reports every event that overlaps in the over-reserved period', () => {
    const found = findStockShortfalls(8, [line('a', 'e1', 6, '02:00', '06:00'), line('b', 'e2', 4, '04:00', '08:00')]);
    expect(found.map(item => [item.eventId, item.shortfallQuantity, item.peakReservedQuantity])).toEqual([['e1', 2, 10], ['e2', 2, 10]]);
  });
  it('does not flag an event whose own period is covered even if another period is not', () => {
    const lines = [line('a', 'e1', 6, '02:00', '04:00'), line('b', 'e2', 6, '03:00', '05:00'), line('c', 'e3', 3, '08:00', '10:00')];
    expect(findStockShortfalls(8, lines).map(item => item.eventId)).toEqual(['e1', 'e2']);
  });
  it('treats back-to-back periods as separate, not simultaneous', () => {
    expect(findStockShortfalls(6, [line('a', 'e1', 6, '02:00', '04:00'), line('b', 'e2', 6, '04:00', '06:00')])).toEqual([]);
  });
  it('reports an event with several lines once, at its largest gap, with its total reserved quantity', () => {
    const found = findStockShortfalls(5, [line('a', 'e1', 4, '02:00', '04:00'), line('b', 'e1', 3, '05:00', '07:00')]);
    expect(found).toEqual([]);
    const gap = findStockShortfalls(2, [line('a', 'e1', 4, '02:00', '04:00'), line('b', 'e1', 3, '05:00', '07:00')]);
    expect(gap).toEqual([{ eventId: 'e1', reservedQuantity: 7, peakReservedQuantity: 4, shortfallQuantity: 2 }]);
  });
  it('reports every reservation when no unit is operational', () => {
    const found = findStockShortfalls(0, [line('a', 'e1', 1, '02:00', '04:00'), line('b', 'e2', 2, '08:00', '09:00')]);
    expect(found.map(item => [item.eventId, item.shortfallQuantity])).toEqual([['e1', 1], ['e2', 2]]);
  });
  it('returns events in a stable order', () => {
    const found = findStockShortfalls(0, [line('b', 'e2', 1, '02:00', '04:00'), line('a', 'e1', 1, '02:00', '04:00')]);
    expect(found.map(item => item.eventId)).toEqual(['e1', 'e2']);
  });
});
