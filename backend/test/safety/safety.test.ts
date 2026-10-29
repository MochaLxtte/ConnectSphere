import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSafetyRouter } from '../../src/modules/safety/router.js';
import * as service from '../../src/modules/safety/service.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

const { parseDecision, parseSubmission } = await vi.importActual<typeof service>('../../src/modules/safety/service.js');
vi.mock('../../src/modules/safety/service.js', async (original) => ({
  ...(await original<typeof service>()),
  getEventSafety: vi.fn(), submitSafetyReview: vi.fn(), startPreparation: vi.fn(),
  listSafetyQueue: vi.fn(), getSafetyReview: vi.fn(), decideSafetyReview: vi.fn(),
}));

const eventId = '84000000-0000-4000-8000-000000000001';
const reviewId = '84000000-0000-4000-8000-0000000000aa';
const fingerprint = 'a'.repeat(32);
const coordinator: WorkflowActor = { id: 'c1', role: 'EVENT_COORDINATOR' };
const organiser: WorkflowActor = { id: 'o1', role: 'EVENT_ORGANISER' };
const officer: WorkflowActor = { id: 's1', role: 'SAFETY_OFFICER' };
function app(actor: WorkflowActor | null) {
  const server = express(); server.use(express.json());
  server.use('/api', createSafetyRouter({ pool: {} as never, authenticate: async () => actor }));
  return server;
}
const invalid = (run: () => unknown) => {
  try { run(); } catch (error) { expect(error).toBeInstanceOf(WorkflowError); return (error as WorkflowError).kind; }
  throw new Error('Expected a validation error.');
};
beforeEach(() => vi.clearAllMocks());

describe('KAN-84 submission and decision input', () => {
  it('KAN-84-AC3: trims safety notes and treats blank ones as missing', () => {
    expect(parseSubmission({ emergencyAccess: '  Two exits  ', crowdMovement: '   ' }))
      .toEqual({ emergencyAccess: 'Two exits', equipmentPlacement: null, crowdMovement: null });
    expect(parseSubmission(undefined)).toEqual({ emergencyAccess: null, equipmentPlacement: null, crowdMovement: null });
    expect(invalid(() => parseSubmission({ emergencyAccess: 4 }))).toBe('INVALID_INPUT');
    expect(invalid(() => parseSubmission({ emergencyAccess: 'x'.repeat(2001) }))).toBe('INVALID_INPUT');
    expect(invalid(() => parseSubmission({ status: 'APPROVED' }))).toBe('INVALID_INPUT');
  });

  it('KAN-84-AC4/AC6: requires notes for reject/request changes and areas only for request changes', () => {
    expect(parseDecision({ decision: 'APPROVED', fingerprint })).toEqual({ decision: 'APPROVED', notes: null, areas: null, fingerprint });
    expect(parseDecision({ decision: 'CHANGES_REQUESTED', notes: ' Move exits ', areas: ['TECHNICAL', 'VENUE', 'VENUE'], fingerprint }))
      .toEqual({ decision: 'CHANGES_REQUESTED', notes: 'Move exits', areas: ['VENUE', 'TECHNICAL'], fingerprint });
    expect(invalid(() => parseDecision({ decision: 'REJECTED', notes: '  ', fingerprint }))).toBe('INVALID_INPUT');
    expect(invalid(() => parseDecision({ decision: 'CHANGES_REQUESTED', notes: 'x', areas: [], fingerprint }))).toBe('INVALID_INPUT');
    expect(invalid(() => parseDecision({ decision: 'CHANGES_REQUESTED', notes: 'x', areas: ['ROOF'], fingerprint }))).toBe('INVALID_INPUT');
    expect(invalid(() => parseDecision({ decision: 'APPROVED', areas: ['VENUE'], fingerprint }))).toBe('INVALID_INPUT');
    expect(invalid(() => parseDecision({ decision: 'MAYBE', fingerprint }))).toBe('INVALID_INPUT');
    expect(invalid(() => parseDecision({ decision: 'APPROVED', fingerprint: 'stale' }))).toBe('INVALID_INPUT');
  });
});

describe('KAN-84 safety HTTP boundary', () => {
  it('routes each action to its service with the verified actor and IDs', async () => {
    vi.mocked(service.getEventSafety).mockResolvedValue({ outcome: 'NONE' } as never);
    vi.mocked(service.submitSafetyReview).mockResolvedValue({ eventRequestId: eventId } as never);
    vi.mocked(service.startPreparation).mockResolvedValue({ eventRequestId: eventId, changed: true });
    vi.mocked(service.listSafetyQueue).mockResolvedValue({ items: [] });
    vi.mocked(service.getSafetyReview).mockResolvedValue({ stale: false } as never);
    vi.mocked(service.decideSafetyReview).mockResolvedValue({ changed: true } as never);
    expect((await request(app(organiser)).get(`/api/events/${eventId}/safety`)).status).toBe(200);
    expect(service.getEventSafety).toHaveBeenCalledWith(expect.anything(), { eventRequestId: eventId, actor: organiser });
    const submitted = await request(app(coordinator)).post(`/api/events/${eventId}/safety-reviews`).send({ crowdMovement: 'Foyer' });
    expect(submitted.status).toBe(201);
    expect(service.submitSafetyReview).toHaveBeenCalledWith(expect.anything(),
      { eventRequestId: eventId, actor: coordinator, input: { crowdMovement: 'Foyer' } });
    expect((await request(app(coordinator)).post(`/api/events/${eventId}/preparation/start`).send({})).body).toEqual({ eventRequestId: eventId, changed: true });
    expect((await request(app(officer)).get('/api/safety-reviews')).body).toEqual({ items: [] });
    expect((await request(app(officer)).get(`/api/safety-reviews/${reviewId}`)).status).toBe(200);
    const decided = await request(app(officer)).post(`/api/safety-reviews/${reviewId}/decision`).send({ decision: 'APPROVED', fingerprint });
    expect(decided.status).toBe(200);
    expect(decided.headers['cache-control']).toBe('no-store');
    expect(service.decideSafetyReview).toHaveBeenCalledWith(expect.anything(),
      { reviewId, actor: officer, input: { decision: 'APPROVED', fingerprint } });
  });

  it('KAN-84-AC1/AC8: rejects wrong roles, unauthenticated callers and invalid IDs before any service', async () => {
    expect((await request(app(null)).get('/api/safety-reviews')).status).toBe(401);
    expect((await request(app(coordinator)).get('/api/safety-reviews')).status).toBe(403);
    expect((await request(app(organiser)).post(`/api/safety-reviews/${reviewId}/decision`).send({})).status).toBe(403);
    expect((await request(app(officer)).get(`/api/events/${eventId}/safety`)).status).toBe(403);
    expect((await request(app(organiser)).post(`/api/events/${eventId}/preparation/start`)).status).toBe(403);
    expect((await request(app(officer)).get('/api/safety-reviews/nope')).status).toBe(400);
    expect((await request(app(coordinator)).post('/api/events/nope/safety-reviews')).status).toBe(400);
    for (const fn of [service.getEventSafety, service.submitSafetyReview, service.startPreparation,
      service.listSafetyQueue, service.getSafetyReview, service.decideSafetyReview]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('maps a stale approval to 409 with its explanation', async () => {
    vi.mocked(service.decideSafetyReview).mockRejectedValue(new WorkflowError('CONFLICT', 'SAFETY_REVIEW_STALE', 'Arrangements changed.'));
    const res = await request(app(officer)).post(`/api/safety-reviews/${reviewId}/decision`).send({ decision: 'APPROVED', fingerprint });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'SAFETY_REVIEW_STALE', message: 'Arrangements changed.' });
  });
});
