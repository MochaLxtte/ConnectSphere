import type { SaveEventDraftInput } from './types.js';

/** The future HTTP handler can distinguish invalid input from unexpected failures. */
export class DraftUpdateInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DraftUpdateInputError';
  }
}

/** CF-18 registration settings; kept here because the shared EventDraftFields type is frozen. */
export interface DraftRegistrationFields {
  registrationCapacity: number | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
}

export type DraftUpdateInput = SaveEventDraftInput & Partial<DraftRegistrationFields>;

const textFields = [
  'name', 'purpose', 'description', 'venueRequirements', 'accessibilityNeeds', 'equipmentRequirements',
] as const satisfies readonly (keyof SaveEventDraftInput)[];

const dateFields = [
  'startsAt', 'endsAt', 'registrationOpensAt', 'registrationClosesAt',
] as const satisfies readonly (keyof DraftUpdateInput)[];

const countFields = [
  'expectedAttendance', 'registrationCapacity',
] as const satisfies readonly (keyof DraftUpdateInput)[];

const allowedFields = new Set<string>([
  ...textFields, ...dateFields, ...countFields, 'registrationRequired',
]);

const maxCount = 2_147_483_647;

function isIsoDateTime(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Date.parse(value));
}

/** Validate a PATCH body only; ownership and workflow-state eligibility are checked separately. */
export function parseDraftUpdateInput(input: unknown): DraftUpdateInput {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new DraftUpdateInputError('The draft update must be a JSON object.');
  }
  if (Object.keys(input).length === 0) {
    throw new DraftUpdateInputError('At least one field must be supplied.');
  }
  return parseDraftFields(input as Record<string, unknown>);
}

/** Validate a POST body: a new draft may start empty, otherwise the PATCH rules apply. */
export function parseDraftCreateInput(input: unknown): DraftUpdateInput {
  if (input === undefined) return {};
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new DraftUpdateInputError('The draft must be a JSON object.');
  }
  return parseDraftFields(input as Record<string, unknown>);
}

function parseDraftFields(body: Record<string, unknown>): DraftUpdateInput {
  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw new DraftUpdateInputError(`Unsupported field: ${key}.`);
    }
  }

  const result: DraftUpdateInput = {};

  for (const field of textFields) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value !== null && typeof value !== 'string') {
      throw new DraftUpdateInputError(`${field} must be text or null.`);
    }
    result[field] = value;
  }

  for (const field of dateFields) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value !== null && (typeof value !== 'string' || !isIsoDateTime(value))) {
      throw new DraftUpdateInputError(`${field} must be an ISO 8601 date-time string or null.`);
    }
    result[field] = value;
  }

  for (const field of countFields) {
    if (!(field in body)) continue;
    const value = body[field];
    // The columns are PostgreSQL integers; reject what they cannot store instead of failing the write.
    if (value !== null &&
        (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > maxCount)) {
      throw new DraftUpdateInputError(`${field} must be a non-negative whole number or null.`);
    }
    result[field] = value;
  }

  if ('registrationRequired' in body) {
    const value = body.registrationRequired;
    if (value !== null && typeof value !== 'boolean') {
      throw new DraftUpdateInputError('registrationRequired must be true, false or null.');
    }
    result.registrationRequired = value;
  }

  return result;
}
