import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { HealthDatabase } from '../../src/db/pool.js';
import {
  listReviewableRequests,
  type QueueActor,
} from '../../src/modules/events/submitted-requests.js';
import type { SubmittedRequestsRouterDependencies } from '../../src/modules/events/submitted-requests-router.js';

vi.mock('../../src/modules/events/submitted-requests.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/modules/events/submitted-requests.js')>();
  return { ...actual, listReviewableRequests: vi.fn() };
});

const coordinator: QueueActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const requestId = '10000000-0000-4000-8000-000000000001';
const list = vi.mocked(listReviewableRequests);

function setup(actor: QueueActor | null = coordinator) {
  const query = vi.fn<HealthDatabase['query']>();
  const logger = { error: vi.fn() };
  const submittedRequests: SubmittedRequestsRouterDependencies = {
    pool: { query: vi.fn(), connect: vi.fn() },
    authenticate: vi.fn<SubmittedRequestsRouterDependencies['authenticate']>().mockResolvedValue(actor),
    canViewRequest: vi.fn().mockReturnValue(false),
    canReviewRequest: vi.fn().mockReturnValue(false),
  };
  const app = createApp({ database: { query }, submittedRequests, logger });
  return { app, submittedRequests, logger };
}

beforeEach(() => {
  list.mockReset();
});

describe('KAN-33 GET /api/events (review queue)', () => {
  it('returns the queue for an authenticated coordinator', async () => {
    const { app, submittedRequests } = setup();
    const items = [{ id: requestId, name: 'Sample', status: 'SUBMITTED' as const,
      createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z' }];
    list.mockResolvedValue(items);

    const response = await request(app).get('/api/events');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(list).toHaveBeenCalledExactlyOnceWith(submittedRequests, coordinator);
  });

  it('requires verified authentication', async () => {
    const { app } = setup(null);
    const response = await request(app).get('/api/events');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(list).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'rejects the verified %s role before querying the database',
    async (role) => {
      const { app } = setup({ ...coordinator, role });
      const response = await request(app).get('/api/events');
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('VIEW_FORBIDDEN');
      expect(list).not.toHaveBeenCalled();
    },
  );

  it('returns an empty list rather than an error when nothing is reviewable', async () => {
    const { app } = setup();
    list.mockResolvedValue([]);
    const response = await request(app).get('/api/events');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });
});
