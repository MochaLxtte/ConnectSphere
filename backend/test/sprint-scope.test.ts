import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { UserRole } from '../src/modules/auth/types.js';
import { isAssignedCoordinator } from '../src/modules/events/coordinator-access.js';
import type { WorkflowRouterDependencies } from '../src/modules/events/workflow-http.js';

const eventId = '10000000-0000-4000-8000-000000000001';
const recordId = '20000000-0000-4000-8000-000000000001';

// These paths were previously exposed by the removed workflow routers. Keep them
// absent from the mounted application until their stories enter the sprint scope.
const futureRoutes = [
  // KAN-61 confirmation (POST /api/events/:id/confirm) entered scope in Sprint 4 (29 October 2026).
  // KAN-10 completion (POST /api/events/:id/complete) entered scope in Sprint 4 (29 October 2026).
  // KAN-15 change-request routes entered scope in Sprint 4 (27 October 2026).
  ['get', '/api/equipment', 'TECHNICAL_SUPPORT_STAFF'],
  ['get', '/api/equipment/availability', 'TECHNICAL_SUPPORT_STAFF'],
  ['get', `/api/equipment/${recordId}`, 'TECHNICAL_SUPPORT_STAFF'],
  ['get', `/api/equipment/${recordId}/availability`, 'TECHNICAL_SUPPORT_STAFF'],
  ['post', '/api/equipment', 'TECHNICAL_SUPPORT_STAFF'],
  ['patch', `/api/equipment/${recordId}`, 'TECHNICAL_SUPPORT_STAFF'],
  ['post', '/api/equipment-requests', 'EVENT_COORDINATOR'],
  ['patch', `/api/equipment-requests/${recordId}`, 'EVENT_COORDINATOR'],
  ['post', `/api/equipment-requests/${recordId}/decision`, 'TECHNICAL_SUPPORT_STAFF'],
  ['get', '/api/registrations/events', 'ATTENDEE'],
  ['get', `/api/registrations/events/${eventId}`, 'ATTENDEE'],
  ['post', `/api/registrations/events/${eventId}/register`, 'ATTENDEE'],
  ['post', `/api/registrations/events/${eventId}/withdraw`, 'ATTENDEE'],
  ['get', `/api/registrations/events/${eventId}/attendees`, 'EVENT_ORGANISER'],
] as const satisfies ReadonlyArray<readonly ['get' | 'post' | 'patch', string, UserRole]>;

describe('Sprint 1 and Sprint 2 application scope', () => {
  it.each(futureRoutes)('%s %s is unavailable to %s', async (method, path, role) => {
    const query = vi.fn().mockRejectedValue(new Error('An unavailable feature must not query the database.'));
    const connect = vi.fn().mockRejectedValue(new Error('An unavailable feature must not open a transaction.'));
    const pool = { query, connect } as unknown as WorkflowRouterDependencies['pool'];
    const events = {
      pool,
      authenticate: vi.fn().mockResolvedValue({ id: recordId, role }),
      canViewRequest: isAssignedCoordinator,
      canReviewRequest: isAssignedCoordinator,
    };
    const logger = { error: vi.fn() };
    const app = createApp({
      database: pool, workspace: events, submittedRequests: events, reviews: events, logger,
    });

    const response = await request(app)[method](path).send({});
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
    });
    expect(query).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
