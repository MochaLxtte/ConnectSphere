import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignCoordinator, getLeadEventDetail, listAssignments, listCoordinators,
  listLeadOversight, listUnassignedRequests,
} from '../../src/modules/events/assignment.js';
import { createAssignmentRouter } from '../../src/modules/events/assignment-router.js';
import { listStatusHistory } from '../../src/modules/events/status-history.js';
import { createStatusHistoryRouter } from '../../src/modules/events/status-history-router.js';
import type { WorkflowRouterDependencies } from '../../src/modules/events/workflow-http.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { USER_ROLES } from '../../src/modules/auth/types.js';

vi.mock('../../src/modules/events/assignment.js', () => ({
  assignCoordinator: vi.fn(), listAssignments: vi.fn(), listCoordinators: vi.fn(), listUnassignedRequests: vi.fn(),
  getLeadEventDetail: vi.fn(), listLeadOversight: vi.fn(),
}));
vi.mock('../../src/modules/events/status-history.js', () => ({ listStatusHistory: vi.fn() }));

const eventId = '10000000-0000-4000-8000-000000000001';
const coordinator: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const organiser: WorkflowActor = { id: '30000000-0000-4000-8000-000000000001', role: 'EVENT_ORGANISER' };
const lead: WorkflowActor = { id: '40000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR_LEAD' };

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

const leadRoutes = [
  ['get', '/unassigned'], ['get', '/coordinators'],
  ['get', '/oversight'], ['get', `/oversight/${eventId}`], ['put', `/${eventId}/coordinator`],
] as const;
const routes = [...leadRoutes, ['get', `/${eventId}/assignments`] as const];

describe('KAN-79 Lead allocation and oversight HTTP boundary', () => {
  it.each(routes)('%s %s requires verified authentication', async (method, path) => {
    const { app } = setup(null);
    const response = await request(app)[method](`/api/events${path}`)
      .set('X-User-Id', lead.id).set('X-User-Role', 'EVENT_COORDINATOR_LEAD').send({});
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
    const { app, dependencies } = setup(lead);
    vi.mocked(listUnassignedRequests).mockResolvedValue([]);
    vi.mocked(listCoordinators).mockResolvedValue([{ id: coordinator.id, displayName: 'Casey', email: 'c@example.test' }]);
    const unassigned = await request(app).get('/api/events/unassigned');
    expect(unassigned.status).toBe(200);
    expect(unassigned.body).toEqual({ items: [] });
    const coordinators = await request(app).get('/api/events/coordinators');
    expect(coordinators.body.items).toHaveLength(1);
    expect(listUnassignedRequests).toHaveBeenCalledExactlyOnceWith(dependencies, lead);
    expect((await request(app).get(`/api/events/${eventId}`)).body).toEqual({ detail: true });
  });

  it('validates the event ID before reaching persistence', async () => {
    const { app } = setup(lead);
    const response = await request(app).put('/api/events/not-a-uuid/coordinator').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
    expect(assignCoordinator).not.toHaveBeenCalled();
  });

  it.each(USER_ROLES.filter((role) => role !== 'EVENT_COORDINATOR_LEAD'))(
    'denies every allocation endpoint to %s even with forged Lead headers', async (role) => {
      const app = setup({ ...organiser, role }).app;
      for (const [method, path] of leadRoutes) {
        const response = await request(app)[method](`/api/events${path}`)
          .set('X-User-Role', 'EVENT_COORDINATOR_LEAD').send({ coordinatorId: coordinator.id });
        expect(response.status).toBe(403);
      }
      expect(assignCoordinator).not.toHaveBeenCalled();
      expect(listUnassignedRequests).not.toHaveBeenCalled();
      expect(listCoordinators).not.toHaveBeenCalled();
      expect(listLeadOversight).not.toHaveBeenCalled();
      expect(getLeadEventDetail).not.toHaveBeenCalled();
    },
  );

  it('serves explicit Lead overview and basic detail without calling shared detail', async () => {
    const { app, dependencies } = setup(lead);
    vi.mocked(listLeadOversight).mockResolvedValue([]);
    const detail = { id: eventId, actions: { canAssignCoordinator: true } };
    vi.mocked(getLeadEventDetail).mockResolvedValue(detail as Awaited<ReturnType<typeof getLeadEventDetail>>);
    expect((await request(app).get('/api/events/oversight')).body).toEqual({ items: [] });
    expect((await request(app).get(`/api/events/oversight/${eventId}`)).body).toEqual(detail);
    expect(listLeadOversight).toHaveBeenCalledExactlyOnceWith(dependencies, lead);
    expect(getLeadEventDetail).toHaveBeenCalledExactlyOnceWith(dependencies, { eventRequestId: eventId, actor: lead });
    expect((await request(app).get('/api/events/oversight/not-a-uuid')).status).toBe(400);
    expect(getLeadEventDetail).toHaveBeenCalledTimes(1);
  });

  it.each([lead, coordinator, organiser])('passes $role to the assignment history relationship check', async (actor) => {
    const { app, dependencies } = setup(actor);
    vi.mocked(listAssignments).mockResolvedValue([]);
    expect((await request(app).get(`/api/events/${eventId}/assignments`)).body).toEqual({ items: [] });
    expect(listAssignments).toHaveBeenCalledExactlyOnceWith(dependencies, { eventRequestId: eventId, actor });
  });

  it('passes verified identity, never client-supplied identity, to the service', async () => {
    const { app, dependencies } = setup(lead);
    vi.mocked(assignCoordinator).mockResolvedValue({
      eventRequestId: eventId, coordinatorId: coordinator.id, assignedBy: lead.id,
    } as unknown as Awaited<ReturnType<typeof assignCoordinator>>);
    const response = await request(app).put(`/api/events/${eventId}/coordinator`)
      .set('X-User-Id', organiser.id).send({ coordinatorId: coordinator.id });
    expect(response.status).toBe(200);
    expect(assignCoordinator).toHaveBeenCalledExactlyOnceWith(dependencies, {
      eventRequestId: eventId, actor: lead, input: { coordinatorId: coordinator.id },
    });
  });

  it.each([
    ['INVALID_INPUT', 'INVALID_ASSIGNMENT_INPUT', 400],
    ['NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 404],
    ['FORBIDDEN', 'ACTION_FORBIDDEN', 403],
    ['CONFLICT', 'EVENT_NOT_ASSIGNABLE', 409],
    ['CONFLICT', 'COORDINATOR_ALREADY_ASSIGNED', 409],
    ['CONFLICT', 'ASSIGNMENT_HISTORY_CONFLICT', 409],
  ] as const)('maps a %s service error to its status', async (kind, code, status) => {
    const { app } = setup(lead);
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
