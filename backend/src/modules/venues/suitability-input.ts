import { UUID_PATTERN, WorkflowError } from '../events/workflow-support.js';

export interface VenueSuitabilityInput {
  venueId: string;
  requirementsVersion: string;
  facilities: string[];
  accessibility: string[];
  layout: string | null;
  wheelchairRequired: boolean;
  requirementsConfirmed: boolean;
  unresolvedRequirements: string | null;
}

const keys = ['venueId', 'requirementsVersion', 'facilities', 'accessibility', 'layout',
  'wheelchairRequired', 'requirementsConfirmed', 'unresolvedRequirements'] as const;

function invalid(message: string): never {
  throw new WorkflowError('INVALID_INPUT', 'INVALID_SUITABILITY_INPUT', message);
}

/** Use exact names ignoring only casing and surrounding whitespace, never substring matching. */
export const requirementKey = (value: string): string => value.trim().toLowerCase();

function text(value: unknown, field: string, maximum: number): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') invalid(`${field} must be text or null.`);
  const trimmed = value.trim();
  if (trimmed.length > maximum) invalid(`${field} must be at most ${maximum} characters.`);
  return trimmed || null;
}

function list(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) invalid(`${field} must be an array of text values.`);
  const unique = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '') invalid(`${field} values must be nonempty text.`);
    const trimmed = item.trim();
    if (trimmed.length > 100) invalid(`${field} values must be at most 100 characters.`);
    if (!unique.has(requirementKey(trimmed))) unique.set(requirementKey(trimmed), trimmed);
  }
  if (unique.size > 30) invalid(`${field} must contain at most 30 distinct values.`);
  return [...unique.values()];
}

/** Every requirement field is explicit, including empty arrays and confirmation=false. */
export function parseVenueSuitabilityInput(input: unknown): VenueSuitabilityInput {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    invalid('The request body must be a JSON object.');
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(key => !keys.includes(key as typeof keys[number]))) {
    invalid('The request body contains an unsupported field.');
  }
  for (const key of keys) {
    if (!Object.hasOwn(body, key)) invalid(`${key} must be provided explicitly.`);
  }
  if (typeof body.venueId !== 'string' || !UUID_PATTERN.test(body.venueId)) invalid('venueId must be a UUID.');
  if (typeof body.requirementsVersion !== 'string' || !/^[a-f0-9]{64}$/i.test(body.requirementsVersion)) {
    invalid('requirementsVersion must be the version returned with the event requirements.');
  }
  if (typeof body.wheelchairRequired !== 'boolean') invalid('wheelchairRequired must be a boolean.');
  if (typeof body.requirementsConfirmed !== 'boolean') invalid('requirementsConfirmed must be a boolean.');
  return {
    venueId: body.venueId.toLowerCase(), requirementsVersion: body.requirementsVersion.toLowerCase(),
    facilities: list(body.facilities, 'facilities'), accessibility: list(body.accessibility, 'accessibility'),
    layout: text(body.layout, 'layout', 100), wheelchairRequired: body.wheelchairRequired,
    requirementsConfirmed: body.requirementsConfirmed,
    unresolvedRequirements: text(body.unresolvedRequirements, 'unresolvedRequirements', 2000),
  };
}
