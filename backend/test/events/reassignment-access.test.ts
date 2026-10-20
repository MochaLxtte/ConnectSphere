import { describe, expect, it, vi } from 'vitest';
import { listAssignments } from '../../src/modules/events/assignment.js';
import { listClarifications } from '../../src/modules/events/clarifications.js';
import { listStatusHistory } from '../../src/modules/events/status-history.js';
import type { WorkflowActor, WorkflowDependencies } from '../../src/modules/events/workflow-support.js';

const eventRequestId = '10000000-0000-4000-8000-000000000001';
const actor: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const event = { id: eventRequestId, organiserId: 'owner', coordinatorId: actor.id, status: 'SUBMITTED' };
const time = new Date('2031-01-01T00:00:00Z');

function database(options: { event?: typeof event | null; rows?: unknown[]; failure?: string; rollbackFailure?: boolean } = {}) {
  const query = vi.fn(async (sql: string) => {
    if (sql === 'ROLLBACK' && options.rollbackFailure) throw new Error('rollback failed');
    if (sql.includes(options.failure ?? 'never-matches')) throw new Error('read failed');
    if (sql.includes('FOR SHARE')) return { rows: options.event === null ? [] : [options.event ?? event] };
    if (sql.includes('FROM coordinator_assignments') || sql.includes('FROM event_clarifications') || sql.includes('FROM event_status_history')) {
      return { rows: options.rows ?? [] };
    }
    return { rows: [] };
  });
  const release = vi.fn();
  const poolQuery = vi.fn();
  const connect = vi.fn().mockResolvedValue({ query, release });
  return { dependencies: { pool: { query: poolQuery, connect } } as unknown as WorkflowDependencies,
    query, poolQuery, release, sql: () => query.mock.calls.map(([sql]) => sql) };
}

describe('KAN-65 assignment-based history reads', () => {
  const readers = [
    { name: 'assignment', read: listAssignments, table: 'coordinator_assignments' },
    { name: 'clarification', read: listClarifications, table: 'event_clarifications' },
    { name: 'status', read: listStatusHistory, table: 'event_status_history' },
  ];
  it.each(readers)('holds a share lock through the $name read and releases it', async ({ read, table }) => {
    const db = database();
    expect(await read(db.dependencies, { eventRequestId, actor })).toEqual([]);
    expect(db.sql()[0]).toBe('BEGIN ISOLATION LEVEL READ COMMITTED');
    expect(db.sql()[2]).toContain('FOR SHARE');
    expect(db.sql()[3]).toContain(`FROM ${table}`);
    expect(db.sql().at(-1)).toBe('COMMIT');
    expect(db.poolQuery).not.toHaveBeenCalled();
    expect(db.release).toHaveBeenCalledExactlyOnceWith(undefined);
  });
  it.each(readers)('denies the old coordinator before reading $name records', async ({ read, table }) => {
    const db = database({ event: { ...event, coordinatorId: 'replacement' } });
    await expect(read(db.dependencies, { eventRequestId, actor })).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(db.sql().some(sql => sql.includes(`FROM ${table}`))).toBe(false);
    expect(db.sql().at(-1)).toBe('ROLLBACK');
    expect(db.release).toHaveBeenCalledOnce();
  });
  it.each(readers)('releases the $name lock after missing-event or child-query failure', async ({ read, table }) => {
    for (const options of [{ event: null }, { failure: `FROM ${table}` }]) {
      const db = database(options);
      await expect(read(db.dependencies, { eventRequestId, actor })).rejects.toThrow();
      expect(db.sql().at(-1)).toBe('ROLLBACK');
      expect(db.release).toHaveBeenCalledOnce();
    }
  });
  it('discards a connection if rollback also fails', async () => {
    const db = database({ failure: 'FROM event_status_history', rollbackFailure: true });
    await expect(listStatusHistory(db.dependencies, { eventRequestId, actor })).rejects.toThrow('read failed');
    expect(db.release).toHaveBeenCalledWith(expect.objectContaining({ message: 'rollback failed' }));
  });
  it('preserves clarification and status dates for authorised users', async () => {
    const clarification = { id: 'question', eventRequestId, requestedById: actor.id,
      requestedByName: 'Coordinator', message: 'Question', response: null, createdAt: time, respondedAt: null };
    const db = database({ rows: [clarification] });
    expect(await listClarifications(db.dependencies, { eventRequestId, actor })).toEqual([
      { ...clarification, createdAt: time.toISOString() },
    ]);
    const answered = database({ rows: [{ ...clarification, respondedAt: time }] });
    expect((await listClarifications(answered.dependencies, { eventRequestId, actor }))[0]?.respondedAt).toBe(time.toISOString());
    const status = { id: 'status', fromStatus: 'DRAFT', toStatus: 'SUBMITTED', changedById: null,
      changedByName: null, createdAt: time };
    const history = database({ rows: [status] });
    expect(await listStatusHistory(history.dependencies, { eventRequestId, actor })).toEqual([{ ...status, createdAt: time.toISOString() }]);
  });
});
