const statusLabels = new Map([
  ['DRAFT', 'Draft'],
  ['SUBMITTED', 'Submitted'],
  ['UNDER_REVIEW', 'Under review'],
  ['CLARIFICATION_REQUESTED', 'Clarification requested'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
]);
const eventDate = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore',
});

export function eventStatusLabel(status: string): string {
  return statusLabels.get(status) ?? 'Status unavailable';
}

export function formatEventTime(value: string | null, invalidLabel = 'Time unavailable'): string {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? invalidLabel : eventDate.format(date);
}

/** Singapore has no daylight saving; its offset from UTC is a fixed 8 hours. */
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
const inputPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** For an `<input type="datetime-local">` value, showing the stored instant as Singapore wall time. */
export function toSingaporeInputValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const sgt = new Date(date.getTime() + SGT_OFFSET_MS);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${sgt.getUTCFullYear()}-${pad(sgt.getUTCMonth() + 1)}-${pad(sgt.getUTCDate())}` +
    `T${pad(sgt.getUTCHours())}:${pad(sgt.getUTCMinutes())}`;
}

/** Reads an `<input type="datetime-local">` value as Singapore wall time and returns an ISO instant, or null. */
export function fromSingaporeInputValue(value: string): string | null {
  const match = inputPattern.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number) as [number, number, number, number, number, number];
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - SGT_OFFSET_MS;
  return new Date(utcMs).toISOString();
}
