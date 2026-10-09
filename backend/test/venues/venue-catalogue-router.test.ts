import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { createVenueCatalogueRouter } from '../../src/modules/venues/venue-catalogue-router.js';
import {
  getCatalogueVenue, listCatalogueVenues, updateCatalogueVenue,
} from '../../src/modules/venues/venue-catalogue-service.js';

vi.mock('../../src/modules/venues/venue-catalogue-service.js', () => ({
  getCatalogueVenue: vi.fn(), listCatalogueVenues: vi.fn(), updateCatalogueVenue: vi.fn(),
}));

const venueId = '12345678-1234-1234-1234-123456789abc';
const actor: WorkflowActor = { id: 'staff-1', role: 'VENUE_STAFF' };
const pool = {} as Pool;
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const dependencies = { pool, authenticate };
const app = express();
app.use(express.json());
app.use('/api/venues', createVenueCatalogueRouter(dependencies));

const venue = { id: venueId, name: 'Hall A', capacity: 100 };
const attempts = () => [
  request(app).get('/api/venues/catalogue'),
  request(app).get(`/api/venues/catalogue/${venueId}`),
  request(app).patch(`/api/venues/catalogue/${venueId}`).send({ capacity: 90 }),
];

beforeEach(() => {
  vi.clearAllMocks();
  authenticate.mockResolvedValue(actor);
});

describe('KAN-50 venue catalogue HTTP boundary: access (AC14)', () => {
  it('requires authentication for list, view and update without calling the service', async () => {
    authenticate.mockResolvedValue(null);
    for (const attempt of attempts()) {
      const response = await attempt;
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.headers['cache-control']).toBe('no-store');
    }
    expect(listCatalogueVenues).not.toHaveBeenCalled();
    expect(getCatalogueVenue).not.toHaveBeenCalled();
    expect(updateCatalogueVenue).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'prevents %s from reading or changing the catalogue even with identity supplied in headers', async (role) => {
      authenticate.mockResolvedValue({ ...actor, role });
      for (const attempt of attempts()) {
        const response = await attempt.set('X-Role', 'VENUE_STAFF').set('X-User-Id', 'staff-1');
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('ACTION_FORBIDDEN');
      }
      expect(listCatalogueVenues).not.toHaveBeenCalled();
      expect(getCatalogueVenue).not.toHaveBeenCalled();
      expect(updateCatalogueVenue).not.toHaveBeenCalled();
    },
  );

  it('rejects a malformed venue id before a service call', async () => {
    for (const id of ['not-a-uuid', '1234', "' OR 1=1--"]) {
      const encoded = encodeURIComponent(id);
      expect((await request(app).get(`/api/venues/catalogue/${encoded}`)).status).toBe(400);
      const patch = await request(app).patch(`/api/venues/catalogue/${encoded}`).send({ capacity: 5 });
      expect(patch.status).toBe(400);
      expect(patch.body.error.code).toBe('INVALID_VENUE_ID');
    }
    expect(getCatalogueVenue).not.toHaveBeenCalled();
    expect(updateCatalogueVenue).not.toHaveBeenCalled();
  });
});

describe('KAN-50 venue catalogue HTTP boundary: behaviour (AC1, AC2, AC9, AC12)', () => {
  it('lists the catalogue for the verified Venue Staff actor', async () => {
    vi.mocked(listCatalogueVenues).mockResolvedValue([venue] as never);
    const response = await request(app).get('/api/venues/catalogue');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [venue] });
    expect(listCatalogueVenues).toHaveBeenCalledWith(dependencies, { actor });
  });

  it('returns an empty list rather than an error for an empty catalogue', async () => {
    vi.mocked(listCatalogueVenues).mockResolvedValue([]);
    const response = await request(app).get('/api/venues/catalogue');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });

  it('returns one venue', async () => {
    vi.mocked(getCatalogueVenue).mockResolvedValue(venue as never);
    const response = await request(app).get(`/api/venues/catalogue/${venueId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ venue });
    expect(getCatalogueVenue).toHaveBeenCalledWith(dependencies, { actor, venueId });
  });

  it('passes the verified actor, the venue id from the path and the raw body to the update service', async () => {
    vi.mocked(updateCatalogueVenue).mockResolvedValue({ ...venue, capacity: 90 } as never);
    const response = await request(app).patch(`/api/venues/catalogue/${venueId}`)
      .send({ capacity: 90, venueId: 'ignored-by-service-validation' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ venue: { ...venue, capacity: 90 } });
    expect(updateCatalogueVenue).toHaveBeenCalledWith(
      dependencies, { actor, venueId, input: { capacity: 90, venueId: 'ignored-by-service-validation' } },
    );
  });

  it('never takes the acting user from the request body or headers', async () => {
    vi.mocked(updateCatalogueVenue).mockResolvedValue(venue as never);
    await request(app).patch(`/api/venues/catalogue/${venueId}`)
      .set('X-User-Id', 'someone-else').send({ capacity: 90, actor: { id: 'someone-else', role: 'VENUE_STAFF' } });
    expect(vi.mocked(updateCatalogueVenue).mock.calls[0]![1].actor).toEqual(actor);
  });
});

describe('KAN-50 venue catalogue HTTP boundary: service errors', () => {
  it.each([
    ['INVALID_INPUT', 'INVALID_VENUE_CATALOGUE_INPUT', 400],
    ['NOT_FOUND', 'VENUE_NOT_FOUND', 404],
    ['CONFLICT', 'VENUE_INACTIVE', 409],
    ['FORBIDDEN', 'ACTION_FORBIDDEN', 403],
  ] as const)('maps a %s service error to HTTP %d', async (kind, code, status) => {
    vi.mocked(updateCatalogueVenue).mockRejectedValue(new WorkflowError(kind, code, 'message'));
    const response = await request(app).patch(`/api/venues/catalogue/${venueId}`).send({ capacity: 5 });
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
  });

  it('returns the generic internal error, without the cause, for an unexpected failure', async () => {
    const logger = { error: vi.fn() };
    const wired = createApp({ database: { query: vi.fn() }, workspace: dependencies, logger });
    vi.mocked(getCatalogueVenue).mockRejectedValue(new Error('connection reset'));
    const response = await request(wired).get(`/api/venues/catalogue/${venueId}`);
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.text).not.toContain('connection reset');
    expect(logger.error).toHaveBeenCalledOnce();
  });
});

describe('KAN-50 app wiring', () => {
  it('mounts the catalogue under /api/venues when the workspace dependencies are supplied', async () => {
    authenticate.mockResolvedValue(null);
    const wired = createApp({ database: { query: vi.fn() }, workspace: dependencies, logger: { error: vi.fn() } });
    expect((await request(wired).get('/api/venues/catalogue')).status).toBe(401);
  });

  it('leaves the catalogue unavailable (404) when the workspace dependencies are not supplied', async () => {
    const bare = createApp({ database: { query: vi.fn() }, logger: { error: vi.fn() } });
    expect((await request(bare).get('/api/venues/catalogue')).status).toBe(404);
  });
});
