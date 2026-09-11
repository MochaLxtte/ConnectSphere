import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { HealthDatabase } from '../../src/db/pool.js';
import {
  getReviewableRequestDetail,
  listReviewableRequests,
  SubmittedRequestNotFoundError,
  type QueueActor,
} from '../../src/modules/events/submitted-requests.js';
import type { SubmittedRequestsRouterDependencies } from '../../src/modules/events/submitted-requests-router.js';

vi.mock('../../src/modules/events/submitted-requests.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/modules/events/submitted-requests.js')>();
  return { ...actual, listReviewableRequests: vi.fn(), getReviewableRequestDetail: vi.fn() };
});

const coordinator: QueueActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const organiser: QueueActor = { id: '20000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const requestId = '10000000-0000-4000-8000-000000000001';
const list = vi.mocked(listReviewableRequests);
const detail = vi.mocked(getReviewableRequestDetail);

function setup(actor: QueueActor | null = coordinator) {
  const query = vi.fn<HealthDatabase['query']>();
  const logger = { error: vi.fn() };
  const submittedRequests: SubmittedRequestsRouterDependencies = {
    pool: { query: vi.fn() },
    authenticate: vi.fn<SubmittedRequestsRouterDependencies['authenticate']>().mockResolvedValue(actor),
    canViewRequest: vi.fn().mockReturnValue(false),
  };
  const app = createApp({ database: { query }, submittedRequests, logger });
  return { app, submittedRequests, logger };
}

beforeEach(() => {
  list.mockReset();
  detail.mockReset();
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

describe('KAN-33 GET /api/events/:id (review detail)', () => {
  it('returns detail for an authorised coordinator', async () => {
    const { app, submittedRequests } = setup();
    const record = { id: requestId, organiserId: 'org', coordinatorId: null, status: 'SUBMITTED' as const,
      name: 'Sample', purpose: null, description: null, startsAt: null, endsAt: null,
      expectedAttendance: null, venueRequirements: null, accessibilityNeeds: null,
      equipmentRequirements: null, registrationRequired: null,
      createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z' };
    detail.mockResolvedValue(record);

    const response = await request(app).get(`/api/events/${requestId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(record);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(detail).toHaveBeenCalledExactlyOnceWith(submittedRequests, coordinator, requestId);
  });

  it('requires verified authentication', async () => {
    const { app } = setup(null);
    const response = await request(app).get(`/api/events/${requestId}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(detail).not.toHaveBeenCalled();
  });

  it('returns the generic 404 (not 403) for an unauthorised or non-existent request', async () => {
    const { app } = setup();
    detail.mockRejectedValue(new SubmittedRequestNotFoundError());
    const response = await request(app).get(`/api/events/${requestId}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
  });

  it.each(['not-a-uuid', '10000000-0000-4000-8000-00000000000', "' OR 1=1--"])(
    'rejects an invalid request ID before querying: %s',
    async (id) => {
      const { app } = setup();
      const response = await request(app).get(`/api/events/${encodeURIComponent(id)}`);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
      expect(detail).not.toHaveBeenCalled();
    },
  );

  it('defers to a later handler for a non-coordinator actor instead of answering itself', async () => {
    const { app } = setup(organiser);
    const response = await request(app).get(`/api/events/${requestId}`);
    // No KAN-34/KAN-16 handler is mounted in this test app, so the request falls through
    // to the generic 404 — proving this router did not claim the route for this actor.
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(detail).not.toHaveBeenCalled();
  });
});
