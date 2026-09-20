import { describe, expect, it } from 'vitest';
import {
  escapeLikePattern, parseAvailabilityRange, parseIsoTimestamp, parseUnavailabilityInput,
  parseVenueCreateInput, parseVenueFilters, parseVenueUpdateInput, VenueInputError,
} from '../../src/modules/venues/venue-input.js';

describe('CF-08 venue create/update input', () => {
  it('applies catalogue defaults and trims text and tags', () => {
    expect(parseVenueCreateInput({
      name: '  Hall A ', capacity: 120, facilities: [' Projector ', 'Projector', 'Stage'],
    })).toEqual({
      name: 'Hall A', description: null, location: null, capacity: 120, layouts: [],
      facilities: ['Projector', 'Stage'], accessibilityFeatures: [], wheelchairAccessible: false,
      opensAt: null, closesAt: null, isActive: true,
    });
  });

  it.each([
    [null], ['text'], [[]],
    [{ capacity: 10 }],
    [{ name: '   ', capacity: 10 }],
    [{ name: 'Hall' }],
    [{ name: 'Hall', capacity: 0 }],
    [{ name: 'Hall', capacity: 1.5 }],
    [{ name: 'Hall', capacity: '10' }],
    [{ name: 'Hall', capacity: 10, facilities: 'Projector' }],
    [{ name: 'Hall', capacity: 10, facilities: ['a,b'] }],
    [{ name: 'Hall', capacity: 10, layouts: [''] }],
    [{ name: 'Hall', capacity: 10, wheelchairAccessible: 'yes' }],
    [{ name: 'Hall', capacity: 10, opensAt: '9:00' }],
    [{ name: 'Hall', capacity: 10, opensAt: '24:00' }],
    [{ name: 'Hall', capacity: 10, opensAt: '18:00', closesAt: '09:00' }],
    [{ name: 'Hall', capacity: 10, opensAt: '09:00', closesAt: '09:00' }],
    [{ name: 'Hall', capacity: 10, id: 'x' }],
    [{ name: 'Hall', capacity: 10, createdBy: 'x' }],
  ])('rejects %j', (input) => {
    expect(() => parseVenueCreateInput(input)).toThrowError(VenueInputError);
    try { parseVenueCreateInput(input); } catch (error) {
      expect((error as VenueInputError).code).toBe('INVALID_VENUE_INPUT');
    }
  });

  it('keeps omitted update fields undefined and lets null clear nullable fields', () => {
    expect(parseVenueUpdateInput({ description: null, opensAt: null, isActive: false }))
      .toEqual({ description: null, opensAt: null, isActive: false });
  });

  it.each([[{}], [{ name: null }], [{ capacity: null }], [{ opensAt: '10:00', closesAt: '08:00' }]])(
    'rejects the update %j', (input) => {
      expect(() => parseVenueUpdateInput(input)).toThrowError(VenueInputError);
    },
  );
});

describe('CF-10 venue filters', () => {
  it('returns neutral filters when nothing is supplied', () => {
    expect(parseVenueFilters({})).toEqual({
      q: null, minCapacity: null, facilities: [], accessibilityFeatures: [],
      wheelchairAccessible: false, layout: null, available: null,
    });
  });

  it('parses every supported filter', () => {
    expect(parseVenueFilters({
      q: ' hall ', minCapacity: '50', facilities: 'Projector, Stage,Projector',
      accessibilityFeatures: 'Hearing loop', wheelchairAccessible: 'true', layout: 'Theatre',
      availableFrom: '2026-10-01T09:00:00+08:00', availableTo: '2026-10-01T12:00:00+08:00',
    })).toEqual({
      q: 'hall', minCapacity: 50, facilities: ['Projector', 'Stage'],
      accessibilityFeatures: ['Hearing loop'], wheelchairAccessible: true, layout: 'Theatre',
      available: { startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T04:00:00.000Z' },
    });
  });

  it.each([
    [{ sort: 'name' }],
    [{ q: '' }],
    [{ q: ['a', 'b'] }],
    [{ minCapacity: '0' }],
    [{ minCapacity: '-5' }],
    [{ minCapacity: '1e3' }],
    [{ minCapacity: 'ten' }],
    [{ facilities: 'Projector,,Stage' }],
    [{ accessibilityFeatures: '' }],
    [{ wheelchairAccessible: 'yes' }],
    [{ layout: ' ' }],
    [{ availableFrom: '2026-10-01T09:00:00Z' }],
    [{ availableFrom: '2026-10-01', availableTo: '2026-10-02' }],
    [{ availableFrom: '2026-10-01T09:00:00', availableTo: '2026-10-01T10:00:00' }],
    [{ availableFrom: '2026-10-01T09:00:00Z', availableTo: '2026-10-01T09:00:00Z' }],
  ])('rejects %j with INVALID_VENUE_FILTER', (query) => {
    expect(() => parseVenueFilters(query)).toThrowError(
      expect.objectContaining({ code: 'INVALID_VENUE_FILTER' }),
    );
  });

  it('escapes LIKE wildcards so search text is literal', () => {
    expect(escapeLikePattern('100%_room\\')).toBe('100\\%\\_room\\\\');
  });
});

describe('CF-09 availability range and blocked periods', () => {
  it('normalises the range to UTC', () => {
    expect(parseAvailabilityRange({ from: '2026-10-01T00:00:00+08:00', to: '2026-10-08T00:00:00+08:00' }))
      .toEqual({ from: '2026-09-30T16:00:00.000Z', to: '2026-10-07T16:00:00.000Z' });
  });

  it('allows exactly 92 days and rejects more', () => {
    expect(() => parseAvailabilityRange({ from: '2026-01-01T00:00:00Z', to: '2026-04-03T00:00:00Z' })).not.toThrow();
    expect(() => parseAvailabilityRange({ from: '2026-01-01T00:00:00Z', to: '2026-04-03T00:00:01Z' }))
      .toThrowError(expect.objectContaining({ code: 'INVALID_AVAILABILITY_RANGE' }));
  });

  it.each([
    [{}], [{ from: '2026-01-01T00:00:00Z' }], [{ from: 'x', to: 'y' }],
    [{ from: '2026-01-02T00:00:00Z', to: '2026-01-01T00:00:00Z' }],
    [{ from: '2026-01-01T00:00:00Z', to: '2026-01-02T00:00:00Z', venueId: 'x' }],
  ])('rejects the range %j', (query) => {
    expect(() => parseAvailabilityRange(query)).toThrowError(VenueInputError);
  });

  it('parses a blocked period and blanks an empty reason', () => {
    expect(parseUnavailabilityInput({
      startsAt: '2026-10-01T09:00:00+08:00', endsAt: '2026-10-01T10:00:00+08:00', reason: '  ',
    })).toEqual({ startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T02:00:00.000Z', reason: null });
  });

  it.each([
    [null],
    [{ startsAt: '2026-10-01T09:00:00Z' }],
    [{ startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T09:00:00Z' }],
    [{ startsAt: '2026-10-01T09:00:00Z', endsAt: '2026-10-01T10:00:00Z', reason: 5 }],
    [{ startsAt: '2026-10-01T09:00:00Z', endsAt: '2026-10-01T10:00:00Z', createdBy: 'x' }],
  ])('rejects the blocked period %j', (input) => {
    expect(() => parseUnavailabilityInput(input)).toThrowError(
      expect.objectContaining({ code: 'INVALID_UNAVAILABILITY_INPUT' }),
    );
  });

  it('requires an explicit offset on timestamps', () => {
    expect(parseIsoTimestamp('2026-10-01T09:00:00')).toBeNull();
    expect(parseIsoTimestamp('2026-13-01T09:00:00Z')).toBeNull();
    expect(parseIsoTimestamp(123)).toBeNull();
    expect(parseIsoTimestamp('2026-10-01T09:00Z')).toBe('2026-10-01T09:00:00.000Z');
  });
});
