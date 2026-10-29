import type { NotificationInput } from './notify.js';

/**
 * KAN-15-AC10 (design D6, 27 October 2026): change-request notices through the KAN-64 inbox.
 * Kept apart from the KAN-64 trigger matrix, which deliberately excludes change triggers
 * (KAN-64-AC209). Attendee notices for applied changes belong to KAN-80.
 *
 * | Trigger (acting user)              | Recipients                                              |
 * | ---------------------------------- | ------------------------------------------------------- |
 * | Change request submitted (owner)   | the assigned coordinator, and the owner as an           |
 * |                                    | acknowledgement                                         |
 * | Approved or rejected (coordinator) | the owner and the deciding coordinator                  |
 * | Withdrawn (owner)                  | the assigned coordinator                                |
 */
export const CHANGE_REQUEST_NOTIFICATION_TYPES = [
  'CHANGE_REQUEST_SUBMITTED',
  'CHANGE_REQUEST_APPROVED',
  'CHANGE_REQUEST_REJECTED',
  'CHANGE_REQUEST_WITHDRAWN',
] as const;

interface EventRef {
  id: string;
  name: string | null;
  organiserId: string;
  coordinatorId: string | null;
}

const label = (event: Pick<EventRef, 'name'>) =>
  event.name?.trim() ? `“${event.name.trim()}”` : 'an untitled event';

export function changeRequestSubmittedNotifications(
  event: EventRef, changeRequestId: string,
): NotificationInput[] {
  const notices: NotificationInput[] = [{
    recipientId: event.organiserId, eventRequestId: event.id, changeRequestId, type: 'CHANGE_REQUEST_SUBMITTED',
    title: 'Change request submitted',
    message: `Your change request for ${label(event)} was sent to the coordinator for review. ` +
      'The event keeps its current details until the change is approved.',
    dedupeKey: `CHANGE_REQUEST_SUBMITTED:${changeRequestId}:organiser`,
  }];
  if (event.coordinatorId) {
    notices.push({
      recipientId: event.coordinatorId, eventRequestId: event.id, changeRequestId, type: 'CHANGE_REQUEST_SUBMITTED',
      title: 'Change request to review',
      message: `The organiser of ${label(event)} requested a change. Open the event to review it.`,
      dedupeKey: `CHANGE_REQUEST_SUBMITTED:${changeRequestId}:coordinator`,
    });
  }
  return notices;
}

export function changeRequestDecisionNotifications(
  event: EventRef,
  decision: { id: string; outcome: 'APPROVED' | 'REJECTED'; reason: string | null; cancelledCount: number },
): NotificationInput[] {
  const approved = decision.outcome === 'APPROVED';
  const type = approved ? 'CHANGE_REQUEST_APPROVED' : 'CHANGE_REQUEST_REJECTED';
  const parts = [
    `Your change request for ${label(event)} was ${approved ? 'approved and applied' : 'rejected'}.`,
    decision.reason?.trim() ? `Reason: ${decision.reason.trim()}` : null,
    approved && decision.cancelledCount > 0
      ? `${decision.cancelledCount} pending arrangement${decision.cancelledCount === 1 ? ' was' : 's were'} ` +
        'cancelled and must be requested again for the new details.'
      : null,
  ].filter((part): part is string => part !== null)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`));
  const notices: NotificationInput[] = [{
    recipientId: event.organiserId, eventRequestId: event.id, changeRequestId: decision.id, type,
    title: approved ? 'Change request approved' : 'Change request rejected',
    message: parts.join(' '),
    dedupeKey: `${type}:${decision.id}`,
  }];
  if (event.coordinatorId && event.coordinatorId !== event.organiserId) {
    notices.push({
      recipientId: event.coordinatorId, eventRequestId: event.id, changeRequestId: decision.id, type,
      title: approved ? 'Change request approved' : 'Change request rejected',
      message: `You ${approved ? 'approved' : 'rejected'} the change request for ${label(event)}.`,
      dedupeKey: `${type}:${decision.id}`,
    });
  }
  return notices;
}

export function changeRequestWithdrawnNotifications(
  event: EventRef, changeRequestId: string,
): NotificationInput[] {
  if (!event.coordinatorId) return [];
  return [{
    recipientId: event.coordinatorId, eventRequestId: event.id, changeRequestId, type: 'CHANGE_REQUEST_WITHDRAWN',
    title: 'Change request withdrawn',
    message: `The organiser of ${label(event)} withdrew their change request.`,
    dedupeKey: `CHANGE_REQUEST_WITHDRAWN:${changeRequestId}`,
  }];
}
