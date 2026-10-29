import { describe, expect, it, vi } from 'vitest';
import {
  cancelVenueArrangement, createVenueBooking, decideVenueBooking, venueArrangementReadiness,
} from '../../src/modules/venues/booking-service.js';
import { parseArrangementCancellation } from '../../src/modules/venues/booking-input.js';
import {
  ARRANGEMENT_NOTIFICATION_TYPES, arrangementCancelledNotifications, replacementRequestedNotifications,
} from '../../src/modules/notifications/arrangement-notifications.js';
import { NOTIFICATION_TYPES } from '../../src/modules/notifications/trigger-matrix.js';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';

const eventId = '10000000-0000-4000-8000-000000000082';
const venueId = '20000000-0000-4000-8000-000000000082';
const bookingId = '30000000-0000-4000-8000-000000000082';
const originalId = '60000000-0000-4000-8000-000000000082';
const coordinator: WorkflowActor = { id: '40000000-0000-4000-8000-000000000082', role: 'EVENT_COORDINATOR' };
const staff: WorkflowActor = { id: '50000000-0000-4000-8000-000000000082', role: 'VENUE_STAFF' };
const startsAt = new Date('2026-12-01T02:00:00.000Z');
const endsAt = new Date('2026-12-01T06:00:00.000Z');

interface Scenario {
  bookingStatus?: string;
  holdLive?: boolean;
  eventStatus?: string;
  coordinatorId?: string | null;
  eventMissing?: boolean;
  originalCancelled?: boolean;
  liveReplacement?: boolean;
  approvedReplacement?: boolean;
  openRecovery?: boolean;
  staffIds?: string[];
  readiness?: { live: number; outstanding: number };
}

const readRow = {
  id: bookingId, eventRequestId: eventId, eventName: 'Fair', eventStatus: 'APPROVED', venueId,
  venueName: 'Hall', status: 'CANCELLED', startsAt, endsAt, layout: null, notes: null, decidedBy: null,
  decidedAt: null, decisionReason: null, createdAt: startsAt, updatedAt: startsAt, eventStartsAt: null,
  eventEndsAt: null, purpose: null, description: null, expectedAttendance: null, venueRequirements: null,
  accessibilityNeeds: null, holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
  cancelledBy: coordinator.id, cancelledAt: startsAt, cancellationReason: 'Moved', recovery: [],
  replacesBookingId: null, replacedByBookingIds: null,
};

function fakePool(scenario: Scenario = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const client = {
    release: vi.fn(),
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (/^SELECT status, coordinator_id AS "coordinatorId" FROM event_requests/.test(sql)) {
        return { rows: scenario.eventMissing ? [] : [{ status: scenario.eventStatus ?? 'APPROVED',
          coordinatorId: scenario.coordinatorId === undefined ? coordinator.id : scenario.coordinatorId }] };
      }
      if (/FROM event_requests WHERE id = \$1 FOR UPDATE/.test(sql)) {
        return { rows: [{ id: eventId, organiserId: 'owner', coordinatorId: coordinator.id,
          status: scenario.eventStatus ?? 'APPROVED' }] };
      }
      if (/FROM venue_bookings WHERE id = \$1 FOR UPDATE/.test(sql)) {
        return { rows: [{ status: scenario.bookingStatus ?? 'APPROVED', eventRequestId: eventId, venueId,
          startsAt, endsAt, replacesBookingId: originalId,
          holdExpiresAt: scenario.bookingStatus === 'HELD' ? new Date('2026-11-30T00:00:00.000Z') : null }] };
      }
      if (/AS "holdLive"/.test(sql)) return { rows: [{ holdLive: scenario.holdLive ?? true }] };
      if (/FROM venues WHERE id = \$1 FOR UPDATE/.test(sql)) return { rows: [{ isActive: true }] };
      if (/AS booked/.test(sql)) return { rows: [{ withinHours: true, booked: false, held: false, blocked: false }] };
      if (/AS "explicitlyCancelled"\s+FROM venue_bookings WHERE id/.test(sql)) {
        return { rows: [{ eventRequestId: eventId, explicitlyCancelled: scenario.originalCancelled ?? true }] };
      }
      if (/WHERE b\.replaces_booking_id = \$1/.test(sql)) {
        return { rows: scenario.liveReplacement ? [{ id: 'live' }] : [] };
      }
      if (/AS "approvedReplacement"/.test(sql)) {
        return { rows: [{ explicitlyCancelled: scenario.originalCancelled ?? true,
          approvedReplacement: scenario.approvedReplacement ?? false }] };
      }
      if (/AS open/.test(sql)) return { rows: [{ open: scenario.openRecovery ?? true }] };
      if (/v\.capacity/.test(sql)) return { rows: [{ capacity: 100, opensAt: null, closesAt: null, attendance: 50 }] };
      if (/FROM app_users WHERE role = 'VENUE_STAFF'/.test(sql)) {
        return { rows: (scenario.staffIds ?? [staff.id]).map((id) => ({ id })) };
      }
      if (/AS "bookingId", v\.name AS "venueName"/.test(sql)) {
        return { rows: [{ eventId, eventName: 'Fair', bookingId, venueName: 'Hall', startsAt, endsAt }] };
      }
      if (/^\s*INSERT INTO venue_bookings/.test(sql)) return { rows: [{ id: bookingId }] };
      if (/AS live,/.test(sql)) return { rows: [scenario.readiness ?? { live: 0, outstanding: 0 }] };
      if (/FROM venue_bookings b JOIN/.test(sql)) {
        return { rows: [{ name: 'Fair', organiserId: 'owner', coordinatorId: coordinator.id, venueName: 'Hall' }] };
      }
      if (/FROM venue_booking_intervals b JOIN/.test(sql)) return { rows: [readRow] };
      return { rows: [] };
    }),
  };
  const pool = { connect: vi.fn(async () => client), query: client.query };
  const index = (pattern: RegExp) => calls.findIndex((call) => pattern.test(call.sql));
  const find = (pattern: RegExp) => calls.find((call) => pattern.test(call.sql));
  return { pool: pool as never, calls, index, find, wrote: (pattern: RegExp) => index(pattern) >= 0 };
}

const cancel = (pool: never, input: unknown = { reason: ' Moved ' }, actor = coordinator) =>
  cancelVenueArrangement({ pool }, { bookingId, actor, input });

describe('KAN-82 cancelling one arrangement (AC4, AC10, AC11)', () => {
  it.each(['PENDING', 'HELD', 'APPROVED'])('KAN-82-AC4 cancels a %s arrangement with the trimmed reason', async (status) => {
    const { pool, find, index } = fakePool({ bookingStatus: status });
    await expect(cancel(pool)).resolves.toMatchObject({ id: bookingId, status: 'CANCELLED', replacedByBookingIds: [] });
    const update = find(/SET status = 'CANCELLED', cancelled_by = \$2/)!;
    expect(update.params).toEqual([bookingId, coordinator.id, 'Moved']);
    // AC10: the booking row is locked before the event, matching the decision path.
    expect(index(/FROM venue_bookings WHERE id = \$1 FOR UPDATE/)).toBeLessThan(index(/FROM event_requests WHERE id = \$1 FOR UPDATE/));
    expect(index(/UPDATE venue_outage_impacts SET status = 'RESOLVED'/)).toBeGreaterThan(index(/SET status = 'CANCELLED'/));
    // AC11: the notice is written in the same transaction, after the change.
    expect(index(/INSERT INTO notifications/)).toBeGreaterThan(index(/SET status = 'CANCELLED'/));
  });

  it('KAN-82-AC4 accepts a confirmed event', async () => {
    await expect(cancel(fakePool({ eventStatus: 'CONFIRMED' }).pool)).resolves.toMatchObject({ status: 'CANCELLED' });
  });

  it.each([
    [{ bookingStatus: 'CANCELLED' }, 'BOOKING_ALREADY_CANCELLED'],
    [{ bookingStatus: 'HELD', holdLive: false }, 'HOLD_EXPIRED'],
    [{ bookingStatus: 'REJECTED' }, 'ARRANGEMENT_NOT_CANCELLABLE'],
    [{ bookingStatus: 'EXPIRED' }, 'ARRANGEMENT_NOT_CANCELLABLE'],
    [{ eventStatus: 'SUBMITTED' }, 'ARRANGEMENT_NOT_CANCELLABLE'],
    [{ eventStatus: 'CANCELLED' }, 'ARRANGEMENT_NOT_CANCELLABLE'],
    [{ coordinatorId: 'someone-else' }, 'VENUE_BOOKING_NOT_FOUND'],
    [{ coordinatorId: null }, 'VENUE_BOOKING_NOT_FOUND'],
    [{ eventStatus: 'DRAFT' }, 'VENUE_BOOKING_NOT_FOUND'],
    [{ eventMissing: true }, 'VENUE_BOOKING_NOT_FOUND'],
  ] as const)('KAN-82-AC10 refuses %j with %s and writes nothing', async (scenario, code) => {
    const { pool, wrote } = fakePool(scenario as Scenario);
    await expect(cancel(pool)).rejects.toMatchObject({ code });
    expect(wrote(/^\s*UPDATE venue_bookings/)).toBe(false);
    expect(wrote(/INSERT INTO notifications/)).toBe(false);
  });

  it('KAN-82-AC10 refuses other roles and invalid input before opening a transaction', async () => {
    const { pool } = fakePool();
    await expect(cancel(pool, { reason: 'x' }, staff)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(cancel(pool, { reason: '  ' })).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    await expect(cancel(pool, { reason: 'x', extra: 1 })).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    expect((pool as unknown as { connect: ReturnType<typeof vi.fn> }).connect).not.toHaveBeenCalled();
  });

  it('KAN-82-AC11 notifies the coordinator and every Venue Staff member with one key per booking', async () => {
    const { pool, find } = fakePool({ staffIds: [staff.id, 'staff-2'] });
    await cancel(pool);
    const insert = find(/INSERT INTO notifications/)!;
    expect(insert.params.filter((value) => value === 'VENUE_ARRANGEMENT_CANCELLED')).toHaveLength(3);
    expect(insert.params).toEqual(expect.arrayContaining([coordinator.id, staff.id, 'staff-2',
      `VENUE_ARRANGEMENT_CANCELLED:${bookingId}`]));
  });
});

describe('KAN-82 replacing a cancelled arrangement (AC5, AC6, AC11)', () => {
  const submission = { venueId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), replacesBookingId: originalId };
  const submit = (pool: never) => createVenueBooking({ pool }, { eventRequestId: eventId, actor: coordinator, input: submission });

  it('KAN-82-AC5/AC11 accepts a replacement for a cancelled original and notifies coordinator and staff', async () => {
    const { pool, find, wrote } = fakePool();
    await expect(submit(pool)).resolves.toMatchObject({ id: bookingId });
    expect(find(/^\s*INSERT INTO venue_bookings/)!.params.at(-1)).toBe(originalId);
    // Recovery is not needed for a cancelled original, but objective suitability still applies.
    expect(wrote(/AS open/)).toBe(false);
    expect(wrote(/v\.capacity/)).toBe(true);
    expect(find(/INSERT INTO notifications/)!.params).toContain('VENUE_REPLACEMENT_REQUESTED');
  });

  it('KAN-82-AC6 refuses a second live replacement and writes nothing', async () => {
    const { pool, wrote } = fakePool({ liveReplacement: true });
    await expect(submit(pool)).rejects.toMatchObject({ code: 'REPLACEMENT_IN_PROGRESS' });
    expect(wrote(/^\s*INSERT INTO venue_bookings/)).toBe(false);
  });

  it('KAN-81 recovery replacements keep their behaviour and send no KAN-82 notice', async () => {
    const { pool, wrote } = fakePool({ originalCancelled: false });
    await submit(pool);
    expect(wrote(/AS open/)).toBe(true);
    expect(wrote(/INSERT INTO notifications/)).toBe(false);
  });

  const decide = (pool: never) =>
    decideVenueBooking({ pool }, { bookingId, actor: staff, input: { decision: 'APPROVED' } });

  it('KAN-82-AC5 approves a replacement of a cancelled original without resolving or touching it', async () => {
    const { pool, wrote } = fakePool({ bookingStatus: 'PENDING' });
    await expect(decide(pool)).resolves.toMatchObject({ id: bookingId });
    expect(wrote(/AS open/)).toBe(false);
    expect(wrote(/UPDATE venue_outage_impacts/)).toBe(false);
  });

  it('KAN-82-AC10 refuses to approve when another replacement of the same original already holds the venue', async () => {
    const { pool, wrote } = fakePool({ bookingStatus: 'PENDING', approvedReplacement: true });
    await expect(decide(pool)).rejects.toMatchObject({ code: 'REPLACEMENT_NOT_NEEDED' });
    expect(wrote(/SET status = \$1, decided_by/)).toBe(false);
  });
});

describe('KAN-82-AC9 arrangement readiness', () => {
  it.each([
    [{ live: 2, outstanding: 0 }, { ready: true, live: 2, outstanding: 0 }],
    [{ live: 2, outstanding: 1 }, { ready: false, live: 2, outstanding: 1 }],
    [{ live: 0, outstanding: 0 }, { ready: false, live: 0, outstanding: 0 }],
  ])('derives %j as %j from current rows', async (counts, expected) => {
    const { pool, find } = fakePool({ readiness: counts });
    await expect(venueArrangementReadiness(pool, eventId)).resolves.toEqual(expected);
    expect(find(/AS live,/)!.params).toEqual([eventId, ['PENDING', 'HELD', 'APPROVED']]);
  });
});

describe('KAN-82 arrangement input and notices', () => {
  it('KAN-82-AC4 requires a trimmed nonempty reason and no other fields', () => {
    expect(parseArrangementCancellation({ reason: '  Moved  ' })).toEqual({ reason: 'Moved' });
    for (const input of [{}, { reason: '' }, { reason: '   ' }, { reason: 4 }, { reason: 'x'.repeat(5000) }, null, 'x']) {
      expect(() => parseArrangementCancellation(input)).toThrow();
    }
  });

  const ref = { eventId, eventName: '  Careers fair ', coordinatorId: coordinator.id, bookingId,
    venueName: 'Hall', startsAt, endsAt };

  it('KAN-82-AC11 keeps the new types out of the KAN-64 matrix and gives one row per recipient', () => {
    for (const type of ARRANGEMENT_NOTIFICATION_TYPES) expect(NOTIFICATION_TYPES).not.toContain(type as never);
    const notices = arrangementCancelledNotifications(ref, 'Too small', [staff.id, staff.id, coordinator.id]);
    expect(notices.map((item) => item.recipientId)).toEqual([coordinator.id, staff.id]);
    expect(notices[0]).toMatchObject({ type: 'VENUE_ARRANGEMENT_CANCELLED', venueBookingId: bookingId,
      dedupeKey: `VENUE_ARRANGEMENT_CANCELLED:${bookingId}` });
    expect(notices[0]!.message).toBe('You cancelled Hall for “Careers fair”, 1 Dec 2026, 10:00 to 1 Dec 2026, 14:00 '
      + '(Singapore time). Reason: Too small. The venue period was released; other arrangements are unchanged.');
    expect(arrangementCancelledNotifications({ ...ref, eventName: null }, 'Done!', [])[0]!.message)
      .toContain('for an untitled event, 1 Dec 2026');
    expect(arrangementCancelledNotifications(ref, 'Done!', [])[0]!.message).toContain('Reason: Done! The venue');
  });

  it('KAN-82-AC11 tells staff a replacement is waiting for review', () => {
    const notices = replacementRequestedNotifications(ref, [staff.id]);
    expect(notices.map((item) => [item.recipientId, item.title])).toEqual([
      [coordinator.id, 'Replacement venue requested'], [staff.id, 'Replacement venue requested'],
    ]);
    expect(notices[1]!.message).toContain('to replace a cancelled arrangement. Review it in Venue bookings.');
  });
});
