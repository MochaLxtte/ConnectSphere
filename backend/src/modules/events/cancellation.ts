import type { Pool, PoolClient } from 'pg';
import { recordNotifications } from '../notifications/notify.js';
import { inActorTransaction, WorkflowError, type WorkflowActor } from './workflow-support.js';

const eligible = ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED'];

export function parseCancellation(input: unknown): { reason: string; confirmAffectedArrangements: true } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_CANCELLATION', 'A JSON object is required.');
  }
  const body = input as Record<string, unknown>;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason || reason.length > 2000 || body.confirmAffectedArrangements !== true ||
      Object.keys(body).some((key) => !['reason', 'confirmAffectedArrangements'].includes(key))) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_CANCELLATION',
      'Provide a non-empty reason of at most 2000 characters and confirm affected arrangements.');
  }
  return { reason, confirmAffectedArrangements: true };
}

export async function cancelEvent(
  pool: Pick<Pool, 'connect'>,
  { eventRequestId, actor, input }: { eventRequestId: string; actor: WorkflowActor; input: unknown },
) {
  const { reason } = parseCancellation(input);
  return inActorTransaction(pool, actor.id, async (client) => {
    const result = await client.query<{
      id: string; organiserId: string; coordinatorId: string | null; status: string; name: string | null;
    }>(`SELECT id, organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status, name
      FROM event_requests WHERE id = $1 FOR UPDATE`, [eventRequestId]);
    const event = result.rows[0];
    if (!event || (actor.id !== event.organiserId && actor.id !== event.coordinatorId)) {
      throw new WorkflowError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.');
    }
    if (!['EVENT_ORGANISER', 'EVENT_COORDINATOR'].includes(actor.role)) {
      throw new WorkflowError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.');
    }
    if (!eligible.includes(event.status)) {
      throw new WorkflowError('CONFLICT', 'EVENT_NOT_CANCELLABLE', 'This event is not in a cancellable state.');
    }

    const venues = await client.query<{ id: string }>(`UPDATE venue_bookings SET status = 'CANCELLED',
      cancelled_by = $2, cancelled_at = now(), cancellation_reason = $3, updated_at = now()
      WHERE event_request_id = $1 AND status IN ('PENDING', 'APPROVED', 'HELD') RETURNING id`,
    [eventRequestId, actor.id, reason]);
    const equipment = await client.query<{ id: string }>(`UPDATE equipment_requests SET status = 'CANCELLED',
      cancelled_by = $2, cancelled_at = now(), cancellation_reason = $3, updated_at = now(), revision = revision + 1
      WHERE event_request_id = $1 AND status IN ('REQUESTED', 'RESERVED') RETURNING id`,
    [eventRequestId, actor.id, reason]);
    const registrations = await client.query<{ id: string; attendeeId: string }>(`UPDATE event_registrations
      SET status = 'CANCELLED', cancellation_outcome_at = now()
      WHERE event_request_id = $1 AND status = 'REGISTERED' RETURNING id, attendee_id AS "attendeeId"`, [eventRequestId]);
    const audit = await client.query(`INSERT INTO event_cancellations
      (event_request_id, cancelled_by, reason, affected_venue_bookings, affected_equipment_requests, affected_registrations)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING cancelled_at AS "cancelledAt"`,
    [eventRequestId, actor.id, reason, venues.rowCount ?? 0, equipment.rowCount ?? 0, registrations.rowCount ?? 0]);
    await client.query(`UPDATE event_requests SET status = 'CANCELLED', updated_at = now() WHERE id = $1`, [eventRequestId]);
    await client.query(`UPDATE event_status_history SET reason = $2 WHERE id = (
      SELECT id FROM event_status_history WHERE event_request_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1)`,
    [eventRequestId, reason]);

    const notices = [event.organiserId, event.coordinatorId].filter((id): id is string => id !== null)
      .map((recipientId) => ({ recipientId, eventRequestId, type: 'EVENT_CANCELLED',
        title: 'Event cancelled', message: `${event.name ?? 'Your event'} was cancelled.`,
        dedupeKey: `EVENT_CANCELLED:${eventRequestId}` }));
    for (const { attendeeId } of registrations.rows) notices.push({ recipientId: attendeeId, eventRequestId,
      type: 'EVENT_CANCELLED', title: 'Event cancelled',
      message: `${event.name ?? 'The event'} has been cancelled. Your registration is no longer active.`,
      dedupeKey: `EVENT_CANCELLED:${eventRequestId}` });
    await recordNotifications(client, notices);
    return { eventRequestId, status: 'CANCELLED', cancelledBy: actor.id,
      cancelledAt: audit.rows[0]?.cancelledAt, reason,
      released: { venueBookings: venues.rowCount ?? 0, equipmentRequests: equipment.rowCount ?? 0,
        registrations: registrations.rowCount ?? 0 } };
  });
}

export type CancellationClient = Pick<PoolClient, 'query'>;
