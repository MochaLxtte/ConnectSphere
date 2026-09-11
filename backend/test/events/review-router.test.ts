import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { HealthDatabase } from '../../src/db/pool.js';
import {
  recordInitialReview,
  ReviewRequestNotFoundError,
  type ReviewActor,
  type SavedReview,
} from '../../src/modules/events/review-decision.js';
import { ReviewEligibilityError } from '../../src/modules/events/review-eligibility.js';
import type { ReviewRouterDependencies } from '../../src/modules/events/review-router.js';

vi.mock('../../src/modules/events/review-decision.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/events/review-decision.js')>();
  return { ...actual, recordInitialReview: vi.fn() };
});

const eventRequestId = '10000000-0000-4000-8000-000000000001';
const actor: ReviewActor = {
  id: '20000000-0000-4000-8000-000000000001',
  role: 'EVENT_COORDINATOR',
};
const endpoint = `/api/events/${eventRequestId}/reviews`;
const record = vi.mocked(recordInitialReview);

function setup(reviewer: ReviewActor | null = actor) {
  const query = vi.fn<HealthDatabase['query']>();
  const logger = { error: vi.fn() };
  const reviews = {
    pool: { connect() { throw new Error('HTTP boundary tests must not open a database connection.'); } },
    authenticate: vi.fn<ReviewRouterDependencies['authenticate']>().mockResolvedValue(reviewer),
    canReviewRequest: vi.fn<ReviewRouterDependencies['canReviewRequest']>().mockReturnValue(false),
  };
  const app = createApp({ database: { query }, reviews, logger });
  return { app, reviews, logger, query };
}

beforeEach(() => { record.mockReset(); });

describe('KAN-36 review HTTP boundary', () => {
  it.each(['APPROVED', 'REJECTED'] as const)(
    'returns the saved %s decision using verified identity and the supplied review policy',
    async (decision) => {
      const { app, reviews } = setup();
      const saved: SavedReview = {
        reviewId: '30000000-0000-4000-8000-000000000001',
        eventRequestId,
        reviewedBy: actor.id,
        decision,
        reason: 'Review explanation',
      };
      record.mockResolvedValue(saved);

      const response = await request(app).post(endpoint)
        .set('Authorization', 'Bearer test-verifier-input')
        .set('X-User-Id', 'client-supplied-user')
        .set('X-User-Role', 'EVENT_ORGANISER')
        .send({ decision, reason: '  Review explanation  ' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(saved);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(reviews.authenticate).toHaveBeenCalledOnce();
      expect(reviews.authenticate.mock.calls[0]![0].headers.authorization)
        .toBe('Bearer test-verifier-input');
      expect(record).toHaveBeenCalledExactlyOnceWith(reviews, {
        eventRequestId, reviewer: actor, input: { decision, reason: 'Review explanation' },
      });
    },
  );

  it('requires verified authentication even when identity headers are supplied', async () => {
    const { app } = setup(null);
    const response = await request(app).post(endpoint)
      .set('X-User-Id', actor.id).set('X-User-Role', actor.role)
      .send({ decision: 'APPROVED' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(record).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'rejects the verified %s role before accessing the request',
    async (role) => {
      const { app } = setup({ ...actor, role });
      const response = await request(app).post(endpoint)
        .set('X-User-Role', 'EVENT_COORDINATOR').send({ decision: 'APPROVED' });
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('REVIEW_FORBIDDEN');
      expect(record).not.toHaveBeenCalled();
    },
  );

  it.each(['not-a-uuid', '10000000-0000-4000-8000-00000000000', "' OR 1=1--"])(
    'rejects an invalid request ID before persistence: %s',
    async (id) => {
      const { app } = setup();
      const response = await request(app).post(`/api/events/${encodeURIComponent(id)}/reviews`)
        .send({ decision: 'APPROVED' });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
      expect(record).not.toHaveBeenCalled();
    },
  );

  it.each([
    { decision: 'APPROVED', reviewedBy: actor.id },
    { decision: 'REJECTED', status: 'APPROVED' },
    { decision: 'APPROVED', role: 'EVENT_COORDINATOR' },
    { decision: 'DRAFT' },
    { decision: 'REJECTED', reason: 123 },
  ])('validates the body before persistence: %j', async (body) => {
    const { app } = setup();
    const response = await request(app).post(endpoint).send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REVIEW_INPUT');
    expect(record).not.toHaveBeenCalled();
  });

  it('does not reveal whether an inaccessible request exists', async () => {
    const { app } = setup();
    record.mockRejectedValueOnce(new ReviewRequestNotFoundError())
      .mockRejectedValueOnce(new ReviewEligibilityError('REVIEW_FORBIDDEN', 'Internal policy detail'));
    const missing = await request(app).post(endpoint).send({ decision: 'APPROVED' });
    const forbidden = await request(app).post(endpoint).send({ decision: 'APPROVED' });
    expect(missing.status).toBe(404);
    expect(forbidden.status).toBe(missing.status);
    expect(forbidden.body).toEqual(missing.body);
    expect(missing.body).toEqual({
      error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
    });
  });

  it.each(['REQUEST_NOT_REVIEWABLE', 'REVIEW_ALREADY_DECIDED'] as const)(
    'returns a conflict for an authorised request with %s',
    async (code) => {
      const { app } = setup();
      record.mockRejectedValue(new ReviewEligibilityError(code, 'Review state conflict.'));
      const response = await request(app).post(endpoint).send({ decision: 'APPROVED' });
      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: { code, message: 'Review state conflict.' } });
    },
  );

  it.each(['authentication', 'persistence'] as const)(
    'conceals unexpected %s failures from responses and logs',
    async (source) => {
      const { app, reviews, logger } = setup();
      const failure = new Error('postgresql://private-user:private-password@private-host/db');
      if (source === 'authentication') reviews.authenticate.mockRejectedValue(failure);
      else record.mockRejectedValue(failure);
      const response = await request(app).post(endpoint).send({ decision: 'APPROVED' });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      });
      expect(logger.error.mock.calls).toEqual([['Unexpected API error.']]);
      if (source === 'authentication') expect(record).not.toHaveBeenCalled();
    },
  );

  it('keeps review writes unavailable when authentication and policy are not configured', async () => {
    const query = vi.fn<HealthDatabase['query']>();
    const app = createApp({ database: { query } });
    const response = await request(app).post(endpoint).send({ decision: 'APPROVED' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(query).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
});
