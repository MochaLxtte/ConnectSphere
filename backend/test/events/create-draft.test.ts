import { describe, expect, it, vi } from 'vitest';
import { createDraft, DraftCreateForbiddenError } from '../../src/modules/events/create-draft.js';
import { DraftUpdateInputError } from '../../src/modules/events/draft-update-input.js';
import type { DraftActor } from '../../src/modules/events/update-draft.js';

const organiser: DraftActor = { id: '20000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const row = {
  id: '10000000-0000-4000-8000-000000000001', organiserId: organiser.id, coordinatorId: null,
  status: 'DRAFT', name: 'Career Fair', purpose: null, description: null,
  startsAt: new Date('2026-10-01T01:00:00.000Z'), endsAt: null, expectedAttendance: 250,
  venueRequirements: null, accessibilityNeeds: null, equipmentRequirements: null,
  registrationRequired: true, registrationCapacity: 100,
  registrationOpensAt: new Date('2026-09-20T01:00:00.000Z'), registrationClosesAt: null,
  createdAt: new Date('2026-09-19T00:00:00.000Z'), updatedAt: new Date('2026-09-19T00:00:00.000Z'),
};

function setup(insertResult: unknown = { rows: [row] }) {
  const query = vi.fn(async (sql: string, _values?: unknown[]) => {
    if (sql.includes('INSERT INTO event_requests')) {
      if (insertResult instanceof Error) throw insertResult;
      return insertResult;
    }
    return { rows: [] };
  });
  const release = vi.fn();
  const connect = vi.fn().mockResolvedValue({ query, release });
  const statements = () => query.mock.calls.map(([sql]) => sql.trim().split(/[\s(]+/)[0]);
  return { dependencies: { pool: { connect } }, connect, query, release, statements };
}

describe('CF-02 create a draft event request', () => {
  it('inserts a DRAFT owned by the verified actor inside one transaction', async () => {
    const { dependencies, query, release, statements } = setup();

    const created = await createDraft(dependencies, {
      actor: organiser, input: { name: 'Career Fair', expectedAttendance: 250 },
    });

    expect(statements()).toEqual(['BEGIN', 'SELECT', 'INSERT', 'COMMIT']);
    // The status-history trigger attributes the new DRAFT row to the organiser.
    expect(query.mock.calls[1]?.[0]).toContain('app.actor_id');
    expect(query.mock.calls[1]?.[1]).toEqual([organiser.id]);
    const [sql, values] = query.mock.calls[2] ?? [];
    expect(sql).toContain('(organiser_id, status, name, expected_attendance)');
    expect(sql).toContain(`($1, 'DRAFT', $2, $3)`);
    expect(values).toEqual([organiser.id, 'Career Fair', 250]);
    expect(created).toMatchObject({
      status: 'DRAFT', organiserId: organiser.id, startsAt: '2026-10-01T01:00:00.000Z', endsAt: null,
      registrationCapacity: 100, registrationOpensAt: '2026-09-20T01:00:00.000Z',
      registrationClosesAt: null, createdAt: '2026-09-19T00:00:00.000Z',
    });
    expect(release).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it.each([undefined, {}])('creates an empty draft when the body is %j', async (input) => {
    const { dependencies, query } = setup();
    await createDraft(dependencies, { actor: organiser, input });
    const [sql, values] = query.mock.calls[2] ?? [];
    expect(sql).toContain('(organiser_id, status)');
    expect(values).toEqual([organiser.id]);
  });

  it('never takes the owner or status from the body', async () => {
    const { dependencies, connect } = setup();
    await expect(createDraft(dependencies, {
      actor: organiser, input: { organiserId: '20000000-0000-4000-8000-000000000009' },
    })).rejects.toThrow('Unsupported field: organiserId.');
    await expect(createDraft(dependencies, { actor: organiser, input: { status: 'APPROVED' } }))
      .rejects.toBeInstanceOf(DraftUpdateInputError);
    expect(connect).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...organiser, role: 'EVENT_COORDINATOR' as const },
    { ...organiser, role: 'ATTENDEE' as const },
  ])('refuses actor %j before touching the database', async (actor) => {
    const { dependencies, connect } = setup();
    await expect(createDraft(dependencies, { actor, input: { name: 'x' } }))
      .rejects.toBeInstanceOf(DraftCreateForbiddenError);
    expect(connect).not.toHaveBeenCalled();
  });

  it('rolls back and releases the connection when the insert fails', async () => {
    const failure = new Error('insert failed');
    const { dependencies, release, statements } = setup(failure);
    await expect(createDraft(dependencies, { actor: organiser, input: {} })).rejects.toBe(failure);
    expect(statements().at(-1)).toBe('ROLLBACK');
    expect(release).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});
