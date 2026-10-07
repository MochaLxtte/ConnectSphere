import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVenueBookingSubmissionRouter } from '../../src/modules/venues/venue-bookings-router.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { createVenueBooking } from '../../src/modules/venues/booking-service.js';

vi.mock('../../src/modules/venues/booking-service.js', () => ({ createVenueBooking: vi.fn() }));

const id = '12345678-1234-1234-1234-123456789abc';
const venueId = '87654321-4321-4321-4321-cba987654321';
const actor: WorkflowActor = { id, role: 'EVENT_COORDINATOR' };
const pool = {} as Pool;
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const app = express();
app.use(express.json());
app.use('/api/events', createVenueBookingSubmissionRouter({ pool, authenticate }));

const body = {
  venueId, startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  authenticate.mockResolvedValue(actor);
});

describe('KAN-53 venue booking submission HTTP boundary', () => {
  it('requires authentication without calling the service', async () => {
    authenticate.mockResolvedValue(null);
    const response = await request(app).post(`/api/events/${id}/venue-bookings`).send(body);
    expect(response.status).toBe(401);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(createVenueBooking).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'prevents %s from submitting even with identity supplied in headers', async (role) => {
      authenticate.mockResolvedValue({ ...actor, role });
      const response = await request(app).post(`/api/events/${id}/venue-bookings`)
        .set('X-Role', 'EVENT_COORDINATOR').send(body);
      expect(response.status).toBe(403);
      expect(createVenueBooking).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid event request id before a service call', async () => {
    const response = await request(app).post('/api/events/not-a-uuid/venue-bookings').send(body);
    expect(response.status).toBe(400);
    expect(createVenueBooking).not.toHaveBeenCalled();
  });

  it('passes the verified actor, event id and body to the service and returns 201', async () => {
    vi.mocked(createVenueBooking).mockResolvedValue({ id: 'booking-id' } as never);
    const response = await request(app).post(`/api/events/${id}/venue-bookings`).send(body);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ booking: { id: 'booking-id' } });
    expect(createVenueBooking).toHaveBeenCalledWith(
      { pool, authenticate }, { actor, eventRequestId: id, input: body },
    );
  });

  it('maps service errors to their HTTP status and code', async () => {
    vi.mocked(createVenueBooking).mockRejectedValue(new WorkflowError(
      'CONFLICT', 'EVENT_NOT_ELIGIBLE', 'A venue booking cannot be requested for this event.',
    ));
    const response = await request(app).post(`/api/events/${id}/venue-bookings`).send(body);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EVENT_NOT_ELIGIBLE');
  });

  it.each(['VENUE_BOOKING_CONFLICT', 'VENUE_UNAVAILABLE'])(
    'returns 409 and preserves the %s code for submission conflicts', async (code) => {
      vi.mocked(createVenueBooking).mockRejectedValue(new WorkflowError('CONFLICT', code, 'The venue is unavailable.'));
      const response = await request(app).post(`/api/events/${id}/venue-bookings`).send(body);
      expect(response.status).toBe(409);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body).toEqual({ error: { code, message: 'The venue is unavailable.' } });
    },
  );

  it('returns the same not-found response for an unrelated coordinator', async () => {
    vi.mocked(createVenueBooking).mockRejectedValue(new WorkflowError(
      'NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.',
    ));
    const response = await request(app).post(`/api/events/${id}/venue-bookings`).send(body);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
  });
});
