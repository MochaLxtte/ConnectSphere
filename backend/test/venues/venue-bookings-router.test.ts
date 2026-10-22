import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVenueBookingsRouter } from '../../src/modules/venues/venue-bookings-router.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import {
  cancelVenueHold, decideVenueBooking, getVenueBooking, listVenueBookings, placeVenueHold,
} from '../../src/modules/venues/booking-service.js';

vi.mock('../../src/modules/venues/booking-service.js', () => ({
  decideVenueBooking: vi.fn(), getVenueBooking: vi.fn(), listVenueBookings: vi.fn(),
  placeVenueHold: vi.fn(), cancelVenueHold: vi.fn(),
}));
const id = '12345678-1234-1234-1234-123456789abc';
const actor: WorkflowActor = { id, role: 'VENUE_STAFF' };
const pool = {} as Pool;
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const app = express();
app.use(express.json());
app.use('/api/venue-bookings', createVenueBookingsRouter({ pool, authenticate }));

beforeEach(() => {
  vi.clearAllMocks();
  authenticate.mockResolvedValue(actor);
});

describe('KAN-8 venue booking HTTP boundary', () => {
  it('requires authentication for list, detail and decision without querying services', async () => {
    authenticate.mockResolvedValue(null);
    for (const attempt of [request(app).get('/api/venue-bookings'),
      request(app).get(`/api/venue-bookings/${id}`),
      request(app).post(`/api/venue-bookings/${id}/decision`).send({ decision: 'APPROVED' })]) {
      const response = await attempt;
      expect(response.status).toBe(401);
      expect(response.headers['cache-control']).toBe('no-store');
    }
    expect(listVenueBookings).not.toHaveBeenCalled();
    expect(getVenueBooking).not.toHaveBeenCalled();
    expect(decideVenueBooking).not.toHaveBeenCalled();
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'prevents %s from deciding even when identity is supplied in headers', async (role) => {
      authenticate.mockResolvedValue({ ...actor, role });
      const response = await request(app).post(`/api/venue-bookings/${id}/decision`)
        .set('X-Role', 'VENUE_STAFF').send({ decision: 'APPROVED' });
      expect(response.status).toBe(403);
      expect(decideVenueBooking).not.toHaveBeenCalled();
    },
  );
  it('passes the verified actor and validated event filter to the list service', async () => {
    vi.mocked(listVenueBookings).mockResolvedValue([]);
    const response = await request(app).get('/api/venue-bookings').query({ eventRequestId: id });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
    expect(listVenueBookings).toHaveBeenCalledWith({ pool, authenticate }, { actor, eventRequestId: id });
  });
  it('returns invalid parameter and filter errors before a service call', async () => {
    expect((await request(app).get('/api/venue-bookings/not-a-uuid')).status).toBe(400);
    expect((await request(app).get('/api/venue-bookings?eventRequestId=bad')).status).toBe(400);
    expect((await request(app).get('/api/venue-bookings?status=APPROVED')).status).toBe(400);
    expect(getVenueBooking).not.toHaveBeenCalled();
    expect(listVenueBookings).not.toHaveBeenCalled();
  });
  it('maps a stale decision to 409 with the service error code', async () => {
    vi.mocked(decideVenueBooking).mockRejectedValue(new WorkflowError(
      'CONFLICT', 'BOOKING_ALREADY_DECIDED', 'This booking is no longer pending a decision.',
    ));
    const response = await request(app).post(`/api/venue-bookings/${id}/decision`).send({ decision: 'APPROVED' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('BOOKING_ALREADY_DECIDED');
  });
});

describe('KAN-83 venue hold HTTP boundary', () => {
  const routes = [
    { path: 'hold', service: placeVenueHold, body: { expiresAt: '2026-11-30T10:00:00+08:00' } },
    { path: 'hold/cancel', service: cancelVenueHold, body: { reason: 'Released' } },
  ] as const;

  it.each(routes)('KAN-83-AC12 POST /:id/$path requires authentication', async ({ path, service, body }) => {
    authenticate.mockResolvedValue(null);
    const response = await request(app).post(`/api/venue-bookings/${id}/${path}`).send(body);
    expect(response.status).toBe(401);
    expect(service).not.toHaveBeenCalled();
  });

  it.each(routes.flatMap((route) =>
    (['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)
      .map((role) => ({ ...route, role }))))(
    'KAN-83-AC12 POST /:id/$path refuses $role', async ({ path, service, body, role }) => {
      authenticate.mockResolvedValue({ ...actor, role });
      const response = await request(app).post(`/api/venue-bookings/${id}/${path}`).send(body);
      expect(response.status).toBe(403);
      expect(service).not.toHaveBeenCalled();
    },
  );

  it.each(routes)('POST /:id/$path rejects a malformed booking ID before the service', async ({ path, service, body }) => {
    const response = await request(app).post(`/api/venue-bookings/not-a-uuid/${path}`).send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_VENUE_BOOKING_ID');
    expect(service).not.toHaveBeenCalled();
  });

  it.each(routes)('KAN-83-AC1/AC10 POST /:id/$path passes the verified staff actor and raw body to the service', async ({ path, service, body }) => {
    vi.mocked(service).mockResolvedValue({ id } as never);
    const response = await request(app).post(`/api/venue-bookings/${id}/${path}`).send(body);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ booking: { id } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service).toHaveBeenCalledWith({ pool, authenticate }, { actor, bookingId: id, input: body });
  });

  it.each([
    ['INVALID_INPUT', 'INVALID_HOLD_EXPIRY', 400],
    ['CONFLICT', 'HOLD_EXPIRED', 409],
    ['CONFLICT', 'VENUE_HELD', 409],
    ['NOT_FOUND', 'VENUE_BOOKING_NOT_FOUND', 404],
  ] as const)('KAN-83-AC12 maps a %s/%s refusal to HTTP %i', async (kind, code, status) => {
    vi.mocked(placeVenueHold).mockRejectedValue(new WorkflowError(kind, code, 'Refused.'));
    const response = await request(app).post(`/api/venue-bookings/${id}/hold`).send({ expiresAt: 'x' });
    expect(response.status).toBe(status);
    expect(response.body.error).toEqual({ code, message: 'Refused.' });
  });
});
