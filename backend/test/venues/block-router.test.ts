import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVenueBlockRouter } from '../../src/modules/venues/block-router.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { createVenueBlock, deleteVenueBlock, listVenueBlocks } from '../../src/modules/venues/block-service.js';

vi.mock('../../src/modules/venues/block-service.js', () => ({
  createVenueBlock: vi.fn(), deleteVenueBlock: vi.fn(), listVenueBlocks: vi.fn(),
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
    vi.mocked(deleteVenueBlock).mockResolvedValue(undefined);
    const response = await request(app).delete(`/api/venues/${venueId}/unavailability/${blockId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: blockId });
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
