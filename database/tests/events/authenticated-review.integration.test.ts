import { randomBytes, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import { EVENT_STATUSES, type EventStatus } from '../../../backend/src/modules/events/types.js';
import { migrate } from '../../migrate.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
const pool = new pg.Pool({
  connectionString: scopedUrl.toString(),
  connectionTimeoutMillis: 5_000,
  statement_timeout: 5_000,
});
const supabaseUrl = 'https://auth-fixture.example.test';
const secret = randomBytes(32).toString('hex');
const signingKey = new TextEncoder().encode(secret);
// Exercise the same factory, token verifier and assignment policy used by server.ts.
// Locally signed tokens do not exercise hosted Supabase sign-in or its JWKS service.
const app = createRuntimeApp({ pool, isProduction: false });

beforeAll(async () => {
  vi.stubEnv('SUPABASE_URL', supabaseUrl);
  vi.stubEnv('SUPABASE_JWT_SECRET', secret);
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
});

afterAll(async () => {
  try {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    try {
      await admin.end();
    } finally {
      vi.unstubAllEnvs();
    }
  }
});

async function provisionUser(role: UserRole) {
  const id = randomUUID();
  const supabaseUserId = randomUUID();
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, role, supabase_user_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, `${id}@example.test`, 'Fixture member', role, supabaseUserId],
  );
  return { id, supabaseUserId, role };
}

async function accessToken(
  supabaseUserId: string,
  options: { expiresAt?: number; key?: Uint8Array; claims?: Record<string, unknown> } = {},
) {
  return new SignJWT({ role: 'authenticated', ...options.claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(`${supabaseUrl}/auth/v1`)
    .setSubject(supabaseUserId)
    .setIssuedAt()
    .setExpirationTime(options.expiresAt ?? Math.floor(Date.now() / 1000) + 3_600)
    .sign(options.key ?? signingKey);
}

async function signIn(
  user: Awaited<ReturnType<typeof provisionUser>>,
  claims?: Record<string, unknown>,
) {
  const session = request.agent(app);
  const login = await session.post('/api/auth/login').send({
    accessToken: await accessToken(user.supabaseUserId, { claims: claims ?? {} }),
  });
  expect(login.status).toBe(200);
  expect(login.body.user).toMatchObject({ id: user.id, role: user.role });
  expect(login.body.user.id).not.toBe(user.supabaseUserId);
  return session;
}

async function createEvent(
  organiserId: string,
  coordinatorId: string | null,
  status: EventStatus = 'SUBMITTED',
) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO event_requests (id, organiser_id, coordinator_id, status)
     VALUES ($1, $2, $3, $4)`,
    [id, organiserId, coordinatorId, status],
  );
  return id;
}

async function readState(id: string) {
  const event = await pool.query(
    'SELECT status, coordinator_id, updated_at FROM event_requests WHERE id = $1', [id],
  );
  const reviews = await pool.query(
    `SELECT id, event_request_id, reviewed_by, decision, reason
     FROM event_reviews WHERE event_request_id = $1`, [id],
  );
  return { event: event.rows[0], reviews: reviews.rows };
}

describe('KAN-16 / KAN-25 / KAN-33 / KAN-36 authenticated event workflow', () => {
  it('requires login on every mounted event endpoint', async () => {
    const id = randomUUID();
    const attempts = [
      request(app).get('/api/events'),
      request(app).get('/api/events?scope=all'),
      request(app).get(`/api/events/${id}`),
      request(app).patch(`/api/events/${id}`).send({ name: 'Draft update' }),
      request(app).post(`/api/events/${id}/submit`).send({}),
      request(app).post(`/api/events/${id}/reviews`).send({ decision: 'APPROVED' }),
    ];
    for (const attempt of attempts) {
      const response = await attempt;
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });

  it('rejects invalid signatures and expired tokens at login and on event requests', async () => {
    const coordinator = await provisionUser('EVENT_COORDINATOR');
    const tokens = [
      await accessToken(coordinator.supabaseUserId, { key: randomBytes(32) }),
      await accessToken(coordinator.supabaseUserId, {
        expiresAt: Math.floor(Date.now() / 1000) - 60,
      }),
    ];
    for (const token of tokens) {
      const login = await request(app).post('/api/auth/login').send({ accessToken: token });
      expect(login.status).toBe(401);
      expect(login.headers['set-cookie']).toBeUndefined();
      const queue = await request(app).get('/api/events')
        .set('Cookie', `connectsphere_session=${token}`);
      expect(queue.status).toBe(401);
      const decision = await request(app).post(`/api/events/${randomUUID()}/reviews`)
        .set('Cookie', `connectsphere_session=${token}`).send({ decision: 'APPROVED' });
      expect(decision.status).toBe(401);
    }
  });

  it('KAN-16 lists every owned status newest first while preserving both draft-list forms', async () => {
    const organiser = await provisionUser('EVENT_ORGANISER');
    const otherOrganiser = await provisionUser('EVENT_ORGANISER');
    const createdAt = '2026-09-01T00:00:00.000Z';
    const owned = [];
    for (const [index, status] of EVENT_STATUSES.entries()) {
      const id = await createEvent(organiser.id, null, status);
      await createEvent(otherOrganiser.id, null, status);
      const name = status === 'DRAFT' ? null : `${status} request`;
      const updatedAt = `2026-09-${String(10 + index).padStart(2, '0')}T00:00:00.000Z`;
      await pool.query(
        'UPDATE event_requests SET name = $1, created_at = $2, updated_at = $3 WHERE id = $4',
        [name, createdAt, updatedAt, id],
      );
      owned.push({ id, name, status, createdAt, updatedAt });
    }
    const session = await signIn(organiser);

    const all = await session.get('/api/events')
      .query({ scope: 'all', organiserId: otherOrganiser.id });
    expect(all.status).toBe(200);
    expect(all.headers['cache-control']).toBe('no-store');
    expect(all.body).toEqual({ items: [...owned].reverse() });
    for (const path of ['/api/events', '/api/events?scope=drafts']) {
      const drafts = await session.get(path);
      expect(drafts.status).toBe(200);
      expect(drafts.body).toEqual({ items: owned.filter(item => item.status === 'DRAFT') });
    }
  });

  it('KAN-16 returns an empty list for an organiser with no requests', async () => {
    const organiser = await provisionUser('EVENT_ORGANISER');
    const otherOrganiser = await provisionUser('EVENT_ORGANISER');
    await createEvent(otherOrganiser.id, null);
    const session = await signIn(organiser);

    const response = await session.get('/api/events?scope=all');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });

  it.each(['VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'KAN-16 denies the all-status list to %s accounts',
    async (role) => {
      const session = await signIn(await provisionUser(role));
      const response = await session.get('/api/events?scope=all');
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('VIEW_FORBIDDEN');
    },
  );

  it('limits the coordinator queue to assigned pending requests and excludes drafts', async () => {
    const organiser = await provisionUser('EVENT_ORGANISER');
    const coordinator = await provisionUser('EVENT_COORDINATOR');
    const otherCoordinator = await provisionUser('EVENT_COORDINATOR');
    const assigned = await createEvent(organiser.id, coordinator.id);
    await createEvent(organiser.id, otherCoordinator.id);
    await createEvent(organiser.id, null);
    await createEvent(organiser.id, coordinator.id, 'DRAFT');
    await createEvent(organiser.id, coordinator.id, 'APPROVED');
    const session = await signIn(coordinator);

    for (const scope of ['all', 'drafts', '']) {
      const expanded = await session.get('/api/events').query({ scope });
      expect(expanded.status).toBe(400);
      expect(expanded.body.error.code).toBe('INVALID_EVENT_LIST_SCOPE');
    }
    const queue = await session.get('/api/events');
    expect(queue.status).toBe(200);
    expect(queue.body.items.map((item: { id: string }) => item.id)).toEqual([assigned]);
    const detail = await session.get(`/api/events/${assigned}`);
    expect(detail.status).toBe(200);
    expect(detail.body.actions).toEqual({ canEditDraft: false, canMakeInitialDecision: true });
  });

  it.each(['APPROVED', 'REJECTED'] as const)(
    'records %s once, removes it from the queue and keeps the outcome visible to its owner and coordinator',
    async (decision) => {
      const organiser = await provisionUser('EVENT_ORGANISER');
      const coordinator = await provisionUser('EVENT_COORDINATOR');
      const id = await createEvent(organiser.id, coordinator.id);
      const reviewer = await signIn(coordinator);
      const owner = await signIn(organiser);

      const pendingList = await owner.get('/api/events?scope=all');
      expect(pendingList.status).toBe(200);
      expect(pendingList.body.items).toEqual([expect.objectContaining({ id, status: 'SUBMITTED' })]);
      const saved = await reviewer.post(`/api/events/${id}/reviews`)
        .send({ decision, reason: '  Review completed.  ' });
      expect(saved.status).toBe(201);
      expect(saved.body).toMatchObject({ eventRequestId: id, reviewedBy: coordinator.id, decision });
      const state = await readState(id);
      expect(state.event.status).toBe(decision);
      expect(state.reviews).toEqual([{
        id: saved.body.reviewId, event_request_id: id, reviewed_by: coordinator.id,
        decision, reason: 'Review completed.',
      }]);

      for (const reader of [owner, reviewer]) {
        const detail = await reader.get(`/api/events/${id}`);
        expect(detail.status).toBe(200);
        expect(detail.body).toMatchObject({
          id, status: decision,
          review: { reviewId: saved.body.reviewId, decision, reason: 'Review completed.' },
          actions: { canEditDraft: false, canMakeInitialDecision: false },
        });
      }
      const decidedList = await owner.get('/api/events?scope=all');
      expect(decidedList.status).toBe(200);
      expect(decidedList.body.items).toEqual([expect.objectContaining({ id, status: decision })]);
      expect((await reviewer.get('/api/events')).body.items).toEqual([]);
      const repeat = await reviewer.post(`/api/events/${id}/reviews`)
        .send({ decision: decision === 'APPROVED' ? 'REJECTED' : 'APPROVED' });
      expect(repeat.status).toBe(409);
      expect(await readState(id)).toEqual(state);
    },
  );

  it('hides requests assigned elsewhere and unassigned requests without recording a decision', async () => {
    const organiser = await provisionUser('EVENT_ORGANISER');
    const coordinator = await provisionUser('EVENT_COORDINATOR');
    const otherCoordinator = await provisionUser('EVENT_COORDINATOR');
    const ids = [
      await createEvent(organiser.id, otherCoordinator.id),
      await createEvent(organiser.id, null),
    ];
    const session = await signIn(coordinator);
    const missing = await session.get(`/api/events/${randomUUID()}`);
    expect(missing.status).toBe(404);

    for (const id of ids) {
      const before = await readState(id);
      const detail = await session.get(`/api/events/${id}`);
      const decision = await session.post(`/api/events/${id}/reviews`).send({ decision: 'APPROVED' });
      expect(detail.status).toBe(404);
      expect(decision.status).toBe(404);
      expect(detail.body).toEqual(missing.body);
      expect(decision.body).toEqual(missing.body);
      expect(await readState(id)).toEqual(before);
    }
  });

  it('uses the application role despite coordinator claims, headers or body fields supplied by an organiser', async () => {
    const organiser = await provisionUser('EVENT_ORGANISER');
    const coordinator = await provisionUser('EVENT_COORDINATOR');
    const id = await createEvent(organiser.id, coordinator.id);
    const before = await readState(id);
    const session = await signIn(organiser, {
      role: 'EVENT_COORDINATOR',
      app_metadata: { role: 'EVENT_COORDINATOR' },
      user_metadata: { id: coordinator.id, role: 'EVENT_COORDINATOR' },
    });

    const decision = await session.post(`/api/events/${id}/reviews`)
      .set('X-User-Id', coordinator.id).set('X-User-Role', 'EVENT_COORDINATOR')
      .send({ decision: 'APPROVED', reviewedBy: coordinator.id, role: 'EVENT_COORDINATOR' });
    expect(decision.status).toBe(403);
    expect(decision.body.error.code).toBe('REVIEW_FORBIDDEN');
    expect(await readState(id)).toEqual(before);
  });

  it('prevents the assigned coordinator from deciding a draft', async () => {
    const organiser = await provisionUser('EVENT_ORGANISER');
    const coordinator = await provisionUser('EVENT_COORDINATOR');
    const id = await createEvent(organiser.id, coordinator.id, 'DRAFT');
    const before = await readState(id);
    const session = await signIn(coordinator);

    expect((await session.get(`/api/events/${id}`)).status).toBe(404);
    const decision = await session.post(`/api/events/${id}/reviews`).send({ decision: 'REJECTED' });
    expect(decision.status).toBe(409);
    expect(decision.body.error.code).toBe('REQUEST_NOT_REVIEWABLE');
    expect(await readState(id)).toEqual(before);
  });

  it('rechecks assignment when submitting a decision after the request was viewed', async () => {
    const organiser = await provisionUser('EVENT_ORGANISER');
    const previousCoordinator = await provisionUser('EVENT_COORDINATOR');
    const nextCoordinator = await provisionUser('EVENT_COORDINATOR');
    const id = await createEvent(organiser.id, previousCoordinator.id);
    const previous = await signIn(previousCoordinator);
    expect((await previous.get(`/api/events/${id}`)).body.actions.canMakeInitialDecision).toBe(true);
    await pool.query('UPDATE event_requests SET coordinator_id = $1 WHERE id = $2', [nextCoordinator.id, id]);
    const reassigned = await readState(id);

    const staleDecision = await previous.post(`/api/events/${id}/reviews`).send({ decision: 'APPROVED' });
    expect(staleDecision.status).toBe(404);
    expect((await previous.get(`/api/events/${id}`)).status).toBe(404);
    expect(await readState(id)).toEqual(reassigned);
    const next = await signIn(nextCoordinator);
    const decision = await next.post(`/api/events/${id}/reviews`).send({ decision: 'APPROVED' });
    expect(decision.status).toBe(201);
    expect(decision.body.reviewedBy).toBe(nextCoordinator.id);
    expect((await readState(id)).reviews).toHaveLength(1);
  });

  it('preserves organiser ownership for draft editing and submission', async () => {
    const organiser = await provisionUser('EVENT_ORGANISER');
    const otherOrganiser = await provisionUser('EVENT_ORGANISER');
    const coordinator = await provisionUser('EVENT_COORDINATOR');
    // KAN-29 requires an explicitly available profile; other fixture accounts stay opted out.
    await pool.query('UPDATE app_users SET coordinator_available = true WHERE id = $1', [coordinator.id]);
    const id = await createEvent(organiser.id, null, 'DRAFT');
    const otherId = await createEvent(otherOrganiser.id, null, 'DRAFT');
    const session = await signIn(organiser);
    expect((await session.get('/api/events')).body.items.map((item: { id: string }) => item.id))
      .toEqual([id]);
    expect((await session.get(`/api/events/${id}`)).body.actions.canEditDraft).toBe(true);
    const changed = await session.patch(`/api/events/${id}`).send({
      name: 'Community workshop', purpose: 'Share skills',
      startsAt: '2026-10-01T10:00:00.000Z', endsAt: '2026-10-01T12:00:00.000Z',
      expectedAttendance: 20, venueRequirements: 'Workshop room',
    });
    expect(changed.status).toBe(200);
    const submitted = await session.post(`/api/events/${id}/submit`).send({});
    expect(submitted.status).toBe(200);
    expect(submitted.body).toMatchObject({ id, organiserId: organiser.id, coordinatorId: coordinator.id, status: 'SUBMITTED' });
    expect(submitted.body.coordinatorId).not.toBe(coordinator.supabaseUserId);
    const submittedState = await readState(id);
    expect(submittedState.event).toMatchObject({ status: 'SUBMITTED', coordinator_id: coordinator.id });
    expect(submittedState.reviews).toEqual([]);
    const reviewer = await signIn(coordinator);
    expect((await reviewer.get('/api/events')).body.items.map((item: { id: string }) => item.id)).toEqual([id]);
    expect((await reviewer.get(`/api/events/${id}`)).body.actions.canMakeInitialDecision).toBe(true);

    const before = await readState(otherId);
    expect((await session.get(`/api/events/${otherId}`)).status).toBe(404);
    expect((await session.patch(`/api/events/${otherId}`).send({ name: 'Not owned' })).status).toBe(404);
    expect((await session.post(`/api/events/${otherId}/submit`).send({})).status).toBe(404);
    expect(await readState(otherId)).toEqual(before);
  });
});
