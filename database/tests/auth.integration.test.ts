import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import {
  authenticateRequest,
  type SupabaseSessionAuth,
} from '../../backend/src/modules/auth/router.js';
import type { UserRole } from '../../backend/src/modules/auth/types.js';
import { migrate } from '../migrate.js';

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

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

async function provisionUser(role: UserRole = 'EVENT_ORGANISER') {
  const id = randomUUID();
  const supabaseUserId = randomUUID();
  const user = { id, email: `${id}@example.test`, displayName: 'Fixture member', role };
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, role, supabase_user_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, user.email, user.displayName, role, supabaseUserId],
  );
  return { user, supabaseUserId };
}

function createSessionApp(supabaseUserId: string) {
  // Only token verification is synthetic. Profile lookup and ownership use real PostgreSQL.
  const supabaseAuth: SupabaseSessionAuth = {
    verifyAccessToken: async () => ({
      uid: supabaseUserId, exp: Math.floor(Date.now() / 1000) + 3_600,
    }),
  };
  return createApp({
    database: pool,
    auth: { database: pool, supabaseAuth },
    submittedRequests: {
      pool,
      authenticate: (incoming) => authenticateRequest(pool, supabaseAuth, incoming),
      // These fixtures grant no coordinator access and do not establish product policy.
      canViewRequest: () => false,
      canReviewRequest: () => false,
    },
  });
}

describe('KAN-25 Supabase identity mapping in PostgreSQL', () => {
  it('login and me return the mapped application profile rather than the Supabase identity', async () => {
    const { user, supabaseUserId } = await provisionUser('EVENT_COORDINATOR');
    const session = request.agent(createSessionApp(supabaseUserId));
    const login = await session.post('/api/auth/login').send({ accessToken: 'fixture-token' });

    expect(login.status).toBe(200);
    expect(login.body).toEqual({ user });
    expect(login.body.user.id).not.toBe(supabaseUserId);
    const me = await session.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ user });
  });

  it('rejects an unmapped identity without creating an application account', async () => {
    const before = await pool.query('SELECT count(*)::integer AS count FROM app_users');
    const session = request.agent(createSessionApp(randomUUID()));
    const login = await session.post('/api/auth/login').send({ accessToken: 'fixture-token' });

    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_NOT_PROVISIONED');
    expect(login.headers['set-cookie']).toBeUndefined();
    expect((await session.get('/api/auth/me')).status).toBe(401);
    expect((await pool.query('SELECT count(*)::integer AS count FROM app_users')).rows)
      .toEqual(before.rows);
  });

  it('reads a changed application role on the next request using the same session', async () => {
    const { user, supabaseUserId } = await provisionUser();
    const session = request.agent(createSessionApp(supabaseUserId));
    expect((await session.post('/api/auth/login').send({ accessToken: 'fixture-token' })).status)
      .toBe(200);
    await pool.query("UPDATE app_users SET role = 'EVENT_COORDINATOR' WHERE id = $1", [user.id]);

    const me = await session.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ user: { ...user, role: 'EVENT_COORDINATOR' } });
  });

  it('prevents one Supabase identity from being mapped to two application users', async () => {
    const first = await provisionUser();
    const second = await provisionUser();

    await expect(pool.query('UPDATE app_users SET supabase_user_id = $1 WHERE id = $2', [
      first.supabaseUserId, second.user.id,
    ])).rejects.toMatchObject({ code: '23505' });
    const mapping = await pool.query('SELECT id FROM app_users WHERE supabase_user_id = $1', [
      first.supabaseUserId,
    ]);
    expect(mapping.rows).toEqual([{ id: first.user.id }]);
  });

  it('uses the mapped application identity to allow an owned draft and hide another organiser\'s draft', async () => {
    const owner = await provisionUser();
    const other = await provisionUser();
    const ownEventId = randomUUID();
    const otherEventId = randomUUID();
    await pool.query(
      `INSERT INTO event_requests (id, organiser_id, status)
       VALUES ($1, $2, 'DRAFT'), ($3, $4, 'DRAFT')`,
      [ownEventId, owner.user.id, otherEventId, other.user.id],
    );
    const session = request.agent(createSessionApp(owner.supabaseUserId));
    expect((await session.post('/api/auth/login').send({ accessToken: 'fixture-token' })).status)
      .toBe(200);

    const own = await session.get(`/api/events/${ownEventId}`);
    expect(own.status).toBe(200);
    expect(own.body).toMatchObject({
      id: ownEventId, organiserId: owner.user.id, status: 'DRAFT',
      actions: { canEditDraft: true, canMakeInitialDecision: false },
    });
    const forbidden = await session.get(`/api/events/${otherEventId}`);
    const missing = await session.get(`/api/events/${randomUUID()}`);
    expect(forbidden.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(forbidden.body).toEqual(missing.body);
  });
});
