import { describe, expect, it } from 'vitest';
import type { CatalogueVenue } from './api/venue-catalogue';
import {
  buildUpdate, MAX_CAPACITY, MAX_LABEL_LENGTH, MAX_LABELS, MAX_LOCATION_LENGTH,
  parseLabelLines, toFormValues, validateForm, type CatalogueFormValues,
} from './catalogue-form';

const venue: CatalogueVenue = {
  id: 'venue-a', name: 'Harbour Hall', description: null, location: 'Block B', capacity: 100,
  layouts: ['Theatre', 'Classroom'], facilities: ['Projector'], accessibilityFeatures: ['Ramp'],
  wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00', updatedAt: '2026-10-01T00:00:00.000Z',
};
const saved = (): CatalogueFormValues => toFormValues(venue);

describe('KAN-50 catalogue form: loading a venue (AC2, AC12)', () => {
  it('shows every saved value, with one label per line and blanks for unset values', () => {
    expect(saved()).toEqual({
      location: 'Block B', capacity: '100', facilities: 'Projector', accessibilityFeatures: 'Ramp',
      wheelchairAccessible: true, layouts: 'Theatre\nClassroom', opensAt: '08:00', closesAt: '22:00',
    });
    expect(toFormValues({ ...venue, location: null, opensAt: null, closesAt: null, layouts: [] }))
      .toMatchObject({ location: '', opensAt: '', closesAt: '', layouts: '' });
  });
});

describe('KAN-50 catalogue form: label lines (AC5-AC7, AC11)', () => {
  it('trims, drops blank lines and keeps the first spelling of case-insensitive duplicates', () => {
    expect(parseLabelLines('  Theatre \n\n  \nclassroom\r\nTHEATRE\nClassroom')).toEqual(['Theatre', 'classroom']);
  });
  it('returns no labels for empty text', () => {
    expect(parseLabelLines('')).toEqual([]);
    expect(parseLabelLines('  \n \n')).toEqual([]);
  });
});

describe('KAN-50 catalogue form: validation', () => {
  it('accepts the saved values', () => {
    expect(validateForm(saved())).toEqual({});
  });

  it.each(['1', String(MAX_CAPACITY), ' 50 '])('accepts capacity %s', (capacity) => {
    expect(validateForm({ ...saved(), capacity })).toEqual({});
  });

  it.each(['', '0', '-5', '1.5', 'abc', '1e3', String(MAX_CAPACITY + 1), '12 3'])('rejects capacity %j', (capacity) => {
    expect(validateForm({ ...saved(), capacity }).capacity).toBeDefined();
  });

  it('accepts and refuses capacity given as a number, as a number input produces', () => {
    expect(validateForm({ ...saved(), capacity: 150 })).toEqual({});
    expect(validateForm({ ...saved(), capacity: 0 }).capacity).toBeDefined();
    expect(validateForm({ ...saved(), capacity: 2.5 }).capacity).toBeDefined();
    expect(validateForm({ ...saved(), capacity: MAX_CAPACITY + 1 }).capacity).toBeDefined();
  });

  it('refuses an emptied number input, which v-model reports as an empty string', () => {
    expect(validateForm({ ...saved(), capacity: '' }).capacity).toBeDefined();
  });

  it('allows a location at the limit and refuses one character more', () => {
    expect(validateForm({ ...saved(), location: 'a'.repeat(MAX_LOCATION_LENGTH) }).location).toBeUndefined();
    expect(validateForm({ ...saved(), location: 'a'.repeat(MAX_LOCATION_LENGTH + 1) }).location).toBeDefined();
  });

  it('allows MAX_LABELS distinct entries per list and refuses one more', () => {
    const many = (count: number) => Array.from({ length: count }, (_, i) => `Item ${i}`).join('\n');
    expect(validateForm({ ...saved(), facilities: many(MAX_LABELS) }).facilities).toBeUndefined();
    expect(validateForm({ ...saved(), facilities: many(MAX_LABELS + 1) }).facilities).toBeDefined();
    expect(validateForm({ ...saved(), layouts: many(MAX_LABELS + 1) }).layouts).toBeDefined();
    expect(validateForm({ ...saved(), accessibilityFeatures: many(MAX_LABELS + 1) }).accessibilityFeatures).toBeDefined();
  });

  it('counts repeated entries once', () => {
    expect(validateForm({ ...saved(), facilities: Array(100).fill('Projector').join('\n') }).facilities).toBeUndefined();
  });

  it('refuses an entry longer than the limit', () => {
    expect(validateForm({ ...saved(), layouts: 'a'.repeat(MAX_LABEL_LENGTH + 1) }).layouts).toBeDefined();
    expect(validateForm({ ...saved(), layouts: 'a'.repeat(MAX_LABEL_LENGTH) }).layouts).toBeUndefined();
  });

  it.each([['10:00', '10:00'], ['09:00', '10:00']])('refuses closing %s at or before opening %s', (closes, opens) => {
    expect(validateForm({ ...saved(), opensAt: opens, closesAt: closes }).closesAt).toBeDefined();
  });

  it('does not compare hours when either is unrestricted', () => {
    expect(validateForm({ ...saved(), opensAt: '', closesAt: '03:00' })).toEqual({});
    expect(validateForm({ ...saved(), opensAt: '23:00', closesAt: '' })).toEqual({});
  });

  it('reports several problems at once', () => {
    const errors = validateForm({ ...saved(), capacity: '0', closesAt: '07:00' });
    expect(Object.keys(errors).sort()).toEqual(['capacity', 'closesAt']);
  });
});

describe('KAN-50 catalogue form: building the update (AC3-AC9)', () => {
  it('is empty when nothing changed, so there is nothing to save', () => {
    expect(buildUpdate(venue, saved())).toEqual({});
  });

  it('is unaffected by whitespace, casing duplicates or blank lines that normalise to the saved values', () => {
    expect(buildUpdate(venue, {
      ...saved(), location: '  Block B ', capacity: ' 100 ', layouts: 'Theatre\n\nClassroom\ntheatre\n',
    })).toEqual({});
  });

  it.each([
    [{ location: 'Annex' }, { location: 'Annex' }],
    [{ capacity: '150' }, { capacity: 150 }],
    [{ facilities: 'Projector\nMic' }, { facilities: ['Projector', 'Mic'] }],
    [{ accessibilityFeatures: '' }, { accessibilityFeatures: [] }],
    [{ wheelchairAccessible: false }, { wheelchairAccessible: false }],
    [{ layouts: 'Theatre\nClassroom\nBanquet' }, { layouts: ['Theatre', 'Classroom', 'Banquet'] }],
    [{ opensAt: '09:00' }, { opensAt: '09:00' }],
    [{ closesAt: '' }, { closesAt: null }],
    [{ location: '   ' }, { location: null }],
    [{ opensAt: '' }, { opensAt: null }],
  ])('sends only the changed field %j', (change, expected) => {
    expect(buildUpdate(venue, { ...saved(), ...change })).toEqual(expected);
  });

  it('compares a numeric capacity with the saved value and sends it as a number', () => {
    expect(buildUpdate(venue, { ...saved(), capacity: 100 })).toEqual({});
    expect(buildUpdate(venue, { ...saved(), capacity: 120 })).toEqual({ capacity: 120 });
  });

  it('sends several changed fields together and leaves the rest out', () => {
    expect(buildUpdate(venue, { ...saved(), capacity: '80', layouts: 'U-shape', closesAt: '21:00' }))
      .toEqual({ capacity: 80, layouts: ['U-shape'], closesAt: '21:00' });
  });

  it('treats a reordered list as a change because order is part of what is saved', () => {
    expect(buildUpdate(venue, { ...saved(), layouts: 'Classroom\nTheatre' })).toEqual({ layouts: ['Classroom', 'Theatre'] });
  });

  it('sets a missing location and hours when the venue had none', () => {
    const bare = { ...venue, location: null, opensAt: null, closesAt: null };
    expect(buildUpdate(bare, { ...toFormValues(bare), location: 'New wing', opensAt: '08:30' }))
      .toEqual({ location: 'New wing', opensAt: '08:30' });
  });
});
