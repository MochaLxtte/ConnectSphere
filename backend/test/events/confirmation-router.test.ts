import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfirmationRouter } from '../../src/modules/events/confirmation-router.js';
import { confirmEvent, getEventConfirmation } from '../../src/modules/events/confirmation.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

vi.mock('../../src/modules/events/confirmation.js', () => ({ confirmEvent: vi.fn(), getEventConfirmation: vi.fn() }));
const id = '61000000-0000-4000-8000-000000000001';
const coordinator: WorkflowActor = { id: 'c1', role: 'EVENT_COORDINATOR' };
const organiser: WorkflowActor = { id: 'o1', role: 'EVENT_ORGANISER' };
function app(actor: WorkflowActor | null) {
  const server = express(); server.use(express.json());
  server.use('/api/events', createConfirmationRouter({ pool: {} as never, authenticate: async () => actor }));
  return server;
}
beforeEach(() => vi.resetAllMocks());

describe('KAN-61 confirmation HTTP boundary', () => {
  it('sends the verified coordinator, event ID and body to the confirmation service', async () => {
    vi.mocked(confirmEvent).mockResolvedValue({ eventRequestId: id, status: 'CONFIRMED', changed: true, confirmation: null });
    const res = await request(app(coordinator)).post(`/api/events/${id}/confirm`).send({});
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.confirmation).toMatchObject({ status: 'CONFIRMED', changed: true });
    expect(confirmEvent).toHaveBeenCalledWith(expect.anything(), { eventRequestId: id, actor: coordinator, input: {} });
  });

  it('lets the organiser and coordinator read the confirmation panel', async () => {
    vi.mocked(getEventConfirmation).mockResolvedValue({ eventRequestId: id, status: 'APPROVED', started: false,
      canConfirm: false, readiness: null, confirmation: null });
    expect((await request(app(organiser)).get(`/api/events/${id}/confirmation`)).status).toBe(200);
    expect(getEventConfirmation).toHaveBeenCalledWith(expect.anything(), { eventRequestId: id, actor: organiser });
  });

  it('KAN-61-AC1/AC5: rejects unauthenticated, wrong-role and invalid-ID requests before the service', async () => {
    expect((await request(app(null)).post(`/api/events/${id}/confirm`)).status).toBe(401);
    expect((await request(app(organiser)).post(`/api/events/${id}/confirm`)).status).toBe(403);
    expect((await request(app({ id: 'a1', role: 'ATTENDEE' })).get(`/api/events/${id}/confirmation`)).status).toBe(403);
    expect((await request(app(coordinator)).post('/api/events/nope/confirm')).status).toBe(400);
    expect(confirmEvent).not.toHaveBeenCalled();
  });

  it('maps an unready event to 409 with the readiness explanation', async () => {
    vi.mocked(confirmEvent).mockRejectedValue(new WorkflowError('CONFLICT', 'EVENT_NOT_READY', 'Decide the pending change request before confirming.'));
    const res = await request(app(coordinator)).post(`/api/events/${id}/confirm`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'EVENT_NOT_READY', message: 'Decide the pending change request before confirming.' });
  });
});
