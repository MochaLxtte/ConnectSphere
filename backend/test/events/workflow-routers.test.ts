import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignCoordinator, listCoordinators, listUnassignedRequests } from '../../src/modules/events/assignment.js';
import { createAssignmentRouter } from '../../src/modules/events/assignment-router.js';
import { decideChangeRequest } from '../../src/modules/events/change-requests.js';
import { createChangeRequestRouter } from '../../src/modules/events/change-request-router.js';
import { requestClarification, respondToClarification } from '../../src/modules/events/clarifications.js';
import { createClarificationRouter } from '../../src/modules/events/clarification-router.js';
import { cancelEvent, listStatusHistory } from '../../src/modules/events/lifecycle.js';
import { createLifecycleRouter } from '../../src/modules/events/lifecycle-router.js';
import type { WorkflowRouterDependencies } from '../../src/modules/events/workflow-http.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

vi.mock('../../src/modules/events/assignment.js', () => ({
  assignCoordinator: vi.fn(), listAssignments: vi.fn(), listCoordinators: vi.fn(), listUnassignedRequests: vi.fn(),
}));
vi.mock('../../src/modules/events/clarifications.js', () => ({
  listClarifications: vi.fn(), requestClarification: vi.fn(), respondToClarification: vi.fn(), startReview: vi.fn(),
}));
vi.mock('../../src/modules/events/change-requests.js', () => ({
  createChangeRequest: vi.fn(), decideChangeRequest: vi.fn(), listChangeRequests: vi.fn(), withdrawChangeRequest: vi.fn(),
}));
vi.mock('../../src/modules/events/lifecycle.js', () => ({
  cancelEvent: vi.fn(), completeEvent: vi.fn(), confirmEvent: vi.fn(), listStatusHistory: vi.fn(),
}));

const eventId = '10000000-0000-4000-8000-000000000001';
const otherId = '40000000-0000-4000-8000-000000000001';
const coordinator: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const organiser: WorkflowActor = { id: '30000000-0000-4000-8000-000000000001', role: 'EVENT_ORGANISER' };

function setup(actor: WorkflowActor | null) {
  const dependencies: WorkflowRouterDependencies = {
    pool: {
      query() { throw new Error('HTTP boundary tests must not query the database.'); },
      connect() { throw new Error('HTTP boundary tests must not open a database connection.'); },
    } as unknown as WorkflowRouterDependencies['pool'],
    authenticate: vi.fn().mockResolvedValue(actor),
  };
  const app = express();
  app.use(express.json());
  // Same order the lead must use: the assignment router precedes any GET /:id handler.
  app.use('/api/events', createAssignmentRouter(dependencies));
  app.use('/api/events', createClarificationRouter(dependencies));
  app.use('/api/events', createChangeRequestRouter(dependencies));
  app.use('/api/events', createLifecycleRouter(dependencies));
  app.get('/api/events/:id', (_request, response) => { response.status(200).json({ detail: true }); });
  const handleError: ErrorRequestHandler = (_error, _request, response, _next) => {
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  };
  app.use(handleError);
  return { app, dependencies };
}

beforeEach(() => { vi.resetAllMocks(); });

const routes = [
  ['get', '/unassigned'], ['get', '/coordinators'],
  ['put', `/${eventId}/coordinator`], ['get', `/${eventId}/assignments`],
  ['post', `/${eventId}/start-review`], ['get', `/${eventId}/clarifications`],
  ['post', `/${eventId}/clarifications`], ['post', `/${eventId}/clarifications/${otherId}/response`],
  ['get', `/${eventId}/change-requests`], ['post', `/${eventId}/change-requests`],
  ['post', `/${eventId}/change-requests/${otherId}/withdraw`],
  ['post', `/${eventId}/change-requests/${otherId}/decision`],
  ['post', `/${eventId}/confirm`], ['post', `/${eventId}/cancel`], ['post', `/${eventId}/complete`],
  ['get', `/${eventId}/history`],
] as const;

describe('workflow routers HTTP boundary', () => {
  it.each(routes)('%s %s requires verified authentication', async (method, path) => {
    const { app } = setup(null);
    const response = await request(app)[method](`/api/events${path}`)
      .set('X-User-Id', coordinator.id).set('X-User-Role', 'EVENT_COORDINATOR').send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each(routes)('%s %s refuses roles outside the workflow', async (method, path) => {
    const { app } = setup({ id: organiser.id, role: 'ATTENDEE' });
    const response = await request(app)[method](`/api/events${path}`).send({});
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACTION_FORBIDDEN');
  });

  it('serves /unassigned and /coordinators ahead of the GET /:id detail route', async () => {
    const { app, dependencies } = setup(coordinator);
    vi.mocked(listUnassignedRequests).mockResolvedValue([]);
    vi.mocked(listCoordinators).mockResolvedValue([{ id: coordinator.id, displayName: 'Casey', email: 'c@example.test' }]);
    const unassigned = await request(app).get('/api/events/unassigned');
    expect(unassigned.status).toBe(200);
    expect(unassigned.body).toEqual({ items: [] });
    const coordinators = await request(app).get('/api/events/coordinators');
    expect(coordinators.body.items).toHaveLength(1);
    expect(listUnassignedRequests).toHaveBeenCalledExactlyOnceWith(dependencies, coordinator);
    expect((await request(app).get(`/api/events/${eventId}`)).body).toEqual({ detail: true });
  });

  it.each([
    ['put', '/not-a-uuid/coordinator', 'INVALID_EVENT_REQUEST_ID', coordinator],
    ['post', '/not-a-uuid/cancel', 'INVALID_EVENT_REQUEST_ID', organiser],
    ['post', `/${eventId}/clarifications/nope/response`, 'INVALID_CLARIFICATION_ID', organiser],
    ['post', `/${eventId}/change-requests/nope/decision`, 'INVALID_CHANGE_REQUEST_ID', coordinator],
    ['post', `/${eventId}/change-requests/nope/withdraw`, 'INVALID_CHANGE_REQUEST_ID', organiser],
  ] as const)('%s %s validates UUID parameters before persistence', async (method, path, code, actor) => {
    const { app } = setup(actor);
    const response = await request(app)[method](`/api/events${path}`).send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(code);
    expect(assignCoordinator).not.toHaveBeenCalled();
    expect(cancelEvent).not.toHaveBeenCalled();
  });

  it('only lets coordinators assign and only organisers answer clarifications', async () => {
    const asOrganiser = setup(organiser).app;
    expect((await request(asOrganiser).put(`/api/events/${eventId}/coordinator`)
      .send({ coordinatorId: coordinator.id })).status).toBe(403);
    expect((await request(asOrganiser).get('/api/events/unassigned')).status).toBe(403);
    expect((await request(asOrganiser).post(`/api/events/${eventId}/confirm`)).status).toBe(403);
    const asCoordinator = setup(coordinator).app;
    expect((await request(asCoordinator).post(`/api/events/${eventId}/clarifications/${otherId}/response`)
      .send({ response: 'x' })).status).toBe(403);
    expect((await request(asCoordinator).post(`/api/events/${eventId}/change-requests`)
      .send({ proposedChanges: { name: 'x' }, reason: 'y' })).status).toBe(403);
    expect(assignCoordinator).not.toHaveBeenCalled();
    expect(respondToClarification).not.toHaveBeenCalled();
  });

  it('passes verified identity, never client-supplied identity, to the service', async () => {
    const { app, dependencies } = setup(coordinator);
    vi.mocked(requestClarification).mockResolvedValue({
      clarificationId: otherId, eventRequestId: eventId, status: 'CLARIFICATION_REQUESTED',
    });
    const response = await request(app).post(`/api/events/${eventId}/clarifications`)
      .set('X-User-Id', organiser.id).send({ message: 'Which hall?' });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('CLARIFICATION_REQUESTED');
    expect(requestClarification).toHaveBeenCalledExactlyOnceWith(dependencies, {
      eventRequestId: eventId, actor: coordinator, input: { message: 'Which hall?' },
    });
  });

  it.each([
    ['INVALID_INPUT', 'INVALID_CHANGE_REQUEST_INPUT', 400],
    ['NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 404],
    ['FORBIDDEN', 'ACTION_FORBIDDEN', 403],
    ['CONFLICT', 'CHANGE_REQUEST_NOT_PENDING', 409],
  ] as const)('maps a %s service error to its status', async (kind, code, status) => {
    const { app } = setup(coordinator);
    vi.mocked(decideChangeRequest).mockRejectedValue(new WorkflowError(kind, code, 'Explained.'));
    const response = await request(app).post(`/api/events/${eventId}/change-requests/${otherId}/decision`)
      .send({ decision: 'APPROVED' });
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error: { code, message: 'Explained.' } });
  });

  it('hands unexpected failures to the application error handler without details', async () => {
    const { app } = setup(organiser);
    vi.mocked(listStatusHistory).mockRejectedValue(new Error('connection string postgres://secret'));
    const response = await request(app).get(`/api/events/${eventId}/history`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });
});
