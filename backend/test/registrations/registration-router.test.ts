import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { getAttendeeEvent, listAttendeeEvents, listOwnRegistrations, registerForEvent } from '../../src/modules/registrations/registration-service.js';

vi.mock('../../src/modules/registrations/registration-service.js', () => ({
  getAttendeeEvent: vi.fn(), listAttendeeEvents: vi.fn(), listOwnRegistrations: vi.fn(), registerForEvent: vi.fn(),
}));
const actor: WorkflowActor = { id: '14000000-0000-4000-8000-000000000001', role: 'ATTENDEE' };
const eventId = '14000000-0000-4000-8000-000000000002';
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const workspace = { pool: {} as Pool, authenticate };
const app = createApp({ database: { query: vi.fn() }, workspace, logger: { error: vi.fn() } });
const everyRoute = () => [request(app).get('/api/attendee/events'), request(app).get('/api/attendee/registrations'),
  request(app).get(`/api/attendee/events/${eventId}`), request(app).post(`/api/attendee/events/${eventId}/register`).send({})];
beforeEach(() => { vi.resetAllMocks(); authenticate.mockResolvedValue(actor); });

describe('KAN-14 attendee registration HTTP boundary', () => {
  it('KAN-14-AC101 requires authentication on every route', async () => {
    authenticate.mockResolvedValue(null);
    for (const attempt of everyRoute()) {
      const response = await attempt;
      expect(response.status).toBe(401);
      expect(response.headers['cache-control']).toBe('no-store');
    }
    expect(registerForEvent).not.toHaveBeenCalled();
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF'] as const)(
    'KAN-14-AC101 refuses %s and forged role headers before any service is called', async role => {
      authenticate.mockResolvedValue({ ...actor, role });
      for (const attempt of everyRoute()) expect((await attempt.set('X-Role', 'ATTENDEE')).status).toBe(403);
      for (const service of [getAttendeeEvent, listAttendeeEvents, listOwnRegistrations, registerForEvent]) expect(service).not.toHaveBeenCalled();
    });
  it('rejects a malformed event id', async () => {
    expect((await request(app).get('/api/attendee/events/bad')).body.error.code).toBe('INVALID_EVENT_ID');
    expect((await request(app).post('/api/attendee/events/bad/register').send({})).status).toBe(400);
  });
  it('KAN-14-AC1 lists events, own registrations and one event for the signed-in attendee only', async () => {
    vi.mocked(listAttendeeEvents).mockResolvedValue([{ id: eventId }] as never);
    vi.mocked(listOwnRegistrations).mockResolvedValue([{ id: 'r1' }] as never);
    vi.mocked(getAttendeeEvent).mockResolvedValue({ event: { id: eventId } } as never);
    expect((await request(app).get('/api/attendee/events')).body).toEqual({ items: [{ id: eventId }] });
    expect((await request(app).get('/api/attendee/registrations')).body).toEqual({ items: [{ id: 'r1' }] });
    expect((await request(app).get(`/api/attendee/events/${eventId}`)).body).toEqual({ event: { id: eventId } });
    expect(listAttendeeEvents).toHaveBeenCalledWith(workspace, { actor });
    expect(getAttendeeEvent).toHaveBeenCalledWith(workspace, { actor, eventId });
  });
  it('KAN-14-AC3 registers with 201 and forwards only the actor, the route id and the body', async () => {
    vi.mocked(registerForEvent).mockResolvedValue({ changed: true } as never);
    const response = await request(app).post(`/api/attendee/events/${eventId}/register`).set('X-User-Id', 'another').send({ attendeeId: 'someone-else' });
    expect(response.status).toBe(201);
    expect(registerForEvent).toHaveBeenCalledWith(workspace, { actor, eventId, input: { attendeeId: 'someone-else' } });
  });
  it.each([
    ['NOT_FOUND', 'EVENT_NOT_FOUND', 404], ['CONFLICT', 'REGISTRATION_FULL', 409], ['CONFLICT', 'REGISTRATION_ALREADY_REGISTERED', 409],
    ['INVALID_INPUT', 'INVALID_INPUT', 400],
  ] as const)('maps %s %s from the service to HTTP', async (kind, code, status) => {
    vi.mocked(registerForEvent).mockRejectedValue(new WorkflowError(kind, code, 'Refused.'));
    const response = await request(app).post(`/api/attendee/events/${eventId}/register`).send({});
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
  });
});
