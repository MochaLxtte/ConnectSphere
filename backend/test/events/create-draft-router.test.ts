import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { HealthDatabase } from '../../src/db/pool.js';
import { createDraft, DraftCreateForbiddenError } from '../../src/modules/events/create-draft.js';
import { DraftUpdateInputError } from '../../src/modules/events/draft-update-input.js';
import type { QueueActor } from '../../src/modules/events/submitted-requests.js';
import type { SubmittedRequestsRouterDependencies } from '../../src/modules/events/submitted-requests-router.js';

vi.mock('../../src/modules/events/create-draft.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/modules/events/create-draft.js')>();
  return { ...actual, createDraft: vi.fn() };
});

const organiser: QueueActor = { id: '20000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const create = vi.mocked(createDraft);
const created = {
  id: '10000000-0000-4000-8000-000000000001', organiserId: organiser.id, coordinatorId: null,
  status: 'DRAFT' as const, name: 'Career Fair', purpose: null, description: null,
  startsAt: null, endsAt: null, expectedAttendance: null, venueRequirements: null,
  accessibilityNeeds: null, equipmentRequirements: null, registrationRequired: null,
  registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null,
  createdAt: '2026-09-19T00:00:00.000Z', updatedAt: '2026-09-19T00:00:00.000Z',
};

function setup(actor: QueueActor | null = organiser) {
  const query = vi.fn<HealthDatabase['query']>();
  const logger = { error: vi.fn() };
  const submittedRequests: SubmittedRequestsRouterDependencies = {
    pool: { query: vi.fn(), connect: vi.fn() },
    authenticate: vi.fn<SubmittedRequestsRouterDependencies['authenticate']>().mockResolvedValue(actor),
    canViewRequest: vi.fn().mockReturnValue(false),
    canReviewRequest: vi.fn().mockReturnValue(false),
  };
  const app = createApp({ database: { query }, submittedRequests, logger });
  return { app, submittedRequests, logger };
}

beforeEach(() => {
  create.mockReset();
});

describe('CF-02 POST /api/events (create a draft)', () => {
  it('creates a draft for the verified organiser', async () => {
    const { app, submittedRequests } = setup();
    create.mockResolvedValue(created);

    const response = await request(app).post('/api/events').send({ name: 'Career Fair' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(created);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(create).toHaveBeenCalledExactlyOnceWith(submittedRequests, {
      actor: organiser, input: { name: 'Career Fair' },
    });
  });

  it('accepts a request without a body', async () => {
    const { app } = setup();
    create.mockResolvedValue(created);
    const response = await request(app).post('/api/events');
    expect(response.status).toBe(201);
    expect(create.mock.calls[0]?.[1].actor).toEqual(organiser);
  });

  it('requires verified authentication', async () => {
    const { app } = setup(null);
    const response = await request(app).post('/api/events').send({ name: 'x' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'rejects the verified %s role before touching the database',
    async (role) => {
      const { app } = setup({ ...organiser, role });
      const response = await request(app).post('/api/events').send({ name: 'x' });
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('DRAFT_CREATE_FORBIDDEN');
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('returns 400 for invalid draft input', async () => {
    const { app } = setup();
    create.mockRejectedValue(new DraftUpdateInputError('Unsupported field: organiserId.'));
    const response = await request(app).post('/api/events').send({ organiserId: organiser.id });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_DRAFT_INPUT', message: 'Unsupported field: organiserId.' },
    });
  });

  it('maps a service-level refusal to 403', async () => {
    const { app } = setup();
    create.mockRejectedValue(new DraftCreateForbiddenError());
    const response = await request(app).post('/api/events').send({});
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('DRAFT_CREATE_FORBIDDEN');
  });

  it('hides unexpected failures behind the generic error', async () => {
    const { app, logger } = setup();
    create.mockRejectedValue(new Error('connection string leaked'));
    const response = await request(app).post('/api/events').send({});
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('leaked');
    expect(logger.error).toHaveBeenCalled();
  });
});
