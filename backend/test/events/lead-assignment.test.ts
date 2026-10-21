import { describe, expect, it, vi } from 'vitest';
import { USER_ROLES } from '../../src/modules/auth/types.js';
import {
  assignCoordinator, getLeadEventDetail, listAssignments, listCoordinators,
  listLeadOversight, listUnassignedRequests, parseAssignmentInput,
} from '../../src/modules/events/assignment.js';
import type { EventStatus } from '../../src/modules/events/types.js';
import type { WorkflowActor, WorkflowDependencies } from '../../src/modules/events/workflow-support.js';
import { notificationRows } from '../support/notification-rows.js';

const eventId = '10000000-0000-4000-8000-000000000001';
const lead: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR_LEAD' };
const coordinator: WorkflowActor = { id: '30000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const organiser: WorkflowActor = { id: '40000000-0000-4000-8000-000000000001', role: 'EVENT_ORGANISER' };
const assignmentId = '50000000-0000-4000-8000-000000000001';
const activeStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED'];
const event = { id: eventId, organiserId: organiser.id, coordinatorId: null as string | null, status: 'SUBMITTED' as EventStatus };
const row = {
  id: eventId, name: 'Open day', status: 'SUBMITTED', organiserName: 'Organiser',
  startsAt: new Date('2031-01-12T02:00:00Z'), endsAt: null, expectedAttendance: 0,
  updatedAt: new Date('2030-12-01T00:00:00Z'), coordinatorId: null, coordinatorName: null,
};

function readDatabase(rows: unknown[] = []) {
  const query = vi.fn().mockResolvedValue({ rows });
  const connect = vi.fn().mockResolvedValue({
    query: vi.fn((sql: string, values?: unknown[]) =>
      /^(BEGIN|COMMIT|ROLLBACK|SELECT set_config)/.test(sql)
        ? Promise.resolve({ rows: [] }) : query(sql, values)),
    release: vi.fn(),
  });
  return { dependencies: { pool: { query, connect } } as unknown as WorkflowDependencies, query, connect };
}

function transaction(options: {
  event?: typeof event | null;
  activeHistory?: boolean;
  target?: { role: string; available: boolean; displayName?: string } | null;
  missingInsert?: boolean;
  updatedRows?: number;
  failStatement?: string;
  rollbackError?: unknown;
} = {}) {
  const query = vi.fn(async (sql: string, _values?: unknown[]) => {
    if (sql === 'ROLLBACK' && options.rollbackError !== undefined) throw options.rollbackError;
    if (options.failStatement && sql.includes(options.failStatement)) throw new Error('Injected failure');
    if (sql.includes('FROM event_requests') && sql.includes('FOR UPDATE')) {
      return { rows: options.event === null ? [] : [options.event ?? event] };
    }
    if (sql.includes('SELECT EXISTS')) return { rows: [{ exists: options.activeHistory ?? false }] };
    if (sql.includes('FROM app_users')) {
      return { rows: options.target === null ? [] : [options.target ?? { role: 'EVENT_COORDINATOR', available: true, displayName: 'Casey' }] };
    }
    if (sql.includes('INSERT INTO coordinator_assignments')) {
      return { rows: options.missingInsert ? [] : [{ id: assignmentId }] };
    }
    if (sql.startsWith('UPDATE event_requests')) return { rows: [], rowCount: options.updatedRows ?? 1 };
    return { rows: [] };
  });
  const release = vi.fn();
  const connect = vi.fn().mockResolvedValue({ query, release });
  const dependencies = { pool: { query: vi.fn(), connect } } as unknown as WorkflowDependencies;
  return { dependencies, query, connect, release, sql: () => query.mock.calls.map(([sql]) => sql) };
}

function assign(dependencies: WorkflowDependencies, actor = lead, input: unknown = { coordinatorId: coordinator.id }) {
  return assignCoordinator(dependencies, { eventRequestId: eventId, actor, input });
}

describe('KAN-79 Lead-only allocation services', () => {
  it.each(USER_ROLES.filter((role) => role !== 'EVENT_COORDINATOR_LEAD'))(
    'refuses %s before reading any allocation data or parsing a mutation', async (role) => {
      const actor = { ...lead, role };
      const { dependencies, query, connect } = readDatabase();
      const operations = [
        () => listUnassignedRequests(dependencies, actor),
        () => listLeadOversight(dependencies, actor),
        () => getLeadEventDetail(dependencies, { eventRequestId: eventId, actor }),
        () => listCoordinators(dependencies, actor),
        () => assign(dependencies, actor, null),
      ];
      for (const operation of operations) {
        await expect(operation()).rejects.toMatchObject({ kind: 'FORBIDDEN', code: 'ASSIGNMENT_FORBIDDEN' });
      }
      expect(query).not.toHaveBeenCalled();
      expect(connect).not.toHaveBeenCalled();
    },
  );

  it('lists only submitted unassigned requests with stable ordering and serialised dates', async () => {
    const { coordinatorId: _coordinatorId, coordinatorName: _coordinatorName, ...unassigned } = row;
    const { dependencies, query } = readDatabase([unassigned]);
    expect(await listUnassignedRequests(dependencies, lead)).toEqual([{
      ...unassigned, startsAt: '2031-01-12T02:00:00.000Z', updatedAt: '2030-12-01T00:00:00.000Z',
    }]);
    expect(query.mock.calls[0]![0]).toContain("e.coordinator_id IS NULL AND e.status = 'SUBMITTED'");
    expect(query.mock.calls[0]![0]).toContain('ORDER BY e.updated_at ASC, e.id ASC');
  });

  it('lists active oversight with current assignments and excludes draft/closed states in SQL', async () => {
    const assignedRow = { ...row, coordinatorId: coordinator.id, coordinatorName: 'Coordinator' };
    const { dependencies, query } = readDatabase([assignedRow]);
    expect(await listLeadOversight(dependencies, lead)).toEqual([{
      ...assignedRow, startsAt: '2031-01-12T02:00:00.000Z', updatedAt: '2030-12-01T00:00:00.000Z',
    }]);
    expect(query.mock.calls[0]![1]).toEqual([activeStatuses]);
    expect(query.mock.calls[0]![0]).toContain('LEFT JOIN app_users c ON c.id = e.coordinator_id');
  });

  it('returns empty lists without inventing requests or eligible targets', async () => {
    const { dependencies } = readDatabase();
    expect(await listUnassignedRequests(dependencies, lead)).toEqual([]);
    expect(await listLeadOversight(dependencies, lead)).toEqual([]);
    expect(await listCoordinators(dependencies, lead)).toEqual([]);
  });

  it('offers only available coordinators, ordered by name with a deterministic tie break', async () => {
    const target = { id: coordinator.id, displayName: 'Coordinator', email: 'coordinator@example.test' };
    const { dependencies, query } = readDatabase([target]);
    expect(await listCoordinators(dependencies, lead)).toEqual([target]);
    expect(query.mock.calls[0]![0]).toContain("role = 'EVENT_COORDINATOR' AND coordinator_available = true");
    expect(query.mock.calls[0]![0]).toContain('ORDER BY lower(display_name), id');
  });

  it.each([
    { coordinatorId: null, activeAssignmentCount: 0, assignmentCoordinatorId: null, allowed: true, reassign: false },
    { coordinatorId: null, activeAssignmentCount: 1, assignmentCoordinatorId: coordinator.id, allowed: false, reassign: false },
    { coordinatorId: coordinator.id, activeAssignmentCount: 1, assignmentCoordinatorId: coordinator.id, allowed: false, reassign: true },
    { coordinatorId: coordinator.id, activeAssignmentCount: 0, assignmentCoordinatorId: null, allowed: false, reassign: false },
    { coordinatorId: coordinator.id, activeAssignmentCount: 1, assignmentCoordinatorId: organiser.id, allowed: false, reassign: false },
    { coordinatorId: coordinator.id, activeAssignmentCount: 2, assignmentCoordinatorId: coordinator.id, allowed: false, reassign: false },
  ])('KAN-65 derives assignment capabilities only from consistent current state: %j', async ({ allowed, reassign, ...state }) => {
    const detail = { ...row, ...state, purpose: 'Community', description: null,
      assignmentVersion: state.activeAssignmentCount > 0 ? assignmentId : null,
      venueRequirements: 'Hall', accessibilityNeeds: null, equipmentRequirements: null, registrationRequired: false };
    const { dependencies, query } = readDatabase([detail]);
    const found = await getLeadEventDetail(dependencies, { eventRequestId: eventId, actor: lead });
    expect(found.actions).toEqual({ canAssignCoordinator: allowed, canReassignCoordinator: reassign });
    expect(found.assignmentVersion).toBe(reassign ? assignmentId : null);
    expect(found).not.toHaveProperty('activeAssignmentCount');
    expect(found).not.toHaveProperty('assignmentCoordinatorId');
    expect(found).not.toHaveProperty('review');
    expect(found).not.toHaveProperty('organiserId');
    expect(found.startsAt).toBe('2031-01-12T02:00:00.000Z');
    expect(found.endsAt).toBeNull();
    expect(found.registrationRequired).toBe(false);
    expect(query.mock.calls[0]![1]).toEqual([eventId, activeStatuses]);
  });

  it('hides a missing or out-of-scope event in the dedicated Lead detail', async () => {
    const { dependencies } = readDatabase();
    await expect(getLeadEventDetail(dependencies, { eventRequestId: eventId, actor: lead }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND', kind: 'NOT_FOUND' });
  });

  it('preserves the original read failure for generic HTTP error handling', async () => {
    const { dependencies, query } = readDatabase();
    query.mockRejectedValue(new Error('Database unavailable'));
    await expect(listLeadOversight(dependencies, lead)).rejects.toThrow('Database unavailable');
  });
});

describe('KAN-79 atomic initial assignment', () => {
  it.each(activeStatuses)('assigns an available coordinator for active state %s and records the Lead', async (status) => {
    const { dependencies, query, sql, release } = transaction({ event: { ...event, status: status as EventStatus } });
    expect(await assign(dependencies, lead, { coordinatorId: coordinator.id, note: '  Initial owner  ' }))
      .toEqual({ eventRequestId: eventId, assignmentId, coordinatorId: coordinator.id, previousCoordinatorId: null });
    expect(query).toHaveBeenCalledWith("SELECT set_config('app.actor_id', $1, true)", [lead.id]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO coordinator_assignments'),
      [eventId, coordinator.id, lead.id, 'Initial owner']);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FOR NO KEY UPDATE'), [coordinator.id]);
    expect(sql().findIndex((sql) => sql.includes('FOR UPDATE')))
      .toBeLessThan(sql().findIndex((sql) => sql.includes('FOR NO KEY UPDATE')));
    expect(sql()).toContain('COMMIT');
    expect(sql().some((sql) => /event_reviews/.test(sql))).toBe(false);
    // KAN-64-AC202/AC207: the organiser and the new coordinator, written inside the allocation's transaction.
    // The Lead is the actor but not a recipient, so receives nothing.
    expect(notificationRows(query.mock.calls).map((row) => [row.recipientId, row.type, row.dedupeKey])).toEqual([
      [organiser.id, 'COORDINATOR_ASSIGNED', `COORDINATOR_ASSIGNED:${assignmentId}`],
      [coordinator.id, 'COORDINATOR_ASSIGNED', `COORDINATOR_ASSIGNED:${assignmentId}`],
    ]);
    const order = sql().map((statement) => (statement.includes('INSERT INTO notifications') ? 'notify'
      : statement.includes('INSERT INTO coordinator_assignments') ? 'assign' : statement));
    expect(order.indexOf('assign')).toBeLessThan(order.indexOf('notify'));
    expect(order.indexOf('notify')).toBeLessThan(order.indexOf('COMMIT'));
    expect(sql().find((sql) => sql.startsWith('UPDATE event_requests'))).not.toContain('status =');
    expect(release).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('refuses a missing request and a draft without touching assignment history', async () => {
    for (const savedEvent of [null, { ...event, status: 'DRAFT' as const }]) {
      const { dependencies, sql } = transaction({ event: savedEvent });
      await expect(assign(dependencies)).rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'EVENT_REQUEST_NOT_FOUND' });
      expect(sql().some((sql) => sql.includes('coordinator_assignments'))).toBe(false);
      expect(sql()).toContain('ROLLBACK');
    }
  });

  it.each(['REJECTED', 'CANCELLED', 'COMPLETED'] as const)('refuses closed state %s', async (status) => {
    const { dependencies, sql } = transaction({ event: { ...event, status } });
    await expect(assign(dependencies)).rejects.toMatchObject({ code: 'ASSIGNMENT_NOT_ALLOWED', kind: 'CONFLICT' });
    expect(sql().some((sql) => sql.includes('INSERT'))).toBe(false);
  });

  it.each([coordinator.id, organiser.id])('does not replace an existing coordinator %s on repeat or stale writes', async (coordinatorId) => {
    const { dependencies, sql } = transaction({ event: { ...event, coordinatorId } });
    await expect(assign(dependencies)).rejects.toMatchObject({ code: 'COORDINATOR_ALREADY_ASSIGNED', kind: 'CONFLICT' });
    expect(sql().some((sql) => sql.includes('INSERT') || sql.startsWith('UPDATE'))).toBe(false);
  });

  it('refuses inconsistent active history without closing or replacing it', async () => {
    const { dependencies, sql } = transaction({ activeHistory: true });
    await expect(assign(dependencies)).rejects.toMatchObject({ code: 'ASSIGNMENT_HISTORY_CONFLICT', kind: 'CONFLICT' });
    expect(sql().some((sql) => /INSERT|UPDATE event_requests|UPDATE coordinator_assignments/.test(sql))).toBe(false);
  });

  it.each([
    null, { role: 'EVENT_COORDINATOR', available: false },
    ...USER_ROLES.filter((role) => role !== 'EVENT_COORDINATOR').map((role) => ({ role, available: true })),
  ])('rejects missing, unavailable or non-coordinator target %j after locking current target data', async (target) => {
    const { dependencies, sql } = transaction({ target });
    await expect(assign(dependencies)).rejects.toMatchObject({ code: 'INVALID_COORDINATOR', kind: 'INVALID_INPUT' });
    expect(sql().some((sql) => sql.includes('FOR NO KEY UPDATE'))).toBe(true);
    expect(sql().some((sql) => sql.includes('INSERT'))).toBe(false);
    expect(sql()).toContain('ROLLBACK');
  });

  it.each([
    { missingInsert: true }, { updatedRows: 0 },
    { failStatement: 'INSERT INTO coordinator_assignments' },
    { failStatement: 'UPDATE event_requests' }, { failStatement: 'COMMIT' },
  ])('rolls back persistence failures %j and releases the connection', async (options) => {
    const { dependencies, sql, release } = transaction(options);
    await expect(assign(dependencies)).rejects.toThrow();
    expect(sql()).toContain('ROLLBACK');
    expect(release).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it.each([new Error('Rollback failed'), 'Rollback failed'])('discards a connection on rollback failure %j', async (rollbackError) => {
    const { dependencies, release } = transaction({ failStatement: 'INSERT INTO coordinator_assignments', rollbackError });
    await expect(assign(dependencies)).rejects.toThrow('Injected failure');
    expect(release).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
  });

  it.each([null, {}, { coordinatorId: 'wrong' }, { coordinatorId: coordinator.id, assignedBy: lead.id },
    { coordinatorId: coordinator.id, note: 4 }, { coordinatorId: coordinator.id, note: 'x'.repeat(2001) }])(
    'rejects malformed or forged input before opening a transaction', async (input) => {
      const { dependencies, connect } = transaction();
      await expect(assign(dependencies, lead, input)).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
      expect(connect).not.toHaveBeenCalled();
    },
  );

  it('normalises UUID casing and accepts a boundary-length note without interpreting it', () => {
    const id = 'ABCDEFAB-1234-4000-8000-ABCDEFABCDEF';
    expect(parseAssignmentInput({ coordinatorId: id, note: 'x'.repeat(2000) }))
      .toEqual({ coordinatorId: id.toLowerCase(), note: 'x'.repeat(2000) });
    expect(parseAssignmentInput({ coordinatorId: coordinator.id, note: null }).note).toBeNull();
  });
});

describe('KAN-79 assignment history access and preservation', () => {
  const historyRow = {
    id: assignmentId, coordinatorId: coordinator.id, coordinatorName: 'Coordinator', assignmentMethod: 'AUTOMATIC',
    assignedById: null, assignedByName: null, note: null,
    assignedAt: new Date('2030-10-01T00:00:00Z'), unassignedAt: new Date('2030-11-01T00:00:00Z'),
  };

  it.each([lead, organiser, coordinator])('preserves historical automatic provenance for authorised actor $role', async (actor) => {
    const { dependencies, query } = readDatabase();
    query.mockResolvedValueOnce({ rows: [{ ...event, coordinatorId: coordinator.id }] });
    query.mockResolvedValueOnce({ rows: [historyRow, { ...historyRow, assignmentMethod: 'MANUAL',
      assignedById: lead.id, assignedByName: 'Lead', unassignedAt: null }] });
    const history = await listAssignments(dependencies, { eventRequestId: eventId, actor });
    expect(history[0]).toEqual({ ...historyRow,
      assignedAt: '2030-10-01T00:00:00.000Z', unassignedAt: '2030-11-01T00:00:00.000Z' });
    expect(history[1]).toMatchObject({ assignmentMethod: 'MANUAL', assignedById: lead.id, unassignedAt: null });
  });

  it('allows a Lead to inspect empty history on an unassigned active request', async () => {
    const { dependencies, query } = readDatabase();
    query.mockResolvedValueOnce({ rows: [event] });
    expect(await listAssignments(dependencies, { eventRequestId: eventId, actor: lead })).toEqual([]);
  });

  it.each(['DRAFT', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const)('hides %s history from Lead oversight', async (status) => {
    const { dependencies, query } = readDatabase([{ ...event, status }]);
    await expect(listAssignments(dependencies, { eventRequestId: eventId, actor: lead }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([null, organiser.id])('hides unassigned and unrelated event history from coordinators', async (coordinatorId) => {
    const { dependencies, query } = readDatabase([{ ...event, coordinatorId }]);
    await expect(listAssignments(dependencies, { eventRequestId: eventId, actor: coordinator }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
