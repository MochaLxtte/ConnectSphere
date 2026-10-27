import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import {
  checkEquipmentAvailability, getEquipmentAvailabilityContext, listEquipmentAvailabilityEvents,
} from '../../src/modules/equipment/availability-service.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

vi.mock('../../src/modules/equipment/availability-service.js', () => ({
  checkEquipmentAvailability: vi.fn(), getEquipmentAvailabilityContext: vi.fn(), listEquipmentAvailabilityEvents: vi.fn(),
}));
const actor: WorkflowActor = { id: '09000000-0000-4000-8000-000000000001', role: 'TECHNICAL_SUPPORT_STAFF' };
const eventId = '09000000-0000-4000-8000-000000000002';
const listPath = '/api/equipment/availability/events';
const path = `${listPath}/${eventId}`;
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const dependencies = { pool: {} as Pool, authenticate };
const logger = { error: vi.fn() };
const app = createApp({ database: { query: vi.fn() }, workspace: dependencies, logger });
const services = [listEquipmentAvailabilityEvents, getEquipmentAvailabilityContext, checkEquipmentAvailability];

beforeEach(() => { vi.resetAllMocks(); authenticate.mockResolvedValue(actor); });

describe('KAN-9 equipment availability HTTP boundary', () => {
  it('requires login for event selection, context and assessment', async () => {
    authenticate.mockResolvedValue(null);
    for (const attempt of [request(app).get(listPath), request(app).get(path), request(app).post(path).send({})]) {
      const response = await attempt;
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.headers['cache-control']).toBe('no-store');
    }
    for (const service of services) expect(service).not.toHaveBeenCalled();
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'denies %s including forged support headers before reading data', async role => {
      authenticate.mockResolvedValue({ ...actor, role });
      for (const attempt of [request(app).get(listPath), request(app).get(path), request(app).post(path).send({ role: actor.role })]) {
        const response = await attempt.set('X-Role', actor.role);
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('ACTION_FORBIDDEN');
      }
      for (const service of services) expect(service).not.toHaveBeenCalled();
    },
  );
  it('rejects malformed event IDs before either data service', async () => {
    for (const attempt of [request(app).get(`${listPath}/bad`), request(app).post(`${listPath}/bad`).send({})]) {
      expect((await attempt).status).toBe(400);
    }
    expect(getEquipmentAvailabilityContext).not.toHaveBeenCalled();
    expect(checkEquipmentAvailability).not.toHaveBeenCalled();
  });
  it('mounts the event picker and forwards only the authenticated identity', async () => {
    const items = [{ id: eventId, name: 'Workshop', status: 'APPROVED' as const, startsAt: null, endsAt: null }];
    vi.mocked(listEquipmentAvailabilityEvents).mockResolvedValue(items);
    const response = await request(app).get(listPath);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(listEquipmentAvailabilityEvents).toHaveBeenCalledWith(dependencies, actor);
  });
  it('returns context directly and wraps read-only assessment without creation status', async () => {
    const context = { event: { id: eventId }, requirementsVersion: 'a'.repeat(64), savedRequests: [], equipmentTypes: [] };
    vi.mocked(getEquipmentAvailabilityContext).mockResolvedValue(context as never);
    const response = await request(app).get(path);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(context);
    expect(getEquipmentAvailabilityContext).toHaveBeenCalledWith(dependencies, { actor, eventId });
    const assessment = { eventId, advisory: true, outcome: 'SHORTFALL', items: [] };
    vi.mocked(checkEquipmentAvailability).mockResolvedValue(assessment as never);
    const input = { mode: 'saved', requirementsVersion: context.requirementsVersion };
    const assessed = await request(app).post(path).send(input);
    expect(assessed.status).toBe(200);
    expect(assessed.body).toEqual({ assessment });
    expect(checkEquipmentAvailability).toHaveBeenCalledWith(dependencies, { actor, eventId, input });
  });
  it.each([
    ['INVALID_INPUT', 'INVALID_EQUIPMENT_AVAILABILITY_INPUT', 400],
    ['NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 404],
    ['CONFLICT', 'EQUIPMENT_CONTEXT_CHANGED', 409],
    ['CONFLICT', 'EQUIPMENT_REQUEST_PERIOD_MISMATCH', 409],
  ] as const)('maps %s/%s to HTTP %s', async (kind, code, expectedStatus) => {
    vi.mocked(checkEquipmentAvailability).mockRejectedValue(new WorkflowError(kind, code, 'Refresh and check again.'));
    const response = await request(app).post(path).send({});
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toEqual({ error: { code, message: 'Refresh and check again.' } });
  });
  it('hides unexpected database details and exposes a generic failure', async () => {
    vi.mocked(checkEquipmentAvailability).mockRejectedValue(new Error('private SQL connection detail'));
    const response = await request(app).post(path).send({});
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(logger.error).toHaveBeenCalledWith('Unexpected API error.');
  });
});
