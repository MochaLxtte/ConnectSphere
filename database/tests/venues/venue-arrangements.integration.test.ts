import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import {
  cancelVenueArrangement, createVenueBooking, decideVenueBooking, expireVenueHolds, listVenueBookings,
  placeVenueHold, venueArrangementReadiness,
} from '../../../backend/src/modules/venues/booking-service.js';
import { createVenueBlock } from '../../../backend/src/modules/venues/block-service.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let staff: WorkflowActor;
let otherStaff: WorkflowActor;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;
let technician: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  staff = await fixture.createUser('VENUE_STAFF');
  otherStaff = await fixture.createUser('VENUE_STAFF');
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
  technician = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
});
afterAll(async () => { await fixture?.destroy(); });

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// A month ahead, on the hour, so hold deadlines fit between now and the start.
const base = Math.floor((Date.now() + 30 * DAY) / HOUR) * HOUR;
const period = (startHour: number, hours = 2) => ({
  startsAt: new Date(base + startHour * HOUR).toISOString(),
  endsAt: new Date(base + (startHour + hours) * HOUR).toISOString(),
});
const tomorrow = () => new Date(Date.now() + DAY).toISOString();

async function venue(capacity = 200) {
  const id = randomUUID();
  await fixture.pool.query('INSERT INTO venues(id, name, capacity) VALUES($1,$2,$3)',
    [id, `Room ${id.slice(0, 6)}`, capacity]);
  return id;
}

async function event(status: EventStatus = 'APPROVED', coordinatorId: string | null = coordinator.id) {
  return fixture.createEvent({ organiserId: organiser.id, coordinatorId, status, name: 'Open day' });
}

const request_ = (eventRequestId: string, venueId: string, startHour: number, extra: Record<string, unknown> = {}) =>
  createVenueBooking(fixture.dependencies, {
    eventRequestId, actor: coordinator, input: { venueId, ...period(startHour), ...extra },
  });
const approve = (id: string, actor = staff) =>
  decideVenueBooking(fixture.dependencies, { bookingId: id, actor, input: { decision: 'APPROVED' } });
const reject = (id: string) =>
  decideVenueBooking(fixture.dependencies, { bookingId: id, actor: staff, input: { decision: 'REJECTED', reason: 'No' } });
const cancel = (id: string, reason: unknown = 'Room no longer needed', actor = coordinator) =>
  cancelVenueArrangement(fixture.dependencies, { bookingId: id, actor, input: { reason } });
const row = async (id: string) =>
  (await fixture.pool.query('SELECT * FROM venue_bookings WHERE id = $1', [id])).rows[0];
const typed = async (eventRequestId: string, type: string) =>
  (await fixture.notifications(eventRequestId)).filter((item) => item.type === type);

describe('KAN-82 several independent arrangements on one event (AC1, AC2, AC3)', () => {
  it('KAN-82-AC1/AC2 keeps two arrangements with their own identity, venue, period and layout', async () => {
    const eventId = await event();
    const [hall, studio] = [await venue(), await venue()];
    const a = await request_(eventId, hall, 0, { layout: 'Theatre' });
    const b = await request_(eventId, studio, 3, { layout: 'Workshop', notes: 'Breakout' });
    expect(a.id).not.toBe(b.id);
    const listed = await listVenueBookings(fixture.dependencies, { actor: coordinator, eventRequestId: eventId });
    expect(listed.map((item) => [item.id, item.venueId, item.startsAt, item.layout])).toEqual([
      [a.id, hall, period(0).startsAt, 'Theatre'], [b.id, studio, period(3).startsAt, 'Workshop'],
    ]);
    expect(listed.every((item) => item.eventRequestId === eventId && item.replacedByBookingIds.length === 0)).toBe(true);
  });

  it('KAN-82-AC2/AC3 checks each request on its own: a clash on one venue saves nothing and leaves the other alone', async () => {
    const eventId = await event();
    const busyRoom = await venue();
    const freeRoom = await venue();
    const rival = await event();
    await approve((await request_(rival, busyRoom, 10)).id);
    const kept = await request_(eventId, freeRoom, 10);
    const before = await row(kept.id);
    await expect(request_(eventId, busyRoom, 10)).rejects.toMatchObject({ code: 'VENUE_BOOKING_CONFLICT' });
    expect(await row(kept.id)).toEqual(before);
    expect((await listVenueBookings(fixture.dependencies, { actor: coordinator, eventRequestId: eventId })).map((item) => item.id))
      .toEqual([kept.id]);
  });

  it('KAN-82-AC3 a refused decision on one arrangement does not change another', async () => {
    const eventId = await event();
    const room = await venue();
    const other = await request_(eventId, await venue(), 20);
    await approve(other.id);
    const failing = await request_(eventId, room, 20);
    await fixture.pool.query('UPDATE venues SET is_active = false WHERE id = $1', [room]);
    const before = await row(other.id);
    await expect(approve(failing.id)).rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
    expect(await row(other.id)).toEqual(before);
    expect((await row(failing.id)).status).toBe('PENDING');
  });
});

describe('KAN-82 cancelling one arrangement (AC4, AC7, AC9, AC10, AC11)', () => {
  it.each([
    ['pending', 'PENDING'], ['held', 'HELD'], ['approved', 'APPROVED'],
  ] as const)('KAN-82-AC4 cancels a %s arrangement, keeping its history and leaving the others alone', async (_label, kind) => {
    const eventId = await event();
    const room = await venue();
    const target = await request_(eventId, room, 30);
    if (kind === 'HELD') await placeVenueHold(fixture.dependencies, { bookingId: target.id, actor: staff, input: { expiresAt: tomorrow() } });
    if (kind === 'APPROVED') await approve(target.id);
    const neighbour = await request_(eventId, await venue(), 30);
    await approve(neighbour.id);
    const neighbourBefore = await row(neighbour.id);
    const eventBefore = await fixture.eventRow(eventId);
    const beforeTarget = await row(target.id);

    const cancelled = await cancel(target.id, '  Moving to a smaller room  ');
    expect(cancelled).toMatchObject({
      id: target.id, status: 'CANCELLED', cancelledBy: coordinator.id, cancellationReason: 'Moving to a smaller room',
    });
    const saved = await row(target.id);
    // Decision and hold details stay as history (AC4).
    expect(saved).toMatchObject({ decided_by: beforeTarget.decided_by, held_by: beforeTarget.held_by,
      hold_expires_at: beforeTarget.hold_expires_at, venue_id: room });
    expect(await row(neighbour.id)).toEqual(neighbourBefore);
    // AC7: event-level fields are untouched.
    expect(await fixture.eventRow(eventId)).toEqual(eventBefore);
    // AC4: the period is free again for another event.
    const other = await event();
    await expect(approve((await request_(other, room, 30)).id)).resolves.toMatchObject({ status: 'APPROVED' });
  });

  it('KAN-82-AC4 accepts a confirmed event and refuses events that are not in approved planning', async () => {
    const confirmed = await event('CONFIRMED');
    const room = await venue();
    const id = randomUUID();
    await fixture.pool.query(`INSERT INTO venue_bookings (id, event_request_id, venue_id, requested_by, starts_at, ends_at)
      VALUES ($1,$2,$3,$4,$5,$6)`, [id, confirmed, room, coordinator.id, period(40).startsAt, period(40).endsAt]);
    await expect(cancel(id)).resolves.toMatchObject({ status: 'CANCELLED' });

    for (const status of ['SUBMITTED', 'CANCELLED', 'COMPLETED'] as const) {
      const eventId = await event(status);
      const bookingId = randomUUID();
      await fixture.pool.query(`INSERT INTO venue_bookings (id, event_request_id, venue_id, requested_by, starts_at, ends_at)
        VALUES ($1,$2,$3,$4,$5,$6)`, [bookingId, eventId, await venue(), coordinator.id, period(41).startsAt, period(41).endsAt]);
      await expect(cancel(bookingId)).rejects.toMatchObject({ code: 'ARRANGEMENT_NOT_CANCELLABLE' });
      expect((await row(bookingId)).status).toBe('PENDING');
    }
  });

  it('KAN-82-AC4 refuses a blank reason, and rejected, expired or already cancelled arrangements', async () => {
    const eventId = await event();
    const target = await request_(eventId, await venue(), 50);
    await expect(cancel(target.id, '   ')).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    await expect(cancelVenueArrangement(fixture.dependencies, { bookingId: target.id, actor: coordinator, input: {} }))
      .rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    expect((await row(target.id)).status).toBe('PENDING');

    const rejected = await request_(eventId, await venue(), 50);
    await reject(rejected.id);
    await expect(cancel(rejected.id)).rejects.toMatchObject({ code: 'ARRANGEMENT_NOT_CANCELLABLE' });

    const lapsed = await request_(eventId, await venue(), 50);
    await placeVenueHold(fixture.dependencies, { bookingId: lapsed.id, actor: staff, input: { expiresAt: tomorrow() } });
    await fixture.pool.query("UPDATE venue_bookings SET hold_expires_at = clock_timestamp() - interval '1 second' WHERE id = $1", [lapsed.id]);
    await expect(cancel(lapsed.id)).rejects.toMatchObject({ code: 'HOLD_EXPIRED' });
    await expireVenueHolds(fixture.pool);
    await expect(cancel(lapsed.id)).rejects.toMatchObject({ code: 'ARRANGEMENT_NOT_CANCELLABLE' });
  });

  it('KAN-82-AC10 a repeat cancellation is refused without a second history change or notice', async () => {
    const eventId = await event();
    const target = await request_(eventId, await venue(), 60);
    await approve(target.id);
    await cancel(target.id, 'First reason');
    const saved = await row(target.id);
    const notices = await typed(eventId, 'VENUE_ARRANGEMENT_CANCELLED');
    await expect(cancel(target.id, 'Second reason')).rejects.toMatchObject({ code: 'BOOKING_ALREADY_CANCELLED' });
    expect(await row(target.id)).toEqual(saved);
    expect(await typed(eventId, 'VENUE_ARRANGEMENT_CANCELLED')).toEqual(notices);
  });

  it('KAN-82-AC10 only the current coordinator may cancel; others cannot see the arrangement', async () => {
    const eventId = await event();
    const target = await request_(eventId, await venue(), 70);
    await expect(cancel(target.id, 'x', otherCoordinator)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    for (const actor of [staff, organiser, technician]) {
      await expect(cancel(target.id, 'x', actor)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    }
    // A reassignment moves the right with it, checked on the server under the event lock.
    await fixture.pool.query('UPDATE event_requests SET coordinator_id = $2 WHERE id = $1', [eventId, otherCoordinator.id]);
    await expect(cancel(target.id)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    await expect(cancel(target.id, 'Handed over', otherCoordinator)).resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(cancel(randomUUID())).rejects.toMatchObject({ kind: 'NOT_FOUND' });
  });

  it('KAN-82-AC10 a cancel racing an approval resolves against the committed state, never both', async () => {
    const eventId = await event();
    const target = await request_(eventId, await venue(), 80);
    const results = await Promise.allSettled([approve(target.id), cancel(target.id)]);
    const saved = await row(target.id);
    const [approval, cancellation] = results;
    if (saved.status === 'CANCELLED') {
      expect(cancellation.status).toBe('fulfilled');
      // Approval either ran first (then cancelled) or was refused after the cancel.
      if (approval.status === 'rejected') expect(approval.reason).toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
    } else {
      expect(saved.status).toBe('APPROVED');
      expect(cancellation.status).toBe('rejected');
    }
    expect((await typed(eventId, 'VENUE_ARRANGEMENT_CANCELLED')).length).toBeLessThanOrEqual(3);
  });

  it('KAN-82-AC11 notifies the current coordinator and every Venue Staff member once, after commit', async () => {
    const eventId = await event();
    const target = await request_(eventId, await venue(), 90);
    await cancel(target.id, 'Speaker withdrew');
    const notices = await typed(eventId, 'VENUE_ARRANGEMENT_CANCELLED');
    expect(notices.map((item) => item.recipient_id).sort()).toEqual([coordinator.id, staff.id, otherStaff.id].sort());
    expect(notices.find((item) => item.recipient_id === coordinator.id)!.message).toContain('Reason: Speaker withdrew.');
    // A refused attempt writes no notice.
    const refused = await request_(eventId, await venue(), 90);
    await reject(refused.id);
    await expect(cancel(refused.id)).rejects.toBeTruthy();
    expect((await fixture.pool.query(
      "SELECT count(*)::int AS n FROM notifications WHERE venue_booking_id = $1 AND type = 'VENUE_ARRANGEMENT_CANCELLED'",
      [refused.id])).rows[0].n).toBe(0);
  });

  it('KAN-82-AC9 rechecks readiness from the rows without cancelling the event or unrelated allocations', async () => {
    const eventId = await event();
    const a = await request_(eventId, await venue(), 100);
    const b = await request_(eventId, await venue(), 100);
    expect(await venueArrangementReadiness(fixture.pool, eventId)).toEqual({ ready: false, live: 2, outstanding: 2 });
    await approve(a.id);
    await approve(b.id);
    expect(await venueArrangementReadiness(fixture.pool, eventId)).toEqual({ ready: true, live: 2, outstanding: 0 });
    await cancel(a.id);
    expect(await venueArrangementReadiness(fixture.pool, eventId)).toEqual({ ready: true, live: 1, outstanding: 0 });
    const replacement = await request_(eventId, await venue(), 100, { replacesBookingId: a.id });
    expect(await venueArrangementReadiness(fixture.pool, eventId)).toEqual({ ready: false, live: 2, outstanding: 1 });
    await cancel(b.id);
    await cancel(replacement.id);
    expect(await venueArrangementReadiness(fixture.pool, eventId)).toEqual({ ready: false, live: 0, outstanding: 0 });
    expect((await fixture.eventRow(eventId)).status).toBe('APPROVED');
  });

  it('KAN-82-AC9 an outage-affected approved arrangement is outstanding until it is cancelled', async () => {
    const eventId = await event();
    const room = await venue();
    const target = await request_(eventId, room, 110);
    await approve(target.id);
    await createVenueBlock(fixture.dependencies, { actor: staff, venueId: room,
      input: { ...period(110), reason: 'Burst pipe' } });
    expect(await venueArrangementReadiness(fixture.pool, eventId)).toMatchObject({ ready: false, outstanding: 1 });
    await cancel(target.id, 'Venue flooded');
    const flags = await fixture.pool.query('SELECT status FROM venue_outage_impacts WHERE venue_booking_id = $1', [target.id]);
    expect(flags.rows.map((item) => item.status)).toEqual(['RESOLVED']);
  });
});

describe('KAN-82 replacing a cancelled arrangement (AC5, AC6, AC8, AC11)', () => {
  it('KAN-82-AC5/AC8 links a pending replacement both ways and approving it leaves the original cancelled', async () => {
    const eventId = await event();
    const original = await request_(eventId, await venue(), 120);
    await approve(original.id);
    await cancel(original.id, 'Need a bigger room');
    const replacement = await request_(eventId, await venue(), 121, { replacesBookingId: original.id });
    expect(replacement).toMatchObject({ status: 'PENDING', replacesBookingId: original.id });
    const listed = await listVenueBookings(fixture.dependencies, { actor: coordinator, eventRequestId: eventId });
    expect(listed.find((item) => item.id === original.id)).toMatchObject({
      status: 'CANCELLED', replacedByBookingIds: [replacement.id], cancellationReason: 'Need a bigger room',
    });
    const before = await row(original.id);
    await expect(approve(replacement.id)).resolves.toMatchObject({ status: 'APPROVED' });
    expect(await row(original.id)).toEqual(before);
  });

  it('KAN-82-AC5 validates the replacement like any request, including capacity', async () => {
    const eventId = await event();
    const original = await request_(eventId, await venue(), 130);
    await cancel(original.id);
    // The fixture event expects 50 attendees.
    await expect(request_(eventId, await venue(10), 130, { replacesBookingId: original.id }))
      .rejects.toMatchObject({ code: 'VENUE_CAPACITY_TOO_SMALL' });
    expect((await row(original.id)).status).toBe('CANCELLED');
  });

  it('KAN-82-AC6 a rejected replacement leaves the original cancelled and a new linked request can follow', async () => {
    const eventId = await event();
    const unrelated = await request_(eventId, await venue(), 140);
    await approve(unrelated.id);
    const unrelatedBefore = await row(unrelated.id);
    const original = await request_(eventId, await venue(), 141);
    await cancel(original.id);
    const first = await request_(eventId, await venue(), 141, { replacesBookingId: original.id });
    await expect(request_(eventId, await venue(), 141, { replacesBookingId: original.id }))
      .rejects.toMatchObject({ code: 'REPLACEMENT_IN_PROGRESS' });
    await reject(first.id);
    expect((await row(original.id)).status).toBe('CANCELLED');
    const retry = await request_(eventId, await venue(), 141, { replacesBookingId: original.id });
    expect(retry.status).toBe('PENDING');
    expect(await row(unrelated.id)).toEqual(unrelatedBefore);
    const listed = await listVenueBookings(fixture.dependencies, { actor: coordinator, eventRequestId: eventId });
    expect(listed.find((item) => item.id === original.id)!.replacedByBookingIds).toEqual([first.id, retry.id]);
  });

  it('KAN-82-AC6 refuses a replacement for an uncancelled arrangement or one from another event', async () => {
    const eventId = await event();
    const live = await request_(eventId, await venue(), 150);
    await expect(request_(eventId, await venue(), 150, { replacesBookingId: live.id }))
      .rejects.toMatchObject({ code: 'REPLACEMENT_NOT_NEEDED' });
    const otherEvent = await event();
    const foreign = await request_(otherEvent, await venue(), 150);
    await cancel(foreign.id);
    await expect(request_(eventId, await venue(), 150, { replacesBookingId: foreign.id }))
      .rejects.toMatchObject({ kind: 'NOT_FOUND' });
  });

  it('KAN-82-AC10 only one of two concurrent replacement approvals for one cancelled original wins', async () => {
    const eventId = await event();
    const original = await request_(eventId, await venue(), 160);
    await cancel(original.id);
    const first = await request_(eventId, await venue(), 160, { replacesBookingId: original.id });
    // A second pending replacement written directly, as if created before the one-live rule applied.
    const second = randomUUID();
    await fixture.pool.query(`INSERT INTO venue_bookings
      (id, event_request_id, venue_id, requested_by, starts_at, ends_at, replaces_booking_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [second, eventId, await venue(), coordinator.id, period(160).startsAt, period(160).endsAt, original.id]);
    const results = await Promise.allSettled([approve(first.id), approve(second, otherStaff)]);
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((item) => item.status === 'rejected')).toMatchObject({ reason: { code: 'REPLACEMENT_NOT_NEEDED' } });
  });

  it('KAN-82-AC11 a replacement request notifies the coordinator and Venue Staff once', async () => {
    const eventId = await event();
    const original = await request_(eventId, await venue(), 170);
    await cancel(original.id);
    const replacement = await request_(eventId, await venue(), 170, { replacesBookingId: original.id });
    const notices = (await typed(eventId, 'VENUE_REPLACEMENT_REQUESTED'));
    expect(notices.map((item) => item.recipient_id).sort()).toEqual([coordinator.id, staff.id, otherStaff.id].sort());
    const linked = await fixture.pool.query(
      "SELECT DISTINCT venue_booking_id FROM notifications WHERE type = 'VENUE_REPLACEMENT_REQUESTED' AND event_request_id = $1",
      [eventId]);
    expect(linked.rows).toEqual([{ venue_booking_id: replacement.id }]);
    // An ordinary request sends no replacement notice.
    await request_(eventId, await venue(), 171);
    expect(await typed(eventId, 'VENUE_REPLACEMENT_REQUESTED')).toHaveLength(3);
  });
});

describe('KAN-82 runtime HTTP arrangement cancellation', () => {
  it('KAN-82-AC4/AC10/AC12 cancels through the mounted API with role, input and state checks', async () => {
    const claims = new Map<string, string>();
    const app = createRuntimeApp({ pool: fixture.pool, supabaseAuth: {
      async verifyAccessToken(token) {
        const uid = claims.get(token);
        if (!uid) throw Object.assign(new Error('Invalid fixture token'), { code: 'ERR_JWT_INVALID' });
        return { uid, exp: Math.floor(Date.now() / 1000) + 3600 };
      },
    } });
    async function sessionFor(actor: WorkflowActor) {
      const uid = randomUUID();
      const token = randomUUID();
      claims.set(token, uid);
      await fixture.pool.query('UPDATE app_users SET supabase_user_id=$1 WHERE id=$2', [uid, actor.id]);
      const session = request.agent(app);
      expect((await session.post('/api/auth/login').send({ accessToken: token })).status).toBe(200);
      return session;
    }
    const coordinatorSession = await sessionFor(coordinator);
    const staffSession = await sessionFor(staff);
    const eventId = await event();
    const target = await request_(eventId, await venue(), 180);

    expect((await request(app).post(`/api/venue-bookings/${target.id}/cancel`).send({ reason: 'x' })).status).toBe(401);
    expect((await staffSession.post(`/api/venue-bookings/${target.id}/cancel`).send({ reason: 'x' })).status).toBe(403);
    expect((await coordinatorSession.post('/api/venue-bookings/not-a-uuid/cancel').send({ reason: 'x' })).status).toBe(400);
    const blank = await coordinatorSession.post(`/api/venue-bookings/${target.id}/cancel`).send({ reason: ' ' });
    expect(blank.status).toBe(400);
    const extra = await coordinatorSession.post(`/api/venue-bookings/${target.id}/cancel`).send({ reason: 'x', status: 'APPROVED' });
    expect(extra.status).toBe(400);
    const done = await coordinatorSession.post(`/api/venue-bookings/${target.id}/cancel`).send({ reason: 'Not needed' });
    expect(done.status).toBe(200);
    expect(done.body.booking).toMatchObject({ status: 'CANCELLED', cancellationReason: 'Not needed', replacedByBookingIds: [] });
    const again = await coordinatorSession.post(`/api/venue-bookings/${target.id}/cancel`).send({ reason: 'Again' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('BOOKING_ALREADY_CANCELLED');
    expect((await coordinatorSession.post(`/api/venue-bookings/${randomUUID()}/cancel`).send({ reason: 'x' })).status).toBe(404);
  });
});
