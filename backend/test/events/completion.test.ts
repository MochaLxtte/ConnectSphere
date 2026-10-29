import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeEvent, readEventCompletion } from '../../src/modules/events/completion.js';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { recordNotifications } from '../../src/modules/notifications/notify.js';

vi.mock('../../src/modules/notifications/notify.js', () => ({ recordNotifications: vi.fn(async () => 2) }));
const actor: WorkflowActor = { id: '10000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const organiserId = '10000000-0000-4000-8000-000000000003';
const eventId = '10000000-0000-4000-8000-000000000002';
type Found = { id: string; organiserId: string; coordinatorId: string | null; status: string; name: string | null; endsAt: string | null; ended: boolean | null };
let role: string | null; let found: Found | undefined; let updatedRows: number; let history: { changedAt: string; changedByName: string | null }[]; let reserved: number; let extraBooking: boolean;
const statements: string[] = [];
const release = vi.fn();
const event = (over: Partial<Found> = {}): Found => ({ id: eventId, organiserId, coordinatorId: actor.id, status: 'CONFIRMED', name: 'Career fair',
  endsAt: '2020-01-12T06:00:00.000Z', ended: true, ...over });
const query = vi.fn(async (raw: string) => {
  const sql = raw.replace(/\s+/g, ' ').trim();
  statements.push(sql);
  if (sql.includes('FROM app_users WHERE id = $1 FOR SHARE')) return { rows: role ? [{ role }] : [] };
  if (sql.includes('FROM venue_bookings WHERE event_request_id = $1 AND status IN')) {
    return { rows: sql.includes('FOR UPDATE') ? [] : extraBooking ? [{ id: 'b1', venueId: 'v1' }] : [] };
  }
  if (sql.includes('FROM event_requests WHERE id = $1 FOR UPDATE')) return { rows: found ? [{ ...found }] : [] };
  if (sql.includes("status = 'RESERVED'") && sql.includes('count(*)')) return { rows: [{ count: reserved }] };
  if (sql.startsWith('UPDATE event_requests')) return { rows: [], rowCount: updatedRows };
  if (sql.includes('FROM event_status_history h')) return { rows: history };
  return { rows: [], rowCount: 0 };
});
const pool = { connect: vi.fn(async () => ({ query, release })), query } as unknown as Pick<Pool, 'connect' | 'query'>;
beforeEach(() => {
  vi.clearAllMocks(); statements.length = 0; role = 'EVENT_COORDINATOR'; found = event(); updatedRows = 1; reserved = 2; extraBooking = false;
  history = [{ changedAt: '2026-10-29T03:00:00.000Z', changedByName: 'Casey' }];
});
const run = (who: WorkflowActor = actor) => completeEvent(pool, { eventRequestId: eventId, actor: who });

describe('KAN-10 completion service', () => {
  it('KAN-10-AC2 completes an ended confirmed event and reports the recorded actor and time', async () => {
    const result = await run();
    expect(result).toEqual({ eventRequestId: eventId, status: 'COMPLETED', completedById: actor.id, completedByName: 'Casey',
      completedAt: '2026-10-29T03:00:00.000Z', releasedEquipmentRequests: 2 });
    expect(statements[0]).toBe('BEGIN ISOLATION LEVEL READ COMMITTED');
    expect(statements).toContain('COMMIT');
    expect(statements.findIndex(sql => sql.includes('FROM event_requests WHERE id = $1 FOR UPDATE')))
      .toBeLessThan(statements.findIndex(sql => sql.includes('FROM equipment_types t')));
    expect(vi.mocked(recordNotifications).mock.calls[0]![1].map(item => item.recipientId).sort()).toEqual([actor.id, organiserId].sort());
  });
  it('KAN-10-AC1 treats a missing, draft, unassigned or someone else\'s event as not found', async () => {
    for (const bad of [undefined, event({ status: 'DRAFT' }), event({ coordinatorId: null }), event({ coordinatorId: 'other' })]) {
      found = bad;
      await expect(run()).rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'EVENT_REQUEST_NOT_FOUND' });
    }
    expect(statements.some(sql => sql.startsWith('UPDATE event_requests'))).toBe(false);
  });
  it('KAN-10-AC1 refuses a caller who is not an Event Coordinator now or in the database', async () => {
    role = 'EVENT_ORGANISER';
    await expect(run()).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    role = null;
    await expect(run()).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    role = 'EVENT_COORDINATOR';
    await expect(run({ ...actor, role: 'ATTENDEE' })).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });
  it('KAN-10-AC101/AC103 refuses repeated completion and any other status', async () => {
    found = event({ status: 'COMPLETED' });
    await expect(run()).rejects.toMatchObject({ kind: 'CONFLICT', code: 'EVENT_ALREADY_COMPLETED' });
    for (const status of ['APPROVED', 'SUBMITTED', 'CANCELLED', 'REJECTED', 'UNDER_REVIEW']) {
      found = event({ status });
      await expect(run()).rejects.toMatchObject({ code: 'EVENT_NOT_COMPLETABLE' });
    }
    expect(statements).toContain('ROLLBACK');
    expect(vi.mocked(recordNotifications)).not.toHaveBeenCalled();
  });
  it('KAN-10-AC101 refuses an early event and one with no end time, naming the end instant when known', async () => {
    found = event({ ended: false, endsAt: '2031-01-12T06:00:00.000Z' });
    await expect(run()).rejects.toMatchObject({ code: 'EVENT_NOT_ENDED', message: expect.stringContaining('2031-01-12T06:00:00.000Z') });
    found = event({ ended: null, endsAt: null });
    await expect(run()).rejects.toMatchObject({ code: 'EVENT_NOT_ENDED', message: expect.not.stringContaining('ends at') });
  });
  it('refuses when a venue arrangement appeared while the action was being prepared', async () => {
    extraBooking = true;
    await expect(run()).rejects.toMatchObject({ code: 'EVENT_ARRANGEMENTS_CHANGED' });
  });
  it('rolls back when the status update or its history cannot be written', async () => {
    updatedRows = 0;
    await expect(run()).rejects.toThrow('The event status could not be updated.');
    updatedRows = 1; history = [];
    await expect(run()).rejects.toThrow('The completion was not recorded in the status history.');
    expect(statements).toContain('ROLLBACK');
  });
  it('reports zero released equipment when none was reserved', async () => {
    reserved = 0;
    expect((await run()).releasedEquipmentRequests).toBe(0);
  });
});

describe('KAN-10-AC3 reading a completion', () => {
  const row = (over: Record<string, unknown> = {}) => ({ organiserId, coordinatorId: actor.id, status: 'COMPLETED', changedById: actor.id,
    changedByName: 'Casey', changedAt: '2026-10-29T03:00:00.000Z', released: 3, ...over });
  const read = async (rows: unknown[], who: WorkflowActor) => {
    query.mockResolvedValueOnce({ rows } as never);
    return readEventCompletion(pool, { eventRequestId: eventId, actor: who });
  };
  it('returns the completion to the organiser and the assigned coordinator', async () => {
    const expected = { eventRequestId: eventId, status: 'COMPLETED', completedById: actor.id, completedByName: 'Casey',
      completedAt: '2026-10-29T03:00:00.000Z', releasedEquipmentRequests: 3 };
    expect(await read([row()], actor)).toEqual(expected);
    expect(await read([row()], { id: organiserId, role: 'EVENT_ORGANISER' })).toEqual(expected);
  });
  it('returns null for an unrelated person, an uncompleted event, a missing event or a missing history row', async () => {
    expect(await read([row()], { id: 'other', role: 'EVENT_COORDINATOR' })).toBeNull();
    expect(await read([row()], { id: organiserId, role: 'EVENT_COORDINATOR' })).toBeNull();
    expect(await read([row({ status: 'CONFIRMED' })], actor)).toBeNull();
    expect(await read([], actor)).toBeNull();
    expect(await read([row({ changedAt: null })], actor)).toBeNull();
    expect(await read([row({ changedById: null })], actor)).toBeNull();
  });
});
