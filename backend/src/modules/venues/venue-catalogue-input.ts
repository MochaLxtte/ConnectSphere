import { requirementKey } from './suitability-input.js';
import { WorkflowError } from '../events/workflow-support.js';

/**
 * KAN-50 (AC3-AC8, AC11): the fields Venue Staff may change. A name, description, active flag or
 * any identifier is deliberately not editable. Every key is optional; an omitted key is unchanged.
 */
export interface VenueCatalogueUpdate {
  location?: string | null;
  capacity?: number;
  facilities?: string[];
  accessibilityFeatures?: string[];
  wheelchairAccessible?: boolean;
  layouts?: string[];
  /** "HH:MM" Singapore time; null means unrestricted at that end (as in KAN-12/KAN-52). */
  opensAt?: string | null;
  closesAt?: string | null;
  /** KAN-77: whole minutes needed before and after each booking at this venue (0-1440). */
  setupMinutes?: number;
  turnaroundMinutes?: number;
}

/** KAN-77-AC5: the buffer value the editor last loaded, for each buffer field being changed. */
export interface VenueBufferExpectations {
  setupMinutes?: number;
  turnaroundMinutes?: number;
}

export interface VenueCatalogueRequest {
  update: VenueCatalogueUpdate;
  expected: VenueBufferExpectations;
}

const FIELDS = ['location', 'capacity', 'facilities', 'accessibilityFeatures',
  'wheelchairAccessible', 'layouts', 'opensAt', 'closesAt', 'setupMinutes', 'turnaroundMinutes'] as const;

export const BUFFER_FIELDS = ['setupMinutes', 'turnaroundMinutes'] as const;
const EXPECTED_KEY = { setupMinutes: 'expectedSetupMinutes', turnaroundMinutes: 'expectedTurnaroundMinutes' } as const;

export const MAX_VENUE_CAPACITY = 2_147_483_647;
export const MAX_LOCATION_LENGTH = 200;
export const MAX_LABEL_LENGTH = 100;
export const MAX_LABELS = 30;
export const MAX_BUFFER_MINUTES = 1440;
const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function invalidCatalogueInput(message: string): WorkflowError {
  return new WorkflowError('INVALID_INPUT', 'INVALID_VENUE_CATALOGUE_INPUT', message);
}

function nullableText(value: unknown, field: string, maximum: number): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw invalidCatalogueInput(`${field} must be text or null.`);
  const trimmed = value.trim();
  if (trimmed.length > maximum) throw invalidCatalogueInput(`${field} must be at most ${maximum} characters.`);
  return trimmed || null;
}

function labels(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw invalidCatalogueInput(`${field} must be an array of text values.`);
  const unique = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw invalidCatalogueInput(`${field} values must be nonempty text.`);
    }
    const trimmed = item.trim();
    if (trimmed.length > MAX_LABEL_LENGTH) {
      throw invalidCatalogueInput(`${field} values must be at most ${MAX_LABEL_LENGTH} characters.`);
    }
    if (!unique.has(requirementKey(trimmed))) unique.set(requirementKey(trimmed), trimmed);
  }
  if (unique.size > MAX_LABELS) {
    throw invalidCatalogueInput(`${field} must contain at most ${MAX_LABELS} distinct values.`);
  }
  return [...unique.values()];
}

function clockTime(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !CLOCK_TIME.test(value)) {
    throw invalidCatalogueInput(`${field} must be a time of day as HH:MM (00:00-23:59) or null.`);
  }
  return value;
}

/** KAN-77-AC2: whole minutes from 0 to 1440; null is refused because a venue always has a value. */
function bufferMinutes(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_BUFFER_MINUTES) {
    throw invalidCatalogueInput(`${field} must be a whole number of minutes from 0 to ${MAX_BUFFER_MINUTES}.`);
  }
  return value;
}

/** Closing must be after opening when both are set; the database enforces the same rule. */
export function assertOperatingHoursOrdered(opensAt: string | null, closesAt: string | null): void {
  if (opensAt !== null && closesAt !== null && closesAt <= opensAt) {
    throw invalidCatalogueInput('closesAt must be after opensAt.');
  }
}

export function parseVenueCatalogueUpdate(input: unknown): VenueCatalogueUpdate {
  return parseVenueCatalogueRequest(input).update;
}

/**
 * The PATCH body: catalogue fields plus, for each buffer field being changed, the value the editor
 * last loaded (expectedSetupMinutes / expectedTurnaroundMinutes). The expectation is required so a
 * stale buffer edit can never silently overwrite a newer one (KAN-77-AC5).
 */
export function parseVenueCatalogueRequest(input: unknown): VenueCatalogueRequest {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw invalidCatalogueInput('The request body must be a JSON object.');
  }
  const body = input as Record<string, unknown>;
  const allowed: readonly string[] = [...FIELDS, ...Object.values(EXPECTED_KEY)];
  const unsupported = Object.keys(body).find((key) => !allowed.includes(key));
  if (unsupported) throw invalidCatalogueInput(`Unsupported field: ${unsupported}.`);
  if (!FIELDS.some((field) => Object.hasOwn(body, field))) {
    throw invalidCatalogueInput('Provide at least one field to update.');
  }

  const update: VenueCatalogueUpdate = {};
  if (Object.hasOwn(body, 'location')) update.location = nullableText(body.location, 'location', MAX_LOCATION_LENGTH);
  if (Object.hasOwn(body, 'capacity')) {
    const capacity = body.capacity;
    if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1 || capacity > MAX_VENUE_CAPACITY) {
      throw invalidCatalogueInput(`capacity must be a whole number from 1 to ${MAX_VENUE_CAPACITY}.`);
    }
    update.capacity = capacity;
  }
  if (Object.hasOwn(body, 'facilities')) update.facilities = labels(body.facilities, 'facilities');
  if (Object.hasOwn(body, 'accessibilityFeatures')) {
    update.accessibilityFeatures = labels(body.accessibilityFeatures, 'accessibilityFeatures');
  }
  if (Object.hasOwn(body, 'wheelchairAccessible')) {
    if (typeof body.wheelchairAccessible !== 'boolean') {
      throw invalidCatalogueInput('wheelchairAccessible must be true or false.');
    }
    update.wheelchairAccessible = body.wheelchairAccessible;
  }
  if (Object.hasOwn(body, 'layouts')) update.layouts = labels(body.layouts, 'layouts');
  if (Object.hasOwn(body, 'opensAt')) update.opensAt = clockTime(body.opensAt, 'opensAt');
  if (Object.hasOwn(body, 'closesAt')) update.closesAt = clockTime(body.closesAt, 'closesAt');
  if (update.opensAt !== undefined && update.closesAt !== undefined) {
    assertOperatingHoursOrdered(update.opensAt, update.closesAt);
  }

  const expected: VenueBufferExpectations = {};
  for (const field of BUFFER_FIELDS) {
    const expectedKey = EXPECTED_KEY[field];
    const changing = Object.hasOwn(body, field);
    if (Object.hasOwn(body, expectedKey) !== changing) {
      throw invalidCatalogueInput(changing
        ? `${expectedKey} is required when changing ${field}.`
        : `${expectedKey} may only be sent together with ${field}.`);
    }
    if (changing) {
      update[field] = bufferMinutes(body[field], field);
      expected[field] = bufferMinutes(body[expectedKey], expectedKey);
    }
  }
  return { update, expected };
}
