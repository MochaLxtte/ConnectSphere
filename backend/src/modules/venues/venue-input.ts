import type { Interval } from './types.js';

export type VenueInputErrorCode =
  | 'INVALID_VENUE_INPUT'
  | 'INVALID_VENUE_FILTER'
  | 'INVALID_AVAILABILITY_RANGE'
  | 'INVALID_UNAVAILABILITY_INPUT';

/** Lets HTTP handlers distinguish invalid input (400) from unexpected failures. */
export class VenueInputError extends Error {
  constructor(readonly code: VenueInputErrorCode, message: string) {
    super(message);
    this.name = 'VenueInputError';
  }
}

export interface VenueFields {
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  layouts: string[];
  facilities: string[];
  accessibilityFeatures: string[];
  wheelchairAccessible: boolean;
  opensAt: string | null;
  closesAt: string | null;
  isActive: boolean;
}

export type VenueUpdateInput = Partial<VenueFields>;

export interface VenueFilters {
  q: string | null;
  minCapacity: number | null;
  facilities: string[];
  accessibilityFeatures: string[];
  wheelchairAccessible: boolean;
  layout: string | null;
  available: Interval | null;
}

export interface UnavailabilityInput extends Interval {
  reason: string | null;
}

const venueFieldNames = [
  'name', 'description', 'location', 'capacity', 'layouts', 'facilities',
  'accessibilityFeatures', 'wheelchairAccessible', 'opensAt', 'closesAt', 'isActive',
] as const;
const filterNames = [
  'q', 'minCapacity', 'facilities', 'accessibilityFeatures', 'wheelchairAccessible', 'layout',
  'availableFrom', 'availableTo',
] as const;
const timeOfDay = /^([01]\d|2[0-3]):[0-5]\d$/;
const isoDateTime =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;
const MAX_CAPACITY = 1_000_000;
const MAX_TAGS = 50;
const MAX_TAG_LENGTH = 80;
export const MAX_AVAILABILITY_DAYS = 92;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Accept only ISO 8601 timestamps with an explicit offset; returns the normalised UTC form. */
export function parseIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !isoDateTime.test(value.trim())) return null;
  const time = Date.parse(value.trim());
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function asObject(input: unknown, code: VenueInputErrorCode, label: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new VenueInputError(code, `${label} must be a JSON object.`);
  }
  return input as Record<string, unknown>;
}

function parseText(
  body: Record<string, unknown>, field: string, maxLength: number, required: boolean,
): string | null {
  const value = body[field];
  if (value === null || value === undefined) {
    if (required) throw new VenueInputError('INVALID_VENUE_INPUT', `${field} is required.`);
    return null;
  }
  if (typeof value !== 'string') {
    throw new VenueInputError('INVALID_VENUE_INPUT', `${field} must be text${required ? '' : ' or null'}.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new VenueInputError('INVALID_VENUE_INPUT', `${field} must be at most ${maxLength} characters.`);
  }
  if (!trimmed && required) throw new VenueInputError('INVALID_VENUE_INPUT', `${field} is required.`);
  return trimmed || null;
}

function parseTags(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > MAX_TAGS) {
    throw new VenueInputError('INVALID_VENUE_INPUT', `${field} must be a list of at most ${MAX_TAGS} text items.`);
  }
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim() || item.trim().length > MAX_TAG_LENGTH || item.includes(',')) {
      throw new VenueInputError(
        'INVALID_VENUE_INPUT',
        `${field} items must be non-empty text of at most ${MAX_TAG_LENGTH} characters without commas.`,
      );
    }
    if (!tags.includes(item.trim())) tags.push(item.trim());
  }
  return tags;
}

function parseTimeOfDay(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !timeOfDay.test(value)) {
    throw new VenueInputError('INVALID_VENUE_INPUT', `${field} must be a 24-hour "HH:MM" time or null.`);
  }
  return value;
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new VenueInputError('INVALID_VENUE_INPUT', `${field} must be true or false.`);
  }
  return value;
}

/** The DB stores `time`; closing must be later than opening on the same Singapore day. */
export function assertOperatingHours(opensAt: string | null, closesAt: string | null): void {
  if (opensAt !== null && closesAt !== null && closesAt <= opensAt) {
    throw new VenueInputError('INVALID_VENUE_INPUT', 'closesAt must be later than opensAt.');
  }
}

function parseVenueFields(input: unknown): VenueUpdateInput {
  const body = asObject(input, 'INVALID_VENUE_INPUT', 'The venue');
  const unknown = Object.keys(body).find((key) => !(venueFieldNames as readonly string[]).includes(key));
  if (unknown) throw new VenueInputError('INVALID_VENUE_INPUT', `Unsupported venue field: ${unknown}.`);

  const fields: VenueUpdateInput = {};
  if ('name' in body) fields.name = parseText(body, 'name', 200, true)!;
  if ('description' in body) fields.description = parseText(body, 'description', 4000, false);
  if ('location' in body) fields.location = parseText(body, 'location', 300, false);
  if ('capacity' in body) {
    const capacity = body.capacity;
    if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CAPACITY) {
      throw new VenueInputError('INVALID_VENUE_INPUT', `capacity must be a whole number from 1 to ${MAX_CAPACITY}.`);
    }
    fields.capacity = capacity;
  }
  if ('layouts' in body) fields.layouts = parseTags(body.layouts, 'layouts');
  if ('facilities' in body) fields.facilities = parseTags(body.facilities, 'facilities');
  if ('accessibilityFeatures' in body) {
    fields.accessibilityFeatures = parseTags(body.accessibilityFeatures, 'accessibilityFeatures');
  }
  if ('wheelchairAccessible' in body) {
    fields.wheelchairAccessible = parseBoolean(body.wheelchairAccessible, 'wheelchairAccessible');
  }
  if ('opensAt' in body) fields.opensAt = parseTimeOfDay(body.opensAt, 'opensAt');
  if ('closesAt' in body) fields.closesAt = parseTimeOfDay(body.closesAt, 'closesAt');
  if ('isActive' in body) fields.isActive = parseBoolean(body.isActive, 'isActive');
  return fields;
}

/** CF-08 create: name and capacity are required, everything else has a catalogue default. */
export function parseVenueCreateInput(input: unknown): VenueFields {
  const fields = parseVenueFields(input);
  if (fields.name === undefined) throw new VenueInputError('INVALID_VENUE_INPUT', 'name is required.');
  if (fields.capacity === undefined) throw new VenueInputError('INVALID_VENUE_INPUT', 'capacity is required.');
  const venue: VenueFields = {
    name: fields.name,
    description: fields.description ?? null,
    location: fields.location ?? null,
    capacity: fields.capacity,
    layouts: fields.layouts ?? [],
    facilities: fields.facilities ?? [],
    accessibilityFeatures: fields.accessibilityFeatures ?? [],
    wheelchairAccessible: fields.wheelchairAccessible ?? false,
    opensAt: fields.opensAt ?? null,
    closesAt: fields.closesAt ?? null,
    isActive: fields.isActive ?? true,
  };
  assertOperatingHours(venue.opensAt, venue.closesAt);
  return venue;
}

/** CF-08 update: omission leaves a field unchanged; explicit null clears a nullable field. */
export function parseVenueUpdateInput(input: unknown): VenueUpdateInput {
  const fields = parseVenueFields(input);
  if (Object.keys(fields).length === 0) {
    throw new VenueInputError('INVALID_VENUE_INPUT', 'Supply at least one venue field to update.');
  }
  if (fields.opensAt !== undefined && fields.closesAt !== undefined) {
    assertOperatingHours(fields.opensAt, fields.closesAt);
  }
  return fields;
}

function invalidFilter(message: string): never {
  throw new VenueInputError('INVALID_VENUE_FILTER', message);
}

function filterTags(value: string, name: string): string[] {
  const tags = value.split(',').map((tag) => tag.trim());
  if (tags.length > MAX_TAGS || tags.some((tag) => !tag || tag.length > MAX_TAG_LENGTH)) {
    invalidFilter(`${name} must be a comma-separated list of non-empty values.`);
  }
  return [...new Set(tags)];
}

/** CF-10: every supplied query parameter must be a single, recognised, well-formed value. */
export function parseVenueFilters(query: unknown): VenueFilters {
  const params = (typeof query === 'object' && query !== null ? query : {}) as Record<string, unknown>;
  const values = new Map<string, string>();
  for (const [name, value] of Object.entries(params)) {
    if (!(filterNames as readonly string[]).includes(name)) invalidFilter(`Unsupported venue filter: ${name}.`);
    if (typeof value !== 'string') invalidFilter(`${name} must be supplied once as text.`);
    values.set(name, value);
  }

  const filters: VenueFilters = {
    q: null, minCapacity: null, facilities: [], accessibilityFeatures: [],
    wheelchairAccessible: false, layout: null, available: null,
  };
  const q = values.get('q');
  if (q !== undefined) {
    if (!q.trim() || q.trim().length > 100) invalidFilter('q must be 1 to 100 characters.');
    filters.q = q.trim();
  }
  const minCapacity = values.get('minCapacity');
  if (minCapacity !== undefined) {
    if (!/^\d{1,7}$/.test(minCapacity) || Number(minCapacity) < 1 || Number(minCapacity) > MAX_CAPACITY) {
      invalidFilter(`minCapacity must be a whole number from 1 to ${MAX_CAPACITY}.`);
    }
    filters.minCapacity = Number(minCapacity);
  }
  const facilities = values.get('facilities');
  if (facilities !== undefined) filters.facilities = filterTags(facilities, 'facilities');
  const accessibility = values.get('accessibilityFeatures');
  if (accessibility !== undefined) {
    filters.accessibilityFeatures = filterTags(accessibility, 'accessibilityFeatures');
  }
  const wheelchair = values.get('wheelchairAccessible');
  if (wheelchair !== undefined) {
    if (wheelchair !== 'true' && wheelchair !== 'false') invalidFilter('wheelchairAccessible must be true or false.');
    filters.wheelchairAccessible = wheelchair === 'true';
  }
  const layout = values.get('layout');
  if (layout !== undefined) {
    if (!layout.trim() || layout.trim().length > MAX_TAG_LENGTH) invalidFilter('layout must be 1 to 80 characters.');
    filters.layout = layout.trim();
  }
  const from = values.get('availableFrom');
  const to = values.get('availableTo');
  if (from !== undefined || to !== undefined) {
    const startsAt = parseIsoTimestamp(from);
    const endsAt = parseIsoTimestamp(to);
    if (!startsAt || !endsAt) {
      invalidFilter('availableFrom and availableTo must both be ISO 8601 timestamps with an offset.');
    }
    if (endsAt <= startsAt) invalidFilter('availableTo must be later than availableFrom.');
    filters.available = { startsAt, endsAt };
  }
  return filters;
}

/** Escape LIKE wildcards so user text is matched literally (used with ESCAPE '\'). */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** CF-09: calendar window, at most 92 days. */
export function parseAvailabilityRange(query: unknown): { from: string; to: string } {
  const params = (typeof query === 'object' && query !== null ? query : {}) as Record<string, unknown>;
  const unknown = Object.keys(params).find((name) => name !== 'from' && name !== 'to');
  if (unknown) throw new VenueInputError('INVALID_AVAILABILITY_RANGE', `Unsupported parameter: ${unknown}.`);
  const from = parseIsoTimestamp(params.from);
  const to = parseIsoTimestamp(params.to);
  if (!from || !to) {
    throw new VenueInputError('INVALID_AVAILABILITY_RANGE', 'from and to must be ISO 8601 timestamps with an offset.');
  }
  if (to <= from) throw new VenueInputError('INVALID_AVAILABILITY_RANGE', 'to must be later than from.');
  if (Date.parse(to) - Date.parse(from) > MAX_AVAILABILITY_DAYS * DAY_MS) {
    throw new VenueInputError('INVALID_AVAILABILITY_RANGE', `The range may cover at most ${MAX_AVAILABILITY_DAYS} days.`);
  }
  return { from, to };
}

/** CF-09: a blocked period entered by venue staff. */
export function parseUnavailabilityInput(input: unknown): UnavailabilityInput {
  const code = 'INVALID_UNAVAILABILITY_INPUT';
  const body = asObject(input, code, 'The blocked period');
  if (Object.keys(body).some((key) => !['startsAt', 'endsAt', 'reason'].includes(key))) {
    throw new VenueInputError(code, 'Only startsAt, endsAt and reason may be supplied.');
  }
  const startsAt = parseIsoTimestamp(body.startsAt);
  const endsAt = parseIsoTimestamp(body.endsAt);
  if (!startsAt || !endsAt) {
    throw new VenueInputError(code, 'startsAt and endsAt must be ISO 8601 timestamps with an offset.');
  }
  if (endsAt <= startsAt) throw new VenueInputError(code, 'endsAt must be later than startsAt.');
  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
    throw new VenueInputError(code, 'reason must be text or null.');
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length > 500) throw new VenueInputError(code, 'reason must be at most 500 characters.');
  return { startsAt, endsAt, reason: reason || null };
}
