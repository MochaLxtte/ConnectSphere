import { describe, expect, it } from 'vitest';
import { parseDraftCreateInput, parseDraftUpdateInput, DraftUpdateInputError } from '../../src/modules/events/draft-update-input.js';

describe('KAN-34 draft update input', () => {
  it.each(['0000-01-01', '2026-02-30', '2026-02-29', '1900-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00'])(
    'KAN-34-AC101 refuses impossible date %s for every editable date', (day) => {
      for (const field of ['startsAt', 'endsAt', 'registrationOpensAt', 'registrationClosesAt']) {
        expect(() => parseDraftUpdateInput({ [field]: `${day}T10:00:00+08:00` })).toThrow(DraftUpdateInputError);
        expect(() => parseDraftCreateInput({ [field]: `${day}T10:00:00+08:00` })).toThrow(DraftUpdateInputError);
      }
    },
  );
  it.each(['+16:00', '-16:00', '+23:59', '-23:59'])(
    'KAN-34-AC101 refuses PostgreSQL-invalid offset %s in new and edited drafts', (offset) => {
      for (const field of ['startsAt', 'endsAt', 'registrationOpensAt', 'registrationClosesAt']) {
        const input = { [field]: `2026-01-01T12:00:00${offset}` };
        expect(() => parseDraftUpdateInput(input)).toThrow(DraftUpdateInputError);
        expect(() => parseDraftCreateInput(input)).toThrow(DraftUpdateInputError);
      }
    },
  );
  it.each(['0001-01-01T00:00:00Z', '9999-12-31T23:59:59Z', '2026-01-01T12:00:00+15:59', '2026-01-01T12:00:00-15:59'])(
    'KAN-34-AC101 accepts database-supported year and offset boundaries: %s', (date) => {
      for (const field of ['startsAt', 'endsAt', 'registrationOpensAt', 'registrationClosesAt']) {
        const input = { [field]: date };
        expect(parseDraftUpdateInput(input)).toEqual(input);
        expect(parseDraftCreateInput(input)).toEqual(input);
      }
    },
  );
  it.each(['2028-02-29T10:00:00+08:00', '2000-02-29T00:00:00Z', '2026-04-30T23:59:59.999Z', '0099-01-01T12:30Z'])(
    'KAN-34-AC101 accepts real calendar dates without changing their offset: %s', (startsAt) => {
      expect(parseDraftUpdateInput({ startsAt })).toEqual({ startsAt });
    },
  );
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

  it('accepts the registration settings together', () => {
    const input = {
      registrationRequired: true, registrationCapacity: 120,
      registrationOpensAt: '2026-09-20T01:00:00.000Z', registrationClosesAt: '2026-09-30T15:59:00.000Z',
    };
    expect(parseDraftUpdateInput(input)).toEqual(input);
  });

  it.each(['registrationCapacity', 'registrationOpensAt', 'registrationClosesAt'])(
    'accepts an explicit null for %s to clear it',
    (field) => {
      expect(parseDraftUpdateInput({ [field]: null })).toEqual({ [field]: null });
    },
  );

  it('accepts a registration capacity of zero', () => {
    expect(parseDraftUpdateInput({ registrationCapacity: 0 })).toEqual({ registrationCapacity: 0 });
  });

  it.each([-1, 1.5, '50', true, 2_147_483_648])(
    'rejects an invalid registrationCapacity: %j',
    (registrationCapacity) => {
      expect(() => parseDraftUpdateInput({ registrationCapacity })).toThrow(
        'registrationCapacity must be a non-negative whole number or null.',
      );
    },
  );

  it('rejects an expectedAttendance the database cannot store', () => {
    expect(() => parseDraftUpdateInput({ expectedAttendance: 2_147_483_648 })).toThrow(
      'expectedAttendance must be a non-negative whole number or null.',
    );
  });

  it.each(['registrationOpensAt', 'registrationClosesAt'])('rejects an invalid %s', (field) => {
    for (const value of ['not-a-date', '', 42, true]) {
      expect(() => parseDraftUpdateInput({ [field]: value })).toThrow(
        `${field} must be an ISO 8601 date-time string or null.`,
      );
    }
  });
});

describe('CF-02 draft creation input', () => {
  it.each([undefined, {}])('allows a new draft to start empty: %j', (body) => {
    expect(parseDraftCreateInput(body)).toEqual({});
  });

  it('applies the draft update rules to supplied fields', () => {
    expect(parseDraftCreateInput({ name: 'Career Fair', expectedAttendance: 250 })).toEqual({
      name: 'Career Fair', expectedAttendance: 250,
    });
    expect(() => parseDraftCreateInput({ name: 42 })).toThrow('name must be text or null.');
  });

  it.each([null, [], 'name', 42, true])('rejects a non-object body: %j', (body) => {
    expect(() => parseDraftCreateInput(body)).toThrow(DraftUpdateInputError);
  });

  it.each(['id', 'organiserId', 'coordinatorId', 'status', 'createdAt', 'updatedAt'])(
    'rejects a caller-supplied %s field',
    (field) => {
      expect(() => parseDraftCreateInput({ name: 'Career Fair', [field]: 'forged' })).toThrow(
        `Unsupported field: ${field}.`,
      );
    },
  );
});

describe('KAN-34-AC101 strict calendar-date draft validation', () => {
  const dateFields = ['startsAt', 'endsAt', 'registrationOpensAt', 'registrationClosesAt'] as const;

  it.each([
    '2026-02-30T09:00:00Z', '2027-02-29T09:00:00Z', '2026-04-31T09:00:00Z', '2026-13-01T09:00:00Z',
    '2026-00-10T09:00:00Z', '2026-01-32T09:00:00Z', '2026-01-00T09:00:00Z', '1900-02-29T09:00:00Z',
  ])('rejects the impossible calendar date %s', (startsAt) => {
    expect(() => parseDraftUpdateInput({ startsAt })).toThrow(
      'startsAt must be an ISO 8601 date-time string or null.',
    );
  });

  it.each([
    '2026-10-01T24:00:00Z', '2026-10-01T09:60:00Z', '2026-10-01T09:00:60Z',
    '2026-10-01T09:00:00+24:00', '2026-10-01T09:00:00+08:60',
  ])('rejects the impossible time or offset %s', (startsAt) => {
    expect(() => parseDraftUpdateInput({ startsAt })).toThrow(DraftUpdateInputError);
  });

  it.each([
    '2026-10-01T09:00:00', '2026-10-01', '2026-10-01 09:00:00Z', 'October 1, 2026 09:00 UTC',
    ' 2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z ', '+002026-10-01T09:00:00Z', '2026-10-01T09:00:00.000+0800', '2026-10-01t09:00:00z',
  ])('rejects a value that is not an ISO 8601 date-time with an offset: %j', (startsAt) => {
    expect(() => parseDraftUpdateInput({ startsAt })).toThrow(DraftUpdateInputError);
  });

  it.each([
    '2028-02-29T09:00:00Z', '2000-02-29T09:00:00Z', '2028-02-29T17:00:00+08:00', '2026-12-31T23:59:59.999Z',
    '2026-10-01T09:00Z', '2026-10-01T09:00:00.000Z', '2026-10-01T09:00:00-05:30',
  ])('accepts the real date-time %s', (startsAt) => {
    expect(parseDraftUpdateInput({ startsAt })).toEqual({ startsAt });
  });

  it.each(dateFields)('applies the calendar check to %s on update and create', (field) => {
    const message = `${field} must be an ISO 8601 date-time string or null.`;
    expect(() => parseDraftUpdateInput({ [field]: '2027-02-29T09:00:00Z' })).toThrow(message);
    expect(() => parseDraftCreateInput({ [field]: '2027-02-29T09:00:00Z' })).toThrow(message);
  });
});
