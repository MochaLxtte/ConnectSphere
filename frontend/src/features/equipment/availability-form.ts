import type { EquipmentAvailabilityInput, EquipmentTypeSummary } from './api/equipment-availability';

const MAX_QUANTITY = 2_147_483_647;
const OFFSET_MS = 8 * 60 * 60 * 1000;
export interface EquipmentInputRow { equipmentTypeId: string; quantity: string }
export interface EquipmentFormErrors {
  startsAt?: string;
  endsAt?: string;
  items?: string;
  rows: { equipmentTypeId?: string; quantity?: string }[];
}

/** Validate the calendar before parsing: Date alone silently rolls 30 February into March. */
export function equipmentInputInstant(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const hour = Number(match[4]), minute = Number(match[5]), second = Number(match[6] ?? 0);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]!
    || hour > 23 || minute > 59 || second > 59) return null;
  return `${value}+08:00`;
}

function instantMicros(value: string): bigint {
  const fraction = /\.(\d+)[+-]/.exec(value)?.[1] ?? '';
  return BigInt(Date.parse(value)) * 1000n + BigInt(fraction.padEnd(6, '0').slice(3));
}

/** Preserve the database's microseconds; native datetime-local inputs only preserve milliseconds. */
export function equipmentInputTime(value: string | null): string {
  if (!value) return '';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return '';
  const fraction = /\.(\d+)(?:Z|[+-]\d\d:\d\d)$/.exec(value)?.[1];
  return new Date(time + OFFSET_MS).toISOString().slice(0, 19) + (fraction ? `.${fraction}` : '');
}

export function equipmentWhatIfInput(startsAt: string, endsAt: string, rows: EquipmentInputRow[],
  types: EquipmentTypeSummary[], requirementsVersion: string): {
    errors: EquipmentFormErrors; input: Extract<EquipmentAvailabilityInput, { mode: 'what-if' }> | null;
  } {
  const start = equipmentInputInstant(startsAt), end = equipmentInputInstant(endsAt);
  const errors: EquipmentFormErrors = { rows: [] };
  if (!start) errors.startsAt = 'Enter a valid start date and time in Singapore time.';
  if (!end) errors.endsAt = 'Enter a valid end date and time in Singapore time.';
  else if (start && instantMicros(end) <= instantMicros(start)) errors.endsAt = 'End must be after start.';
  if (!rows.length) errors.items = 'Add at least one equipment item.';
  const totals = new Map<string, number>();
  for (const row of rows) {
    const error: EquipmentFormErrors['rows'][number] = {};
    if (!types.some((type) => type.id === row.equipmentTypeId)) error.equipmentTypeId = 'Choose an equipment type.';
    const quantity = Number(row.quantity);
    if (!/^\d+$/.test(row.quantity) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      error.quantity = 'Enter a whole quantity from 1 to 2147483647.';
    } else {
      const total = (totals.get(row.equipmentTypeId) ?? 0) + quantity;
      totals.set(row.equipmentTypeId, total);
      if (total > MAX_QUANTITY) error.quantity = 'The combined quantity for this type must not exceed 2147483647.';
    }
    errors.rows.push(error);
  }
  const invalid = !!(errors.startsAt || errors.endsAt || errors.items
    || errors.rows.some((row) => row.equipmentTypeId || row.quantity));
  return { errors, input: invalid ? null : {
    mode: 'what-if', requirementsVersion, startsAt: start!, endsAt: end!,
    items: rows.map((row) => ({ equipmentTypeId: row.equipmentTypeId, quantity: Number(row.quantity) })),
  } };
}
