import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { getEquipmentStock, listEquipmentStock, updateEquipmentStock } from '../../src/modules/equipment/stock-service.js';

vi.mock('../../src/modules/equipment/stock-service.js', () => ({
  getEquipmentStock: vi.fn(), listEquipmentStock: vi.fn(), updateEquipmentStock: vi.fn(),
}));
const actor: WorkflowActor = { id: '18000000-0000-4000-8000-000000000001', role: 'TECHNICAL_SUPPORT_STAFF' };
const typeId = '18000000-0000-4000-8000-000000000002';
const path = `/api/equipment/stock/${typeId}`;
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const workspace = { pool: {} as Pool, authenticate };
const app = createApp({ database: { query: vi.fn() }, workspace, logger: { error: vi.fn() } });
beforeEach(() => { vi.resetAllMocks(); authenticate.mockResolvedValue(actor); });

describe('KAN-18 equipment stock HTTP boundary', () => {
  it('requires authentication for the list, the detail and the update', async () => {
    authenticate.mockResolvedValue(null);
    for (const attempt of [request(app).get('/api/equipment/stock'), request(app).get(path), request(app).patch(path).send({})]) {
      const response = await attempt;
      expect(response.status).toBe(401);
      expect(response.headers['cache-control']).toBe('no-store');
    }
    expect(updateEquipmentStock).not.toHaveBeenCalled();
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'KAN-18-AC101 refuses %s and forged role headers before reading or changing stock', async role => {
      authenticate.mockResolvedValue({ ...actor, role });
      for (const attempt of [request(app).get('/api/equipment/stock'), request(app).get(path), request(app).patch(path).send({})]) {
        expect((await attempt.set('X-Role', 'TECHNICAL_SUPPORT_STAFF')).status).toBe(403);
      }
      expect(listEquipmentStock).not.toHaveBeenCalled();
      expect(getEquipmentStock).not.toHaveBeenCalled();
      expect(updateEquipmentStock).not.toHaveBeenCalled();
    });
  it('rejects a malformed equipment type id', async () => {
    expect((await request(app).get('/api/equipment/stock/bad')).body.error.code).toBe('INVALID_EQUIPMENT_TYPE_ID');
    expect((await request(app).patch('/api/equipment/stock/bad').send({})).status).toBe(400);
  });
  it('KAN-18-AC1 lists stock for Technical Support Staff', async () => {
    vi.mocked(listEquipmentStock).mockResolvedValue([{ id: typeId }] as never);
    const response = await request(app).get('/api/equipment/stock');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [{ id: typeId }] });
    expect(listEquipmentStock).toHaveBeenCalledWith(workspace, { actor });
  });
  it('returns one type with its history and shortfalls', async () => {
    vi.mocked(getEquipmentStock).mockResolvedValue({ item: { id: typeId }, history: [], shortfalls: [] } as never);
    const response = await request(app).get(path);
    expect(response.body).toEqual({ item: { id: typeId }, history: [], shortfalls: [] });
    expect(getEquipmentStock).toHaveBeenCalledWith(workspace, { actor, typeId });
  });
  it('forwards only the authenticated actor, the route id and the body to the update', async () => {
    vi.mocked(updateEquipmentStock).mockResolvedValue({ changed: true } as never);
    const body = { expectedRevision: 1, damagedQuantity: 2, reason: 'Dropped' };
    const response = await request(app).patch(path).set('X-User-Id', 'someone-else').send(body);
    expect(response.status).toBe(200);
    expect(updateEquipmentStock).toHaveBeenCalledWith(workspace, { actor, typeId, input: body });
  });
  it.each([
    ['NOT_FOUND', 'EQUIPMENT_TYPE_NOT_FOUND', 404],
    ['CONFLICT', 'EQUIPMENT_STOCK_REVISION_CONFLICT', 409],
    ['INVALID_INPUT', 'INVALID_EQUIPMENT_STOCK_INPUT', 400],
  ] as const)('maps %s from the service to HTTP', async (kind, code, status) => {
    vi.mocked(updateEquipmentStock).mockRejectedValue(new WorkflowError(kind, code, 'Refused.'));
    const response = await request(app).patch(path).send({});
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
  });
});
