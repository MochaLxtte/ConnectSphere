import { describe, expect, it, vi } from 'vitest';
import { USER_ROLES } from '../../src/modules/auth/types.js';
import { parseReassignmentInput, reassignCoordinator } from '../../src/modules/events/assignment.js';
import type { EventStatus } from '../../src/modules/events/types.js';
import type { WorkflowActor, WorkflowDependencies } from '../../src/modules/events/workflow-support.js';
import { REASSIGNED_AWAY_MESSAGE } from '../../src/modules/notifications/trigger-matrix.js';
import { notificationRows } from '../support/notification-rows.js';

const eventId = '10000000-0000-4000-8000-000000000001';
const lead: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR_LEAD' };
const previousCoordinatorId = '30000000-0000-4000-8000-000000000001';
const coordinatorId = '40000000-0000-4000-8000-000000000001';
const previousId = '50000000-0000-4000-8000-000000000001';
const assignmentId = '60000000-0000-4000-8000-000000000001';
const event = { id: eventId, organiserId: '70000000-0000-4000-8000-000000000001',
  coordinatorId: previousCoordinatorId as string | null, status: 'SUBMITTED' as EventStatus };
const input = { coordinatorId, reason: '  Workload handover  ', expectedAssignmentVersion: previousId };

function transaction(options: {
  event?: typeof event | null;
  history?: { id: string; coordinatorId: string }[];
  target?: { role: string; available: boolean; displayName?: string } | null;
  missingInsert?: boolean;
  updatedRows?: number;
  failStatement?: string;
  rollbackError?: unknown;
  connectionError?: boolean;
} = {}) {
  const query = vi.fn(async (sql: string, _values?: unknown[]) => {
    if (sql === 'ROLLBACK' && options.rollbackError !== undefined) throw options.rollbackError;
    if (options.failStatement && sql.includes(options.failStatement)) throw new Error('Injected failure');
    if (sql.includes('FROM event_requests') && sql.includes('FOR UPDATE')) {
      return { rows: options.event === null ? [] : [options.event ?? event] };
    }
    if (sql.includes('FROM coordinator_assignments') && sql.includes('FOR UPDATE')) {
      return { rows: options.history ?? [{ id: previousId, coordinatorId: previousCoordinatorId }] };
    }
    if (sql.includes('FROM app_users')) {
      return { rows: options.target === null ? [] : [options.target ?? { role: 'EVENT_COORDINATOR', available: true, displayName: 'Casey' }] };
    }
    if (sql.includes('INSERT INTO coordinator_assignments')) return { rows: options.missingInsert ? [] : [{ id: assignmentId }] };
    if (sql.startsWith('UPDATE event_requests')) return { rows: [], rowCount: options.updatedRows ?? 1 };
    return { rows: [] };
  });
  const release = vi.fn();
  const connect = options.connectionError ? vi.fn().mockRejectedValue(new Error('Connection failed'))
    : vi.fn().mockResolvedValue({ query, release });
  const dependencies = { pool: { query: vi.fn(), connect } } as unknown as WorkflowDependencies;
  return { dependencies, query, connect, release, sql: () => query.mock.calls.map(([sql]) => sql) };
}

function reassign(dependencies: WorkflowDependencies, body: unknown = input, actor = lead) {
  return reassignCoordinator(dependencies, { eventRequestId: eventId, actor, input: body });
}

describe('KAN-65 reassignment input boundary', () => {
  it.each([null, undefined, [], 'text', true, 42, {},
    { ...input, coordinatorId: null }, { ...input, coordinatorId: 3 }, { ...input, coordinatorId: '' },
    { ...input, coordinatorId: 'no-uuid' }, { ...input, expectedAssignmentVersion: undefined },
    { ...input, expectedAssignmentVersion: null }, { ...input, expectedAssignmentVersion: 1 },
    { ...input, expectedAssignmentVersion: '' }, { ...input, expectedAssignmentVersion: 'stale' },
    { ...input, reason: undefined }, { ...input, reason: null }, { ...input, reason: 10 },
    { ...input, reason: '' }, { ...input, reason: ' \t\n ' }, { ...input, reason: 'x'.repeat(2001) },
    { ...input, actorId: lead.id }, { ...input, role: 'EVENT_COORDINATOR_LEAD' },
    { ...input, previousCoordinatorId }, { ...input, note: 'Not the reason field' },
  ])('rejects malformed, blank, oversized or forged input %j before connecting', async (body) => {
    const { dependencies, connect } = transaction();
    await expect(reassignCoordinator(dependencies, { eventRequestId: eventId, actor: lead, input: body }))
      .rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    expect(connect).not.toHaveBeenCalled();
  });

  it('normalises both UUIDs and accepts a trimmed reason at its length boundary', () => {
    const id = 'ABCDEFAB-1234-4000-8000-ABCDEFABCDEF';
    expect(parseReassignmentInput({ coordinatorId: id, expectedAssignmentVersion: id, reason: ` ${'x'.repeat(2000)} ` }))
      .toEqual({ coordinatorId: id.toLowerCase(), expectedAssignmentVersion: id.toLowerCase(), reason: 'x'.repeat(2000) });
  });
});

describe('KAN-65 atomic Lead reassignment', () => {
  it.each(USER_ROLES.filter((role) => role !== 'EVENT_COORDINATOR_LEAD'))(
    'refuses %s before parsing or reading protected data', async (role) => {
      const { dependencies, connect } = transaction();
      await expect(reassign(dependencies, null, { ...lead, role }))
        .rejects.toMatchObject({ kind: 'FORBIDDEN', code: 'ASSIGNMENT_FORBIDDEN' });
      expect(connect).not.toHaveBeenCalled();
    },
  );

  it.each(['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED'] as const)(
    'hands over an active %s event with one shared audit timestamp and no status change', async (status) => {
      const { dependencies, query, sql, release } = transaction({ event: { ...event, status } });
      expect(await reassign(dependencies)).toEqual({ eventRequestId: eventId, assignmentId, coordinatorId,
        previousCoordinatorId, changed: true });
      expect(query).toHaveBeenCalledWith("SELECT set_config('app.actor_id', $1, true)", [lead.id]);
      const writes = sql().filter((sql) => /^(WITH closed_assignment|UPDATE event_requests)/.test(sql));
      expect(writes).toHaveLength(2);
      expect(writes[0]).toContain('GREATEST(clock_timestamp(), assigned_at)');
      expect(writes[0]).toContain('SELECT $2, $3, $4, $5, unassigned_at FROM closed_assignment');
      expect(query).toHaveBeenCalledWith(writes[0], [previousId, eventId, coordinatorId, lead.id, 'Workload handover']);
      expect(query).toHaveBeenCalledWith(writes[1], [coordinatorId, eventId, assignmentId]);
      expect(writes[1]).not.toContain('status =');
      expect(sql().findIndex((sql) => sql.includes('FROM event_requests') && sql.includes('FOR UPDATE')))
        .toBeLessThan(sql().findIndex((sql) => sql.includes('FOR NO KEY UPDATE')));
      expect(sql().some((sql) => /event_reviews|venue_bookings|event_clarifications/.test(sql))).toBe(false);
      // KAN-64-AC202: organiser and new coordinator are told; the previous coordinator gets only the minimal notice.
      const notified = notificationRows(query.mock.calls);
      expect(notified.map((row) => [row.recipientId, row.type])).toEqual([
        [event.organiserId, 'COORDINATOR_REASSIGNED'], [coordinatorId, 'COORDINATOR_REASSIGNED'],
        [previousCoordinatorId, 'COORDINATOR_REASSIGNED_AWAY'],
      ]);
      expect(notified[2]!.message).toBe(REASSIGNED_AWAY_MESSAGE);
      expect(notified.every((row) => row.dedupeKey.endsWith(`:${assignmentId}`))).toBe(true);
      expect(sql()).toContain('COMMIT');
      expect(sql()).not.toContain('ROLLBACK');
      expect(release).toHaveBeenCalledExactlyOnceWith(undefined);
    },
  );

  it('returns an unchanged result without querying target eligibility or creating writes', async () => {
    const { dependencies, sql } = transaction({ target: { role: 'EVENT_COORDINATOR', available: false } });
    expect(await reassign(dependencies, { ...input, coordinatorId: previousCoordinatorId }))
      .toEqual({ eventRequestId: eventId, assignmentId: previousId, coordinatorId: previousCoordinatorId,
        previousCoordinatorId, changed: false });
    expect(sql().some((sql) => /FROM app_users|INSERT|^UPDATE|^WITH/.test(sql))).toBe(false);
    expect(sql()).toContain('COMMIT');
  });

  it.each([coordinatorId, previousCoordinatorId])('rejects a stale version before a handover or same-target no-op', async (targetId) => {
    const { dependencies, sql } = transaction();
    await expect(reassign(dependencies, { ...input, coordinatorId: targetId, expectedAssignmentVersion: assignmentId }))
      .rejects.toMatchObject({ kind: 'CONFLICT', code: 'ASSIGNMENT_VERSION_CONFLICT' });
    expect(sql().some((sql) => /FROM app_users|INSERT|^UPDATE|^WITH/.test(sql))).toBe(false);
    expect(sql()).toContain('ROLLBACK');
  });

  it('rejects a consistent unassigned event and preserves the separate initial-allocation action', async () => {
    const { dependencies, sql } = transaction({ event: { ...event, coordinatorId: null }, history: [] });
    await expect(reassign(dependencies)).rejects.toMatchObject({ code: 'COORDINATOR_NOT_ASSIGNED', kind: 'CONFLICT' });
    expect(sql().some((sql) => /INSERT|^UPDATE|^WITH/.test(sql))).toBe(false);
  });

  it.each([
    { history: [] },
    { history: [{ id: previousId, coordinatorId }] },
    { history: [{ id: previousId, coordinatorId: previousCoordinatorId }, { id: assignmentId, coordinatorId }] },
    { event: { ...event, coordinatorId: null } },
  ])('fails closed for inconsistent assignment history %j without replacing evidence', async (options) => {
    const { dependencies, sql } = transaction(options);
    await expect(reassign(dependencies)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'ASSIGNMENT_HISTORY_CONFLICT' });
    expect(sql().some((sql) => /FROM app_users|INSERT|^UPDATE|^WITH/.test(sql))).toBe(false);
  });

  it.each([null, { ...event, status: 'DRAFT' as const }])('hides a missing or draft event before reading history', async (savedEvent) => {
    const { dependencies, sql } = transaction({ event: savedEvent });
    await expect(reassign(dependencies)).rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(sql().some((sql) => /coordinator_assignments|app_users/.test(sql))).toBe(false);
  });

  it.each(['REJECTED', 'CANCELLED', 'COMPLETED'] as const)('refuses inactive state %s', async (status) => {
    const { dependencies, sql } = transaction({ event: { ...event, status } });
    await expect(reassign(dependencies)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'ASSIGNMENT_NOT_ALLOWED' });
    expect(sql().some((sql) => /coordinator_assignments|app_users/.test(sql))).toBe(false);
  });

  it.each([null, { role: 'EVENT_COORDINATOR', available: false },
    ...USER_ROLES.filter((role) => role !== 'EVENT_COORDINATOR').map((role) => ({ role, available: true })),
  ])('rechecks target eligibility under its row lock: %j', async (target) => {
    const { dependencies, query, sql } = transaction({ target });
    await expect(reassign(dependencies)).rejects.toMatchObject({ kind: 'INVALID_INPUT', code: 'INVALID_COORDINATOR' });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FOR NO KEY UPDATE'), [coordinatorId]);
    expect(sql().some((sql) => /INSERT|^UPDATE|^WITH/.test(sql))).toBe(false);
  });

  it.each([{ missingInsert: true }, { updatedRows: 0 }, { failStatement: 'BEGIN' },
    { failStatement: 'set_config' }, { failStatement: 'FROM event_requests' },
    { failStatement: 'FROM coordinator_assignments' }, { failStatement: 'FROM app_users' },
    { failStatement: 'WITH closed_assignment' }, { failStatement: 'UPDATE event_requests' }, { failStatement: 'COMMIT' },
  ])('rolls back failures without a partial handover: %j', async (options) => {
    const { dependencies, sql, release } = transaction(options);
    await expect(reassign(dependencies)).rejects.toThrow();
    expect(sql()).toContain('ROLLBACK');
    expect(release).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it.each([new Error('Rollback failed'), 'Rollback failed'])('discards a connection whose rollback fails: %j', async (rollbackError) => {
    const { dependencies, release } = transaction({ failStatement: 'WITH closed_assignment', rollbackError });
    await expect(reassign(dependencies)).rejects.toThrow('Injected failure');
    expect(release).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
  });

  it('propagates a connection failure without attempting statements or releasing an absent connection', async () => {
    const { dependencies, query, release } = transaction({ connectionError: true });
    await expect(reassign(dependencies)).rejects.toThrow('Connection failed');
    expect(query).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });
});
