import { describe, expect, it } from 'vitest';
import { equipmentInputInstant, equipmentInputTime, equipmentWhatIfInput } from './availability-form';

const types = [{ id: 'projector', name: 'Projector', category: null, totalQuantity: 10,
  damagedQuantity: 2, maintenanceQuantity: 1, isActive: true }];
const row = { equipmentTypeId: 'projector', quantity: '3' };
describe('KAN-9 strict Singapore equipment check inputs', () => {
  it.each(['2028-02-29T10:00', '2000-02-29T00:00:00', '0001-01-01T00:00', '9999-12-31T23:59:59.999999'])(
    'accepts the actual calendar instant %s without dropping precision', (value) => {
      expect(equipmentInputInstant(value)).toBe(`${value}+08:00`);
    });
  it.each(['', '2026-02-30T10:00', '2026-02-29T10:00', '1900-02-29T10:00', '2028-04-31T10:00',
    '0000-01-01T10:00', '2026-00-01T10:00', '2026-13-01T10:00', '2026-01-00T10:00', '2026-01-01T24:00',
    '2026-01-01T10:60', '2026-01-01T10:00:60', '2026-01-01T10:00:00.1234567', '2026-01-01T10:00Z', 'tomorrow'])(
    'rejects the impossible or malformed value %s', (value) => expect(equipmentInputInstant(value)).toBeNull());
  it('prefills Singapore wall time including microseconds across the day boundary', () => {
    expect(equipmentInputTime('2026-11-01T20:00:00.123456Z')).toBe('2026-11-02T04:00:00.123456');
    expect(equipmentInputTime('2026-11-01T10:00:00+08:00')).toBe('2026-11-01T10:00:00');
    expect(equipmentInputTime(null)).toBe(''); expect(equipmentInputTime('invalid')).toBe('');
  });
  it('preserves a positive microsecond window and structured requirements', () => {
    expect(equipmentWhatIfInput('2026-11-01T10:00:00.123456', '2026-11-01T10:00:00.123457', [row], types, 'version').input)
      .toEqual({ mode: 'what-if', requirementsVersion: 'version', startsAt: '2026-11-01T10:00:00.123456+08:00',
        endsAt: '2026-11-01T10:00:00.123457+08:00', items: [{ equipmentTypeId: 'projector', quantity: 3 }] });
  });
  it.each(['2026-11-01T10:00', '2026-11-01T09:59:59.999999', 'invalid'])(
    'rejects invalid, equal or reversed end %s', (end) => {
      const result = equipmentWhatIfInput('2026-11-01T10:00', end, [row], types, 'v');
      expect(result.input).toBeNull(); expect(result.errors.endsAt).toBeTruthy();
    });
  it('reports invalid start, absent items and unknown catalogue selection at the relevant fields', () => {
    const empty = equipmentWhatIfInput('2026-02-30T10:00', '2026-11-01T12:00', [], types, 'v');
    expect(empty.errors.startsAt).toContain('valid start'); expect(empty.errors.items).toContain('at least one');
    expect(empty.input).toBeNull();
    expect(equipmentWhatIfInput('2026-11-01T10:00', '2026-11-01T12:00', [{ ...row, equipmentTypeId: 'missing' }], types, 'v')
      .errors.rows[0]?.equipmentTypeId).toContain('Choose');
  });
  it.each(['', '0', '-1', '1.5', '1e2', 'Infinity', '2147483648', '9007199254740992', ' 1 '])(
    'refuses invalid quantity %s', (quantity) => {
      const result = equipmentWhatIfInput('2026-11-01T10:00', '2026-11-01T12:00', [{ ...row, quantity }], types, 'v');
      expect(result.input).toBeNull(); expect(result.errors.rows[0]?.quantity).toContain('whole quantity');
    });
  it('accepts the integer boundary but rejects duplicate totals exceeding it', () => {
    const maximum = { ...row, quantity: '2147483647' };
    expect(equipmentWhatIfInput('2026-11-01T10:00', '2026-11-01T12:00', [maximum], types, 'v').input).not.toBeNull();
    const overflow = equipmentWhatIfInput('2026-11-01T10:00', '2026-11-01T12:00', [maximum, row], types, 'v');
    expect(overflow.input).toBeNull(); expect(overflow.errors.rows[1]?.quantity).toContain('combined quantity');
  });
});
