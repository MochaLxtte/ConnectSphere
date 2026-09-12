import { describe, expect, it } from 'vitest';
import { parseDraftUpdateInput, DraftUpdateInputError } from '../../src/modules/events/draft-update-input.js';

describe('KAN-34 draft update input', () => {
  it('accepts a single valid field', () => {
    expect(parseDraftUpdateInput({ name: 'Career Fair' })).toEqual({ name: 'Career Fair' });
  });

  it('accepts every permitted draft field together', () => {
    const input = {
      name: 'Career Fair', purpose: 'Recruitment', description: 'Annual event',
      startsAt: '2026-10-01T09:00:00.000Z', endsAt: '2026-10-01T17:00:00.000Z',
      expectedAttendance: 250, venueRequirements: 'Hall A',
      accessibilityNeeds: 'Wheelchair access', equipmentRequirements: 'Projector',
      registrationRequired: true,
    };
    expect(parseDraftUpdateInput(input)).toEqual(input);
  });

  it('omits a field entirely from the result when the caller does not supply it', () => {
    const result = parseDraftUpdateInput({ name: 'Career Fair' });
    expect(result).not.toHaveProperty('purpose');
    expect(Object.keys(result)).toEqual(['name']);
  });

  it.each(['name', 'purpose', 'description', 'venueRequirements', 'accessibilityNeeds', 'equipmentRequirements', 'startsAt', 'endsAt', 'expectedAttendance', 'registrationRequired'])(
    'accepts an explicit null for %s to clear it',
    (field) => {
      expect(parseDraftUpdateInput({ [field]: null })).toEqual({ [field]: null });
    },
  );

  it('does not mutate or retain a reference to the supplied object', () => {
    const input = Object.freeze({ name: '  Career Fair  ' });
    expect(() => parseDraftUpdateInput(input)).not.toThrow();
    expect(input.name).toBe('  Career Fair  ');
  });

  it.each([undefined, null, [], 'name', 42, true])('rejects a non-object body: %j', (body) => {
    expect(() => parseDraftUpdateInput(body)).toThrow(DraftUpdateInputError);
  });

  it('rejects an empty object with no fields to change', () => {
    expect(() => parseDraftUpdateInput({})).toThrow('At least one field must be supplied.');
  });

  it.each(['id', 'organiserId', 'coordinatorId', 'status', 'createdAt', 'updatedAt', 'unexpected'])(
    'rejects a caller-supplied %s field',
    (field) => {
      expect(() => parseDraftUpdateInput({ name: 'Career Fair', [field]: 'forged' })).toThrow(
        `Unsupported field: ${field}.`,
      );
    },
  );

  it.each(['name', 'purpose', 'description', 'venueRequirements', 'accessibilityNeeds', 'equipmentRequirements'])(
    'rejects a non-text %s',
    (field) => {
      expect(() => parseDraftUpdateInput({ [field]: 42 })).toThrow(`${field} must be text or null.`);
    },
  );

  it.each([-1, 1.5, 'a lot', true])('rejects an invalid expectedAttendance: %j', (expectedAttendance) => {
    expect(() => parseDraftUpdateInput({ expectedAttendance })).toThrow(
      'expectedAttendance must be a non-negative whole number or null.',
    );
  });

  it.each(['not-a-date', '', 42, true])('rejects an invalid startsAt: %j', (startsAt) => {
    expect(() => parseDraftUpdateInput({ startsAt })).toThrow(
      'startsAt must be an ISO 8601 date-time string or null.',
    );
  });

  it.each(['not-a-date', '', 42, true])('rejects an invalid endsAt: %j', (endsAt) => {
    expect(() => parseDraftUpdateInput({ endsAt })).toThrow(
      'endsAt must be an ISO 8601 date-time string or null.',
    );
  });

  it.each(['yes', 1, 0])('rejects a non-boolean registrationRequired: %j', (registrationRequired) => {
    expect(() => parseDraftUpdateInput({ registrationRequired })).toThrow(
      'registrationRequired must be true, false or null.',
    );
  });
});
