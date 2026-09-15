import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { SupabaseSessionAuth } from '../src/modules/auth/router.js';
import type { AuthDatabase } from '../src/modules/auth/user-repository.js';

const now = 1_900_000_000;
const supabaseUid = '30000000-0000-4000-8000-000000000001';
const user = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'organiser@example.test',
  display_name: 'Sample Organiser',
  role: 'EVENT_ORGANISER',
};
const profile = {
  id: user.id, email: user.email, displayName: user.display_name, role: user.role,
};

function setup({ isProduction = false, exp = now + 3600, role = user.role } = {}) {
  const database: AuthDatabase = {
    async query<Row extends Record<string, unknown>>(_sql: string, values?: readonly unknown[]) {
      return { rows: values?.[0] === supabaseUid ? [{ ...user, role }] as unknown as Row[] : [] };
    },
  };
  const query = vi.spyOn(database, 'query');
  const supabaseAuth: SupabaseSessionAuth = {
    verifyAccessToken: vi.fn(async (token: string) => {
      if (token === 'valid-access-token') return { uid: supabaseUid, exp };
      if (token === 'unmapped-access-token') {
        return { uid: '30000000-0000-4000-8000-000000000002', exp };
      }
      throw Object.assign(new Error('Invalid access token'), {
        code: token === 'expired-access-token' ? 'ERR_JWT_EXPIRED' : 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
      });
    }),
  };
  const logger = { error: vi.fn() };
  const app = createApp({
    database: { query: vi.fn().mockResolvedValue({ rows: [] }) },
    auth: { database, supabaseAuth, isProduction },
    logger,
  });
  return { app, query, supabaseAuth, logger };
}

beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(now * 1000); });
afterEach(() => { vi.restoreAllMocks(); });

describe('KAN-25 Supabase authentication endpoints', () => {
  it('creates a bounded HttpOnly session for a verified account using the application profile and role', async () => {
    const { app, query, supabaseAuth } = setup();
    const response = await request(app).post('/api/auth/login').send({ accessToken: 'valid-access-token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: profile });
    expect(supabaseAuth.verifyAccessToken).toHaveBeenCalledWith('valid-access-token');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE supabase_user_id = $1'), [supabaseUid]);
    expect(response.body.user.id).not.toBe(supabaseUid);
    expect(response.text).not.toContain('valid-access-token');
    expect(response.text).not.toContain('password_hash');
    expect(response.headers['cache-control']).toBe('no-store');
    const cookie = response.headers['set-cookie']?.[0];
    expect(cookie).toContain('connectsphere_session=valid-access-token');
    expect(cookie).toContain('Path=/api');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=3600');
    expect(cookie).not.toContain('Secure');
  });

  it('rejects malformed login bodies and client-supplied identity or role fields before verification', async () => {
    const { app, query, supabaseAuth } = setup();
    for (const body of [{}, { accessToken: '' }, { accessToken: 42 }, [],
      { accessToken: 'valid-access-token', role: 'EVENT_COORDINATOR' },
      { accessToken: 'valid-access-token', userId: user.id }]) {
      const response = await request(app).post('/api/auth/login').send(body);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_LOGIN_INPUT');
      expect(response.headers['set-cookie']).toBeUndefined();
    }
    expect(supabaseAuth.verifyAccessToken).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired tokens without consulting the application database', async () => {
    const { app, query } = setup();
    for (const accessToken of ['invalid-access-token', 'expired-access-token']) {
      const response = await request(app).post('/api/auth/login').send({ accessToken });
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.headers['set-cookie']).toBeUndefined();
    }
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects an unprovisioned Supabase account without creating an application profile', async () => {
    const { app, query } = setup();
    const response = await request(app).post('/api/auth/login').send({ accessToken: 'unmapped-access-token' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCOUNT_NOT_PROVISIONED');
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('SELECT id, email, display_name, role');
  });

  it('reverifies the cookie and resolves the current application profile for /me', async () => {
    const { app, query, supabaseAuth } = setup();
    const response = await request(app).get('/api/auth/me')
      .set('Cookie', 'unrelated=value; connectsphere_session=valid-access-token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: profile });
    expect(supabaseAuth.verifyAccessToken).toHaveBeenCalledWith('valid-access-token');
    expect(query).toHaveBeenCalledWith(expect.any(String), [supabaseUid]);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('returns 401 for missing, expired, or unmapped sessions', async () => {
    const { app } = setup();
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    for (const token of ['expired-access-token', 'unmapped-access-token']) {
      const response = await request(app).get('/api/auth/me')
        .set('Cookie', `connectsphere_session=${token}`);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });

  it('treats malformed cookie encoding as an absent session without invoking the verifier', async () => {
    const { app, query, supabaseAuth } = setup();
    const response = await request(app).get('/api/auth/me').set('Cookie', 'connectsphere_session=%E0%A4%A');
    expect(response.status).toBe(401);
    expect(supabaseAuth.verifyAccessToken).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('does not authorise a profile with an unrecognised application role', async () => {
    const { app } = setup({ role: 'ADMIN' });
    expect((await request(app).post('/api/auth/login').send({ accessToken: 'valid-access-token' })).status)
      .toBe(403);
    expect((await request(app).get('/api/auth/me').set('Cookie', 'connectsphere_session=valid-access-token')).status)
      .toBe(401);
  });

  it('marks production cookies Secure and keeps their lifetime within the verified token expiry', async () => {
    const { app } = setup({ isProduction: true, exp: now + 120 });
    const response = await request(app).post('/api/auth/login').send({ accessToken: 'valid-access-token' });
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']?.[0]).toContain('Secure');
    expect(response.headers['set-cookie']?.[0]).toContain('Max-Age=120');
  });

  it('caps the cookie lifetime at five days even when the verified token lasts longer', async () => {
    const { app } = setup({ exp: now + 10 * 24 * 60 * 60 });
    const response = await request(app).post('/api/auth/login').send({ accessToken: 'valid-access-token' });
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']?.[0]).toContain('Max-Age=432000');
  });

  it('clears the cookie on logout without requiring a valid session', async () => {
    const { app, query, supabaseAuth } = setup({ isProduction: true });
    const response = await request(app).post('/api/auth/logout');
    expect(response.status).toBe(204);
    expect(response.headers['set-cookie']?.[0]).toContain('connectsphere_session=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0; Secure');
    expect(supabaseAuth.verifyAccessToken).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('reports unexpected verification failures as generic server errors', async () => {
    const { app, supabaseAuth, logger } = setup();
    vi.mocked(supabaseAuth.verifyAccessToken).mockRejectedValue(new Error('Verification service failed'));
    const responses = [
      await request(app).post('/api/auth/login').send({ accessToken: 'valid-access-token' }),
      await request(app).get('/api/auth/me').set('Cookie', 'connectsphere_session=valid-access-token'),
    ];
    for (const response of responses) {
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.text).not.toContain('Verification service failed');
      expect(response.headers['set-cookie']).toBeUndefined();
    }
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it('reports unexpected profile lookup failures as generic server errors without issuing a session', async () => {
    const { app, query, logger } = setup();
    query.mockRejectedValue(new Error('Profile lookup failed'));
    const responses = [
      await request(app).post('/api/auth/login').send({ accessToken: 'valid-access-token' }),
      await request(app).get('/api/auth/me').set('Cookie', 'connectsphere_session=valid-access-token'),
    ];
    for (const response of responses) {
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.text).not.toContain('Profile lookup failed');
      expect(response.headers['set-cookie']).toBeUndefined();
    }
    expect(logger.error).toHaveBeenCalledTimes(2);
  });
});