import type { Pool } from 'pg';
import { recordNotifications } from '../notifications/notify.js';
import { eventCompletedNotifications } from '../notifications/trigger-matrix.js';
import { assertVenueBookingsLocked, lockVenueBookingsBeforeEvent } from './arrangement-locks.js';
import { inActorTransaction, iso, WorkflowError, type WorkflowActor } from './workflow-support.js';

const notFound = () => new WorkflowError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.');

export interface EventCompletion {
  eventRequestId: string;
  status: 'COMPLETED';
  completedById: string;
  completedByName: string | null;
  completedAt: string;
  /** Equipment reservations released by the completion. */
  releasedEquipmentRequests: number;
}

/**
 * KAN-10: the currently assigned coordinator marks a CONFIRMED event completed once it has ended
 * (by the database clock). One transaction records the status change with its actor and time, releases the
 * still-reserved equipment exactly once (migration 015's status trigger) and writes the notices.
 * Registration and withdrawal close because they require a CONFIRMED event; registrations and venue
 * bookings are left as they are. Early, repeated, stale or unauthorised attempts change nothing.
 */
export async function completeEvent(
  pool: Pick<Pool, 'connect'>,
  { eventRequestId, actor }: { eventRequestId: string; actor: WorkflowActor },
): Promise<EventCompletion> {
  return inActorTransaction(pool, actor.id, async (client) => {
    // The trusted profile stays fixed until commit; a role removed before this lock cannot complete an event.
    const profile = await client.query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 FOR SHARE', [actor.id]);
    if (profile.rows[0]?.role !== 'EVENT_COORDINATOR' || actor.role !== 'EVENT_COORDINATOR') throw notFound();
    // Same order as cancellation and venue writers: bookings, event, equipment pools, equipment lines.
    const lockedBookings = await lockVenueBookingsBeforeEvent(client, eventRequestId);
    const found = await client.query<{
      id: string; organiserId: string; coordinatorId: string | null; status: string; name: string | null;
      endsAt: Date | string | null; ended: boolean | null;
    }>(`SELECT id, organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status, name,
        ends_at AS "endsAt", clock_timestamp() >= ends_at AS ended
      FROM event_requests WHERE id = $1 FOR UPDATE`, [eventRequestId]);
    const event = found.rows[0];
    // Only the currently assigned coordinator may act, and anyone else sees the same answer as for a missing event.
    if (!event || event.coordinatorId !== actor.id || event.status === 'DRAFT') throw notFound();
    if (event.status === 'COMPLETED') {
      throw new WorkflowError('CONFLICT', 'EVENT_ALREADY_COMPLETED', 'This event has already been marked completed.');
    }
    if (event.status !== 'CONFIRMED') {
      throw new WorkflowError('CONFLICT', 'EVENT_NOT_COMPLETABLE', 'Only a confirmed event can be marked completed.');
    }
    if (event.endsAt === null || event.ended !== true) {
      throw new WorkflowError('CONFLICT', 'EVENT_NOT_ENDED',
        `This event has not ended yet${event.endsAt ? ` (it ends at ${iso(event.endsAt)})` : ''}. It can be marked completed after it ends.`);
    }
    await assertVenueBookingsLocked(client, eventRequestId, lockedBookings);
    await client.query(`SELECT t.id FROM equipment_types t WHERE EXISTS (
      SELECT 1 FROM equipment_requests r WHERE r.event_request_id = $1 AND r.equipment_type_id = t.id)
      ORDER BY t.id FOR UPDATE`, [eventRequestId]);
    await client.query('SELECT id FROM equipment_requests WHERE event_request_id = $1 ORDER BY id FOR UPDATE', [eventRequestId]);
    const reserved = await client.query<{ count: number }>(`SELECT count(*)::integer AS count FROM equipment_requests
      WHERE event_request_id = $1 AND status = 'RESERVED'`, [eventRequestId]);

    // The status trigger records the history row (actor and time) and releases RESERVED lines once, as EVENT_COMPLETED.
    const updated = await client.query(
      `UPDATE event_requests SET status = 'COMPLETED', updated_at = now() WHERE id = $1 AND status = 'CONFIRMED'`, [eventRequestId]);
    if (updated.rowCount !== 1) throw new Error('The event status could not be updated.');
    const history = await client.query<{ changedAt: Date | string; changedByName: string | null }>(
      `SELECT h.created_at AS "changedAt", u.display_name AS "changedByName" FROM event_status_history h
       LEFT JOIN app_users u ON u.id = h.changed_by
       WHERE h.event_request_id = $1 AND h.to_status = 'COMPLETED' ORDER BY h.created_at DESC, h.id DESC LIMIT 1`, [eventRequestId]);
    const recorded = history.rows[0];
    if (!recorded) throw new Error('The completion was not recorded in the status history.');
    await recordNotifications(client, eventCompletedNotifications({
      eventId: eventRequestId, eventName: event.name, organiserId: event.organiserId, coordinatorId: actor.id,
    }));
    return {
      eventRequestId, status: 'COMPLETED', completedById: actor.id, completedByName: recorded.changedByName,
      completedAt: iso(recorded.changedAt), releasedEquipmentRequests: reserved.rows[0]?.count ?? 0,
    };
  });
}

/** What the organiser and the assigned coordinator may read once the event is completed; null otherwise. */
export async function readEventCompletion(
  pool: Pick<Pool, 'query'>,
  { eventRequestId, actor }: { eventRequestId: string; actor: WorkflowActor },
): Promise<EventCompletion | null> {
  const found = await pool.query<{
    organiserId: string; coordinatorId: string | null; status: string; changedById: string | null;
    changedByName: string | null; changedAt: Date | string | null; released: number;
  }>(`SELECT e.organiser_id AS "organiserId", e.coordinator_id AS "coordinatorId", e.status,
      h.changed_by AS "changedById", u.display_name AS "changedByName", h.created_at AS "changedAt",
      (SELECT count(*)::integer FROM equipment_requests r
        WHERE r.event_request_id = e.id AND r.release_cause = 'EVENT_COMPLETED') AS released
    FROM event_requests e
    LEFT JOIN LATERAL (SELECT changed_by, created_at FROM event_status_history
      WHERE event_request_id = e.id AND to_status = 'COMPLETED' ORDER BY created_at DESC, id DESC LIMIT 1) h ON true
    LEFT JOIN app_users u ON u.id = h.changed_by
    WHERE e.id = $1`, [eventRequestId]);
  const row = found.rows[0];
  const related = row && ((actor.role === 'EVENT_ORGANISER' && row.organiserId === actor.id)
    || (actor.role === 'EVENT_COORDINATOR' && row.coordinatorId === actor.id));
  if (!row || !related || row.status !== 'COMPLETED' || !row.changedAt || !row.changedById) return null;
  return {
    eventRequestId, status: 'COMPLETED', completedById: row.changedById, completedByName: row.changedByName,
    completedAt: iso(row.changedAt), releasedEquipmentRequests: row.released,
  };
}
