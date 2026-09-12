import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { HealthDatabase } from '../../src/db/pool.js';
import {
  listOwnedDrafts,
  listReviewableRequests,
  type QueueActor,
} from '../../src/modules/events/submitted-requests.js';
import type { SubmittedRequestsRouterDependencies } from '../../src/modules/events/submitted-requests-router.js';
import { updateOwnedDraft, DraftRequestNotFoundError } from '../../src/modules/events/update-draft.js';
import { DraftEligibilityError } from '../../src/modules/events/draft-eligibility.js';
import { DraftUpdateInputError } from '../../src/modules/events/draft-update-input.js';
import { submitEventRequest, SubmitRequestNotFoundError } from '../../src/modules/events/submit-request.js';
import { SubmitEligibilityError } from '../../src/modules/events/submit-eligibility.js';
import { SubmissionValidationError } from '../../src/modules/events/submit-input.js';

vi.mock('../../src/modules/events/submitted-requests.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/modules/events/submitted-requests.js')>();
  return { ...actual, listReviewableRequests: vi.fn(), listOwnedDrafts: vi.fn() };
});

vi.mock('../../src/modules/events/update-draft.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/modules/events/update-draft.js')>();
  return { ...actual, updateOwnedDraft: vi.fn() };
});

vi.mock('../../src/modules/events/submit-request.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/modules/events/submit-request.js')>();
  return { ...actual, submitEventRequest: vi.fn() };
});

const coordinator: QueueActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const organiser: QueueActor = { id: '20000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };
const requestId = '10000000-0000-4000-8000-000000000001';
const list = vi.mocked(listReviewableRequests);
const ownedDrafts = vi.mocked(listOwnedDrafts);
const updateDraft = vi.mocked(updateOwnedDraft);
const submitRequest = vi.mocked(submitEventRequest);

function setup(actor: QueueActor | null = coordinator) {
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
  list.mockReset();
  ownedDrafts.mockReset();
  updateDraft.mockReset();
  submitRequest.mockReset();
});

describe('KAN-33 GET /api/events (review queue)', () => {
  it('returns the queue for an authenticated coordinator', async () => {
    const { app, submittedRequests } = setup();
    const items = [{ id: requestId, name: 'Sample', status: 'SUBMITTED' as const,
      createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z' }];
    list.mockResolvedValue(items);

    const response = await request(app).get('/api/events');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(list).toHaveBeenCalledExactlyOnceWith(submittedRequests, coordinator);
  });

  it('requires verified authentication', async () => {
    const { app } = setup(null);
    const response = await request(app).get('/api/events');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(list).not.toHaveBeenCalled();
  });

  it.each(['VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'rejects the verified %s role before querying the database',
    async (role) => {
      const { app } = setup({ ...coordinator, role });
      const response = await request(app).get('/api/events');
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('VIEW_FORBIDDEN');
      expect(list).not.toHaveBeenCalled();
      expect(ownedDrafts).not.toHaveBeenCalled();
    },
  );

  it('returns an empty list rather than an error when nothing is reviewable', async () => {
    const { app } = setup();
    list.mockResolvedValue([]);
    const response = await request(app).get('/api/events');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });
});

describe('KAN-34 GET /api/events (organiser\'s own drafts)', () => {
  it('returns only the organiser\'s own saved drafts', async () => {
    const { app, submittedRequests } = setup(organiser);
    const items = [{ id: requestId, name: 'My draft', status: 'DRAFT' as const,
      createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z' }];
    ownedDrafts.mockResolvedValue(items);

    const response = await request(app).get('/api/events');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(ownedDrafts).toHaveBeenCalledExactlyOnceWith(submittedRequests, organiser);
    expect(list).not.toHaveBeenCalled();
  });

  it('returns an empty list when the organiser has no saved drafts', async () => {
    const { app } = setup(organiser);
    ownedDrafts.mockResolvedValue([]);
    const response = await request(app).get('/api/events');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });
});

describe('KAN-34 PATCH /api/events/:id (edit a draft)', () => {
  it('saves changes to an owned draft', async () => {
    const { app, submittedRequests } = setup(organiser);
    const updated = { id: requestId, organiserId: organiser.id, coordinatorId: null, status: 'DRAFT' as const,
      name: 'Updated name', purpose: null, description: null, startsAt: null, endsAt: null,
      expectedAttendance: null, venueRequirements: null, accessibilityNeeds: null,
      equipmentRequirements: null, registrationRequired: null,
      createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-08T00:00:00Z' };
    updateDraft.mockResolvedValue(updated);

    const response = await request(app).patch(`/api/events/${requestId}`).send({ name: 'Updated name' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(updated);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(updateDraft).toHaveBeenCalledExactlyOnceWith(submittedRequests, {
      eventRequestId: requestId, actor: organiser, input: { name: 'Updated name' },
    });
  });

  it('requires verified authentication', async () => {
    const { app } = setup(null);
    const response = await request(app).patch(`/api/events/${requestId}`).send({ name: 'x' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(updateDraft).not.toHaveBeenCalled();
  });

  it.each(['EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'rejects the verified %s role before touching the database',
    async (role) => {
      const { app } = setup({ ...organiser, role });
      const response = await request(app).patch(`/api/events/${requestId}`).send({ name: 'x' });
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('DRAFT_EDIT_FORBIDDEN');
      expect(updateDraft).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid UUID before calling the service', async () => {
    const { app } = setup(organiser);
    const response = await request(app).patch('/api/events/not-a-uuid').send({ name: 'x' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
    expect(updateDraft).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid draft update input', async () => {
    const { app } = setup(organiser);
    updateDraft.mockRejectedValue(new DraftUpdateInputError('name must be text or null.'));
    const response = await request(app).patch(`/api/events/${requestId}`).send({ name: 42 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DRAFT_UPDATE');
  });

  it('masks a missing request as unavailable', async () => {
    const { app } = setup(organiser);
    updateDraft.mockRejectedValue(new DraftRequestNotFoundError());
    const response = await request(app).patch(`/api/events/${requestId}`).send({ name: 'x' });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
    });
  });

  it('masks another organiser\'s draft the same way as a missing request', async () => {
    const { app } = setup(organiser);
    updateDraft.mockRejectedValue(
      new DraftEligibilityError('DRAFT_EDIT_FORBIDDEN', 'You are not authorised to edit this event request.'),
    );
    const response = await request(app).patch(`/api/events/${requestId}`).send({ name: 'x' });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
    });
  });

  it('refuses to edit a request that is no longer a draft', async () => {
    const { app } = setup(organiser);
    updateDraft.mockRejectedValue(
      new DraftEligibilityError('DRAFT_NOT_EDITABLE', 'This event request is no longer a draft and cannot be edited.'),
    );
    const response = await request(app).patch(`/api/events/${requestId}`).send({ name: 'x' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DRAFT_NOT_EDITABLE');
  });
});

describe('KAN-6 POST /api/events/:id/submit', () => {
  it('submits a ready draft', async () => {
    const { app, submittedRequests } = setup(organiser);
    const submitted = { id: requestId, organiserId: organiser.id, coordinatorId: null, status: 'SUBMITTED' as const,
      name: 'Career Fair', purpose: 'Recruitment', description: null,
      startsAt: '2026-10-01T09:00:00.000Z', endsAt: '2026-10-01T17:00:00.000Z',
      expectedAttendance: 250, venueRequirements: 'Hall A', accessibilityNeeds: null,
      equipmentRequirements: null, registrationRequired: null,
      createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-08T00:00:00Z' };
    submitRequest.mockResolvedValue(submitted);

    const response = await request(app).post(`/api/events/${requestId}/submit`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(submitted);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(submitRequest).toHaveBeenCalledExactlyOnceWith(submittedRequests, {
      eventRequestId: requestId, actor: organiser,
    });
  });

  it('requires verified authentication', async () => {
    const { app } = setup(null);
    const response = await request(app).post(`/api/events/${requestId}/submit`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(submitRequest).not.toHaveBeenCalled();
  });

  it.each(['EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'rejects the verified %s role before touching the database',
    async (role) => {
      const { app } = setup({ ...organiser, role });
      const response = await request(app).post(`/api/events/${requestId}/submit`);
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('SUBMIT_FORBIDDEN');
      expect(submitRequest).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid UUID before calling the service', async () => {
    const { app } = setup(organiser);
    const response = await request(app).post('/api/events/not-a-uuid/submit');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
    expect(submitRequest).not.toHaveBeenCalled();
  });

  it('returns 400 with the missing fields when the draft is incomplete', async () => {
    const { app } = setup(organiser);
    submitRequest.mockRejectedValue(new SubmissionValidationError(['purpose', 'venueRequirements']));
    const response = await request(app).post(`/api/events/${requestId}/submit`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('SUBMISSION_INCOMPLETE');
    expect(response.body.error.missingFields).toEqual(['purpose', 'venueRequirements']);
  });

  it('masks a missing request as unavailable', async () => {
    const { app } = setup(organiser);
    submitRequest.mockRejectedValue(new SubmitRequestNotFoundError());
    const response = await request(app).post(`/api/events/${requestId}/submit`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
    });
  });

  it('masks another organiser\'s draft the same way as a missing request', async () => {
    const { app } = setup(organiser);
    submitRequest.mockRejectedValue(
      new SubmitEligibilityError('SUBMIT_FORBIDDEN', 'You are not authorised to submit this event request.'),
    );
    const response = await request(app).post(`/api/events/${requestId}/submit`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
    });
  });

  it('refuses to submit a request that is not a draft', async () => {
    const { app } = setup(organiser);
    submitRequest.mockRejectedValue(
      new SubmitEligibilityError('REQUEST_NOT_SUBMITTABLE', 'This event request is not a draft and cannot be submitted.'),
    );
    const response = await request(app).post(`/api/events/${requestId}/submit`);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('REQUEST_NOT_SUBMITTABLE');
  });
});
