import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { listVenueAvailability } from '../../../backend/src/modules/venues/availability.js';
import { createVenueBlock, deleteVenueBlock, listVenueBlocks } from '../../../backend/src/modules/venues/block-service.js';
import { createVenueBooking, decideVenueBooking, getVenueBooking, listVenueBookings } from '../../../backend/src/modules/venues/booking-service.js';
import { listNotifications } from '../../../backend/src/modules/notifications/inbox.js';
import { recordNotifications } from '../../../backend/src/modules/notifications/notify.js';
import { outageRecoveryNotifications } from '../../../backend/src/modules/notifications/trigger-matrix.js';
import { listOutageNotificationTargets, listRecoveryArrangements, recordOutageImpacts } from '../../../backend/src/modules/venues/outage-impact.js';
import { parseVenueSearchQuery, searchVenues } from '../../../backend/src/modules/venues/venue-search.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let staff: WorkflowActor;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  staff = await fixture.createUser('VENUE_STAFF');
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
});
afterAll(async () => { await fixture?.destroy(); });

// Singapore 12 January 2031: the outage covers 10:00-14:00 (02:00-06:00 UTC).
const at = (time: string) => `2031-01-12T${time}:00.000Z`;
const outage = { startsAt: at('02:00'), endsAt: at('06:00'), reason: 'Burst pipe' };

async function venue() {
  const id = randomUUID();
  await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)', [id, `Venue ${id}`]);
  return id;
}

async function booking(venueId: string, startsAt: string, endsAt: string, status = 'APPROVED') {
  const eventRequestId = await fixture.createEvent({
    organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED',
  });
  const id = randomUUID();
  const decided = status === 'APPROVED' || status === 'REJECTED';
  await fixture.pool.query(`INSERT INTO venue_bookings
    (id,event_request_id,venue_id,requested_by,status,starts_at,ends_at,decided_by,decided_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
  [id, eventRequestId, venueId, coordinator.id, status, startsAt, endsAt,
    decided ? staff.id : null, decided ? new Date() : null]);
  return { id, eventRequestId };
}

const create = (venueId: string, overrides: Partial<typeof outage> = {}, actor = staff) =>
  createVenueBlock(fixture.dependencies, { actor, venueId, input: { ...outage, ...overrides } });
const impacts = async (bookingId: string) => (await fixture.pool.query(
  `SELECT status, unavailability_id, outage_starts_at, outage_ends_at, outage_reason
   FROM venue_outage_impacts WHERE venue_booking_id = $1 ORDER BY created_at, id`, [bookingId])).rows;
const bookingRow = async (id: string) =>
  (await fixture.pool.query('SELECT * FROM venue_bookings WHERE id = $1', [id])).rows[0];

describe('KAN-81 saving an outage over approved arrangements against PostgreSQL', () => {
  it('saves the outage and flags exactly the overlapping non-ended approved bookings (AC2, AC3)', async () => {
    const venueId = await venue();
    const otherVenue = await venue();
    const inside = await booking(venueId, at('03:00'), at('04:00'));
    const straddling = await booking(venueId, at('05:00'), at('07:00'));
    const before = await booking(venueId, at('00:00'), at('02:00'));
    const after = await booking(venueId, at('07:00'), at('08:00'));
    const elsewhere = await booking(otherVenue, at('03:00'), at('04:00'));
    const pending = await booking(venueId, at('03:30'), at('04:30'), 'PENDING');
    const rejected = await booking(venueId, at('03:30'), at('04:30'), 'REJECTED');
    const cancelled = await booking(venueId, at('03:30'), at('04:30'), 'CANCELLED');

    const saved = await create(venueId);

    expect(saved.affected.map((item) => item.bookingId)).toEqual([inside.id, straddling.id]);
    expect(saved.affected.every((item) => item.status === 'RECOVERY_REQUIRED')).toBe(true);
    expect(saved.affected[0]).toMatchObject({ eventRequestId: inside.eventRequestId, bookingStartsAt: at('03:00') });
    for (const untouched of [before, after, elsewhere, pending, rejected, cancelled]) {
      expect(await impacts(untouched.id)).toEqual([]);
    }
  });

  it('treats a booking that ends exactly when the outage starts, or starts when it ends, as unaffected', async () => {
    const venueId = await venue();
    const endsAtStart = await booking(venueId, at('01:00'), at('02:00'));
    const startsAtEnd = await booking(venueId, at('06:00'), at('07:00'));
    const saved = await create(venueId);
    expect(saved.affected).toEqual([]);
    expect(await impacts(endsAtStart.id)).toEqual([]);
    expect(await impacts(startsAtEnd.id)).toEqual([]);
  });

  it('does not flag an approved booking that has already ended', async () => {
    const venueId = await venue();
    const ended = await booking(venueId, '2020-01-01T02:00:00.000Z', '2020-01-01T04:00:00.000Z');
    const saved = await create(venueId, { startsAt: '2020-01-01T01:00:00.000Z', endsAt: '2020-01-01T05:00:00.000Z' });
    expect(saved.affected).toEqual([]);
    expect(await impacts(ended.id)).toEqual([]);
  });

  it('keeps the booking, its event and decision history unchanged while marking recovery (AC4)', async () => {
    const venueId = await venue();
    const affected = await booking(venueId, at('03:00'), at('04:00'));
    const bookingBefore = await bookingRow(affected.id);
    const eventBefore = await fixture.eventRow(affected.eventRequestId);
    const historyBefore = await fixture.history(affected.eventRequestId);

    await create(venueId);

    expect(await bookingRow(affected.id)).toEqual(bookingBefore);
    expect(await fixture.eventRow(affected.eventRequestId)).toEqual(eventBefore);
    expect(await fixture.history(affected.eventRequestId)).toEqual(historyBefore);
    expect(await impacts(affected.id)).toEqual([expect.objectContaining({
      status: 'RECOVERY_REQUIRED', outage_reason: 'Burst pipe',
      outage_starts_at: new Date(outage.startsAt), outage_ends_at: new Date(outage.endsAt),
    })]);
  });

  it('shows the affected arrangements on the venue block list and the staff recovery list (AC6, AC12)', async () => {
    const venueId = await venue();
    const affected = await booking(venueId, at('03:00'), at('04:00'));
    const saved = await create(venueId);

    const blocks = await listVenueBlocks(fixture.dependencies, { actor: staff, venueId });
    expect(blocks).toEqual([expect.objectContaining({ id: saved.id, affected: saved.affected })]);
    const open = await listRecoveryArrangements(fixture.dependencies, { actor: staff, status: 'RECOVERY_REQUIRED' });
    expect(open.find((item) => item.bookingId === affected.id)).toMatchObject({
      blockId: saved.id, venueId, outageReason: 'Burst pipe', outageStartsAt: outage.startsAt, status: 'RECOVERY_REQUIRED',
    });
    await expect(listRecoveryArrangements(fixture.dependencies, { actor: coordinator, status: undefined }))
      .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'refuses an outage from %s and writes nothing (AC1)', async (role) => {
      const venueId = await venue();
      const affected = await booking(venueId, at('03:00'), at('04:00'));
      const actor = await fixture.createUser(role);
      await expect(create(venueId, {}, actor)).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      expect(await impacts(affected.id)).toEqual([]);
      expect((await fixture.pool.query('SELECT count(*)::int AS n FROM venue_unavailability WHERE venue_id = $1',
        [venueId])).rows[0].n).toBe(0);
    },
  );

  it.each([
    [{ endsAt: outage.startsAt }, 'INVALID_BLOCK_PERIOD'],
    [{ startsAt: 'not-a-date' }, 'INVALID_INPUT'],
    [{ reason: '   ' }, undefined],
  ] as const)('refuses invalid input %j with no partial write (AC1)', async (overrides, code) => {
    const venueId = await venue();
    const affected = await booking(venueId, at('03:00'), at('04:00'));
    const refusal = create(venueId, overrides as Partial<typeof outage>);
    await expect(refusal).rejects.toMatchObject(code ? { code } : { kind: 'INVALID_INPUT' });
    expect(await impacts(affected.id)).toEqual([]);
  });

  it('records each booking once however often an outage is processed, and nothing on rollback (AC11)', async () => {
    const venueId = await venue();
    const affected = await booking(venueId, at('03:00'), at('04:00'));
    const saved = await create(venueId);
    const reprocess = { blockId: saved.id, venueId, ...outage, actorId: staff.id };
    await recordOutageImpacts(fixture.pool, reprocess);
    await recordOutageImpacts(fixture.pool, reprocess);
    expect(await impacts(affected.id)).toHaveLength(1);

    const second = await venue();
    const rolledBack = await booking(second, at('03:00'), at('04:00'));
    const client = await fixture.pool.connect();
    try {
      await client.query('BEGIN');
      const block = await client.query<{ id: string }>(
        `INSERT INTO venue_unavailability (venue_id, starts_at, ends_at, reason) VALUES ($1,$2,$3,'Gas leak') RETURNING id`,
        [second, outage.startsAt, outage.endsAt]);
      await recordOutageImpacts(client, { blockId: block.rows[0]!.id, venueId: second, ...outage, actorId: staff.id });
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    expect(await impacts(rolledBack.id)).toEqual([]);
  });
});

describe('KAN-81 removing an outage against PostgreSQL (AC11)', () => {
  it('clears only that outage’s flags, keeps the history and leaves other outages’ flags open', async () => {
    const venueId = await venue();
    const affected = await booking(venueId, at('03:00'), at('04:00'));
    const first = await create(venueId);
    const second = await create(venueId, { startsAt: at('03:30'), endsAt: at('05:00'), reason: 'Power fault' });
    const bookingBefore = await bookingRow(affected.id);

    expect(await deleteVenueBlock(fixture.dependencies, { actor: staff, blockId: first.id }))
      .toEqual({ clearedBookingIds: [affected.id] });

    expect(await impacts(affected.id)).toEqual([
      expect.objectContaining({ status: 'CLEARED', unavailability_id: null, outage_reason: 'Burst pipe' }),
      expect.objectContaining({ status: 'RECOVERY_REQUIRED', unavailability_id: second.id, outage_reason: 'Power fault' }),
    ]);
    expect(await bookingRow(affected.id)).toEqual(bookingBefore);

    expect(await deleteVenueBlock(fixture.dependencies, { actor: staff, blockId: second.id }))
      .toEqual({ clearedBookingIds: [affected.id] });
    expect((await impacts(affected.id)).map((row) => row.status)).toEqual(['CLEARED', 'CLEARED']);
    expect((await fixture.pool.query('SELECT status FROM venue_bookings WHERE id = $1', [affected.id])).rows[0].status)
      .toBe('APPROVED');
  });

  it('reports a block that no longer exists without changing anything', async () => {
    await expect(deleteVenueBlock(fixture.dependencies, { actor: staff, blockId: randomUUID() }))
      .rejects.toMatchObject({ code: 'VENUE_BLOCK_NOT_FOUND' });
  });
});

describe('KAN-81 outage effects on planning and approval (AC9, AC10)', () => {
  it('excludes the venue from calendar, search, new requests and approval immediately (AC9)', async () => {
    const venueId = await venue();
    const pending = await booking(venueId, at('03:00'), at('04:00'), 'PENDING');
    const target = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED' });
    await create(venueId);

    const calendar = await listVenueAvailability(fixture.dependencies, staff, { from: at('00:00'), to: at('12:00') });
    expect(calendar.find((entry) => entry.id === venueId)!.unavailable)
      .toEqual([expect.objectContaining({ kind: 'BLOCKED', reason: 'Burst pipe' })]);
    const found = await searchVenues(fixture.dependencies, coordinator,
      parseVenueSearchQuery({ startsAt: at('03:00'), endsAt: at('04:00') }));
    expect(found.some((result) => result.id === venueId)).toBe(false);
    await expect(createVenueBooking(fixture.dependencies, {
      eventRequestId: target, actor: coordinator, input: { venueId, startsAt: at('03:00'), endsAt: at('04:00') },
    })).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    await expect(decideVenueBooking(fixture.dependencies, {
      bookingId: pending.id, actor: staff, input: { decision: 'APPROVED' },
    })).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
  });

  it('flags a booking approved before the outage was saved (AC10)', async () => {
    const venueId = await venue();
    const pending = await booking(venueId, at('03:00'), at('04:00'), 'PENDING');
    await decideVenueBooking(fixture.dependencies, { bookingId: pending.id, actor: staff, input: { decision: 'APPROVED' } });
    const saved = await create(venueId);
    expect(saved.affected.map((item) => item.bookingId)).toEqual([pending.id]);
  });

  it('refuses an approval that waited on an outage holding the venue lock (AC10)', async () => {
    const venueId = await venue();
    const pending = await booking(venueId, at('03:00'), at('04:00'), 'PENDING');
    const writer = await fixture.pool.connect();
    let attempt: Promise<unknown> | undefined;
    try {
      await writer.query('BEGIN');
      await writer.query('SELECT id FROM venues WHERE id = $1 FOR UPDATE', [venueId]);
      attempt = decideVenueBooking(fixture.dependencies, { bookingId: pending.id, actor: staff, input: { decision: 'APPROVED' } })
        .catch((error: unknown) => error);
      await expect.poll(async () => (await fixture.pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity
         WHERE application_name = current_schema() AND wait_event_type = 'Lock'`)).rows[0]!.n, { timeout: 3000 })
        .toBeGreaterThan(0);
      await writer.query(`INSERT INTO venue_unavailability (venue_id, starts_at, ends_at, reason)
        VALUES ($1, $2, $3, 'Committed while approval waited')`, [venueId, outage.startsAt, outage.endsAt]);
      await writer.query('COMMIT');
    } finally {
      writer.release();
    }
    expect(await attempt).toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    expect((await bookingRow(pending.id)).status).toBe('PENDING');
  });
});

describe('KAN-81 phase 2: coordinator notice and recovery view against PostgreSQL (AC5, AC6)', () => {
  it('notifies each affected event’s current coordinator once, in the outage transaction (AC5)', async () => {
    const venueId = await venue();
    const first = await booking(venueId, at('03:00'), at('04:00'));
    const second = await booking(venueId, at('05:00'), at('05:30'));
    const saved = await create(venueId);

    for (const affected of [first, second]) {
      expect(await fixture.notifications(affected.eventRequestId)).toEqual([
        expect.objectContaining({ recipient_id: coordinator.id, type: 'VENUE_OUTAGE_RECOVERY_REQUIRED' }),
      ]);
    }
    const stored = await fixture.pool.query(
      `SELECT venue_booking_id, dedupe_key FROM notifications WHERE event_request_id = $1`, [first.eventRequestId]);
    expect(stored.rows).toEqual([{
      venue_booking_id: first.id, dedupe_key: `VENUE_OUTAGE_RECOVERY_REQUIRED:${saved.id}:${first.eventRequestId}`,
    }]);
    const [notice] = await fixture.notifications(first.eventRequestId);
    expect(notice!.message).toContain('Reason: Burst pipe');
  });

  it('sends nothing for an outage that affects no booking, and nothing twice when reprocessed', async () => {
    const venueId = await venue();
    const unaffected = await booking(venueId, at('07:00'), at('08:00'));
    await create(venueId);
    expect(await fixture.notifications(unaffected.eventRequestId)).toEqual([]);

    // A second venue: approved bookings cannot be inserted into the first venue's blocked period.
    const secondVenue = await venue();
    const affected = await booking(secondVenue, at('03:00'), at('04:00'));
    const saved = await create(secondVenue, { startsAt: at('02:30'), endsAt: at('03:30'), reason: 'Gas leak' });
    const again = outageRecoveryNotifications(await listOutageNotificationTargets(fixture.pool, saved.id),
      { blockId: saved.id, startsAt: at('02:30'), endsAt: at('03:30'), reason: 'Gas leak' });
    expect(await recordNotifications(fixture.pool, again)).toBe(0);
    expect(await fixture.notifications(affected.eventRequestId)).toHaveLength(1);
  });

  it('shows the recovery state to the assigned coordinator and Venue Staff, and to no one else (AC6)', async () => {
    const venueId = await venue();
    const affected = await booking(venueId, at('03:00'), at('04:00'));
    const saved = await create(venueId);
    const expected = [{
      impactId: saved.affected[0]!.impactId, status: 'RECOVERY_REQUIRED',
      outageStartsAt: outage.startsAt, outageEndsAt: outage.endsAt, outageReason: 'Burst pipe',
    }];

    expect((await getVenueBooking(fixture.dependencies, { bookingId: affected.id, actor: coordinator })).recovery)
      .toEqual(expected);
    expect((await getVenueBooking(fixture.dependencies, { bookingId: affected.id, actor: staff })).recovery)
      .toEqual(expected);
    const listed = await listVenueBookings(fixture.dependencies, { actor: coordinator, eventRequestId: affected.eventRequestId });
    expect(listed.map((item) => item.recovery)).toEqual([expected]);
    const other = await fixture.createUser('EVENT_COORDINATOR');
    await expect(getVenueBooking(fixture.dependencies, { bookingId: affected.id, actor: other }))
      .rejects.toMatchObject({ code: 'VENUE_BOOKING_NOT_FOUND' });
  });

  it('links the coordinator’s inbox notice to the protected booking page (AC5, AC6)', async () => {
    const venueId = await venue();
    const affected = await booking(venueId, at('03:00'), at('04:00'));
    await create(venueId);
    const inbox = await listNotifications(fixture.dependencies, coordinator);
    expect(inbox.find((item) => item.booking?.id === affected.id)).toMatchObject({
      type: 'VENUE_OUTAGE_RECOVERY_REQUIRED', link: `/venue-bookings/${affected.id}`,
    });
  });

  it('shows a removed outage as cleared on the booking, without deleting the notice', async () => {
    const venueId = await venue();
    const affected = await booking(venueId, at('03:00'), at('04:00'));
    const saved = await create(venueId);
    await deleteVenueBlock(fixture.dependencies, { actor: staff, blockId: saved.id });
    expect((await getVenueBooking(fixture.dependencies, { bookingId: affected.id, actor: coordinator })).recovery)
      .toEqual([expect.objectContaining({ status: 'CLEARED' })]);
    expect(await fixture.notifications(affected.eventRequestId)).toHaveLength(1);
  });
});

describe('KAN-81 phase 3: replacement bookings against PostgreSQL (AC7, AC8)', () => {
  /** An approved booking at venue A affected by an outage, plus a free replacement venue B. */
  async function affectedArrangement() {
    const venueA = await venue();
    const venueB = await venue();
    const original = await booking(venueA, at('03:00'), at('04:00'));
    await create(venueA);
    return { venueA, venueB, original };
  }
  const requestReplacement = (eventRequestId: string, venueId: string, replacesBookingId: string, actor = coordinator) =>
    createVenueBooking(fixture.dependencies, {
      eventRequestId, actor, input: { venueId, startsAt: at('03:00'), endsAt: at('04:00'), replacesBookingId },
    });
  const approve = (bookingId: string) =>
    decideVenueBooking(fixture.dependencies, { bookingId, actor: staff, input: { decision: 'APPROVED' } });
  const impactStatuses = async (bookingId: string) => (await impacts(bookingId)).map((row) => row.status);

  it('records a pending replacement linked to the affected original, leaving the original as it was (AC7)', async () => {
    const { venueB, original } = await affectedArrangement();
    const replacement = await requestReplacement(original.eventRequestId, venueB, original.id);
    expect(replacement).toMatchObject({ status: 'PENDING', venueId: venueB, replacesBookingId: original.id });
    expect((await bookingRow(original.id)).status).toBe('APPROVED');
    expect(await impactStatuses(original.id)).toEqual(['RECOVERY_REQUIRED']);
  });

  it('approves the replacement, resolves the recovery and cancels the original while keeping its history (AC8)', async () => {
    const { venueB, original } = await affectedArrangement();
    const replacement = await requestReplacement(original.eventRequestId, venueB, original.id);
    const approved = await approve(replacement.id);
    expect(approved.status).toBe('APPROVED');
    expect(await bookingRow(original.id)).toMatchObject({ status: 'CANCELLED', decided_by: staff.id });
    expect(await impactStatuses(original.id)).toEqual(['RESOLVED']);
    const resolved = await listRecoveryArrangements(fixture.dependencies, { actor: staff, status: 'RESOLVED' });
    expect(resolved.some((item) => item.bookingId === original.id)).toBe(true);
  });

  it('leaves recovery open after a rejected replacement and accepts another attempt (AC8)', async () => {
    const { venueB, original } = await affectedArrangement();
    const first = await requestReplacement(original.eventRequestId, venueB, original.id);
    await decideVenueBooking(fixture.dependencies, { bookingId: first.id, actor: staff, input: { decision: 'REJECTED', reason: 'Too small' } });
    expect((await bookingRow(original.id)).status).toBe('APPROVED');
    expect(await impactStatuses(original.id)).toEqual(['RECOVERY_REQUIRED']);

    const second = await requestReplacement(original.eventRequestId, venueB, original.id);
    await approve(second.id);
    expect(await impactStatuses(original.id)).toEqual(['RESOLVED']);
  });

  it('refuses a second replacement once the original is resolved, at request and at approval (AC8)', async () => {
    const { venueB, original } = await affectedArrangement();
    const venueC = await venue();
    const first = await requestReplacement(original.eventRequestId, venueB, original.id);
    const second = await requestReplacement(original.eventRequestId, venueC, original.id);
    await approve(first.id);
    await expect(approve(second.id)).rejects.toMatchObject({ code: 'REPLACEMENT_NOT_NEEDED' });
    expect((await bookingRow(second.id)).status).toBe('PENDING');
    await expect(requestReplacement(original.eventRequestId, venueC, original.id))
      .rejects.toMatchObject({ code: 'REPLACEMENT_NOT_NEEDED' });
  });

  it('refuses to approve a replacement after its outage was removed (AC8, AC11)', async () => {
    const { venueA, venueB, original } = await affectedArrangement();
    const replacement = await requestReplacement(original.eventRequestId, venueB, original.id);
    const [block] = await listVenueBlocks(fixture.dependencies, { actor: staff, venueId: venueA });
    await deleteVenueBlock(fixture.dependencies, { actor: staff, blockId: block!.id });
    await expect(approve(replacement.id)).rejects.toMatchObject({ code: 'REPLACEMENT_NOT_NEEDED' });
    expect((await bookingRow(original.id)).status).toBe('APPROVED');
  });

  it('lets exactly one of two concurrent replacement approvals win (AC8, AC10)', async () => {
    const { venueB, original } = await affectedArrangement();
    const venueC = await venue();
    const first = await requestReplacement(original.eventRequestId, venueB, original.id);
    const second = await requestReplacement(original.eventRequestId, venueC, original.id);
    const results = await Promise.allSettled([approve(first.id), approve(second.id)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason)
      .toMatchObject({ code: 'REPLACEMENT_NOT_NEEDED' });
    expect(await impactStatuses(original.id)).toEqual(['RESOLVED']);
  });

  it.each([
    ['an unaffected original', 'REPLACEMENT_NOT_NEEDED'],
    ['another event booking', 'VENUE_BOOKING_NOT_FOUND'],
    ['a venue too small for the attendance', 'VENUE_CAPACITY_TOO_SMALL'],
    ['a venue closed during the period', 'VENUE_CLOSED_DURING_PERIOD'],
    ['a venue already booked then', 'VENUE_BOOKING_CONFLICT'],
  ] as const)('refuses a replacement for %s and creates nothing (AC7)', async (scenario, code) => {
    const { venueB, original } = await affectedArrangement();
    let eventRequestId = original.eventRequestId;
    let replaces = original.id;
    if (scenario === 'an unaffected original') {
      const plain = await booking(await venue(), at('03:00'), at('04:00'));
      eventRequestId = plain.eventRequestId;
      replaces = plain.id;
    } else if (scenario === 'another event booking') {
      eventRequestId = (await booking(await venue(), at('07:00'), at('08:00'))).eventRequestId;
    } else if (scenario === 'a venue too small for the attendance') {
      await fixture.pool.query('UPDATE event_requests SET expected_attendance = 500 WHERE id = $1', [eventRequestId]);
    } else if (scenario === 'a venue closed during the period') {
      await fixture.pool.query(`UPDATE venues SET opens_at = '13:00', closes_at = '22:00' WHERE id = $1`, [venueB]);
    } else {
      await booking(venueB, at('03:00'), at('04:00'));
    }
    const count = async () => (await fixture.pool.query(
      'SELECT count(*)::int AS n FROM venue_bookings WHERE replaces_booking_id IS NOT NULL')).rows[0].n;
    const before = await count();
    await expect(requestReplacement(eventRequestId, venueB, replaces)).rejects.toMatchObject({ code });
    expect(await count()).toBe(before);
  });

  it('refuses a replacement from a coordinator who is not assigned to the event (AC6, AC7)', async () => {
    const { venueB, original } = await affectedArrangement();
    const other = await fixture.createUser('EVENT_COORDINATOR');
    await expect(requestReplacement(original.eventRequestId, venueB, original.id, other)).rejects.toBeDefined();
    expect(await impactStatuses(original.id)).toEqual(['RECOVERY_REQUIRED']);
  });
});
