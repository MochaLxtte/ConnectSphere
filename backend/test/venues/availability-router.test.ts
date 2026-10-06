import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { HealthDatabase } from '../../src/db/pool.js';
import type { UserRole } from '../../src/modules/auth/types.js';
import type { WorkflowRouterDependencies } from '../../src/modules/events/workflow-http.js';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { listVenueAvailability, type VenueAvailability } from '../../src/modules/venues/availability.js';

// Keep the real window parser; only the database read is replaced.
vi.mock('../../src/modules/venues/availability.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/venues/availability.js')>();
  return { ...actual, listVenueAvailability: vi.fn() };
});

const list = vi.mocked(listVenueAvailability);
const path = '/api/venues/availability';
const query = { from: '2026-10-05T00:00:00+08:00', to: '2026-10-12T00:00:00+08:00' };
const week = { from: '2026-10-04T16:00:00.000Z', to: '2026-10-11T16:00:00.000Z' };
const actorWith = (role: UserRole): WorkflowActor => ({ id: '20000000-0000-4000-8000-000000000001', role });
const venues: VenueAvailability[] = [{
  id: '30000000-0000-4000-8000-000000000001', name: 'Harbour Hall', location: 'Level 1', capacity: 300,
  opensAt: '08:00', closesAt: '22:00',
  unavailable: [{
    id: '40000000-0000-4000-8000-000000000001', kind: 'BLOCKED', reason: 'Maintenance',
    startsAt: '2026-10-06T01:00:00.000Z', endsAt: '2026-10-06T10:00:00.000Z',
  }],
}];

function setup(actor: WorkflowActor | null) {
  const workspace: WorkflowRouterDependencies = {
    pool: {
      query() { throw new Error('HTTP boundary tests must not query the database.'); },
      connect() { throw new Error('HTTP boundary tests must not open a database connection.'); },
    } as unknown as WorkflowRouterDependencies['pool'],
    authenticate: vi.fn().mockResolvedValue(actor),
  };
  const logger = { error: vi.fn() };
  const app = createApp({ database: { query: vi.fn<HealthDatabase['query']>() }, workspace, logger });
  return { app, workspace, logger };
}

beforeEach(() => { list.mockReset(); });

describe('KAN-51 GET /api/venues/availability HTTP boundary', () => {
  it('requires a verified session and ignores client-supplied identity', async () => {
    const { app } = setup(null);
    const response = await request(app).get(path).query(query)
      .set('X-User-Id', actorWith('VENUE_STAFF').id).set('X-User-Role', 'VENUE_STAFF');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view venue availability.' },
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(list).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'ATTENDEE'] as const)('refuses %s before reading venue data', async (role) => {
    const { app } = setup(actorWith(role));
    const response = await request(app).get(path).query(query);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACTION_FORBIDDEN');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(list).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'ATTENDEE'] as const)(
    'denies %s access to availability data even with spoofed internal-user claims', async (role) => {
      const { app, workspace } = setup(actorWith(role));
      // Data would be returned if the route trusted the request's claimed role.
      list.mockResolvedValue(venues);
      const claimedUserId = '20000000-0000-4000-8000-000000000002';
      const response = await request(app).get(path)
        .query({ ...query, userId: claimedUserId, role: 'VENUE_STAFF' })
        .set('X-User-Id', claimedUserId).set('X-User-Role', 'VENUE_STAFF');

      expect(workspace.authenticate).toHaveBeenCalledOnce();
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: { code: 'ACTION_FORBIDDEN', message: expect.any(String) },
      });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(list).not.toHaveBeenCalled();
    },
  );

  it.each(['EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF'] as const)(
    'serves %s the venues for the normalised window', async (role) => {
      const { app, workspace } = setup(actorWith(role));
      list.mockResolvedValue(venues);
      const response = await request(app).get(path).query(query);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...week, items: venues });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(list).toHaveBeenCalledExactlyOnceWith(workspace, actorWith(role), week);
    },
  );

  it.each([
    ['no window', ''],
    ['an unparseable end', `?from=${encodeURIComponent(query.from)}&to=tomorrow`],
    ['a reversed window', `?from=${encodeURIComponent(query.to)}&to=${encodeURIComponent(query.from)}`],
    ['a repeated start', `?from=${encodeURIComponent(query.from)}&from=${encodeURIComponent(query.from)}`
      + `&to=${encodeURIComponent(query.to)}`],
  ])('returns 400 for %s without reading venue data', async (_label, search) => {
    const { app } = setup(actorWith('EVENT_COORDINATOR'));
    const response = await request(app).get(`${path}${search}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_AVAILABILITY_WINDOW');
    expect(list).not.toHaveBeenCalled();
  });

  it('hands unexpected failures to the application error handler without details', async () => {
    const { app, logger } = setup(actorWith('VENUE_STAFF'));
    list.mockRejectedValue(new Error('connection string postgres://secret'));
    const response = await request(app).get(path).query(query);

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('secret');
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('is not mounted when the workspace dependencies are absent', async () => {
    const app = createApp({ database: { query: vi.fn<HealthDatabase['query']>() }, logger: { error: vi.fn() } });
    const response = await request(app).get(path).query(query);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
