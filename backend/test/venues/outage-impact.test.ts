import { describe, expect, it, vi } from 'vitest';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { createVenueBlock, deleteVenueBlock, listVenueBlocks } from '../../src/modules/venues/block-service.js';
import {
  AFFECTED_BOOKING_CONDITION, BOOKING_RECOVERY_SQL, clearOutageImpacts, listRecoveryArrangements, parseRecoveryFilter, serializeRecovery,
  recordOutageImpacts,
} from '../../src/modules/venues/outage-impact.js';
import { outageRecoveryNotifications } from '../../src/modules/notifications/trigger-matrix.js';

const venueId = '10000000-0000-4000-8000-000000000001';
const blockId = '30000000-0000-4000-8000-000000000003';
const staff: WorkflowActor = { id: '20000000-0000-4000-8000-000000000002', role: 'VENUE_STAFF' };
const otherRoles = ['EVENT_COORDINATOR', 'EVENT_ORGANISER', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const;
const body = { startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T06:00:00.000Z', reason: 'Burst pipe' };

const impactRow = {
  impactId: 'impact-1', status: 'RECOVERY_REQUIRED', bookingId: 'booking-1', eventRequestId: 'event-1',
  eventName: 'Career fair', bookingStartsAt: new Date('2031-01-12T03:00:00Z'), bookingEndsAt: new Date('2031-01-12T05:00:00Z'),
};
const impact = { ...impactRow, bookingStartsAt: '2031-01-12T03:00:00.000Z', bookingEndsAt: '2031-01-12T05:00:00.000Z' };
const blockRow = {
  id: blockId, venueId, venueName: 'Hall A', startsAt: new Date(body.startsAt), endsAt: new Date(body.endsAt),
  reason: body.reason, createdBy: staff.id, createdAt: new Date('2031-01-01T00:00:00Z'),
};

interface Script {
  venue?: { isActive: boolean } | null; block?: { venueId: string } | null; deleted?: number; impacts?: unknown[];
  targets?: unknown[];
}

/** A fake transaction client that answers each statement by its text and records them all. */
function fakePool(script: Script = {}) {
  const statements: { sql: string; params: unknown[] }[] = [];
  const release = vi.fn();
  const answer = async (sql: string, params: unknown[] = []) => {
    statements.push({ sql, params });
    if (/FROM venues WHERE id = \$1 FOR UPDATE/.test(sql)) {
      return { rows: script.venue === null ? [] : [script.venue ?? { isActive: true }] };
    }
    if (/^SELECT venue_id AS "venueId" FROM venue_unavailability/.test(sql)) {
      return { rows: script.block === null ? [] : [script.block ?? { venueId }] };
    }
    if (/^INSERT INTO venue_unavailability/.test(sql.trim())) return { rows: [{ id: blockId }] };
    if (/AS "coordinatorId"/.test(sql)) return { rows: script.targets ?? [] };
    if (/^INSERT INTO notifications/.test(sql.trim())) return { rows: [], rowCount: 1 };
    if (/FROM venue_outage_impacts i/.test(sql)) return { rows: script.impacts ?? [impactRow] };
    if (/^UPDATE venue_outage_impacts/.test(sql.trim())) return { rows: [{ bookingId: 'b-2' }, { bookingId: 'b-1' }] };
    if (/^DELETE FROM venue_unavailability/.test(sql)) return { rows: [], rowCount: script.deleted ?? 1 };
    if (/FROM venue_unavailability u JOIN venues/.test(sql)) return { rows: [blockRow] };
    return { rows: [], rowCount: 1 };
  };
  const client = { release, query: vi.fn(answer) };
  const pool = { connect: vi.fn(async () => client), query: vi.fn(answer) };
  return { pool: pool as never, rawPool: pool, client: client as never, statements, release };
}

const sqlOf = <T extends { sql: string }>(statements: T[], pattern: RegExp) =>
  statements.find((s) => pattern.test(s.sql.trim()));

describe('KAN-81 outage impact rules', () => {
  it('uses half-open overlap on non-ended approved bookings at the same venue (AC3)', () => {
    expect(AFFECTED_BOOKING_CONDITION).toMatch(/b\.venue_id = \$1/);
    expect(AFFECTED_BOOKING_CONDITION).toMatch(/b\.status = 'APPROVED'/);
    expect(AFFECTED_BOOKING_CONDITION).toMatch(/b\.ends_at > now\(\)/);
    expect(AFFECTED_BOOKING_CONDITION).toMatch(/b\.starts_at < \$3 AND b\.ends_at > \$2/);
  });

  it('records impacts idempotently for the saved outage and returns them serialised (AC3, AC11)', async () => {
    const { client, statements } = fakePool();
    const affected = await recordOutageImpacts(client, {
      blockId, venueId, startsAt: body.startsAt, endsAt: body.endsAt, reason: body.reason, actorId: staff.id,
    });
    const insert = sqlOf(statements, /^INSERT INTO venue_outage_impacts/)!;
    expect(insert.sql).toContain('ON CONFLICT (unavailability_id, venue_booking_id)');
    expect(insert.sql).toContain('DO NOTHING');
    expect(insert.params).toEqual([venueId, body.startsAt, body.endsAt, blockId, body.reason, staff.id]);
    expect(affected).toEqual([impact]);
  });

  it('clears only open flags for the removed outage and returns the booking IDs in order (AC11)', async () => {
    const { client, statements } = fakePool();
    expect(await clearOutageImpacts(client, blockId)).toEqual(['b-1', 'b-2']);
    const update = sqlOf(statements, /^UPDATE venue_outage_impacts/)!;
    expect(update.sql).toContain("SET status = 'CLEARED'");
    expect(update.sql).toContain("status = 'RECOVERY_REQUIRED'");
    expect(update.params).toEqual([blockId]);
  });
});

describe('KAN-81 creating an outage over approved bookings', () => {
  it('saves the outage, flags affected arrangements in the same transaction and returns them (AC2-AC4)', async () => {
    const { pool, statements, release } = fakePool();
    const saved = await createVenueBlock({ pool }, { actor: staff, venueId, input: body });

    expect(saved).toMatchObject({ id: blockId, venueId, reason: body.reason, affected: [impact] });
    expect(statements[0]!.sql).toMatch(/^BEGIN/);
    expect(statements.at(-1)!.sql).toBe('COMMIT');
    const order = ['FOR UPDATE', 'INSERT INTO venue_unavailability', 'INSERT INTO venue_outage_impacts']
      .map((text) => statements.findIndex((s) => s.sql.includes(text)));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(statements.some((s) => /UPDATE venue_bookings/.test(s.sql))).toBe(false);
    expect(statements.some((s) => /EXISTS\(SELECT 1 FROM venue_bookings/.test(s.sql))).toBe(false);
    expect(release).toHaveBeenCalledOnce();
  });

  it('refuses a missing or inactive venue and writes nothing (AC1)', async () => {
    for (const [venue, code] of [[null, 'VENUE_NOT_FOUND'], [{ isActive: false }, 'VENUE_INACTIVE']] as const) {
      const { pool, statements } = fakePool({ venue });
      await expect(createVenueBlock({ pool }, { actor: staff, venueId, input: body })).rejects.toMatchObject({ code });
      expect(sqlOf(statements, /^INSERT/)).toBeUndefined();
      expect(statements.at(-1)!.sql).toBe('ROLLBACK');
    }
  });

  it.each(otherRoles)('refuses %s before opening a connection (AC1)', async (role) => {
    const { pool, rawPool } = fakePool();
    await expect(createVenueBlock({ pool }, { actor: { ...staff, role }, venueId, input: body }))
      .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
    expect(rawPool.connect).not.toHaveBeenCalled();
  });

  it('refuses an invalid period or blank reason before opening a connection (AC1)', async () => {
    const { pool, rawPool } = fakePool();
    await expect(createVenueBlock({ pool }, { actor: staff, venueId, input: { ...body, endsAt: body.startsAt } }))
      .rejects.toMatchObject({ code: 'INVALID_BLOCK_PERIOD' });
    await expect(createVenueBlock({ pool }, { actor: staff, venueId, input: { ...body, reason: '   ' } }))
      .rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    expect(rawPool.connect).not.toHaveBeenCalled();
  });

  it('lists each block with its affected arrangements', async () => {
    const { pool } = fakePool();
    expect(await listVenueBlocks({ pool }, { actor: staff, venueId }))
      .toEqual([expect.objectContaining({ id: blockId, affected: [impact] })]);
  });
});

describe('KAN-81 removing an outage', () => {
  it('locks the venue, clears this outage’s flags, deletes the block and reports cleared bookings (AC11)', async () => {
    const { pool, statements } = fakePool();
    expect(await deleteVenueBlock({ pool }, { actor: staff, blockId })).toEqual({ clearedBookingIds: ['b-1', 'b-2'] });
    const order = ['FOR UPDATE', 'UPDATE venue_outage_impacts', 'DELETE FROM venue_unavailability']
      .map((text) => statements.findIndex((s) => s.sql.includes(text)));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(statements.at(-1)!.sql).toBe('COMMIT');
  });

  it.each([[{ block: null }], [{ deleted: 0 }]] as const)('reports a missing block and rolls back: %j', async (script) => {
    const { pool, statements } = fakePool(script);
    await expect(deleteVenueBlock({ pool }, { actor: staff, blockId })).rejects.toMatchObject({ code: 'VENUE_BLOCK_NOT_FOUND' });
    expect(statements.at(-1)!.sql).toBe('ROLLBACK');
  });

  it.each(otherRoles)('refuses %s before any query', async (role) => {
    const { pool, rawPool } = fakePool();
    await expect(deleteVenueBlock({ pool }, { actor: { ...staff, role }, blockId })).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
    expect(rawPool.connect).not.toHaveBeenCalled();
  });
});

describe('KAN-81 venue recovery list (Venue Staff side of AC6/AC12)', () => {
  const recoveryRow = {
    ...impactRow, blockId, venueId, venueName: 'Hall A', outageReason: 'Burst pipe',
    outageStartsAt: new Date(body.startsAt), outageEndsAt: new Date(body.endsAt),
  };

  it('lists arrangements with outage details and ISO timestamps, passing the status filter', async () => {
    const { pool, statements } = fakePool({ impacts: [recoveryRow] });
    expect(await listRecoveryArrangements({ pool }, { actor: staff, status: 'RECOVERY_REQUIRED' })).toEqual([{
      ...impact, blockId, venueId, venueName: 'Hall A', outageReason: 'Burst pipe',
      outageStartsAt: body.startsAt, outageEndsAt: body.endsAt,
    }]);
    expect(statements[0]!.params).toEqual(['RECOVERY_REQUIRED']);
    await listRecoveryArrangements({ pool }, { actor: staff, status: undefined });
    expect(statements[1]!.params).toEqual([null]);
  });

  it.each(otherRoles)('refuses %s before any query (AC6)', async (role) => {
    const { pool, rawPool } = fakePool();
    await expect(listRecoveryArrangements({ pool }, { actor: { ...staff, role }, status: undefined }))
      .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
    expect(rawPool.query).not.toHaveBeenCalled();
  });

  it.each(['RECOVERY_REQUIRED', 'RESOLVED', 'CLEARED'])('accepts the %s filter', (status) => {
    expect(parseRecoveryFilter({ status })).toBe(status);
  });

  it('treats no filter as all arrangements', () => {
    expect(parseRecoveryFilter({})).toBeUndefined();
  });

  it.each([{ status: 'OPEN' }, { status: ['CLEARED'] }, { status: '' }, { venueId }])('refuses the filter %j', (query) => {
    expect(() => parseRecoveryFilter(query)).toThrow(expect.objectContaining({ code: 'INVALID_RECOVERY_FILTER' }));
  });
});

describe('KAN-81 phase 2: coordinator notification and booking recovery state (AC5, AC6)', () => {
  const target = (overrides: Record<string, unknown> = {}) => ({
    eventId: 'event-1', eventName: 'Career fair', organiserId: 'organiser-1', coordinatorId: 'coordinator-1',
    bookingId: 'booking-1', venueName: 'Hall A',
    bookingStartsAt: new Date('2031-01-12T03:00:00Z'), bookingEndsAt: new Date('2031-01-12T04:00:00Z'), ...overrides,
  });
  const outage = { blockId, startsAt: body.startsAt, endsAt: body.endsAt, reason: 'Burst pipe' };

  it('builds one notice per affected event for its current coordinator, linked to the first booking (AC5)', () => {
    const notices = outageRecoveryNotifications([
      target(), target({ bookingId: 'booking-2', bookingStartsAt: '2031-01-12T05:00:00Z', bookingEndsAt: '2031-01-12T05:30:00Z' }),
      target({ eventId: 'event-2', eventName: null, coordinatorId: 'coordinator-2', bookingId: 'booking-3' }),
      target({ eventId: 'event-3', coordinatorId: null, bookingId: 'booking-4' }),
    ], outage);

    expect(notices.map((n) => [n.recipientId, n.eventRequestId, n.venueBookingId, n.dedupeKey])).toEqual([
      ['coordinator-1', 'event-1', 'booking-1', `VENUE_OUTAGE_RECOVERY_REQUIRED:${blockId}:event-1`],
      ['coordinator-2', 'event-2', 'booking-3', `VENUE_OUTAGE_RECOVERY_REQUIRED:${blockId}:event-2`],
    ]);
    expect(notices.every((n) => n.type === 'VENUE_OUTAGE_RECOVERY_REQUIRED')).toBe(true);
    expect(notices[0]!.title).toBe('Venue unavailable: replacement needed');
    expect(notices[0]!.message).toBe(
      'Hall A is unavailable 12 Jan 2031, 10:00 to 12 Jan 2031, 14:00 (Singapore time). Reason: Burst pipe. '
      + 'This affects the approved bookings for “Career fair” at 12 Jan 2031, 11:00 to 12 Jan 2031, 12:00 (Singapore time); '
      + '12 Jan 2031, 13:00 to 12 Jan 2031, 13:30 (Singapore time). '
      + 'The event and its other arrangements are unchanged. Open the booking to arrange a replacement venue.',
    );
    expect(notices[1]!.message).toContain('approved booking for an untitled event request at');
  });

  it('builds nothing when no affected event has a coordinator', () => {
    expect(outageRecoveryNotifications([target({ coordinatorId: null })], outage)).toEqual([]);
    expect(outageRecoveryNotifications([], outage)).toEqual([]);
  });

  it('writes the notices in the outage transaction, after the impacts and before commit (AC5)', async () => {
    const { pool, statements } = fakePool({ targets: [target()] });
    await createVenueBlock({ pool }, { actor: staff, venueId, input: body });
    const order = ['INSERT INTO venue_outage_impacts', 'AS "coordinatorId"', 'INSERT INTO notifications']
      .map((text) => statements.findIndex((s) => s.sql.includes(text)));
    expect(order.every((index) => index > 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(sqlOf(statements, /AS "coordinatorId"/)!.params).toEqual([blockId]);
    expect(sqlOf(statements, /^INSERT INTO notifications/)!.params).toContain(
      `VENUE_OUTAGE_RECOVERY_REQUIRED:${blockId}:event-1`);
    expect(statements.at(-1)!.sql).toBe('COMMIT');
  });

  it('writes no notification when the outage affects no coordinated event', async () => {
    const { pool, statements } = fakePool({ targets: [] });
    await createVenueBlock({ pool }, { actor: staff, venueId, input: body });
    expect(sqlOf(statements, /^INSERT INTO notifications/)).toBeUndefined();
  });

  it('serialises a booking’s recovery list with ISO timestamps (AC6)', () => {
    expect(serializeRecovery([{
      impactId: 'i-1', status: 'RECOVERY_REQUIRED', outageStartsAt: '2031-01-12 10:00:00+08',
      outageEndsAt: '2031-01-12 14:00:00+08', outageReason: 'Burst pipe',
    }])).toEqual([{
      impactId: 'i-1', status: 'RECOVERY_REQUIRED', outageStartsAt: '2031-01-12T02:00:00.000Z',
      outageEndsAt: '2031-01-12T06:00:00.000Z', outageReason: 'Burst pipe',
    }]);
    expect(BOOKING_RECOVERY_SQL).toContain('WHERE i.venue_booking_id = b.id');
  });
});
