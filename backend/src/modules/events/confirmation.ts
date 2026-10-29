import type { Pool, PoolClient } from 'pg';
import { equipmentReadiness, readEquipmentReservationSnapshot } from '../equipment/reservation-service.js';
import { venueArrangementReadiness } from '../venues/booking-service.js';
import { assertVenueBookingsLocked, lockVenueBookingsBeforeEvent } from './arrangement-locks.js';
import {
  inActorTransaction, lockEventRequest, parseObjectBody, requestNotFound, requireRelation, setEventStatus,
  WorkflowError, type LockedEventRequest, type WorkflowActor,
} from './workflow-support.js';

type Reader = Pick<PoolClient, 'query'>;

export type ReadinessCheckKey = 'VENUE' | 'EQUIPMENT' | 'CHANGE_REQUEST';

export interface ReadinessCheck {
  key: ReadinessCheckKey;
  ready: boolean;
  message: string;
}

export interface EventReadiness {
  ready: boolean;
  checks: ReadinessCheck[];
}

export interface ConfirmationRecord {
  confirmedBy: string | null;
  confirmedByName: string | null;
  confirmedAt: string;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

async function venueCheck(client: Reader, eventRequestId: string): Promise<ReadinessCheck> {
  const venue = await venueArrangementReadiness(client, eventRequestId);
  if (venue.live === 0) {
    return { key: 'VENUE', ready: false, message: 'Approve at least one venue arrangement before confirming.' };
  }
  // KAN-61-AC105: name outage recovery separately so the coordinator knows which task is left.
  const recovery = await client.query<{ count: number }>(`SELECT count(DISTINCT i.venue_booking_id)::int AS count
    FROM venue_outage_impacts i JOIN venue_bookings b ON b.id = i.venue_booking_id
    WHERE b.event_request_id = $1 AND i.status = 'RECOVERY_REQUIRED'`, [eventRequestId]);
  // KAN-61-AC101: approved bookings must still be conflict-free under the venue's current buffers
  // and hours, which catalogue edits can change after approval. Outage overlap is the recovery flag above.
  const conflicts = await client.query<{ overlap: number; hours: number }>(`SELECT
      count(*) FILTER (WHERE 'APPROVED_BOOKING_OVERLAP' = ANY(warnings))::int AS overlap,
      count(*) FILTER (WHERE 'OUTSIDE_OPERATING_HOURS' = ANY(warnings))::int AS hours
    FROM (SELECT venue_booking_warnings(b.id) AS warnings FROM venue_bookings b
      WHERE b.event_request_id = $1 AND b.status = 'APPROVED') current`, [eventRequestId]);
  const recovering = recovery.rows[0]?.count ?? 0;
  const { overlap = 0, hours = 0 } = conflicts.rows[0] ?? {};
  const parts = [
    venue.outstanding - recovering > 0 ? `${plural(venue.outstanding - recovering, 'venue arrangement')} awaiting approval` : null,
    recovering > 0 ? `${plural(recovering, 'venue booking')} still requiring outage recovery` : null,
    overlap > 0 ? `${plural(overlap, 'venue booking')} now overlapping another approved booking` : null,
    hours > 0 ? `${plural(hours, 'venue booking')} outside the venue's operating hours` : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return { key: 'VENUE', ready: true, message: 'Every live venue arrangement is approved.' };
  return { key: 'VENUE', ready: false, message: `Resolve ${parts.join(' and ')} before confirming.` };
}

async function equipmentCheck(client: Reader, eventRequestId: string): Promise<ReadinessCheck> {
  const plan = await client.query<{ planStatus: string }>(
    'SELECT equipment_plan_status AS "planStatus" FROM event_requests WHERE id = $1', [eventRequestId]);
  const snapshot = await readEquipmentReservationSnapshot(client, eventRequestId);
  const equipment = equipmentReadiness(snapshot);
  // KAN-61-AC102: Not Required counts only as an explicit choice with no active lines.
  if (plan.rows[0]?.planStatus === 'NOT_REQUIRED' && equipment.activeCount === 0) {
    return { key: 'EQUIPMENT', ready: true, message: 'Equipment is recorded as Not Required.' };
  }
  if (equipment.status === 'READY') return { key: 'EQUIPMENT', ready: true, message: equipment.message };
  if (equipment.status === 'NO_REQUIREMENTS') {
    return { key: 'EQUIPMENT', ready: false,
      message: 'Record equipment as Not Required, or request and reserve the required equipment.' };
  }
  return { key: 'EQUIPMENT', ready: false, message: equipment.message };
}

async function changeRequestCheck(client: Reader, eventRequestId: string): Promise<ReadinessCheck> {
  const pending = await client.query(
    "SELECT 1 FROM event_change_requests WHERE event_request_id = $1 AND status = 'PENDING' LIMIT 1", [eventRequestId]);
  return (pending.rowCount ?? 0) > 0
    ? { key: 'CHANGE_REQUEST', ready: false, message: 'Decide the pending change request before confirming.' }
    : { key: 'CHANGE_REQUEST', ready: true, message: 'No significant change is pending.' };
}

/**
 * KAN-61-AC3/AC101–AC103/AC105: derived from current rows, never stored. KAN-84 safety-review
 * submission reuses it. Callers that act on the result must hold the arrangement locks first.
 */
export async function eventReadiness(client: Reader, eventRequestId: string): Promise<EventReadiness> {
  const checks = [
    await venueCheck(client, eventRequestId),
    await equipmentCheck(client, eventRequestId),
    await changeRequestCheck(client, eventRequestId),
  ];
  return { ready: checks.every(check => check.ready), checks };
}

/** KAN-61-AC4: the status-history trigger records who confirmed and when. */
async function readConfirmation(client: Reader, eventRequestId: string): Promise<ConfirmationRecord | null> {
  const found = await client.query<{ confirmedBy: string | null; confirmedByName: string | null; confirmedAt: Date }>(
    `SELECT h.changed_by AS "confirmedBy", u.display_name AS "confirmedByName", h.created_at AS "confirmedAt"
     FROM event_status_history h LEFT JOIN app_users u ON u.id = h.changed_by
     WHERE h.event_request_id = $1 AND h.to_status = 'CONFIRMED'
     ORDER BY h.created_at DESC, h.id DESC LIMIT 1`, [eventRequestId]);
  const row = found.rows[0];
  return row ? { ...row, confirmedAt: row.confirmedAt.toISOString() } : null;
}

async function requireTrustedRole(client: Reader, actor: WorkflowActor): Promise<void> {
  const profile = await client.query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 FOR SHARE', [actor.id]);
  if (profile.rows[0]?.role !== actor.role) {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Your account permissions changed. Sign in again.');
  }
}

async function hasStarted(client: Reader, eventRequestId: string): Promise<boolean> {
  const found = await client.query<{ started: boolean }>(
    'SELECT starts_at IS NOT NULL AND starts_at <= clock_timestamp() AS started FROM event_requests WHERE id = $1',
    [eventRequestId]);
  return found.rows[0]?.started === true;
}

/** KAN-61: the confirmation panel for the owning organiser or currently assigned coordinator. */
export async function getEventConfirmation(
  pool: Pick<Pool, 'connect'>, { eventRequestId, actor }: { eventRequestId: string; actor: WorkflowActor },
) {
  return inActorTransaction(pool, actor.id, async (client) => {
    await requireTrustedRole(client, actor);
    const found = await client.query<LockedEventRequest>(`SELECT id, organiser_id AS "organiserId",
      coordinator_id AS "coordinatorId", status, name, revision FROM event_requests WHERE id = $1 FOR SHARE`,
    [eventRequestId]);
    const event = found.rows[0];
    if (!event) throw requestNotFound();
    const relation = requireRelation(actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
    const readiness = event.status === 'APPROVED' ? await eventReadiness(client, eventRequestId) : null;
    const started = event.status === 'APPROVED' && await hasStarted(client, eventRequestId);
    return {
      eventRequestId, status: event.status, started,
      canConfirm: relation === 'ASSIGNED_COORDINATOR' && readiness?.ready === true && !started,
      readiness,
      confirmation: await readConfirmation(client, eventRequestId),
    };
  });
}

/**
 * KAN-61: APPROVED -> CONFIRMED by the currently assigned coordinator. Locks follow KAN-62's
 * venue gate -> booking -> event -> equipment order, so the readiness check and the status
 * write see the same rows. Migration 019 writes the KAN-80 confirmation notices.
 */
export async function confirmEvent(
  pool: Pick<Pool, 'connect'>,
  { eventRequestId, actor, input }: { eventRequestId: string; actor: WorkflowActor; input: unknown },
) {
  parseObjectBody(input ?? {}, []);
  if (actor.role !== 'EVENT_COORDINATOR') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only the assigned coordinator can confirm an event.');
  }
  return inActorTransaction(pool, actor.id, async (client) => {
    await requireTrustedRole(client, actor);
    const lockedBookings = await lockVenueBookingsBeforeEvent(client, eventRequestId);
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['ASSIGNED_COORDINATOR'], 'Only the currently assigned coordinator can confirm this event.');
    // A repeated request returns the saved outcome without new history or notifications.
    if (event.status === 'CONFIRMED') {
      return { eventRequestId, status: 'CONFIRMED' as const, changed: false, confirmation: await readConfirmation(client, eventRequestId) };
    }
    if (event.status !== 'APPROVED') {
      throw new WorkflowError('CONFLICT', 'EVENT_NOT_CONFIRMABLE', 'Only an approved event can be confirmed.');
    }
    if (await hasStarted(client, eventRequestId)) {
      throw new WorkflowError('CONFLICT', 'EVENT_ALREADY_STARTED', 'This event has already started, so it can no longer be confirmed.');
    }
    await assertVenueBookingsLocked(client, eventRequestId, lockedBookings);
    await client.query(`SELECT t.id FROM equipment_types t WHERE EXISTS (
      SELECT 1 FROM equipment_requests r WHERE r.event_request_id = $1 AND r.equipment_type_id = t.id)
      ORDER BY t.id FOR UPDATE`, [eventRequestId]);
    await client.query('SELECT id FROM equipment_requests WHERE event_request_id = $1 ORDER BY id FOR UPDATE', [eventRequestId]);
    // Venue catalogue edits (buffers, hours) lock the venue row; share-lock it so a concurrent edit
    // either commits before the readiness check reads it or waits for this transaction.
    await client.query(`SELECT v.id FROM venues v WHERE v.id IN (SELECT venue_id FROM venue_bookings
      WHERE event_request_id = $1 AND status IN ('PENDING', 'HELD', 'APPROVED')) ORDER BY v.id FOR SHARE`, [eventRequestId]);
    const readiness = await eventReadiness(client, eventRequestId);
    if (!readiness.ready) {
      throw new WorkflowError('CONFLICT', 'EVENT_NOT_READY',
        readiness.checks.filter(check => !check.ready).map(check => check.message).join(' '));
    }
    await setEventStatus(client, eventRequestId, 'CONFIRMED');
    return { eventRequestId, status: 'CONFIRMED' as const, changed: true, confirmation: await readConfirmation(client, eventRequestId) };
  });
}
