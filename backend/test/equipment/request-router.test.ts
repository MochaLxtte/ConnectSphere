import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import * as equipment from '../../src/modules/equipment/equipment-service.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

vi.mock('../../src/modules/equipment/equipment-service.js', async original => ({
  ...await original<typeof equipment>(),
  getEventEquipmentPlan: vi.fn(), listEquipmentTypes: vi.fn(), listEquipmentRequests: vi.fn(),
  saveEquipmentRequest: vi.fn(), reviewEquipmentRequest: vi.fn(),
  replaceReservedEquipmentLine: vi.fn(), cancelEquipmentLine: vi.fn(),
}));
const eventId = '63000000-0000-4000-8000-000000000001';
const lineId = '63000000-0000-4000-8000-000000000002';
const revision = 'a'.repeat(64);
const requestedLine = { equipmentTypeId: lineId, quantity: 2,
  startsAt: '2027-01-10T02:00:00Z', endsAt: '2027-01-10T03:00:00Z' };
const coordinator: WorkflowActor = { id: '63000000-0000-4000-8000-000000000003', role: 'EVENT_COORDINATOR' };
const technical: WorkflowActor = { ...coordinator, id: '63000000-0000-4000-8000-000000000004', role: 'TECHNICAL_SUPPORT_STAFF' };
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const pool = { query: vi.fn(), connect: vi.fn() } as unknown as Pool;
const logger = { error: vi.fn() };
const app = createApp({ database: { query: vi.fn() }, workspace: { pool, authenticate }, logger });
const services = [equipment.getEventEquipmentPlan, equipment.listEquipmentTypes, equipment.listEquipmentRequests,
  equipment.saveEquipmentRequest, equipment.reviewEquipmentRequest, equipment.replaceReservedEquipmentLine, equipment.cancelEquipmentLine];
const allRoutes = () => [
  request(app).get(`/api/events/${eventId}/equipment-requests`), request(app).get('/api/equipment-types'),
  request(app).get('/api/equipment-requests'), request(app).post(`/api/events/${eventId}/equipment-requests`).send({}),
  request(app).post(`/api/equipment-requests/${lineId}/review`).send({}),
  request(app).post(`/api/equipment-requests/${lineId}/replace`).send({}),
  request(app).post(`/api/equipment-requests/${lineId}/cancel`).send({}),
];
beforeEach(() => { vi.resetAllMocks(); authenticate.mockResolvedValue(coordinator); });

describe('KAN-63 equipment request HTTP boundary', () => {
  it('requires authentication on every request, list, decision, replacement and cancellation endpoint', async () => {
    authenticate.mockResolvedValue(null);
    for (const call of allRoutes()) {
      const response = await call;
      expect(response.status).toBe(401);
      expect(response.headers['cache-control']).toBe('no-store');
    }
    for (const service of services) expect(service).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE', 'SAFETY_OFFICER'] as const)(
    'refuses %s before accessing equipment, including forged role headers', async role => {
      authenticate.mockResolvedValue({ ...coordinator, role });
      for (const call of allRoutes()) expect((await call.set('X-Role', 'TECHNICAL_SUPPORT_STAFF')).status).toBe(403);
      for (const service of services) expect(service).not.toHaveBeenCalled();
    });

  it('separates coordinator planning actions from Technical Support decisions', async () => {
    expect((await request(app).post(`/api/equipment-requests/${lineId}/review`).send({ decision: 'RESERVED', revision })).status).toBe(403);
    authenticate.mockResolvedValue(technical);
    for (const call of [request(app).post(`/api/events/${eventId}/equipment-requests`),
      request(app).post(`/api/equipment-requests/${lineId}/replace`), request(app).post(`/api/equipment-requests/${lineId}/cancel`)]) {
      expect((await call.send({})).status).toBe(403);
    }
    for (const service of services) expect(service).not.toHaveBeenCalled();
  });

  it('validates event and line IDs before services are called', async () => {
    for (const call of [request(app).get('/api/events/bad/equipment-requests'),
      request(app).post('/api/events/bad/equipment-requests').send({})]) {
      expect((await call).body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
    }
    for (const action of ['replace', 'cancel', 'review']) {
      authenticate.mockResolvedValue(action === 'review' ? technical : coordinator);
      const response = await request(app).post(`/api/equipment-requests/bad/${action}`).send({});
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_EQUIPMENT_REQUEST_ID');
    }
    for (const service of services) expect(service).not.toHaveBeenCalled();
  });

  it.each([coordinator, technical])('returns the catalogue and event plan for an allowed $role actor', async actor => {
    authenticate.mockResolvedValue(actor);
    vi.mocked(equipment.listEquipmentTypes).mockResolvedValue([{ id: 'microphone', name: 'Microphone' }] as never);
    vi.mocked(equipment.getEventEquipmentPlan).mockResolvedValue({ version: 'stored-version', requests: [] } as never);
    expect((await request(app).get('/api/equipment-types')).body).toEqual({ items: [{ id: 'microphone', name: 'Microphone' }] });
    const response = await request(app).get(`/api/events/${eventId}/equipment-requests`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ plan: { version: 'stored-version', requests: [] } });
    expect(equipment.getEventEquipmentPlan).toHaveBeenCalledWith(pool, { eventId, actor });
    expect(equipment.listEquipmentTypes).toHaveBeenCalledWith(pool);
  });

  it('lists the signed-in actor scope, with an optional single event filter', async () => {
    vi.mocked(equipment.listEquipmentRequests).mockResolvedValue([{ id: lineId }] as never);
    expect((await request(app).get('/api/equipment-requests')).body).toEqual({ items: [{ id: lineId }] });
    expect(equipment.listEquipmentRequests).toHaveBeenLastCalledWith(pool, { actor: coordinator });
    await request(app).get('/api/equipment-requests').query({ eventId });
    expect(equipment.listEquipmentRequests).toHaveBeenLastCalledWith(pool, { actor: coordinator, eventId });
  });

  it('returns 201 for a saved request and passes the authenticated actor and route event to the service', async () => {
    const input = { lines: [requestedLine], revision };
    vi.mocked(equipment.saveEquipmentRequest).mockResolvedValue({ id: lineId } as never);
    const response = await request(app).post(`/api/events/${eventId}/equipment-requests`)
      .set('X-User-Id', 'forged').send(input);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ request: { id: lineId } });
    expect(equipment.saveEquipmentRequest).toHaveBeenCalledWith(pool, { actor: coordinator, eventId, input });
  });

  it.each([
    ['review', 'request', 200, { decision: 'REJECTED', reason: 'Unavailable', revision }],
    ['replace', 'replacement', 201, { replacement: requestedLine, revision }],
    ['cancel', 'request', 200, { reason: 'No longer needed', revision }],
  ] as const)('forwards %s to its service and returns the documented envelope', async (action, envelope, status, input) => {
    const actor = action === 'review' ? technical : coordinator;
    authenticate.mockResolvedValue(actor);
    const service = { review: equipment.reviewEquipmentRequest, replace: equipment.replaceReservedEquipmentLine, cancel: equipment.cancelEquipmentLine }[action];
    vi.mocked(service).mockResolvedValue({ id: lineId } as never);
    const response = await request(app).post(`/api/equipment-requests/${lineId}/${action}`).set('X-User-Id', 'forged').send(input);
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ [envelope]: { id: lineId } });
    expect(service).toHaveBeenCalledWith(pool, { lineId, actor, input });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each([
    ['INVALID_INPUT', 'INVALID_EQUIPMENT_REQUEST', 400], ['NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 404],
    ['FORBIDDEN', 'EQUIPMENT_ACCESS_FORBIDDEN', 403], ['CONFLICT', 'STALE_EQUIPMENT_REQUEST', 409],
  ] as const)('preserves %s service refusal without returning a successful write', async (kind, code, status) => {
    vi.mocked(equipment.saveEquipmentRequest).mockRejectedValue(new WorkflowError(kind, code, 'Refused.'));
    const response = await request(app).post(`/api/events/${eventId}/equipment-requests`).send({});
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error: { code, message: 'Refused.' } });
  });

  it('returns a generic server error for an unexpected service failure without leaking SQL', async () => {
    vi.mocked(equipment.cancelEquipmentLine).mockRejectedValue(new Error('private SQL or connection detail'));
    const response = await request(app).post(`/api/equipment-requests/${lineId}/cancel`).send({ reason: 'Cancel' });
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.text).not.toContain('private SQL');
    expect(response.body).not.toHaveProperty('request');
  });
});
