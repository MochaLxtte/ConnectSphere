import type { Pool, PoolClient } from 'pg';
import type { UserRole } from '../auth/types.js';
import { notify } from '../notifications/notify.js';
import {
  assertOpenForRegistration,
  describeRegistrationAvailability,
  hasEventStarted,
  isDiscoverable,
  RegistrationStateError,
  type RegistrationClosedReason,
} from './registration-eligibility.js';

export interface RegistrationActor {
  /** app_users.id from verified authentication, never from the request body. */
  id: string;
  role: UserRole;
}

export interface RegistrationDependencies {
  pool: Pick<Pool, 'query' | 'connect'>;
}

export type RegistrationStatus = 'REGISTERED' | 'WITHDRAWN';

/** Public fields only: no organiser/coordinator ids, internal requirements or review data. */
export interface PublicEvent {
  id: string;
  name: string | null;
  purpose: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  venue: { name: string; location: string | null } | null;
  registrationCapacity: number | null;
  registeredCount: number;
  spotsLeft: number | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  isOpen: boolean;
  closedReason: RegistrationClosedReason | null;
  myRegistrationStatus: RegistrationStatus | null;
}

export interface RegistrationResult {
  registrationId: string;
  eventRequestId: string;
  status: RegistrationStatus;
  registeredAt: string;
  withdrawnAt: string | null;
}

export interface MyRegistration extends RegistrationResult {
  event: {
    id: string;
    name: string | null;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    venue: PublicEvent['venue'];
    canWithdraw: boolean;
  };
}

export interface AttendeeList {
  eventRequestId: string;
  counts: { registered: number; withdrawn: number; capacity: number | null; spotsLeft: number | null };
  items: Array<{
    registrationId: string;
    displayName: string;
    email: string;
    status: RegistrationStatus;
    registeredAt: string;
    withdrawnAt: string | null;
  }>;
}

export class RegistrationEventNotFoundError extends Error {
  readonly code = 'EVENT_NOT_FOUND';

  constructor() {
    super('The event was not found.');
    this.name = 'RegistrationEventNotFoundError';
  }
}

export class RegistrationForbiddenError extends Error {
  readonly code = 'REGISTRATION_FORBIDDEN';

  constructor() {
    super('Only attendees can register for or withdraw from events.');
    this.name = 'RegistrationForbiddenError';
  }
}

type Timestamp = Date | string;
const date = (value: Timestamp | null): Date | null => (value === null ? null : new Date(value));
const iso = (value: Timestamp): string => new Date(value).toISOString();
const isoOrNull = (value: Timestamp | null): string | null => (value === null ? null : iso(value));

interface PublicEventRow {
  id: string;
  name: string | null;
  purpose: string | null;
  description: string | null;
  status: string;
  registrationRequired: boolean | null;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  registrationCapacity: number | null;
  registrationOpensAt: Timestamp | null;
  registrationClosesAt: Timestamp | null;
  registeredCount: number;
  venueName: string | null;
  venueLocation: string | null;
  myRegistrationStatus: RegistrationStatus | null;
  now: Timestamp;
}

// $1 is always the verified caller. The venue is the earliest APPROVED booking, if any.
const publicEventSelect = `
  SELECT e.id, e.name, e.purpose, e.description, e.status,
    e.registration_required AS "registrationRequired",
    e.starts_at AS "startsAt", e.ends_at AS "endsAt",
    e.registration_capacity AS "registrationCapacity",
    e.registration_opens_at AS "registrationOpensAt",
    e.registration_closes_at AS "registrationClosesAt",
    (SELECT count(*)::int FROM event_registrations r
      WHERE r.event_request_id = e.id AND r.status = 'REGISTERED') AS "registeredCount",
    venue.name AS "venueName", venue.location AS "venueLocation",
    mine.status AS "myRegistrationStatus",
    now() AS now
  FROM event_requests e
  LEFT JOIN LATERAL (
    SELECT v.name, v.location FROM venue_bookings b
    JOIN venues v ON v.id = b.venue_id
    WHERE b.event_request_id = e.id AND b.status = 'APPROVED'
    ORDER BY b.starts_at ASC, b.id ASC LIMIT 1
  ) venue ON true
  LEFT JOIN event_registrations mine ON mine.event_request_id = e.id AND mine.attendee_id = $1
  WHERE e.status IN ('APPROVED', 'CONFIRMED') AND e.registration_required IS TRUE
`;

function toPublicEvent(row: PublicEventRow): PublicEvent {
  const availability = describeRegistrationAvailability({
    status: row.status,
    registrationRequired: row.registrationRequired,
    startsAt: date(row.startsAt),
    registrationOpensAt: date(row.registrationOpensAt),
    registrationClosesAt: date(row.registrationClosesAt),
    registrationCapacity: row.registrationCapacity,
    registeredCount: row.registeredCount,
    now: new Date(row.now),
  });
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    description: row.description,
    startsAt: isoOrNull(row.startsAt),
    endsAt: isoOrNull(row.endsAt),
    venue: row.venueName === null ? null : { name: row.venueName, location: row.venueLocation },
    registrationCapacity: row.registrationCapacity,
    registeredCount: row.registeredCount,
    spotsLeft: availability.spotsLeft,
    registrationOpensAt: isoOrNull(row.registrationOpensAt),
    registrationClosesAt: isoOrNull(row.registrationClosesAt),
    isOpen: availability.isOpen,
    closedReason: availability.closedReason,
    myRegistrationStatus: row.myRegistrationStatus,
  };
}

/** Discoverable events for any signed-in user, soonest first. */
export async function listDiscoverableEvents(
  { pool }: RegistrationDependencies,
  actor: RegistrationActor,
): Promise<PublicEvent[]> {
  const result = await pool.query<PublicEventRow>(
    `${publicEventSelect} ORDER BY e.starts_at ASC NULLS LAST, e.id ASC LIMIT 200`,
    [actor.id],
  );
  return result.rows.map(toPublicEvent);
}

export async function getDiscoverableEvent(
  { pool }: RegistrationDependencies,
  actor: RegistrationActor,
  eventRequestId: string,
): Promise<PublicEvent> {
  const result = await pool.query<PublicEventRow>(`${publicEventSelect} AND e.id = $2`, [actor.id, eventRequestId]);
  const row = result.rows[0];
  if (!row) throw new RegistrationEventNotFoundError();
  return toPublicEvent(row);
}

interface LockedEventRow {
  id: string;
  organiserId: string;
  name: string | null;
  status: string;
  registrationRequired: boolean | null;
  startsAt: Timestamp | null;
  registrationCapacity: number | null;
  registrationOpensAt: Timestamp | null;
  registrationClosesAt: Timestamp | null;
  now: Timestamp;
}

interface RegistrationRow {
  id: string;
  status: RegistrationStatus;
  registeredAt: Timestamp;
  withdrawnAt: Timestamp | null;
}

const registrationColumns = 'id, status, registered_at AS "registeredAt", withdrawn_at AS "withdrawnAt"';

async function inTransaction<T>(
  pool: RegistrationDependencies['pool'],
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Discard a connection whose transaction could not be cleaned up.
      releaseError = rollbackError instanceof Error ? rollbackError : new Error('Rollback failed.');
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

/** Competing registrations and withdrawals for one event wait on this row lock. */
async function lockEvent(client: PoolClient, eventRequestId: string): Promise<LockedEventRow | undefined> {
  const events = await client.query<LockedEventRow>(`
    SELECT id, organiser_id AS "organiserId", name, status,
      registration_required AS "registrationRequired", starts_at AS "startsAt",
      registration_capacity AS "registrationCapacity",
      registration_opens_at AS "registrationOpensAt",
      registration_closes_at AS "registrationClosesAt",
      clock_timestamp() AS now
    FROM event_requests WHERE id = $1 FOR UPDATE
  `, [eventRequestId]);
  return events.rows[0];
}

async function readRegistration(client: PoolClient, eventRequestId: string, attendeeId: string) {
  const existing = await client.query<RegistrationRow>(
    `SELECT ${registrationColumns} FROM event_registrations
     WHERE event_request_id = $1 AND attendee_id = $2 FOR UPDATE`,
    [eventRequestId, attendeeId],
  );
  return existing.rows[0];
}

async function readDisplayName(client: PoolClient, userId: string): Promise<string> {
  const users = await client.query<{ displayName: string }>(
    'SELECT display_name AS "displayName" FROM app_users WHERE id = $1', [userId],
  );
  return users.rows[0]?.displayName ?? 'An attendee';
}

function toResult(eventRequestId: string, row: RegistrationRow): RegistrationResult {
  return {
    registrationId: row.id,
    eventRequestId,
    status: row.status,
    registeredAt: iso(row.registeredAt),
    withdrawnAt: isoOrNull(row.withdrawnAt),
  };
}

function isDatabaseError(error: unknown): error is { code: string; constraint?: string } {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string';
}

const eventLabel = (name: string | null) => name?.trim() || 'Untitled event';

export async function registerForEvent(
  { pool }: RegistrationDependencies,
  actor: RegistrationActor,
  eventRequestId: string,
): Promise<RegistrationResult> {
  if (actor.role !== 'ATTENDEE') throw new RegistrationForbiddenError();

  try {
    return await inTransaction(pool, async (client) => {
      const event = await lockEvent(client, eventRequestId);
      // Drafts, rejected requests and events without registration stay invisible to attendees.
      if (!event || !isDiscoverable(event)) throw new RegistrationEventNotFoundError();

      const existing = await readRegistration(client, event.id, actor.id);
      if (existing?.status === 'REGISTERED') {
        throw new RegistrationStateError('ALREADY_REGISTERED', 'You are already registered for this event.');
      }

      // Counted after the lock so a previous winner's commit is visible.
      const counted = await client.query<{ registered: number }>(
        `SELECT count(*)::int AS registered FROM event_registrations
         WHERE event_request_id = $1 AND status = 'REGISTERED'`,
        [event.id],
      );
      assertOpenForRegistration({
        status: event.status,
        registrationRequired: event.registrationRequired,
        startsAt: date(event.startsAt),
        registrationOpensAt: date(event.registrationOpensAt),
        registrationClosesAt: date(event.registrationClosesAt),
        registrationCapacity: event.registrationCapacity,
        registeredCount: counted.rows[0]?.registered ?? 0,
        now: new Date(event.now),
      });

      const saved = existing
        ? await client.query<RegistrationRow>(
          `UPDATE event_registrations
           SET status = 'REGISTERED', registered_at = now(), withdrawn_at = NULL
           WHERE id = $1 RETURNING ${registrationColumns}`,
          [existing.id],
        )
        : await client.query<RegistrationRow>(
          `INSERT INTO event_registrations (event_request_id, attendee_id)
           VALUES ($1, $2) RETURNING ${registrationColumns}`,
          [event.id, actor.id],
        );
      const row = saved.rows[0];
      if (!row) throw new Error('The registration could not be recorded.');

      const label = eventLabel(event.name);
      const attendeeName = await readDisplayName(client, actor.id);
      await notify(client, [
        {
          recipientId: actor.id, eventRequestId: event.id, type: 'REGISTRATION_CONFIRMED',
          title: 'Registration confirmed', message: `You are registered for ${label}.`,
        },
        // The acting user never receives the organiser copy.
        ...(event.organiserId === actor.id ? [] : [{
          recipientId: event.organiserId, eventRequestId: event.id, type: 'ATTENDEE_REGISTERED',
          title: 'New registration', message: `${attendeeName} registered for ${label}.`,
        }]),
      ]);
      return toResult(event.id, row);
    });
  } catch (error) {
    // Final guards: the capacity trigger and the one-row-per-attendee unique constraint.
    if (isDatabaseError(error) && error.code === '23P01'
        && error.constraint === 'event_registrations_within_capacity') {
      throw new RegistrationStateError('REGISTRATION_FULL', 'This event is full.', 'FULL');
    }
    if (isDatabaseError(error) && error.code === '23505') {
      throw new RegistrationStateError('ALREADY_REGISTERED', 'You are already registered for this event.');
    }
    throw error;
  }
}

export async function withdrawFromEvent(
  { pool }: RegistrationDependencies,
  actor: RegistrationActor,
  eventRequestId: string,
): Promise<RegistrationResult> {
  if (actor.role !== 'ATTENDEE') throw new RegistrationForbiddenError();

  return inTransaction(pool, async (client) => {
    const event = await lockEvent(client, eventRequestId);
    if (!event) throw new RegistrationEventNotFoundError();

    const existing = await readRegistration(client, event.id, actor.id);
    // Without a registration, a non-discoverable event must look the same as a missing one.
    if (!existing && !isDiscoverable(event)) throw new RegistrationEventNotFoundError();
    if (!existing || existing.status !== 'REGISTERED') {
      throw new RegistrationStateError('NOT_REGISTERED', 'You are not registered for this event.');
    }
    if (hasEventStarted(date(event.startsAt), new Date(event.now))) {
      throw new RegistrationStateError(
        'WITHDRAWAL_CLOSED', 'This event has already started, so you can no longer withdraw.', 'EVENT_STARTED',
      );
    }

    const saved = await client.query<RegistrationRow>(
      `UPDATE event_registrations SET status = 'WITHDRAWN', withdrawn_at = now()
       WHERE id = $1 RETURNING ${registrationColumns}`,
      [existing.id],
    );
    const row = saved.rows[0];
    if (!row) throw new Error('The withdrawal could not be recorded.');

    const label = eventLabel(event.name);
    const attendeeName = await readDisplayName(client, actor.id);
    await notify(client, [
      {
        recipientId: actor.id, eventRequestId: event.id, type: 'REGISTRATION_WITHDRAWN',
        title: 'Registration withdrawn', message: `You withdrew your registration for ${label}.`,
      },
      ...(event.organiserId === actor.id ? [] : [{
        recipientId: event.organiserId, eventRequestId: event.id, type: 'ATTENDEE_WITHDREW',
        title: 'Registration withdrawn', message: `${attendeeName} withdrew from ${label}.`,
      }]),
    ]);
    return toResult(event.id, row);
  });
}

interface MyRegistrationRow extends RegistrationRow {
  eventRequestId: string;
  eventName: string | null;
  eventStatus: string;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  venueName: string | null;
  venueLocation: string | null;
  now: Timestamp;
}

/** The caller's own registrations, including withdrawn ones, newest first. */
export async function listMyRegistrations(
  { pool }: RegistrationDependencies,
  actor: RegistrationActor,
): Promise<MyRegistration[]> {
  const result = await pool.query<MyRegistrationRow>(`
    SELECT r.id, r.status, r.registered_at AS "registeredAt", r.withdrawn_at AS "withdrawnAt",
      e.id AS "eventRequestId", e.name AS "eventName", e.status AS "eventStatus",
      e.starts_at AS "startsAt", e.ends_at AS "endsAt",
      venue.name AS "venueName", venue.location AS "venueLocation", now() AS now
    FROM event_registrations r
    JOIN event_requests e ON e.id = r.event_request_id
    LEFT JOIN LATERAL (
      SELECT v.name, v.location FROM venue_bookings b
      JOIN venues v ON v.id = b.venue_id
      WHERE b.event_request_id = e.id AND b.status = 'APPROVED'
      ORDER BY b.starts_at ASC, b.id ASC LIMIT 1
    ) venue ON true
    WHERE r.attendee_id = $1
    ORDER BY r.registered_at DESC, r.id DESC LIMIT 200
  `, [actor.id]);
  return result.rows.map((row) => ({
    ...toResult(row.eventRequestId, row),
    event: {
      id: row.eventRequestId,
      name: row.eventName,
      status: row.eventStatus,
      startsAt: isoOrNull(row.startsAt),
      endsAt: isoOrNull(row.endsAt),
      venue: row.venueName === null ? null : { name: row.venueName, location: row.venueLocation },
      canWithdraw: row.status === 'REGISTERED' && !hasEventStarted(date(row.startsAt), new Date(row.now)),
    },
  }));
}

/** Attendee list for the owning organiser or the assigned coordinator only. */
export async function listAttendees(
  { pool }: RegistrationDependencies,
  actor: RegistrationActor,
  eventRequestId: string,
): Promise<AttendeeList> {
  // Relationship is enforced in SQL so an unrelated caller sees the same result as a missing event.
  const events = await pool.query<{ id: string; registrationCapacity: number | null }>(`
    SELECT id, registration_capacity AS "registrationCapacity" FROM event_requests
    WHERE id = $1 AND (
      ($2 = 'EVENT_ORGANISER' AND organiser_id = $3)
      OR ($2 = 'EVENT_COORDINATOR' AND coordinator_id = $3)
    )
  `, [eventRequestId, actor.role, actor.id]);
  const event = events.rows[0];
  if (!event) throw new RegistrationEventNotFoundError();

  const attendees = await pool.query<RegistrationRow & { displayName: string; email: string }>(`
    SELECT r.id, u.display_name AS "displayName", u.email, r.status,
      r.registered_at AS "registeredAt", r.withdrawn_at AS "withdrawnAt"
    FROM event_registrations r JOIN app_users u ON u.id = r.attendee_id
    WHERE r.event_request_id = $1
    ORDER BY (r.status = 'REGISTERED') DESC, r.registered_at ASC, r.id ASC
  `, [event.id]);

  const registered = attendees.rows.filter((row) => row.status === 'REGISTERED').length;
  return {
    eventRequestId: event.id,
    counts: {
      registered,
      withdrawn: attendees.rows.length - registered,
      capacity: event.registrationCapacity,
      spotsLeft: event.registrationCapacity === null ? null : Math.max(0, event.registrationCapacity - registered),
    },
    items: attendees.rows.map((row) => ({
      registrationId: row.id,
      displayName: row.displayName,
      email: row.email,
      status: row.status,
      registeredAt: iso(row.registeredAt),
      withdrawnAt: isoOrNull(row.withdrawnAt),
    })),
  };
}
