import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VenueRuleError, venueNotFound, eventNotFound } from '../../src/modules/venues/errors.js';
import type { VenueActor, VenueRecord, VenuesRouterDependencies } from '../../src/modules/venues/types.js';
import * as service from '../../src/modules/venues/venue-service.js';
import { createVenuesRouter } from '../../src/modules/venues/venues-router.js';

vi.mock('../../src/modules/venues/venue-service.js', () => ({
  listVenues: vi.fn(), getVenue: vi.fn(), createVenue: vi.fn(), updateVenue: vi.fn(),
  getVenueAvailability: vi.fn(), getVenueSuitability: vi.fn(),
  createUnavailability: vi.fn(), deleteUnavailability: vi.fn(),
}));

const venueId = '20000000-0000-4000-8000-000000000001';
const blockId = '30000000-0000-4000-8000-000000000001';
const eventRequestId = '10000000-0000-4000-8000-000000000001';
const staff: VenueActor = { id: '40000000-0000-4000-8000-000000000001', role: 'VENUE_STAFF' };
const organiser: VenueActor = { id: '40000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const attendee: VenueActor = { id: '40000000-0000-4000-8000-000000000003', role: 'ATTENDEE' };
const venue: VenueRecord = {
  id: venueId, name: 'Hall A', description: null, location: 'Block 1', capacity: 100, layouts: [],
  facilities: ['Projector'], accessibilityFeatures: [], wheelchairAccessible: true,
  opensAt: '08:00', closesAt: '22:00', isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
};
const mocked = vi.mocked(service);

function setup(actor: VenueActor | null) {
  const pool = {
    query() { throw new Error('HTTP boundary tests must not query the database.'); },
    connect() { throw new Error('HTTP boundary tests must not open a database connection.'); },
  } as unknown as VenuesRouterDependencies['pool'];
  const authenticate = vi.fn<VenuesRouterDependencies['authenticate']>().mockResolvedValue(actor);
  const app = express();
  app.use(express.json());
  app.use('/api/venues', createVenuesRouter({ pool, authenticate }));
  const handleError: ErrorRequestHandler = (_error, _request, response, _next) => {
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  };
  app.use(handleError);
  return { app, pool, authenticate };
}

beforeEach(() => { vi.resetAllMocks(); });

describe('CF-08/CF-10 catalogue HTTP boundary', () => {
  it('lists venues for any signed-in role with parsed filters and no-store', async () => {
    const { app, pool } = setup(attendee);
    mocked.listVenues.mockResolvedValue([venue]);
    const response = await request(app).get('/api/venues?q=hall&minCapacity=50&facilities=Projector,Stage')
      .set('X-User-Role', 'VENUE_STAFF');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [venue] });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(mocked.listVenues).toHaveBeenCalledExactlyOnceWith(pool, attendee, expect.objectContaining({
      q: 'hall', minCapacity: 50, facilities: ['Projector', 'Stage'],
    }));
  });

  it.each([
    ['get', '/api/venues'], ['post', '/api/venues'], ['get', `/api/venues/${venueId}`],
    ['patch', `/api/venues/${venueId}`], ['get', `/api/venues/${venueId}/availability`],
    ['get', `/api/venues/${venueId}/suitability`], ['post', `/api/venues/${venueId}/unavailability`],
    ['delete', `/api/venues/${venueId}/unavailability/${blockId}`],
  ] as const)('requires authentication for %s %s', async (method, path) => {
    const { app } = setup(null);
    const response = await request(app)[method](path).set('X-User-Id', staff.id);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each(['minCapacity=abc', 'sort=name', 'q=a&q=b', 'availableFrom=2026-10-01T00:00:00Z'])(
    'rejects the filter %s before reading venues', async (query) => {
      const { app } = setup(organiser);
      const response = await request(app).get(`/api/venues?${query}`);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_VENUE_FILTER');
      expect(mocked.listVenues).not.toHaveBeenCalled();
    },
  );

  it('returns a venue, masks a hidden one as 404 and validates the ID', async () => {
    const { app } = setup(organiser);
    mocked.getVenue.mockResolvedValueOnce(venue).mockRejectedValueOnce(venueNotFound());
    expect((await request(app).get(`/api/venues/${venueId}`)).body).toEqual(venue);
    const missing = await request(app).get(`/api/venues/${venueId}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('VENUE_NOT_FOUND');
    const invalid = await request(app).get('/api/venues/not-a-uuid');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_VENUE_ID');
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'forbids %s from every management route', async (role) => {
      const { app } = setup({ ...organiser, role });
      const responses = await Promise.all([
        request(app).post('/api/venues').send({ name: 'Hall', capacity: 5 }),
        request(app).patch(`/api/venues/${venueId}`).send({ capacity: 5 }),
        request(app).post(`/api/venues/${venueId}/unavailability`)
          .send({ startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-01T01:00:00Z' }),
        request(app).delete(`/api/venues/${venueId}/unavailability/${blockId}`),
      ]);
      for (const response of responses) {
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('VENUE_FORBIDDEN');
      }
      expect(mocked.createVenue).not.toHaveBeenCalled();
      expect(mocked.updateVenue).not.toHaveBeenCalled();
      expect(mocked.createUnavailability).not.toHaveBeenCalled();
      expect(mocked.deleteUnavailability).not.toHaveBeenCalled();
    },
  );

  it('creates and updates a venue for venue staff', async () => {
    const { app, pool } = setup(staff);
    mocked.createVenue.mockResolvedValue(venue);
    mocked.updateVenue.mockResolvedValue({ ...venue, capacity: 150 });
    const created = await request(app).post('/api/venues').send({ name: ' Hall A ', capacity: 100 });
    expect(created.status).toBe(201);
    expect(mocked.createVenue).toHaveBeenCalledExactlyOnceWith(pool, expect.objectContaining({ name: 'Hall A', capacity: 100, isActive: true }));
    const updated = await request(app).patch(`/api/venues/${venueId}`).send({ capacity: 150 });
    expect(updated.status).toBe(200);
    expect(updated.body.capacity).toBe(150);
    expect(mocked.updateVenue).toHaveBeenCalledExactlyOnceWith(pool, staff, venueId, { capacity: 150 });
  });

  it('maps invalid bodies to 400 and a duplicate name to 409', async () => {
    const { app } = setup(staff);
    const invalid = await request(app).post('/api/venues').send({ name: 'Hall', capacity: 0 });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_VENUE_INPUT');
    mocked.createVenue.mockRejectedValue(new VenueRuleError('CONFLICT', 'VENUE_NAME_TAKEN', 'Taken.'));
    const duplicate = await request(app).post('/api/venues').send({ name: 'Hall', capacity: 10 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({ error: { code: 'VENUE_NAME_TAKEN', message: 'Taken.' } });
  });

  it('does not leak unexpected failures', async () => {
    const { app } = setup(staff);
    mocked.listVenues.mockRejectedValue(new Error('connection string postgres://secret'));
    const response = await request(app).get('/api/venues');
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });
});

describe('CF-09 availability HTTP boundary', () => {
  const range = 'from=2026-10-01T00:00:00Z&to=2026-10-08T00:00:00Z';

  it('returns the calendar for a valid range', async () => {
    const { app, pool } = setup(organiser);
    const calendar = {
      venueId, from: '2026-10-01T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z', timezone: 'Asia/Singapore' as const,
      operatingHours: { opensAt: '08:00', closesAt: '22:00' },
      busy: [{ kind: 'BOOKING' as const, startsAt: '2026-10-02T01:00:00.000Z', endsAt: '2026-10-02T03:00:00.000Z' }],
    };
    mocked.getVenueAvailability.mockResolvedValue(calendar);
    const response = await request(app).get(`/api/venues/${venueId}/availability?${range}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(calendar);
    expect(mocked.getVenueAvailability).toHaveBeenCalledExactlyOnceWith(
      pool, organiser, venueId, { from: calendar.from, to: calendar.to },
    );
  });

  it.each(['', 'from=2026-10-01T00:00:00Z', 'from=2026-01-01T00:00:00Z&to=2026-06-01T00:00:00Z'])(
    'rejects the range "%s"', async (query) => {
      const { app } = setup(organiser);
      const response = await request(app).get(`/api/venues/${venueId}/availability?${query}`);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_AVAILABILITY_RANGE');
      expect(mocked.getVenueAvailability).not.toHaveBeenCalled();
    },
  );

  it('lets venue staff block and unblock a period, surfacing a booking clash as 409', async () => {
    const { app, pool } = setup(staff);
    const body = { startsAt: '2026-10-01T01:00:00Z', endsAt: '2026-10-01T03:00:00Z', reason: 'Maintenance' };
    const saved = { id: blockId, venueId, startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T03:00:00.000Z', reason: 'Maintenance' };
    mocked.createUnavailability.mockResolvedValueOnce(saved).mockRejectedValueOnce(
      new VenueRuleError('CONFLICT', 'VENUE_BLOCK_CONFLICT', 'Overlaps.', { conflicts: [{ startsAt: saved.startsAt, endsAt: saved.endsAt }] }),
    );
    const created = await request(app).post(`/api/venues/${venueId}/unavailability`).send(body);
    expect(created.status).toBe(201);
    expect(created.body).toEqual(saved);
    const clash = await request(app).post(`/api/venues/${venueId}/unavailability`).send(body);
    expect(clash.status).toBe(409);
    expect(clash.body.error).toEqual({
      code: 'VENUE_BLOCK_CONFLICT', message: 'Overlaps.',
      conflicts: [{ startsAt: saved.startsAt, endsAt: saved.endsAt }],
    });

    mocked.deleteUnavailability.mockResolvedValue();
    const deleted = await request(app).delete(`/api/venues/${venueId}/unavailability/${blockId}`);
    expect(deleted.status).toBe(200);
    expect(mocked.deleteUnavailability).toHaveBeenCalledExactlyOnceWith(pool, venueId, blockId);
    const invalid = await request(app).delete(`/api/venues/${venueId}/unavailability/nope`);
    expect(invalid.status).toBe(400);
  });
});

describe('CF-11 suitability HTTP boundary', () => {
  it('returns the assessment for an organiser and masks an unrelated event as 404', async () => {
    const { app, pool } = setup(organiser);
    const result = { venueId, eventRequestId, suitable: false, checks: [{ code: 'CAPACITY' as const, passed: false, message: 'Too small.' }] };
    mocked.getVenueSuitability.mockResolvedValueOnce(result).mockRejectedValueOnce(eventNotFound());
    const ok = await request(app).get(`/api/venues/${venueId}/suitability?eventRequestId=${eventRequestId}`);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual(result);
    expect(mocked.getVenueSuitability).toHaveBeenCalledWith(pool, organiser, venueId, eventRequestId);
    const hidden = await request(app).get(`/api/venues/${venueId}/suitability?eventRequestId=${eventRequestId}`);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
  });

  it('rejects other roles and an invalid event ID', async () => {
    const forbidden = await request(setup(attendee).app)
      .get(`/api/venues/${venueId}/suitability?eventRequestId=${eventRequestId}`);
    expect(forbidden.status).toBe(403);
    const invalid = await request(setup(organiser).app).get(`/api/venues/${venueId}/suitability?eventRequestId=x`);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
    expect(mocked.getVenueSuitability).not.toHaveBeenCalled();
  });
});
