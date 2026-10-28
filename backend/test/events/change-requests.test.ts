import { describe, expect, it, vi } from 'vitest';
import type { ArrangementRecord } from '../../src/modules/events/change-request-impact.js';
import {
  decideChangeRequest, listChangeRequests, submitChangeRequest, withdrawChangeRequest,
} from '../../src/modules/events/change-requests.js';
import type { DraftRow } from '../../src/modules/events/update-draft.js';
import {
  WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../../src/modules/events/workflow-support.js';

const organiser: WorkflowActor = { id: '10000000-0000-4000-8000-000000000001', role: 'EVENT_ORGANISER' };
const otherOrganiser: WorkflowActor = { id: '10000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const coordinator: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const eventRequestId = '30000000-0000-4000-8000-000000000001';
const changeRequestId = '40000000-0000-4000-8000-000000000001';

const storedEvent: DraftRow = {
  id: eventRequestId, organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED',
  name: 'Career Fair', purpose: 'Recruitment', description: 'Booths',
  startsAt: new Date('2026-11-20T01:00:00Z'), endsAt: new Date('2026-11-20T09:00:00Z'),
  expectedAttendance: 120, venueRequirements: 'Hall', accessibilityNeeds: null,
  equipmentRequirements: null, registrationRequired: false, registrationCapacity: null,
  registrationOpensAt: null, registrationClosesAt: null, revision: 4,
  createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date('2026-10-02T00:00:00Z'),
};

interface StoredChange {
  status: string;
  proposed: Record<string, unknown>;
  previous: Record<string, unknown>;
}

interface Setup {
  event?: Partial<DraftRow> | null;
  pending?: boolean;
  change?: StoredChange | null;
  arrangements?: ArrangementRecord[];
  registrations?: number;
  withdrawn?: number;
  failOn?: string;
}

/** A pg client double that answers the service's statements by their SQL. */
function setup(options: Setup = {}) {
  const event = options.event === null ? null : { ...storedEvent, ...options.event };
  let change = options.change === undefined
    ? { status: 'PENDING', proposed: { expectedAttendance: 150 }, previous: { expectedAttendance: 120 } }
    : options.change;
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (options.failOn && sql.includes(options.failOn)) throw Object.assign(new Error('deadlock'), { code: '40P01' });
    if (/FROM event_requests WHERE id = \$1 FOR (UPDATE|SHARE)/.test(sql)) return { rows: event ? [event] : [] };
    if (sql.includes('FROM event_requests WHERE id = $1')) return { rows: [event] };
    if (sql.includes('SELECT 1 FROM event_change_requests')) return { rows: options.pending ? [{}] : [], rowCount: options.pending ? 1 : 0 };
    if (sql.includes('INSERT INTO event_change_requests')) {
      change = { status: 'PENDING', proposed: JSON.parse(values[2] as string), previous: JSON.parse(values[3] as string) };
      return { rows: [{ id: changeRequestId }] };
    }
    if (sql.includes('FROM event_change_requests') && sql.includes('FOR UPDATE')) return { rows: change ? [change] : [] };
    if (sql.includes('FROM event_change_requests c')) {
      return { rows: change ? [{
        id: changeRequestId, eventRequestId, status: change.status, requestedById: organiser.id,
        requestedByName: 'Olivia', proposed: change.proposed, previous: change.previous, baseRevision: 4,
        decidedById: null, decidedByName: null, decidedAt: change.status === 'PENDING' ? null : new Date('2026-10-28T00:00:00Z'),
        decisionReason: null, appliedRevision: null, cancelledArrangements: null, createdAt: new Date('2026-10-27T00:00:00Z'),
      }] : [] };
    }
    if (sql.includes('FROM venue_bookings b JOIN venues')) return { rows: options.arrangements ?? [] };
    if (sql.includes('FROM event_registrations')) return { rows: [{ count: options.registrations ?? 0 }] };
    if (sql.trimStart().startsWith('UPDATE event_requests')) {
      return { rows: [{ ...event!, expectedAttendance: values[1], revision: event!.revision + 1 }] };
    }
    if (sql.includes("status = 'WITHDRAWN'")) {
      if (change && (options.withdrawn ?? 1) > 0) change = { ...change, status: 'WITHDRAWN' };
      return { rows: [], rowCount: options.withdrawn ?? 1 };
    }
    if (sql.includes("UPDATE event_change_requests SET status = 'APPROVED'") && change) change = { ...change, status: 'APPROVED' };
    if (sql.includes("UPDATE event_change_requests SET status = 'REJECTED'") && change) change = { ...change, status: 'REJECTED' };
    return { rows: [], rowCount: 1 };
  });
  const client = { query, release: vi.fn() };
  // The services only use connect(); the double is typed as the pool they accept.
  const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as WorkflowDependencies['pool'];
  return { pool, query };
}

const statements = (query: ReturnType<typeof setup>['query']) => query.mock.calls.map(([sql]) => sql.trim());
const callWith = (query: ReturnType<typeof setup>['query'], fragment: string) =>
  query.mock.calls.find(([sql]) => sql.includes(fragment));

async function expectWorkflowError(promise: Promise<unknown>, kind: string, code: string) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(WorkflowError);
  expect(error).toMatchObject({ kind, code });
}

describe('KAN-15 submitChangeRequest', () => {
  const submit = (setupResult: ReturnType<typeof setup>, input: unknown, actor = organiser) =>
    submitChangeRequest({ pool: setupResult.pool }, { eventRequestId, actor, input });

  it('KAN-15-AC1/AC2 saves only the changed significant fields as PENDING and notifies both people', async () => {
    const fake = setup();
    const saved = await submit(fake, {
      changes: { expectedAttendance: 150, startsAt: '2026-11-20T09:00:00+08:00' }, expectedRevision: 4,
    });
    const insert = callWith(fake.query, 'INSERT INTO event_change_requests')!;
    expect(insert[1]).toEqual([eventRequestId, organiser.id, JSON.stringify({ expectedAttendance: 150 }),
      JSON.stringify({ expectedAttendance: 120 }), 4]);
    expect(callWith(fake.query, 'INSERT INTO notifications')![1]).toContain('CHANGE_REQUEST_SUBMITTED');
    expect(statements(fake.query).some((sql) => sql.startsWith('UPDATE event_requests'))).toBe(false);
    expect(saved).toMatchObject({
      id: changeRequestId, status: 'PENDING', proposed: { expectedAttendance: 150 }, outdated: false,
      current: { expectedAttendance: 120 }, impact: { canApprove: true },
    });
    expect(statements(fake.query).at(-1)).toBe('COMMIT');
  });

  it('stores dates as UTC instants', async () => {
    const fake = setup();
    await submit(fake, { changes: { endsAt: '2026-11-20T18:00:00+08:00' }, expectedRevision: 4 });
    expect(JSON.parse(callWith(fake.query, 'INSERT INTO event_change_requests')![1]![2] as string))
      .toEqual({ endsAt: '2026-11-20T10:00:00.000Z' });
  });

  it.each([
    [{ changes: { name: 'New' }, expectedRevision: 4 }, 'CHANGE_REQUEST_FIELD_NOT_ALLOWED'],
    [{ changes: { expectedAttendance: -1 }, expectedRevision: 4 }, 'INVALID_INPUT'],
    [{ changes: [], expectedRevision: 4 }, 'INVALID_INPUT'],
    [{ changes: {} , expectedRevision: 4 }, 'INVALID_INPUT'],
    [{ changes: { purpose: 'x' } }, 'EXPECTED_REVISION_REQUIRED'],
    [{ changes: { purpose: 'x' }, expectedRevision: 4, extra: 1 }, 'INVALID_INPUT'],
  ])('refuses invalid input %j before reading the database', async (input, code) => {
    const fake = setup();
    await expectWorkflowError(submit(fake, input), 'INVALID_INPUT', code);
    expect(fake.query).not.toHaveBeenCalled();
  });

  it('KAN-15-AC9 hides the event from an unrelated organiser', async () => {
    await expectWorkflowError(submit(setup(), { changes: { purpose: 'x' }, expectedRevision: 4 }, otherOrganiser),
      'NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND');
  });

  it('refuses the assigned coordinator, who decides rather than submits', async () => {
    await expectWorkflowError(submit(setup(), { changes: { purpose: 'x' }, expectedRevision: 4 }, coordinator),
      'FORBIDDEN', 'ACTION_FORBIDDEN');
  });

  it.each(['SUBMITTED', 'UNDER_REVIEW', 'CANCELLED', 'COMPLETED'] as const)('refuses a %s event', async (status) => {
    await expectWorkflowError(submit(setup({ event: { status } }), { changes: { purpose: 'x' }, expectedRevision: 4 }),
      'CONFLICT', 'CHANGE_REQUEST_NOT_ALLOWED');
  });

  it('refuses a stale page with the KAN-66 revision conflict', async () => {
    await expectWorkflowError(submit(setup(), { changes: { purpose: 'x' }, expectedRevision: 3 }),
      'CONFLICT', 'EVENT_REVISION_CONFLICT');
  });

  it('refuses values that match the event already', async () => {
    await expectWorkflowError(submit(setup(), { changes: { expectedAttendance: 120 }, expectedRevision: 4 }),
      'INVALID_INPUT', 'CHANGE_REQUEST_EMPTY');
  });

  it('refuses a change that would leave the event invalid', async () => {
    await expectWorkflowError(submit(setup(), { changes: { endsAt: '2026-11-19T00:00:00Z' }, expectedRevision: 4 }),
      'INVALID_INPUT', 'CHANGE_REQUEST_INVALID');
    await expectWorkflowError(submit(setup(), { changes: { purpose: null }, expectedRevision: 4 }),
      'INVALID_INPUT', 'CHANGE_REQUEST_INVALID');
  });

  it('KAN-15-AC101 refuses a second pending request', async () => {
    const fake = setup({ pending: true });
    await expectWorkflowError(submit(fake, { changes: { purpose: 'x' }, expectedRevision: 4 }),
      'CONFLICT', 'CHANGE_REQUEST_ALREADY_PENDING');
    expect(statements(fake.query).at(-1)).toBe('ROLLBACK');
  });
});

describe('KAN-15 listChangeRequests', () => {
  it('KAN-15-AC3 gives the coordinator the pending request with current values and impact', async () => {
    const fake = setup({ arrangements: [{ kind: 'VENUE_BOOKING', id: 'b1', label: 'Hall', status: 'PENDING', quantity: null }] });
    const [item] = await listChangeRequests({ pool: fake.pool }, { eventRequestId, actor: coordinator });
    expect(item).toMatchObject({
      status: 'PENDING', createdAt: '2026-10-27T00:00:00.000Z', decidedAt: null,
      current: { expectedAttendance: 120 }, outdated: false,
      impact: { affectedKinds: ['VENUE'], pending: [{ id: 'b1' }], canApprove: true },
    });
    expect(statements(fake.query).some((sql) => sql.includes('FOR SHARE'))).toBe(true);
  });

  it('marks a request outdated when a proposed field moved after submission, and omits impact once decided', async () => {
    const outdated = await listChangeRequests({ pool: setup({ event: { expectedAttendance: 130 } }).pool },
      { eventRequestId, actor: organiser });
    expect(outdated[0]).toMatchObject({ outdated: true });
    const decided = await listChangeRequests({
      pool: setup({ change: { status: 'REJECTED', proposed: { purpose: 'x' }, previous: { purpose: 'y' } } }).pool,
    }, { eventRequestId, actor: organiser });
    expect(decided[0]).not.toHaveProperty('impact');
    expect(decided[0]!.decidedAt).toBe('2026-10-28T00:00:00.000Z');
  });

  it('KAN-15-AC9 hides the list from unrelated users', async () => {
    await expectWorkflowError(listChangeRequests({ pool: setup().pool }, { eventRequestId, actor: otherOrganiser }),
      'NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND');
  });
});

describe('KAN-15 decideChangeRequest', () => {
  const decide = (fake: ReturnType<typeof setup>, input: unknown, actor = coordinator) =>
    decideChangeRequest({ pool: fake.pool }, { eventRequestId, changeRequestId, actor, input });

  it.each([
    [{ decision: 'MAYBE', expectedRevision: 4 }, 'INVALID_INPUT'],
    [{ decision: 'REJECTED', expectedRevision: 4 }, 'REJECTION_REASON_REQUIRED'],
    [{ decision: 'REJECTED', reason: '   ', expectedRevision: 4 }, 'REJECTION_REASON_REQUIRED'],
    [{ decision: 'APPROVED' }, 'EXPECTED_REVISION_REQUIRED'],
  ])('KAN-15-AC105 refuses invalid decision input %j', async (input, code) => {
    const fake = setup();
    await expectWorkflowError(decide(fake, input), 'INVALID_INPUT', code);
    expect(fake.query).not.toHaveBeenCalled();
  });

  it('KAN-15-AC5 records a rejection with its reason and leaves the event unchanged', async () => {
    const fake = setup();
    const decided = await decide(fake, { decision: 'REJECTED', reason: ' Hall is full ', expectedRevision: 4 });
    expect(callWith(fake.query, "SET status = 'REJECTED'")![1]).toEqual([changeRequestId, coordinator.id, 'Hall is full']);
    expect(callWith(fake.query, 'INSERT INTO notifications')![1]).toContain('CHANGE_REQUEST_REJECTED');
    expect(statements(fake.query).some((sql) => sql.startsWith('UPDATE event_requests'))).toBe(false);
    expect(statements(fake.query).some((sql) => sql.includes('pg_advisory_xact_lock'))).toBe(false);
    expect(decided.status).toBe('REJECTED');
  });

  it('KAN-15-AC6/AC104 applies the change, audits it, cancels affected pending arrangements and keeps others', async () => {
    const fake = setup({ arrangements: [
      { kind: 'VENUE_BOOKING', id: 'b1', label: 'Hall', status: 'HELD', quantity: null },
      { kind: 'EQUIPMENT_REQUEST', id: 'e1', label: 'Mic', status: 'REQUESTED', quantity: 1 },
    ] });
    const decided = await decide(fake, { decision: 'APPROVED', expectedRevision: 4 });
    const sql = statements(fake.query);
    // Venue locks come before the event lock, matching Venue Staff decisions.
    expect(sql.findIndex((item) => item.includes('pg_advisory_xact_lock')))
      .toBeLessThan(sql.findIndex((item) => /FROM event_requests WHERE id = \$1 FOR UPDATE/.test(item)));
    expect(callWith(fake.query, 'UPDATE event_requests SET expected_attendance = $2')![1]).toEqual([eventRequestId, 150]);
    expect(callWith(fake.query, 'INSERT INTO event_request_edits')![1]).toEqual([eventRequestId, 5, coordinator.id,
      'EVENT_COORDINATOR', 'APPROVED', JSON.stringify({ expectedAttendance: { from: 120, to: 150 } })]);
    expect(callWith(fake.query, 'UPDATE venue_bookings')![1]).toEqual([['b1'], coordinator.id,
      'Cancelled by an approved change request. Request it again for the new event details.']);
    expect(callWith(fake.query, 'UPDATE equipment_requests')).toBeUndefined();
    expect(callWith(fake.query, "SET status = 'APPROVED'")![1]).toEqual([changeRequestId, coordinator.id, null, 5,
      JSON.stringify({ venueBookings: ['b1'], equipmentRequests: [] })]);
    expect(decided.status).toBe('APPROVED');
  });

  it('cancels pending equipment requests when equipment needs change', async () => {
    const fake = setup({
      change: { status: 'PENDING', proposed: { equipmentRequirements: '4 mics' }, previous: { equipmentRequirements: null } },
      arrangements: [{ kind: 'EQUIPMENT_REQUEST', id: 'e1', label: 'Mic', status: 'REQUESTED', quantity: 1 }],
    });
    await decide(fake, { decision: 'APPROVED', expectedRevision: 4 });
    expect(callWith(fake.query, 'UPDATE equipment_requests')![1]).toEqual([['e1'], coordinator.id,
      'Cancelled by an approved change request. Request it again for the new event details.']);
    expect(callWith(fake.query, 'UPDATE event_requests')![0]).toContain("equipment_plan_status = 'REQUIRED'");
    expect(callWith(fake.query, 'UPDATE venue_bookings')).toBeUndefined();
  });

  it('KAN-15-AC8/AC103 refuses approval when a confirmed arrangement is affected', async () => {
    const fake = setup({ arrangements: [{ kind: 'VENUE_BOOKING', id: 'b1', label: 'Hall', status: 'APPROVED', quantity: null }] });
    await expectWorkflowError(decide(fake, { decision: 'APPROVED', expectedRevision: 4 }), 'CONFLICT', 'CANCEL_AND_RESUBMIT_REQUIRED');
    expect(statements(fake.query).some((sql) => sql.startsWith('UPDATE event_requests'))).toBe(false);
    expect(statements(fake.query).at(-1)).toBe('ROLLBACK');
  });

  it.each([
    [{ change: null }, 'NOT_FOUND', 'CHANGE_REQUEST_NOT_FOUND'],
    [{ change: { status: 'WITHDRAWN', proposed: { purpose: 'x' }, previous: { purpose: 'y' } } }, 'CONFLICT', 'CHANGE_REQUEST_NOT_PENDING'],
    [{ event: { status: 'CANCELLED' as const } }, 'CONFLICT', 'CHANGE_REQUEST_EVENT_NOT_PLANNING'],
    [{ event: { expectedAttendance: 130 } }, 'CONFLICT', 'CHANGE_REQUEST_OUTDATED'],
    [{ change: { status: 'PENDING', proposed: { endsAt: '2026-11-19T00:00:00.000Z' }, previous: { endsAt: '2026-11-20T09:00:00.000Z' } } },
      'CONFLICT', 'CHANGE_REQUEST_INVALID'],
  ] as const)('refuses approval for %j', async (options, kind, code) => {
    await expectWorkflowError(decide(setup(options as Setup), { decision: 'APPROVED', expectedRevision: 4 }), kind, code);
  });

  it('refuses a stale coordinator page and anyone but the assigned coordinator', async () => {
    await expectWorkflowError(decide(setup(), { decision: 'APPROVED', expectedRevision: 3 }), 'CONFLICT', 'EVENT_REVISION_CONFLICT');
    await expectWorkflowError(decide(setup(), { decision: 'APPROVED', expectedRevision: 4 }, organiser),
      'FORBIDDEN', 'ACTION_FORBIDDEN');
    await expectWorkflowError(
      decide(setup(), { decision: 'APPROVED', expectedRevision: 4 }, { id: '20000000-0000-4000-8000-000000000009', role: 'EVENT_COORDINATOR' }),
      'NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND');
  });

  it('turns a deadlock into a retryable conflict, and passes other failures through', async () => {
    await expectWorkflowError(decide(setup({ failOn: 'SELECT id, venue_id' }), { decision: 'APPROVED', expectedRevision: 4 }),
      'CONFLICT', 'CHANGE_REQUEST_BUSY');
    const fake = setup();
    fake.query.mockImplementationOnce(async () => { throw new Error('connection lost'); });
    await expect(decide(fake, { decision: 'APPROVED', expectedRevision: 4 })).rejects.toThrow('connection lost');
  });
});

describe('KAN-15 withdrawChangeRequest', () => {
  const withdraw = (fake: ReturnType<typeof setup>, actor = organiser, input?: unknown) =>
    withdrawChangeRequest({ pool: fake.pool }, { eventRequestId, changeRequestId, actor, input });

  it('lets the owner withdraw a pending request and tells the coordinator', async () => {
    const fake = setup();
    const withdrawn = await withdraw(fake, organiser, {});
    expect(callWith(fake.query, "status = 'WITHDRAWN'")![1]).toEqual([changeRequestId, eventRequestId, organiser.id]);
    expect(callWith(fake.query, 'INSERT INTO notifications')![1]).toContain('CHANGE_REQUEST_WITHDRAWN');
    expect(withdrawn.status).toBe('WITHDRAWN');
  });

  it('refuses a request that is no longer pending, or missing, and anyone but the owner', async () => {
    await expectWorkflowError(withdraw(setup({ withdrawn: 0 })), 'CONFLICT', 'CHANGE_REQUEST_NOT_PENDING');
    await expectWorkflowError(withdraw(setup({ withdrawn: 0, change: null })), 'NOT_FOUND', 'CHANGE_REQUEST_NOT_FOUND');
    await expectWorkflowError(withdraw(setup(), coordinator), 'FORBIDDEN', 'ACTION_FORBIDDEN');
    await expectWorkflowError(withdraw(setup(), organiser, { reason: 'x' }), 'INVALID_INPUT', 'INVALID_INPUT');
  });
});
