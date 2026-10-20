import type { NotificationInput } from './notify.js';

/**
 * KAN-64-AC208: the trigger/recipient matrix. Recipients follow each person's relationship to the
 * outcome, never "everyone except the actor", so a recipient who is also the actor receives an
 * acknowledgement. The matrix is a team implementation assumption recorded in the decision log
 * (21 October 2026) until the team confirms it.
 *
 * | Trigger (acting user)                       | Recipients                                                    |
 * | ------------------------------------------- | ------------------------------------------------------------- |
 * | Request submitted (organiser)               | the organiser, as an acknowledgement                           |
 * | Clarification requested (coordinator)       | the organiser                                                  |
 * | Initial approval or rejection (coordinator) | the organiser                                                  |
 * | Initial assignment (Lead)                   | the organiser and the new coordinator                          |
 * | Reassignment (Lead)                         | the organiser and the new coordinator, plus the previous       |
 * |                                             | coordinator, who gets a minimal notice with no event details   |
 * | Venue booking decision (Venue Staff)        | the organiser, the event's current coordinator, and the        |
 * |                                             | deciding Venue Staff member, as an acknowledgement             |
 *
 * Out of scope here (KAN-64-AC209): equipment, significant change, final confirmation/cancellation
 * and registration/withdrawal triggers belong to KAN-80.
 */
export const NOTIFICATION_TYPES = [
  'REQUEST_SUBMITTED',
  'CLARIFICATION_REQUESTED',
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
  'COORDINATOR_ASSIGNED',
  'COORDINATOR_REASSIGNED',
  'COORDINATOR_REASSIGNED_AWAY',
  'VENUE_BOOKING_APPROVED',
  'VENUE_BOOKING_REJECTED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Shown to a coordinator who has lost access. It must stay free of event details (AC202, AC206). */
export const REASSIGNED_AWAY_MESSAGE =
  'An event request you coordinated was reassigned to another coordinator. You no longer have access to it.';

interface EventRef {
  id: string;
  name: string | null;
  organiserId: string;
}

/** After a preposition: `for “Career fair”` or `for an untitled event request`. */
const label = (event: Pick<EventRef, 'name'>) =>
  event.name?.trim() ? `“${event.name.trim()}”` : 'an untitled event request';

/** The organiser's own request as a sentence subject, without the awkward "event request an untitled…". */
const yourRequest = (event: Pick<EventRef, 'name'>) =>
  event.name?.trim() ? `Your event request “${event.name.trim()}”` : 'Your untitled event request';

/** Joins sentences with single spaces, ending each in punctuation so free text never runs on. */
const sentences = (...parts: (string | null | undefined | false)[]) => parts
  .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
  .map((part) => part.trim())
  .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
  .join(' ');

const reasonSentence = (reason: string | null) => (reason?.trim() ? `Reason: ${reason.trim()}` : null);

const singapore = new Intl.DateTimeFormat('en-SG', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  hourCycle: 'h23', timeZone: 'Asia/Singapore',
});

/** `5 Oct 2026, 10:00 to 5 Oct 2026, 12:00 (Singapore time)`. */
export function bookingPeriod(startsAt: Date | string, endsAt: Date | string): string {
  return `${singapore.format(new Date(startsAt))} to ${singapore.format(new Date(endsAt))} (Singapore time)`;
}

export function submissionNotifications(event: EventRef): NotificationInput[] {
  return [{
    recipientId: event.organiserId, eventRequestId: event.id, type: 'REQUEST_SUBMITTED',
    title: 'Event request submitted',
    message: `${yourRequest(event)} was submitted. It is waiting to be allocated to a coordinator.`,
    dedupeKey: `REQUEST_SUBMITTED:${event.id}`,
  }];
}

export function clarificationNotifications(
  event: EventRef, clarification: { id: string; message: string },
): NotificationInput[] {
  return [{
    recipientId: event.organiserId, eventRequestId: event.id, type: 'CLARIFICATION_REQUESTED',
    title: 'Clarification requested',
    message: sentences(
      `Your coordinator needs more information about ${label(event)}: ${clarification.message.trim()}`,
      'Open the request to respond',
    ),
    dedupeKey: `CLARIFICATION_REQUESTED:${clarification.id}`,
  }];
}

export function reviewNotifications(
  event: EventRef, review: { id: string; decision: 'APPROVED' | 'REJECTED'; reason: string | null },
): NotificationInput[] {
  const approved = review.decision === 'APPROVED';
  const type = approved ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED';
  return [{
    recipientId: event.organiserId, eventRequestId: event.id, type,
    title: approved ? 'Event request approved' : 'Event request rejected',
    message: sentences(
      `${yourRequest(event)} was ${approved ? 'approved' : 'rejected'}`, reasonSentence(review.reason),
    ),
    dedupeKey: `${type}:${review.id}`,
  }];
}

export function assignmentNotifications(
  event: EventRef,
  assignment: { id: string; coordinatorId: string; coordinatorName: string },
  previousCoordinatorId: string | null,
  reassigned: boolean,
): NotificationInput[] {
  const type = reassigned ? 'COORDINATOR_REASSIGNED' : 'COORDINATOR_ASSIGNED';
  const key = `${type}:${assignment.id}`;
  const notifications: NotificationInput[] = [{
    recipientId: event.organiserId, eventRequestId: event.id, type,
    title: reassigned ? 'Coordinator changed' : 'Coordinator allocated',
    message: reassigned
      ? `The coordinator for ${label(event)} is now ${assignment.coordinatorName}.`
      : `${assignment.coordinatorName} is now the coordinator for ${label(event)}.`,
    dedupeKey: key,
  }, {
    recipientId: assignment.coordinatorId, eventRequestId: event.id, type,
    title: reassigned ? 'Event request reassigned to you' : 'Event request assigned to you',
    message: `${reassigned ? 'You are now the coordinator for' : 'You have been allocated'} ${label(event)}. `
      + 'Open it to start the review.',
    dedupeKey: key,
  }];
  if (reassigned && previousCoordinatorId !== null && previousCoordinatorId !== assignment.coordinatorId) {
    notifications.push({
      recipientId: previousCoordinatorId, eventRequestId: event.id, type: 'COORDINATOR_REASSIGNED_AWAY',
      title: 'Event reassigned', message: REASSIGNED_AWAY_MESSAGE,
      dedupeKey: `COORDINATOR_REASSIGNED_AWAY:${assignment.id}`,
    });
  }
  return notifications;
}

export function bookingDecisionNotifications(
  event: EventRef & { coordinatorId: string | null },
  booking: {
    id: string; decision: 'APPROVED' | 'REJECTED'; reason: string | null; venueName: string;
    startsAt: Date | string; endsAt: Date | string;
  },
  decidedBy: string,
): NotificationInput[] {
  const approved = booking.decision === 'APPROVED';
  const type = approved ? 'VENUE_BOOKING_APPROVED' : 'VENUE_BOOKING_REJECTED';
  const outcome = approved ? 'approved' : 'rejected';
  const subject = `the booking request for ${label(event)} at ${booking.venueName}, `
    + `${bookingPeriod(booking.startsAt, booking.endsAt)}`;
  const base = {
    eventRequestId: event.id, venueBookingId: booking.id, type, dedupeKey: `${type}:${booking.id}`,
  };
  const title = approved ? 'Venue booking approved' : 'Venue booking rejected';
  const notifications: NotificationInput[] = [{
    ...base, recipientId: event.organiserId, title,
    message: sentences(`Venue staff ${outcome} ${subject}`, reasonSentence(booking.reason)),
  }];
  if (event.coordinatorId !== null) {
    notifications.push({
      ...base, recipientId: event.coordinatorId, title,
      message: sentences(
        `Venue staff ${outcome} ${subject}`, reasonSentence(booking.reason),
        approved ? 'Open the booking for details' : 'Review the reason and request another venue if needed',
      ),
    });
  }
  notifications.push({
    ...base, recipientId: decidedBy, title,
    message: sentences(`You ${outcome} ${subject}`, reasonSentence(booking.reason)),
  });
  return notifications;
}
