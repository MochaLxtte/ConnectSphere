const statusLabels = new Map([
  ['DRAFT', 'Draft'],
  ['SUBMITTED', 'Submitted'],
  ['UNDER_REVIEW', 'Under review'],
  ['CLARIFICATION_REQUESTED', 'Clarification requested'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
  ['CONFIRMED', 'Confirmed'],
  ['CANCELLED', 'Cancelled'],
  ['COMPLETED', 'Completed'],
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
