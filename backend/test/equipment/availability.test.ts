import { describe, expect, it, vi } from 'vitest';
import {
  availableQuantity, computeReservedPeak, getEquipmentAvailability, listEquipmentAvailability,
} from '../../src/modules/equipment/availability.js';

const at = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 1, hour, minute)).toISOString();
const reservation = (from: number, to: number, quantity: number) =>
  ({ startsAt: at(from), endsAt: at(to), quantity });

describe('CF-16 reserved peak', () => {
  it('is zero without reservations or for an empty window', () => {
    expect(computeReservedPeak([], at(9), at(17))).toBe(0);
    expect(computeReservedPeak([reservation(9, 17, 4)], at(12), at(12))).toBe(0);
    expect(computeReservedPeak([reservation(9, 17, 4)], at(13), at(12))).toBe(0);
  });

  it('does not add back-to-back reservations together', () => {
    const rows = [reservation(9, 10, 6), reservation(10, 12, 6), reservation(12, 13, 5)];
    expect(computeReservedPeak(rows, at(9), at(13))).toBe(6);
  });

  it('adds reservations that really are simultaneous', () => {
    const rows = [reservation(9, 12, 3), reservation(11, 14, 4), reservation(13, 15, 2)];
    // 11:00-12:00 holds 3 + 4; 13:00-14:00 holds 4 + 2.
    expect(computeReservedPeak(rows, at(9), at(15))).toBe(7);
  });

  it('counts only the part of each reservation inside the window', () => {
    const rows = [reservation(8, 10, 5), reservation(9, 11, 2), reservation(16, 18, 9)];
    expect(computeReservedPeak(rows, at(10), at(16))).toBe(2);
    expect(computeReservedPeak(rows, at(9), at(10))).toBe(7);
    expect(computeReservedPeak(rows, at(15, 30), at(16, 30))).toBe(9);
  });

  it('treats intervals as half-open at both window edges', () => {
    expect(computeReservedPeak([reservation(8, 9, 5)], at(9), at(10))).toBe(0);
    expect(computeReservedPeak([reservation(10, 11, 5)], at(9), at(10))).toBe(0);
  });

  it('accepts dates, strings and epoch values, ignoring non-positive quantities', () => {
    const rows = [
      { startsAt: new Date(at(9)), endsAt: Date.parse(at(11)), quantity: 2 },
      { startsAt: at(9), endsAt: at(11), quantity: 0 },
    ];
    expect(computeReservedPeak(rows, new Date(at(9)), Date.parse(at(12)))).toBe(2);
  });

  it('never reports a negative available quantity', () => {
    expect(availableQuantity(10, 4)).toBe(6);
    expect(availableQuantity(3, 5)).toBe(0);
  });
});

describe('CF-16 availability reads', () => {
  const window = { from: new Date(at(9)), to: new Date(at(13)) };
  const typeId = '40000000-0000-4000-8000-000000000001';

  it('returns total, peak and available for one type', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ totalQuantity: 10, isActive: true }] })
      .mockResolvedValueOnce({ rows: [
        { id: 'a', equipmentTypeId: typeId, startsAt: new Date(at(9)), endsAt: new Date(at(10)), quantity: 6 },
        { id: 'b', equipmentTypeId: typeId, startsAt: new Date(at(10)), endsAt: new Date(at(12)), quantity: 6 },
      ] });
    await expect(getEquipmentAvailability({ query }, typeId, window, { includeInactive: false }))
      .resolves.toEqual({
        equipmentTypeId: typeId, from: at(9), to: at(13), totalQuantity: 10, reservedPeak: 6, available: 4,
      });
    expect(query.mock.calls[1]![1]).toEqual([[typeId], window.from, window.to, null]);
  });

  it('hides a missing or inactive type unless the caller may see inactive types', async () => {
    const missing = vi.fn().mockResolvedValue({ rows: [] });
    await expect(getEquipmentAvailability({ query: missing }, typeId, window, { includeInactive: true }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_NOT_FOUND' });
    const inactive = vi.fn().mockResolvedValue({ rows: [{ totalQuantity: 2, isActive: false }] });
    await expect(getEquipmentAvailability({ query: inactive }, typeId, window, { includeInactive: false }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_NOT_FOUND' });
    await expect(getEquipmentAvailability({ query: inactive }, typeId, window, { includeInactive: true }))
      .resolves.toMatchObject({ totalQuantity: 2, available: 2 });
  });

  it('lists every active type and skips the reservation query when there are none', async () => {
    const empty = vi.fn().mockResolvedValue({ rows: [] });
    await expect(listEquipmentAvailability({ query: empty }, window)).resolves.toEqual([]);
    expect(empty).toHaveBeenCalledOnce();

    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [
        { id: typeId, name: 'Projector', category: 'AV', totalQuantity: 3 },
        { id: 'other', name: 'Speaker', category: null, totalQuantity: 0 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { id: 'a', equipmentTypeId: typeId, startsAt: new Date(at(8)), endsAt: new Date(at(11)), quantity: 5 },
      ] });
    const items = await listEquipmentAvailability({ query }, window);
    expect(items.map((item) => [item.name, item.reservedPeak, item.available]))
      .toEqual([['Projector', 5, 0], ['Speaker', 0, 0]]);
  });
});
