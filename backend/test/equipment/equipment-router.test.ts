import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getEquipmentAvailability, listEquipmentAvailability,
} from '../../src/modules/equipment/availability.js';
import { createEquipmentRouter } from '../../src/modules/equipment/equipment-router.js';
import {
  createEquipmentType, getEquipmentType, listEquipmentTypes, updateEquipmentType,
} from '../../src/modules/equipment/equipment-types.js';
import { EquipmentConflictError, EquipmentNotFoundError } from '../../src/modules/equipment/errors.js';
import type { EquipmentActor, EquipmentType } from '../../src/modules/equipment/types.js';
import { createTestApp } from './test-app.js';

vi.mock('../../src/modules/equipment/equipment-types.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/equipment/equipment-types.js')>();
  return {
    ...actual, listEquipmentTypes: vi.fn(), getEquipmentType: vi.fn(),
    createEquipmentType: vi.fn(), updateEquipmentType: vi.fn(),
  };
});
vi.mock('../../src/modules/equipment/availability.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/equipment/availability.js')>();
  return { ...actual, getEquipmentAvailability: vi.fn(), listEquipmentAvailability: vi.fn() };
});

const list = vi.mocked(listEquipmentTypes);
const get = vi.mocked(getEquipmentType);
const create = vi.mocked(createEquipmentType);
const update = vi.mocked(updateEquipmentType);
const availability = vi.mocked(getEquipmentAvailability);
const allAvailability = vi.mocked(listEquipmentAvailability);

const typeId = '40000000-0000-4000-8000-000000000001';
const staff: EquipmentActor = { id: '20000000-0000-4000-8000-000000000001', role: 'TECHNICAL_SUPPORT_STAFF' };
const organiser: EquipmentActor = { id: '20000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const projector: EquipmentType = {
  id: typeId, name: 'Projector', category: 'AV', description: null, totalQuantity: 4, isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
};
const window = 'from=2026-10-01T09:00:00Z&to=2026-10-01T12:00:00Z';
const setup = (actor: EquipmentActor | null = staff) => createTestApp('/api/equipment', createEquipmentRouter, actor);

beforeEach(() => { vi.resetAllMocks(); });

describe('equipment catalogue HTTP boundary', () => {
  it.each([
    ['get', '/api/equipment'], ['get', `/api/equipment/${typeId}`], ['get', `/api/equipment/availability?${window}`],
    ['get', `/api/equipment/${typeId}/availability?${window}`], ['post', '/api/equipment'],
    ['patch', `/api/equipment/${typeId}`],
  ] as const)('requires verified authentication for %s %s', async (method, path) => {
    const { app } = setup(null);
    const response = await request(app)[method](path).set('X-User-Role', 'TECHNICAL_SUPPORT_STAFF').send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'lists equipment for the signed-in %s with parsed filters', async (role) => {
      const { app, dependencies } = setup({ ...organiser, role });
      list.mockResolvedValue([projector]);
      const response = await request(app).get('/api/equipment?q=%20proj%20&category=AV');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [projector] });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(list).toHaveBeenCalledExactlyOnceWith(
        dependencies.pool, { ...organiser, role }, { q: 'proj', category: 'AV' },
      );
    },
  );

  it('rejects repeated list filters', async () => {
    const { app } = setup();
    const response = await request(app).get('/api/equipment?q=a&q=b');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_EQUIPMENT_LIST_FILTER');
    expect(list).not.toHaveBeenCalled();
  });

  it('returns one type and masks a hidden one as not found', async () => {
    const { app } = setup(organiser);
    get.mockResolvedValueOnce(projector).mockRejectedValueOnce(new EquipmentNotFoundError('EQUIPMENT_NOT_FOUND'));
    expect((await request(app).get(`/api/equipment/${typeId}`)).body).toEqual(projector);
    const hidden = await request(app).get(`/api/equipment/${typeId}`);
    expect(hidden.status).toBe(404);
    expect(hidden.body).toEqual({
      error: { code: 'EQUIPMENT_NOT_FOUND', message: 'The equipment type was not found.' },
    });
  });

  it.each(['not-a-uuid', "' OR 1=1--"])('rejects the invalid ID %s before persistence', async (id) => {
    const { app } = setup();
    for (const response of [
      await request(app).get(`/api/equipment/${encodeURIComponent(id)}`),
      await request(app).get(`/api/equipment/${encodeURIComponent(id)}/availability?${window}`),
      await request(app).patch(`/api/equipment/${encodeURIComponent(id)}`).send({ name: 'x' }),
    ]) {
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_EQUIPMENT_ID');
    }
    expect(get).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('routes /availability to the all-types lookup, not to an equipment ID', async () => {
    const { app, dependencies } = setup(organiser);
    allAvailability.mockResolvedValue([]);
    const response = await request(app).get(`/api/equipment/availability?${window}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      from: '2026-10-01T09:00:00.000Z', to: '2026-10-01T12:00:00.000Z', items: [],
    });
    expect(allAvailability).toHaveBeenCalledExactlyOnceWith(dependencies.pool, {
      from: new Date('2026-10-01T09:00:00Z'), to: new Date('2026-10-01T12:00:00Z'),
    });
    expect(get).not.toHaveBeenCalled();
  });

  it('shows inactive availability to technical support only', async () => {
    const result = {
      equipmentTypeId: typeId, from: 'a', to: 'b', totalQuantity: 4, reservedPeak: 3, available: 1,
    };
    availability.mockResolvedValue(result);
    const asStaff = await request(setup(staff).app).get(`/api/equipment/${typeId}/availability?${window}`);
    expect(asStaff.body).toEqual(result);
    await request(setup(organiser).app).get(`/api/equipment/${typeId}/availability?${window}`);
    expect(availability.mock.calls.map((call) => call[3])).toEqual([
      { includeInactive: true }, { includeInactive: false },
    ]);
  });

  it.each(['', '?from=2026-10-01T09:00:00Z', '?from=2026-10-02T09:00:00Z&to=2026-10-01T09:00:00Z'])(
    'rejects the availability window "%s"', async (query) => {
      const { app } = setup();
      for (const path of [`/api/equipment/availability${query}`, `/api/equipment/${typeId}/availability${query}`]) {
        const response = await request(app).get(path);
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_AVAILABILITY_WINDOW');
      }
      expect(availability).not.toHaveBeenCalled();
    },
  );

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'forbids the verified %s role from managing types', async (role) => {
      const { app } = setup({ ...organiser, role });
      const created = await request(app).post('/api/equipment')
        .set('X-User-Role', 'TECHNICAL_SUPPORT_STAFF').send({ name: 'Mic', totalQuantity: 1 });
      const patched = await request(app).patch(`/api/equipment/${typeId}`).send({ totalQuantity: 1 });
      expect([created.status, patched.status]).toEqual([403, 403]);
      expect(created.body.error.code).toBe('EQUIPMENT_FORBIDDEN');
      expect(create).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('creates and updates a type for technical support', async () => {
    const { app, dependencies } = setup();
    create.mockResolvedValue(projector);
    update.mockResolvedValue({ ...projector, totalQuantity: 6 });
    const created = await request(app).post('/api/equipment').send({ name: ' Projector ', totalQuantity: 4 });
    expect(created.status).toBe(201);
    expect(create).toHaveBeenCalledExactlyOnceWith(dependencies.pool, staff, {
      name: 'Projector', category: null, description: null, totalQuantity: 4, isActive: true,
    });
    const patched = await request(app).patch(`/api/equipment/${typeId}`).send({ totalQuantity: 6 });
    expect(patched.status).toBe(200);
    expect(patched.body.totalQuantity).toBe(6);
    expect(update).toHaveBeenCalledExactlyOnceWith(dependencies.pool, staff, typeId, { totalQuantity: 6 });
  });

  it('validates bodies before persistence', async () => {
    const { app } = setup();
    const created = await request(app).post('/api/equipment').send({ name: 'Mic', totalQuantity: -1 });
    const patched = await request(app).patch(`/api/equipment/${typeId}`).send({});
    expect([created.status, patched.status]).toEqual([400, 400]);
    expect(created.body.error.code).toBe('INVALID_EQUIPMENT_INPUT');
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ['EQUIPMENT_NAME_TAKEN', {}], ['EQUIPMENT_QUANTITY_IN_USE', { reservedPeak: 3 }],
  ] as const)('returns a %s conflict', async (code, details) => {
    const { app } = setup();
    update.mockRejectedValue(new EquipmentConflictError(code, 'Conflict.', details));
    const response = await request(app).patch(`/api/equipment/${typeId}`).send({ totalQuantity: 1 });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { ...details, code, message: 'Conflict.' } });
  });

  it.each(['authentication', 'persistence'] as const)(
    'conceals unexpected %s failures', async (source) => {
      const { app, dependencies, logger } = setup();
      const failure = new Error('postgresql://private-user:private-password@private-host/db');
      if (source === 'authentication') dependencies.authenticate.mockRejectedValue(failure);
      else list.mockRejectedValue(failure);
      const response = await request(app).get('/api/equipment');
      expect(response.status).toBe(500);
      expect(JSON.stringify(response.body)).not.toContain('private');
      expect(logger.error).toHaveBeenCalledExactlyOnceWith('Unexpected API error.');
    },
  );
});
