import { UUID_PATTERN, WorkflowError } from '../events/workflow-support.js';
import type { EquipmentAvailabilityInput } from './availability-types.js';

export const MAX_EQUIPMENT_QUANTITY = 2_147_483_647;

export function invalidAvailability(message: string): WorkflowError {
  return new WorkflowError('INVALID_INPUT', 'INVALID_EQUIPMENT_AVAILABILITY_INPUT', message);
}

/** Preserve PostgreSQL's microseconds: Date alone would silently move interval boundaries. */
export function equipmentInstant(value: unknown, field: string): bigint {
  if (typeof value !== 'string') throw invalidAvailability(`${field} must be an ISO date and time with an offset.`);
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!parts) throw invalidAvailability(`${field} must be an ISO date and time with an offset and at most six fractional digits.`);
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const hour = Number(parts[4]);
  const minute = Number(parts[5]);
  const second = Number(parts[6] ?? 0);
  const offsetHour = Number(parts[10] ?? 0);
  const offsetMinute = Number(parts[11] ?? 0);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]!
    || hour > 23 || minute > 59 || second > 59 || offsetHour > 15 || offsetMinute > 59) {
    throw invalidAvailability(`${field} must contain a valid calendar date, time and offset.`);
  }
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  const offset = (offsetHour * 60 + offsetMinute) * 60_000 * (parts[9] === '-' ? -1 : 1);
  const microseconds = BigInt(date.getTime() - offset) * 1000n + BigInt((parts[7] ?? '').padEnd(6, '0'));
  // Offsets near New Year must not escape the four-digit supported UTC year range.
  if (microseconds < -62_135_596_800_000_000n || microseconds >= 253_402_300_800_000_000n) {
    throw invalidAvailability(`${field} must resolve to a UTC year between 0001 and 9999.`);
  }
  return microseconds;
}

export function equipmentPeriod(startsAt: unknown, endsAt: unknown): { start: bigint; end: bigint } {
  const start = equipmentInstant(startsAt, 'startsAt');
  const end = equipmentInstant(endsAt, 'endsAt');
  if (end <= start) throw invalidAvailability('endsAt must be after startsAt.');
  return { start, end };
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidAvailability(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function fields(value: Record<string, unknown>, allowed: string[], field: string): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) {
    throw invalidAvailability(`${field} contains unsupported fields.`);
  }
}

export function aggregateEquipmentItems(
  items: readonly { equipmentTypeId: string; quantity: number }[],
): { equipmentTypeId: string; quantity: number }[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_EQUIPMENT_QUANTITY) {
      throw invalidAvailability('Each quantity must be a positive whole number no greater than 2147483647.');
    }
    const quantity = (totals.get(item.equipmentTypeId) ?? 0) + item.quantity;
    if (quantity > MAX_EQUIPMENT_QUANTITY) {
      throw invalidAvailability('The combined quantity for each equipment type must not exceed 2147483647.');
    }
    totals.set(item.equipmentTypeId, quantity);
  }
  return [...totals].map(([equipmentTypeId, quantity]) => ({ equipmentTypeId, quantity }));
}

export function parseEquipmentAvailabilityInput(input: unknown): EquipmentAvailabilityInput {
  const body = record(input, 'The availability input');
  if (body.mode !== 'saved' && body.mode !== 'what-if') throw invalidAvailability('mode must be saved or what-if.');
  fields(body, body.mode === 'saved' ? ['mode', 'requirementsVersion']
    : ['mode', 'requirementsVersion', 'startsAt', 'endsAt', 'items'], 'The availability input');
  if (typeof body.requirementsVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.requirementsVersion)) {
    throw invalidAvailability('requirementsVersion must match the version supplied by the equipment context.');
  }
  if (body.mode === 'saved') return { mode: body.mode, requirementsVersion: body.requirementsVersion };
  equipmentPeriod(body.startsAt, body.endsAt);
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw invalidAvailability('items must include at least one equipment type and quantity.');
  }
  const items = body.items.map((value: unknown, index: number) => {
    const item = record(value, `items[${index}]`);
    fields(item, ['equipmentTypeId', 'quantity'], `items[${index}]`);
    if (typeof item.equipmentTypeId !== 'string' || !UUID_PATTERN.test(item.equipmentTypeId)) {
      throw invalidAvailability(`items[${index}].equipmentTypeId must be a UUID.`);
    }
    if (typeof item.quantity !== 'number') throw invalidAvailability(`items[${index}].quantity must be a number.`);
    return { equipmentTypeId: item.equipmentTypeId.toLowerCase(), quantity: item.quantity };
  });
  return {
    mode: body.mode, requirementsVersion: body.requirementsVersion,
    startsAt: body.startsAt as string, endsAt: body.endsAt as string,
    items: aggregateEquipmentItems(items),
  };
}
