import { describe, expect, it, vi } from 'vitest';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import {
  getCatalogueVenue,
  listCatalogueVenues,
  updateCatalogueVenue,
} from '../../src/modules/venues/venue-catalogue-service.js';

const venueId = '10000000-0000-4000-8000-000000000001';
const staff: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'VENUE_STAFF' };
const otherRoles = ['EVENT_COORDINATOR', 'EVENT_ORGANISER', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const;

const row = {
  id: venueId, name: 'Hall A', description: null, location: 'Block B', capacity: 100,
  layouts: ['Theatre'], facilities: ['Projector'], accessibilityFeatures: ['Ramp'],
  wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00',
  updatedAt: new Date('2026-10-01T02:00:00Z'),
};
const serialised = { ...row, updatedAt: '2026-10-01T02:00:00.000Z' };

interface Script {
  locked?: { isActive: boolean; opensAt: string | null; closesAt: string | null } | null;
  saved?: typeof row;
  failOn?: RegExp;
}

/** Answers each statement by its text; records every statement so tests can inspect them. */
function fakePool(script: Script = {}) {
  const statements: { sql: string; params: unknown[] }[] = [];
  const release = vi.fn();
  const client = {
    release,
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      statements.push({ sql, params });
      if (script.failOn?.test(sql)) throw new Error('database failure');
      if (/FOR UPDATE/.test(sql)) {
        const locked = script.locked === undefined
          ? { isActive: true, opensAt: '08:00', closesAt: '22:00' } : script.locked;
        return { rows: locked ? [locked] : [] };
      }
      if (/^SELECT id, name/.test(sql.trim())) return { rows: [script.saved ?? row] };
      return { rows: [], rowCount: 1 };
    }),
  };
  const pool = {
    connect: vi.fn(async () => client),
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      statements.push({ sql, params });
      return { rows: [row] };
    }),
  };
  return { pool: pool as never, rawPool: pool, client, release, statements };
}

const sqlOf = <T extends { sql: string }>(statements: T[], pattern: RegExp): T | undefined =>
  statements.find((statement) => pattern.test(statement.sql));

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

describe('KAN-50 catalogue service: viewing (AC1, AC2, AC12, AC14)', () => {
  it('lists the active venues for Venue Staff with ISO timestamps', async () => {
    const { pool, statements } = fakePool();
    expect(await listCatalogueVenues({ pool }, { actor: staff })).toEqual([serialised]);
    expect(statements[0]!.sql).toMatch(/WHERE is_active ORDER BY lower\(name\)/);
  });

  it('returns an empty list when the catalogue has no active venue', async () => {
    const { pool, rawPool } = fakePool();
    rawPool.query.mockResolvedValueOnce({ rows: [] });
    expect(await listCatalogueVenues({ pool }, { actor: staff })).toEqual([]);
  });

  it('returns one venue with its current information', async () => {
    const { pool, statements } = fakePool();
    expect(await getCatalogueVenue({ pool }, { actor: staff, venueId })).toEqual(serialised);
    expect(statements[0]!.params).toEqual([venueId]);
    expect(statements[0]!.sql).toMatch(/is_active/);
  });

  it('reports a missing or inactive venue as not found', async () => {
    const { pool, rawPool } = fakePool();
    rawPool.query.mockResolvedValueOnce({ rows: [] });
    expect(await codeOf(getCatalogueVenue({ pool }, { actor: staff, venueId }))).toBe('VENUE_NOT_FOUND');
  });

  it.each(otherRoles)('refuses %s before any query is made', async (role) => {
    const { pool, statements } = fakePool();
    const actor = { ...staff, role };
    expect(await codeOf(listCatalogueVenues({ pool }, { actor }))).toBe('ACTION_FORBIDDEN');
    expect(await codeOf(getCatalogueVenue({ pool }, { actor, venueId }))).toBe('ACTION_FORBIDDEN');
    expect(await codeOf(updateCatalogueVenue({ pool }, { actor, venueId, input: { capacity: 5 } })))
      .toBe('ACTION_FORBIDDEN');
    expect(statements).toHaveLength(0);
  });
});

describe('KAN-50 catalogue service: updating (AC3-AC11, AC14)', () => {
  it('saves only the supplied fields in one committed transaction and returns the saved venue', async () => {
    const { pool, statements, release } = fakePool({ saved: { ...row, capacity: 150 } });
    const saved = await updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { capacity: 150 } });

    expect(saved.capacity).toBe(150);
    const update = sqlOf(statements, /^UPDATE venues/)!;
    expect(update.sql).toBe('UPDATE venues SET capacity = $2, updated_at = now() WHERE id = $1');
    expect(update.params).toEqual([venueId, 150]);
    expect(statements.map((statement) => statement.sql.split(/\s/)[0])).toEqual(
      ['BEGIN', 'SELECT', 'SELECT', 'UPDATE', 'SELECT', 'COMMIT'],
    );
    expect(release).toHaveBeenCalledOnce();
  });

  it('attributes the transaction to the acting user', async () => {
    const { pool, statements } = fakePool();
    await updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { location: 'Annex' } });
    expect(sqlOf(statements, /set_config/)!.params).toEqual([staff.id]);
  });

  it('maps every editable field to its own column and keeps layouts on the same venue (AC10)', async () => {
    const { pool, statements } = fakePool();
    await updateCatalogueVenue({ pool }, {
      actor: staff, venueId,
      input: {
        location: 'Level 4', capacity: 80, facilities: ['Mic'], accessibilityFeatures: ['Lift'],
        wheelchairAccessible: false, layouts: ['Theatre', 'Classroom'], opensAt: '09:00', closesAt: '21:00',
      },
    });
    const update = sqlOf(statements, /^UPDATE venues/)!;
    expect(update.sql).toBe(
      'UPDATE venues SET location = $2, capacity = $3, facilities = $4, accessibility_features = $5, '
      + 'wheelchair_accessible = $6, layouts = $7, opens_at = $8, closes_at = $9, updated_at = now() WHERE id = $1',
    );
    expect(update.params).toEqual([
      venueId, 'Level 4', 80, ['Mic'], ['Lift'], false, ['Theatre', 'Classroom'], '09:00', '21:00',
    ]);
  });

  it('writes an explicit null so a location or hour can be cleared', async () => {
    const { pool, statements } = fakePool();
    await updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { location: null, opensAt: null } });
    expect(sqlOf(statements, /^UPDATE venues/)!.params).toEqual([venueId, null, null]);
  });

  it('validates the body before opening a connection', async () => {
    const { pool, rawPool } = fakePool();
    expect(await codeOf(updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { capacity: 0 } })))
      .toBe('INVALID_VENUE_CATALOGUE_INPUT');
    expect(await codeOf(updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { name: 'Renamed' } })))
      .toBe('INVALID_VENUE_CATALOGUE_INPUT');
    expect(rawPool.connect).not.toHaveBeenCalled();
  });

  it('rolls back and writes nothing for a venue that does not exist', async () => {
    const { pool, statements, release } = fakePool({ locked: null });
    expect(await codeOf(updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { capacity: 5 } })))
      .toBe('VENUE_NOT_FOUND');
    expect(sqlOf(statements, /^UPDATE venues/)).toBeUndefined();
    expect(sqlOf(statements, /^ROLLBACK/)).toBeDefined();
    expect(release).toHaveBeenCalledOnce();
  });

  it('refuses an inactive venue with a conflict and changes nothing', async () => {
    const { pool, statements } = fakePool({ locked: { isActive: false, opensAt: null, closesAt: null } });
    expect(await codeOf(updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { capacity: 5 } })))
      .toBe('VENUE_INACTIVE');
    expect(sqlOf(statements, /^UPDATE venues/)).toBeUndefined();
  });

  it.each([
    [{ opensAt: '23:00' }, { opensAt: '08:00', closesAt: '22:00' }],
    [{ closesAt: '07:00' }, { opensAt: '08:00', closesAt: '22:00' }],
    [{ opensAt: '22:00' }, { opensAt: '08:00', closesAt: '22:00' }],
  ])('checks a single hour change %j against the stored hours and refuses a reversed pair', async (input, stored) => {
    const { pool, statements } = fakePool({ locked: { isActive: true, ...stored } });
    expect(await codeOf(updateCatalogueVenue({ pool }, { actor: staff, venueId, input })))
      .toBe('INVALID_VENUE_CATALOGUE_INPUT');
    expect(sqlOf(statements, /^UPDATE venues/)).toBeUndefined();
    expect(sqlOf(statements, /^ROLLBACK/)).toBeDefined();
  });

  it.each([
    [{ opensAt: '07:00' }, { opensAt: '08:00', closesAt: '22:00' }],
    [{ closesAt: '23:00' }, { opensAt: '08:00', closesAt: '22:00' }],
    [{ opensAt: '23:30' }, { opensAt: null, closesAt: null }],
    [{ closesAt: '01:00' }, { opensAt: null, closesAt: null }],
    [{ opensAt: null }, { opensAt: '08:00', closesAt: '22:00' }],
  ])('accepts a single hour change %j that keeps the pair ordered', async (input, stored) => {
    const { pool, statements } = fakePool({ locked: { isActive: true, ...stored } });
    await updateCatalogueVenue({ pool }, { actor: staff, venueId, input });
    expect(sqlOf(statements, /^UPDATE venues/)).toBeDefined();
  });

  it('rolls back, releases the connection and rethrows when the write fails', async () => {
    const { pool, statements, release } = fakePool({ failOn: /^UPDATE venues/ });
    await expect(updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { capacity: 5 } }))
      .rejects.toThrow('database failure');
    expect(sqlOf(statements, /^ROLLBACK/)).toBeDefined();
    expect(sqlOf(statements, /^COMMIT/)).toBeUndefined();
    expect(release).toHaveBeenCalledOnce();
  });

  it('locks the venue row before changing it so concurrent edits are serialised', async () => {
    const { pool, statements } = fakePool();
    await updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { capacity: 5 } });
    const order = statements.map((statement) => statement.sql);
    expect(order.findIndex((sql) => /FOR UPDATE/.test(sql)))
      .toBeLessThan(order.findIndex((sql) => /^UPDATE venues/.test(sql)));
  });
});

describe('KAN-77 catalogue service: buffer durations', () => {
  const lockedWith = (setupMinutes: number, turnaroundMinutes: number) => ({
    isActive: true, opensAt: '08:00', closesAt: '22:00', setupMinutes, turnaroundMinutes,
  });

  it('saves a buffer when the stored value still matches the loaded one (AC1, AC4, AC5)', async () => {
    const { pool, statements } = fakePool({
      locked: lockedWith(0, 10), saved: { ...row, setupMinutes: 30, turnaroundMinutes: 10 } as typeof row,
    });
    const saved = await updateCatalogueVenue({ pool }, {
      actor: staff, venueId, input: { setupMinutes: 30, expectedSetupMinutes: 0 },
    });

    expect(saved).toMatchObject({ setupMinutes: 30, turnaroundMinutes: 10 });
    const update = sqlOf(statements, /^UPDATE venues/)!;
    expect(update.sql).toBe('UPDATE venues SET setup_minutes = $2, updated_at = now() WHERE id = $1');
    expect(update.params).toEqual([venueId, 30]);
    expect(sqlOf(statements, /FOR UPDATE/)!.sql).toMatch(/setup_minutes AS "setupMinutes"/);
    expect(statements.at(-1)!.sql).toBe('COMMIT');
  });

  it('writes both buffers and another field together when nothing is stale', async () => {
    const { pool, statements } = fakePool({ locked: lockedWith(5, 10) });
    await updateCatalogueVenue({ pool }, {
      actor: staff, venueId,
      input: { capacity: 90, setupMinutes: 15, expectedSetupMinutes: 5, turnaroundMinutes: 20, expectedTurnaroundMinutes: 10 },
    });
    const update = sqlOf(statements, /^UPDATE venues/)!;
    expect(update.sql).toBe(
      'UPDATE venues SET capacity = $2, setup_minutes = $3, turnaround_minutes = $4, updated_at = now() WHERE id = $1',
    );
    expect(update.params).toEqual([venueId, 90, 15, 20]);
  });

  it.each([
    [{ setupMinutes: 30, expectedSetupMinutes: 0 }, lockedWith(15, 0), 'setupMinutes'],
    [{ turnaroundMinutes: 30, expectedTurnaroundMinutes: 0 }, lockedWith(0, 45), 'turnaroundMinutes'],
    [{ setupMinutes: 1, expectedSetupMinutes: 0, turnaroundMinutes: 1, expectedTurnaroundMinutes: 0 }, lockedWith(5, 5),
      'setupMinutes and turnaroundMinutes'],
  ])('refuses a stale edit to the same buffer field without writing anything (AC5): %j', async (input, locked, fields) => {
    const { pool, statements, release } = fakePool({ locked });
    const attempt = updateCatalogueVenue({ pool }, { actor: staff, venueId, input });

    await expect(attempt).rejects.toMatchObject({
      kind: 'CONFLICT', code: 'VENUE_BUFFER_CONFLICT',
      message: `Another change was saved to ${fields} after you loaded this venue. Reload and try again.`,
    });
    expect(sqlOf(statements, /^UPDATE venues/)).toBeUndefined();
    expect(statements.at(-1)!.sql).toBe('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });

  it('refuses only the stale field when one buffer is stale and the other is not', async () => {
    const { pool, statements } = fakePool({ locked: lockedWith(0, 45) });
    await expect(updateCatalogueVenue({ pool }, {
      actor: staff, venueId,
      input: { setupMinutes: 5, expectedSetupMinutes: 0, turnaroundMinutes: 30, expectedTurnaroundMinutes: 0 },
    })).rejects.toMatchObject({ code: 'VENUE_BUFFER_CONFLICT', message: expect.stringContaining('saved to turnaroundMinutes after') });
    expect(sqlOf(statements, /^UPDATE venues/)).toBeUndefined();
  });

  it('keeps the KAN-50 rule for other fields: a non-buffer edit is never refused for changed buffers', async () => {
    const { pool, statements } = fakePool({ locked: lockedWith(120, 60) });
    await updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { capacity: 75 } });
    expect(sqlOf(statements, /^UPDATE venues/)!.params).toEqual([venueId, 75]);
  });

  it('accepts a matching expectation even if the buffer changed and changed back meanwhile', async () => {
    const { pool, statements } = fakePool({ locked: lockedWith(10, 0) });
    await updateCatalogueVenue({ pool }, { actor: staff, venueId, input: { setupMinutes: 20, expectedSetupMinutes: 10 } });
    expect(sqlOf(statements, /^UPDATE venues/)!.params).toEqual([venueId, 20]);
  });

  it.each(otherRoles)('refuses %s before any query, so buffers cannot be changed by other roles (AC1)', async (role) => {
    const { pool, rawPool } = fakePool();
    expect(await codeOf(updateCatalogueVenue({ pool }, {
      actor: { ...staff, role }, venueId, input: { setupMinutes: 5, expectedSetupMinutes: 0 },
    }))).toBe('ACTION_FORBIDDEN');
    expect(rawPool.connect).not.toHaveBeenCalled();
  });

  it('validates the buffer before opening a connection (AC2)', async () => {
    const { pool, rawPool } = fakePool();
    expect(await codeOf(updateCatalogueVenue({ pool }, {
      actor: staff, venueId, input: { setupMinutes: 1441, expectedSetupMinutes: 0 },
    }))).toBe('INVALID_VENUE_CATALOGUE_INPUT');
    expect(rawPool.connect).not.toHaveBeenCalled();
  });

  it('checks the venue is active before comparing buffers', async () => {
    const { pool } = fakePool({ locked: { ...lockedWith(99, 99), isActive: false } });
    expect(await codeOf(updateCatalogueVenue({ pool }, {
      actor: staff, venueId, input: { setupMinutes: 5, expectedSetupMinutes: 0 },
    }))).toBe('VENUE_INACTIVE');
  });
});
