import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import type { WorkflowActor, WorkflowDependencies } from '../../../backend/src/modules/events/workflow-support.js';
import {
  cancelVenueHold, createVenueBooking, decideVenueBooking, expireVenueHolds, getVenueBooking,
  listVenueBookings, placeVenueHold,
} from '../../../backend/src/modules/venues/booking-service.js';
import { listVenueAvailability } from '../../../backend/src/modules/venues/availability.js';
import { searchVenues, parseVenueSearchQuery } from '../../../backend/src/modules/venues/venue-search.js';
import {
  checkVenueSuitability, getVenueSuitabilityContext,
} from '../../../backend/src/modules/venues/suitability-service.js';
import { createVenueBlock, deleteVenueBlock } from '../../../backend/src/modules/venues/block-service.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let staff: WorkflowActor;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  staff = await fixture.createUser('VENUE_STAFF');
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
});
afterAll(async () => { await fixture?.destroy(); });

const DAY = 86_400_000;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
// The booked period is a month ahead so deadlines can sit between now and its start.
const startsAt = new Date(Math.floor((Date.now() + 30 * DAY) / 3_600_000) * 3_600_000).toISOString();
const endsAt = new Date(Date.parse(startsAt) + 4 * 3_600_000).toISOString();
const tomorrow = () => at(DAY);

async function createVenue(options: { capacity?: number; opensAt?: string; closesAt?: string } = {}) {
  const id = randomUUID();
  await fixture.pool.query('INSERT INTO venues(id, name, capacity, opens_at, closes_at) VALUES($1,$2,$3,$4,$5)',
    [id, `Hall ${id.slice(0, 6)}`, options.capacity ?? 100, options.opensAt ?? null, options.closesAt ?? null]);
  return id;
}

async function pending(options: {
  venueId?: string; eventStatus?: EventStatus; coordinatorId?: string | null;
  startsAt?: string; endsAt?: string; name?: string;
} = {}) {
  const venueId = options.venueId ?? await createVenue();
  const eventRequestId = await fixture.createEvent({
    organiserId: organiser.id,
    coordinatorId: options.coordinatorId === undefined ? coordinator.id : options.coordinatorId,
    status: options.eventStatus ?? 'APPROVED', name: options.name ?? 'Open day',
    startsAt: options.startsAt ?? startsAt, endsAt: options.endsAt ?? endsAt,
  });
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO venue_bookings
    (id, event_request_id, venue_id, requested_by, starts_at, ends_at) VALUES($1,$2,$3,$4,$5,$6)`,
  [id, eventRequestId, venueId, coordinator.id, options.startsAt ?? startsAt, options.endsAt ?? endsAt]);
  return { id, eventRequestId, venueId };
}

const row = async (id: string) =>
  (await fixture.pool.query('SELECT * FROM venue_bookings WHERE id = $1', [id])).rows[0];
const hold = (id: string, expiresAt: unknown = tomorrow(), actor = staff) =>
  placeVenueHold(fixture.dependencies, { bookingId: id, actor, input: { expiresAt } });
const decide = (id: string, decision: 'APPROVED' | 'REJECTED', actor = staff) =>
  decideVenueBooking(fixture.dependencies, { bookingId: id, actor, input: { decision } });
const cancel = (id: string, reason: unknown) =>
  cancelVenueHold(fixture.dependencies, { bookingId: id, actor: staff, input: { reason } });
/** Move a deadline into the past without waiting, as if time passed (bypasses the API checks). */
const lapse = (id: string, secondsAgo = 1) => fixture.pool.query(
  `UPDATE venue_bookings SET hold_expires_at = clock_timestamp() - make_interval(secs => $2) WHERE id = $1`,
  [id, secondsAgo]);

describe('KAN-83 placing a venue hold (AC1, AC2, AC3, AC7)', () => {
  it('KAN-83-AC1/AC2/AC7 holds one pending request with its creator, time, deadline and a Singapore-time notice', async () => {
    // Fixed future instants so the Singapore-time text can be asserted exactly.
    const target = await pending({ name: 'Careers fair',
      startsAt: '2027-03-01T02:00:00.000Z', endsAt: '2027-03-01T06:00:00.000Z' });
    const deadline = '2027-02-05T10:30:00+08:00';
    const before = await fixture.eventRow(target.eventRequestId);
    const held = await hold(target.id, deadline);

    expect(held).toMatchObject({
      id: target.id, status: 'HELD', holdExpiresAt: '2027-02-05T02:30:00.000Z', heldBy: staff.id,
      eventRequestId: target.eventRequestId, venueId: target.venueId,
    });
    expect(Date.parse(held.heldAt!)).toBeLessThanOrEqual(Date.now());
    const saved = await row(target.id);
    expect(saved).toMatchObject({ status: 'HELD', held_by: staff.id, decided_by: null, decided_at: null });
    // The event itself is untouched; a hold never approves anything.
    expect(await fixture.eventRow(target.eventRequestId)).toEqual(before);
    expect(await fixture.notifications(target.eventRequestId)).toEqual([{
      recipient_id: coordinator.id, type: 'VENUE_HOLD_PLACED',
      message: expect.stringContaining('until 05 Feb 2027 10:30 (Singapore time)'),
    }]);
    expect((await fixture.notifications(target.eventRequestId))[0]!.message).toContain('Careers fair');
  });

  it('KAN-83-AC2 leaves ordinary pending requests unheld and lists live holds separately for Venue Staff', async () => {
    const untouched = await pending();
    const held = await pending();
    await hold(held.id);
    expect((await row(untouched.id)).status).toBe('PENDING');
    const queue = await listVenueBookings(fixture.dependencies, { actor: staff });
    expect(queue.find((item) => item.id === untouched.id)?.status).toBe('PENDING');
    expect(queue.find((item) => item.id === held.id)).toMatchObject({ status: 'HELD', holdExpiresAt: expect.any(String) });
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['not a date', 'tomorrow'],
    ['without a zone', '2026-11-05T10:30:00'],
  ])('KAN-83-AC1 refuses a %s deadline without creating a hold', async (_label, expiresAt) => {
    const target = await pending();
    const input = expiresAt === undefined ? {} : { expiresAt };
    await expect(placeVenueHold(fixture.dependencies, { bookingId: target.id, actor: staff, input }))
      .rejects.toMatchObject({ kind: 'INVALID_INPUT', code: 'INVALID_HOLD_EXPIRY' });
    expect((await row(target.id)).status).toBe('PENDING');
    expect(await fixture.notifications(target.eventRequestId)).toEqual([]);
  });

  it.each([
    ['in the past', () => at(-60_000), 'The hold deadline must be in the future.'],
    ['after the booked period starts', () => new Date(Date.parse(startsAt) + 1000).toISOString(),
      'The hold deadline must be no later than the start of the booked period.'],
  ])('KAN-83-AC1 refuses a deadline %s using the database clock', async (_label, deadline, message) => {
    const target = await pending();
    await expect(hold(target.id, deadline())).rejects.toMatchObject({ code: 'INVALID_HOLD_EXPIRY', message });
    expect(await row(target.id)).toMatchObject({ status: 'PENDING', hold_expires_at: null, held_by: null });
  });

  it('KAN-83-AC1 accepts a deadline exactly at the booked start', async () => {
    const target = await pending();
    await expect(hold(target.id, startsAt)).resolves.toMatchObject({ status: 'HELD', holdExpiresAt: startsAt });
  });

  it.each(['EVENT_COORDINATOR', 'EVENT_ORGANISER', 'TECHNICAL_SUPPORT_STAFF'] as const)(
    'KAN-83-AC1/AC12 refuses a %s', async (role) => {
      const target = await pending();
      const actor = role === 'EVENT_COORDINATOR' ? coordinator : { id: randomUUID(), role };
      await expect(hold(target.id, tomorrow(), actor)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
      expect((await row(target.id)).status).toBe('PENDING');
    },
  );

  it.each([
    ['an approved booking', async (venueId: string) => {
      const other = await pending({ venueId });
      await decide(other.id, 'APPROVED');
    }, 'VENUE_BOOKING_CONFLICT'],
    ['another live hold', async (venueId: string) => {
      const other = await pending({ venueId });
      await hold(other.id);
    }, 'VENUE_HELD'],
    ['an operational block', async (venueId: string) => {
      await fixture.pool.query(`INSERT INTO venue_unavailability (venue_id, starts_at, ends_at, reason, created_by)
        VALUES ($1, $2, $3, 'Repairs', $4)`, [venueId, startsAt, endsAt, staff.id]);
    }, 'VENUE_UNAVAILABLE'],
  ])('KAN-83-AC3 refuses a hold that overlaps %s and writes nothing', async (_label, arrange, code) => {
    const venueId = await createVenue();
    await arrange(venueId);
    const target = await pending({ venueId });
    await expect(hold(target.id)).rejects.toMatchObject({ kind: 'CONFLICT', code });
    expect(await row(target.id)).toMatchObject({ status: 'PENDING', hold_expires_at: null });
    expect(await fixture.notifications(target.eventRequestId)).toEqual([]);
  });

  describe.each(['APPROVED', 'HELD'] as const)('KAN-83-AC3 buffered hold placement against %s', (status) => {
    it.each([
      ['preceding turnaround touches existing setup', 'before', 0, true],
      ['preceding turnaround overlaps existing setup by one minute', 'before', 1, false],
      ['following setup touches existing turnaround', 'after', 0, true],
      ['following setup overlaps existing turnaround by one minute', 'after', -1, false],
    ] as const)('%s', async (_label, side, offsetMinutes, allowed) => {
      const minute = 60_000;
      const venueId = await createVenue();
      await fixture.pool.query('UPDATE venues SET setup_minutes = 60, turnaround_minutes = 30 WHERE id = $1', [venueId]);
      const existing = await pending({ venueId });
      if (status === 'HELD') await hold(existing.id);
      else await decide(existing.id, 'APPROVED');

      // Every event interval is disjoint; only the setup/turnaround boundary can clash.
      const candidateEnd = Date.parse(startsAt) - 90 * minute + offsetMinutes * minute;
      const candidateStart = Date.parse(endsAt) + 90 * minute + offsetMinutes * minute;
      const candidate = await pending({ venueId,
        startsAt: new Date(side === 'before' ? candidateEnd - 4 * 60 * minute : candidateStart).toISOString(),
        endsAt: new Date(side === 'before' ? candidateEnd : candidateStart + 4 * 60 * minute).toISOString(),
      });
      if (allowed) {
        await expect(hold(candidate.id)).resolves.toMatchObject({ status: 'HELD' });
        expect((await fixture.notifications(candidate.eventRequestId)).filter((notice) => notice.type === 'VENUE_HOLD_PLACED'))
          .toHaveLength(1);
      } else {
        await expect(hold(candidate.id)).rejects.toMatchObject({
          code: status === 'HELD' ? 'VENUE_HELD' : 'VENUE_BOOKING_CONFLICT',
        });
        expect(await row(candidate.id)).toMatchObject({ status: 'PENDING', hold_expires_at: null });
        expect(await fixture.notifications(candidate.eventRequestId)).toEqual([]);
      }
      expect((await row(existing.id)).status).toBe(status);
    });
  });

  it('KAN-83-AC3 ignores an overlapping hold that has already lapsed', async () => {
    const venueId = await createVenue();
    const stale = await pending({ venueId });
    await hold(stale.id);
    await lapse(stale.id);
    const target = await pending({ venueId });
    await expect(hold(target.id)).resolves.toMatchObject({ status: 'HELD' });
  });

  it.each([
    ['the event is no longer approved', { eventStatus: 'CANCELLED' as EventStatus }, 'EVENT_NOT_APPROVED'],
    ['the venue is too small', { capacity: 10 }, 'VENUE_UNSUITABLE'],
    ['the period is outside opening hours', { opensAt: '23:00', closesAt: '23:30' }, 'OUTSIDE_VENUE_HOURS'],
  ])('KAN-83-AC3 refuses a hold when %s', async (_label, options, code) => {
    const venueId = await createVenue(options as { capacity?: number; opensAt?: string; closesAt?: string });
    const target = await pending({ venueId, ...('eventStatus' in options ? { eventStatus: options.eventStatus } : {}) });
    await expect(hold(target.id)).rejects.toMatchObject({ kind: 'CONFLICT', code });
    expect((await row(target.id)).status).toBe('PENDING');
  });

  it('KAN-83-AC3 refuses a hold on an inactive venue', async () => {
    const target = await pending();
    await fixture.pool.query('UPDATE venues SET is_active = false WHERE id = $1', [target.venueId]);
    await expect(hold(target.id)).rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
  });

  it.each([
    ['APPROVED', 'BOOKING_NOT_PENDING'],
    ['REJECTED', 'BOOKING_NOT_PENDING'],
  ] as const)('KAN-83-AC1 only holds a pending request, not a %s one', async (decision, code) => {
    const target = await pending();
    await decide(target.id, decision);
    await expect(hold(target.id)).rejects.toMatchObject({ code });
  });

  it('KAN-83-AC1 does not place a second hold on a request that already has a live hold', async () => {
    const target = await pending();
    await hold(target.id);
    await expect(hold(target.id)).rejects.toMatchObject({ code: 'BOOKING_ALREADY_HELD' });
    expect(await fixture.notifications(target.eventRequestId)).toHaveLength(1);
  });

  it('KAN-83-AC7 writes no notice when the event has no assigned coordinator', async () => {
    const target = await pending({ coordinatorId: null });
    await hold(target.id);
    expect(await fixture.notifications(target.eventRequestId)).toEqual([]);
  });

  it('KAN-83-AC3/AC9 lets only one of two competing holds for the same period succeed', async () => {
    const venueId = await createVenue();
    const first = await pending({ venueId });
    const second = await pending({ venueId });
    const results = await Promise.allSettled([hold(first.id), hold(second.id)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: expect.stringMatching(/^(VENUE_HELD|VENUE_BOOKING_CONFLICT)$/) }),
    });
    const statuses = [(await row(first.id)).status, (await row(second.id)).status].sort();
    expect(statuses).toEqual(['HELD', 'PENDING']);
  });
});

describe('KAN-83 a live hold occupies the venue everywhere until its deadline (AC4)', () => {
  it('KAN-83-AC4 blocks the calendar, search, suitability, new requests and other approvals, then frees them at the deadline', async () => {
    const venueId = await createVenue();
    const target = await pending({ venueId });
    await hold(target.id, tomorrow());
    const window = { from: at(25 * DAY), to: at(35 * DAY) };

    const calendar = async () => (await listVenueAvailability(fixture.dependencies, coordinator, window))
      .find((venue) => venue.id === venueId)!.unavailable;
    expect(await calendar()).toEqual([expect.objectContaining({
      id: target.id, kind: 'BOOKING', heldUntil: (await row(target.id)).hold_expires_at.toISOString(),
    })]);

    const searchIds = async () => (await searchVenues(fixture.dependencies, coordinator,
      parseVenueSearchQuery({ startsAt, endsAt }))).map((venue) => venue.id);
    expect(await searchIds()).not.toContain(venueId);

    const suitability = async () => {
      const context = await getVenueSuitabilityContext(fixture.dependencies,
        { actor: coordinator, eventId: target.eventRequestId });
      const result = await checkVenueSuitability(fixture.dependencies, { actor: coordinator, eventId: target.eventRequestId,
        input: { venueId, requirementsVersion: context.requirementsVersion, facilities: [], accessibility: [],
          layout: null, wheelchairRequired: false, requirementsConfirmed: true, unresolvedRequirements: null } });
      return result.checks.find((check) => check.key === 'availability');
    };
    expect(await suitability()).toMatchObject({ status: 'FAIL', message: expect.stringContaining('live venue hold') });

    const otherEvent = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED' });
    await expect(createVenueBooking(fixture.dependencies, { eventRequestId: otherEvent, actor: coordinator,
      input: { venueId, startsAt, endsAt } })).rejects.toMatchObject({ code: 'VENUE_HELD' });

    const rival = await pending({ venueId });
    await expect(decide(rival.id, 'APPROVED')).rejects.toMatchObject({ code: 'VENUE_HELD' });

    // At the deadline the hold stops occupying the venue before any cleanup job runs.
    await lapse(target.id);
    expect((await row(target.id)).status).toBe('HELD');
    expect(await calendar()).toEqual([]);
    expect(await searchIds()).toContain(venueId);
    expect((await suitability())?.status).toBe('PASS');
    await expect(createVenueBooking(fixture.dependencies, { eventRequestId: otherEvent, actor: coordinator,
      input: { venueId, startsAt, endsAt } })).resolves.toMatchObject({ status: 'PENDING' });
    await expect(decide(rival.id, 'APPROVED')).resolves.toMatchObject({ status: 'APPROVED' });
    // Readers already see the lapsed hold as EXPIRED.
    expect(await getVenueBooking(fixture.dependencies, { actor: staff, bookingId: target.id }))
      .toMatchObject({ status: 'EXPIRED' });
  });

  it('KAN-83-AC4 the database trigger refuses an approval that overlaps a live hold even without the app check', async () => {
    const venueId = await createVenue();
    const target = await pending({ venueId });
    await hold(target.id);
    const rival = await pending({ venueId });
    await expect(fixture.pool.query(`UPDATE venue_bookings SET status = 'APPROVED', decided_by = $2,
      decided_at = now() WHERE id = $1`, [rival.id, staff.id])).rejects.toMatchObject({
      code: '23P01', constraint: 'venue_bookings_no_overlap',
    });
  });
});

describe('KAN-83 completing, expiring, rejecting and cancelling holds (AC5, AC6, AC8, AC9, AC10)', () => {
  it('KAN-83-AC5 approval before the deadline converts the hold into the approved booking once', async () => {
    const target = await pending();
    await hold(target.id);
    const approved = await decide(target.id, 'APPROVED');
    expect(approved).toMatchObject({ status: 'APPROVED', decidedBy: staff.id, holdExpiresAt: expect.any(String), heldBy: staff.id });
    const occupying = await fixture.pool.query(`SELECT count(*)::int AS n FROM venue_bookings
      WHERE venue_id = $1 AND (status = 'APPROVED' OR (status = 'HELD' AND hold_expires_at > now()))`, [target.venueId]);
    expect(occupying.rows[0].n).toBe(1);
    // An approved booking never expires.
    expect(await expireVenueHolds(fixture.pool)).toBeGreaterThanOrEqual(0);
    expect((await row(target.id)).status).toBe('APPROVED');
  });

  it('KAN-83-AC5 a hold can be rejected before its deadline and is released', async () => {
    const target = await pending();
    await hold(target.id);
    await expect(decide(target.id, 'REJECTED')).resolves.toMatchObject({ status: 'REJECTED', heldBy: staff.id });
  });

  it('KAN-83-AC6/AC9 refuses a late approval or rejection after the deadline; nothing is revived', async () => {
    const target = await pending();
    await hold(target.id);
    await lapse(target.id);
    for (const decision of ['APPROVED', 'REJECTED'] as const) {
      await expect(decide(target.id, decision)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'HOLD_EXPIRED' });
    }
    await expect(hold(target.id)).rejects.toMatchObject({ code: 'BOOKING_NOT_PENDING' });
    expect((await row(target.id)).status).toBe('HELD');
    expect(await fixture.eventRow(target.eventRequestId)).toMatchObject({ status: 'APPROVED' });
  });

  it('KAN-83-AC6/AC7/AC8 expiry marks overdue holds EXPIRED once, notifies once and is replay-safe', async () => {
    const first = await pending({ name: 'Expo' });
    const second = await pending();
    const live = await pending();
    await hold(first.id);
    await hold(second.id);
    await hold(live.id);
    // Catch-up after downtime: two holds overdue by different amounts are both processed.
    await lapse(first.id, 3600);
    await lapse(second.id, 1);

    const processed = await expireVenueHolds(fixture.pool);
    expect(processed).toBeGreaterThanOrEqual(2);
    for (const id of [first.id, second.id]) {
      expect(await row(id)).toMatchObject({ status: 'EXPIRED', expired_at: expect.any(Date), decided_by: null });
    }
    expect((await row(live.id)).status).toBe('HELD');
    expect((await fixture.notifications(first.eventRequestId)).map((note) => note.type))
      .toEqual(['VENUE_HOLD_EXPIRED', 'VENUE_HOLD_PLACED']);
    expect((await fixture.notifications(first.eventRequestId))[0]!.message)
      .toMatch(/^The hold on .+ for Expo expired at \d{2} \w{3} \d{4} \d{2}:\d{2} \(Singapore time\)\./);

    // Replay: nothing changes and no duplicate notice appears.
    const expiredAt = (await row(first.id)).expired_at;
    await expireVenueHolds(fixture.pool);
    await expireVenueHolds(fixture.pool);
    expect((await row(first.id)).expired_at).toEqual(expiredAt);
    expect((await fixture.notifications(first.eventRequestId)).filter((note) => note.type === 'VENUE_HOLD_EXPIRED'))
      .toHaveLength(1);
    // An expired hold cannot be approved or held again.
    await expect(decide(first.id, 'APPROVED')).rejects.toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
    expect(await fixture.eventRow(first.eventRequestId)).toMatchObject({ status: 'APPROVED' });
  });

  it('KAN-83-AC9 an approval that waited past the deadline is refused and expiry then wins', async () => {
    const target = await pending();
    await hold(target.id);
    await fixture.pool.query(
      "UPDATE venue_bookings SET hold_expires_at = clock_timestamp() + interval '1 second' WHERE id = $1", [target.id]);
    const blocker = await fixture.pool.connect();
    let approval: Promise<unknown> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM venue_bookings WHERE id = $1 FOR UPDATE', [target.id]);
      approval = decide(target.id, 'APPROVED').then(() => 'approved', (error) => error);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
    }
    expect(await approval).toMatchObject({ code: 'HOLD_EXPIRED' });
    await expireVenueHolds(fixture.pool);
    expect((await row(target.id)).status).toBe('EXPIRED');
  });

  it('KAN-83-AC9 an approval that commits first is not undone by a later expiry run', async () => {
    const target = await pending();
    await hold(target.id);
    const [approval, expiry] = await Promise.allSettled([decide(target.id, 'APPROVED'), expireVenueHolds(fixture.pool)]);
    expect(approval.status).toBe('fulfilled');
    expect(expiry.status).toBe('fulfilled');
    expect((await row(target.id)).status).toBe('APPROVED');
  });

  it.each([undefined, '', '   \n'])('KAN-83-AC10 refuses a cancellation with reason %j', async (reason) => {
    const target = await pending();
    await hold(target.id);
    await expect(cancel(target.id, reason)).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    expect((await row(target.id)).status).toBe('HELD');
  });

  it('KAN-83-AC10 cancelling releases only that hold, keeps its history and notifies the coordinator', async () => {
    const venueId = await createVenue();
    const target = await pending({ venueId, startsAt, endsAt });
    const neighbour = await pending({ startsAt, endsAt });
    await hold(target.id);
    await hold(neighbour.id);
    const cancelled = await cancel(target.id, '  Requested by the organiser  ');
    expect(cancelled).toMatchObject({
      status: 'CANCELLED', cancelledBy: staff.id, cancellationReason: 'Requested by the organiser',
      heldBy: staff.id, holdExpiresAt: expect.any(String),
    });
    expect((await row(neighbour.id)).status).toBe('HELD');
    expect((await fixture.notifications(target.eventRequestId)).map((note) => note.type))
      .toEqual(['VENUE_HOLD_CANCELLED', 'VENUE_HOLD_PLACED']);
    // The released period can now be held for another request.
    const next = await pending({ venueId });
    await expect(hold(next.id)).resolves.toMatchObject({ status: 'HELD' });
    await expect(cancel(target.id, 'again')).rejects.toMatchObject({ code: 'BOOKING_NOT_HELD' });
  });

  it('KAN-83-AC10 a lapsed hold cannot be cancelled; it is already released', async () => {
    const target = await pending();
    await hold(target.id);
    await lapse(target.id);
    await expect(cancel(target.id, 'Too late')).rejects.toMatchObject({ code: 'HOLD_EXPIRED' });
  });

  it('KAN-83-AC10 an operational block releases an overlapping live hold with the block reason', async () => {
    const venueId = await createVenue();
    const target = await pending({ venueId });
    await hold(target.id);
    await createVenueBlock(fixture.dependencies, { actor: staff, venueId,
      input: { startsAt, endsAt, reason: 'Burst pipe' } });
    expect(await row(target.id)).toMatchObject({
      status: 'CANCELLED', cancelled_by: staff.id, cancellation_reason: 'Venue unavailable: Burst pipe',
    });
    expect((await fixture.notifications(target.eventRequestId)).map((note) => note.type))
      .toContain('VENUE_HOLD_CANCELLED');
  });
});

describe('KAN-81 an outage releases a live hold by its buffered interval (AC3)', () => {
  const HOUR = 3_600_000;
  const shift = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString();
  async function bufferedHold() {
    const venueId = await createVenue();
    await fixture.pool.query('UPDATE venues SET setup_minutes = 60, turnaround_minutes = 30 WHERE id = $1', [venueId]);
    const target = await pending({ venueId });
    await hold(target.id);
    return target;
  }
  const block = (venueId: string, from: string, to: string) => createVenueBlock(fixture.dependencies, {
    actor: staff, venueId, input: { startsAt: from, endsAt: to, reason: 'Fire door repair' },
  });

  it('KAN-81-AC3 an outage covering only the setup time releases the hold', async () => {
    const target = await bufferedHold();
    await block(target.venueId, shift(startsAt, -HOUR), startsAt);
    expect(await row(target.id)).toMatchObject({
      status: 'CANCELLED', cancellation_reason: 'Venue unavailable: Fire door repair',
    });
  });

  it('KAN-81-AC3 an outage covering only the turnaround time releases the hold', async () => {
    const target = await bufferedHold();
    await block(target.venueId, endsAt, shift(endsAt, HOUR / 2));
    expect((await row(target.id)).status).toBe('CANCELLED');
  });

  it('KAN-81-AC3 an outage exactly adjacent to the buffered interval leaves the hold live', async () => {
    const target = await bufferedHold();
    await block(target.venueId, shift(startsAt, -2 * HOUR), shift(startsAt, -HOUR));
    await block(target.venueId, shift(endsAt, HOUR / 2), shift(endsAt, HOUR));
    expect((await row(target.id)).status).toBe('HELD');
  });
});

describe('KAN-81-AC3 / KAN-83-AC10 outage and live-hold concurrency', () => {
  function signal() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => { resolve = done; });
    return { promise, resolve };
  }

  /** Real PostgreSQL transactions with explicit barriers; no mocked SQL results or timing sleeps. */
  function intercepted(hooks: { before?: (sql: string) => void; after?: (sql: string) => Promise<void> }): WorkflowDependencies {
    return { pool: {
      query: fixture.pool.query.bind(fixture.pool),
      async connect() {
        const client = await fixture.pool.connect();
        return {
          async query(sql: string, values?: unknown[]) {
            hooks.before?.(sql);
            const result = await client.query(sql, values);
            await hooks.after?.(sql);
            return result;
          },
          release: client.release.bind(client),
        } as unknown as PoolClient;
      },
    } };
  }

  async function overlap<A, B>(
    first: (dependencies: WorkflowDependencies) => Promise<A>,
    second: (dependencies: WorkflowDependencies) => Promise<B>,
    pauseAfter: RegExp,
  ) {
    const paused = signal();
    const resume = signal();
    const secondAttempted = signal();
    let stopped = false;
    const firstResult = first(intercepted({ after: async (sql) => {
      if (!stopped && pauseAfter.test(sql)) {
        stopped = true;
        paused.resolve();
        await resume.promise;
      }
    } })).then((value) => ({ value }), (error: unknown) => ({ error }));
    let secondResult: Promise<{ value: B } | { error: unknown }> | undefined;
    try {
      await Promise.race([paused.promise, firstResult.then((result) => {
        throw new Error(`The first operation finished before reaching its barrier: ${JSON.stringify(result)}`);
      })]);
      secondResult = second(intercepted({
        before(sql) {
          if (/pg_advisory_xact_lock/.test(sql)) secondAttempted.resolve();
          // Also exercise the old outage implementation: its first contended statement was the venue lock.
          if (/FROM venues WHERE id = \$1 FOR UPDATE/.test(sql)) secondAttempted.resolve();
        },
        async after(sql) {
          // Without the venue gate, force the original bug: approval already owns the held row.
          if (/FROM venue_bookings WHERE id = \$1 FOR UPDATE/.test(sql)) secondAttempted.resolve();
        },
      })).then((value) => ({ value }), (error: unknown) => ({ error }));
      await Promise.race([secondAttempted.promise, secondResult.then((result) => {
        throw new Error(`The competing operation finished before reaching its barrier: ${JSON.stringify(result)}`);
      })]);
    } finally {
      resume.resolve();
    }
    return { first: await firstResult, second: await secondResult! };
  }

  const outage = (venueId: string) => (dependencies: WorkflowDependencies) => createVenueBlock(dependencies, {
    actor: staff, venueId, input: { startsAt, endsAt, reason: 'Emergency pipe repair' },
  });
  const approval = (bookingId: string) => (dependencies: WorkflowDependencies) => decideVenueBooking(dependencies, {
    actor: staff, bookingId, input: { decision: 'APPROVED' },
  });
  const placement = (bookingId: string) => (dependencies: WorkflowDependencies) => placeVenueHold(dependencies, {
    actor: staff, bookingId, input: { expiresAt: tomorrow() },
  });
  const bookingLock = /FROM venue_bookings WHERE id = \$1 FOR UPDATE/;
  const venueLock = /FROM venues WHERE id = \$1 FOR UPDATE/;
  const cancellationNotices = async (eventId: string) =>
    (await fixture.notifications(eventId)).filter((notice) => notice.type === 'VENUE_HOLD_CANCELLED');

  it('an outage that owns the venue cancels the hold even when approval starts before the outage commits', async () => {
    const target = await pending();
    await hold(target.id);
    // The route can supply uppercase UUID text; both writers must still use the same gate.
    const results = await overlap(outage(target.venueId.toUpperCase()), approval(target.id), venueLock);
    expect(results.first).toMatchObject({ value: { venueId: target.venueId } });
    expect(results.second).toMatchObject({ error: { code: 'BOOKING_ALREADY_DECIDED' } });
    expect(await row(target.id)).toMatchObject({ status: 'CANCELLED', cancelled_by: staff.id,
      cancellation_reason: 'Venue unavailable: Emergency pipe repair', held_by: staff.id });
    expect(await cancellationNotices(target.eventRequestId)).toHaveLength(1);
    // Removing the outage must never resurrect the cancelled hold or permit a later approval.
    if (!('value' in results.first)) throw results.first.error;
    await deleteVenueBlock(fixture.dependencies, { actor: staff, blockId: results.first.value.id });
    await expect(decide(target.id, 'APPROVED')).rejects.toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
    expect((await row(target.id)).status).toBe('CANCELLED');
  });

  it('an approval that wins first is retained and flagged for outage recovery instead of being cancelled', async () => {
    const target = await pending();
    await hold(target.id);
    const results = await overlap(approval(target.id), outage(target.venueId), bookingLock);
    expect(results.first).toMatchObject({ value: { status: 'APPROVED' } });
    expect(results.second).toMatchObject({ value: { affected: [expect.objectContaining({
      bookingId: target.id, status: 'RECOVERY_REQUIRED',
    })] } });
    expect((await row(target.id)).status).toBe('APPROVED');
    expect(await cancellationNotices(target.eventRequestId)).toHaveLength(0);
  });

  it('an approval that fails releases its gate and the waiting outage still cancels and notifies once', async () => {
    const target = await pending();
    await hold(target.id);
    await fixture.pool.query("UPDATE event_requests SET status = 'SUBMITTED' WHERE id = $1", [target.eventRequestId]);
    const results = await overlap(approval(target.id), outage(target.venueId), bookingLock);
    expect(results.first).toMatchObject({ error: { code: 'EVENT_NOT_APPROVED' } });
    expect(results.second).toMatchObject({ value: { venueId: target.venueId } });
    expect((await row(target.id)).status).toBe('CANCELLED');
    expect(await cancellationNotices(target.eventRequestId)).toHaveLength(1);
  });

  it('a hold placed first is cancelled by the waiting outage, including its reason and notification', async () => {
    const target = await pending();
    const results = await overlap(placement(target.id), outage(target.venueId), /UPDATE venue_bookings SET status = 'HELD'/);
    expect(results.first).toMatchObject({ value: { status: 'HELD' } });
    expect(results.second).toMatchObject({ value: { venueId: target.venueId } });
    expect(await row(target.id)).toMatchObject({ status: 'CANCELLED', cancellation_reason: 'Venue unavailable: Emergency pipe repair' });
    expect(await cancellationNotices(target.eventRequestId)).toHaveLength(1);
  });

  it('an outage saved first prevents a waiting hold placement without creating hold or cancellation notices', async () => {
    const target = await pending();
    const results = await overlap(outage(target.venueId), placement(target.id), venueLock);
    expect(results.first).toMatchObject({ value: { venueId: target.venueId } });
    expect(results.second).toMatchObject({ error: { code: 'VENUE_UNAVAILABLE' } });
    expect((await row(target.id)).status).toBe('PENDING');
    expect(await fixture.notifications(target.eventRequestId)).toEqual([]);
  });
});

describe('KAN-83-AC9 approval, expiry and overlapping hold contention at the deadline', () => {
  function signal() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => { resolve = done; });
    return { promise, resolve };
  }

  function tracked(after?: (sql: string) => Promise<void>) {
    let connected!: (pid: number) => void;
    const pid = new Promise<number>((resolve) => { connected = resolve; });
    const dependencies: WorkflowDependencies = { pool: {
      query: fixture.pool.query.bind(fixture.pool),
      async connect() {
        const client = await fixture.pool.connect();
        connected((await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid);
        return {
          async query(sql: string, values?: unknown[]) {
            const result = await client.query(sql, values);
            if (sql.startsWith('BEGIN')) await client.query("SET LOCAL statement_timeout = '10s'");
            await after?.(sql);
            return result;
          },
          release: client.release.bind(client),
        } as unknown as PoolClient;
      },
    } };
    return { dependencies, pid };
  }

  const settle = <T>(work: Promise<T>) => work.then((value) => ({ value }), (error: unknown) => ({ error }));
  const approve = (dependencies: WorkflowDependencies, bookingId: string) => decideVenueBooking(dependencies, {
    bookingId, actor: staff, input: { decision: 'APPROVED' },
  });
  const place = (dependencies: WorkflowDependencies, bookingId: string) => placeVenueHold(dependencies, {
    bookingId, actor: staff, input: { expiresAt: tomorrow() },
  });

  async function waitForBlock(observer: PoolClient, waiter: number, blocker: number) {
    const stop = Date.now() + 3_000;
    let blockers: number[] = [];
    do {
      blockers = (await observer.query<{ blockers: number[] }>(
        'SELECT pg_blocking_pids($1) AS blockers', [waiter])).rows[0]!.blockers;
      if (blockers.includes(blocker)) return;
    } while (Date.now() < stop);
    throw new Error(`Expected backend ${waiter} to wait for ${blocker}; observed blockers ${blockers.join(',')}`);
  }

  it('TC-14-16 expiry wins while approval waits on its row and a new hold waits on approval; retries have no duplicate effects', async () => {
    // Clear overdue fixtures left by earlier independent cases before asserting this worker's count.
    await expireVenueHolds(fixture.pool);
    const original = await pending();
    const replacement = await pending({ venueId: original.venueId });
    await hold(original.id);
    const expiryOwner = await fixture.pool.connect();
    const observer = await fixture.pool.connect();
    const work: Promise<unknown>[] = [];
    try {
      await expiryOwner.query('BEGIN');
      const expiryPid = (await expiryOwner.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      await expiryOwner.query('SELECT id FROM venue_bookings WHERE id = $1 FOR UPDATE', [original.id]);
      const approval = tracked();
      const approvalResult = settle(approve(approval.dependencies, original.id));
      work.push(approvalResult);
      const approvalPid = await approval.pid;
      await waitForBlock(observer, approvalPid, expiryPid);
      const placement = tracked();
      const placementResult = settle(place(placement.dependencies, replacement.id));
      work.push(placementResult);
      await waitForBlock(observer, await placement.pid, approvalPid);

      // Advance this fixture's deadline to the database clock while both other writers are
      // demonstrably blocked. No arbitrary sleep or mocked expiry result determines the winner.
      await expiryOwner.query('UPDATE venue_bookings SET hold_expires_at = clock_timestamp() WHERE id = $1', [original.id]);
      expect(await expireVenueHolds({ query: expiryOwner.query.bind(expiryOwner) })).toBe(1);
      await expiryOwner.query('COMMIT');
      expect(await approvalResult).toMatchObject({ error: { code: 'BOOKING_ALREADY_DECIDED' } });
      expect(await placementResult).toMatchObject({ value: { status: 'HELD' } });
    } finally {
      await expiryOwner.query('ROLLBACK');
      expiryOwner.release();
      observer.release();
      await Promise.all(work);
    }
    expect((await row(original.id)).status).toBe('EXPIRED');
    expect((await row(replacement.id)).status).toBe('HELD');
    expect(await expireVenueHolds(fixture.pool)).toBe(0);
    await expect(decide(original.id, 'APPROVED')).rejects.toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
    await expect(hold(replacement.id)).rejects.toMatchObject({ code: 'BOOKING_ALREADY_HELD' });
    expect((await fixture.notifications(original.eventRequestId)).map((notice) => notice.type))
      .toEqual(['VENUE_HOLD_EXPIRED', 'VENUE_HOLD_PLACED']);
    expect((await fixture.notifications(replacement.eventRequestId)).map((notice) => notice.type))
      .toEqual(['VENUE_HOLD_PLACED']);
  });

  it.each([true, false])('TC-14-16 approval is eligible before the boundary (commit before expiry: %s); expiry and competing-hold retries cannot overbook', async (commitBeforeExpiry) => {
    await expireVenueHolds(fixture.pool);
    const original = await pending();
    const replacement = await pending({ venueId: original.venueId });
    const expiryWorker = await fixture.pool.connect();
    const observer = await fixture.pool.connect();
    const updated = signal();
    const resume = signal();
    const work: Promise<unknown>[] = [];
    try {
      const deadline = (await observer.query<{ deadline: Date }>(
        "SELECT clock_timestamp() + interval '5 seconds' AS deadline")).rows[0]!.deadline.toISOString();
      // Placing the fixture hold is a separate completed operation, before any competing writer.
      await hold(original.id, deadline);
      const approval = tracked(async (sql) => {
        if (/UPDATE venue_bookings SET status = \$1/.test(sql)) {
          updated.resolve();
          await resume.promise;
        }
      });
      const approvalResult = settle(approve(approval.dependencies, original.id));
      work.push(approvalResult);
      await Promise.race([updated.promise, approvalResult.then((result) => {
        throw new Error(`Approval finished before its guarded update: ${JSON.stringify(result)}`);
      })]);
      const approvalPid = await approval.pid;
      expect((await observer.query<{ live: boolean }>(
        'SELECT clock_timestamp() < $1::timestamptz AS live', [deadline])).rows[0]!.live).toBe(true);
      const placement = tracked();
      const placementResult = settle(place(placement.dependencies, replacement.id));
      work.push(placementResult);
      await waitForBlock(observer, await placement.pid, approvalPid);

      if (commitBeforeExpiry) {
        resume.resolve();
        expect(await approvalResult).toMatchObject({ value: { status: 'APPROVED' } });
        expect((await observer.query<{ live: boolean }>(
          'SELECT clock_timestamp() < $1::timestamptz AS live', [deadline])).rows[0]!.live).toBe(true);
      }

      // Wait for the actual database-clock boundary, not an assumed elapsed delay. The approval
      // has already performed its final eligibility check and APPROVED update under row locks.
      // Test both its commit-before-boundary outcome and a commit delayed by a queued expiry.
      while (!(await observer.query<{ elapsed: boolean }>(
        'SELECT clock_timestamp() >= $1::timestamptz AS elapsed', [deadline])).rows[0]!.elapsed) { /* clock barrier */ }
      const expiryPid = (await expiryWorker.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      const expiryResult = settle(expireVenueHolds({ query: expiryWorker.query.bind(expiryWorker) }));
      work.push(expiryResult);
      if (!commitBeforeExpiry) {
        await waitForBlock(observer, expiryPid, approvalPid);
        resume.resolve();
      }
      expect(await approvalResult).toMatchObject({ value: { status: 'APPROVED' } });
      expect(await expiryResult).toEqual({ value: 0 });
      expect(await placementResult).toMatchObject({ error: { code: 'VENUE_BOOKING_CONFLICT' } });
    } finally {
      resume.resolve();
      await Promise.all(work);
      expiryWorker.release();
      observer.release();
    }
    expect((await row(original.id)).status).toBe('APPROVED');
    expect((await row(replacement.id)).status).toBe('PENDING');
    expect(await expireVenueHolds(fixture.pool)).toBe(0);
    await expect(decide(original.id, 'APPROVED')).rejects.toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
    await expect(hold(replacement.id)).rejects.toMatchObject({ code: 'VENUE_BOOKING_CONFLICT' });
    const originalNotices = await fixture.notifications(original.eventRequestId);
    expect(originalNotices.filter((notice) => notice.type === 'VENUE_HOLD_EXPIRED')).toHaveLength(0);
    expect(originalNotices.filter((notice) => notice.type === 'VENUE_BOOKING_APPROVED')
      .map((notice) => notice.recipient_id).sort()).toEqual([organiser.id, coordinator.id, staff.id].sort());
    expect(await fixture.notifications(replacement.eventRequestId)).toEqual([]);
  });
});

describe('KAN-83 coordinator visibility and access (AC11, AC12)', () => {
  it('KAN-83-AC11 the assigned coordinator sees the deadline and the expired outcome; others cannot', async () => {
    const target = await pending();
    const deadline = new Date(Math.floor((Date.now() + 10 * DAY) / 60_000) * 60_000).toISOString();
    await hold(target.id, deadline);
    const mine = await listVenueBookings(fixture.dependencies, { actor: coordinator, eventRequestId: target.eventRequestId });
    expect(mine).toEqual([expect.objectContaining({ status: 'HELD', holdExpiresAt: deadline })]);
    await lapse(target.id);
    await expireVenueHolds(fixture.pool);
    expect(await getVenueBooking(fixture.dependencies, { actor: coordinator, bookingId: target.id }))
      .toMatchObject({ status: 'EXPIRED', expiredAt: expect.any(String) });
    await expect(getVenueBooking(fixture.dependencies, { actor: otherCoordinator, bookingId: target.id }))
      .rejects.toMatchObject({ kind: 'NOT_FOUND' });
    expect(await listVenueBookings(fixture.dependencies, { actor: otherCoordinator, eventRequestId: target.eventRequestId }))
      .toEqual([]);
    // Venue Staff no longer see the expired hold in their work queue.
    expect((await listVenueBookings(fixture.dependencies, { actor: staff })).some((item) => item.id === target.id)).toBe(false);
  });
});

describe('KAN-83 runtime HTTP hold workflow', () => {
  async function runtime() {
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
    return { app, sessionFor };
  }

  it('KAN-83-AC1/AC5/AC10/AC12 holds, refuses other roles, cancels and approves through the mounted API', async () => {
    const { app, sessionFor } = await runtime();
    const staffSession = await sessionFor(staff);
    const coordinatorSession = await sessionFor(coordinator);
    const target = await pending();

    expect((await request(app).post(`/api/venue-bookings/${target.id}/hold`).send({ expiresAt: tomorrow() })).status).toBe(401);
    const forbidden = await coordinatorSession.post(`/api/venue-bookings/${target.id}/hold`).send({ expiresAt: tomorrow() });
    expect(forbidden.status).toBe(403);
    expect((await staffSession.post('/api/venue-bookings/not-a-uuid/hold').send({ expiresAt: tomorrow() })).status).toBe(400);
    const invalid = await staffSession.post(`/api/venue-bookings/${target.id}/hold`).send({ expiresAt: at(-1000) });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_HOLD_EXPIRY');

    const held = await staffSession.post(`/api/venue-bookings/${target.id}/hold`).send({ expiresAt: tomorrow() });
    expect(held.status).toBe(200);
    expect(held.body.booking).toMatchObject({ status: 'HELD', heldBy: staff.id });
    const seen = await coordinatorSession.get(`/api/venue-bookings?eventRequestId=${target.eventRequestId}`);
    expect(seen.body.items[0]).toMatchObject({ status: 'HELD', holdExpiresAt: held.body.booking.holdExpiresAt });

    const noReason = await staffSession.post(`/api/venue-bookings/${target.id}/hold/cancel`).send({ reason: ' ' });
    expect(noReason.status).toBe(400);
    expect((await coordinatorSession.post(`/api/venue-bookings/${target.id}/hold/cancel`).send({ reason: 'x' })).status).toBe(403);
    const cancelled = await staffSession.post(`/api/venue-bookings/${target.id}/hold/cancel`).send({ reason: 'Released' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.booking).toMatchObject({ status: 'CANCELLED', cancellationReason: 'Released' });

    const second = await pending();
    await staffSession.post(`/api/venue-bookings/${second.id}/hold`).send({ expiresAt: tomorrow() });
    const approved = await staffSession.post(`/api/venue-bookings/${second.id}/decision`).send({ decision: 'APPROVED' });
    expect(approved.status).toBe(200);
    expect(approved.body.booking).toMatchObject({ status: 'APPROVED', heldBy: staff.id });
    const missing = await staffSession.post(`/api/venue-bookings/${randomUUID()}/hold`).send({ expiresAt: tomorrow() });
    expect(missing.status).toBe(404);
  });
});
