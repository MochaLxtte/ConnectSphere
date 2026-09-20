import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as service from '../../src/modules/venues/booking-service.js';
import { bookingNotFound, eventNotFound, VenueRuleError } from '../../src/modules/venues/errors.js';
import type {
  VenueActor, VenueBookingRecord, VenuesRouterDependencies,
} from '../../src/modules/venues/types.js';
import { createVenueBookingsRouter } from '../../src/modules/venues/venue-bookings-router.js';

vi.mock('../../src/modules/venues/booking-service.js', () => ({
  requestVenueBooking: vi.fn(), listEventBookings: vi.fn(), listBookingQueue: vi.fn(),
  cancelVenueBooking: vi.fn(), decideVenueBooking: vi.fn(),
}));

const bookingId = '50000000-0000-4000-8000-000000000001';
const venueId = '20000000-0000-4000-8000-000000000001';
const eventRequestId = '10000000-0000-4000-8000-000000000001';
const staff: VenueActor = { id: '40000000-0000-4000-8000-000000000001', role: 'VENUE_STAFF' };
const organiser: VenueActor = { id: '40000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const coordinator: VenueActor = { id: '40000000-0000-4000-8000-000000000004', role: 'EVENT_COORDINATOR' };
const booking: VenueBookingRecord = {
  id: bookingId, eventRequestId, venueId, venueName: 'Hall A', requestedBy: organiser.id, status: 'PENDING',
  startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T03:00:00.000Z', layout: null, notes: null,
  decidedBy: null, decidedAt: null, decisionReason: null,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
};
const mocked = vi.mocked(service);

function setup(actor: VenueActor | null) {
  const pool = {
    query() { throw new Error('HTTP boundary tests must not query the database.'); },
    connect() { throw new Error('HTTP boundary tests must not open a database connection.'); },
  } as unknown as VenuesRouterDependencies['pool'];
  const app = express();
  app.use(express.json());
  app.use('/api/venue-bookings', createVenueBookingsRouter({ pool, authenticate: async () => actor }));
  const handleError: ErrorRequestHandler = (_error, _request, response, _next) => {
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  };
  app.use(handleError);
  return { app, pool };
}

beforeEach(() => { vi.resetAllMocks(); });

describe('CF-12 booking request HTTP boundary', () => {
  it.each([
    ['get', '/api/venue-bookings'], ['post', '/api/venue-bookings'],
    ['post', `/api/venue-bookings/${bookingId}/cancel`], ['post', `/api/venue-bookings/${bookingId}/decision`],
  ] as const)('requires authentication for %s %s', async (method, path) => {
    const response = await request(setup(null).app)[method](path);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each([organiser, coordinator])('records a request for $role using verified identity only', async (actor) => {
    const { app, pool } = setup(actor);
    const saved = { ...booking, suitability: { suitable: false, checks: [] }, warnings: [{ code: 'CAPACITY' as const, passed: false, message: 'Too small.' }] };
    mocked.requestVenueBooking.mockResolvedValue(saved);
    const response = await request(app).post('/api/venue-bookings')
      .set('X-User-Id', staff.id).send({ eventRequestId, venueId, notes: ' Setup early ' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(saved);
    expect(mocked.requestVenueBooking).toHaveBeenCalledExactlyOnceWith(pool, actor, {
      eventRequestId, venueId, startsAt: null, endsAt: null, layout: null, notes: 'Setup early',
    });
  });

  it.each(['VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)('forbids %s from requesting or cancelling', async (role) => {
    const { app } = setup({ ...staff, role });
    const requested = await request(app).post('/api/venue-bookings').send({ eventRequestId, venueId });
    const cancelled = await request(app).post(`/api/venue-bookings/${bookingId}/cancel`);
    expect(requested.status).toBe(403);
    expect(cancelled.status).toBe(403);
    expect(requested.body.error.code).toBe('VENUE_BOOKING_FORBIDDEN');
    expect(mocked.requestVenueBooking).not.toHaveBeenCalled();
    expect(mocked.cancelVenueBooking).not.toHaveBeenCalled();
  });

  it('rejects client-supplied identity or status in the body', async () => {
    const { app } = setup(organiser);
    const response = await request(app).post('/api/venue-bookings')
      .send({ eventRequestId, venueId, requestedBy: staff.id, status: 'APPROVED' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_VENUE_BOOKING_INPUT');
    expect(mocked.requestVenueBooking).not.toHaveBeenCalled();
  });

  it.each([
    [eventNotFound(), 404, 'EVENT_REQUEST_NOT_FOUND'],
    [new VenueRuleError('CONFLICT', 'EVENT_NOT_BOOKABLE', 'Not approved.'), 409, 'EVENT_NOT_BOOKABLE'],
    [new VenueRuleError('CONFLICT', 'VENUE_BOOKING_DUPLICATE', 'Duplicate.'), 409, 'VENUE_BOOKING_DUPLICATE'],
    [new VenueRuleError('INVALID', 'INVALID_VENUE_BOOKING_INPUT', 'Layout.'), 400, 'INVALID_VENUE_BOOKING_INPUT'],
  ] as const)('maps a service rule to its status', async (error, status, code) => {
    mocked.requestVenueBooking.mockRejectedValue(error);
    const response = await request(setup(organiser).app).post('/api/venue-bookings').send({ eventRequestId, venueId });
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
  });

  it('lists one event\'s bookings for organisers and the status queue for venue staff', async () => {
    mocked.listEventBookings.mockResolvedValue([booking]);
    mocked.listBookingQueue.mockResolvedValue([]);
    const own = setup(organiser);
    const listed = await request(own.app).get(`/api/venue-bookings?eventRequestId=${eventRequestId}`);
    expect(listed.body).toEqual({ items: [booking] });
    expect(mocked.listEventBookings).toHaveBeenCalledExactlyOnceWith(own.pool, organiser, eventRequestId);
    expect((await request(own.app).get('/api/venue-bookings?status=PENDING')).status).toBe(400);

    const desk = setup(staff);
    expect((await request(desk.app).get('/api/venue-bookings')).status).toBe(200);
    expect(mocked.listBookingQueue).toHaveBeenCalledExactlyOnceWith(desk.pool, 'PENDING');
    const invalid = await request(desk.app).get('/api/venue-bookings?status=DONE');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_VENUE_BOOKING_QUERY');
    expect((await request(setup({ ...staff, role: 'ATTENDEE' }).app).get('/api/venue-bookings')).status).toBe(403);
  });

  it('cancels for the requester and masks other people\'s bookings', async () => {
    const { app, pool } = setup(organiser);
    mocked.cancelVenueBooking.mockResolvedValueOnce({ ...booking, status: 'CANCELLED' }).mockRejectedValueOnce(bookingNotFound());
    const cancelled = await request(app).post(`/api/venue-bookings/${bookingId}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(mocked.cancelVenueBooking).toHaveBeenCalledWith(pool, organiser, bookingId);
    expect((await request(app).post(`/api/venue-bookings/${bookingId}/cancel`)).status).toBe(404);
    expect((await request(app).post('/api/venue-bookings/nope/cancel')).body.error.code).toBe('INVALID_VENUE_BOOKING_ID');
  });
});

describe('CF-13/CF-14 decision HTTP boundary', () => {
  it('records a decision for venue staff', async () => {
    const { app, pool } = setup(staff);
    mocked.decideVenueBooking.mockResolvedValue({ ...booking, status: 'APPROVED', decidedBy: staff.id });
    const response = await request(app).post(`/api/venue-bookings/${bookingId}/decision`)
      .send({ decision: 'APPROVED', reason: '  ' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('APPROVED');
    expect(mocked.decideVenueBooking).toHaveBeenCalledExactlyOnceWith(
      pool, staff, bookingId, { decision: 'APPROVED', reason: null },
    );
  });

  it.each([organiser, coordinator])('forbids $role from deciding', async (actor) => {
    const response = await request(setup(actor).app).post(`/api/venue-bookings/${bookingId}/decision`)
      .send({ decision: 'APPROVED' });
    expect(response.status).toBe(403);
    expect(mocked.decideVenueBooking).not.toHaveBeenCalled();
  });

  it.each([[{ decision: 'REJECTED' }], [{ decision: 'MAYBE' }], [{ decision: 'APPROVED', decidedBy: 'x' }]])(
    'validates the body %j before persistence', async (body) => {
      const response = await request(setup(staff).app).post(`/api/venue-bookings/${bookingId}/decision`).send(body);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_VENUE_BOOKING_INPUT');
      expect(mocked.decideVenueBooking).not.toHaveBeenCalled();
    },
  );

  it.each(['VENUE_BOOKING_CONFLICT', 'VENUE_UNAVAILABLE'])('returns 409 %s with the conflicting intervals', async (code) => {
    const conflicts = [{ kind: 'BOOKING', startsAt: booking.startsAt, endsAt: booking.endsAt }];
    mocked.decideVenueBooking.mockRejectedValue(new VenueRuleError('CONFLICT', code, 'Busy.', { conflicts }));
    const response = await request(setup(staff).app).post(`/api/venue-bookings/${bookingId}/decision`)
      .send({ decision: 'APPROVED' });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { code, message: 'Busy.', conflicts } });
  });

  it('returns 409 for a booking that is no longer pending and 404 for a missing one', async () => {
    const { app } = setup(staff);
    mocked.decideVenueBooking
      .mockRejectedValueOnce(new VenueRuleError('CONFLICT', 'VENUE_BOOKING_NOT_PENDING', 'Decided.'))
      .mockRejectedValueOnce(bookingNotFound());
    const send = () => request(app).post(`/api/venue-bookings/${bookingId}/decision`).send({ decision: 'APPROVED' });
    expect((await send()).status).toBe(409);
    expect((await send()).status).toBe(404);
  });
});
