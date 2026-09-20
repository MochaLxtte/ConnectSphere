import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelEquipmentRequest, createEquipmentRequest, decideEquipmentRequest, listEquipmentRequests,
  updateEquipmentRequest,
} from '../../src/modules/equipment/equipment-requests.js';
import { createEquipmentRequestsRouter } from '../../src/modules/equipment/equipment-requests-router.js';
import {
  EquipmentConflictError, EquipmentForbiddenError, EquipmentNotFoundError,
} from '../../src/modules/equipment/errors.js';
import type { EquipmentActor, EquipmentRequestRecord } from '../../src/modules/equipment/types.js';
import { createTestApp } from './test-app.js';

vi.mock('../../src/modules/equipment/equipment-requests.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/equipment/equipment-requests.js')>();
  return {
    ...actual, listEquipmentRequests: vi.fn(), createEquipmentRequest: vi.fn(),
    updateEquipmentRequest: vi.fn(), cancelEquipmentRequest: vi.fn(), decideEquipmentRequest: vi.fn(),
  };
});

const list = vi.mocked(listEquipmentRequests);
const create = vi.mocked(createEquipmentRequest);
const update = vi.mocked(updateEquipmentRequest);
const cancel = vi.mocked(cancelEquipmentRequest);
const decide = vi.mocked(decideEquipmentRequest);

const eventRequestId = '10000000-0000-4000-8000-000000000001';
const equipmentTypeId = '40000000-0000-4000-8000-000000000001';
const requestId = '50000000-0000-4000-8000-000000000001';
const organiser: EquipmentActor = { id: '20000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const staff: EquipmentActor = { id: '20000000-0000-4000-8000-000000000001', role: 'TECHNICAL_SUPPORT_STAFF' };
const saved: EquipmentRequestRecord = {
  id: requestId, eventRequestId, equipmentTypeId, equipmentName: 'Projector', equipmentCategory: 'AV',
  requestedBy: organiser.id, quantity: 2, status: 'REQUESTED',
  startsAt: '2026-10-01T09:00:00.000Z', endsAt: '2026-10-01T12:00:00.000Z', notes: null,
  decidedBy: null, decidedAt: null, decisionReason: null,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
};
const base = '/api/equipment-requests';
const setup = (actor: EquipmentActor | null = organiser) => createTestApp(base, createEquipmentRequestsRouter, actor);

beforeEach(() => { vi.resetAllMocks(); });

describe('equipment requests HTTP boundary', () => {
  it.each([
    ['get', base], ['post', base], ['patch', `${base}/${requestId}`],
    ['post', `${base}/${requestId}/cancel`], ['post', `${base}/${requestId}/decision`],
  ] as const)('requires verified authentication for %s %s', async (method, path) => {
    const { app } = setup(null);
    const response = await request(app)[method](path).set('X-User-Id', organiser.id).send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each(['VENUE_STAFF', 'ATTENDEE'] as const)('forbids the %s role everywhere', async (role) => {
    const { app } = setup({ ...organiser, role });
    const responses = [
      await request(app).get(`${base}?eventRequestId=${eventRequestId}`),
      await request(app).post(base).send({ eventRequestId, equipmentTypeId, quantity: 1 }),
      await request(app).patch(`${base}/${requestId}`).send({ quantity: 1 }),
      await request(app).post(`${base}/${requestId}/cancel`),
      await request(app).post(`${base}/${requestId}/decision`).send({ decision: 'RESERVED' }),
    ];
    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403, 403]);
    expect(responses[0]!.body.error.code).toBe('EQUIPMENT_REQUEST_FORBIDDEN');
    for (const service of [list, create, update, cancel, decide]) expect(service).not.toHaveBeenCalled();
  });

  it('keeps writes and decisions with their own roles', async () => {
    const asStaff = setup(staff).app;
    expect((await request(asStaff).post(base).send({ eventRequestId, equipmentTypeId, quantity: 1 })).status).toBe(403);
    expect((await request(asStaff).patch(`${base}/${requestId}`).send({ quantity: 1 })).status).toBe(403);
    expect((await request(asStaff).post(`${base}/${requestId}/cancel`)).status).toBe(403);
    const asOrganiser = setup(organiser).app;
    const decision = await request(asOrganiser).post(`${base}/${requestId}/decision`)
      .set('X-User-Role', 'TECHNICAL_SUPPORT_STAFF').send({ decision: 'RESERVED' });
    expect(decision.status).toBe(403);
    for (const service of [create, update, cancel, decide]) expect(service).not.toHaveBeenCalled();
  });

  it('lists with the parsed filter and the verified actor', async () => {
    const { app, dependencies } = setup();
    list.mockResolvedValue({ scope: 'event', items: [saved] });
    const response = await request(app).get(`${base}?eventRequestId=${eventRequestId}&status=REQUESTED`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [saved] });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(list).toHaveBeenCalledExactlyOnceWith(
      dependencies.pool, organiser, { eventRequestId, status: 'REQUESTED' },
    );
  });

  it.each(['?eventRequestId=nope', '?status=PENDING', '?status=REQUESTED&status=RESERVED'])(
    'rejects the list filter %s', async (query) => {
      const { app } = setup(staff);
      const response = await request(app).get(`${base}${query}`);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_EQUIPMENT_REQUEST_FILTER');
      expect(list).not.toHaveBeenCalled();
    },
  );

  it('creates a request from the body without trusting identity fields', async () => {
    const { app, dependencies } = setup();
    create.mockResolvedValue(saved);
    const response = await request(app).post(base).send({ eventRequestId, equipmentTypeId, quantity: 2 });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(saved);
    expect(create).toHaveBeenCalledExactlyOnceWith(dependencies.pool, organiser, {
      eventRequestId, equipmentTypeId, quantity: 2, startsAt: null, endsAt: null, notes: null,
    });
    const spoofed = await request(app).post(base)
      .send({ eventRequestId, equipmentTypeId, quantity: 2, requestedBy: staff.id });
    expect(spoofed.status).toBe(400);
    expect(spoofed.body.error.code).toBe('INVALID_EQUIPMENT_REQUEST_INPUT');
    expect(create).toHaveBeenCalledOnce();
  });

  it('updates, cancels and decides with validated IDs and bodies', async () => {
    update.mockResolvedValue({ ...saved, quantity: 3 });
    cancel.mockResolvedValue({ ...saved, status: 'CANCELLED' });
    decide.mockResolvedValue({ ...saved, status: 'RESERVED' });
    const organiserApp = setup();
    const patched = await request(organiserApp.app).patch(`${base}/${requestId}`).send({ quantity: 3 });
    expect(patched.status).toBe(200);
    expect(update).toHaveBeenCalledExactlyOnceWith(organiserApp.dependencies.pool, organiser, requestId, { quantity: 3 });
    const cancelled = await request(organiserApp.app).post(`${base}/${requestId}/cancel`);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(cancel).toHaveBeenCalledExactlyOnceWith(organiserApp.dependencies.pool, organiser, requestId);

    const staffApp = setup(staff);
    const decided = await request(staffApp.app).post(`${base}/${requestId}/decision`)
      .send({ decision: 'REJECTED', reason: ' Out for repair ' });
    expect(decided.status).toBe(200);
    expect(decide).toHaveBeenCalledExactlyOnceWith(
      staffApp.dependencies.pool, staff, requestId, { decision: 'REJECTED', reason: 'Out for repair' },
    );
  });

  it('rejects invalid IDs and bodies before persistence', async () => {
    const organiserApp = setup().app;
    const staffApp = setup(staff).app;
    const responses = [
      await request(organiserApp).patch(`${base}/not-a-uuid`).send({ quantity: 1 }),
      await request(organiserApp).post(`${base}/not-a-uuid/cancel`),
      await request(staffApp).post(`${base}/not-a-uuid/decision`).send({ decision: 'RESERVED' }),
      await request(organiserApp).patch(`${base}/${requestId}`).send({ status: 'RESERVED' }),
      await request(staffApp).post(`${base}/${requestId}/decision`).send({ decision: 'REJECTED' }),
    ];
    expect(responses.map((response) => response.body.error.code)).toEqual([
      'INVALID_EQUIPMENT_REQUEST_ID', 'INVALID_EQUIPMENT_REQUEST_ID', 'INVALID_EQUIPMENT_REQUEST_ID',
      'INVALID_EQUIPMENT_REQUEST_INPUT', 'INVALID_EQUIPMENT_DECISION_INPUT',
    ]);
    expect(responses.every((response) => response.status === 400)).toBe(true);
    for (const service of [update, cancel, decide]) expect(service).not.toHaveBeenCalled();
  });

  it('masks unrelated callers as not found and reports related non-requesters as forbidden', async () => {
    const { app } = setup();
    list.mockRejectedValue(new EquipmentNotFoundError('EVENT_REQUEST_NOT_FOUND'));
    update.mockRejectedValueOnce(new EquipmentNotFoundError('EQUIPMENT_REQUEST_NOT_FOUND'))
      .mockRejectedValueOnce(new EquipmentForbiddenError('EQUIPMENT_REQUEST_FORBIDDEN', 'Requester only.'));
    const listed = await request(app).get(`${base}?eventRequestId=${eventRequestId}`);
    expect(listed.status).toBe(404);
    expect(listed.body).toEqual({
      error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
    });
    expect((await request(app).patch(`${base}/${requestId}`).send({ quantity: 1 })).status).toBe(404);
    expect((await request(app).patch(`${base}/${requestId}`).send({ quantity: 1 })).status).toBe(403);
  });

  it('returns the available quantity with an EQUIPMENT_UNAVAILABLE conflict', async () => {
    const { app } = setup(staff);
    decide.mockRejectedValue(new EquipmentConflictError('EQUIPMENT_UNAVAILABLE', 'Not enough.', { available: 1 }));
    const response = await request(app).post(`${base}/${requestId}/decision`).send({ decision: 'RESERVED' });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: { code: 'EQUIPMENT_UNAVAILABLE', message: 'Not enough.', available: 1 },
    });
  });

  it.each([
    'EQUIPMENT_QUANTITY_EXCEEDS_POOL', 'EVENT_NOT_ELIGIBLE_FOR_EQUIPMENT', 'EQUIPMENT_TYPE_INACTIVE',
  ] as const)('returns a %s conflict when creating', async (code) => {
    const { app } = setup();
    create.mockRejectedValue(new EquipmentConflictError(code, 'Conflict.'));
    const response = await request(app).post(base).send({ eventRequestId, equipmentTypeId, quantity: 2 });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { code, message: 'Conflict.' } });
  });

  it('conceals unexpected persistence failures', async () => {
    const { app, logger } = setup(staff);
    list.mockRejectedValue(new Error('postgresql://private-user:private-password@private-host/db'));
    const response = await request(app).get(`${base}?status=REQUESTED`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
