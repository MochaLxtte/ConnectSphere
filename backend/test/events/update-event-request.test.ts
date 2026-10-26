import { describe, expect, it, vi } from 'vitest';
import { DraftEligibilityError } from '../../src/modules/events/draft-eligibility.js';
import { DraftUpdateInputError } from '../../src/modules/events/draft-update-input.js';
import { SubmissionValidationError } from '../../src/modules/events/submit-input.js';
import {
  DraftRequestNotFoundError, updateEventRequest, type DraftActor, type DraftRow,
} from '../../src/modules/events/update-draft.js';
import { WorkflowError } from '../../src/modules/events/workflow-support.js';

const organiser: DraftActor = { id: '10000000-0000-4000-8000-000000000001', role: 'EVENT_ORGANISER' };
const coordinator: DraftActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const eventRequestId = '30000000-0000-4000-8000-000000000001';

const stored: DraftRow = {
  id: eventRequestId, organiserId: organiser.id, coordinatorId: coordinator.id, status: 'SUBMITTED',
  name: 'Career Fair', purpose: 'Recruitment', description: 'Booths',
  startsAt: new Date('2026-11-20T01:00:00Z'), endsAt: new Date('2026-11-20T09:00:00Z'),
  expectedAttendance: 120, venueRequirements: 'Hall', accessibilityNeeds: null,
  equipmentRequirements: null, registrationRequired: false, registrationCapacity: null,
  registrationOpensAt: null, registrationClosesAt: null, revision: 4,
  createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date('2026-10-02T00:00:00Z'),
};

/** A pg client double that answers the service's statements in order of their SQL. */
function setup(row: Partial<DraftRow> | null = {}, options: { failAudit?: boolean } = {}) {
  const current = row === null ? null : { ...stored, ...row };
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (sql.includes('FOR UPDATE')) return { rows: current ? [current] : [] };
    if (sql.trimStart().startsWith('UPDATE event_requests')) {
      const updated = { ...current!, revision: current!.revision + 1, updatedAt: new Date('2026-10-26T00:00:00Z') };
      // SET clauses are `<column> = $n` in the order of the changed fields.
      const columns = [...sql.matchAll(/(\w+) = \$(\d+)/g)];
      const byColumn: Record<string, keyof DraftRow> = {
        name: 'name', description: 'description', purpose: 'purpose', starts_at: 'startsAt',
        ends_at: 'endsAt', expected_attendance: 'expectedAttendance',
      };
      for (const [, column, index] of columns) {
        (updated as Record<string, unknown>)[byColumn[column!]!] = values[Number(index) - 1];
      }
      return { rows: [updated] };
    }
    if (sql.includes('INSERT INTO event_request_edits') && options.failAudit) throw new Error('audit failed');
    return { rows: [] };
  });
  const client = { query, release: vi.fn() };
  return { pool: { connect: vi.fn().mockResolvedValue(client) }, client, query };
}

const statements = (query: ReturnType<typeof setup>['query']) => query.mock.calls.map(([sql]) => sql.trim());
const auditCall = (query: ReturnType<typeof setup>['query']) =>
  query.mock.calls.find(([sql]) => sql.includes('INSERT INTO event_request_edits'));

describe('KAN-66 updateEventRequest', () => {
  it('KAN-66-AC101 saves an owner edit before approval, preserving status and assignment, with an audit row', async () => {
    const { pool, query, client } = setup();
    const saved = await updateEventRequest({ pool }, {
      eventRequestId, actor: organiser, input: { purpose: 'Graduate hiring', expectedRevision: 4 },
    });

    expect(saved).toMatchObject({
      purpose: 'Graduate hiring', status: 'SUBMITTED', coordinatorId: coordinator.id, revision: 5,
      startsAt: '2026-11-20T01:00:00.000Z',
    });
    const audit = auditCall(query)!;
    expect(audit[1]).toEqual([
      eventRequestId, 5, organiser.id, 'EVENT_ORGANISER', 'SUBMITTED',
      JSON.stringify({ purpose: { from: 'Recruitment', to: 'Graduate hiring' } }),
    ]);
    expect(query).toHaveBeenCalledWith("SELECT set_config('app.actor_id', $1, true)", [organiser.id]);
    expect(statements(query).at(-1)).toBe('COMMIT');
    expect(client.release).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('KAN-66-AC102 saves an assigned coordinator name/description edit on an approved event', async () => {
    const { pool, query } = setup({ status: 'APPROVED' });
    const saved = await updateEventRequest({ pool }, {
      eventRequestId, actor: coordinator, input: { name: 'Career Fair 2026', expectedRevision: 4 },
    });
    expect(saved).toMatchObject({ name: 'Career Fair 2026', status: 'APPROVED', revision: 5 });
    expect(auditCall(query)![1]![3]).toBe('EVENT_COORDINATOR');
  });

  it('KAN-34 keeps draft edits optional-revision and unaudited', async () => {
    const { pool, query } = setup({
      status: 'DRAFT', coordinatorId: null, registrationRequired: true, startsAt: null, endsAt: null,
      registrationOpensAt: new Date('2026-11-01T00:00:00Z'), registrationClosesAt: '2026-11-10T00:00:00Z',
    });
    const saved = await updateEventRequest({ pool }, {
      eventRequestId, actor: organiser, input: { name: null },
    });
    expect(saved.name).toBeNull();
    expect(saved).toMatchObject({
      registrationOpensAt: '2026-11-01T00:00:00.000Z', registrationClosesAt: '2026-11-10T00:00:00.000Z',
    });
    expect(auditCall(query)).toBeUndefined();
  });

  it('checks a supplied revision on drafts too', async () => {
    const { pool } = setup({ status: 'DRAFT', coordinatorId: null });
    await expect(updateEventRequest({ pool }, {
      eventRequestId, actor: organiser, input: { name: 'x', expectedRevision: 3 },
    })).rejects.toMatchObject({ code: 'EVENT_REVISION_CONFLICT' });
  });

  it('KAN-66-AC103 refuses a stale revision without writing', async () => {
    const { pool, query } = setup();
    const attempt = updateEventRequest({ pool }, {
      eventRequestId, actor: organiser, input: { purpose: 'Other', expectedRevision: 3 },
    });
    await expect(attempt).rejects.toBeInstanceOf(WorkflowError);
    await expect(attempt).rejects.toMatchObject({ kind: 'CONFLICT', code: 'EVENT_REVISION_CONFLICT' });
    expect(statements(query).some((sql) => sql.startsWith('UPDATE'))).toBe(false);
    expect(statements(query).at(-1)).toBe('ROLLBACK');
  });

  it.each([undefined, 0, 1.5, '4'])('KAN-66-AC103 requires a valid expectedRevision after submission: %j', async (expectedRevision) => {
    const { pool } = setup();
    await expect(updateEventRequest({ pool }, {
      eventRequestId, actor: organiser, input: { purpose: 'Other', expectedRevision },
    })).rejects.toMatchObject({
      kind: 'INVALID_INPUT',
      code: expectedRevision === undefined ? 'EXPECTED_REVISION_REQUIRED' : 'INVALID_INPUT',
    });
  });

  it('KAN-66-AC101 applies full submission validation to the edited request', async () => {
    const { pool, query } = setup({ status: 'UNDER_REVIEW' });
    const attempt = updateEventRequest({ pool }, {
      eventRequestId, actor: organiser,
      input: { name: '  ', endsAt: '2026-11-20T00:00:00Z', expectedRevision: 4 },
    });
    await expect(attempt).rejects.toBeInstanceOf(SubmissionValidationError);
    await expect(attempt).rejects.toMatchObject({
      missingFields: ['name'], invalidFields: [{ field: 'endsAt', message: 'The end must be after the start.' }],
    });
    expect(statements(query).some((sql) => sql.startsWith('UPDATE'))).toBe(false);
  });

  it('KAN-66-AC5 creates no revision or audit for an unchanged save, comparing instants', async () => {
    const { pool, query } = setup();
    const saved = await updateEventRequest({ pool }, {
      eventRequestId, actor: organiser,
      input: { name: 'Career Fair', startsAt: '2026-11-20T09:00:00+08:00', expectedRevision: 4 },
    });
    expect(saved.revision).toBe(4);
    expect(statements(query).some((sql) => sql.startsWith('UPDATE'))).toBe(false);
    expect(auditCall(query)).toBeUndefined();
    expect(statements(query).at(-1)).toBe('COMMIT');
  });

  it('only writes and audits fields whose values changed', async () => {
    const { pool, query } = setup();
    await updateEventRequest({ pool }, {
      eventRequestId, actor: organiser,
      input: { name: 'Career Fair', description: 'Booths and talks', expectedRevision: 4 },
    });
    const update = statements(query).find((sql) => sql.startsWith('UPDATE'))!;
    expect(update).toContain('description = $2');
    expect(update).not.toContain('name = ');
    expect(JSON.parse(auditCall(query)![1]![5] as string)).toEqual({
      description: { from: 'Booths', to: 'Booths and talks' },
    });
  });

  it('KAN-66-AC8 refuses significant fields on an approved event with the field list', async () => {
    const { pool } = setup({ status: 'CONFIRMED' });
    await expect(updateEventRequest({ pool }, {
      eventRequestId, actor: coordinator, input: { startsAt: '2026-11-21T01:00:00Z', expectedRevision: 4 },
    })).rejects.toMatchObject({ code: 'SIGNIFICANT_CHANGE_REQUIRED', fields: ['startsAt'] });
  });

  it.each([
    ['another organiser', { id: '10000000-0000-4000-8000-000000000009', role: 'EVENT_ORGANISER' }],
    ['an unassigned coordinator', { id: '20000000-0000-4000-8000-000000000009', role: 'EVENT_COORDINATOR' }],
  ] as const)('KAN-66-AC4 treats %s as unrelated', async (_name, actor) => {
    const { pool } = setup({ status: 'APPROVED' });
    await expect(updateEventRequest({ pool }, {
      eventRequestId, actor, input: { name: 'x', expectedRevision: 4 },
    })).rejects.toMatchObject({ code: 'DRAFT_EDIT_FORBIDDEN' });
  });

  it.each([null, { id: organiser.id, role: 'VENUE_STAFF' as const }])(
    'refuses %j before opening a connection', async (actor) => {
      const { pool } = setup();
      await expect(updateEventRequest({ pool }, { eventRequestId, actor, input: { name: 'x' } }))
        .rejects.toBeInstanceOf(DraftEligibilityError);
      expect(pool.connect).not.toHaveBeenCalled();
    },
  );

  it('validates the body before opening a connection', async () => {
    const { pool } = setup();
    await expect(updateEventRequest({ pool }, { eventRequestId, actor: organiser, input: { expectedRevision: 4 } }))
      .rejects.toBeInstanceOf(DraftUpdateInputError);
    await expect(updateEventRequest({ pool }, { eventRequestId, actor: organiser, input: [] }))
      .rejects.toBeInstanceOf(DraftUpdateInputError);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('reports a missing request as not found', async () => {
    const { pool } = setup(null);
    await expect(updateEventRequest({ pool }, { eventRequestId, actor: organiser, input: { name: 'x' } }))
      .rejects.toBeInstanceOf(DraftRequestNotFoundError);
  });

  it('rolls back the edit when the audit insert fails', async () => {
    const { pool, query } = setup({}, { failAudit: true });
    await expect(updateEventRequest({ pool }, {
      eventRequestId, actor: organiser, input: { purpose: 'Graduate hiring', expectedRevision: 4 },
    })).rejects.toThrow('audit failed');
    expect(statements(query).at(-1)).toBe('ROLLBACK');
  });

  it('fails when the locked row disappears during the update', async () => {
    const { pool, query } = setup();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return { rows: [stored] };
      return { rows: [] };
    });
    await expect(updateEventRequest({ pool }, {
      eventRequestId, actor: organiser, input: { purpose: 'x', expectedRevision: 4 },
    })).rejects.toThrow('The event request could not be updated.');
  });

  it('discards a connection whose rollback fails', async () => {
    const { pool, query, client } = setup(null);
    query.mockImplementation(async (sql: string) => {
      if (sql === 'ROLLBACK') throw new Error('connection lost');
      if (sql.includes('FOR UPDATE')) return { rows: [] };
      return { rows: [] };
    });
    await expect(updateEventRequest({ pool }, { eventRequestId, actor: organiser, input: { name: 'x' } }))
      .rejects.toBeInstanceOf(DraftRequestNotFoundError);
    expect(client.release).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: 'connection lost' }));
  });

  it('wraps a non-Error rollback failure', async () => {
    const { pool, query, client } = setup(null);
    query.mockImplementation(async (sql: string) => {
      if (sql === 'ROLLBACK') throw 'gone';
      return { rows: [] };
    });
    await expect(updateEventRequest({ pool }, { eventRequestId, actor: organiser, input: { name: 'x' } }))
      .rejects.toBeInstanceOf(DraftRequestNotFoundError);
    expect(client.release).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: 'Rollback failed.' }));
  });
});
