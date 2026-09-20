import { isUuid, MAX_QUANTITY, parseTimestamp } from './equipment-input.js';
import { EquipmentInputError } from './errors.js';
import { EQUIPMENT_REQUEST_STATUSES, type EquipmentRequestStatus } from './types.js';

export interface EquipmentRequestCreateInput {
  eventRequestId: string;
  equipmentTypeId: string;
  quantity: number;
  /** Null means "use the event's own start or end". */
  startsAt: Date | null;
  endsAt: Date | null;
  notes: string | null;
}

export interface EquipmentRequestUpdateInput {
  quantity?: number;
  startsAt?: Date;
  endsAt?: Date;
  notes?: string | null;
}

export interface EquipmentDecisionInput {
  decision: 'RESERVED' | 'REJECTED';
  reason: string | null;
}

export interface EquipmentRequestFilter {
  eventRequestId: string | null;
  status: EquipmentRequestStatus | null;
}

const MAX_NOTES = 2000;

function invalid(message: string): EquipmentInputError {
  return new EquipmentInputError('INVALID_EQUIPMENT_REQUEST_INPUT', message);
}

function asObject(input: unknown, label: string, allowed: readonly string[], error = invalid) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw error(`The ${label} must be a JSON object.`);
  }
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) throw error(`Unsupported field: ${key}.`);
  }
  return body;
}

function parseQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_QUANTITY) {
    throw invalid(`quantity must be a whole number from 1 to ${MAX_QUANTITY}.`);
  }
  return value;
}

function parseNotes(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') throw invalid('notes must be text or null.');
  const notes = typeof value === 'string' ? value.trim() : '';
  if (notes.length > MAX_NOTES) throw invalid(`notes must be at most ${MAX_NOTES} characters.`);
  return notes || null;
}

function parseRequiredTime(value: unknown, field: string): Date {
  const time = parseTimestamp(value);
  if (!time) throw invalid(`${field} must be an ISO 8601 date-time string.`);
  return time;
}

/** Validate request data only; requester identity and status come from the server. */
export function parseEquipmentRequestCreateInput(input: unknown): EquipmentRequestCreateInput {
  const body = asObject(input, 'equipment request',
    ['eventRequestId', 'equipmentTypeId', 'quantity', 'startsAt', 'endsAt', 'notes']);
  if (!isUuid(body.eventRequestId)) throw invalid('eventRequestId must be a UUID.');
  if (!isUuid(body.equipmentTypeId)) throw invalid('equipmentTypeId must be a UUID.');
  const startsAt = body.startsAt == null ? null : parseRequiredTime(body.startsAt, 'startsAt');
  const endsAt = body.endsAt == null ? null : parseRequiredTime(body.endsAt, 'endsAt');
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw invalid('endsAt must be later than startsAt.');
  }
  return {
    eventRequestId: body.eventRequestId,
    equipmentTypeId: body.equipmentTypeId,
    quantity: parseQuantity(body.quantity),
    startsAt,
    endsAt,
    notes: body.notes === undefined ? null : parseNotes(body.notes),
  };
}

/** PATCH omission leaves a field unchanged; explicit null clears notes only. */
export function parseEquipmentRequestUpdateInput(input: unknown): EquipmentRequestUpdateInput {
  const body = asObject(input, 'equipment request update', ['quantity', 'startsAt', 'endsAt', 'notes']);
  const result: EquipmentRequestUpdateInput = {};
  if (body.quantity !== undefined) result.quantity = parseQuantity(body.quantity);
  if (body.startsAt !== undefined) result.startsAt = parseRequiredTime(body.startsAt, 'startsAt');
  if (body.endsAt !== undefined) result.endsAt = parseRequiredTime(body.endsAt, 'endsAt');
  if (body.notes !== undefined) result.notes = parseNotes(body.notes);
  if (Object.keys(result).length === 0) throw invalid('At least one field must be supplied.');
  if (result.startsAt && result.endsAt && result.endsAt.getTime() <= result.startsAt.getTime()) {
    throw invalid('endsAt must be later than startsAt.');
  }
  return result;
}

/** CF-17: a rejection must explain itself; a reservation may carry an optional note. */
export function parseEquipmentDecisionInput(input: unknown): EquipmentDecisionInput {
  const error = (message: string) => new EquipmentInputError('INVALID_EQUIPMENT_DECISION_INPUT', message);
  const body = asObject(input, 'decision', ['decision', 'reason'], error);
  if (body.decision !== 'RESERVED' && body.decision !== 'REJECTED') {
    throw error('decision must be RESERVED or REJECTED.');
  }
  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
    throw error('reason must be text or null.');
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length > MAX_NOTES) throw error(`reason must be at most ${MAX_NOTES} characters.`);
  if (body.decision === 'REJECTED' && !reason) throw error('reason is required when rejecting a request.');
  return { decision: body.decision, reason: reason || null };
}

export function parseEquipmentRequestFilter(query: Record<string, unknown>): EquipmentRequestFilter {
  const error = (message: string) => new EquipmentInputError('INVALID_EQUIPMENT_REQUEST_FILTER', message);
  let eventRequestId: string | null = null;
  if (query.eventRequestId !== undefined) {
    if (!isUuid(query.eventRequestId)) throw error('eventRequestId must be one UUID.');
    eventRequestId = query.eventRequestId;
  }
  let status: EquipmentRequestStatus | null = null;
  if (query.status !== undefined) {
    if (typeof query.status !== 'string' ||
        !(EQUIPMENT_REQUEST_STATUSES as readonly string[]).includes(query.status)) {
      throw error(`status must be one of ${EQUIPMENT_REQUEST_STATUSES.join(', ')}.`);
    }
    status = query.status as EquipmentRequestStatus;
  }
  return { eventRequestId, status };
}
