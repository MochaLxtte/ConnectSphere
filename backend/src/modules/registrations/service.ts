import type { Pool } from 'pg';
import { inActorTransaction, iso, isoOrNull, parseObjectBody, requireRelation,
  WorkflowError, type WorkflowActor } from '../events/workflow-support.js';

const absent = () => new WorkflowError('NOT_FOUND', 'REGISTRATION_NOT_FOUND', 'The registration was not found.');
const requireAttendee = (actor: WorkflowActor) => {
  if (actor.role !== 'ATTENDEE') throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only attendees can manage their own registrations.');
};

/** KAN-17/67: recheck the stored profile, even for direct service calls. */
async function trusted(client: Pick<Pool, 'query'>, actor: WorkflowActor) {
  const found = await client.query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 FOR SHARE', [actor.id]);
  if (found.rows[0]?.role !== actor.role) throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Your account permissions changed. Sign in again.');
}

const columns = `r.id, r.status, r.registered_at AS "registeredAt", r.withdrawn_at AS "withdrawnAt",
  r.cancellation_outcome_at AS "cancelledAt", e.id AS "eventId", e.name AS "eventName",
  e.starts_at AS "startsAt", e.ends_at AS "endsAt", e.purpose, e.status AS "eventStatus"`;
interface Registration {
  id: string; status: string; registeredAt: Date; withdrawnAt: Date | null; cancelledAt: Date | null;
  eventId: string; eventName: string | null; startsAt: Date | null; endsAt: Date | null; purpose: string | null; eventStatus: string;
}
const beforeStart = (row: Registration, now: Date) => row.startsAt !== null && now < row.startsAt
  && row.eventStatus !== 'CANCELLED' && row.eventStatus !== 'COMPLETED';
const ownItem = (row: Registration, now: Date) => ({ ...row,
  registeredAt: iso(row.registeredAt), withdrawnAt: isoOrNull(row.withdrawnAt), cancelledAt: isoOrNull(row.cancelledAt),
  startsAt: isoOrNull(row.startsAt), endsAt: isoOrNull(row.endsAt),
  canWithdraw: row.status === 'REGISTERED' && beforeStart(row, now),
});

export async function listOwnRegistrations(pool: Pick<Pool, 'connect'>, actor: WorkflowActor) {
  requireAttendee(actor);
  return inActorTransaction(pool, actor.id, async client => {
    await trusted(client, actor);
    const clock = await client.query<{ now: Date }>('SELECT clock_timestamp() AS now');
    const found = await client.query<Registration>(`SELECT ${columns} FROM event_registrations r
      JOIN event_requests e ON e.id = r.event_request_id WHERE r.attendee_id = $1
      ORDER BY e.starts_at DESC NULLS LAST, r.id`, [actor.id]);
    return { items: found.rows.map(row => ownItem(row, clock.rows[0]!.now)) };
  });
}

export async function withdrawRegistration(pool: Pick<Pool, 'connect'>, actor: WorkflowActor, id: string, input: unknown) {
  requireAttendee(actor);
  const body = parseObjectBody(input, ['confirm']);
  if (body.confirm !== true) throw new WorkflowError('INVALID_INPUT', 'WITHDRAWAL_CONFIRMATION_REQUIRED', 'Confirm withdrawal before saving.');
  return inActorTransaction(pool, actor.id, async client => {
    await trusted(client, actor);
    // Discover the event without exposing another attendee's registration. Lock event before row,
    // matching cancellation and registration capacity serialization.
    const target = await client.query<{ eventId: string }>(
      'SELECT event_request_id AS "eventId" FROM event_registrations WHERE id = $1 AND attendee_id = $2', [id, actor.id]);
    if (!target.rows[0]) throw absent();
    await client.query('SELECT id FROM event_requests WHERE id = $1 FOR UPDATE', [target.rows[0].eventId]);
    const result = await client.query<Registration>(`SELECT ${columns} FROM event_registrations r
      JOIN event_requests e ON e.id = r.event_request_id WHERE r.id = $1 AND r.attendee_id = $2 FOR UPDATE OF r`, [id, actor.id]);
    const row = result.rows[0];
    if (!row) throw absent();
    const clock = await client.query<{ now: Date }>('SELECT clock_timestamp() AS now');
    const now = clock.rows[0]!.now;
    // Even a repeated request must respect the server's event-start cutoff.
    if (!beforeStart(row, now)) throw new WorkflowError('CONFLICT', 'WITHDRAWAL_NOT_ALLOWED',
      'This event has started or ended, so the registration cannot be withdrawn.');
    // A genuine unchanged replay never changes capacity, timestamps or outcome identity.
    if (row.status === 'WITHDRAWN') return { changed: false, registration: ownItem(row, now) };
    if (!ownItem(row, now).canWithdraw) throw new WorkflowError('CONFLICT', 'WITHDRAWAL_NOT_ALLOWED',
      'Only an active registration can be withdrawn before the event starts.');
    await client.query("UPDATE event_registrations SET status = 'WITHDRAWN', withdrawn_at = $2 WHERE id = $1", [id, now]);
    // Migration 019 records the attendee/manager outcome notices in this transaction.
    return { changed: true, registration: ownItem({ ...row, status: 'WITHDRAWN', withdrawnAt: now }, now) };
  });
}

/** KAN-67: authorization and roster are read under the same event lock. */
export async function getRegistrationRoster(pool: Pick<Pool, 'connect'>, actor: WorkflowActor, eventId: string) {
  if (!['EVENT_ORGANISER', 'EVENT_COORDINATOR'].includes(actor.role)) {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only the owning organiser or current coordinator may view registrations.');
  }
  return inActorTransaction(pool, actor.id, async client => {
    await trusted(client, actor);
    const found = await client.query<{ organiserId: string; coordinatorId: string | null; status: string; name: string | null }>(
      `SELECT organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status, name
       FROM event_requests WHERE id = $1 FOR SHARE`, [eventId]);
    const event = found.rows[0];
    if (!event) throw new WorkflowError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.');
    requireRelation(actor, event as Parameters<typeof requireRelation>[1], ['OWNER', 'ASSIGNED_COORDINATOR']);
    // Deliberately select only the approved attendee disclosure fields. No identity/profile IDs.
    const rows = await client.query<{ displayName: string; email: string; status: string;
      registeredAt: Date; withdrawnAt: Date | null; cancelledAt: Date | null }>(
      `SELECT u.display_name AS "displayName", u.email, r.status, r.registered_at AS "registeredAt",
        r.withdrawn_at AS "withdrawnAt", r.cancellation_outcome_at AS "cancelledAt"
       FROM event_registrations r JOIN app_users u ON u.id = r.attendee_id
       WHERE r.event_request_id = $1 ORDER BY r.registered_at, r.id`, [eventId]);
    return { eventId, eventName: event.name,
      activeCount: rows.rows.filter(row => row.status === 'REGISTERED').length,
      items: rows.rows.map(row => ({ ...row, registeredAt: iso(row.registeredAt),
        withdrawnAt: isoOrNull(row.withdrawnAt), cancelledAt: isoOrNull(row.cancelledAt) })) };
  });
}
