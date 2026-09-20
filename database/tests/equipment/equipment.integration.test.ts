import { randomUUID } from 'node:crypto';
import express from 'express';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getEquipmentAvailability, listEquipmentAvailability,
} from '../../../backend/src/modules/equipment/availability.js';
import {
  cancelEquipmentRequest, createEquipmentRequest, decideEquipmentRequest, listEquipmentRequests,
  updateEquipmentRequest,
} from '../../../backend/src/modules/equipment/equipment-requests.js';
import {
  createEquipmentType, getEquipmentType, listEquipmentTypes, updateEquipmentType,
} from '../../../backend/src/modules/equipment/equipment-types.js';
import { createEquipmentRequestsRouter, createEquipmentRouter } from '../../../backend/src/modules/equipment/index.js';
import type {
  EquipmentActor, EquipmentRequestQueueItem, EquipmentRequestRecord,
} from '../../../backend/src/modules/equipment/types.js';
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

const organiser: EquipmentActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const otherOrganiser: EquipmentActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const coordinator: EquipmentActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const otherCoordinator: EquipmentActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const staff: EquipmentActor = { id: randomUUID(), role: 'TECHNICAL_SUPPORT_STAFF' };
const secondStaff: EquipmentActor = { id: randomUUID(), role: 'TECHNICAL_SUPPORT_STAFF' };
const attendee: EquipmentActor = { id: randomUUID(), role: 'ATTENDEE' };

const day = (hour: number, dayOfMonth = 1) => new Date(Date.UTC(2031, 0, dayOfMonth, hour));

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  for (const actor of [organiser, otherOrganiser, coordinator, otherCoordinator, staff, secondStaff, attendee]) {
    await pool.query(
      'INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, $3, $4)',
      [actor.id, `${actor.id}@example.test`, `${actor.role} ${actor.id.slice(0, 4)}`, actor.role],
    );
  }
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

async function createEvent(status = 'APPROVED', startsAt: Date | null = day(9), endsAt: Date | null = day(17)) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO event_requests (id, organiser_id, coordinator_id, status, name, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, 'Open day', $5, $6)`,
    [id, organiser.id, coordinator.id, status, startsAt, endsAt],
  );
  return id;
}

async function createType(totalQuantity: number, isActive = true) {
  return createEquipmentType(pool, staff, {
    name: `Type ${randomUUID()}`, category: 'AV', description: null, totalQuantity, isActive,
  });
}

function requestFor(eventRequestId: string, equipmentTypeId: string, quantity: number, from?: Date, to?: Date) {
  return createEquipmentRequest(pool, organiser, {
    eventRequestId, equipmentTypeId, quantity, startsAt: from ?? null, endsAt: to ?? null, notes: null,
  });
}

async function notificationsFor(recipientId: string, type: string, eventRequestId: string) {
  const result = await pool.query(
    'SELECT title, message FROM notifications WHERE recipient_id = $1 AND type = $2 AND event_request_id = $3',
    [recipientId, type, eventRequestId],
  );
  return result.rows;
}

describe('CF-15 equipment catalogue persistence', () => {
  it('creates, reads, filters and updates types, hiding inactive ones from other roles', async () => {
    const marker = randomUUID();
    const active = await createEquipmentType(pool, staff, {
      name: `Lectern ${marker}`, category: 'Stage', description: 'Adjustable', totalQuantity: 2, isActive: true,
    });
    const inactive = await createEquipmentType(pool, staff, {
      name: `Retired ${marker}`, category: 'Stage', description: null, totalQuantity: 0, isActive: false,
    });
    expect(active).toMatchObject({ totalQuantity: 2, isActive: true, createdAt: expect.any(String) });

    const forOrganiser = await listEquipmentTypes(pool, organiser, { q: marker.toUpperCase(), category: 'stage' });
    expect(forOrganiser.map((type) => type.id)).toEqual([active.id]);
    const forStaff = await listEquipmentTypes(pool, staff, { q: marker, category: null });
    expect(forStaff.map((type) => type.id)).toEqual([active.id, inactive.id]);
    expect(await listEquipmentTypes(pool, staff, { q: '%', category: null })).toEqual([]);

    await expect(getEquipmentType(pool, attendee, inactive.id)).rejects.toMatchObject({ code: 'EQUIPMENT_NOT_FOUND' });
    await expect(getEquipmentType(pool, staff, inactive.id)).resolves.toMatchObject({ isActive: false });

    const updated = await updateEquipmentType(pool, staff, active.id, { description: null, totalQuantity: 5 });
    expect(updated).toMatchObject({ name: `Lectern ${marker}`, category: 'Stage', description: null, totalQuantity: 5 });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(active.updatedAt));
  });

  it('refuses duplicate names case-insensitively and non-staff writers', async () => {
    const type = await createType(1);
    await expect(createEquipmentType(pool, staff, {
      name: type.name.toUpperCase(), category: null, description: null, totalQuantity: 1, isActive: true,
    })).rejects.toMatchObject({ code: 'EQUIPMENT_NAME_TAKEN' });
    const other = await createType(1);
    await expect(updateEquipmentType(pool, staff, other.id, { name: type.name }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_NAME_TAKEN' });
    await expect(updateEquipmentType(pool, organiser, type.id, { totalQuantity: 9 }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_FORBIDDEN' });
    await expect(updateEquipmentType(pool, staff, randomUUID(), { totalQuantity: 9 }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_NOT_FOUND' });
  });

  it('will not lower the total below the peak of current and upcoming reservations', async () => {
    const type = await createType(12);
    const eventRequestId = await createEvent();
    // Back-to-back 4 + 4 peak at 4; the overlapping 3 lifts the peak to 7.
    for (const [quantity, from, to] of [[4, day(9), day(11)], [4, day(11), day(13)], [3, day(10), day(12)]] as const) {
      const made = await requestFor(eventRequestId, type.id, quantity, from, to);
      await decideEquipmentRequest(pool, staff, made.id, { decision: 'RESERVED', reason: null });
    }
    // Reservations that already ended no longer constrain the pool.
    await pool.query(`
      INSERT INTO equipment_requests
        (event_request_id, equipment_type_id, requested_by, quantity, status, starts_at, ends_at, decided_by, decided_at)
      VALUES ($1, $2, $3, 12, 'REQUESTED', '2020-01-01T00:00:00Z', '2020-01-02T00:00:00Z', NULL, NULL)
    `, [eventRequestId, type.id, organiser.id]);
    await pool.query(
      "UPDATE equipment_requests SET status = 'RESERVED', decided_by = $2, decided_at = now() WHERE equipment_type_id = $1 AND quantity = 12",
      [type.id, staff.id],
    );

    await expect(updateEquipmentType(pool, staff, type.id, { totalQuantity: 6 }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_QUANTITY_IN_USE', details: { reservedPeak: 7 } });
    expect((await getEquipmentType(pool, staff, type.id)).totalQuantity).toBe(12);
    await expect(updateEquipmentType(pool, staff, type.id, { totalQuantity: 7 }))
      .resolves.toMatchObject({ totalQuantity: 7 });
  });
});

describe('CF-16 availability', () => {
  it('reports the simultaneous peak, not the sum, for one type and for all active types', async () => {
    const type = await createType(10);
    const hidden = await createType(3, false);
    const eventRequestId = await createEvent();
    for (const [quantity, from, to] of [[6, day(9), day(10)], [6, day(11), day(12)]] as const) {
      const made = await requestFor(eventRequestId, type.id, quantity, from, to);
      await decideEquipmentRequest(pool, staff, made.id, { decision: 'RESERVED', reason: null });
    }
    await requestFor(eventRequestId, type.id, 9, day(9), day(12)); // REQUESTED rows hold nothing.

    const window = { from: day(9), to: day(12) };
    await expect(getEquipmentAvailability(pool, type.id, window, { includeInactive: false })).resolves.toEqual({
      equipmentTypeId: type.id, from: day(9).toISOString(), to: day(12).toISOString(),
      totalQuantity: 10, reservedPeak: 6, available: 4,
    });
    await expect(getEquipmentAvailability(pool, type.id, { from: day(10), to: day(11) }, { includeInactive: false }))
      .resolves.toMatchObject({ reservedPeak: 0, available: 10 });
    await expect(getEquipmentAvailability(pool, hidden.id, window, { includeInactive: false }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_NOT_FOUND' });

    const all = await listEquipmentAvailability(pool, window);
    expect(all.find((item) => item.equipmentTypeId === type.id)).toMatchObject({ reservedPeak: 6, available: 4 });
    expect(all.some((item) => item.equipmentTypeId === hidden.id)).toBe(false);
  });
});

describe('CF-15 equipment requests', () => {
  it('defaults to the event period, notifies technical support and lists for the planners only', async () => {
    const type = await createType(5);
    const eventRequestId = await createEvent('CONFIRMED');
    const made = await requestFor(eventRequestId, type.id, 2);
    expect(made).toMatchObject({
      eventRequestId, equipmentTypeId: type.id, equipmentName: type.name, requestedBy: organiser.id,
      quantity: 2, status: 'REQUESTED', startsAt: day(9).toISOString(), endsAt: day(17).toISOString(),
      decidedBy: null, decidedAt: null,
    });
    for (const member of [staff, secondStaff]) {
      expect(await notificationsFor(member.id, 'EQUIPMENT_REQUEST_CREATED', eventRequestId)).toHaveLength(1);
    }
    expect(await notificationsFor(organiser.id, 'EQUIPMENT_REQUEST_CREATED', eventRequestId)).toEqual([]);

    const byCoordinator = await createEquipmentRequest(pool, coordinator, {
      eventRequestId, equipmentTypeId: type.id, quantity: 1, startsAt: day(8), endsAt: null, notes: 'Setup',
    });
    expect(byCoordinator).toMatchObject({ requestedBy: coordinator.id, startsAt: day(8).toISOString(), notes: 'Setup' });

    for (const planner of [organiser, coordinator]) {
      const listing = await listEquipmentRequests(pool, planner, { eventRequestId, status: null });
      expect(listing.items.map((item) => item.id)).toEqual([made.id, byCoordinator.id]);
    }
    for (const outsider of [otherOrganiser, otherCoordinator]) {
      await expect(listEquipmentRequests(pool, outsider, { eventRequestId, status: null }))
        .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
    await expect(listEquipmentRequests(pool, organiser, { eventRequestId: null, status: null }))
      .rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_REQUEST_FILTER' });
    await expect(listEquipmentRequests(pool, attendee, { eventRequestId, status: null }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_FORBIDDEN' });
  });

  it.each([
    ['an unrelated organiser', otherOrganiser, 'APPROVED', 'EVENT_REQUEST_NOT_FOUND'],
    ['an unassigned coordinator', otherCoordinator, 'APPROVED', 'EVENT_REQUEST_NOT_FOUND'],
    ['technical support', staff, 'APPROVED', 'EQUIPMENT_REQUEST_FORBIDDEN'],
    ['a submitted event', organiser, 'SUBMITTED', 'EVENT_NOT_ELIGIBLE_FOR_EQUIPMENT'],
    ['a cancelled event', organiser, 'CANCELLED', 'EVENT_NOT_ELIGIBLE_FOR_EQUIPMENT'],
  ] as const)('refuses a request from %s without writing', async (_name, actor, status, code) => {
    const type = await createType(5);
    const eventRequestId = await createEvent(status);
    await expect(createEquipmentRequest(pool, actor, {
      eventRequestId, equipmentTypeId: type.id, quantity: 1, startsAt: null, endsAt: null, notes: null,
    })).rejects.toMatchObject({ code });
    const rows = await pool.query('SELECT 1 FROM equipment_requests WHERE event_request_id = $1', [eventRequestId]);
    expect(rows.rowCount).toBe(0);
    expect(await notificationsFor(staff.id, 'EQUIPMENT_REQUEST_CREATED', eventRequestId)).toEqual([]);
  });

  it('checks the type, the pool size and the period', async () => {
    const type = await createType(3);
    const inactive = await createType(3, false);
    const eventRequestId = await createEvent();
    await expect(requestFor(eventRequestId, randomUUID(), 1)).rejects.toMatchObject({ code: 'EQUIPMENT_NOT_FOUND' });
    await expect(requestFor(eventRequestId, inactive.id, 1)).rejects.toMatchObject({ code: 'EQUIPMENT_TYPE_INACTIVE' });
    await expect(requestFor(eventRequestId, type.id, 4))
      .rejects.toMatchObject({ code: 'EQUIPMENT_QUANTITY_EXCEEDS_POOL', details: { totalQuantity: 3 } });
    await expect(requestFor(eventRequestId, type.id, 1, day(18)))
      .rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_REQUEST_INPUT' });
    const unscheduled = await createEvent('APPROVED', null, null);
    await expect(requestFor(unscheduled, type.id, 1)).rejects.toMatchObject({ code: 'EVENT_SCHEDULE_REQUIRED' });
    await expect(requestFor(unscheduled, type.id, 1, day(9), day(10))).resolves.toMatchObject({ status: 'REQUESTED' });
  });

  it('lets only the requester edit while REQUESTED and cancel while REQUESTED or RESERVED', async () => {
    const type = await createType(5);
    const eventRequestId = await createEvent();
    const made = await requestFor(eventRequestId, type.id, 2);

    await expect(updateEquipmentRequest(pool, otherOrganiser, made.id, { quantity: 1 }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_FOUND' });
    await expect(updateEquipmentRequest(pool, coordinator, made.id, { quantity: 1 }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_FORBIDDEN' });
    await expect(updateEquipmentRequest(pool, organiser, randomUUID(), { quantity: 1 }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_FOUND' });
    await expect(updateEquipmentRequest(pool, organiser, made.id, { quantity: 6 }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_QUANTITY_EXCEEDS_POOL' });
    await expect(updateEquipmentRequest(pool, organiser, made.id, { endsAt: day(8) }))
      .rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_REQUEST_INPUT' });

    const edited = await updateEquipmentRequest(pool, organiser, made.id, { quantity: 4, notes: 'Front row', endsAt: day(15) });
    expect(edited).toMatchObject({
      quantity: 4, notes: 'Front row', startsAt: day(9).toISOString(), endsAt: day(15).toISOString(),
    });
    expect(Date.parse(edited.updatedAt)).toBeGreaterThanOrEqual(Date.parse(made.updatedAt));

    await decideEquipmentRequest(pool, staff, made.id, { decision: 'RESERVED', reason: null });
    await expect(updateEquipmentRequest(pool, organiser, made.id, { quantity: 1 }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_PENDING' });
    await expect(cancelEquipmentRequest(pool, coordinator, made.id))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_FORBIDDEN' });

    const window = { from: day(9), to: day(15) };
    expect((await getEquipmentAvailability(pool, type.id, window, { includeInactive: false })).available).toBe(1);
    const cancelled = await cancelEquipmentRequest(pool, organiser, made.id);
    expect(cancelled).toMatchObject({ status: 'CANCELLED', decidedBy: staff.id });
    expect((await getEquipmentAvailability(pool, type.id, window, { includeInactive: false })).available).toBe(5);
    expect(await notificationsFor(staff.id, 'EQUIPMENT_REQUEST_CANCELLED', eventRequestId)).toHaveLength(1);
    await expect(cancelEquipmentRequest(pool, organiser, made.id))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_CANCELLABLE' });
  });
});

describe('CF-17 reservation decisions', () => {
  it('shows technical support the queue with event, organiser and live availability', async () => {
    const type = await createType(10);
    const eventRequestId = await createEvent();
    const reserved = await requestFor(eventRequestId, type.id, 7, day(9), day(12));
    await decideEquipmentRequest(pool, staff, reserved.id, { decision: 'RESERVED', reason: null });
    const pending = await requestFor(eventRequestId, type.id, 5, day(11), day(14));

    const queue = await listEquipmentRequests(pool, staff, { eventRequestId: null, status: null });
    expect(queue.scope).toBe('queue');
    expect(queue.items.every((item) => item.status === 'REQUESTED')).toBe(true);
    const item = (queue.items as EquipmentRequestQueueItem[]).find((entry) => entry.id === pending.id);
    expect(item).toMatchObject({
      eventName: 'Open day', organiserName: expect.stringContaining('EVENT_ORGANISER'),
      requesterName: expect.stringContaining('EVENT_ORGANISER'),
      totalQuantity: 10, reservedPeak: 7, available: 3,
    });

    // A RESERVED row's own quantity is not counted against itself.
    const reservedRows = await listEquipmentRequests(pool, staff, { eventRequestId, status: 'RESERVED' });
    expect(reservedRows.items).toEqual([expect.objectContaining({ id: reserved.id, reservedPeak: 0, available: 10 })]);
  });

  it('records a reservation or rejection once and notifies the requester and organiser', async () => {
    const type = await createType(4);
    const eventRequestId = await createEvent();
    const byCoordinator = await createEquipmentRequest(pool, coordinator, {
      eventRequestId, equipmentTypeId: type.id, quantity: 2, startsAt: null, endsAt: null, notes: null,
    });
    await expect(decideEquipmentRequest(pool, organiser, byCoordinator.id, { decision: 'RESERVED', reason: null }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_FORBIDDEN' });
    await expect(decideEquipmentRequest(pool, staff, randomUUID(), { decision: 'RESERVED', reason: null }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_FOUND' });

    const reserved = await decideEquipmentRequest(pool, staff, byCoordinator.id, { decision: 'RESERVED', reason: null });
    expect(reserved).toMatchObject({
      status: 'RESERVED', decidedBy: staff.id, decidedAt: expect.any(String), decisionReason: null,
    });
    for (const recipient of [coordinator, organiser]) {
      expect(await notificationsFor(recipient.id, 'EQUIPMENT_REQUEST_RESERVED', eventRequestId)).toHaveLength(1);
    }
    expect(await notificationsFor(staff.id, 'EQUIPMENT_REQUEST_RESERVED', eventRequestId)).toEqual([]);
    await expect(decideEquipmentRequest(pool, secondStaff, byCoordinator.id, { decision: 'REJECTED', reason: 'Late' }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_PENDING' });

    const second = await requestFor(eventRequestId, type.id, 1);
    const rejected = await decideEquipmentRequest(pool, staff, second.id, { decision: 'REJECTED', reason: 'Out for repair' });
    expect(rejected).toMatchObject({ status: 'REJECTED', decisionReason: 'Out for repair', decidedBy: staff.id });
    const notices = await notificationsFor(organiser.id, 'EQUIPMENT_REQUEST_REJECTED', eventRequestId);
    expect(notices).toEqual([expect.objectContaining({ message: expect.stringContaining('Out for repair') })]);
  });

  it('will not reserve for an event that is no longer approved or confirmed, but can reject', async () => {
    const type = await createType(4);
    const eventRequestId = await createEvent();
    const made = await requestFor(eventRequestId, type.id, 1);
    await pool.query("UPDATE event_requests SET status = 'CANCELLED' WHERE id = $1", [eventRequestId]);
    await expect(decideEquipmentRequest(pool, staff, made.id, { decision: 'RESERVED', reason: null }))
      .rejects.toMatchObject({ code: 'EVENT_NOT_ELIGIBLE_FOR_EQUIPMENT' });
    await expect(decideEquipmentRequest(pool, staff, made.id, { decision: 'REJECTED', reason: 'Event cancelled' }))
      .resolves.toMatchObject({ status: 'REJECTED' });
  });

  it('maps the overbooking trigger to EQUIPMENT_UNAVAILABLE with the available quantity and rolls back', async () => {
    const type = await createType(10);
    const eventRequestId = await createEvent();
    const first = await requestFor(eventRequestId, type.id, 7, day(9), day(12));
    const second = await requestFor(eventRequestId, type.id, 5, day(11), day(14));
    await decideEquipmentRequest(pool, staff, first.id, { decision: 'RESERVED', reason: null });

    await expect(decideEquipmentRequest(pool, staff, second.id, { decision: 'RESERVED', reason: null }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_UNAVAILABLE', details: { available: 3 } });
    const stored = await pool.query(
      'SELECT status, decided_by, decided_at FROM equipment_requests WHERE id = $1', [second.id],
    );
    expect(stored.rows[0]).toEqual({ status: 'REQUESTED', decided_by: null, decided_at: null });
    expect(await notificationsFor(organiser.id, 'EQUIPMENT_REQUEST_RESERVED', eventRequestId)).toHaveLength(1);

    // Adjacent periods do not compete, and the refused request fits once reduced.
    const after = await requestFor(eventRequestId, type.id, 10, day(14), day(16));
    await expect(decideEquipmentRequest(pool, staff, after.id, { decision: 'RESERVED', reason: null }))
      .resolves.toMatchObject({ status: 'RESERVED' });
    await updateEquipmentRequest(pool, organiser, second.id, { quantity: 3 });
    await expect(decideEquipmentRequest(pool, staff, second.id, { decision: 'RESERVED', reason: null }))
      .resolves.toMatchObject({ status: 'RESERVED' });
  });

  it('reserves a spanning request that fits under the simultaneous peak', async () => {
    // Migration 006: the database guard compares the pool with the peak, not the overlapping sum.
    const type = await createType(10);
    const eventRequestId = await createEvent();
    for (const [from, to] of [[day(9), day(10)], [day(11), day(12)]] as const) {
      const made = await requestFor(eventRequestId, type.id, 6, from, to);
      await decideEquipmentRequest(pool, staff, made.id, { decision: 'RESERVED', reason: null });
    }
    const spanning = await requestFor(eventRequestId, type.id, 4, day(9), day(12));
    await expect(decideEquipmentRequest(pool, staff, spanning.id, { decision: 'RESERVED', reason: null }))
      .resolves.toMatchObject({ status: 'RESERVED' });
    const tooMany = await requestFor(eventRequestId, type.id, 1, day(9), day(12));
    await expect(decideEquipmentRequest(pool, staff, tooMany.id, { decision: 'RESERVED', reason: null }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_UNAVAILABLE', details: { available: 0 } });
  });

  it('lets exactly one of two simultaneous reservations that together exceed the pool succeed', async () => {
    const type = await createType(10);
    const eventRequestId = await createEvent();
    const requests = [
      await requestFor(eventRequestId, type.id, 6, day(9), day(12)),
      await requestFor(eventRequestId, type.id, 6, day(10), day(13)),
    ];
    const blocker = await pool.connect();
    let pending: Promise<PromiseSettledResult<EquipmentRequestRecord>[]> | undefined;
    let results: PromiseSettledResult<EquipmentRequestRecord>[] = [];
    try {
      await blocker.query('BEGIN');
      // The trigger locks the type row, so both writers queue here before either can count.
      await blocker.query('SELECT id FROM equipment_types WHERE id = $1 FOR UPDATE', [type.id]);
      pending = Promise.allSettled(requests.map((made, index) =>
        decideEquipmentRequest(pool, index === 0 ? staff : secondStaff, made.id, { decision: 'RESERVED', reason: null })));
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
        blocker.release();
        if (pending) results = await pending;
      }
    }

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toMatchObject({ code: 'EQUIPMENT_UNAVAILABLE', details: { available: 4 } });

    const stored = await pool.query<{ status: string; quantity: number }>(
      'SELECT status, quantity FROM equipment_requests WHERE equipment_type_id = $1 ORDER BY status', [type.id],
    );
    expect(stored.rows.map((row) => row.status)).toEqual(['REQUESTED', 'RESERVED']);
    expect(await notificationsFor(organiser.id, 'EQUIPMENT_REQUEST_RESERVED', eventRequestId)).toHaveLength(1);
    const availability = await getEquipmentAvailability(
      pool, type.id, { from: day(9), to: day(13) }, { includeInactive: false },
    );
    expect(availability).toMatchObject({ reservedPeak: 6, available: 4 });
  });
});

describe('mounted equipment routes with PostgreSQL', () => {
  function appFor(actor: EquipmentActor | null) {
    const dependencies = { pool, authenticate: async () => actor };
    const app = express();
    app.use(express.json());
    app.use('/api/equipment', createEquipmentRouter(dependencies));
    app.use('/api/equipment-requests', createEquipmentRequestsRouter(dependencies));
    return app;
  }

  it('runs request, queue, refusal and reservation through HTTP', async () => {
    const created = await request(appFor(staff)).post('/api/equipment')
      .send({ name: `HTTP ${randomUUID()}`, totalQuantity: 2 });
    expect(created.status).toBe(201);
    const duplicate = await request(appFor(staff)).post('/api/equipment')
      .send({ name: created.body.name, totalQuantity: 1 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EQUIPMENT_NAME_TAKEN');

    const eventRequestId = await createEvent();
    const made = await request(appFor(organiser)).post('/api/equipment-requests')
      .send({ eventRequestId, equipmentTypeId: created.body.id, quantity: 2 });
    expect(made.status).toBe(201);
    const rival = await request(appFor(coordinator)).post('/api/equipment-requests')
      .send({ eventRequestId, equipmentTypeId: created.body.id, quantity: 1 });

    const queue = await request(appFor(staff)).get('/api/equipment-requests?status=REQUESTED');
    expect(queue.body.items.find((item: { id: string }) => item.id === made.body.id))
      .toMatchObject({ eventName: 'Open day', available: 2 });

    const reserved = await request(appFor(staff)).post(`/api/equipment-requests/${made.body.id}/decision`)
      .send({ decision: 'RESERVED' });
    expect(reserved.status).toBe(200);
    expect(reserved.body.status).toBe('RESERVED');
    const refused = await request(appFor(secondStaff)).post(`/api/equipment-requests/${rival.body.id}/decision`)
      .send({ decision: 'RESERVED' });
    expect(refused.status).toBe(409);
    expect(refused.body.error).toMatchObject({ code: 'EQUIPMENT_UNAVAILABLE', available: 0 });

    const window = `from=${day(9).toISOString()}&to=${day(17).toISOString()}`;
    const availability = await request(appFor(attendee)).get(`/api/equipment/${created.body.id}/availability?${window}`);
    expect(availability.body).toMatchObject({ totalQuantity: 2, reservedPeak: 2, available: 0 });
    const lowered = await request(appFor(staff)).patch(`/api/equipment/${created.body.id}`).send({ totalQuantity: 1 });
    expect(lowered.status).toBe(409);
    expect(lowered.body.error.code).toBe('EQUIPMENT_QUANTITY_IN_USE');

    const hidden = await request(appFor(otherOrganiser)).get(`/api/equipment-requests?eventRequestId=${eventRequestId}`);
    expect(hidden.status).toBe(404);
    expect((await request(appFor(null)).get('/api/equipment')).status).toBe(401);
  });
});
