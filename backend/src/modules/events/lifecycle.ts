import { notify, type NotificationInput } from '../notifications/notify.js';
import type { EventStatus } from './types.js';
import {
  cancelOpenArrangements, eventLabel, inActorTransaction, iso, lockEventRequest, othersThan,
  parseObjectBody, readEventRequest, requiredText, requireRelation, setEventStatus, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from './workflow-support.js';

/**
 * CF-06 later lifecycle. Q-04 and Q-12 are open, so these are PROVISIONAL team rules:
 *   APPROVED -> CONFIRMED   assigned coordinator; needs an APPROVED venue booking and no
 *                           equipment request still awaiting a decision
 *   (active) -> CANCELLED   owner or assigned coordinator, with a reason; releases open
 *                           venue bookings and equipment requests
 *   CONFIRMED -> COMPLETED  assigned coordinator, once the event's end time has passed
 * The schema has no column for a cancellation reason, so it travels in the notifications.
 */
const NOT_CANCELLABLE: readonly EventStatus[] = ['DRAFT', 'REJECTED', 'CANCELLED', 'COMPLETED'];

export interface StatusHistoryEntry {
  id: string;
  fromStatus: EventStatus | null;
  toStatus: EventStatus;
  changedById: string | null;
  changedByName: string | null;
  createdAt: string;
}

interface Command {
  eventRequestId: string;
  actor: WorkflowActor;
}

export interface LifecycleResult<Status extends EventStatus> {
  eventRequestId: string;
  status: Status;
}

const coordinatorOnly = 'Only the assigned coordinator can perform this action.';

export async function confirmEvent(
  { pool }: WorkflowDependencies,
  { eventRequestId, actor }: Command,
): Promise<LifecycleResult<'CONFIRMED'>> {
  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['ASSIGNED_COORDINATOR'], coordinatorOnly);
    if (event.status !== 'APPROVED') {
      throw new WorkflowError('CONFLICT', 'EVENT_NOT_CONFIRMABLE', 'Only an approved event can be confirmed.');
    }
    const arrangements = await client.query<{ approvedVenues: number; pendingEquipment: number }>(
      `SELECT
         (SELECT count(*)::integer FROM venue_bookings
          WHERE event_request_id = $1 AND status = 'APPROVED') AS "approvedVenues",
         (SELECT count(*)::integer FROM equipment_requests
          WHERE event_request_id = $1 AND status = 'REQUESTED') AS "pendingEquipment"`,
      [event.id],
    );
    const { approvedVenues, pendingEquipment } = arrangements.rows[0]!;
    if (approvedVenues < 1) {
      throw new WorkflowError('CONFLICT', 'VENUE_BOOKING_REQUIRED', 'An approved venue booking is required before the event can be confirmed.');
    }
    if (pendingEquipment > 0) {
      throw new WorkflowError('CONFLICT', 'EQUIPMENT_REQUESTS_PENDING', 'Equipment requests are still awaiting a decision.');
    }
    await setEventStatus(client, event.id, 'CONFIRMED');
    await notify(client, othersThan(actor.id, event.organiserId).map((recipientId) => ({
      recipientId, eventRequestId: event.id, type: 'EVENT_CONFIRMED',
      title: 'Event confirmed',
      message: `${eventLabel(event)} is confirmed. Its venue and equipment arrangements are in place.`,
    })));
    return { eventRequestId: event.id, status: 'CONFIRMED' as const };
  });
}

export interface CancellationResult extends LifecycleResult<'CANCELLED'> {
  cancelledVenueBookings: number;
  cancelledEquipmentRequests: number;
  notifiedAttendees: number;
}

export async function cancelEvent(
  { pool }: WorkflowDependencies,
  command: Command & { input: unknown },
): Promise<CancellationResult> {
  const { eventRequestId, actor } = command;
  const reason = requiredText(parseObjectBody(command.input, ['reason']), 'reason');

  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
    if (NOT_CANCELLABLE.includes(event.status)) {
      throw new WorkflowError('CONFLICT', 'EVENT_NOT_CANCELLABLE', event.status === 'DRAFT'
        ? 'A draft has not been submitted, so there is nothing to cancel.'
        : 'This event request is already closed.');
    }
    await setEventStatus(client, event.id, 'CANCELLED');
    const released = await cancelOpenArrangements(client, event.id);

    const attendees = await client.query<{ attendeeId: string }>(
      `SELECT attendee_id AS "attendeeId" FROM event_registrations
       WHERE event_request_id = $1 AND status = 'REGISTERED'`,
      [event.id],
    );
    const label = eventLabel(event);
    const staff = othersThan(actor.id, event.organiserId, event.coordinatorId);
    const attendeeIds = othersThan(actor.id, ...attendees.rows.map((row) => row.attendeeId))
      .filter((id) => !staff.includes(id));
    const notifications: NotificationInput[] = [
      ...staff.map((recipientId) => ({
        recipientId, eventRequestId: event.id, type: 'EVENT_CANCELLED',
        title: 'Event cancelled',
        message: `${label} was cancelled. Reason: ${reason}`,
      })),
      // Attendees learn that the event is off, not the internal reason.
      ...attendeeIds.map((recipientId) => ({
        recipientId, eventRequestId: event.id, type: 'EVENT_CANCELLED',
        title: 'Event cancelled',
        message: `${label}, which you registered for, has been cancelled.`,
      })),
    ];
    await notify(client, notifications);

    return {
      eventRequestId: event.id, status: 'CANCELLED' as const,
      cancelledVenueBookings: released.venueBookings,
      cancelledEquipmentRequests: released.equipmentRequests,
      notifiedAttendees: attendeeIds.length,
    };
  });
}

export async function completeEvent(
  { pool }: WorkflowDependencies,
  { eventRequestId, actor }: Command,
): Promise<LifecycleResult<'COMPLETED'>> {
  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['ASSIGNED_COORDINATOR'], coordinatorOnly);
    if (event.status !== 'CONFIRMED') {
      throw new WorkflowError('CONFLICT', 'EVENT_NOT_COMPLETABLE', 'Only a confirmed event can be completed.');
    }
    if (!event.hasEnded) {
      throw new WorkflowError('CONFLICT', 'EVENT_NOT_ENDED', 'The event can be completed once its end time has passed.');
    }
    await setEventStatus(client, event.id, 'COMPLETED');
    await notify(client, othersThan(actor.id, event.organiserId).map((recipientId) => ({
      recipientId, eventRequestId: event.id, type: 'EVENT_COMPLETED',
      title: 'Event completed',
      message: `${eventLabel(event)} has been marked as completed.`,
    })));
    return { eventRequestId: event.id, status: 'COMPLETED' as const };
  });
}

export async function listStatusHistory(
  { pool }: WorkflowDependencies,
  { eventRequestId, actor }: Command,
): Promise<StatusHistoryEntry[]> {
  const event = await readEventRequest(pool, eventRequestId);
  requireRelation(actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
  const found = await pool.query<Omit<StatusHistoryEntry, 'createdAt'> & { createdAt: Date }>(
    `SELECT h.id, h.from_status AS "fromStatus", h.to_status AS "toStatus",
            h.changed_by AS "changedById", u.display_name AS "changedByName",
            h.created_at AS "createdAt"
     FROM event_status_history h LEFT JOIN app_users u ON u.id = h.changed_by
     WHERE h.event_request_id = $1
     ORDER BY h.created_at ASC, h.id`,
    [event.id],
  );
  return found.rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
}
