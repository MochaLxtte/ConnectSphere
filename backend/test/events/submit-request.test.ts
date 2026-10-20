import { describe, expect, it, vi } from 'vitest';
import { SubmitEligibilityError } from '../../src/modules/events/submit-eligibility.js';
import { SubmissionValidationError } from '../../src/modules/events/submit-input.js';
import {
  submitEventRequest, SubmitRequestNotFoundError, DraftAssignmentConflictError, type SubmitActor,
} from '../../src/modules/events/submit-request.js';
import { notificationRows } from '../support/notification-rows.js';

const eventId = '10000000-0000-4000-8000-000000000001';
const organiser: SubmitActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_ORGANISER' };
const coordinatorId = '30000000-0000-4000-8000-000000000001';

/** A locked draft row as pg returns it: timestamps are Date objects. */
const draftRow = (overrides: Record<string, unknown> = {}) => ({
  id: eventId, organiserId: organiser.id, coordinatorId: null, status: 'DRAFT',
  name: 'Career Fair', purpose: 'Recruitment', description: null,
  startsAt: new Date('2026-10-01T09:00:00Z'), endsAt: new Date('2026-10-01T17:00:00Z'),
  expectedAttendance: 50, venueRequirements: 'Hall A', accessibilityNeeds: null,
  equipmentRequirements: null, registrationRequired: false,
  createdAt: new Date('2026-09-20T00:00:00Z'), updatedAt: new Date('2026-09-20T00:00:00Z'),
  registrationOpensAt: null, registrationClosesAt: null, ...overrides,
});

function fakePool(locked: ReturnType<typeof draftRow> | null, options: {
  failRollback?: boolean | string;
  activeHistory?: boolean;
  failHistory?: boolean;
  missingSave?: boolean;
  failCommit?: boolean;
  failNotification?: boolean;
} = {}) {
  const statements: string[] = [];
  const release = vi.fn();
  const client = {
    release,
    query: vi.fn(async (sql: string) => {
      statements.push(sql.trim().split(/\s+/).slice(0, 2).join(' '));
      if (/FOR UPDATE/.test(sql)) return { rows: locked ? [locked] : [] };
      if (/SELECT 1 FROM coordinator_assignments/.test(sql)) {
        if (options.failHistory) throw new Error('History read failed');
        return { rows: options.activeHistory ? [{ exists: true }] : [] };
      }
      if (/^\s*UPDATE event_requests/.test(sql)) {
        return { rows: options.missingSave ? [] : [{ ...locked, status: 'SUBMITTED', coordinatorId: null }] };
      }
      if (/^ROLLBACK/.test(sql) && options.failRollback) {
        throw typeof options.failRollback === 'string' ? options.failRollback : new Error('rollback failed');
      }
      if (sql === 'COMMIT' && options.failCommit) throw new Error('Commit failed');
      if (/INSERT INTO notifications/.test(sql) && options.failNotification) throw new Error('Notification failed');
      return { rows: [] };
    }),
  };
  const pool = { connect: vi.fn(async () => client) };
  return { pool: pool as never, rawPool: pool, client, release, statements, lockSql: () =>
    client.query.mock.calls.map(([sql]) => sql as string).find((sql) => /FOR UPDATE/.test(sql)) ?? '' };
}

const submit = (pool: never, actor: SubmitActor | null = organiser) =>
  submitEventRequest({ pool }, { eventRequestId: eventId, actor });

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return null;
}

describe('KAN-79 submission to the Lead queue; KAN-59/KAN-6 validation retained', () => {
  it('marks the request SUBMITTED without allocating or consulting available coordinators', async () => {
    const { pool, statements, release, client } = fakePool(draftRow());
    const saved = await submit(pool);
    expect(saved.status).toBe('SUBMITTED');
    expect(saved.coordinatorId).toBeNull();
    expect(statements).toEqual(['BEGIN ISOLATION', 'SELECT set_config(\'app.actor_id\',', 'SELECT id,', 'SELECT 1', 'UPDATE event_requests', 'INSERT INTO', 'COMMIT']);
    expect(client.query.mock.calls.some(([sql]) => /app_users|INSERT INTO coordinator_assignments/.test(sql))).toBe(false);
    expect(release).toHaveBeenCalledOnce();
  });

  it('KAN-64-AC201 acknowledges the submission to the organiser inside the same transaction', async () => {
    const { pool, client, statements } = fakePool(draftRow());
    await submit(pool);
    expect(notificationRows(client.query.mock.calls)).toEqual([{
      recipientId: organiser.id, eventRequestId: eventId, venueBookingId: null, type: 'REQUEST_SUBMITTED',
      title: 'Event request submitted', dedupeKey: `REQUEST_SUBMITTED:${eventId}`,
      message: 'Your event request “Career Fair” was submitted. It is waiting to be allocated to a coordinator.',
    }]);
    expect(statements.indexOf('INSERT INTO')).toBeLessThan(statements.indexOf('COMMIT'));
  });

  it('KAN-64-AC207 sends no notification when the submission is refused or rolls back', async () => {
    for (const pool of [fakePool(draftRow({ name: '   ' })), fakePool(draftRow({ status: 'SUBMITTED' })), fakePool(null)]) {
      await submit(pool.pool).catch(() => undefined);
      expect(notificationRows(pool.client.query.mock.calls)).toEqual([]);
    }
    const failing = fakePool(draftRow(), { failNotification: true });
    await expect(submit(failing.pool)).rejects.toThrow('Notification failed');
    expect(failing.statements).toContain('ROLLBACK');
    expect(failing.statements).not.toContain('COMMIT');
    expect(failing.release).toHaveBeenCalledOnce();
  });

  it('reads the registration times under the row lock so the window can be validated', async () => {
    const { pool, lockSql } = fakePool(draftRow());
    await submit(pool);
    expect(lockSql()).toContain('registration_opens_at AS "registrationOpensAt"');
    expect(lockSql()).toContain('registration_closes_at AS "registrationClosesAt"');
    expect(lockSql()).toContain('FOR UPDATE');
  });

  it('accepts a valid registration window passed as the Date objects pg returns', async () => {
    const { pool } = fakePool(draftRow({
      registrationRequired: true,
      registrationOpensAt: new Date('2026-09-20T00:00:00Z'), registrationClosesAt: new Date('2026-09-25T00:00:00Z'),
    }));
    expect((await submit(pool)).status).toBe('SUBMITTED');
  });

  it('ignores a reversed registration window while registration is not required', async () => {
    const { pool } = fakePool(draftRow({
      registrationRequired: false,
      registrationOpensAt: new Date('2026-09-25T00:00:00Z'), registrationClosesAt: new Date('2026-09-20T00:00:00Z'),
    }));
    expect((await submit(pool)).status).toBe('SUBMITTED');
  });
});

describe('KAN-59 invalid drafts stay DRAFT and unchanged (S1-DEF-04, KAN-6-AC2)', () => {
  it.each([
    ['a whitespace-only name', { name: '   ' }, ['name'], []],
    ['a blank purpose', { purpose: '' }, ['purpose'], []],
    ['blank venue requirements', { venueRequirements: '\n' }, ['venueRequirements'], []],
    ['a missing start', { startsAt: null }, ['startsAt'], []],
    ['a missing end', { endsAt: null }, ['endsAt'], []],
    ['a missing attendance', { expectedAttendance: null }, ['expectedAttendance'], []],
    ['an end equal to the start', { endsAt: new Date('2026-10-01T09:00:00Z') }, [], ['endsAt']],
    ['an end before the start', { endsAt: new Date('2026-09-30T09:00:00Z') }, [], ['endsAt']],
    ['a registration close before the open', {
      registrationRequired: true,
      registrationOpensAt: new Date('2026-09-25T00:00:00Z'), registrationClosesAt: new Date('2026-09-20T00:00:00Z'),
    }, [], ['registrationClosesAt']],
  ] as const)('refuses %s and writes nothing', async (_label, overrides, missing, invalid) => {
    const { pool, statements, release } = fakePool(draftRow(overrides as Record<string, unknown>));
    const error = await failure(submit(pool));
    expect(error).toBeInstanceOf(SubmissionValidationError);
    expect((error as SubmissionValidationError).missingFields).toEqual(missing);
    expect((error as SubmissionValidationError).invalidFields.map((problem) => problem.field)).toEqual(invalid);
    expect(statements).not.toContain('UPDATE event_requests');
    expect(statements).toContain('ROLLBACK');
    expect(statements).not.toContain('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('reports every problem at once', async () => {
    const { pool } = fakePool(draftRow({ name: ' ', endsAt: new Date('2026-09-30T00:00:00Z') }));
    const error = (await failure(submit(pool))) as SubmissionValidationError;
    expect(error.missingFields).toEqual(['name']);
    expect(error.invalidFields.map((problem) => problem.field)).toEqual(['endsAt']);
  });
});

describe('KAN-59 submission access and failure handling (KAN-6-AC3)', () => {
  it.each([null, { ...organiser, role: 'EVENT_COORDINATOR' as const },
    { ...organiser, role: 'EVENT_COORDINATOR_LEAD' as const }, { ...organiser, role: 'ATTENDEE' as const }])(
    'refuses %j before touching the database', async (actor) => {
      const { pool, rawPool } = fakePool(draftRow());
      const error = await failure(submit(pool, actor as SubmitActor | null));
      expect(error).toBeInstanceOf(SubmitEligibilityError);
      expect((error as SubmitEligibilityError).code).toBe('SUBMIT_FORBIDDEN');
      expect(rawPool.connect).not.toHaveBeenCalled();
    },
  );

  it('tells an unrelated organiser nothing about completeness: ownership is checked before validation', async () => {
    const { pool, statements } = fakePool(draftRow({ name: null, organiserId: 'someone-else' }));
    const error = await failure(submit(pool));
    expect(error).toBeInstanceOf(SubmitEligibilityError);
    expect((error as SubmitEligibilityError).code).toBe('SUBMIT_FORBIDDEN');
    expect(error).not.toBeInstanceOf(SubmissionValidationError);
    expect(statements).not.toContain('UPDATE event_requests');
  });

  it('refuses a request that is no longer a draft even if it is incomplete', async () => {
    const { pool } = fakePool(draftRow({ status: 'SUBMITTED', name: null }));
    const error = await failure(submit(pool));
    expect(error).toBeInstanceOf(SubmitEligibilityError);
    expect(error).not.toBeInstanceOf(SubmissionValidationError);
  });

  it('reports a missing request as not found and rolls back', async () => {
    const { pool, statements } = fakePool(null);
    expect(await failure(submit(pool))).toBeInstanceOf(SubmitRequestNotFoundError);
    expect(statements).toContain('ROLLBACK');
  });

  it('discards a connection whose rollback fails, and still rethrows the original error', async () => {
    const { pool, release } = fakePool(draftRow({ name: null }), { failRollback: true });
    expect(await failure(submit(pool))).toBeInstanceOf(SubmissionValidationError);
    expect(release).toHaveBeenCalledOnce();
    expect(release.mock.calls[0]![0]).toBeInstanceOf(Error);
  });

  it('KAN-79 rolls back when checking existing history fails', async () => {
    const { pool, statements } = fakePool(draftRow(), { failHistory: true });
    await expect(submit(pool)).rejects.toThrow('History read failed');
    expect(statements).not.toContain('UPDATE event_requests');
    expect(statements).toContain('ROLLBACK');
  });
});

describe('KAN-79 submission consistency and persistence failures', () => {
  it.each([
    { coordinatorId, activeHistory: false },
    { coordinatorId: null, activeHistory: true },
  ])('preserves unexpected existing draft assignment %j', async ({ coordinatorId, activeHistory }) => {
    const { pool, statements } = fakePool(draftRow({ coordinatorId }), { activeHistory });
    await expect(submit(pool)).rejects.toBeInstanceOf(DraftAssignmentConflictError);
    expect(statements).not.toContain('UPDATE event_requests');
    expect(statements).toContain('ROLLBACK');
  });

  it.each([{ missingSave: true }, { failCommit: true }])('rolls back incomplete persistence %j', async (options) => {
    const { pool, statements, release } = fakePool(draftRow(), options);
    await expect(submit(pool)).rejects.toThrow();
    expect(statements).toContain('ROLLBACK');
    expect(release).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('discards a connection when rollback throws a non-Error value', async () => {
    const { pool, release } = fakePool(draftRow({ name: null }), { failRollback: 'failed' });
    await expect(submit(pool)).rejects.toBeInstanceOf(SubmissionValidationError);
    expect(release).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
  });
});
