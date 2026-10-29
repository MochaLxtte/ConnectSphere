import type { PoolClient } from 'pg';
import {
  inActorTransaction, iso, parseObjectBody, UUID_PATTERN, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { recordNotifications } from '../notifications/notify.js';
import { registrationNotifications } from '../notifications/trigger-matrix.js';
import { registrationAvailability, REGISTRATION_MESSAGES, type OwnRegistrationStatus, type RegistrationBlock, type RegistrationFacts } from './registration-rules.js';
import type {
  AttendeeEvent, AttendeeEventDetail, AttendeeEventSummary, OwnRegistration, OwnRegistrationSummary, RegistrationResult,
} from './registration-types.js';

type Reader = Pick<PoolClient, 'query'>;

interface FactsRow extends RegistrationFacts {
  id: string;
  name: string | null;
  purpose: string | null;
  description: string | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  accessibilityNeeds: string | null;
  opensAt: Date | string | null;
  closesAt: Date | string | null;
  organiserId: string;
  coordinatorId: string | null;
  own: { id: string; status: OwnRegistrationStatus; registeredAt: string; withdrawnAt: string | null } | null;
  venues: { name: string; location: string | null; startsAt: string; endsAt: string }[];
  ownStatus: OwnRegistrationStatus | null;
}

const notFound = () => new WorkflowError('NOT_FOUND', 'EVENT_NOT_FOUND', 'The event was not found.');

function requireAttendee(actor: WorkflowActor): void {
  if (actor.role !== 'ATTENDEE') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only attendees can view or register for events here.');
  }
}

function requireEventId(id: string): void {
  if (!UUID_PATTERN.test(id)) throw new WorkflowError('INVALID_INPUT', 'INVALID_EVENT_ID', 'The event ID must be a UUID.');
}

/** Every time comparison is made here, by the database clock, in the same statement that reads the counts. */
const FACTS_SELECT = `SELECT e.id, e.name, e.purpose, e.description, e.starts_at AS "startsAt", e.ends_at AS "endsAt",
    e.accessibility_needs AS "accessibilityNeeds", e.status, e.registration_required AS "registrationRequired",
    e.registration_capacity AS capacity, e.registration_opens_at AS "opensAt", e.registration_closes_at AS "closesAt",
    e.organiser_id AS "organiserId", e.coordinator_id AS "coordinatorId",
    COALESCE(clock_timestamp() >= e.starts_at, true) AS started,
    COALESCE(clock_timestamp() < e.registration_opens_at, false) AS "beforeOpen",
    COALESCE(clock_timestamp() >= e.registration_closes_at, false) AS "afterClose",
    (SELECT count(*)::integer FROM event_registrations r WHERE r.event_request_id = e.id AND r.status = 'REGISTERED') AS registered,
    (SELECT jsonb_build_object('id', r.id, 'status', r.status, 'registeredAt', r.registered_at, 'withdrawnAt', r.withdrawn_at)
       FROM event_registrations r WHERE r.event_request_id = e.id AND r.attendee_id = $1) AS own,
    (SELECT r.status FROM event_registrations r WHERE r.event_request_id = e.id AND r.attendee_id = $1) AS "ownStatus",
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', v.name, 'location', v.location, 'startsAt', b.starts_at, 'endsAt', b.ends_at)
       ORDER BY b.starts_at, b.id), '[]'::jsonb)
       FROM venue_bookings b JOIN venues v ON v.id = b.venue_id WHERE b.event_request_id = e.id AND b.status = 'APPROVED') AS venues
  FROM event_requests e`;

const isoOrNull = (value: Date | string | null) => value === null ? null : iso(value);

function toFacts(row: FactsRow): RegistrationFacts {
  return { status: row.status, registrationRequired: row.registrationRequired, started: row.started, beforeOpen: row.beforeOpen,
    afterClose: row.afterClose, capacity: row.capacity, registered: row.registered, ownStatus: row.ownStatus };
}

function toDetail(row: FactsRow): AttendeeEventDetail {
  const availability = registrationAvailability(toFacts(row));
  const event: AttendeeEvent = {
    id: row.id, name: row.name, purpose: row.purpose, description: row.description, startsAt: isoOrNull(row.startsAt),
    endsAt: isoOrNull(row.endsAt), accessibilityNeeds: row.accessibilityNeeds, status: row.status,
    venues: row.venues.map(venue => ({ ...venue, startsAt: iso(venue.startsAt), endsAt: iso(venue.endsAt) })),
    registration: { required: row.registrationRequired === true, opensAt: isoOrNull(row.opensAt), closesAt: isoOrNull(row.closesAt),
      capacity: row.capacity, placesRemaining: availability.placesRemaining },
  };
  const own: OwnRegistration | null = row.own && {
    id: row.own.id, status: row.own.status, registeredAt: iso(row.own.registeredAt),
    withdrawnAt: row.own.withdrawnAt === null ? null : iso(row.own.withdrawnAt),
  };
  return { event, registration: own, availability };
}

/** A CONFIRMED event is open to attendees; any other event only to someone who holds a registration for it. */
const visible = (row: FactsRow | undefined): row is FactsRow => !!row && (row.status === 'CONFIRMED' || row.ownStatus !== null);

async function readEvent(reader: Reader, eventId: string, attendeeId: string): Promise<FactsRow | undefined> {
  const found = await reader.query<FactsRow>(`${FACTS_SELECT} WHERE e.id = $2`, [attendeeId, eventId]);
  return found.rows[0];
}

/** KAN-14-AC1: CONFIRMED events that take registrations and have not started, with the caller's own status. */
export async function listAttendeeEvents(
  { pool }: WorkflowDependencies, { actor }: { actor: WorkflowActor },
): Promise<AttendeeEventSummary[]> {
  requireAttendee(actor);
  const found = await pool.query<FactsRow>(
    `${FACTS_SELECT} WHERE e.status = 'CONFIRMED' AND e.registration_required = true AND clock_timestamp() < e.starts_at
     ORDER BY e.starts_at, e.id LIMIT 100`, [actor.id]);
  return found.rows.map(row => {
    const detail = toDetail(row);
    return { id: row.id, name: row.name, startsAt: detail.event.startsAt, endsAt: detail.event.endsAt,
      registration: detail.event.registration, ownStatus: row.ownStatus, availability: detail.availability };
  });
}

/** KAN-14-AC1/AC4/AC8: one event's details and conditions, and only the caller's own registration. */
export async function getAttendeeEvent(
  { pool }: WorkflowDependencies, { actor, eventId }: { actor: WorkflowActor; eventId: string },
): Promise<AttendeeEventDetail> {
  requireAttendee(actor);
  requireEventId(eventId);
  const row = await readEvent(pool, eventId, actor.id);
  if (!visible(row)) throw notFound();
  return toDetail(row);
}

/** KAN-14-AC4: the caller's own registrations, newest event first. Nobody else's are ever read. */
export async function listOwnRegistrations(
  { pool }: WorkflowDependencies, { actor }: { actor: WorkflowActor },
): Promise<OwnRegistrationSummary[]> {
  requireAttendee(actor);
  const found = await pool.query<{
    id: string; status: OwnRegistrationStatus; registeredAt: Date | string; withdrawnAt: Date | string | null;
    eventId: string; eventName: string | null; startsAt: Date | string | null; endsAt: Date | string | null; eventStatus: string;
  }>(`SELECT r.id, r.status, r.registered_at AS "registeredAt", r.withdrawn_at AS "withdrawnAt", e.id AS "eventId",
        e.name AS "eventName", e.starts_at AS "startsAt", e.ends_at AS "endsAt", e.status AS "eventStatus"
      FROM event_registrations r JOIN event_requests e ON e.id = r.event_request_id
      WHERE r.attendee_id = $1 ORDER BY e.starts_at DESC NULLS LAST, r.id LIMIT 100`, [actor.id]);
  return found.rows.map(row => ({
    id: row.id, status: row.status, registeredAt: iso(row.registeredAt), withdrawnAt: isoOrNull(row.withdrawnAt),
    event: { id: row.eventId, name: row.eventName, startsAt: isoOrNull(row.startsAt), endsAt: isoOrNull(row.endsAt), status: row.eventStatus },
  }));
}

const BLOCK_CODES: Record<RegistrationBlock, string> = {
  ALREADY_REGISTERED: 'REGISTRATION_ALREADY_REGISTERED', NOT_CONFIRMED: 'REGISTRATION_EVENT_NOT_OPEN',
  REGISTRATION_DISABLED: 'REGISTRATION_DISABLED', EVENT_STARTED: 'REGISTRATION_EVENT_STARTED', CLOSED: 'REGISTRATION_CLOSED',
  NOT_YET_OPEN: 'REGISTRATION_NOT_OPEN', FULL: 'REGISTRATION_FULL',
};

/**
 * KAN-14-AC2/AC3/AC5/AC7/AC103/AC104: register the caller. The event row is locked first, so competing attendees
 * are counted one at a time and the last place goes to exactly one of them; the registration and its notices
 * commit together. A withdrawn attendee's existing record is reused. The body may carry nothing: the identity is
 * always the signed-in caller, never a field the caller supplies (AC8, AC101).
 */
export async function registerForEvent(
  { pool }: WorkflowDependencies, { actor, eventId, input }: { actor: WorkflowActor; eventId: string; input: unknown },
): Promise<RegistrationResult> {
  requireAttendee(actor);
  requireEventId(eventId);
  parseObjectBody(input ?? {}, []);
  return inActorTransaction(pool, actor.id, async client => {
    // The trusted profile stays fixed until commit; a role removed before this lock cannot register anyone.
    const profile = await client.query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 FOR SHARE', [actor.id]);
    if (profile.rows[0]?.role !== 'ATTENDEE') {
      throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Attendee access is no longer available.');
    }
    // Take the event lock in its own statement, then read the counts in a fresh one. A single locking SELECT would
    // evaluate its counts on the snapshot taken before the wait, and a competitor's committed place would be missed.
    const locked = await client.query('SELECT id FROM event_requests WHERE id = $1 FOR UPDATE', [eventId]);
    if (locked.rows.length === 0) throw notFound();
    const row = await readEvent(client, eventId, actor.id);
    if (!visible(row)) throw notFound();
    const availability = registrationAvailability(toFacts(row));
    if (!availability.canRegister && availability.reason) {
      throw new WorkflowError('CONFLICT', BLOCK_CODES[availability.reason], REGISTRATION_MESSAGES[availability.reason]);
    }
    const stamped = await (row.ownStatus === 'WITHDRAWN'
      ? client.query<{ id: string; at: Date | string }>(
        `UPDATE event_registrations SET status = 'REGISTERED', registered_at = clock_timestamp(), withdrawn_at = NULL
         WHERE event_request_id = $1 AND attendee_id = $2 AND status = 'WITHDRAWN' RETURNING id, registered_at AS at`, [eventId, actor.id])
      : client.query<{ id: string; at: Date | string }>(
        `INSERT INTO event_registrations (event_request_id, attendee_id) VALUES ($1, $2) RETURNING id, registered_at AS at`, [eventId, actor.id]))
      .catch((error: unknown) => {
        // The database guard is the last line of defence if another writer filled the event after the check above.
        if (typeof error === 'object' && error !== null && 'constraint' in error && error.constraint === 'event_registrations_within_capacity') {
          throw new WorkflowError('CONFLICT', BLOCK_CODES.FULL, REGISTRATION_MESSAGES.FULL);
        }
        throw error;
      });
    const saved = stamped.rows[0];
    if (!saved) throw new Error('The registration was not saved.');
    const managers = [row.organiserId, row.coordinatorId].filter((id): id is string => id !== null);
    const validManagers = managers.length === 0 ? [] : (await client.query<{ id: string; role: string }>(
      'SELECT id, role FROM app_users WHERE id = ANY($1::uuid[])', [managers])).rows
      .filter(user => (user.id === row.organiserId && user.role === 'EVENT_ORGANISER') || (user.id === row.coordinatorId && user.role === 'EVENT_COORDINATOR'))
      .map(user => user.id);
    await recordNotifications(client, registrationNotifications({
      eventId, eventName: row.name, attendeeId: actor.id, registrationId: saved.id, stamp: String(new Date(saved.at).getTime()),
      managerIds: validManagers, registered: row.registered + 1, capacity: row.capacity,
    }));
    const fresh = await readEvent(client, eventId, actor.id);
    if (!fresh) throw new Error('The saved registration could not be read back.');
    return { ...toDetail(fresh), changed: true };
  });
}
