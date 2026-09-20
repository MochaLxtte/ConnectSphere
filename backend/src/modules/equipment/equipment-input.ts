import type { AvailabilityWindow } from './availability.js';
import { EquipmentInputError } from './errors.js';

export interface EquipmentTypeInput {
  name: string;
  category: string | null;
  description: string | null;
  totalQuantity: number;
  isActive: boolean;
}
export type EquipmentTypeUpdateInput = Partial<EquipmentTypeInput>;

export interface EquipmentListFilter {
  q: string | null;
  category: string | null;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = ['name', 'category', 'description', 'totalQuantity', 'isActive'] as const;
const MAX_NAME = 120;
const MAX_CATEGORY = 80;
const MAX_DESCRIPTION = 2000;
/** Keeps quantities inside PostgreSQL's integer range with room for sums. */
export const MAX_QUANTITY = 1_000_000;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuid.test(value);
}

function invalid(message: string): EquipmentInputError {
  return new EquipmentInputError('INVALID_EQUIPMENT_INPUT', message);
}

function parseFields(input: unknown, label: string): EquipmentTypeUpdateInput {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw invalid(`The ${label} must be a JSON object.`);
  }
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    if (!(fields as readonly string[]).includes(key)) throw invalid(`Unsupported field: ${key}.`);
  }

  const result: EquipmentTypeUpdateInput = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') throw invalid('name must be non-empty text.');
    const name = body.name.trim();
    if (name.length > MAX_NAME) throw invalid(`name must be at most ${MAX_NAME} characters.`);
    result.name = name;
  }
  for (const [field, limit] of [['category', MAX_CATEGORY], ['description', MAX_DESCRIPTION]] as const) {
    const value = body[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== 'string') throw invalid(`${field} must be text or null.`);
    const text = typeof value === 'string' ? value.trim() : '';
    if (text.length > limit) throw invalid(`${field} must be at most ${limit} characters.`);
    result[field] = text || null;
  }
  if (body.totalQuantity !== undefined) {
    const quantity = body.totalQuantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
      throw invalid(`totalQuantity must be a whole number from 0 to ${MAX_QUANTITY}.`);
    }
    result.totalQuantity = quantity;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') throw invalid('isActive must be true or false.');
    result.isActive = body.isActive;
  }
  return result;
}

/** Validate a POST body only; the Technical Support role is checked separately. */
export function parseEquipmentTypeCreateInput(input: unknown): EquipmentTypeInput {
  const parsed = parseFields(input, 'equipment type');
  if (parsed.name === undefined) throw invalid('name is required.');
  if (parsed.totalQuantity === undefined) throw invalid('totalQuantity is required.');
  return {
    name: parsed.name,
    category: parsed.category ?? null,
    description: parsed.description ?? null,
    totalQuantity: parsed.totalQuantity,
    isActive: parsed.isActive ?? true,
  };
}

/** PATCH omission leaves a field unchanged; explicit null clears category or description. */
export function parseEquipmentTypeUpdateInput(input: unknown): EquipmentTypeUpdateInput {
  const parsed = parseFields(input, 'equipment type update');
  if (Object.keys(parsed).length === 0) throw invalid('At least one field must be supplied.');
  return parsed;
}

function singleText(value: unknown, name: string, limit: number): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') {
    throw new EquipmentInputError('INVALID_EQUIPMENT_LIST_FILTER', `${name} must be supplied once as text.`);
  }
  const text = value.trim();
  if (text.length > limit) {
    throw new EquipmentInputError('INVALID_EQUIPMENT_LIST_FILTER', `${name} must be at most ${limit} characters.`);
  }
  return text || null;
}

export function parseEquipmentListFilter(query: Record<string, unknown>): EquipmentListFilter {
  return { q: singleText(query.q, 'q', MAX_NAME), category: singleText(query.category, 'category', MAX_CATEGORY) };
}

export function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

/** `from` and `to` are ISO 8601 timestamps describing the half-open period [from, to). */
export function parseAvailabilityWindow(query: Record<string, unknown>): AvailabilityWindow {
  const from = parseTimestamp(query.from);
  const to = parseTimestamp(query.to);
  if (!from || !to) {
    throw new EquipmentInputError(
      'INVALID_AVAILABILITY_WINDOW', 'from and to must each be one ISO 8601 date-time.',
    );
  }
  if (to.getTime() <= from.getTime()) {
    throw new EquipmentInputError('INVALID_AVAILABILITY_WINDOW', 'to must be later than from.');
  }
  return { from, to };
}
