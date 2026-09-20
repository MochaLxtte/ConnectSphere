import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api-client';
import {
  availabilityLabel, equipmentErrorMessage, equipmentStatusLabel, formatEquipmentTime, fromSingaporeInput,
  isSessionExpired, toSingaporeInput,
} from './presentation';

describe('equipment presentation helpers', () => {
  it('converts between ISO instants and Singapore form values', () => {
    expect(toSingaporeInput('2026-10-01T01:00:00.000Z')).toBe('2026-10-01T09:00');
    expect(toSingaporeInput('2026-12-31T18:30:00Z')).toBe('2027-01-01T02:30');
    expect(fromSingaporeInput('2026-10-01T09:00')).toBe('2026-10-01T01:00:00.000Z');
    expect(fromSingaporeInput('2026-10-01T09:00:30')).toBe('2026-10-01T01:00:00.000Z');
    expect(toSingaporeInput(null)).toBe('');
    expect(toSingaporeInput('nonsense')).toBe('');
    expect(fromSingaporeInput('')).toBeNull();
    expect(fromSingaporeInput('2026-13-40T09:00')).toBeNull();
  });

  it('labels statuses, times and availability', () => {
    expect(equipmentStatusLabel('REQUESTED')).toBe('Awaiting decision');
    expect(equipmentStatusLabel('SOMETHING')).toBe('Status unavailable');
    expect(formatEquipmentTime('2026-10-01T01:00:00.000Z')).toContain('1 Oct 2026');
    expect(formatEquipmentTime(null)).toBe('Not provided');
    expect(formatEquipmentTime('nonsense')).toBe('Time unavailable');
    expect(availabilityLabel(3, 4)).toBe('3 of 4 available');
  });

  it('maps API errors to messages', () => {
    expect(equipmentErrorMessage(new ApiError('Server text', 409, 'EQUIPMENT_UNAVAILABLE'), 'Fallback')).toBe('Server text');
    expect(equipmentErrorMessage(new ApiError('x', 404, 'EQUIPMENT_REQUEST_NOT_FOUND'), 'Fallback')).toContain('unavailable');
    expect(equipmentErrorMessage(new Error('boom'), 'Fallback')).toBe('Fallback');
    expect(isSessionExpired(new ApiError('x', 401, 'AUTHENTICATION_REQUIRED'))).toBe(true);
    expect(isSessionExpired(new ApiError('x', 403, 'FORBIDDEN'))).toBe(false);
  });
});
