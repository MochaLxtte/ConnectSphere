import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignCoordinator, listAssignments, listCoordinators, listUnassignedRequests,
} from '../../src/modules/events/assignment.js';
import { createAssignmentRouter } from '../../src/modules/events/assignment-router.js';
import { listStatusHistory } from '../../src/modules/events/status-history.js';
import { createStatusHistoryRouter } from '../../src/modules/events/status-history-router.js';
import type { WorkflowRouterDependencies } from '../../src/modules/events/workflow-http.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

vi.mock('../../src/modules/events/assignment.js', () => ({
  assignCoordinator: vi.fn(), listAssignments: vi.fn(), listCoordinators: vi.fn(), listUnassignedRequests: vi.fn(),
}));
vi.mock('../../src/modules/events/status-history.js', () => ({ listStatusHistory: vi.fn() }));

const eventId = '10000000-0000-4000-8000-000000000001';
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
  // Same order the runtime uses: the assignment router precedes any GET /:id handler.
  app.use('/api/events', createAssignmentRouter(dependencies));
  app.use('/api/events', createStatusHistoryRouter(dependencies));
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
] as const;

describe('KAN-29 assignment router HTTP boundary', () => {
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

  it('validates the event ID before reaching persistence', async () => {
    const { app } = setup(coordinator);
    const response = await request(app).put('/api/events/not-a-uuid/coordinator').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
    expect(assignCoordinator).not.toHaveBeenCalled();
  });

  it('only lets coordinators assign', async () => {
    const asOrganiser = setup(organiser).app;
    expect((await request(asOrganiser).put(`/api/events/${eventId}/coordinator`)
      .send({ coordinatorId: coordinator.id })).status).toBe(403);
    expect((await request(asOrganiser).get('/api/events/unassigned')).status).toBe(403);
    expect(assignCoordinator).not.toHaveBeenCalled();
  });

  it('passes verified identity, never client-supplied identity, to the service', async () => {
    const { app, dependencies } = setup(coordinator);
    vi.mocked(assignCoordinator).mockResolvedValue({
      eventRequestId: eventId, coordinatorId: coordinator.id, assignedBy: coordinator.id,
    } as unknown as Awaited<ReturnType<typeof assignCoordinator>>);
    const response = await request(app).put(`/api/events/${eventId}/coordinator`)
      .set('X-User-Id', organiser.id).send({ coordinatorId: coordinator.id });
    expect(response.status).toBe(200);
    expect(assignCoordinator).toHaveBeenCalledExactlyOnceWith(dependencies, {
      eventRequestId: eventId, actor: coordinator, input: { coordinatorId: coordinator.id },
    });
  });

  it.each([
    ['INVALID_INPUT', 'INVALID_ASSIGNMENT_INPUT', 400],
    ['NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 404],
    ['FORBIDDEN', 'ACTION_FORBIDDEN', 403],
    ['CONFLICT', 'EVENT_NOT_ASSIGNABLE', 409],
    ['CONFLICT', 'REASSIGNMENT_NOT_AVAILABLE', 409],
    ['CONFLICT', 'ASSIGNMENT_HISTORY_CONFLICT', 409],
  ] as const)('maps a %s service error to its status', async (kind, code, status) => {
    const { app } = setup(coordinator);
    vi.mocked(assignCoordinator).mockRejectedValue(new WorkflowError(kind, code, 'Explained.'));
    const response = await request(app).put(`/api/events/${eventId}/coordinator`)
      .send({ coordinatorId: coordinator.id });
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error: { code, message: 'Explained.' } });
  });

  it('hands unexpected failures to the application error handler without details', async () => {
    const { app } = setup(coordinator);
    vi.mocked(listAssignments).mockRejectedValue(new Error('connection string postgres://secret'));
    const response = await request(app).get(`/api/events/${eventId}/assignments`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });
});

describe('event status history HTTP boundary', () => {
  it('keeps the authenticated read-only history route available', async () => {
    const { app, dependencies } = setup(organiser);
    vi.mocked(listStatusHistory).mockResolvedValue([]);
    const response = await request(app).get(`/api/events/${eventId}/history`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(listStatusHistory).toHaveBeenCalledExactlyOnceWith(dependencies, {
      eventRequestId: eventId, actor: organiser,
    });
  });

  it.each([
    { actor: null, expectedStatus: 401 },
    { actor: { id: organiser.id, role: 'ATTENDEE' as const }, expectedStatus: 403 },
  ])('refuses history access for $actor before reading data', async ({ actor, expectedStatus }) => {
    const { app } = setup(actor);
    expect((await request(app).get(`/api/events/${eventId}/history`)).status).toBe(expectedStatus);
    expect(listStatusHistory).not.toHaveBeenCalled();
  });
});
