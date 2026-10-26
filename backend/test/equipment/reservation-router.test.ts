import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { changeEquipmentReservation, getEquipmentReservationContext } from '../../src/modules/equipment/reservation-service.js';

vi.mock('../../src/modules/equipment/reservation-service.js', () => ({
  changeEquipmentReservation: vi.fn(), getEquipmentReservationContext: vi.fn(),
}));
const actor: WorkflowActor = { id: '26000000-0000-4000-8000-000000000001', role: 'TECHNICAL_SUPPORT_STAFF' };
const eventId = '26000000-0000-4000-8000-000000000002';
const requestId = '26000000-0000-4000-8000-000000000003';
const path = `/api/equipment/reservations/events/${eventId}`;
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const workspace = { pool: {} as Pool, authenticate };
const logger = { error: vi.fn() };
const app = createApp({ database: { query: vi.fn() }, workspace, logger });
beforeEach(() => { vi.resetAllMocks(); authenticate.mockResolvedValue(actor); });

describe('KAN-26 equipment reservation HTTP boundary', () => {
  it('requires authentication for context and both actions', async () => {
    authenticate.mockResolvedValue(null);
    for (const attempt of [request(app).get(path), request(app).post(`${path}/requests/${requestId}/reserve`),
      request(app).post(`${path}/requests/${requestId}/cancel`)]) {
      const response = await attempt;
      expect(response.status).toBe(401); expect(response.headers['cache-control']).toBe('no-store');
    }
    expect(changeEquipmentReservation).not.toHaveBeenCalled();
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'rejects %s and forged role headers before reading equipment data', async role => {
      authenticate.mockResolvedValue({ ...actor, role });
      for (const attempt of [request(app).get(path), request(app).post(`${path}/requests/${requestId}/reserve`),
        request(app).post(`${path}/requests/${requestId}/cancel`)]) {
        expect((await attempt.set('X-Role', actor.role)).status).toBe(403);
      }
      expect(changeEquipmentReservation).not.toHaveBeenCalled();
      expect(getEquipmentReservationContext).not.toHaveBeenCalled();
    });
  it('validates both path identifiers', async () => {
    expect((await request(app).get('/api/equipment/reservations/events/bad')).status).toBe(400);
    expect((await request(app).post(`${path}/requests/bad/reserve`)).body.error.code).toBe('INVALID_EQUIPMENT_REQUEST_ID');
  });
  it('returns the context and forwards only authenticated actor, route IDs and action input', async () => {
    const context = { event: { id: eventId }, requests: [], readiness: { status: 'NO_REQUIREMENTS' } };
    vi.mocked(getEquipmentReservationContext).mockResolvedValue(context as never);
    expect((await request(app).get(path)).body).toEqual(context);
    expect(getEquipmentReservationContext).toHaveBeenCalledWith(workspace, { actor, eventId });
    for (const action of ['reserve', 'cancel'] as const) {
      const input = { requirementsVersion: 'a'.repeat(64), ...(action === 'cancel' ? { reason: 'Not needed' } : {}) };
      vi.mocked(changeEquipmentReservation).mockResolvedValue({ changed: false, context } as never);
      const response = await request(app).post(`${path}/requests/${requestId}/${action}`).send(input);
      expect(response.status).toBe(200); expect(response.body).toEqual({ changed: false, context });
      expect(changeEquipmentReservation).toHaveBeenLastCalledWith(workspace, { actor, eventId, requestId, action, input });
    }
  });
  it.each([
    ['INVALID_INPUT', 'INVALID_EQUIPMENT_RESERVATION_INPUT', 400],
    ['CONFLICT', 'EQUIPMENT_CONTEXT_CHANGED', 409], ['CONFLICT', 'EQUIPMENT_STOCK_CONFLICT', 409],
    ['NOT_FOUND', 'EQUIPMENT_REQUEST_NOT_FOUND', 404], ['FORBIDDEN', 'ACTION_FORBIDDEN', 403],
  ] as const)('maps %s/%s to %s', async (kind, code, status) => {
    vi.mocked(changeEquipmentReservation).mockRejectedValue(new WorkflowError(kind, code, 'Refresh first.'));
    const response = await request(app).post(`${path}/requests/${requestId}/reserve`).send({});
    expect(response.status).toBe(status); expect(response.body.error).toEqual({ code, message: 'Refresh first.' });
  });
  it('hides unexpected database failure details', async () => {
    vi.mocked(changeEquipmentReservation).mockRejectedValue(new Error('private database detail'));
    const response = await request(app).post(`${path}/requests/${requestId}/cancel`).send({});
    expect(response.status).toBe(500); expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('private');
  });
});
