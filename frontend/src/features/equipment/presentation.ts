import { ApiError } from '../../lib/api-client';

const statusLabels = new Map([
  ['REQUESTED', 'Awaiting decision'],
  ['RESERVED', 'Reserved'],
  ['REJECTED', 'Rejected'],
  ['CANCELLED', 'Cancelled'],
]);
const dateTime = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore',
});
/** Singapore has no daylight saving, so form values map to instants with a fixed offset. */
const SINGAPORE_OFFSET_MS = 8 * 60 * 60 * 1000;

export function equipmentStatusLabel(status: string): string {
  return statusLabels.get(status) ?? 'Status unavailable';
}

export function formatEquipmentTime(value: string | null | undefined): string {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : dateTime.format(date);
}

export function formatPeriod(startsAt: string, endsAt: string): string {
  return `${formatEquipmentTime(startsAt)} to ${formatEquipmentTime(endsAt)}`;
}

/** ISO instant → value for a datetime-local input showing Singapore wall-clock time. */
export function toSingaporeInput(value: string | null | undefined): string {
  if (!value) return '';
  const time = Date.parse(value);
  return Number.isNaN(time) ? '' : new Date(time + SINGAPORE_OFFSET_MS).toISOString().slice(0, 16);
}

/** datetime-local value read as Singapore wall-clock time → ISO instant, or null when invalid. */
export function fromSingaporeInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const time = Date.parse(`${value.slice(0, 16)}:00+08:00`);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export function availabilityLabel(available: number, totalQuantity: number): string {
  return `${available} of ${totalQuantity} available`;
}

/** Messages for responses the user can act on; anything else falls back to the API's own text. */
export function equipmentErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  switch (error.code) {
    case 'EQUIPMENT_REQUEST_NOT_FOUND':
    case 'EVENT_REQUEST_NOT_FOUND':
      return 'This item is unavailable or you do not have permission to use it.';
    case 'EQUIPMENT_REQUEST_NOT_PENDING':
      return 'This request has already been decided or cancelled. The list has been refreshed.';
    case 'EQUIPMENT_REQUEST_NOT_CANCELLABLE':
      return 'This request has already been rejected or cancelled.';
    default:
      return error.message || fallback;
  }
}

export function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
