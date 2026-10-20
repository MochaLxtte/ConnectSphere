import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVenueBlockRouter } from '../../src/modules/venues/block-router.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { createVenueBlock, deleteVenueBlock, listVenueBlocks } from '../../src/modules/venues/block-service.js';
import { listRecoveryArrangements } from '../../src/modules/venues/outage-impact.js';

vi.mock('../../src/modules/venues/block-service.js', () => ({
  createVenueBlock: vi.fn(), deleteVenueBlock: vi.fn(), listVenueBlocks: vi.fn(),
}));
vi.mock('../../src/modules/venues/outage-impact.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/modules/venues/outage-impact.js')>(),
  listRecoveryArrangements: vi.fn(),
}));

const venueId = '12345678-1234-1234-1234-123456789abc';
const blockId = '87654321-4321-4321-4321-cba987654321';
const actor: WorkflowActor = { id: 'staff-1', role: 'VENUE_STAFF' };
const pool = {} as Pool;
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const app = express();
app.use(express.json());
app.use('/api/venues', createVenueBlockRouter({ pool, authenticate }));

const body = { startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z', reason: 'Maintenance' };

beforeEach(() => {
  vi.clearAllMocks();
  authenticate.mockResolvedValue(actor);
});

describe('KAN-55 venue-unavailability block HTTP boundary', () => {
  it('requires authentication for list, create and delete without calling the service', async () => {
    authenticate.mockResolvedValue(null);
    for (const attempt of [
      request(app).get(`/api/venues/${venueId}/unavailability`),
      request(app).post(`/api/venues/${venueId}/unavailability`).send(body),
      request(app).delete(`/api/venues/${venueId}/unavailability/${blockId}`),
    ]) {
      const response = await attempt;
      expect(response.status).toBe(401);
      expect(response.headers['cache-control']).toBe('no-store');
    }
    expect(listVenueBlocks).not.toHaveBeenCalled();
    expect(createVenueBlock).not.toHaveBeenCalled();
    expect(deleteVenueBlock).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'prevents %s from managing blocks even with identity supplied in headers', async (role) => {
      authenticate.mockResolvedValue({ ...actor, role });
      const response = await request(app).post(`/api/venues/${venueId}/unavailability`)
        .set('X-Role', 'VENUE_STAFF').send(body);
      expect(response.status).toBe(403);
      expect(createVenueBlock).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid venue or block id before a service call', async () => {
    expect((await request(app).get('/api/venues/not-a-uuid/unavailability')).status).toBe(400);
    expect((await request(app).delete(`/api/venues/${venueId}/unavailability/not-a-uuid`)).status).toBe(400);
    expect(listVenueBlocks).not.toHaveBeenCalled();
    expect(deleteVenueBlock).not.toHaveBeenCalled();
  });

  it('passes the verified actor, venue id and body to the create service and returns 201', async () => {
    vi.mocked(createVenueBlock).mockResolvedValue({ id: blockId } as never);
    const response = await request(app).post(`/api/venues/${venueId}/unavailability`).send(body);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ block: { id: blockId } });
    expect(createVenueBlock).toHaveBeenCalledWith({ pool, authenticate }, { actor, venueId, input: body });
  });

  it('lists blocks for the venue', async () => {
    vi.mocked(listVenueBlocks).mockResolvedValue([{ id: blockId } as never]);
    const response = await request(app).get(`/api/venues/${venueId}/unavailability`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [{ id: blockId }] });
    expect(listVenueBlocks).toHaveBeenCalledWith({ pool, authenticate }, { actor, venueId });
  });

  it('deletes a block and returns its id', async () => {
    vi.mocked(deleteVenueBlock).mockResolvedValue({ clearedBookingIds: [] });
    const response = await request(app).delete(`/api/venues/${venueId}/unavailability/${blockId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: blockId, clearedBookingIds: [] });
    expect(deleteVenueBlock).toHaveBeenCalledWith({ pool, authenticate }, { actor, blockId });
  });

  it('maps service errors to their HTTP status and code', async () => {
    vi.mocked(createVenueBlock).mockRejectedValue(new WorkflowError(
      'CONFLICT', 'VENUE_BOOKING_CONFLICT', 'An approved booking already exists during this period.',
    ));
    const response = await request(app).post(`/api/venues/${venueId}/unavailability`).send(body);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('VENUE_BOOKING_CONFLICT');
  });

  it('returns 404 for a missing block on delete', async () => {
    vi.mocked(deleteVenueBlock).mockRejectedValue(new WorkflowError(
      'NOT_FOUND', 'VENUE_BLOCK_NOT_FOUND', 'The venue-unavailability block was not found.',
    ));
    const response = await request(app).delete(`/api/venues/${venueId}/unavailability/${blockId}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('VENUE_BLOCK_NOT_FOUND');
  });
});

describe('KAN-81 venue recovery and outage HTTP boundary', () => {
  it('lists recovery arrangements for Venue Staff with the parsed status filter', async () => {
    vi.mocked(listRecoveryArrangements).mockResolvedValue([{ impactId: 'impact-1' }] as never);
    const response = await request(app).get('/api/venues/recovery').query({ status: 'RECOVERY_REQUIRED' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [{ impactId: 'impact-1' }] });
    expect(listRecoveryArrangements).toHaveBeenCalledWith({ pool, authenticate }, { actor, status: 'RECOVERY_REQUIRED' });
  });

  it('refuses an unknown recovery filter with 400 before reading', async () => {
    const response = await request(app).get('/api/venues/recovery').query({ status: 'OPEN' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_RECOVERY_FILTER');
    expect(listRecoveryArrangements).not.toHaveBeenCalled();
  });

  it('requires authentication for the recovery list', async () => {
    authenticate.mockResolvedValue(null);
    const response = await request(app).get('/api/venues/recovery');
    expect(response.status).toBe(401);
    expect(listRecoveryArrangements).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'refuses the recovery list to %s (AC6)', async (role) => {
      authenticate.mockResolvedValue({ ...actor, role });
      const response = await request(app).get('/api/venues/recovery');
      expect(response.status).toBe(403);
      expect(listRecoveryArrangements).not.toHaveBeenCalled();
    },
  );

  it('returns the affected arrangements of a newly created outage (AC2-AC4)', async () => {
    const block = { id: blockId, affected: [{ bookingId: 'booking-1', status: 'RECOVERY_REQUIRED' }] };
    vi.mocked(createVenueBlock).mockResolvedValue(block as never);
    const response = await request(app).post(`/api/venues/${venueId}/unavailability`).send(body);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ block });
  });

  it('reports which bookings were cleared when an outage is removed (AC11)', async () => {
    vi.mocked(deleteVenueBlock).mockResolvedValue({ clearedBookingIds: ['booking-1'] });
    const response = await request(app).delete(`/api/venues/${venueId}/unavailability/${blockId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: blockId, clearedBookingIds: ['booking-1'] });
  });
});
