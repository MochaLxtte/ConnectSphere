import type { NotificationInput } from './notify.js';
import { bookingPeriod } from './trigger-matrix.js';

/**
 * KAN-82-AC11 (design D5, 28 October 2026): independent venue arrangement notices through the
 * KAN-64 inbox, written in the same transaction as the change so a refused or rolled-back action
 * sends none. The schema has no per-venue staff allocation, so every Venue Staff member is relevant,
 * the same rule as the review queue.
 *
 * | Trigger (coordinator)                  | Recipients                                            |
 * | -------------------------------------- | ----------------------------------------------------- |
 * | One arrangement cancelled              | the current coordinator, and every Venue Staff member |
 * | Replacement requested for a cancelled  | the current coordinator, and every Venue Staff member |
 * | arrangement                            |                                                       |
 */
export const ARRANGEMENT_NOTIFICATION_TYPES = [
  'VENUE_ARRANGEMENT_CANCELLED',
  'VENUE_REPLACEMENT_REQUESTED',
] as const;

export interface ArrangementRef {
  eventId: string;
  eventName: string | null;
  coordinatorId: string;
  bookingId: string;
  venueName: string;
  startsAt: Date | string;
  endsAt: Date | string;
}

const label = (name: string | null) => (name?.trim() ? `“${name.trim()}”` : 'an untitled event');

function notices(
  arrangement: ArrangementRef, venueStaffIds: readonly string[], type: string, title: string,
  coordinatorMessage: string, staffMessage: string,
): NotificationInput[] {
  const base = { eventRequestId: arrangement.eventId, venueBookingId: arrangement.bookingId, type, title };
  // A coordinator who is also listed as staff cannot exist (one role per account), but keep one row each.
  const staff = [...new Set(venueStaffIds)].filter((id) => id !== arrangement.coordinatorId);
  return [
    { ...base, recipientId: arrangement.coordinatorId, message: coordinatorMessage,
      dedupeKey: `${type}:${arrangement.bookingId}` },
    ...staff.map((recipientId) => ({ ...base, recipientId, message: staffMessage,
      dedupeKey: `${type}:${arrangement.bookingId}` })),
  ];
}

export function arrangementCancelledNotifications(
  arrangement: ArrangementRef, reason: string, venueStaffIds: readonly string[],
): NotificationInput[] {
  const subject = `${arrangement.venueName} for ${label(arrangement.eventName)}, `
    + bookingPeriod(arrangement.startsAt, arrangement.endsAt);
  // End free text in punctuation so the next sentence never runs on.
  const because = `Reason: ${reason.trim()}${/[.!?]$/.test(reason.trim()) ? '' : '.'}`;
  return notices(arrangement, venueStaffIds, 'VENUE_ARRANGEMENT_CANCELLED', 'Venue arrangement cancelled',
    `You cancelled ${subject}. ${because} The venue period was released; other arrangements are unchanged.`,
    `The coordinator cancelled ${subject}. ${because} The venue period is free again.`);
}

export function replacementRequestedNotifications(
  arrangement: ArrangementRef, venueStaffIds: readonly string[],
): NotificationInput[] {
  const subject = `${arrangement.venueName} for ${label(arrangement.eventName)}, `
    + bookingPeriod(arrangement.startsAt, arrangement.endsAt);
  return notices(arrangement, venueStaffIds, 'VENUE_REPLACEMENT_REQUESTED', 'Replacement venue requested',
    `Your replacement request for ${subject} was sent to Venue Staff. It stays pending until they decide.`,
    `The coordinator requested ${subject} to replace a cancelled arrangement. Review it in Venue bookings.`);
}
