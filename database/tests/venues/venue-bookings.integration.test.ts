import { randomUUID } from 'node:crypto';
import express from 'express';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import {
  cancelVenueBooking, decideVenueBooking, listBookingQueue, listEventBookings, requestVenueBooking,
} from '../../../backend/src/modules/venues/booking-service.js';
import { createVenueBookingsRouter } from '../../../backend/src/modules/venues/index.js';
import type { VenueActor, VenueBookingRecord } from '../../../backend/src/modules/venues/types.js';
import { migrate } from '../../migrate.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
scopedUrl.searchParams.set('application_name', schema);
const pool = new pg.Pool({
  connectionString: scopedUrl.toString(), max: 6,
  connectionTimeoutMillis: 5_000, statement_timeout: 5_000,
});

const staff: VenueActor = { id: randomUUID(), role: 'VENUE_STAFF' };
const otherStaff: VenueActor = { id: randomUUID(), role: 'VENUE_STAFF' };
const organiser: VenueActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const otherOrganiser: VenueActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const coordinator: VenueActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const otherCoordinator: VenueActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };

async function createVenue(overrides: { capacity?: number; isActive?: boolean; layouts?: string[] } = {}) {
  const id = randomUUID();
  await pool.query(`
    INSERT INTO venues (id, name, capacity, layouts, opens_at, closes_at, is_active)
    VALUES ($1, $2, $3, $4::text[], '08:00', '22:00', $5)
  `, [id, `Venue ${id}`, overrides.capacity ?? 100, overrides.layouts ?? ['Theatre'], overrides.isActive ?? true]);
  return id;
}

async function createEvent(overrides: {
  status?: EventStatus; startsAt?: string | null; endsAt?: string | null; attendance?: number; name?: string;
} = {}) {
  const id = randomUUID();
  await pool.query(`
    INSERT INTO event_requests (id, organiser_id, coordinator_id, status, name, starts_at, ends_at, expected_attendance)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    id, organiser.id, coordinator.id, overrides.status ?? 'APPROVED', overrides.name ?? 'Career fair',
    overrides.startsAt === undefined ? '2026-12-01T02:00:00Z' : overrides.startsAt,
    overrides.endsAt === undefined ? '2026-12-01T04:00:00Z' : overrides.endsAt,
    overrides.attendance ?? 80,
  ]);
  return id;
}

const booking = (eventRequestId: string, venueId: string, extra: Record<string, string | null> = {}) => ({
  eventRequestId, venueId, startsAt: null, endsAt: null, layout: null, notes: null, ...extra,
});

async function notifications(eventRequestId: string) {
  const result = await pool.query<{ recipient_id: string; type: string }>(
    'SELECT recipient_id, type FROM notifications WHERE event_request_id = $1 ORDER BY type, recipient_id',
    [eventRequestId],
  );
  return result.rows.map((row) => `${row.type}:${row.recipient_id}`);
}

const bookingCount = async (eventRequestId: string) =>
  (await pool.query('SELECT count(*)::int AS count FROM venue_bookings WHERE event_request_id = $1', [eventRequestId]))
    .rows[0].count as number;

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  for (const actor of [staff, otherStaff, organiser, otherOrganiser, coordinator, otherCoordinator]) {
    await pool.query(
      'INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, $3, $4)',
      [actor.id, `${actor.id}@example.test`, `Name ${actor.role}`, actor.role],
    );
  }
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

describe('CF-12 venue booking requests', () => {
  it('records a pending booking on the event interval and notifies every venue staff member', async () => {
    const [eventRequestId, venueId] = [await createEvent(), await createVenue()];
    const saved = await requestVenueBooking(pool, organiser, booking(eventRequestId, venueId, { layout: 'theatre', notes: 'Doors 9am' }));
    expect(saved).toMatchObject({
      eventRequestId, venueId, requestedBy: organiser.id, status: 'PENDING', layout: 'theatre', notes: 'Doors 9am',
      startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T04:00:00.000Z',
      decidedBy: null, decidedAt: null, suitability: { suitable: true }, warnings: [],
    });
    expect(await notifications(eventRequestId)).toEqual(
      [staff.id, otherStaff.id].sort().map((id) => `VENUE_BOOKING_REQUESTED:${id}`),
    );
  });

  it('still records an unsuitable request and returns the failed checks as warnings (Q-08)', async () => {
    const [eventRequestId, venueId] = [await createEvent({ attendance: 500 }), await createVenue({ capacity: 50 })];
    const saved = await requestVenueBooking(pool, coordinator, booking(eventRequestId, venueId, {
      startsAt: '2026-12-01T13:00:00.000Z', endsAt: '2026-12-01T15:00:00.000Z',
    }));
    expect(saved.status).toBe('PENDING');
    expect(saved.requestedBy).toBe(coordinator.id);
    expect(saved.suitability.suitable).toBe(false);
    expect(saved.warnings.map((check) => check.code)).toEqual(['CAPACITY', 'OPERATING_HOURS']);
  });

  it.each([
    ['an unrelated organiser', otherOrganiser], ['an unassigned coordinator', otherCoordinator],
    ['venue staff', staff],
  ] as const)('masks the event from %s and records nothing', async (_name, actor) => {
    const [eventRequestId, venueId] = [await createEvent(), await createVenue()];
    await expect(requestVenueBooking(pool, actor, booking(eventRequestId, venueId)))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(await bookingCount(eventRequestId)).toBe(0);
    expect(await notifications(eventRequestId)).toEqual([]);
  });

  it.each(['DRAFT', 'SUBMITTED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const)(
    'refuses a %s event', async (status) => {
      const [eventRequestId, venueId] = [await createEvent({ status }), await createVenue()];
      await expect(requestVenueBooking(pool, organiser, booking(eventRequestId, venueId)))
        .rejects.toMatchObject({ code: 'EVENT_NOT_BOOKABLE' });
      expect(await bookingCount(eventRequestId)).toBe(0);
    },
  );

  it('accepts a CONFIRMED event and refuses inactive or missing venues and unknown layouts', async () => {
    const eventRequestId = await createEvent({ status: 'CONFIRMED' });
    await expect(requestVenueBooking(pool, organiser, booking(eventRequestId, await createVenue({ isActive: false }))))
      .rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
    await expect(requestVenueBooking(pool, organiser, booking(eventRequestId, randomUUID())))
      .rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
    const venueId = await createVenue({ layouts: ['Theatre', 'Banquet'] });
    await expect(requestVenueBooking(pool, organiser, booking(eventRequestId, venueId, { layout: 'Cabaret' })))
      .rejects.toMatchObject({ code: 'INVALID_VENUE_BOOKING_INPUT' });
    expect(await bookingCount(eventRequestId)).toBe(0);
    expect((await requestVenueBooking(pool, organiser, booking(eventRequestId, venueId))).status).toBe('PENDING');
  });

  it('needs an explicit period when the event has no schedule', async () => {
    const [eventRequestId, venueId] = [await createEvent({ startsAt: null, endsAt: null }), await createVenue()];
    await expect(requestVenueBooking(pool, organiser, booking(eventRequestId, venueId)))
      .rejects.toMatchObject({ code: 'EVENT_NOT_BOOKABLE' });
    const saved = await requestVenueBooking(pool, organiser, booking(eventRequestId, venueId, {
      startsAt: '2026-12-02T02:00:00.000Z', endsAt: '2026-12-02T03:00:00.000Z',
    }));
    expect(saved.startsAt).toBe('2026-12-02T02:00:00.000Z');
  });

  it('refuses a duplicate active booking, including two simultaneous requests, but allows a retry after cancelling', async () => {
    const [eventRequestId, venueId] = [await createEvent(), await createVenue()];
    const results = await Promise.allSettled([
      requestVenueBooking(pool, organiser, booking(eventRequestId, venueId)),
      requestVenueBooking(pool, coordinator, booking(eventRequestId, venueId)),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected'))
      .toMatchObject({ reason: { code: 'VENUE_BOOKING_DUPLICATE' } });
    expect(await bookingCount(eventRequestId)).toBe(1);

    // A different venue, or a non-overlapping period, is a separate booking (Q-06 provisional).
    await requestVenueBooking(pool, organiser, booking(eventRequestId, await createVenue()));
    await requestVenueBooking(pool, organiser, booking(eventRequestId, venueId, {
      startsAt: '2026-12-01T04:00:00.000Z', endsAt: '2026-12-01T05:00:00.000Z',
    }));

    const first = results.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<VenueBookingRecord>;
    await cancelVenueBooking(pool, organiser, first.value.id);
    expect((await requestVenueBooking(pool, organiser, booking(eventRequestId, venueId))).status).toBe('PENDING');
  });

  it('lists an event\'s bookings for its owner and coordinator only', async () => {
    const [eventRequestId, venueId] = [await createEvent(), await createVenue()];
    const saved = await requestVenueBooking(pool, organiser, booking(eventRequestId, venueId));
    for (const actor of [organiser, coordinator]) {
      const items = await listEventBookings(pool, actor, eventRequestId);
      expect(items).toEqual([expect.objectContaining({ id: saved.id, venueName: `Venue ${venueId}`, status: 'PENDING' })]);
    }
    for (const actor of [otherOrganiser, otherCoordinator, staff]) {
      await expect(listEventBookings(pool, actor, eventRequestId))
        .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
  });

  it('lets the requester or current arranger cancel, masks strangers and frees the slot', async () => {
    const [eventRequestId, venueId] = [await createEvent(), await createVenue()];
    const saved = await requestVenueBooking(pool, organiser, booking(eventRequestId, venueId));
    await pool.query("UPDATE venue_bookings SET updated_at = '2026-01-01T00:00:00Z' WHERE id = $1", [saved.id]);
    for (const actor of [otherOrganiser, otherCoordinator]) {
      await expect(cancelVenueBooking(pool, actor, saved.id)).rejects.toMatchObject({ code: 'VENUE_BOOKING_NOT_FOUND' });
    }
    await expect(cancelVenueBooking(pool, organiser, randomUUID())).rejects.toMatchObject({ code: 'VENUE_BOOKING_NOT_FOUND' });

    await decideVenueBooking(pool, staff, saved.id, { decision: 'APPROVED', reason: null });
    const cancelled = await cancelVenueBooking(pool, coordinator, saved.id);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
    // The coordinator acted, so the organiser and venue staff hear about the released approval.
    expect((await notifications(eventRequestId)).filter((entry) => entry.startsWith('VENUE_BOOKING_CANCELLED'))).toEqual(
      [organiser.id, staff.id, otherStaff.id].sort().map((id) => `VENUE_BOOKING_CANCELLED:${id}`),
    );
    await expect(cancelVenueBooking(pool, organiser, saved.id))
      .rejects.toMatchObject({ code: 'VENUE_BOOKING_NOT_CANCELLABLE' });

    const next = await requestVenueBooking(pool, organiser, booking(await createEvent(), venueId));
    expect((await decideVenueBooking(pool, staff, next.id, { decision: 'APPROVED', reason: null })).status).toBe('APPROVED');
  });
});

describe('CF-13 venue booking decisions', () => {
  it.each(['APPROVED', 'REJECTED'] as const)('records %s with the deciding staff member and notifies the requester and organiser', async (decision) => {
    const [eventRequestId, venueId] = [await createEvent(), await createVenue()];
    const saved = await requestVenueBooking(pool, coordinator, booking(eventRequestId, venueId));
    const reason = decision === 'REJECTED' ? 'Hall under renovation' : null;
    const decided = await decideVenueBooking(pool, staff, saved.id, { decision, reason });
    expect(decided).toMatchObject({ id: saved.id, status: decision, decidedBy: staff.id, decisionReason: reason });
    expect(decided.decidedAt).toEqual(expect.any(String));
    expect((await notifications(eventRequestId)).filter((entry) => entry.startsWith(`VENUE_BOOKING_${decision}`))).toEqual(
      [coordinator.id, organiser.id].sort().map((id) => `VENUE_BOOKING_${decision}:${id}`),
    );
    const staffNotices = await pool.query(
      "SELECT 1 FROM notifications WHERE recipient_id = $1 AND type LIKE 'VENUE_BOOKING_' || $2", [staff.id, decision],
    );
    expect(staffNotices.rows).toEqual([]);
  });

  it('decides only pending bookings and only one of two competing decisions wins', async () => {
    const [eventRequestId, venueId] = [await createEvent(), await createVenue()];
    const saved = await requestVenueBooking(pool, organiser, booking(eventRequestId, venueId));
    const results = await Promise.allSettled([
      decideVenueBooking(pool, staff, saved.id, { decision: 'APPROVED', reason: null }),
      decideVenueBooking(pool, otherStaff, saved.id, { decision: 'REJECTED', reason: 'No' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected'))
      .toMatchObject({ reason: { code: 'VENUE_BOOKING_NOT_PENDING' } });
    await expect(decideVenueBooking(pool, staff, randomUUID(), { decision: 'APPROVED', reason: null }))
      .rejects.toMatchObject({ code: 'VENUE_BOOKING_NOT_FOUND' });
  });

  it('will not approve a booking whose event is no longer approved, but can reject it', async () => {
    const [eventRequestId, venueId] = [await createEvent(), await createVenue()];
    const saved = await requestVenueBooking(pool, organiser, booking(eventRequestId, venueId));
    await pool.query("UPDATE event_requests SET status = 'CANCELLED' WHERE id = $1", [eventRequestId]);
    await expect(decideVenueBooking(pool, staff, saved.id, { decision: 'APPROVED', reason: null }))
      .rejects.toMatchObject({ code: 'EVENT_NOT_BOOKABLE' });
    expect((await decideVenueBooking(pool, staff, saved.id, { decision: 'REJECTED', reason: 'Event cancelled' })).status)
      .toBe('REJECTED');
  });
});

describe('CF-14 venue booking conflicts', () => {
  it('shows staff the suitability warnings and overlapping bookings before deciding', async () => {
    const venueId = await createVenue({ capacity: 60 });
    const first = await requestVenueBooking(pool, organiser, booking(await createEvent({ name: 'Alpha' }), venueId));
    const second = await requestVenueBooking(pool, organiser, booking(await createEvent({ name: 'Beta', attendance: 90 }), venueId, {
      startsAt: '2026-12-01T03:00:00.000Z', endsAt: '2026-12-01T05:00:00.000Z',
    }));
    const adjacent = await requestVenueBooking(pool, organiser, booking(await createEvent({ name: 'Gamma' }), venueId, {
      startsAt: '2026-12-01T05:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
    }));

    let queue = (await listBookingQueue(pool, 'PENDING')).filter((item) => item.venueId === venueId);
    expect(queue.map((item) => item.eventName)).toEqual(['Alpha', 'Beta', 'Gamma']);
    const beta = queue.find((item) => item.id === second.id)!;
    expect(beta).toMatchObject({ organiserName: 'Name EVENT_ORGANISER', expectedAttendance: 90 });
    expect(beta.conflicts).toEqual([{
      bookingId: first.id, status: 'PENDING', eventName: 'Alpha',
      startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T04:00:00.000Z',
    }]);
    expect(beta.suitability.checks.filter((check) => !check.passed).map((check) => check.code)).toEqual(['CAPACITY']);
    expect(queue.find((item) => item.id === adjacent.id)!.conflicts).toEqual([]);

    await decideVenueBooking(pool, staff, first.id, { decision: 'APPROVED', reason: null });
    queue = (await listBookingQueue(pool, 'PENDING')).filter((item) => item.venueId === venueId);
    const afterApproval = queue.find((item) => item.id === second.id)!;
    expect(afterApproval.conflicts[0]).toMatchObject({ bookingId: first.id, status: 'APPROVED' });
    expect(afterApproval.suitability.checks.find((check) => check.code === 'AVAILABILITY')?.passed).toBe(false);
    expect((await listBookingQueue(pool, 'APPROVED')).map((item) => item.id)).toContain(first.id);
  });

  it('returns VENUE_BOOKING_CONFLICT with the approved interval and leaves the loser pending', async () => {
    const venueId = await createVenue();
    const first = await requestVenueBooking(pool, organiser, booking(await createEvent(), venueId));
    const secondEvent = await createEvent();
    const second = await requestVenueBooking(pool, organiser, booking(secondEvent, venueId, {
      startsAt: '2026-12-01T03:30:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
    }));
    await decideVenueBooking(pool, staff, first.id, { decision: 'APPROVED', reason: null });
    await expect(decideVenueBooking(pool, staff, second.id, { decision: 'APPROVED', reason: null })).rejects.toMatchObject({
      code: 'VENUE_BOOKING_CONFLICT',
      details: { conflicts: [{ kind: 'BOOKING', startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T04:00:00.000Z' }] },
    });
    const stored = await pool.query('SELECT status, decided_by FROM venue_bookings WHERE id = $1', [second.id]);
    expect(stored.rows[0]).toEqual({ status: 'PENDING', decided_by: null });
    expect((await notifications(secondEvent)).some((entry) => entry.startsWith('VENUE_BOOKING_APPROVED'))).toBe(false);

    // Half-open intervals: a back-to-back booking is not a conflict.
    const adjacent = await requestVenueBooking(pool, organiser, booking(await createEvent(), venueId, {
      startsAt: '2026-12-01T04:00:00.000Z', endsAt: '2026-12-01T05:00:00.000Z',
    }));
    expect((await decideVenueBooking(pool, staff, adjacent.id, { decision: 'APPROVED', reason: null })).status).toBe('APPROVED');
  });

  it('returns VENUE_UNAVAILABLE when the period is blocked', async () => {
    const venueId = await createVenue();
    const saved = await requestVenueBooking(pool, organiser, booking(await createEvent(), venueId));
    await pool.query(`
      INSERT INTO venue_unavailability (venue_id, starts_at, ends_at, reason)
      VALUES ($1, '2026-12-01T00:00:00Z', '2026-12-01T03:00:00Z', 'Maintenance')
    `, [venueId]);
    await expect(decideVenueBooking(pool, staff, saved.id, { decision: 'APPROVED', reason: null })).rejects.toMatchObject({
      code: 'VENUE_UNAVAILABLE',
      details: { conflicts: [{ kind: 'BLOCKED', startsAt: '2026-12-01T00:00:00.000Z', endsAt: '2026-12-01T03:00:00.000Z' }] },
    });
  });

  it('approves exactly one of two simultaneous approvals of overlapping bookings', async () => {
    const venueId = await createVenue();
    const first = await requestVenueBooking(pool, organiser, booking(await createEvent(), venueId));
    const second = await requestVenueBooking(pool, organiser, booking(await createEvent(), venueId, {
      startsAt: '2026-12-01T03:00:00.000Z', endsAt: '2026-12-01T05:00:00.000Z',
    }));

    const blocker = await pool.connect();
    let pending: Promise<PromiseSettledResult<VenueBookingRecord>[]> | undefined;
    let results: PromiseSettledResult<VenueBookingRecord>[] = [];
    try {
      await blocker.query('BEGIN');
      // The trigger locks the venue row, so holding it parks both approvals at the conflict check.
      await blocker.query('SELECT id FROM venues WHERE id = $1 FOR UPDATE', [venueId]);
      pending = Promise.allSettled([
        decideVenueBooking(pool, staff, first.id, { decision: 'APPROVED', reason: null }),
        decideVenueBooking(pool, otherStaff, second.id, { decision: 'APPROVED', reason: null }),
      ]);
      await expect.poll(async () => {
        const waiting = await admin.query<{ count: number }>(`
          SELECT count(*)::integer AS count FROM pg_stat_activity
          WHERE application_name = $1 AND wait_event_type = 'Lock'
        `, [schema]);
        return waiting.rows[0]!.count;
      }, { timeout: 3_000 }).toBe(2);
    } finally {
      try {
        await blocker.query('ROLLBACK');
      } finally {
        blocker.release(true);
        if (pending) results = await pending;
      }
    }

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected'))
      .toMatchObject({ reason: { code: 'VENUE_BOOKING_CONFLICT' } });
    const stored = await pool.query<{ status: string }>(
      'SELECT status FROM venue_bookings WHERE id = ANY($1::uuid[]) ORDER BY status', [[first.id, second.id]],
    );
    expect(stored.rows.map((row) => row.status)).toEqual(['APPROVED', 'PENDING']);
  });
});

describe('venue booking routes against PostgreSQL', () => {
  function appFor(actor: VenueActor | null) {
    const app = express();
    app.use(express.json());
    app.use('/api/venue-bookings', createVenueBookingsRouter({ pool, authenticate: async () => actor }));
    return app;
  }

  it('runs request, queue, conflicting decision and cancel through HTTP', async () => {
    const venueId = await createVenue();
    const [firstEvent, secondEvent] = [await createEvent(), await createEvent()];
    const first = await request(appFor(organiser)).post('/api/venue-bookings').send({ eventRequestId: firstEvent, venueId });
    const second = await request(appFor(organiser)).post('/api/venue-bookings').send({ eventRequestId: secondEvent, venueId });
    expect([first.status, second.status]).toEqual([201, 201]);
    expect(first.body.warnings).toEqual([]);

    const hidden = await request(appFor(otherOrganiser)).post('/api/venue-bookings').send({ eventRequestId: firstEvent, venueId });
    expect(hidden.status).toBe(404);

    const queue = await request(appFor(staff)).get('/api/venue-bookings?status=PENDING');
    expect(queue.status).toBe(200);
    const queued = queue.body.items.find((item: { id: string }) => item.id === second.body.id);
    expect(queued.conflicts).toEqual([expect.objectContaining({ bookingId: first.body.id })]);

    const approved = await request(appFor(staff)).post(`/api/venue-bookings/${first.body.id}/decision`).send({ decision: 'APPROVED' });
    expect(approved.status).toBe(200);
    const conflict = await request(appFor(staff)).post(`/api/venue-bookings/${second.body.id}/decision`).send({ decision: 'APPROVED' });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('VENUE_BOOKING_CONFLICT');
    expect(conflict.body.error.conflicts).toHaveLength(1);

    const listed = await request(appFor(organiser)).get(`/api/venue-bookings?eventRequestId=${firstEvent}`);
    expect(listed.body.items).toEqual([expect.objectContaining({ id: first.body.id, status: 'APPROVED' })]);
    const cancelled = await request(appFor(organiser)).post(`/api/venue-bookings/${first.body.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('CANCELLED');
  });
});
