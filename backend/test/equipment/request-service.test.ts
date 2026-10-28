import type { Pool } from 'pg';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { cancelEquipmentLine, equipmentPlanRevision, getEventEquipmentPlan, listEquipmentRequests, listEquipmentTypes,
  parseEquipmentInput, replaceReservedEquipmentLine, reviewEquipmentRequest, saveEquipmentRequest } from '../../src/modules/equipment/equipment-service.js';
import { readEquipmentReservationSnapshot, reserveEquipmentInTransaction } from '../../src/modules/equipment/reservation-service.js';
vi.mock('../../src/modules/equipment/reservation-service.js', () => ({
  readEquipmentReservationSnapshot: vi.fn(), reserveEquipmentInTransaction: vi.fn(),
}));
const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const actorId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const lineId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const typeId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const otherId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const coordinator: WorkflowActor = { id: actorId, role: 'EVENT_COORDINATOR' };
const technical: WorkflowActor = { id: otherId, role: 'TECHNICAL_SUPPORT_STAFF' };
const period = { startsAt: '2031-01-12T02:00:00.000000Z', endsAt: '2031-01-12T04:00:00.000000Z' };
const inputLine = { equipmentTypeId: typeId, quantity: 2, ...period, technicalRequirements: 'Wireless' };
type Snapshot = Parameters<typeof equipmentPlanRevision>[0];
function line(status = 'REQUESTED'): Snapshot['items'][number] {
  return { ...inputLine, id: lineId, status, equipmentType: 'Microphones', lineRevision: 1, notes: 'Wireless',
    decisionReason: null, decidedAt: null, decidedBy: null, releasedAt: null, releasedBy: null, releaseReason: null, releaseCause: null };
}
function fixture(options: { status?: string; lines?: Snapshot['items']; actor?: WorkflowActor } = {}) {
  const actor = options.actor ?? coordinator;
  const state: Snapshot = { event: { id: eventId, name: 'Event', coordinatorId: actorId, organiserId: otherId,
    status: options.status ?? 'APPROVED', ...period, equipmentRequirements: 'Microphones', planStatus: 'REQUIRED', eventRevision: 1 },
  items: options.lines ?? [] };
  const flags = { noEvent: false, noLineEvent: false, noSnapshot: false, actorRole: actor.role as string, coordinatorRole: 'EVENT_COORDINATOR', insertMissing: false, injected: null as unknown };
  const calls: string[] = [];
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    calls.push(sql);
    if (flags.injected && sql.includes('INSERT INTO equipment_requests')) throw flags.injected;
    if (sql.startsWith('SELECT role FROM app_users')) return { rows: [{ role: values[0] === actor.id ? flags.actorRole : flags.coordinatorRole }], rowCount: 1 };
    if (sql.startsWith('SELECT status, coordinator_id')) return { rows: flags.noEvent ? [] : [{ status: state.event.status, coordinatorId: state.event.coordinatorId }], rowCount: 1 };
    if (sql.startsWith('SELECT event_request_id')) return { rows: flags.noLineEvent ? [] : [{ eventId }], rowCount: 1 };
    if (sql.startsWith('SELECT jsonb_build_object')) return { rows: flags.noSnapshot ? [] : [structuredClone(state)], rowCount: 1 };
    if (sql.startsWith('SELECT id, name, category')) return { rows: [{ id: typeId, name: 'Microphones', category: null }], rowCount: 1 };
    if (sql.startsWith('UPDATE event_requests')) { state.event.eventRevision++; state.event.planStatus = String(values[1] ?? 'REQUIRED'); }
    if (sql.includes("SET status = 'CANCELLED'")) { const row = state.items.find(item => item.id === values[0]); if (row) { row.status = 'CANCELLED'; row.lineRevision++; row.releaseReason = String(values[2]); } }
    if (sql.includes("SET status = 'REJECTED'")) { const row = state.items.find(item => item.id === values[0]); if (row) { row.status = 'REJECTED'; row.lineRevision++; row.decisionReason = String(values[2]); } }
    if (sql.startsWith('INSERT INTO equipment_requests')) {
      if (flags.insertMissing) return { rows: [], rowCount: 0 };
      const id = state.items.length ? otherId : lineId;
      state.items.push({ ...line(), id, equipmentTypeId: String(values[2]), quantity: Number(values[3]) });
      return { rows: [{ id }], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  });
  const release = vi.fn();
  const client = { query, release };
  const pool = { query, connect: vi.fn(async () => client) } as unknown as Pick<Pool, 'connect' | 'query'>;
  return { state, flags, calls, pool, query, release, version: () => equipmentPlanRevision(state) };
}
beforeEach(() => { vi.resetAllMocks(); });

describe('KAN-63 request input and source version', () => {
  it('keeps exact microseconds, trims notes and canonicalizes UUID case', () => {
    expect(parseEquipmentInput({ lines: [{ ...inputLine, equipmentTypeId: typeId.toUpperCase(), technicalRequirements: ' Wireless ' }] }))
      .toEqual({ notRequired: false, lines: [inputLine] });
    expect(parseEquipmentInput({ lines: [{ ...inputLine, technicalRequirements: ' ' }] }).lines[0]?.technicalRequirements).toBeNull();
    expect(parseEquipmentInput({ lines: [{ ...inputLine, technicalRequirements: undefined }] }).lines[0]?.technicalRequirements).toBeNull();
    expect(parseEquipmentInput({ notRequired: true, lines: [] })).toEqual({ notRequired: true, lines: [] });
  });
  it.each([null, [], 1, { lines: [] }, { lines: [inputLine], forged: true }, { notRequired: 'yes', lines: [] },
    { notRequired: true, lines: [inputLine] }, { lines: [null] }, { lines: [{ ...inputLine, forged: true }] },
    { lines: [{ ...inputLine, equipmentTypeId: '-'.repeat(36) }] }, { lines: [{ ...inputLine, quantity: 0 }] },
    { lines: [{ ...inputLine, quantity: 1.5 }] }, { lines: [{ ...inputLine, quantity: 2147483648 }] },
    { lines: [{ ...inputLine, startsAt: '2031-02-30T02:00:00Z' }] }, { lines: [{ ...inputLine, startsAt: '2031-01-12T02:00' }] },
    { lines: [{ ...inputLine, endsAt: inputLine.startsAt }] }, { lines: [{ ...inputLine, technicalRequirements: 7 }] },
    { lines: [{ ...inputLine, technicalRequirements: 'a'.repeat(2001) }] }, { lines: Array(31).fill(inputLine) },
    { lines: [inputLine, { ...inputLine, equipmentTypeId: typeId.toUpperCase() }] },
  ])('rejects invalid and forged request input %#', input => { expect(() => parseEquipmentInput(input)).toThrow(WorkflowError); });
  it('changes version for KAN-26 status/audit changes and empty Not Required changes', () => {
    const f = fixture({ lines: [line()] }); const old = f.version();
    f.state.items[0]!.status = 'RESERVED'; expect(f.version()).not.toBe(old);
    f.state.items = []; const empty = f.version(); f.state.event.planStatus = 'NOT_REQUIRED'; expect(f.version()).not.toBe(empty);
  });
});
describe('KAN-63 guarded reads and persistence', () => {
  it('reads source version, event window and active catalogue with matching row versions', async () => {
    const f = fixture({ lines: [line()] });
    const plan = await getEventEquipmentPlan(f.pool, { actor: coordinator, eventId });
    expect(plan).toMatchObject({ revision: f.version(), eventStartsAt: period.startsAt, eventEndsAt: period.endsAt });
    expect(plan.items[0]?.revision).toBe(plan.revision);
    expect(await listEquipmentRequests(f.pool, { actor: technical })).toHaveLength(1);
    expect(await listEquipmentRequests(f.pool, { actor: coordinator, eventId })).toHaveLength(1);
    expect(await listEquipmentTypes(f.pool)).toHaveLength(1);
    f.flags.noSnapshot = true; await expect(getEventEquipmentPlan(f.pool, { actor: coordinator, eventId })).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });
  it('rejects forbidden roles, malformed IDs and missing versions before mutation', async () => {
    const f = fixture(); const actor: WorkflowActor = { id: otherId, role: 'ATTENDEE' };
    await expect(getEventEquipmentPlan(f.pool, { actor, eventId })).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(listEquipmentRequests(f.pool, { actor: technical, eventId: 'bad' })).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    await expect(saveEquipmentRequest(f.pool, { actor, eventId, input: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    for (const version of [undefined, 1, '', 'z'.repeat(64)]) await expect(saveEquipmentRequest(f.pool, { actor: coordinator, eventId,
      input: { lines: [inputLine], revision: version } })).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    expect(f.pool.connect).not.toHaveBeenCalled();
  });
  it('saves exact source lines and returns the persisted post-save revision', async () => {
    const f = fixture({ lines: [line()] }); const old = f.version();
    const saved = await saveEquipmentRequest(f.pool, { actor: coordinator, eventId, input: { revision: old, lines: [inputLine] } });
    expect(saved.revision).toBe(f.version()); expect(saved.revision).not.toBe(old); expect(saved.lines).toHaveLength(1);
    expect(f.state.items[0]?.status).toBe('CANCELLED'); expect(f.calls.at(-1)).toBe('COMMIT');
    expect(f.calls.findIndex(s => s.startsWith('SELECT status'))).toBeLessThan(f.calls.findIndex(s => s.startsWith('SELECT t.id')));
    expect(f.calls.findIndex(s => s.startsWith('SELECT t.id'))).toBeLessThan(f.calls.findIndex(s => s.startsWith('SELECT id FROM equipment_requests')));
  });
  it('records explicit Not Required with a new version on the empty plan', async () => {
    const f = fixture(); const result = await saveEquipmentRequest(f.pool, { actor: coordinator, eventId,
      input: { revision: f.version(), lines: [], notRequired: true } });
    expect(result.status).toBe('NOT_REQUIRED'); expect(result.lines).toEqual([]); expect(result.revision).toBe(f.version());
  });
  it.each(['DRAFT', 'SUBMITTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])('refuses %s before equipment writes', async status => {
    const f = fixture({ status }); await expect(saveEquipmentRequest(f.pool, { actor: coordinator, eventId,
      input: { revision: f.version(), lines: [inputLine] } })).rejects.toMatchObject({ code: 'EVENT_NOT_APPROVED' });
    expect(f.calls.at(-1)).toBe('ROLLBACK'); expect(f.calls.some(s => s.startsWith('UPDATE'))).toBe(false);
  });
  it('fails closed on revoked profiles, missing events and changed assignment', async () => {
    for (const setup of [(f: ReturnType<typeof fixture>) => { f.flags.actorRole = 'ATTENDEE'; },
      (f: ReturnType<typeof fixture>) => { f.flags.noEvent = true; },
      (f: ReturnType<typeof fixture>) => { f.state.event.coordinatorId = otherId; }]) {
      const f = fixture(); setup(f); await expect(saveEquipmentRequest(f.pool, { actor: coordinator, eventId,
        input: { revision: f.version(), lines: [inputLine] } })).rejects.toBeInstanceOf(WorkflowError);
      expect(f.calls.at(-1)).toBe('ROLLBACK');
    }
  });
  it('rejects stale context, nonempty Not Required, decided replacements and period mismatch', async () => {
    const stale = fixture(); await expect(saveEquipmentRequest(stale.pool, { actor: coordinator, eventId,
      input: { revision: '0'.repeat(64), lines: [inputLine] } })).rejects.toMatchObject({ code: 'STALE_EQUIPMENT_REQUEST' });
    const active = fixture({ lines: [line()] }); await expect(saveEquipmentRequest(active.pool, { actor: coordinator, eventId,
      input: { revision: active.version(), lines: [], notRequired: true } })).rejects.toMatchObject({ code: 'EQUIPMENT_STILL_REQUIRED' });
    const decided = fixture({ lines: [line('RESERVED')] }); await expect(saveEquipmentRequest(decided.pool, { actor: coordinator, eventId,
      input: { revision: decided.version(), lines: [inputLine] } })).rejects.toMatchObject({ code: 'EQUIPMENT_REPLACEMENT_REQUIRED' });
    const period = fixture(); await expect(saveEquipmentRequest(period.pool, { actor: coordinator, eventId,
      input: { revision: period.version(), lines: [{ ...inputLine, endsAt: '2031-01-12T05:00:00Z' }] } })).rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_PERIOD_MISMATCH' });
  });
  it('rolls back inactive catalogue and database failures', async () => {
    const f = fixture(); f.flags.insertMissing = true;
    await expect(saveEquipmentRequest(f.pool, { actor: coordinator, eventId, input: { revision: f.version(), lines: [inputLine] } })).rejects.toThrow('inactive');
    const failed = fixture(); failed.flags.injected = new Error('database down');
    await expect(saveEquipmentRequest(failed.pool, { actor: coordinator, eventId, input: { revision: failed.version(), lines: [inputLine] } })).rejects.toThrow('database down');
  });
});
describe('KAN-63 review, cancellation and replacement', () => {
  it('reuses the KAN-26 reservation writer with current coordinator authorization', async () => {
    const f = fixture({ actor: technical, lines: [line()] });
    vi.mocked(readEquipmentReservationSnapshot).mockResolvedValue({ requests: [{ id: lineId }] } as never);
    vi.mocked(reserveEquipmentInTransaction).mockImplementation(async () => { f.state.items[0]!.status = 'RESERVED'; });
    expect(await reviewEquipmentRequest(f.pool, { actor: technical, lineId,
      input: { revision: f.version(), decision: 'RESERVED' } })).toMatchObject({ status: 'RESERVED', revision: f.version() });
    expect(reserveEquipmentInTransaction).toHaveBeenCalledWith(expect.anything(), expect.anything(), { id: lineId }, technical, true);
  });
  it('persists reasoned rejection and recipient-scoped notices, including absent coordinator', async () => {
    const f = fixture({ actor: technical, lines: [line()] }); f.state.event.coordinatorId = null; f.state.event.name = null;
    const result = await reviewEquipmentRequest(f.pool, { actor: technical, lineId,
      input: { revision: f.version(), decision: 'REJECTED', reason: ' Unavailable ' } });
    expect(result).toMatchObject({ status: 'REJECTED', decisionReason: 'Unavailable' });
    expect(f.calls.some(sql => sql.includes('INSERT INTO notifications'))).toBe(true);
  });
  it.each([{}, [], null, { decision: 'OTHER' }, { decision: 'RESERVED', forged: true },
    { decision: 'REJECTED', reason: '' }, { decision: 'REJECTED', reason: 4 }, { decision: 'REJECTED', reason: 'x'.repeat(2001) }])('rejects invalid decision %#', async input => {
    const f = fixture(); await expect(reviewEquipmentRequest(f.pool, { actor: technical, lineId,
      input: input && !Array.isArray(input) ? { revision: f.version(), ...input } : input })).rejects.toBeInstanceOf(WorkflowError);
  });
  it('rejects missing, stale or already decided requests and revoked coordinator', async () => {
    const f = fixture({ actor: technical, lines: [line('RESERVED')] });
    await expect(reviewEquipmentRequest(f.pool, { actor: technical, lineId,
      input: { revision: f.version(), decision: 'RESERVED' } })).rejects.toMatchObject({ code: 'EQUIPMENT_ALREADY_DECIDED' });
    f.flags.noLineEvent = true; await expect(reviewEquipmentRequest(f.pool, { actor: technical, lineId,
      input: { revision: f.version(), decision: 'RESERVED' } })).rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_FOUND' });
    f.flags.noLineEvent = false; f.state.items = []; await expect(reviewEquipmentRequest(f.pool, { actor: technical, lineId,
      input: { revision: f.version(), decision: 'RESERVED' } })).rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_NOT_FOUND' });
  });
  it.each([new WorkflowError('CONFLICT', 'EQUIPMENT_STOCK_CONFLICT', 'shortfall'), { constraint: 'equipment_requests_within_pool' }, new Error('failed')])('maps only availability errors, preserving other failures %#', async error => {
    const f = fixture({ actor: technical, lines: [line()] }); vi.mocked(readEquipmentReservationSnapshot).mockResolvedValue({ requests: [{ id: lineId }] } as never);
    vi.mocked(reserveEquipmentInTransaction).mockRejectedValue(error);
    await expect(reviewEquipmentRequest(f.pool, { actor: technical, lineId,
      input: { revision: f.version(), decision: 'RESERVED' } })).rejects.toThrow(error instanceof Error && error.message === 'failed' ? 'failed' : 'no longer available');
    expect(f.calls.at(-1)).toBe('ROLLBACK');
  });
  it('cancels requested/rejected lines with a required version and reason', async () => {
    for (const status of ['REQUESTED', 'REJECTED']) {
      const f = fixture({ lines: [line(status)] }); const result = await cancelEquipmentLine(f.pool, { actor: coordinator, lineId,
        input: { revision: f.version(), reason: ' No longer required ' } });
      expect(result.status).toBe('CANCELLED'); expect(result.releaseReason).toBe('No longer required');
    }
    const reserved = fixture({ lines: [line('RESERVED')] }); await expect(cancelEquipmentLine(reserved.pool, { actor: coordinator, lineId,
      input: { revision: reserved.version(), reason: 'Cancel' } })).rejects.toMatchObject({ code: 'EQUIPMENT_CANNOT_BE_CANCELLED' });
    for (const reason of ['', 'x'.repeat(2001), null]) await expect(cancelEquipmentLine(reserved.pool, { actor: coordinator, lineId,
      input: { revision: reserved.version(), reason } })).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
  });
  it('explicitly replaces a reservation, rejects undecided/duplicate replacements, and preserves current version', async () => {
    const f = fixture({ lines: [line('RESERVED')] }); const result = await replaceReservedEquipmentLine(f.pool, { actor: coordinator, lineId,
      input: { revision: f.version(), replacement: inputLine } });
    expect(result).toMatchObject({ cancelledRequestId: lineId, replacement: { status: 'REQUESTED' }, revision: f.version() });
    const pending = fixture({ lines: [line()] }); await expect(replaceReservedEquipmentLine(pending.pool, { actor: coordinator, lineId,
      input: { revision: pending.version(), replacement: inputLine } })).rejects.toMatchObject({ code: 'EQUIPMENT_NOT_RESERVED' });
    const duplicate = fixture({ lines: [line('RESERVED'), { ...line(), id: otherId }] }); await expect(replaceReservedEquipmentLine(duplicate.pool, { actor: coordinator, lineId,
      input: { revision: duplicate.version(), replacement: inputLine } })).rejects.toMatchObject({ code: 'EQUIPMENT_REPLACEMENT_REQUIRED' });
  });
});
