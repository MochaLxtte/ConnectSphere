import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRegistrationRouter } from '../../src/modules/registrations/router.js';
import { getRegistrationRoster, listOwnRegistrations, withdrawRegistration } from '../../src/modules/registrations/service.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

vi.mock('../../src/modules/registrations/service.js', () => ({
  listOwnRegistrations: vi.fn(), getRegistrationRoster: vi.fn(), withdrawRegistration: vi.fn(),
}));
const id = '20000000-0000-4000-8000-000000000017';
const attendee: WorkflowActor = { id: 'a1', role: 'ATTENDEE' };
const organiser: WorkflowActor = { id: 'o1', role: 'EVENT_ORGANISER' };
function app(actor: WorkflowActor | null) {
  const server = express(); server.use(express.json());
  const pool = {} as never;
  server.use('/api', createRegistrationRouter({ pool, authenticate: async () => actor }));
  return server;
}
beforeEach(() => vi.resetAllMocks());
describe('KAN-17/67 registration HTTP authorization and parameter handling', () => {
  it('routes the signed-in attendee own list to the service and sends no-store', async () => {
    vi.mocked(listOwnRegistrations).mockResolvedValue({ items: [] });
    const res = await request(app(attendee)).get('/api/registrations/mine');
    expect(res.status).toBe(200); expect(res.body).toEqual({ items: [] }); expect(res.headers['cache-control']).toBe('no-store');
    expect(listOwnRegistrations).toHaveBeenCalledWith(expect.anything(), attendee);
  });
  it('sends confirmed withdrawal body, verified actor and valid ID', async () => {
    vi.mocked(withdrawRegistration).mockResolvedValue({ changed: false, registration: {} } as never);
    const res = await request(app(attendee)).post(`/api/registrations/${id}/withdraw`).send({ confirm: true });
    expect(res.status).toBe(200); expect(withdrawRegistration).toHaveBeenCalledWith(expect.anything(), attendee, id, { confirm: true });
  });
  it('sends a manager roster read to the authorized service', async () => {
    vi.mocked(getRegistrationRoster).mockResolvedValue({ eventId: id, eventName: null, activeCount: 0, items: [] });
    expect((await request(app(organiser)).get(`/api/events/${id}/registrations`)).body.activeCount).toBe(0);
    expect(getRegistrationRoster).toHaveBeenCalledWith(expect.anything(), organiser, id);
  });
  it('rejects unauthenticated, wrong-role and invalid-UUID requests at the boundary', async () => {
    expect((await request(app(null)).get('/api/registrations/mine')).status).toBe(401);
    expect((await request(app(organiser)).get('/api/registrations/mine')).status).toBe(403);
    expect((await request(app(attendee)).get(`/api/events/${id}/registrations`)).status).toBe(403);
    expect((await request(app(attendee)).post('/api/registrations/nope/withdraw').send({ confirm: true })).status).toBe(400);
  });
  it('maps an inaccessible roster to a 404 without exposing data', async () => {
    vi.mocked(getRegistrationRoster).mockRejectedValue(new WorkflowError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'Not found.'));
    const res = await request(app(organiser)).get(`/api/events/${id}/registrations`);
    expect(res.status).toBe(404); expect(res.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
  });
});
