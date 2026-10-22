import { describe, expect, it, vi } from 'vitest';
import { createVenueBooking, decideVenueBooking } from '../../src/modules/venues/booking-service.js';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';

const eventId = '10000000-0000-4000-8000-000000000001';
const venueId = '20000000-0000-4000-8000-000000000001';
const bookingId = '30000000-0000-4000-8000-000000000001';
const coordinator: WorkflowActor = { id: '40000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const staff: WorkflowActor = { id: '50000000-0000-4000-8000-000000000001', role: 'VENUE_STAFF' };
const startsAt = '2026-12-01T02:00:00.000Z';
const endsAt = '2026-12-01T06:00:00.000Z';

interface Scenario {
  eventStatus?: string;
  venueActive?: boolean;
  withinHours?: boolean;
  booked?: boolean;
  /** KAN-83: another booking's live hold overlaps. */
  held?: boolean;
  blocked?: boolean;
  /** KAN-83: whether this booking's own hold is still live when the clock is read. */
  holdLive?: boolean;
  bookingStatus?: string;
  /** Error thrown by the booking UPDATE, standing in for a database exclusion constraint. */
  updateError?: unknown;
  /** KAN-81 phase 3: the booking being decided replaces this original. */
  replaces?: string | null;
  originalEventId?: string | null;
  openRecovery?: boolean;
  fit?: { capacity: number; opensAt: string | null; closesAt: string | null; attendance: number | null };
}

const bookingRow = {
  id: bookingId, eventRequestId: eventId, eventName: 'Fair', eventStatus: 'APPROVED', venueId,
  venueName: 'Hall', status: 'PENDING', startsAt: new Date(startsAt), endsAt: new Date(endsAt),
  layout: null, notes: null, decidedBy: null, decidedAt: null, decisionReason: null,
  createdAt: new Date(startsAt), updatedAt: new Date(startsAt), eventStartsAt: null, eventEndsAt: null,
  purpose: null, description: null, expectedAttendance: null, venueRequirements: null,
  accessibilityNeeds: null, holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
  cancelledBy: null, cancelledAt: null, cancellationReason: null,
  recovery: [],
};

/** Routes each statement by its SQL so tests can see what was asked, in what order. */
function fakePool(scenario: Scenario = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const client = {
    release: vi.fn(),
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (/FROM event_requests WHERE id = \$1 FOR UPDATE/.test(sql)) {
        return { rows: [{ id: eventId, organiserId: 'x', coordinatorId: coordinator.id,
          status: scenario.eventStatus ?? 'APPROVED' }] };
      }
      if (/FROM venue_bookings WHERE id = \$1 FOR UPDATE/.test(sql)) {
        return { rows: [{ status: scenario.bookingStatus ?? 'PENDING', eventRequestId: eventId, venueId,
          startsAt: new Date(startsAt), endsAt: new Date(endsAt), replacesBookingId: scenario.replaces ?? null,
          holdExpiresAt: scenario.bookingStatus === 'HELD' ? new Date('2026-11-30T00:00:00.000Z') : null }] };
      }
      if (/AS "holdLive"/.test(sql)) return { rows: [{ holdLive: scenario.holdLive ?? true }] };
      if (/AS live$/.test(sql.trim())) return { rows: [{ live: scenario.holdLive ?? true }] };
      if (/SELECT status FROM event_requests/.test(sql)) {
        return { rows: [{ status: scenario.eventStatus ?? 'APPROVED' }] };
      }
      if (/FROM venues WHERE id = \$1 FOR UPDATE/.test(sql)) {
        return { rows: [{ isActive: scenario.venueActive ?? true }] };
      }
      if (/AS booked/.test(sql)) {
        return { rows: [{ withinHours: scenario.withinHours ?? true, booked: scenario.booked ?? false,
          held: scenario.held ?? false, blocked: scenario.blocked ?? false }] };
      }
      if (/^SELECT event_request_id AS "eventRequestId" FROM venue_bookings/.test(sql)) {
        return { rows: scenario.originalEventId === null ? [] : [{ eventRequestId: scenario.originalEventId ?? eventId }] };
      }
      if (/AS open/.test(sql)) return { rows: [{ open: scenario.openRecovery ?? true }] };
      if (/v\.capacity/.test(sql)) {
        return { rows: [scenario.fit ?? { capacity: 100, opensAt: null, closesAt: null, attendance: 50 }] };
      }
      if (/^\s*INSERT INTO venue_bookings/.test(sql)) return { rows: [{ id: bookingId }] };
      if (/^\s*UPDATE venue_bookings/.test(sql) && scenario.updateError) throw scenario.updateError;
      if (/FROM venue_bookings b JOIN/.test(sql)) return { rows: [{ name: 'Fair', organiserId: 'owner', coordinatorId: coordinator.id, venueName: 'Hall' }] };
      if (/FROM venue_booking_intervals b JOIN/.test(sql)) return { rows: [bookingRow] };
      return { rows: [] };
    }),
  };
  const pool = { connect: vi.fn(async () => client) };
  const wrote = (pattern: RegExp) => calls.some(call => pattern.test(call.sql));
  const index = (pattern: RegExp) => calls.findIndex(call => pattern.test(call.sql));
  return { pool: pool as never, calls, wrote, index, find: (pattern: RegExp) => calls.find(call => pattern.test(call.sql)) };
}

const submission = { venueId, startsAt, endsAt };
const submit = (pool: never, input: unknown = submission) =>
  createVenueBooking({ pool }, { eventRequestId: eventId, actor: coordinator, input });
const decide = (pool: never, decision: 'APPROVED' | 'REJECTED' = 'APPROVED') =>
  decideVenueBooking({ pool }, { bookingId, actor: staff, input: { decision } });

describe('KAN-54 conflict assessment when a booking is requested (AC1, AC2, AC5, AC6, AC7, AC8, AC9)', () => {
  it('KAN-78 refuses occupied time outside operating hours before writing a pending request', async () => {
    const { pool, wrote } = fakePool({ withinHours: false });
    await expect(submit(pool)).rejects.toMatchObject({ code: 'VENUE_OUTSIDE_OPERATING_HOURS' });
    expect(wrote(/^\s*INSERT INTO venue_bookings/)).toBe(false);
  });
  it('asks only about approved bookings and blocks of the requested venue, for the requested period', async () => {
    const { pool, find } = fakePool();
    await submit(pool);
    const clash = find(/AS booked/)!;
    expect(clash.params).toEqual([venueId, startsAt, endsAt, null]);
    // AC3: scoped to one venue, so an overlapping period elsewhere can never count.
    expect(clash.sql.match(/venue_id = v.id/g)).toHaveLength(3);
    // AC1/AC6: only confirmed (approved) bookings reserve a venue.
    expect(clash.sql).toMatch(/status = 'APPROVED'/);
    // KAN-83-AC4: another request's live hold also reserves the venue until its deadline.
    expect(clash.sql).toMatch(/status = 'HELD' AND b\.hold_expires_at > clock_timestamp\(\)/);
    // AC4: half-open interval, so back-to-back periods do not overlap.
    expect(clash.sql).toContain('b.occupied_starts_at < occupied.e AND b.occupied_ends_at > occupied.s');
  });

  it('creates the pending booking when nothing clashes (AC3, AC4)', async () => {
    const { pool, wrote } = fakePool({ booked: false, blocked: false });
    await expect(submit(pool)).resolves.toMatchObject({ status: 'PENDING', venueId });
    expect(wrote(/^\s*INSERT INTO venue_bookings/)).toBe(true);
  });

  it('refuses an overlap with an approved booking and creates nothing (AC2, AC6, AC7, AC8)', async () => {
    const { pool, wrote } = fakePool({ booked: true });
    await expect(submit(pool)).rejects.toMatchObject({
      kind: 'CONFLICT', code: 'VENUE_BOOKING_CONFLICT',
      message: 'The venue already has an approved booking during the occupied period.',
    });
    expect(wrote(/^\s*INSERT INTO venue_bookings/)).toBe(false);
    expect(wrote(/^ROLLBACK/)).toBe(true);
    expect(wrote(/^COMMIT/)).toBe(false);
  });

  it('refuses an overlap with an operational block and creates nothing (AC5, AC7, AC8)', async () => {
    const { pool, wrote } = fakePool({ blocked: true });
    await expect(submit(pool)).rejects.toMatchObject({
      kind: 'CONFLICT', code: 'VENUE_UNAVAILABLE', message: 'The venue is blocked during the occupied period.',
    });
    expect(wrote(/^\s*INSERT INTO venue_bookings/)).toBe(false);
  });

  it('reports the booking conflict when both a booking and a block overlap', async () => {
    const { pool } = fakePool({ booked: true, blocked: true });
    await expect(submit(pool)).rejects.toMatchObject({ code: 'VENUE_BOOKING_CONFLICT' });
  });

  it('reads the clash data only after the venue row is locked, so it sees the latest commits (AC9)', async () => {
    const { pool, index } = fakePool();
    await submit(pool);
    expect(index(/FROM venues WHERE id = \$1 FOR UPDATE/)).toBeGreaterThan(-1);
    expect(index(/AS booked/)).toBeGreaterThan(index(/FROM venues WHERE id = \$1 FOR UPDATE/));
  });

  it('does not assess a conflict for an inactive venue; it is refused first', async () => {
    const { pool, wrote } = fakePool({ venueActive: false });
    await expect(submit(pool)).rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
    expect(wrote(/AS booked/)).toBe(false);
  });
});

describe('KAN-54 conflict assessment when Venue Staff approve a booking (AC1, AC2, AC5, AC6, AC7, AC8, AC9)', () => {
  it('excludes the booking being approved and uses the stored period and venue', async () => {
    const { pool, find } = fakePool();
    await decide(pool);
    const clash = find(/AS booked/)!;
    expect(clash.params).toEqual([venueId, new Date(startsAt), new Date(endsAt), bookingId]);
    expect(clash.sql).toMatch(/id <> \$4/);
    expect(clash.sql).toMatch(/status = 'APPROVED'/);
    expect(clash.sql).toContain('b.occupied_starts_at < occupied.e AND b.occupied_ends_at > occupied.s');
  });

  it('approves when nothing clashes (AC3, AC4)', async () => {
    const { pool, wrote } = fakePool();
    await expect(decide(pool)).resolves.toMatchObject({ venueId });
    expect(wrote(/^\s*UPDATE venue_bookings/)).toBe(true);
    expect(wrote(/^COMMIT/)).toBe(true);
  });

  it('refuses approval that overlaps another approved booking and writes no decision (AC2, AC7, AC8)', async () => {
    const { pool, wrote } = fakePool({ booked: true });
    await expect(decide(pool)).rejects.toMatchObject({
      kind: 'CONFLICT', code: 'VENUE_BOOKING_CONFLICT',
      message: 'The venue already has an approved booking during the occupied period.',
    });
    expect(wrote(/^\s*UPDATE venue_bookings/)).toBe(false);
    expect(wrote(/^ROLLBACK/)).toBe(true);
  });

  it('refuses approval that overlaps an operational block and writes no decision (AC5, AC7, AC8)', async () => {
    const { pool, wrote } = fakePool({ blocked: true });
    await expect(decide(pool)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'VENUE_UNAVAILABLE' });
    expect(wrote(/^\s*UPDATE venue_bookings/)).toBe(false);
  });

  it('assesses conflicts only after locking booking, event and venue, in that order (AC9)', async () => {
    const { pool, index } = fakePool();
    await decide(pool);
    const order = [
      index(/FROM venue_bookings WHERE id = \$1 FOR UPDATE/),
      index(/SELECT status FROM event_requests/),
      index(/FROM venues WHERE id = \$1 FOR UPDATE/),
      index(/AS booked/),
    ];
    expect(order.every(position => position > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('does not assess conflicts when rejecting, even if the period is taken', async () => {
    const { pool, wrote } = fakePool({ booked: true, blocked: true, venueActive: false });
    await expect(decide(pool, 'REJECTED')).resolves.toMatchObject({ venueId });
    expect(wrote(/AS booked/)).toBe(false);
    expect(wrote(/^\s*UPDATE venue_bookings/)).toBe(true);
  });

  it.each(['APPROVED', 'REJECTED', 'CANCELLED'])(
    'will not decide a booking that is already %s, so a settled booking is never re-assessed', async (bookingStatus) => {
      const { pool, wrote } = fakePool({ bookingStatus });
      await expect(decide(pool)).rejects.toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
      expect(wrote(/AS booked/)).toBe(false);
    },
  );

  it('refuses approval of a booking whose event is no longer approved', async () => {
    const { pool, wrote } = fakePool({ eventStatus: 'CANCELLED' });
    await expect(decide(pool)).rejects.toMatchObject({ code: 'EVENT_NOT_APPROVED' });
    expect(wrote(/AS booked/)).toBe(false);
  });

  it('refuses approval at a venue that has become inactive', async () => {
    const { pool } = fakePool({ venueActive: false });
    await expect(decide(pool)).rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
  });
});

describe('KAN-54 database exclusion constraints are the last line of defence (AC2, AC5, AC7, AC8)', () => {
  const exclusion = (constraint: string) => Object.assign(new Error('exclusion'), { code: '23P01', constraint });
  it('KAN-78 maps the database occupied-hours guard to clear conflict feedback', async () => {
    await expect(decide(fakePool({ updateError: exclusion('venue_bookings_within_hours') }).pool))
      .rejects.toMatchObject({ code: 'VENUE_OUTSIDE_OPERATING_HOURS' });
  });

  it('reports a booking overlap caught by the database as the same conflict', async () => {
    const { pool } = fakePool({ updateError: exclusion('venue_bookings_no_overlap') });
    await expect(decide(pool)).rejects.toMatchObject({
      kind: 'CONFLICT', code: 'VENUE_BOOKING_CONFLICT',
      message: 'The venue already has an approved booking during the occupied period.',
    });
  });

  it('reports a block overlap caught by the database as the same unavailable refusal', async () => {
    const { pool } = fakePool({ updateError: exclusion('venue_bookings_not_blocked') });
    await expect(decide(pool)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'VENUE_UNAVAILABLE' });
  });

  it('does not disguise an unrelated exclusion constraint or other database failure', async () => {
    const unrelated = exclusion('some_other_constraint');
    await expect(decide(fakePool({ updateError: unrelated }).pool)).rejects.toBe(unrelated);
    const outage = new Error('connection lost');
    await expect(decide(fakePool({ updateError: outage }).pool)).rejects.toBe(outage);
    const bareCode = Object.assign(new Error('no constraint name'), { code: '23P01' });
    await expect(decide(fakePool({ updateError: bareCode }).pool)).rejects.toBe(bareCode);
  });
});

describe('KAN-81 phase 3: replacement requests and approvals (AC7, AC8)', () => {
  const originalId = '60000000-0000-4000-8000-000000000001';
  const replacement = { ...submission, replacesBookingId: originalId };

  it('records a replacement linked to its original after the objective checks (AC7)', async () => {
    const { pool, find, index } = fakePool();
    await expect(submit(pool, replacement)).resolves.toMatchObject({ status: 'PENDING' });
    expect(find(/^\s*INSERT INTO venue_bookings/)!.params.at(-1)).toBe(originalId);
    expect(index(/AS open/)).toBeLessThan(index(/FROM venues WHERE id = \$1 FOR UPDATE/));
    expect(index(/v\.capacity/)).toBeGreaterThan(index(/AS booked/));
  });

  it.each([
    [{ eventStatus: 'SUBMITTED' }, 'EVENT_NOT_ELIGIBLE_FOR_REPLACEMENT'],
    [{ originalEventId: '70000000-0000-4000-8000-000000000001' }, 'VENUE_BOOKING_NOT_FOUND'],
    [{ originalEventId: null }, 'VENUE_BOOKING_NOT_FOUND'],
    [{ openRecovery: false }, 'REPLACEMENT_NOT_NEEDED'],
    [{ fit: { capacity: 40, opensAt: null, closesAt: null, attendance: 50 } }, 'VENUE_CAPACITY_TOO_SMALL'],
    [{ fit: { capacity: 100, opensAt: '12:00:00', closesAt: '22:00:00', attendance: 50 } }, 'VENUE_CLOSED_DURING_PERIOD'],
  ] as const)('refuses a replacement for %j with %s and creates nothing (AC7)', async (scenario, code) => {
    const { pool, wrote } = fakePool(scenario as Scenario);
    await expect(submit(pool, replacement)).rejects.toMatchObject({ code });
    expect(wrote(/^\s*INSERT INTO venue_bookings/)).toBe(false);
  });

  it('accepts a replacement for a confirmed event and when attendance is unknown', async () => {
    await expect(submit(fakePool({ eventStatus: 'CONFIRMED' }).pool, replacement)).resolves.toMatchObject({ status: 'PENDING' });
    await expect(submit(fakePool({ fit: { capacity: 1, opensAt: null, closesAt: null, attendance: null } }).pool, replacement))
      .resolves.toMatchObject({ status: 'PENDING' });
  });

  it('skips the replacement checks for an ordinary request', async () => {
    const { pool, wrote } = fakePool({ eventStatus: 'SUBMITTED' });
    await submit(pool);
    expect(wrote(/AS open/)).toBe(false);
    expect(wrote(/v\.capacity/)).toBe(false);
  });

  it('approves a replacement by resolving and cancelling the original after the other locks (AC8)', async () => {
    const { pool, calls, index } = fakePool({ replaces: originalId });
    await decide(pool);
    const lockOriginal = calls.findIndex((call) => /FROM venue_bookings WHERE id = \$1 FOR UPDATE/.test(call.sql) && call.params[0] === originalId);
    expect(lockOriginal).toBeGreaterThan(index(/FROM venues WHERE id = \$1 FOR UPDATE/));
    const resolve = index(/UPDATE venue_outage_impacts SET status = 'RESOLVED'/);
    const cancel = calls.findIndex((call) => /SET status = 'CANCELLED'/.test(call.sql));
    expect(resolve).toBeGreaterThan(index(/SET status = \$1, decided_by/));
    expect(cancel).toBeGreaterThan(resolve);
    expect(calls[cancel]!.params).toEqual([originalId]);
  });

  it('approves a replacement for a confirmed event', async () => {
    await expect(decide(fakePool({ replaces: originalId, eventStatus: 'CONFIRMED' }).pool)).resolves.toBeDefined();
  });

  it('refuses to approve a replacement whose original no longer needs recovery (AC8)', async () => {
    const { pool, wrote } = fakePool({ replaces: originalId, openRecovery: false });
    await expect(decide(pool)).rejects.toMatchObject({ code: 'REPLACEMENT_NOT_NEEDED' });
    expect(wrote(/SET status = \$1, decided_by/)).toBe(false);
  });

  it('leaves the original untouched when a replacement is rejected (AC8)', async () => {
    const { pool, wrote } = fakePool({ replaces: originalId });
    await decide(pool, 'REJECTED');
    expect(wrote(/UPDATE venue_outage_impacts/)).toBe(false);
    expect(wrote(/SET status = 'CANCELLED'/)).toBe(false);
  });
});
