import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { ReviewActor } from '../../src/modules/events/review-decision.js';
import type { EventRequestDetail } from '../../src/modules/events/event-request-detail.js';
import { getEventRequestDetail } from '../../src/modules/events/event-request-detail.js';
import type { EventStatus } from '../../src/modules/events/types.js';

const coordinator: ReviewActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const organiser: ReviewActor = { id: '20000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const requestId = '10000000-0000-4000-8000-000000000001';
const baseRow = {
  id: requestId, organiserId: organiser.id, coordinatorId: coordinator.id,
  status: 'SUBMITTED' as EventStatus, name: 'Sample request', purpose: null, description: null,
  startsAt: null, endsAt: null, expectedAttendance: 0, venueRequirements: null,
  accessibilityNeeds: null, equipmentRequirements: null, registrationRequired: false,
  registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null,
  createdAt: new Date('2026-09-06T02:00:00Z'), updatedAt: new Date('2026-09-06T03:00:00Z'),
  review: null as EventRequestDetail['review'],
};
const recordedReview = {
  reviewId: '30000000-0000-4000-8000-000000000001', eventRequestId: requestId,
  reviewedBy: coordinator.id, decision: 'APPROVED' as const, reason: null,
  createdAt: '2026-09-07T04:00:00.000Z',
};

function setup(actor: ReviewActor | null = coordinator, changes: Partial<typeof baseRow> = {}) {
  const row = { ...baseRow, ...changes };
  const client = { query: vi.fn().mockResolvedValue({ rows: [row] }), release: vi.fn() };
  const dependencies = {
    pool: { query: vi.fn(), connect: vi.fn().mockResolvedValue(client) },
    authenticate: vi.fn().mockResolvedValue(actor),
    canViewRequest: vi.fn().mockResolvedValue(true),
    canReviewRequest: vi.fn().mockResolvedValue(true),
  };
  const logger = { error: vi.fn() };
  const app = createApp({ database: dependencies.pool, submittedRequests: dependencies, logger });
  return { app, dependencies, client, logger, row };
}

describe('KAN-34/KAN-33/KAN-16 shared GET /api/events/:id', () => {
  it.each(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED'] as const)(
    'serves the owning organiser in %s state through the shared route', async (status) => {
      const review = status === 'APPROVED' || status === 'REJECTED'
        ? { ...recordedReview, decision: status } : null;
      const { app, dependencies, client, row } = setup(organiser, { status, review });
      const response = await request(app).get(`/api/events/${requestId}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
        actions: { canEditDraft: status === 'DRAFT', canMakeInitialDecision: false },
      });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(dependencies.authenticate).toHaveBeenCalledTimes(1);
      expect(dependencies.canViewRequest).not.toHaveBeenCalled();
      expect(dependencies.canReviewRequest).not.toHaveBeenCalled();
      expect(client.release).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED'] as const)(
    'serves an authorised coordinator in %s state with appropriate action availability', async (status) => {
      const review = status === 'APPROVED' || status === 'REJECTED'
        ? { ...recordedReview, decision: status } : null;
      const { app, dependencies, client, row } = setup(coordinator, { status, review });
      const response = await request(app).get(`/api/events/${requestId}`);
      expect(response.status).toBe(200);
      expect(response.body.review).toEqual(review);
      // A decision may follow directly or after the request was marked as under review.
      const decidable = status === 'SUBMITTED' || status === 'UNDER_REVIEW';
      expect(response.body.actions).toEqual({ canEditDraft: false, canMakeInitialDecision: decidable });
      expect(dependencies.canViewRequest).toHaveBeenCalledExactlyOnceWith(coordinator, row);
      if (decidable) {
        expect(dependencies.canReviewRequest).toHaveBeenCalledExactlyOnceWith(coordinator, row, client);
      } else {
        expect(dependencies.canReviewRequest).not.toHaveBeenCalled();
      }
    },
  );

  it('allows read-only coordinator access without offering a decision', async () => {
    const { app, dependencies } = setup();
    dependencies.canReviewRequest.mockResolvedValue(false);
    const response = await request(app).get(`/api/events/${requestId}`);
    expect(response.status).toBe(200);
    expect(response.body.actions.canMakeInitialDecision).toBe(false);
  });

  it('disables another initial decision when history exists even if the status says SUBMITTED', async () => {
    const { app, dependencies } = setup(coordinator, { review: recordedReview });
    const response = await request(app).get(`/api/events/${requestId}`);
    expect(response.status).toBe(200);
    expect(response.body.review).toEqual(recordedReview);
    expect(response.body.actions.canMakeInitialDecision).toBe(false);
    expect(dependencies.canReviewRequest).not.toHaveBeenCalled();
  });

  it('does not fabricate a review record from an approved status', async () => {
    const { app } = setup(coordinator, { status: 'APPROVED' });
    const response = await request(app).get(`/api/events/${requestId}`);
    expect(response.status).toBe(200);
    expect(response.body.review).toBeNull();
    expect(response.body.actions.canMakeInitialDecision).toBe(false);
  });

  it.each(['other organiser', 'denied coordinator', 'coordinator draft', 'missing request'])(
    'returns the same unavailable response for %s', async (scenario) => {
      const actor = scenario === 'other organiser' ? { ...organiser, id: coordinator.id } : coordinator;
      const { app, client, dependencies } = setup(actor, scenario === 'coordinator draft' ? { status: 'DRAFT' } : {});
      if (scenario === 'denied coordinator') dependencies.canViewRequest.mockResolvedValue(false);
      if (scenario === 'missing request') client.query.mockResolvedValue({ rows: [] });
      const response = await request(app).get(`/api/events/${requestId}`)
        .set('x-user-id', organiser.id).set('x-user-role', 'EVENT_COORDINATOR');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' } });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(dependencies.canReviewRequest).not.toHaveBeenCalled();
      expect(client.release).toHaveBeenCalledTimes(1);
    },
  );

  it('requires verified authentication before validating an ID or obtaining a connection', async () => {
    const { app, dependencies } = setup(null);
    const response = await request(app).get('/api/events/not-a-uuid').set('x-user-role', 'EVENT_COORDINATOR');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(dependencies.pool.connect).not.toHaveBeenCalled();
  });

  it.each(['VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'rejects an unsupported %s account without falling through or obtaining a connection', async (role) => {
      const { app, dependencies } = setup({ ...organiser, role });
      const response = await request(app).get(`/api/events/${requestId}`);
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('VIEW_FORBIDDEN');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(dependencies.pool.connect).not.toHaveBeenCalled();
    },
  );

  it.each([organiser, coordinator])('rejects invalid UUIDs for $role before database access', async (actor) => {
    const { app, dependencies } = setup(actor);
    const response = await request(app).get('/api/events/not-a-uuid');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(dependencies.pool.connect).not.toHaveBeenCalled();
  });

  it.each(['authentication', 'connection', 'query', 'visibility policy', 'decision policy'])(
    'returns a generic error for a failure in %s', async (stage) => {
      const { app, dependencies, client, logger } = setup();
      const failure = new Error('Private service failure details');
      if (stage === 'authentication') dependencies.authenticate.mockRejectedValue(failure);
      if (stage === 'connection') dependencies.pool.connect.mockRejectedValue(failure);
      if (stage === 'query') client.query.mockRejectedValue(failure);
      if (stage === 'visibility policy') dependencies.canViewRequest.mockRejectedValue(failure);
      if (stage === 'decision policy') dependencies.canReviewRequest.mockRejectedValue(failure);
      const response = await request(app).get(`/api/events/${requestId}`);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(logger.error).toHaveBeenCalledExactlyOnceWith('Unexpected API error.');
      expect(client.release).toHaveBeenCalledTimes(stage === 'authentication' || stage === 'connection' ? 0 : 1);
    },
  );

  it('keeps the route unavailable when authentication dependencies are not supplied', async () => {
    const database = { query: vi.fn() };
    const response = await request(createApp({ database })).get(`/api/events/${requestId}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(database.query).not.toHaveBeenCalled();
  });

  it('also rejects unsupported roles at the service boundary without database access', async () => {
    const { dependencies } = setup();
    await expect(getEventRequestDetail(dependencies, { ...organiser, role: 'ATTENDEE' }, requestId))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(dependencies.pool.connect).not.toHaveBeenCalled();
  });
});
