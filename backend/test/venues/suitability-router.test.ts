import express from 'express';
import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVenueSuitabilityRouter } from '../../src/modules/venues/suitability-router.js';
import { checkVenueSuitability, getVenueSuitabilityContext } from '../../src/modules/venues/suitability-service.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

vi.mock('../../src/modules/venues/suitability-service.js', () => ({
  checkVenueSuitability: vi.fn(), getVenueSuitabilityContext: vi.fn(),
}));
const actor: WorkflowActor = { id: '52000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const eventId = '52000000-0000-4000-8000-000000000002';
const path = `/api/events/${eventId}/venue-suitability`;
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const dependencies = { pool: {} as Pool, authenticate };
const app = express();
app.use(express.json());
app.use('/api/events', createVenueSuitabilityRouter(dependencies));

beforeEach(() => { vi.clearAllMocks(); authenticate.mockResolvedValue(actor); });

describe('KAN-52 suitability HTTP boundary', () => {
  it('requires login for both context and assessment before reading data', async () => {
    authenticate.mockResolvedValue(null);
    for (const attempt of [request(app).get(path), request(app).post(path).send({})]) {
      const result = await attempt;
      expect(result.status).toBe(401);
      expect(result.headers['cache-control']).toBe('no-store');
    }
    expect(getVenueSuitabilityContext).not.toHaveBeenCalled();
    expect(checkVenueSuitability).not.toHaveBeenCalled();
  });
  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'denies %s regardless of forged identity headers', async role => {
      authenticate.mockResolvedValue({ ...actor, role });
      for (const attempt of [request(app).get(path), request(app).post(path).send({})]) {
        expect((await attempt.set('X-Role', 'EVENT_COORDINATOR')).status).toBe(403);
      }
      expect(getVenueSuitabilityContext).not.toHaveBeenCalled();
      expect(checkVenueSuitability).not.toHaveBeenCalled();
    },
  );
  it('rejects an invalid event ID before calling the service', async () => {
    expect((await request(app).get('/api/events/invalid/venue-suitability')).status).toBe(400);
    expect(getVenueSuitabilityContext).not.toHaveBeenCalled();
  });
  it('forwards only the verified actor and returns the context directly', async () => {
    const context = { event: { id: eventId }, requirementsVersion: 'a'.repeat(64), venues: [] };
    vi.mocked(getVenueSuitabilityContext).mockResolvedValue(context as never);
    const response = await request(app).get(path);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(context);
    expect(getVenueSuitabilityContext).toHaveBeenCalledWith(dependencies, { actor, eventId });
  });
  it('wraps the assessment without treating POST as resource creation', async () => {
    const assessment = { eventId, outcome: 'NEEDS_REVIEW', checks: [] };
    vi.mocked(checkVenueSuitability).mockResolvedValue(assessment as never);
    const response = await request(app).post(path).send({ requirementsConfirmed: false });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ assessment });
    expect(checkVenueSuitability).toHaveBeenCalledWith(dependencies, { actor, eventId, input: { requirementsConfirmed: false } });
  });
  it('returns the stale-context conflict for the frontend to refresh', async () => {
    vi.mocked(checkVenueSuitability).mockRejectedValue(new WorkflowError(
      'CONFLICT', 'SUITABILITY_CONTEXT_CHANGED', 'Refresh the event requirements.',
    ));
    const response = await request(app).post(path).send({});
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SUITABILITY_CONTEXT_CHANGED');
  });
});
