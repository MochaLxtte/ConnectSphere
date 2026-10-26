import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import {
  changeEquipmentReservation, equipmentReservationContext, getEquipmentReservationContext,
  type EquipmentReservationSnapshot,
} from '../../src/modules/equipment/reservation-service.js';
import { parseEquipmentReservationInput } from '../../src/modules/equipment/reservation-input.js';
import * as availabilityInput from '../../src/modules/equipment/availability-input.js';

const actor: WorkflowActor = { id: '26000000-0000-4000-8000-000000000001', role: 'TECHNICAL_SUPPORT_STAFF' };
const eventId = '26000000-0000-4000-8000-000000000002';
const requestId = '26000000-0000-4000-8000-000000000003';
const typeId = '26000000-0000-4000-8000-000000000004';
const coordinatorId = '26000000-0000-4000-8000-000000000005';
const startsAt = '2027-01-01T10:00:00.000001Z';
const endsAt = '2027-01-01T12:00:00.000001Z';
const initial = (): EquipmentReservationSnapshot => ({
  event: { id: eventId, name: 'Workshop', status: 'APPROVED', startsAt, endsAt, equipmentRequirements: 'AV' },
  coordinatorId,
  requests: [{ id: requestId, equipmentTypeId: typeId, equipmentName: 'Projector', quantity: 3,
    status: 'REQUESTED', startsAt, endsAt, notes: null, decidedBy: null, decidedAt: null,
    decisionReason: null, releasedBy: null, releasedAt: null, releaseReason: null, releaseCause: null }],
  equipmentTypes: [{ id: typeId, name: 'Projector', category: 'AV', totalQuantity: 10,
    damagedQuantity: 1, maintenanceQuantity: 1, isActive: true }], reservations: [],
});
let state: EquipmentReservationSnapshot;
let currentRole: string | null;
let coordinatorRole: string | null;
let eventStatus: string | null;
let failure: { includes: string; error: unknown } | null;
let writeCount: number;
const release = vi.fn();
const query = vi.fn(async (sql: string, values?: unknown[]) => {
  if (failure && sql.includes(failure.includes)) throw failure.error;
  if (sql.startsWith('SELECT role')) {
    const role = values![0] === actor.id ? currentRole : coordinatorRole;
    return { rows: role ? [{ role }] : [], rowCount: 1 };
  }
  if (sql.startsWith('SELECT status')) return { rows: eventStatus ? [{ status: eventStatus, coordinatorId: state.coordinatorId }] : [], rowCount: 1 };
  if (sql.includes('AS "coordinatorId"')) return { rows: [structuredClone(state)], rowCount: 1 };
  if (sql.includes('UPDATE equipment_requests')) {
    if (writeCount !== 1) return { rows: [], rowCount: writeCount };
    const row = state.requests[0]!;
    if (sql.includes("status = 'RESERVED',")) {
      Object.assign(row, { status: 'RESERVED', decidedBy: actor.id, decidedAt: startsAt, decisionReason: null });
      state.reservations.push({ ...row });
    } else {
      Object.assign(row, { status: 'CANCELLED', releasedBy: actor.id, releasedAt: endsAt,
        releaseReason: values![1], releaseCause: 'MANUAL_CANCELLATION' });
      state.reservations = state.reservations.filter(item => item.id !== requestId);
    }
  }
  return { rows: [], rowCount: 1 };
});
const connect = vi.fn(async () => ({ query, release }));
const dependencies = { pool: { query, connect } as unknown as Pick<Pool, 'query' | 'connect'> };
const version = () => equipmentReservationContext(state).requirementsVersion;
const change = (action: 'reserve' | 'cancel' = 'reserve', input: unknown = {
  requirementsVersion: version(), ...(action === 'cancel' ? { reason: 'No longer needed' } : {}),
}) => changeEquipmentReservation(dependencies, { actor, eventId, requestId, action, input });
const makeReserved = () => {
  Object.assign(state.requests[0]!, { status: 'RESERVED', decidedBy: actor.id, decidedAt: startsAt });
  state.reservations = [{ ...state.requests[0]! }];
};

beforeEach(() => {
  vi.clearAllMocks(); state = initial(); currentRole = actor.role; coordinatorRole = 'EVENT_COORDINATOR';
  eventStatus = 'APPROVED'; failure = null; writeCount = 1;
});
afterEach(() => vi.restoreAllMocks());

describe('KAN-26 reservation command validation', () => {
  it.each([null, [], 3, 'reserve', {}, { requirementsVersion: 'x' },
    { requirementsVersion: 'a'.repeat(64), quantity: 1 }, { requirementsVersion: 'a'.repeat(64), reason: 'extra' }])(
    'rejects unsupported or malformed reserve input %j', input => {
      expect(() => parseEquipmentReservationInput(input, 'reserve')).toThrowError(expect.objectContaining({ code: 'INVALID_EQUIPMENT_RESERVATION_INPUT' }));
    });
  it.each([undefined, null, '', '   ', 2, 'x'.repeat(2001)])('requires a bounded cancellation reason %j', reason => {
    expect(() => parseEquipmentReservationInput({ requirementsVersion: 'a'.repeat(64), reason }, 'cancel')).toThrow();
  });
  it('trims a reason while retaining the exact version', () => {
    expect(parseEquipmentReservationInput({ requirementsVersion: 'a'.repeat(64), reason: '  Restore stock  ' }, 'cancel'))
      .toEqual({ requirementsVersion: 'a'.repeat(64), reason: 'Restore stock' });
  });
});

describe('KAN-26 reservation context and current equipment readiness', () => {
  it('returns a minimal context without private competing reservation identities', async () => {
    state.reservations = [{ ...state.requests[0]!, id: 'private-other-event', quantity: 1 }];
    const result = await getEquipmentReservationContext(dependencies, { actor, eventId });
    expect(result.readiness).toMatchObject({ status: 'PENDING', activeCount: 1, reservedCount: 0 });
    expect(result.requests[0]).toMatchObject({ canReserve: true, canCancel: false });
    expect(JSON.stringify(result)).not.toContain('private-other-event');
    expect(result).not.toHaveProperty('coordinatorId');
    expect(connect).not.toHaveBeenCalled();
  });
  it('returns the same not-found response when a read has no eligible event', async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(getEquipmentReservationContext(dependencies, { actor, eventId }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });
  it('never treats empty or exclusively cancelled requests as Not Required', () => {
    state.requests = [];
    expect(equipmentReservationContext(state).readiness.status).toBe('NO_REQUIREMENTS');
    state.requests = [{ ...initial().requests[0]!, status: 'CANCELLED' }];
    expect(equipmentReservationContext(state).readiness.status).toBe('NO_REQUIREMENTS');
  });
  it('requires every active line and current fulfilability, without double counting own reservations', () => {
    makeReserved();
    expect(equipmentReservationContext(state).readiness.status).toBe('READY');
    state.requests.push({ ...initial().requests[0]!, id: coordinatorId, status: 'REJECTED' });
    expect(equipmentReservationContext(state).readiness.status).toBe('PENDING');
    state.requests.pop();
    state.equipmentTypes[0]!.maintenanceQuantity = 7;
    expect(equipmentReservationContext(state).readiness.status).toBe('SHORTFALL');
  });
  it('refuses inactive or missing stock and mismatched microsecond periods', () => {
    state.equipmentTypes[0]!.isActive = false;
    expect(equipmentReservationContext(state).readiness.status).toBe('SHORTFALL');
    state.equipmentTypes = [];
    expect(equipmentReservationContext(state).readiness.status).toBe('SHORTFALL');
    state.requests[0]!.endsAt = '2027-01-01T12:00:00.000002Z';
    expect(equipmentReservationContext(state).readiness.status).toBe('INVALID_REQUIREMENTS');
    expect(equipmentReservationContext(state).requests[0]!.canReserve).toBe(false);
  });
  it('detects malformed, nonpositive, and aggregated overflow saved requirements', () => {
    state.event.startsAt = null;
    expect(equipmentReservationContext(state).readiness.status).toBe('INVALID_REQUIREMENTS');
    state = initial(); state.requests[0]!.quantity = 0;
    expect(equipmentReservationContext(state).readiness.status).toBe('INVALID_REQUIREMENTS');
    state = initial(); state.requests[0]!.quantity = 2147483647;
    state.requests.push({ ...initial().requests[0]!, id: coordinatorId });
    expect(equipmentReservationContext(state).readiness.status).toBe('INVALID_REQUIREMENTS');
  });
  it('keeps confirmed history readable with all write capabilities disabled', () => {
    makeReserved(); state.event.status = 'CONFIRMED';
    expect(equipmentReservationContext(state).requests[0]).toMatchObject({ canReserve: false, canCancel: false });
    state = initial(); state.coordinatorId = null;
    expect(equipmentReservationContext(state).requests[0]!.canReserve).toBe(false);
  });
  it('propagates an unexpected validation failure instead of disguising it as an invalid requirement', () => {
    vi.spyOn(availabilityInput, 'equipmentPeriod').mockImplementation(() => { throw new Error('unexpected calendar failure'); });
    expect(() => equipmentReservationContext(state)).toThrow('unexpected calendar failure');
  });
  it('propagates an unexpected combined-calculation failure instead of reporting a supported quantity conflict', () => {
    state.requests.push({ ...initial().requests[0]!, id: coordinatorId });
    const original = availabilityInput.aggregateEquipmentItems;
    vi.spyOn(availabilityInput, 'aggregateEquipmentItems').mockImplementation(items => {
      if (items.length > 1) throw new Error('unexpected aggregation failure');
      return original(items);
    });
    expect(() => equipmentReservationContext(state)).toThrow('unexpected aggregation failure');
  });
});

describe('KAN-26 atomic reservation and cancellation', () => {
  it('reserves the full stored line and sends both notices before commit without any venue dependency', async () => {
    const before = version();
    const result = await change('reserve', { requirementsVersion: before });
    expect(result).toMatchObject({ changed: true, context: { readiness: { status: 'READY' },
      requests: [{ status: 'RESERVED', quantity: 3, decidedBy: actor.id, canCancel: true }] } });
    const sql = query.mock.calls.map(call => call[0]);
    expect(sql.indexOf('SELECT status, coordinator_id AS "coordinatorId" FROM event_requests WHERE id = $1 FOR UPDATE'))
      .toBeLessThan(sql.findIndex(text => text.includes('ORDER BY t.id FOR UPDATE')));
    expect(sql.findIndex(text => text.includes('ORDER BY t.id FOR UPDATE')))
      .toBeLessThan(sql.findIndex(text => text.includes('ORDER BY id FOR UPDATE')));
    expect(sql.some(text => text.includes('venue_bookings'))).toBe(false);
    const notification = query.mock.calls.find(call => call[0].includes('INSERT INTO notifications'))!;
    expect(notification[1]).toEqual(expect.arrayContaining([coordinatorId, actor.id, requestId, `EQUIPMENT_RESERVED:${requestId}`]));
    expect(sql.at(-1)).toBe('COMMIT'); expect(release).toHaveBeenCalledWith(undefined);
    query.mockClear();
    expect((await change('reserve', { requirementsVersion: before })).changed).toBe(false);
    expect(query.mock.calls.some(call => /UPDATE equipment_requests|INSERT INTO notifications/.test(call[0]))).toBe(false);
  });
  it('permits current-version repeat and refuses old replay after another source change', async () => {
    const before = version(); await change();
    expect((await change()).changed).toBe(false);
    state.event.name = 'Changed';
    await expect(change('reserve', { requirementsVersion: before })).rejects.toMatchObject({ code: 'EQUIPMENT_CONTEXT_CHANGED' });
  });
  it('reconstructs only the decided line on a retry while preserving other active requirements', async () => {
    state.requests.push({ ...initial().requests[0]!, id: coordinatorId, quantity: 1 });
    const before = version(); await change();
    const retry = await change('reserve', { requirementsVersion: before });
    expect(retry).toMatchObject({ changed: false, context: { readiness: { status: 'PENDING', activeCount: 2, reservedCount: 1 } } });
    state.requests[1]!.notes = 'Changed elsewhere';
    await expect(change('reserve', { requirementsVersion: before })).rejects.toMatchObject({ code: 'EQUIPMENT_CONTEXT_CHANGED' });
  });
  it('cancels once, preserves original decision and permits only the identical repeated reason', async () => {
    makeReserved(); const before = version();
    const input = { requirementsVersion: before, reason: '  No longer needed  ' };
    const result = await change('cancel', input);
    expect(result).toMatchObject({ changed: true, context: { readiness: { status: 'NO_REQUIREMENTS' },
      requests: [{ status: 'CANCELLED', decidedBy: actor.id, decidedAt: startsAt,
        releasedBy: actor.id, releaseCause: 'MANUAL_CANCELLATION', releaseReason: 'No longer needed' }] } });
    expect((await change('cancel', input)).changed).toBe(false);
    await expect(change('cancel', { requirementsVersion: version(), reason: 'Different reason' }))
      .rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_CANCELLABLE' });
    expect(state.equipmentTypes[0]!.totalQuantity).toBe(10);
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'rejects direct %s callers before data access', async role => {
      await expect(changeEquipmentReservation(dependencies, { actor: { ...actor, role }, eventId, requestId,
        action: 'reserve', input: {} })).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      await expect(getEquipmentReservationContext(dependencies, { actor: { ...actor, role }, eventId }))
        .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      expect(query).not.toHaveBeenCalled();
    });
  it.each([null, 'EVENT_COORDINATOR'])('rechecks the trusted actor after transaction begins (%s)', async role => {
    currentRole = role;
    await expect(change()).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
    expect(query.mock.calls.at(-1)![0]).toBe('ROLLBACK');
  });
  it('rejects malformed direct identifiers without opening a transaction', async () => {
    await expect(getEquipmentReservationContext(dependencies, { actor, eventId: 'bad' })).rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_RESERVATION_INPUT' });
    await expect(changeEquipmentReservation(dependencies, { actor, eventId, requestId: 'bad', action: 'reserve', input: {} }))
      .rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_RESERVATION_INPUT' });
    expect(connect).not.toHaveBeenCalled();
  });
  it('rejects missing events and unrelated request IDs', async () => {
    eventStatus = null; await expect(change()).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    eventStatus = 'APPROVED'; state.requests = [];
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_FOUND' });
  });
  it.each(['DRAFT', 'SUBMITTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])('rejects new writes in %s', async status => {
    eventStatus = status;
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_EVENT_NOT_APPROVED' });
  });
  it('rejects stale source, rejected demand and cancelled resurrection', async () => {
    await expect(change('reserve', { requirementsVersion: 'a'.repeat(64) })).rejects.toMatchObject({ code: 'EQUIPMENT_CONTEXT_CHANGED' });
    state.requests[0]!.status = 'REJECTED';
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_RESERVABLE' });
    state.requests[0]!.status = 'CANCELLED';
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_RESERVABLE' });
  });
  it('requires matching saved dates and an assigned coordinator', async () => {
    state.requests[0]!.endsAt = '2027-01-01T12:00:00.000002Z';
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_PERIOD_MISMATCH' });
    state = initial(); state.coordinatorId = null;
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_COORDINATOR_REQUIRED' });
  });
  it.each([null, 'ATTENDEE'])('refuses a missing or demoted coordinator before writing (%s)', async role => {
    coordinatorRole = role;
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_COORDINATOR_REQUIRED' });
    expect(query.mock.calls.some(call => call[0].includes('UPDATE equipment_requests'))).toBe(false);
    const locks = query.mock.calls.map(call => call[0]);
    const recipientLock = query.mock.calls.findIndex(call => call[0].startsWith('SELECT role') && call[1]![0] === coordinatorId);
    expect(recipientLock).toBeGreaterThan(locks.findIndex(sql => sql.startsWith('SELECT status')));
    expect(recipientLock).toBeLessThan(locks.findIndex(sql => sql.includes('ORDER BY t.id FOR UPDATE')));
  });
  it('refuses current operational shortfalls including another reservation of the same event', async () => {
    state.reservations = [{ ...state.requests[0]!, id: coordinatorId, quantity: 6 }];
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_STOCK_CONFLICT' });
    state.reservations = []; state.equipmentTypes = [];
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_STOCK_CONFLICT' });
  });
  it('rolls back a late notification failure and exposes the trigger stock conflict consistently', async () => {
    failure = { includes: 'INSERT INTO notifications', error: new Error('notification failed') };
    await expect(change()).rejects.toThrow('notification failed');
    expect(query.mock.calls.at(-1)![0]).toBe('ROLLBACK');
    state = initial(); failure = { includes: 'UPDATE equipment_requests', error: { constraint: 'equipment_requests_within_pool' } };
    await expect(change()).rejects.toMatchObject({ code: 'EQUIPMENT_STOCK_CONFLICT' });
  });
  it('propagates unexpected failures, rather than reporting a successful decision', async () => {
    failure = { includes: 'SELECT status', error: 'connection failed' };
    await expect(change()).rejects.toBe('connection failed');
  });
  it('refuses to notify or commit when a database write unexpectedly affects no row', async () => {
    writeCount = 0;
    await expect(change()).rejects.toThrow('The equipment reservation was not saved.');
    expect(query.mock.calls.some(call => call[0].includes('INSERT INTO notifications'))).toBe(false);
    makeReserved();
    await expect(change('cancel')).rejects.toThrow('The equipment cancellation was not saved.');
    expect(query.mock.calls.at(-1)![0]).toBe('ROLLBACK');
  });
});
