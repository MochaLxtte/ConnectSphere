import { describe, expect, it } from 'vitest';
import {
  assertOperatingHoursOrdered,
  MAX_LABEL_LENGTH,
  MAX_LABELS,
  MAX_LOCATION_LENGTH,
  MAX_VENUE_CAPACITY,
  MAX_BUFFER_MINUTES,
  parseVenueCatalogueRequest,
  parseVenueCatalogueUpdate,
} from '../../src/modules/venues/venue-catalogue-input.js';

const codeOf = (action: () => unknown) => {
  try {
    action();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
};

describe('KAN-50 venue catalogue update input: normal cases (AC3-AC8, AC11)', () => {
  it('accepts every editable field together and returns only what was supplied', () => {
    expect(parseVenueCatalogueUpdate({
      location: 'Level 2, Block B', capacity: 120, facilities: ['Projector', 'Wi-Fi'],
      accessibilityFeatures: ['Step-free entrance'], wheelchairAccessible: true,
      layouts: ['Theatre', 'Classroom'], opensAt: '08:00', closesAt: '22:00',
    })).toEqual({
      location: 'Level 2, Block B', capacity: 120, facilities: ['Projector', 'Wi-Fi'],
      accessibilityFeatures: ['Step-free entrance'], wheelchairAccessible: true,
      layouts: ['Theatre', 'Classroom'], opensAt: '08:00', closesAt: '22:00',
    });
  });

  it.each([
    [{ location: 'Annex' }, ['location']],
    [{ capacity: 40 }, ['capacity']],
    [{ layouts: ['U-shape'] }, ['layouts']],
    [{ wheelchairAccessible: false }, ['wheelchairAccessible']],
  ])('leaves omitted fields out so they stay unchanged: %j', (input, keys) => {
    expect(Object.keys(parseVenueCatalogueUpdate(input))).toEqual(keys);
  });

  it('supports more than one layout for the same venue (AC11)', () => {
    expect(parseVenueCatalogueUpdate({ layouts: ['Theatre', 'Banquet', 'Boardroom'] }).layouts)
      .toEqual(['Theatre', 'Banquet', 'Boardroom']);
  });

  it('trims labels and drops case-insensitive duplicates, keeping the first spelling', () => {
    expect(parseVenueCatalogueUpdate({ facilities: ['  Projector ', 'projector', 'PROJECTOR', 'Mic'] }).facilities)
      .toEqual(['Projector', 'Mic']);
  });

  it('allows the three lists to be cleared with an empty array', () => {
    expect(parseVenueCatalogueUpdate({ facilities: [], accessibilityFeatures: [], layouts: [] }))
      .toEqual({ facilities: [], accessibilityFeatures: [], layouts: [] });
  });

  it('trims the location and turns a blank one into null', () => {
    expect(parseVenueCatalogueUpdate({ location: '  Level 3  ' }).location).toBe('Level 3');
    expect(parseVenueCatalogueUpdate({ location: '   ' }).location).toBeNull();
  });

  it('lets location and each operating-hour endpoint be cleared with null', () => {
    expect(parseVenueCatalogueUpdate({ location: null, opensAt: null, closesAt: null }))
      .toEqual({ location: null, opensAt: null, closesAt: null });
  });
});

describe('KAN-50 venue catalogue update input: boundary cases', () => {
  it.each([1, 2, 500, MAX_VENUE_CAPACITY])('accepts capacity %d', (capacity) => {
    expect(parseVenueCatalogueUpdate({ capacity }).capacity).toBe(capacity);
  });

  it.each([0, -1, MAX_VENUE_CAPACITY + 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '10', null, true, []])(
    'rejects capacity %j', (capacity) => {
      expect(codeOf(() => parseVenueCatalogueUpdate({ capacity }))).toBe('INVALID_VENUE_CATALOGUE_INPUT');
    },
  );

  it('accepts a location of exactly the maximum length and rejects one character more', () => {
    expect(parseVenueCatalogueUpdate({ location: 'a'.repeat(MAX_LOCATION_LENGTH) }).location)
      .toHaveLength(MAX_LOCATION_LENGTH);
    expect(codeOf(() => parseVenueCatalogueUpdate({ location: 'a'.repeat(MAX_LOCATION_LENGTH + 1) })))
      .toBe('INVALID_VENUE_CATALOGUE_INPUT');
  });

  it('accepts a label of exactly the maximum length and rejects one character more', () => {
    expect(parseVenueCatalogueUpdate({ layouts: ['a'.repeat(MAX_LABEL_LENGTH)] }).layouts![0])
      .toHaveLength(MAX_LABEL_LENGTH);
    expect(codeOf(() => parseVenueCatalogueUpdate({ layouts: ['a'.repeat(MAX_LABEL_LENGTH + 1)] })))
      .toBe('INVALID_VENUE_CATALOGUE_INPUT');
  });

  it('accepts exactly the maximum number of distinct labels and rejects one more', () => {
    const many = (count: number) => Array.from({ length: count }, (_, index) => `Facility ${index}`);
    expect(parseVenueCatalogueUpdate({ facilities: many(MAX_LABELS) }).facilities).toHaveLength(MAX_LABELS);
    expect(codeOf(() => parseVenueCatalogueUpdate({ facilities: many(MAX_LABELS + 1) })))
      .toBe('INVALID_VENUE_CATALOGUE_INPUT');
  });

  it('counts duplicates once, so many repeats of one label stay within the limit', () => {
    expect(parseVenueCatalogueUpdate({ facilities: Array(100).fill('Projector') }).facilities)
      .toEqual(['Projector']);
  });

  it.each(['00:00', '00:01', '12:30', '23:59'])('accepts the time %s', (time) => {
    expect(parseVenueCatalogueUpdate({ opensAt: time }).opensAt).toBe(time);
  });

  it.each(['24:00', '9:00', '09:60', '12:30:15', '', ' 09:00', '09-00', 900, true])(
    'rejects the time %j', (time) => {
      expect(codeOf(() => parseVenueCatalogueUpdate({ closesAt: time }))).toBe('INVALID_VENUE_CATALOGUE_INPUT');
    },
  );

  it('accepts a closing time that is one minute after opening', () => {
    expect(parseVenueCatalogueUpdate({ opensAt: '09:00', closesAt: '09:01' }))
      .toEqual({ opensAt: '09:00', closesAt: '09:01' });
  });
});

describe('KAN-50 venue catalogue update input: failure cases', () => {
  it.each([null, undefined, [], 'text', 42, true])('rejects a body that is not an object: %j', (input) => {
    expect(codeOf(() => parseVenueCatalogueUpdate(input))).toBe('INVALID_VENUE_CATALOGUE_INPUT');
  });

  it('rejects an empty update so a save never silently does nothing', () => {
    expect(codeOf(() => parseVenueCatalogueUpdate({}))).toBe('INVALID_VENUE_CATALOGUE_INPUT');
  });

  it.each(['name', 'description', 'isActive', 'id', 'createdAt', 'updatedAt', 'opens_at', 'accessibility'])(
    'rejects the non-editable or unknown field %s', (field) => {
      expect(codeOf(() => parseVenueCatalogueUpdate({ capacity: 10, [field]: 'x' })))
        .toBe('INVALID_VENUE_CATALOGUE_INPUT');
    },
  );

  it.each([
    { facilities: 'Projector' },
    { facilities: null },
    { facilities: [1] },
    { facilities: [''] },
    { facilities: ['   '] },
    { facilities: [null] },
    { layouts: 'Theatre' },
    { accessibilityFeatures: {} },
    { wheelchairAccessible: 'yes' },
    { wheelchairAccessible: null },
    { wheelchairAccessible: 1 },
    { location: 5 },
    { location: [] },
  ])('rejects malformed field values %j', (input) => {
    expect(codeOf(() => parseVenueCatalogueUpdate(input))).toBe('INVALID_VENUE_CATALOGUE_INPUT');
  });

  it.each([
    { opensAt: '10:00', closesAt: '10:00' },
    { opensAt: '10:00', closesAt: '09:00' },
  ])('rejects closing at or before opening in the same update %j', (input) => {
    expect(codeOf(() => parseVenueCatalogueUpdate(input))).toBe('INVALID_VENUE_CATALOGUE_INPUT');
  });

  it('does not treat a single endpoint as an ordering error (the service checks it against the stored value)', () => {
    expect(() => parseVenueCatalogueUpdate({ opensAt: '23:00' })).not.toThrow();
    expect(() => parseVenueCatalogueUpdate({ closesAt: '00:30' })).not.toThrow();
  });
});

describe('KAN-50 operating-hours ordering helper', () => {
  it.each([
    [null, null], ['08:00', null], [null, '22:00'], ['08:00', '22:00'], ['00:00', '00:01'],
  ])('allows opens=%s closes=%s', (opens, closes) => {
    expect(() => assertOperatingHoursOrdered(opens, closes)).not.toThrow();
  });

  it.each([['10:00', '10:00'], ['10:00', '09:59'], ['23:59', '00:00']])(
    'rejects opens=%s closes=%s', (opens, closes) => {
      expect(codeOf(() => assertOperatingHoursOrdered(opens, closes))).toBe('INVALID_VENUE_CATALOGUE_INPUT');
    },
  );
});

describe('KAN-77 venue buffer duration input', () => {
  it.each([0, 1, 30, 1439, MAX_BUFFER_MINUTES])('accepts %d minutes with its expected value (AC2, AC5)', (minutes) => {
    expect(parseVenueCatalogueRequest({ setupMinutes: minutes, expectedSetupMinutes: 0 })).toEqual({
      update: { setupMinutes: minutes }, expected: { setupMinutes: 0 },
    });
    expect(parseVenueCatalogueRequest({ turnaroundMinutes: minutes, expectedTurnaroundMinutes: 15 })).toEqual({
      update: { turnaroundMinutes: minutes }, expected: { turnaroundMinutes: 15 },
    });
  });

  it('accepts both buffers alongside other catalogue fields and keeps them separate from expectations', () => {
    expect(parseVenueCatalogueRequest({
      capacity: 80, setupMinutes: 30, expectedSetupMinutes: 0, turnaroundMinutes: 45, expectedTurnaroundMinutes: 10,
    })).toEqual({
      update: { capacity: 80, setupMinutes: 30, turnaroundMinutes: 45 },
      expected: { setupMinutes: 0, turnaroundMinutes: 10 },
    });
  });

  it('returns no expectations for an edit that does not change a buffer', () => {
    expect(parseVenueCatalogueRequest({ capacity: 80 })).toEqual({ update: { capacity: 80 }, expected: {} });
    expect(parseVenueCatalogueUpdate({ setupMinutes: 5, expectedSetupMinutes: 0 })).toEqual({ setupMinutes: 5 });
  });

  it.each([-1, MAX_BUFFER_MINUTES + 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '30', null, true, [30]])(
    'rejects %j as a buffer value with field feedback and saves nothing (AC2)',
    (value) => {
      for (const [field, expectedKey] of [['setupMinutes', 'expectedSetupMinutes'], ['turnaroundMinutes', 'expectedTurnaroundMinutes']] as const) {
        expect(() => parseVenueCatalogueRequest({ [field]: value, [expectedKey]: 0 }))
          .toThrow(`${field} must be a whole number of minutes from 0 to ${MAX_BUFFER_MINUTES}.`);
        expect(codeOf(() => parseVenueCatalogueRequest({ [field]: value, [expectedKey]: 0 })))
          .toBe('INVALID_VENUE_CATALOGUE_INPUT');
      }
    },
  );

  it.each([-1, MAX_BUFFER_MINUTES + 1, 2.5, '0', null])('rejects %j as an expected buffer value', (value) => {
    expect(() => parseVenueCatalogueRequest({ setupMinutes: 10, expectedSetupMinutes: value }))
      .toThrow(`expectedSetupMinutes must be a whole number of minutes from 0 to ${MAX_BUFFER_MINUTES}.`);
  });

  it('requires the expected value whenever a buffer is changed (AC5)', () => {
    expect(() => parseVenueCatalogueRequest({ setupMinutes: 10 }))
      .toThrow('expectedSetupMinutes is required when changing setupMinutes.');
    expect(() => parseVenueCatalogueRequest({ turnaroundMinutes: 10, capacity: 5 }))
      .toThrow('expectedTurnaroundMinutes is required when changing turnaroundMinutes.');
  });

  it('refuses an expected value sent without its buffer, including as the only key', () => {
    expect(() => parseVenueCatalogueRequest({ capacity: 5, expectedSetupMinutes: 0 }))
      .toThrow('expectedSetupMinutes may only be sent together with setupMinutes.');
    expect(() => parseVenueCatalogueRequest({ expectedTurnaroundMinutes: 0 }))
      .toThrow('Provide at least one field to update.');
  });
});
