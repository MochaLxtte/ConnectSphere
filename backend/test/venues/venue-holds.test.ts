import { describe, expect, it, vi } from 'vitest';
import {
  cancelVenueHold, decideVenueBooking, expireVenueHolds, placeVenueHold,
} from '../../src/modules/venues/booking-service.js';
import { createVenueBlock } from '../../src/modules/venues/block-service.js';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';

const eventId = '10000000-0000-4000-8000-000000000083';
const venueId = '20000000-0000-4000-8000-000000000083';
const bookingId = '30000000-0000-4000-8000-000000000083';
const staff: WorkflowActor = { id: '50000000-0000-4000-8000-000000000083', role: 'VENUE_STAFF' };
const coordinator: WorkflowActor = { id: '40000000-0000-4000-8000-000000000083', role: 'EVENT_COORDINATOR' };
const startsAt = new Date('2026-12-01T02:00:00.000Z');
const endsAt = new Date('2026-12-01T06:00:00.000Z');
const deadline = '2026-11-30T10:00:00.000Z';

interface Scenario {
  bookingStatus?: string;
  bookingMissing?: boolean;
  holdLive?: boolean;
  /** Result of the deadline recheck after the event and venue locks during approval. */
  stillLive?: boolean;
  eventStatus?: string;
  expectedAttendance?: number | null;
  venueActive?: boolean;
  capacity?: number;
  opensAt?: string | null;
  closesAt?: string | null;
  future?: boolean;
  beforeStart?: boolean;
  booked?: boolean;
  held?: boolean;
  blocked?: boolean;
  updateError?: unknown;
  /** Live holds a new block overlaps. */
  overlappingHolds?: string[];
}

const readRow = {
  id: bookingId, eventRequestId: eventId, eventName: 'Fair', eventStatus: 'APPROVED', venueId,
  venueName: 'Hall', status: 'HELD', startsAt, endsAt, layout: null, notes: null, decidedBy: null,
  decidedAt: null, decisionReason: null, createdAt: startsAt, updatedAt: startsAt, eventStartsAt: null,
  eventEndsAt: null, purpose: null, description: null, expectedAttendance: null, venueRequirements: null,
  accessibilityNeeds: null, holdExpiresAt: new Date(deadline), heldBy: staff.id, heldAt: startsAt,
  expiredAt: null, cancelledBy: null, cancelledAt: null, cancellationReason: null,
};

function fakePool(scenario: Scenario = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const client = {
    release: vi.fn(),
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (/FROM venue_bookings WHERE id = \$1 FOR UPDATE/.test(sql)) {
        if (scenario.bookingMissing) return { rows: [] };
        return { rows: [{ status: scenario.bookingStatus ?? 'PENDING', eventRequestId: eventId, venueId,
          startsAt, endsAt, holdExpiresAt: scenario.bookingStatus === 'HELD' ? new Date(deadline) : null }] };
      }
      if (/AS "holdLive"/.test(sql)) return { rows: [{ holdLive: scenario.holdLive ?? true }] };
      if (/AS live$/.test(sql.trim())) return { rows: [{ live: scenario.stillLive ?? true }] };
      if (/FROM event_requests WHERE id = \$1 FOR UPDATE/.test(sql)) {
        return { rows: [{ status: scenario.eventStatus ?? 'APPROVED',
          expectedAttendance: scenario.expectedAttendance === undefined ? 50 : scenario.expectedAttendance }] };
      }
      if (/FROM venues WHERE id = \$1 FOR UPDATE/.test(sql)) {
        return { rows: [{ isActive: scenario.venueActive ?? true, capacity: scenario.capacity ?? 100,
          opensAt: scenario.opensAt ?? null, closesAt: scenario.closesAt ?? null }] };
      }
      if (/AS future/.test(sql)) {
        return { rows: [{ future: scenario.future ?? true, beforeStart: scenario.beforeStart ?? true }] };
      }
      if (/AS booked/.test(sql)) {
        return { rows: [{ booked: scenario.booked ?? false, held: scenario.held ?? false, blocked: scenario.blocked ?? false }] };
      }
      if (/FOR UPDATE SKIP LOCKED/.test(sql)) {
        return { rows: (scenario.overlappingHolds ?? []).map((id) => ({ id })) };
      }
      if (/^\s*UPDATE venue_bookings/.test(sql) && scenario.updateError) throw scenario.updateError;
      if (/^\s*INSERT INTO venue_unavailability/.test(sql)) return { rows: [{ id: 'block-1' }] };
      if (/FROM venue_unavailability u/.test(sql)) {
        return { rows: [{ id: 'block-1', venueId, startsAt, endsAt, reason: 'Burst pipe', createdBy: staff.id,
          createdAt: startsAt }] };
      }
      if (/FROM venue_bookings b JOIN event_requests e ON e.id = b.event_request_id\s+JOIN venues/.test(sql)
        && /SELECT b\.id/.test(sql)) return { rows: [readRow] };
      if (/expire_venue_holds/.test(sql)) return { rows: [{ expired: 3 }] };
      return { rows: [] };
    }),
  };
  const pool = { connect: vi.fn(async () => client), query: client.query };
  const wrote = (pattern: RegExp) => calls.some((call) => pattern.test(call.sql));
  const index = (pattern: RegExp) => calls.findIndex((call) => pattern.test(call.sql));
  const find = (pattern: RegExp) => calls.find((call) => pattern.test(call.sql));
  return { pool: pool as never, calls, wrote, index, find };
}

const place = (pool: never, input: unknown = { expiresAt: deadline }, actor = staff) =>
  placeVenueHold({ pool }, { bookingId, actor, input });
const decide = (pool: never, decision: 'APPROVED' | 'REJECTED' = 'APPROVED') =>
  decideVenueBooking({ pool }, { bookingId, actor: staff, input: { decision } });
const cancel = (pool: never, input: unknown = { reason: 'Released' }, actor = staff) =>
  cancelVenueHold({ pool }, { bookingId, actor, input });

describe('KAN-83 placeVenueHold', () => {
  it('KAN-83-AC1/AC7 holds a pending request under booking -> event -> venue locks and notifies in the same transaction', async () => {
    const { pool, index, find, wrote } = fakePool();
    await expect(place(pool)).resolves.toMatchObject({ status: 'HELD' });
    const order = [
      index(/FROM venue_bookings WHERE id = \$1 FOR UPDATE/),
      index(/FROM event_requests WHERE id = \$1 FOR UPDATE/),
      index(/FROM venues WHERE id = \$1 FOR UPDATE/),
      index(/AS future/),
      index(/AS booked/),
      index(/^\s*UPDATE venue_bookings SET status = 'HELD'/),
      index(/INSERT INTO notifications/),
      index(/^COMMIT/),
    ];
    expect(order.every((position) => position > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(find(/AS future/)!.params).toEqual([deadline, startsAt]);
    expect(find(/UPDATE venue_bookings SET status = 'HELD'/)!.params).toEqual([bookingId, deadline, staff.id]);
    const notice = find(/INSERT INTO notifications/)!;
    expect(notice.params).toEqual([bookingId, 'VENUE_HOLD_PLACED', 'Venue hold placed']);
    expect(notice.sql).toContain("AT TIME ZONE 'Asia/Singapore'");
    expect(notice.sql).toContain('e.coordinator_id IS NOT NULL');
    expect(wrote(/^ROLLBACK/)).toBe(false);
  });

  it('accepts an event with no recorded attendance', async () => {
    const { pool } = fakePool({ expectedAttendance: null });
    await expect(place(pool)).resolves.toMatchObject({ status: 'HELD' });
  });

  it('KAN-83-AC1/AC12 refuses roles other than Venue Staff before any database work', async () => {
    const { pool, calls } = fakePool();
    await expect(place(pool, { expiresAt: deadline }, coordinator)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    expect(calls).toEqual([]);
  });

  it('refuses invalid input before opening a transaction', async () => {
    const { pool, calls } = fakePool();
    await expect(place(pool, {})).rejects.toMatchObject({ code: 'INVALID_HOLD_EXPIRY' });
    expect(calls).toEqual([]);
  });

  it.each([
    ['a missing booking', { bookingMissing: true }, 'VENUE_BOOKING_NOT_FOUND'],
    ['a live hold', { bookingStatus: 'HELD', holdLive: true }, 'BOOKING_ALREADY_HELD'],
    ['a lapsed hold', { bookingStatus: 'HELD', holdLive: false }, 'BOOKING_NOT_PENDING'],
    ['an approved booking', { bookingStatus: 'APPROVED' }, 'BOOKING_NOT_PENDING'],
    ['an unapproved event', { eventStatus: 'SUBMITTED' }, 'EVENT_NOT_APPROVED'],
    ['an inactive venue', { venueActive: false }, 'VENUE_INACTIVE'],
    ['a venue that is too small', { capacity: 10 }, 'VENUE_UNSUITABLE'],
    ['a period outside opening hours', { opensAt: '23:00', closesAt: '23:30' }, 'OUTSIDE_VENUE_HOURS'],
    ['invalid opening hours', { opensAt: '20:00', closesAt: '08:00' }, 'OUTSIDE_VENUE_HOURS'],
    ['a deadline that is not in the future', { future: false }, 'INVALID_HOLD_EXPIRY'],
    ['a deadline after the occupied start', { beforeStart: false }, 'INVALID_HOLD_EXPIRY'],
    ['an approved overlap', { booked: true }, 'VENUE_BOOKING_CONFLICT'],
    ['another live hold', { held: true }, 'VENUE_HELD'],
    ['an operational block', { blocked: true }, 'VENUE_UNAVAILABLE'],
  ] as const)('KAN-83-AC1/AC3 refuses %s and writes nothing', async (_label, scenario, code) => {
    const { pool, wrote } = fakePool(scenario);
    await expect(place(pool)).rejects.toMatchObject({ code });
    expect(wrote(/^\s*UPDATE venue_bookings/)).toBe(false);
    expect(wrote(/INSERT INTO notifications/)).toBe(false);
    expect(wrote(/^ROLLBACK/)).toBe(true);
  });

  it.each([
    ['venue_bookings_no_overlap', 'VENUE_BOOKING_CONFLICT'],
    ['venue_bookings_not_blocked', 'VENUE_UNAVAILABLE'],
  ])('KAN-83-AC3 maps the database trigger %s to %s', async (constraint, code) => {
    const { pool } = fakePool({ updateError: Object.assign(new Error('x'), { code: '23P01', constraint }) });
    await expect(place(pool)).rejects.toMatchObject({ kind: 'CONFLICT', code });
  });

  it('does not disguise other database failures', async () => {
    const outage = new Error('connection lost');
    await expect(place(fakePool({ updateError: outage }).pool)).rejects.toBe(outage);
  });
});

describe('KAN-83 deciding a held booking', () => {
  it('KAN-83-AC5 approves a live hold after rechecking its deadline under every lock, excluding only itself', async () => {
    const { pool, index, find } = fakePool({ bookingStatus: 'HELD' });
    await expect(decide(pool)).resolves.toMatchObject({ venueId });
    expect(index(/AS live$/)).toBeGreaterThan(index(/FROM venues WHERE id = \$1 FOR UPDATE/));
    expect(index(/AS booked/)).toBeGreaterThan(index(/AS live$/));
    expect(find(/AS booked/)!.params).toEqual([venueId, bookingId, startsAt, endsAt]);
    expect(find(/^\s*UPDATE venue_bookings/)!.params[0]).toBe('APPROVED');
  });

  it('KAN-83-AC6 refuses to decide a hold whose deadline has passed', async () => {
    for (const decision of ['APPROVED', 'REJECTED'] as const) {
      const { pool, wrote } = fakePool({ bookingStatus: 'HELD', holdLive: false });
      await expect(decide(pool, decision)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'HOLD_EXPIRED' });
      expect(wrote(/^\s*UPDATE venue_bookings/)).toBe(false);
    }
  });

  it('KAN-83-AC9 refuses an approval whose hold lapsed while it waited for the event or venue lock', async () => {
    const { pool, wrote } = fakePool({ bookingStatus: 'HELD', holdLive: true, stillLive: false });
    await expect(decide(pool)).rejects.toMatchObject({ code: 'HOLD_EXPIRED' });
    expect(wrote(/AS booked/)).toBe(false);
    expect(wrote(/^\s*UPDATE venue_bookings/)).toBe(false);
  });

  it('KAN-83-AC5 rejects a live hold without assessing conflicts', async () => {
    const { pool, wrote } = fakePool({ bookingStatus: 'HELD', booked: true });
    await expect(decide(pool, 'REJECTED')).resolves.toMatchObject({ venueId });
    expect(wrote(/AS booked/)).toBe(false);
  });

  it('KAN-83-AC4 refuses to approve a pending request that overlaps another live hold', async () => {
    const { pool } = fakePool({ held: true });
    await expect(decide(pool)).rejects.toMatchObject({
      code: 'VENUE_HELD', message: 'The venue is temporarily held for another request during this period.',
    });
  });

  it.each(['EXPIRED', 'CANCELLED'])('will not decide a %s booking', async (bookingStatus) => {
    const { pool } = fakePool({ bookingStatus });
    await expect(decide(pool)).rejects.toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
  });
});

describe('KAN-83 cancelling a hold (AC10)', () => {
  it('KAN-83-AC10 releases the live hold with its reason and notifies the coordinator', async () => {
    const { pool, find, index } = fakePool({ bookingStatus: 'HELD' });
    await expect(cancel(pool, { reason: '  Organiser withdrew ' })).resolves.toMatchObject({ id: bookingId });
    const update = find(/SET status = 'CANCELLED'/)!;
    expect(update.params).toEqual([bookingId, staff.id, 'Organiser withdrew']);
    expect(update.sql).toContain("AND status = 'HELD'");
    expect(find(/INSERT INTO notifications/)!.params).toEqual([bookingId, 'VENUE_HOLD_CANCELLED', 'Venue hold cancelled']);
    expect(index(/INSERT INTO notifications/)).toBeGreaterThan(index(/SET status = 'CANCELLED'/));
  });

  it.each([
    ['a non-staff role', {}, coordinator, 'ACTION_FORBIDDEN'],
    ['a blank reason', { bookingStatus: 'HELD' }, staff, 'INVALID_INPUT'],
    ['a lapsed hold', { bookingStatus: 'HELD', holdLive: false }, staff, 'HOLD_EXPIRED'],
    ['a pending request', { bookingStatus: 'PENDING' }, staff, 'BOOKING_NOT_HELD'],
  ] as const)('refuses %s', async (_label, scenario, actor, code) => {
    const { pool, wrote } = fakePool(scenario);
    const input = code === 'INVALID_INPUT' ? { reason: '  ' } : { reason: 'Released' };
    await expect(cancel(pool, input, actor)).rejects.toMatchObject({ code });
    expect(wrote(/SET status = 'CANCELLED'/)).toBe(false);
  });
});

describe('KAN-83 expiry and operational blocks', () => {
  it('KAN-83-AC8 runs the database expiry function and returns how many holds expired', async () => {
    const { pool, find } = fakePool();
    expect(await expireVenueHolds(pool as never)).toBe(3);
    expect(find(/expire_venue_holds/)!.sql).toBe('SELECT expire_venue_holds() AS expired');
  });

  it('KAN-83-AC10 a new block releases each overlapping live hold with the block reason', async () => {
    const { pool, calls, index } = fakePool({ overlappingHolds: ['hold-a', 'hold-b'] });
    await createVenueBlock({ pool }, { actor: staff, venueId,
      input: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: 'Burst pipe' } });
    const releases = calls.filter((call) => /SET status = 'CANCELLED'/.test(call.sql));
    expect(releases.map((call) => call.params)).toEqual([
      ['hold-a', staff.id, 'Venue unavailable: Burst pipe'],
      ['hold-b', staff.id, 'Venue unavailable: Burst pipe'],
    ]);
    expect(index(/FOR UPDATE SKIP LOCKED/)).toBeGreaterThan(index(/FROM venues WHERE id = \$1 FOR UPDATE/));
    expect(index(/INSERT INTO venue_unavailability/)).toBeGreaterThan(index(/SET status = 'CANCELLED'/));
  });

  it('a block with no overlapping holds releases nothing', async () => {
    const { pool, wrote } = fakePool();
    await createVenueBlock({ pool }, { actor: staff, venueId,
      input: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: 'Painting' } });
    expect(wrote(/SET status = 'CANCELLED'/)).toBe(false);
  });
});
