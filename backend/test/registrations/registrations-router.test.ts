import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrationStateError } from '../../src/modules/registrations/registration-eligibility.js';
import {
  getDiscoverableEvent,
  listAttendees,
  listDiscoverableEvents,
  listMyRegistrations,
  registerForEvent,
  RegistrationEventNotFoundError,
  withdrawFromEvent,
  type RegistrationActor,
} from '../../src/modules/registrations/registration-service.js';
import {
  createRegistrationsRouter,
  type RegistrationsRouterDependencies,
} from '../../src/modules/registrations/router.js';

vi.mock('../../src/modules/registrations/registration-service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/registrations/registration-service.js')>();
  return {
    ...actual,
    listDiscoverableEvents: vi.fn(), getDiscoverableEvent: vi.fn(), registerForEvent: vi.fn(),
    withdrawFromEvent: vi.fn(), listMyRegistrations: vi.fn(), listAttendees: vi.fn(),
  };
});

const eventId = '10000000-0000-4000-8000-000000000001';
const attendee: RegistrationActor = { id: '20000000-0000-4000-8000-000000000001', role: 'ATTENDEE' };
const services = {
  list: vi.mocked(listDiscoverableEvents), detail: vi.mocked(getDiscoverableEvent),
  register: vi.mocked(registerForEvent), withdraw: vi.mocked(withdrawFromEvent),
  mine: vi.mocked(listMyRegistrations), attendees: vi.mocked(listAttendees),
};
const saved = {
  registrationId: '30000000-0000-4000-8000-000000000001', eventRequestId: eventId,
  status: 'REGISTERED' as const, registeredAt: '2026-09-19T04:00:00.000Z', withdrawnAt: null,
};

function setup(actor: RegistrationActor | null = attendee) {
  const logger = { error: vi.fn() };
  const dependencies = {
    pool: {
      query() { throw new Error('HTTP boundary tests must not query the database.'); },
      connect() { throw new Error('HTTP boundary tests must not open a database connection.'); },
    } as unknown as RegistrationsRouterDependencies['pool'],
    authenticate: vi.fn<RegistrationsRouterDependencies['authenticate']>().mockResolvedValue(actor),
  };
  const app = express();
  app.use(express.json());
  app.use('/api/registrations', createRegistrationsRouter(dependencies));
  const handleError: ErrorRequestHandler = (_error, _request, response, _next) => {
    logger.error('Unexpected API error.');
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  };
  app.use(handleError);
  return { app, dependencies, logger };
}

const routes = [
  ['get', '/api/registrations/events'],
  ['get', `/api/registrations/events/${eventId}`],
  ['post', `/api/registrations/events/${eventId}/register`],
  ['post', `/api/registrations/events/${eventId}/withdraw`],
  ['get', '/api/registrations/mine'],
  ['get', `/api/registrations/events/${eventId}/attendees`],
] as const;

beforeEach(() => { Object.values(services).forEach((service) => service.mockReset()); });

describe('CF-18 registrations HTTP boundary', () => {
  it.each(routes)('%s %s requires verified authentication and is never cached', async (method, path) => {
    const { app } = setup(null);
    const response = await request(app)[method](path)
      .set('X-User-Id', attendee.id).set('X-User-Role', 'ATTENDEE');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(response.headers['cache-control']).toBe('no-store');
    Object.values(services).forEach((service) => expect(service).not.toHaveBeenCalled());
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF'] as const)(
    'lets a signed-in %s browse events using the verified identity', async (role) => {
      const { app, dependencies } = setup({ ...attendee, role });
      services.list.mockResolvedValue([]);
      const response = await request(app).get('/api/registrations/events').set('X-User-Role', 'ATTENDEE');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [] });
      expect(services.list).toHaveBeenCalledExactlyOnceWith(dependencies, { ...attendee, role });
    },
  );

  it.each(['register', 'withdraw'] as const)('only lets attendees %s', async (action) => {
    for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF'] as const) {
      const { app } = setup({ ...attendee, role });
      const response = await request(app).post(`/api/registrations/events/${eventId}/${action}`)
        .set('X-User-Role', 'ATTENDEE');
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('REGISTRATION_FORBIDDEN');
    }
    expect(services[action]).not.toHaveBeenCalled();
  });

  it.each(['not-a-uuid', '10000000-0000-4000-8000-00000000000', "' OR 1=1--"])(
    'rejects the invalid event ID %s before persistence', async (id) => {
      const { app } = setup();
      const encoded = encodeURIComponent(id);
      for (const [method, suffix] of [['get', ''], ['post', '/register'], ['post', '/withdraw'], ['get', '/attendees']] as const) {
        const response = await request(app)[method](`/api/registrations/events/${encoded}${suffix}`);
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_EVENT_ID');
      }
      Object.values(services).forEach((service) => expect(service).not.toHaveBeenCalled());
    },
  );

  it('registers with the verified identity and ignores any submitted identity', async () => {
    const { app, dependencies } = setup();
    services.register.mockResolvedValue(saved);
    const response = await request(app).post(`/api/registrations/events/${eventId}/register`)
      .send({ attendeeId: 'someone-else', status: 'REGISTERED' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(saved);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(services.register).toHaveBeenCalledExactlyOnceWith(dependencies, attendee, eventId);
  });

  it('withdraws and returns the saved registration', async () => {
    const { app, dependencies } = setup();
    const withdrawn = { ...saved, status: 'WITHDRAWN' as const, withdrawnAt: '2026-09-19T05:00:00.000Z' };
    services.withdraw.mockResolvedValue(withdrawn);
    const response = await request(app).post(`/api/registrations/events/${eventId}/withdraw`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(withdrawn);
    expect(services.withdraw).toHaveBeenCalledExactlyOnceWith(dependencies, attendee, eventId);
  });

  it.each([
    ['ALREADY_REGISTERED', null], ['REGISTRATION_CLOSED', 'NOT_OPEN_YET'], ['REGISTRATION_FULL', 'FULL'],
  ] as const)('returns 409 %s with reason %s', async (code, reason) => {
    const { app } = setup();
    services.register.mockRejectedValue(new RegistrationStateError(code, 'State conflict.', reason));
    const response = await request(app).post(`/api/registrations/events/${eventId}/register`);
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: { code, message: 'State conflict.', ...(reason ? { reason } : {}) },
    });
  });

  it.each(['NOT_REGISTERED', 'WITHDRAWAL_CLOSED'] as const)('returns 409 %s when withdrawing', async (code) => {
    const { app } = setup();
    services.withdraw.mockRejectedValue(new RegistrationStateError(code, 'State conflict.'));
    const response = await request(app).post(`/api/registrations/events/${eventId}/withdraw`);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe(code);
  });

  it('returns the same 404 for missing, non-discoverable and unrelated events', async () => {
    const { app } = setup({ ...attendee, role: 'EVENT_COORDINATOR' });
    services.detail.mockRejectedValue(new RegistrationEventNotFoundError());
    services.attendees.mockRejectedValue(new RegistrationEventNotFoundError());
    const detail = await request(app).get(`/api/registrations/events/${eventId}`);
    const attendees = await request(app).get(`/api/registrations/events/${eventId}/attendees`);
    expect(detail.status).toBe(404);
    expect(attendees.status).toBe(404);
    expect(attendees.body).toEqual(detail.body);
    expect(detail.body).toEqual({ error: { code: 'EVENT_NOT_FOUND', message: 'The event was not found.' } });
  });

  it('returns the attendee list and the caller\'s registrations from the services', async () => {
    const organiser: RegistrationActor = { ...attendee, role: 'EVENT_ORGANISER' };
    const { app, dependencies } = setup(organiser);
    const list = {
      eventRequestId: eventId, counts: { registered: 0, withdrawn: 0, capacity: null, spotsLeft: null }, items: [],
    };
    services.attendees.mockResolvedValue(list);
    services.mine.mockResolvedValue([]);
    const attendees = await request(app).get(`/api/registrations/events/${eventId}/attendees`);
    const mine = await request(app).get('/api/registrations/mine');
    expect(attendees.status).toBe(200);
    expect(attendees.body).toEqual(list);
    expect(mine.body).toEqual({ items: [] });
    expect(services.attendees).toHaveBeenCalledExactlyOnceWith(dependencies, organiser, eventId);
    expect(services.mine).toHaveBeenCalledExactlyOnceWith(dependencies, organiser);
  });

  it.each(['authentication', 'persistence'] as const)('conceals unexpected %s failures', async (source) => {
    const { app, dependencies, logger } = setup();
    const failure = new Error('postgresql://private-user:private-password@private-host/db');
    if (source === 'authentication') dependencies.authenticate.mockRejectedValue(failure);
    else services.register.mockRejectedValue(failure);
    const response = await request(app).post(`/api/registrations/events/${eventId}/register`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
