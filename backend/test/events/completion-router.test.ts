import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { completeEvent, readEventCompletion } from '../../src/modules/events/completion.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

vi.mock('../../src/modules/events/completion.js', () => ({ completeEvent: vi.fn(), readEventCompletion: vi.fn() }));
const actor: WorkflowActor = { id: '10000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const eventId = '10000000-0000-4000-8000-000000000002';
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const workspace = { pool: {} as Pool, authenticate };
const app = createApp({ database: { query: vi.fn() }, workspace, logger: { error: vi.fn() } });
beforeEach(() => { vi.resetAllMocks(); authenticate.mockResolvedValue(actor); });

describe('KAN-10 completion HTTP boundary', () => {
  it('requires authentication for the action and the read', async () => {
    authenticate.mockResolvedValue(null);
    for (const attempt of [request(app).post(`/api/events/${eventId}/complete`), request(app).get(`/api/events/${eventId}/completion`)]) {
      const response = await attempt;
      expect(response.status).toBe(401);
      expect(response.headers['cache-control']).toBe('no-store');
    }
    expect(completeEvent).not.toHaveBeenCalled();
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'KAN-10-AC1 refuses %s and forged role headers before the service is called', async role => {
      authenticate.mockResolvedValue({ ...actor, role });
      const response = await request(app).post(`/api/events/${eventId}/complete`).set('X-Role', 'EVENT_COORDINATOR');
      expect(response.status).toBe(403);
      expect(completeEvent).not.toHaveBeenCalled();
    });
  it('rejects a malformed event id', async () => {
    expect((await request(app).post('/api/events/bad/complete')).body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
    expect((await request(app).get('/api/events/bad/completion')).status).toBe(400);
  });
  it('forwards only the authenticated actor and the route id, and returns the completion', async () => {
    vi.mocked(completeEvent).mockResolvedValue({ eventRequestId: eventId, status: 'COMPLETED' } as never);
    const response = await request(app).post(`/api/events/${eventId}/complete`).set('X-User-Id', 'someone').send({ coordinatorId: 'x' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ completion: { eventRequestId: eventId, status: 'COMPLETED' } });
    expect(completeEvent).toHaveBeenCalledWith(workspace.pool, { eventRequestId: eventId, actor });
  });
  it.each([
    ['NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 404], ['CONFLICT', 'EVENT_NOT_ENDED', 409], ['CONFLICT', 'EVENT_ALREADY_COMPLETED', 409],
  ] as const)('maps %s %s from the service to HTTP', async (kind, code, status) => {
    vi.mocked(completeEvent).mockRejectedValue(new WorkflowError(kind, code, 'Refused.'));
    const response = await request(app).post(`/api/events/${eventId}/complete`);
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
  });
  it('lets an organiser or the coordinator read the completion, and passes the actor to the service', async () => {
    vi.mocked(readEventCompletion).mockResolvedValue(null);
    for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR'] as const) {
      authenticate.mockResolvedValue({ ...actor, role });
      const response = await request(app).get(`/api/events/${eventId}/completion`);
      expect(response.body).toEqual({ completion: null });
    }
    expect(readEventCompletion).toHaveBeenCalledTimes(2);
    authenticate.mockResolvedValue({ ...actor, role: 'ATTENDEE' });
    expect((await request(app).get(`/api/events/${eventId}/completion`)).status).toBe(403);
  });
});
