import { describe, expect, it } from 'vitest';
import {
  aggregateEquipmentItems, equipmentInstant, equipmentPeriod, parseEquipmentAvailabilityInput,
} from '../../src/modules/equipment/availability-input.js';
import { assessEquipmentItem, peakEquipmentReservations } from '../../src/modules/equipment/availability-rules.js';
import type { EquipmentTypeSummary } from '../../src/modules/equipment/availability-types.js';

const typeId = '09000000-0000-4000-8000-000000000001';
const startsAt = '2027-01-01T10:00:00Z';
const endsAt = '2027-01-01T12:00:00Z';
const version = 'a'.repeat(64);
const valid = { mode: 'what-if', requirementsVersion: version, startsAt, endsAt,
  items: [{ equipmentTypeId: typeId, quantity: 1 }] };
const stock: EquipmentTypeSummary = {
  id: typeId, name: 'Projector', category: 'AV', totalQuantity: 20,
  damagedQuantity: 2, maintenanceQuantity: 3, isActive: true,
};
const reservation = (id: string, quantity: number, start: string, end: string) => ({
  id, quantity, equipmentTypeId: typeId, startsAt: `2027-01-01T${start}Z`, endsAt: `2027-01-01T${end}Z`,
});

describe('KAN-9 equipment input validation', () => {
  it('accepts saved mode without client requirement or exclusion overrides', () => {
    expect(parseEquipmentAvailabilityInput({ mode: 'saved', requirementsVersion: version }))
      .toEqual({ mode: 'saved', requirementsVersion: version });
  });
  it('combines duplicate IDs case-insensitively and accepts the database integer boundary', () => {
    const input = { ...valid, items: [
      { equipmentTypeId: 'aaaaaaaa-0000-4000-8000-000000000001', quantity: 2_147_483_646 },
      { equipmentTypeId: 'AAAAAAAA-0000-4000-8000-000000000001', quantity: 1 },
    ] };
    expect(parseEquipmentAvailabilityInput(input)).toMatchObject({ items: [
      { equipmentTypeId: 'aaaaaaaa-0000-4000-8000-000000000001', quantity: 2_147_483_647 },
    ] });
  });
  it.each([null, [], true, {}, { ...valid, mode: 'reserve' }, { ...valid, requirementsVersion: 'a' },
    { ...valid, requirementsVersion: null }, { ...valid, ignored: true },
    { mode: 'saved', requirementsVersion: version, excludedIds: [typeId] },
    { ...valid, items: [] }, { ...valid, items: null }, { ...valid, items: [null] },
    { ...valid, items: [{ equipmentTypeId: 'bad', quantity: 1 }] },
    { ...valid, items: [{ equipmentTypeId: typeId, quantity: '1' }] },
    { ...valid, items: [{ equipmentTypeId: typeId, quantity: 1, excludedIds: [] }] },
  ])('rejects malformed or unsupported input %#', input => {
    expect(() => parseEquipmentAvailabilityInput(input)).toThrow();
  });
  it.each([0, -1, 1.5, NaN, Infinity, 2_147_483_648, Number.MAX_SAFE_INTEGER + 1])(
    'rejects quantity %s', quantity => {
      expect(() => parseEquipmentAvailabilityInput({ ...valid, items: [{ equipmentTypeId: typeId, quantity }] })).toThrow();
    },
  );
  it('rejects duplicate totals above the database integer boundary', () => {
    expect(() => aggregateEquipmentItems([
      { equipmentTypeId: typeId, quantity: 2_147_483_647 }, { equipmentTypeId: typeId, quantity: 1 },
    ])).toThrow(/combined quantity/);
  });
  it.each([null, '2027-01-01', '2027-02-29T10:00Z', '1900-02-29T10:00Z',
    '0000-01-01T10:00Z', '2027-00-01T10:00Z', '2027-13-01T10:00Z',
    '2027-01-00T10:00Z', '2027-04-31T10:00Z', '2027-01-01T24:00Z',
    '2027-01-01T10:60Z', '2027-01-01T10:00:60Z', '2027-01-01T10:00+16:00',
    '2027-01-01T10:00+08:60', '2027-01-01T10:00:00.0000001Z',
    '0001-01-01T00:00+00:01', '9999-12-31T23:59:59-00:01'])('rejects invalid timestamp %s', value => {
    expect(() => equipmentInstant(value, 'startsAt')).toThrow();
  });
  it('handles leap years, old years, extreme offsets and exact microsecond equivalence', () => {
    expect(equipmentInstant('2028-02-29T10:00Z', 'date')).toBe(equipmentInstant('2028-02-29T18:00+08:00', 'date'));
    expect(equipmentInstant('2000-02-29T10:00Z', 'date')).toBeTypeOf('bigint');
    expect(equipmentInstant('0001-01-01T00:00Z', 'date')).toBe(-62_135_596_800_000_000n);
    expect(equipmentInstant('2027-01-02T01:59+15:59', 'date')).toBe(equipmentInstant(startsAt, 'date'));
    expect(equipmentInstant('2027-01-01T02:00:00.000001-08:00', 'date'))
      .toBe(equipmentInstant(startsAt, 'date') + 1n);
  });
  it('rejects reversed or empty periods but accepts a one-microsecond period', () => {
    expect(() => equipmentPeriod(endsAt, startsAt)).toThrow(/after/);
    expect(() => equipmentPeriod(startsAt, startsAt)).toThrow(/after/);
    expect(equipmentPeriod(startsAt, '2027-01-01T10:00:00.000001Z').end)
      .toBe(equipmentInstant(startsAt, 'date') + 1n);
  });
});

describe('KAN-9 half-open equipment availability rules', () => {
  it('deducts damaged and maintenance stock and permits exact fulfilment', () => {
    expect(assessEquipmentItem(stock, 15, [], startsAt, endsAt, new Set())).toMatchObject({
      totalQuantity: 20, damagedQuantity: 2, maintenanceQuantity: 3, operationalQuantity: 15,
      peakReservedQuantity: 0, availableQuantity: 15, shortfallQuantity: 0,
    });
  });
  it('uses the peak of overlapping reservations, not their aggregate quantity', () => {
    const rows = [reservation('a', 4, '09:00:00', '11:00:00'),
      reservation('b', 5, '11:00:00', '13:00:00'), reservation('c', 2, '10:30:00', '11:30:00')];
    expect(peakEquipmentReservations(rows, startsAt, endsAt)).toBe(7);
    expect(assessEquipmentItem(stock, 10, rows, startsAt, endsAt, new Set())).toMatchObject({
      availableQuantity: 8, shortfallQuantity: 2,
    });
  });
  it('clips enclosing reservations and excludes only exact reserved IDs supplied by the server', () => {
    const rows = [reservation('self', 4, '10:00:00', '12:00:00'), reservation('other', 3, '09:00:00', '13:00:00')];
    expect(peakEquipmentReservations(rows, startsAt, endsAt, new Set(['self']))).toBe(3);
    expect(peakEquipmentReservations(rows, startsAt, endsAt)).toBe(7);
  });
  it('treats exact adjacency as available but preserves a one-microsecond overlap', () => {
    const rows = [reservation('before', 5, '09:00:00', '10:00:00'),
      reservation('after', 8, '12:00:00', '13:00:00')];
    expect(peakEquipmentReservations(rows, startsAt, endsAt)).toBe(0);
    rows.push(reservation('micro', 2, '09:00:00', '10:00:00.000001'));
    expect(peakEquipmentReservations(rows, startsAt, endsAt)).toBe(2);
  });
  it('combines simultaneous starts and ends without briefly adding adjacent reservations', () => {
    expect(peakEquipmentReservations([
      reservation('a', 3, '10:00:00', '11:00:00'), reservation('b', 4, '10:00:00', '11:00:00'),
      reservation('c', 5, '11:00:00', '12:00:00'), reservation('d', 1, '11:00:00', '12:00:00'),
    ], startsAt, endsAt)).toBe(7);
  });
  it('reports inactive and zero stock as shortfalls and never returns negative availability', () => {
    expect(assessEquipmentItem({ ...stock, isActive: false }, 1, [], startsAt, endsAt, new Set()))
      .toMatchObject({ operationalQuantity: 0, availableQuantity: 0, shortfallQuantity: 1 });
    expect(assessEquipmentItem({ ...stock, totalQuantity: 0, damagedQuantity: 0, maintenanceQuantity: 0 },
      1, [reservation('other', 2, '10:00:00', '12:00:00')], startsAt, endsAt, new Set()))
      .toMatchObject({ availableQuantity: 0, shortfallQuantity: 1 });
  });
  it('separates equipment types when calculating competing demand', () => {
    expect(assessEquipmentItem(stock, 15, [{ ...reservation('other-type', 15, '10:00:00', '12:00:00'),
      equipmentTypeId: 'another-type' }], startsAt, endsAt, new Set())).toMatchObject({ shortfallQuantity: 0 });
  });
});
