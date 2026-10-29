import { describe, expect, it } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { confirmEvent, getEventConfirmation } from '../../src/modules/events/confirmation.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

const eventId = '61000000-0000-4000-8000-000000000001';
const ownerId = '61000000-0000-4000-8000-0000000000a1';
const coordinatorId = '61000000-0000-4000-8000-0000000000c1';
const coordinator: WorkflowActor = { id: coordinatorId, role: 'EVENT_COORDINATOR' };
const owner: WorkflowActor = { id: ownerId, role: 'EVENT_ORGANISER' };
const startsAt = '2035-01-01T02:00:00.000000Z';
const endsAt = '2035-01-01T05:00:00.000000Z';

interface State {
  role?: string;
  status?: string;
  coordinatorId?: string | null;
  started?: boolean;
  venue?: { live: number; outstanding: number };
  recovering?: number;
  conflicts?: { overlap: number; hours: number; blocked?: number };
  planStatus?: 'REQUIRED' | 'NOT_REQUIRED';
  equipment?: 'NONE' | 'READY' | 'REQUESTED' | 'SHORTFALL';
  pendingChange?: boolean;
  confirmed?: boolean;
}

function equipmentSnapshot(kind: State['equipment']) {
  const line = (status: string) => ({ id: 'r1', equipmentTypeId: 't1', equipmentName: 'Projector', quantity: 2,
    status, startsAt, endsAt, notes: null });
  const event = { id: eventId, name: 'Open day', status: 'APPROVED', startsAt, endsAt, equipmentRequirements: null };
  const type = { id: 't1', name: 'Projector', category: 'AV', totalQuantity: kind === 'SHORTFALL' ? 1 : 3,
    damagedQuantity: 0, maintenanceQuantity: 0, isActive: true };
  if (kind === 'NONE' || kind === undefined) return { event, coordinatorId, requests: [], equipmentTypes: [], reservations: [] };
  const status = kind === 'REQUESTED' ? 'REQUESTED' : 'RESERVED';
  return { event, coordinatorId, requests: [line(status)], equipmentTypes: [type],
    reservations: status === 'RESERVED' ? [{ id: 'r1', equipmentTypeId: 't1', quantity: 2, startsAt, endsAt }] : [] };
}

function fixture(state: State = {}) {
  const statements: string[] = [];
  const s = { role: undefined, status: 'APPROVED', coordinatorId, started: false, venue: { live: 1, outstanding: 0 },
    recovering: 0, planStatus: 'NOT_REQUIRED' as State['planStatus'], equipment: 'NONE' as State['equipment'],
    pendingChange: false, confirmed: false, ...state };
  const client = { query: async (sql: string, values: unknown[] = []) => {
    statements.push(sql);
    const rows = (list: unknown[]) => ({ rows: list, rowCount: list.length });
    if (sql.startsWith('SELECT role FROM app_users')) {
      return rows([{ role: s.role ?? (values[0] === ownerId ? 'EVENT_ORGANISER' : 'EVENT_COORDINATOR') }]);
    }
    if (/FROM event_requests WHERE id = \$1 FOR (UPDATE|SHARE)/.test(sql)) {
      return rows([{ id: eventId, organiserId: ownerId, coordinatorId: s.coordinatorId, status: s.status, name: 'Open day', revision: 3 }]);
    }
    if (sql.includes('AS started')) return rows([{ started: s.started }]);
    if (sql.includes('AS live')) return rows([s.venue]);
    if (sql.includes('venue_outage_impacts i')) return rows([{ count: s.recovering }]);
    if (sql.includes('AS overlap')) return rows([s.conflicts ?? { overlap: 0, hours: 0 }]);
    if (sql.includes('AS "planStatus"')) return rows([{ planStatus: s.planStatus }]);
    if (sql.includes('AS "equipmentTypes"')) return rows([equipmentSnapshot(s.equipment)]);
    if (sql.includes('FROM event_change_requests')) return rows(s.pendingChange ? [{ '?column?': 1 }] : []);
    if (sql.startsWith('UPDATE event_requests SET status')) { s.confirmed = true; return { rows: [], rowCount: 1 }; }
    if (sql.includes('FROM event_status_history h')) {
      return rows(s.confirmed ? [{ confirmedBy: coordinatorId, confirmedByName: 'Casey', confirmedAt: new Date('2034-12-01T00:00:00Z') }] : []);
    }
    return rows([]);
  }, release: () => undefined } as unknown as PoolClient;
  const pool = { connect: async () => client } as Pick<Pool, 'connect'>;
  return { pool, statements };
}

const confirm = (pool: Pick<Pool, 'connect'>, actor = coordinator, input: unknown = {}) =>
  confirmEvent(pool, { eventRequestId: eventId, actor, input });

async function refusal(promise: Promise<unknown>): Promise<WorkflowError> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(WorkflowError);
  return error as WorkflowError;
}

describe('KAN-61 event confirmation', () => {
  it('KAN-61-AC4/AC101: confirms a ready approved event once, with actor and time, in one transaction', async () => {
    const { pool, statements } = fixture();
    const result = await confirm(pool);
    expect(result).toEqual({ eventRequestId: eventId, status: 'CONFIRMED', changed: true,
      confirmation: { confirmedBy: coordinatorId, confirmedByName: 'Casey', confirmedAt: '2034-12-01T00:00:00.000Z' } });
    expect(statements[0]).toBe('BEGIN ISOLATION LEVEL READ COMMITTED');
    expect(statements.at(-1)).toBe('COMMIT');
    // KAN-61-AC103: event -> equipment locks precede the readiness check and the write.
    const order = ['FROM event_requests WHERE id = $1 FOR UPDATE', 'FROM equipment_types t',
      'AS live', 'UPDATE event_requests SET status'].map(fragment => statements.findIndex(sql => sql.includes(fragment)));
    expect(order.every(index => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('KAN-61-AC5: a repeated confirmation returns the saved outcome without writing again', async () => {
    const { pool, statements } = fixture({ status: 'CONFIRMED', confirmed: true });
    expect(await confirm(pool)).toMatchObject({ status: 'CONFIRMED', changed: false,
      confirmation: { confirmedBy: coordinatorId } });
    expect(statements.some(sql => sql.startsWith('UPDATE event_requests'))).toBe(false);
  });

  it.each(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'REJECTED', 'CANCELLED', 'COMPLETED'])(
    'KAN-61-AC2/AC5: refuses to confirm a %s event without writing', async (status) => {
      const { pool, statements } = fixture({ status });
      const error = await refusal(confirm(pool));
      // Coordinators never see drafts, so a draft looks absent.
      expect(error.code).toBe(status === 'DRAFT' ? 'EVENT_REQUEST_NOT_FOUND' : 'EVENT_NOT_CONFIRMABLE');
      expect(statements.some(sql => sql.startsWith('UPDATE event_requests'))).toBe(false);
      expect(statements.at(-1)).toBe('ROLLBACK');
    });

  it('KAN-61-AC1: only the currently assigned coordinator may confirm', async () => {
    expect((await refusal(confirm(fixture({ coordinatorId: 'someone-else' }).pool))).code).toBe('EVENT_REQUEST_NOT_FOUND');
    expect((await refusal(confirm(fixture().pool, owner))).kind).toBe('FORBIDDEN');
    expect((await refusal(confirm(fixture({ role: 'EVENT_ORGANISER' }).pool))).message).toMatch(/permissions changed/);
  });

  it('refuses confirmation once the event has started (database clock)', async () => {
    const { pool, statements } = fixture({ started: true });
    expect((await refusal(confirm(pool))).code).toBe('EVENT_ALREADY_STARTED');
    expect(statements.some(sql => sql.startsWith('UPDATE event_requests'))).toBe(false);
  });

  it('rejects unexpected body fields before opening a transaction', async () => {
    const { pool, statements } = fixture();
    expect((await refusal(confirm(pool, coordinator, { status: 'CONFIRMED' }))).kind).toBe('INVALID_INPUT');
    expect(statements).toEqual([]);
    expect(await confirm(fixture().pool, coordinator, undefined)).toMatchObject({ changed: true });
  });

  it.each<[string, State, RegExp]>([
    ['KAN-61-AC101 a booking now overlapping under current buffers', { conflicts: { overlap: 1, hours: 0 } },
      /1 venue booking now overlapping another approved booking/],
    ['KAN-61-AC101 a booking outside current operating hours', { conflicts: { overlap: 0, hours: 2 } },
      /2 venue bookings outside the venue's operating hours/],
    ['KAN-61-AC101 a buffer overlapping an operational block without an outage flag', { conflicts: { overlap: 0, hours: 0, blocked: 1 } },
      /1 venue booking overlapping operational unavailability/],
    ['no venue arrangement', { venue: { live: 0, outstanding: 0 } }, /Approve at least one venue arrangement/],
    ['a pending venue arrangement', { venue: { live: 2, outstanding: 1 } }, /1 venue arrangement awaiting approval/],
    ['KAN-61-AC105 outage recovery', { venue: { live: 1, outstanding: 1 }, recovering: 1 }, /1 venue booking still requiring outage recovery/],
    ['required equipment with no lines', { planStatus: 'REQUIRED' }, /Record equipment as Not Required/],
    ['an unreserved equipment line', { planStatus: 'REQUIRED', equipment: 'REQUESTED' }, /must be reserved/],
    ['an equipment shortfall', { planStatus: 'REQUIRED', equipment: 'SHORTFALL' }, /cannot fulfil/],
    ['KAN-61-AC103 a pending change request', { pendingChange: true }, /pending change request/],
  ])('KAN-61-AC3: blocks confirmation with %s and explains why', async (_label, state, message) => {
    const { pool, statements } = fixture(state);
    const error = await refusal(confirm(pool));
    expect(error.code).toBe('EVENT_NOT_READY');
    expect(error.message).toMatch(message);
    expect(statements.some(sql => sql.startsWith('UPDATE event_requests'))).toBe(false);
  });

  it('KAN-61-AC102: reserved, fulfilable equipment is ready', async () => {
    expect(await confirm(fixture({ planStatus: 'REQUIRED', equipment: 'READY' }).pool)).toMatchObject({ changed: true });
  });
});

describe('KAN-61 confirmation panel read', () => {
  const read = (pool: Pick<Pool, 'connect'>, actor = coordinator) => getEventConfirmation(pool, { eventRequestId: eventId, actor });

  it('shows the assigned coordinator the checklist and whether confirmation is possible', async () => {
    const result = await read(fixture({ pendingChange: true }).pool);
    expect(result).toMatchObject({ status: 'APPROVED', started: false, canConfirm: false, confirmation: null });
    expect(result.readiness?.checks.map(check => [check.key, check.ready])).toEqual([
      ['VENUE', true], ['EQUIPMENT', true], ['CHANGE_REQUEST', false]]);
    expect((await read(fixture().pool)).canConfirm).toBe(true);
    expect((await read(fixture({ started: true }).pool)).canConfirm).toBe(false);
  });

  it('KAN-61-AC4: shows the organiser the confirmation outcome but never offers the action', async () => {
    const result = await read(fixture({ status: 'CONFIRMED', confirmed: true }).pool, owner);
    expect(result).toMatchObject({ status: 'CONFIRMED', canConfirm: false, readiness: null,
      confirmation: { confirmedByName: 'Casey' } });
    expect((await read(fixture().pool, owner)).canConfirm).toBe(false);
  });

  it('hides the event from unrelated users', async () => {
    const outsider: WorkflowActor = { id: '61000000-0000-4000-8000-0000000000ff', role: 'EVENT_ORGANISER' };
    expect((await refusal(read(fixture({ role: 'EVENT_ORGANISER' }).pool, outsider))).code).toBe('EVENT_REQUEST_NOT_FOUND');
  });
});
