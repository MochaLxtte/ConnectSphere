import { describe, expect, it } from 'vitest';
import { parseSuitabilityBookingId, parseVenueSuitabilityInput } from '../../src/modules/venues/suitability-input.js';

const valid = () => ({
  venueId: '52000000-0000-4000-8000-000000000001', requirementsVersion: 'a'.repeat(64),
  facilities: [], accessibility: [], layout: null, wheelchairRequired: false,
  requirementsConfirmed: true, unresolvedRequirements: null,
});

describe('KAN-82 selected arrangement input', () => {
  const bookingId = '82000000-AAAA-4000-8000-000000000001';
  it('normalises the optional identifier and supports saved layout lengths accepted by booking creation', () => {
    expect(parseSuitabilityBookingId(undefined)).toBeUndefined();
    expect(parseVenueSuitabilityInput({ ...valid(), bookingId, layout: 'x'.repeat(2000) }))
      .toMatchObject({ bookingId: bookingId.toLowerCase(), layout: 'x'.repeat(2000) });
    expect(() => parseVenueSuitabilityInput({ ...valid(), bookingId, layout: 'x'.repeat(2001) })).toThrow();
  });
  it.each([null, '', 'invalid', 1, ['82000000-0000-4000-8000-000000000001']])(
    'rejects malformed or repeated booking identifiers %j', bookingId => {
      expect(() => parseVenueSuitabilityInput({ ...valid(), bookingId })).toThrow('bookingId must be a UUID');
    },
  );
  it('rejects forged authoritative timing and notes fields', () => {
    for (const field of ['startsAt', 'endsAt', 'notes', 'status']) {
      expect(() => parseVenueSuitabilityInput({ ...valid(), bookingId, [field]: 'override' })).toThrow('unsupported field');
    }
  });
});

describe('KAN-52 structured requirement input', () => {
  it('accepts explicit no-requirements, without inventing any inferred needs', () => {
    expect(parseVenueSuitabilityInput(valid())).toEqual(valid());
  });
  it('trims and deduplicates exact case-insensitive names while retaining unknown catalogue requirements', () => {
    expect(parseVenueSuitabilityInput({ ...valid(), facilities: [' Projector ', 'PROJECTOR', 'Special lighting'],
      accessibility: [' Hearing loop ', 'hearing LOOP'], layout: ' Theatre ', unresolvedRequirements: ' Check stairs ' }))
      .toMatchObject({ facilities: ['Projector', 'Special lighting'], accessibility: ['Hearing loop'],
        layout: 'Theatre', unresolvedRequirements: 'Check stairs' });
  });
  it('retains unconfirmed requirements and normalises blank optional text to null', () => {
    expect(parseVenueSuitabilityInput({ ...valid(), requirementsConfirmed: false, layout: ' ', unresolvedRequirements: ' ' }))
      .toMatchObject({ requirementsConfirmed: false, layout: null, unresolvedRequirements: null });
  });
  it.each(Object.keys(valid()))('requires an explicit %s field', (field) => {
    const input: Record<string, unknown> = valid();
    delete input[field];
    expect(() => parseVenueSuitabilityInput(input)).toThrow();
  });
  it.each([null, [], 'text', { ...valid(), attendance: 1 }, { ...valid(), actorId: 'spoof' },
    { ...valid(), venueId: 'bad' }, { ...valid(), requirementsVersion: 'outdated' },
    { ...valid(), facilities: 'Projector' }, { ...valid(), facilities: [''] },
    { ...valid(), facilities: [1] }, { ...valid(), accessibility: null },
    { ...valid(), layout: 5 }, { ...valid(), wheelchairRequired: 'true' },
    { ...valid(), requirementsConfirmed: 'true' }, { ...valid(), unresolvedRequirements: false },
  ])('rejects malformed or forged input %j', input => {
    expect(() => parseVenueSuitabilityInput(input)).toThrow();
  });
  it('accepts maximum sizes and refuses values above each bound', () => {
    const maximum = { ...valid(), facilities: Array.from({ length: 30 }, (_, i) => `Facility ${i}`),
      accessibility: ['a'.repeat(100)], layout: 'a'.repeat(100), unresolvedRequirements: 'a'.repeat(2000) };
    expect(parseVenueSuitabilityInput(maximum)).toEqual(maximum);
    for (const change of [{ facilities: Array.from({ length: 31 }, (_, i) => `Facility ${i}`) },
      { facilities: ['a'.repeat(101)] }, { accessibility: ['a'.repeat(101)] },
      { layout: 'a'.repeat(101) }, { unresolvedRequirements: 'a'.repeat(2001) }]) {
      expect(() => parseVenueSuitabilityInput({ ...maximum, ...change })).toThrow();
    }
  });
});
