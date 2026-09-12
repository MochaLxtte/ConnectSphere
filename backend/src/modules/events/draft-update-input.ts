import type { SaveEventDraftInput } from './types.js';

/** The future HTTP handler can distinguish invalid input from unexpected failures. */
export class DraftUpdateInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DraftUpdateInputError';
  }
}

const textFields = [
  'name', 'purpose', 'description', 'venueRequirements', 'accessibilityNeeds', 'equipmentRequirements',
] as const satisfies readonly (keyof SaveEventDraftInput)[];

const dateFields = ['startsAt', 'endsAt'] as const satisfies readonly (keyof SaveEventDraftInput)[];

const allowedFields = new Set<string>([
  ...textFields, ...dateFields, 'expectedAttendance', 'registrationRequired',
]);

function isIsoDateTime(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Date.parse(value));
}

/** Validate a PATCH body only; ownership and workflow-state eligibility are checked separately. */
export function parseDraftUpdateInput(input: unknown): SaveEventDraftInput {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new DraftUpdateInputError('The draft update must be a JSON object.');
  }

  const body = input as Record<string, unknown>;
  if (Object.keys(body).length === 0) {
    throw new DraftUpdateInputError('At least one field must be supplied.');
  }
  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw new DraftUpdateInputError(`Unsupported field: ${key}.`);
    }
  }

  const result: SaveEventDraftInput = {};

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

  if ('expectedAttendance' in body) {
    const value = body.expectedAttendance;
    if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) {
      throw new DraftUpdateInputError('expectedAttendance must be a non-negative whole number or null.');
    }
    result.expectedAttendance = value;
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
