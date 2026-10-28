import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cancelEvent } from '../../../backend/src/modules/events/cancellation.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createVenueBooking, decideVenueBooking } from '../../../backend/src/modules/venues/booking-service.js';
import { changeEquipmentReservation, getEquipmentReservationContext } from '../../../backend/src/modules/equipment/reservation-service.js';
import {
  countUnreadNotifications, listNotifications, markAllNotificationsRead, markNotificationRead,
} from '../../../backend/src/modules/notifications/inbox.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
let staff: WorkflowActor;
beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
  staff = await fixture.createUser('VENUE_STAFF');
});
afterAll(async () => { await fixture?.destroy(); });

const period = { startsAt: '2031-02-12T02:00:00.000Z', endsAt: '2031-02-12T04:00:00.000Z' };
const input = { reason: 'Confidential internal cancellation reason', confirmAffectedArrangements: true };
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};
// Pause a real PostgreSQL transaction at a known statement; all SQL and locks remain real.
function intercept(before: (sql: string) => Promise<void>, after = async (_sql: string) => {}) {
  return { pool: {
    query: fixture.pool.query.bind(fixture.pool),
    connect: async () => {
      const client = await fixture.pool.connect();
      return { query: async (sql: string, values?: unknown[]) => {
        await before(sql);
        const result = await client.query(sql, values);
        await after(sql);
        return result;
      }, release: client.release.bind(client) } as unknown as PoolClient;
    },
  } };
}
async function event() {
  return fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED', ...period });
}
async function venue() {
  const id = randomUUID();
  await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)', [id, `Venue ${id}`]);
  return id;
}
async function booking(eventRequestId: string) {
  const venueId = await venue();
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO venue_bookings(id,event_request_id,venue_id,requested_by,starts_at,ends_at)
    VALUES($1,$2,$3,$4,$5,$6)`, [id, eventRequestId, venueId, coordinator.id, period.startsAt, period.endsAt]);
  return id;
}

describe('KAN-62 cancellation lock ordering and atomicity', () => {
  it('serializes against an approval already holding the booking gate without deadlock', async () => {
    const eventRequestId = await event();
    const bookingId = await booking(eventRequestId);
    const bookingLocked = deferred();
    const continueDecision = deferred();
    const cancellationReachedLock = deferred();
    const decisionDb = intercept(async () => {}, async sql => {
      if (sql.includes('FROM venue_bookings WHERE id = $1 FOR UPDATE')) {
        bookingLocked.resolve();
        await continueDecision.promise;
      }
    });
    const cancellationDb = intercept(async sql => {
      if (sql.includes('pg_advisory_xact_lock') || sql.includes('FROM event_requests WHERE id = $1 FOR UPDATE')) {
        cancellationReachedLock.resolve();
      }
    });
    const approval = decideVenueBooking(decisionDb, { bookingId, actor: staff, input: { decision: 'APPROVED' } });
    await bookingLocked.promise;
    const cancellation = cancelEvent(cancellationDb.pool, { eventRequestId, actor: organiser, input });
    try {
      await cancellationReachedLock.promise;
    } finally {
      continueDecision.resolve();
    }
    await expect(approval).resolves.toMatchObject({ status: 'APPROVED' });
    await expect(cancellation).resolves.toMatchObject({ status: 'CANCELLED', released: { venueBookings: 1 } });
    expect((await fixture.pool.query('SELECT status FROM venue_bookings WHERE id=$1', [bookingId])).rows[0].status).toBe('CANCELLED');
  });

  it('refuses a booking created after the prelock snapshot, then a fresh cancellation releases it', async () => {
    const eventRequestId = await event();
    const venueId = await venue();
    const snapshotRead = deferred();
    const continueCancellation = deferred();
    const cancellationDb = intercept(async () => {}, async sql => {
      if (sql.includes('SELECT id, venue_id AS "venueId"')) {
        snapshotRead.resolve();
        await continueCancellation.promise;
      }
    });
    const pending = cancelEvent(cancellationDb.pool, { eventRequestId, actor: organiser, input });
    await snapshotRead.promise;
    let created;
    try {
      created = await createVenueBooking(fixture.dependencies, { eventRequestId, actor: coordinator,
        input: { venueId, ...period } });
    } finally { continueCancellation.resolve(); }
    await expect(pending).rejects.toMatchObject({ code: 'EVENT_ARRANGEMENTS_CHANGED' });
    expect(await fixture.eventRow(eventRequestId)).toMatchObject({ status: 'APPROVED' });
    expect(await fixture.notifications(eventRequestId)).toEqual([]);
    await expect(cancelEvent(fixture.pool, { eventRequestId, actor: organiser, input }))
      .resolves.toMatchObject({ released: { venueBookings: 1 } });
    expect((await fixture.pool.query('SELECT status FROM venue_bookings WHERE id=$1', [created!.id])).rows[0].status).toBe('CANCELLED');
  });

  it('rolls back event, booking, equipment, registration, history and audit if notification persistence fails', async () => {
    const eventRequestId = await event();
    const bookingId = await booking(eventRequestId);
    const attendee = await fixture.createUser('ATTENDEE');
    const technical = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
    const typeId = randomUUID();
    await fixture.pool.query('INSERT INTO equipment_types(id,name,total_quantity) VALUES($1,$2,3)', [typeId, `Equipment ${typeId}`]);
    await fixture.pool.query(`INSERT INTO equipment_requests(event_request_id,equipment_type_id,requested_by,quantity,
      starts_at,ends_at,status,decided_by,decided_at) VALUES($1,$2,$3,2,$4,$5,'RESERVED',$6,now())`,
    [eventRequestId, typeId, coordinator.id, period.startsAt, period.endsAt, technical.id]);
    await fixture.pool.query('INSERT INTO event_registrations(event_request_id,attendee_id) VALUES($1,$2)', [eventRequestId, attendee.id]);
    const historyBefore = await fixture.history(eventRequestId);
    const failing = intercept(async sql => {
      if (sql.includes('INSERT INTO notifications')) throw new Error('notification storage unavailable');
    });
    await expect(cancelEvent(failing.pool, { eventRequestId, actor: organiser, input })).rejects.toThrow('notification storage unavailable');
    expect(await fixture.eventRow(eventRequestId)).toMatchObject({ status: 'APPROVED' });
    expect((await fixture.pool.query('SELECT status FROM venue_bookings WHERE id=$1', [bookingId])).rows[0].status).toBe('PENDING');
    expect((await fixture.pool.query('SELECT status,released_at FROM equipment_requests WHERE event_request_id=$1', [eventRequestId])).rows)
      .toEqual([{ status: 'RESERVED', released_at: null }]);
    expect((await fixture.pool.query('SELECT status,cancellation_outcome_at FROM event_registrations WHERE event_request_id=$1', [eventRequestId])).rows)
      .toEqual([{ status: 'REGISTERED', cancellation_outcome_at: null }]);
    expect(await fixture.history(eventRequestId)).toEqual(historyBefore);
    expect((await fixture.pool.query('SELECT * FROM event_cancellations WHERE event_request_id=$1', [eventRequestId])).rows).toEqual([]);
    expect(await fixture.notifications(eventRequestId)).toEqual([]);
  });

  it('allows one concurrent cancellation and preserves a single audit/outcome on replay', async () => {
    const eventRequestId = await event();
    const results = await Promise.allSettled([
      cancelEvent(fixture.pool, { eventRequestId, actor: organiser, input }),
      cancelEvent(fixture.pool, { eventRequestId, actor: coordinator, input }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toMatchObject([
      { reason: { code: 'EVENT_NOT_CANCELLABLE' } },
    ]);
    expect((await fixture.pool.query('SELECT * FROM event_cancellations WHERE event_request_id=$1', [eventRequestId])).rowCount).toBe(1);
    expect((await fixture.history(eventRequestId)).filter(row => row.to_status === 'CANCELLED')).toHaveLength(1);
    expect(await fixture.notifications(eventRequestId)).toHaveLength(2);
  });

  it.each(['reservation', 'cancellation'] as const)('serializes KAN-26 reservation against cancellation when %s locks first', async first => {
    const eventRequestId = await event();
    const technical = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
    const typeId = randomUUID();
    const requestId = randomUUID();
    await fixture.pool.query('INSERT INTO equipment_types(id,name,total_quantity) VALUES($1,$2,2)', [typeId, `Equipment ${typeId}`]);
    await fixture.pool.query(`INSERT INTO equipment_requests(id,event_request_id,equipment_type_id,requested_by,quantity,starts_at,ends_at)
      VALUES($1,$2,$3,$4,2,$5,$6)`, [requestId, eventRequestId, typeId, coordinator.id, period.startsAt, period.endsAt]);
    const context = await getEquipmentReservationContext(fixture.dependencies, { actor: technical, eventId: eventRequestId });
    const firstLocked = deferred();
    const secondWaiting = deferred();
    const continueFirst = deferred();
    const isEventLock = (sql: string) => sql.includes('FROM event_requests WHERE id = $1 FOR UPDATE');
    const winnerDb = intercept(async () => {}, async sql => {
      if (isEventLock(sql)) { firstLocked.resolve(); await continueFirst.promise; }
    });
    const loserDb = intercept(async sql => { if (isEventLock(sql)) secondWaiting.resolve(); });
    const reserve = (database: ReturnType<typeof intercept>) => changeEquipmentReservation(database, {
      actor: technical, eventId: eventRequestId, requestId, action: 'reserve',
      input: { requirementsVersion: context.requirementsVersion },
    });
    const cancel = (database: ReturnType<typeof intercept>) => cancelEvent(database.pool, { eventRequestId, actor: organiser, input });
    const winner = first === 'reservation' ? reserve(winnerDb) : cancel(winnerDb);
    await firstLocked.promise;
    const loser = first === 'reservation' ? cancel(loserDb) : reserve(loserDb);
    // Attach rejection handling before releasing either transaction.
    const outcomes = Promise.allSettled([winner, loser]);
    try { await secondWaiting.promise; } finally { continueFirst.resolve(); }
    const results = await outcomes;
    expect(results[0].status).toBe('fulfilled');
    if (first === 'reservation') expect(results[1].status).toBe('fulfilled');
    else expect(results[1]).toMatchObject({ status: 'rejected', reason: { code: 'EQUIPMENT_EVENT_NOT_APPROVED' } });
    expect((await fixture.pool.query('SELECT status,release_cause FROM equipment_requests WHERE id=$1', [requestId])).rows[0])
      .toMatchObject({ status: 'CANCELLED', release_cause: 'EVENT_CANCELLED' });
    expect(await fixture.eventRow(eventRequestId)).toMatchObject({ status: 'CANCELLED' });
    expect((await fixture.pool.query('SELECT affected_equipment_requests FROM event_cancellations WHERE event_request_id=$1',
      [eventRequestId])).rows[0].affected_equipment_requests).toBe(1);
  });

  it('does not treat a former organiser who became a coordinator as the assigned coordinator', async () => {
    const formerOwner = await fixture.createUser('EVENT_ORGANISER');
    const eventRequestId = await fixture.createEvent({ organiserId: formerOwner.id, coordinatorId: coordinator.id, status: 'APPROVED' });
    await fixture.pool.query("UPDATE app_users SET role='EVENT_COORDINATOR' WHERE id=$1", [formerOwner.id]);
    await expect(cancelEvent(fixture.pool, { eventRequestId, actor: { id: formerOwner.id, role: 'EVENT_COORDINATOR' }, input }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(await fixture.eventRow(eventRequestId)).toMatchObject({ status: 'APPROVED' });
  });
});

describe('KAN-62 attendee cancellation inbox with real PostgreSQL authorization', () => {
  it('lists/counts/reads only the affected attendee outcome and never exposes internal reasons or protected links', async () => {
    const attendee = await fixture.createUser('ATTENDEE');
    const other = await fixture.createUser('ATTENDEE');
    const eventRequestId = await event();
    await fixture.pool.query('INSERT INTO event_registrations(event_request_id,attendee_id) VALUES($1,$2)', [eventRequestId, attendee.id]);
    await cancelEvent(fixture.pool, { eventRequestId, actor: organiser, input });
    // Stored content must not be trusted as an attendee-safe DTO.
    await fixture.pool.query(`UPDATE notifications SET title='Internal title', message=$3
      WHERE event_request_id=$1 AND recipient_id=$2`, [eventRequestId, attendee.id, input.reason]);
    const own = await listNotifications(fixture.dependencies, attendee);
    expect(own).toHaveLength(1);
    expect(own[0]).toMatchObject({ type: 'EVENT_CANCELLED', title: 'Event cancelled',
      message: 'Open day has been cancelled. Your registration is no longer active.',
      event: null, booking: null, link: null, read: false });
    expect(JSON.stringify(own)).not.toContain(input.reason);
    expect(await countUnreadNotifications(fixture.dependencies, attendee)).toBe(1);
    expect(await listNotifications(fixture.dependencies, other)).toEqual([]);
    expect(await countUnreadNotifications(fixture.dependencies, other)).toBe(0);
    await expect(markNotificationRead(fixture.dependencies, { actor: other, notificationId: own[0]!.id }))
      .rejects.toMatchObject({ code: 'NOTIFICATION_NOT_FOUND' });
    expect(await markAllNotificationsRead(fixture.dependencies, other)).toBe(0);
    const read = await markNotificationRead(fixture.dependencies, { actor: attendee, notificationId: own[0]!.id });
    expect(read).toMatchObject({ read: true, event: null, link: null });
    expect(await countUnreadNotifications(fixture.dependencies, attendee)).toBe(0);
    expect((await markNotificationRead(fixture.dependencies, { actor: attendee, notificationId: own[0]!.id })).readAt).toBe(read.readAt);

    const secondEvent = await event();
    await fixture.pool.query('INSERT INTO event_registrations(event_request_id,attendee_id) VALUES($1,$2)', [secondEvent, attendee.id]);
    await cancelEvent(fixture.pool, { eventRequestId: secondEvent, actor: organiser, input });
    expect(await markAllNotificationsRead(fixture.dependencies, attendee)).toBe(1);
    expect(await countUnreadNotifications(fixture.dependencies, attendee)).toBe(0);

    // Neither another kind of event notice nor cancellation with no affected registration grants access.
    const unregistered = await event();
    await cancelEvent(fixture.pool, { eventRequestId: unregistered, actor: organiser, input });
    await fixture.pool.query(`INSERT INTO notifications(recipient_id,event_request_id,type,title,message,dedupe_key)
      VALUES($1,$2,'EVENT_CANCELLED','Hidden','Hidden','no-registration'),
        ($1,$3,'REVIEW_APPROVED','Hidden','Hidden','wrong-type')`, [attendee.id, unregistered, eventRequestId]);
    expect(await listNotifications(fixture.dependencies, attendee)).toHaveLength(2);
    expect(await countUnreadNotifications(fixture.dependencies, attendee)).toBe(0);
    expect(await markAllNotificationsRead(fixture.dependencies, attendee)).toBe(0);
  });
});
