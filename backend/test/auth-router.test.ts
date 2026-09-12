import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { FirebaseSessionAuth } from '../src/modules/auth/router.js';
import type { AuthDatabase } from '../src/modules/auth/user-repository.js';

const user = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'organiser@example.test',
  display_name: 'Sample Organiser',
  role: 'EVENT_ORGANISER',
};

function setup() {
  const database: AuthDatabase = {
    async query<Row extends Record<string, unknown>>(_sql: string, values?: readonly unknown[]) {
      return { rows: values?.[0] === 'mapped-firebase-uid' ? [user] as unknown as Row[] : [] };
    },
  };
  const firebaseAuth: FirebaseSessionAuth = {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'valid-id-token') return { uid: 'mapped-firebase-uid', auth_time: 0 };
      if (token === 'unmapped-id-token') return { uid: 'unmapped-firebase-uid', auth_time: 0 };
      throw Object.assign(new Error('Invalid token'), { code: 'auth/argument-error' });
    }),
    createSessionCookie: vi.fn(async () => 'valid-session-cookie'),
    verifySessionCookie: vi.fn(async (cookie: string) => {
      if (cookie === 'valid-session-cookie') return { uid: 'mapped-firebase-uid' };
      throw Object.assign(new Error('Invalid session'), { code: 'auth/session-cookie-expired' });
    }),
  };
  const app = createApp({
    database: { query: vi.fn().mockResolvedValue({ rows: [] }) },
    auth: { database, firebaseAuth },
  });
  return { app, firebaseAuth };
}

describe('Firebase authentication endpoints', () => {
  it('creates a session only for a verified Firebase account mapped to an app user', async () => {
    const { app, firebaseAuth } = setup();
    const response = await request(app).post('/api/auth/login').send({ idToken: 'valid-id-token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: {
      id: user.id, email: user.email, displayName: user.display_name, role: user.role,
    } });
    expect(response.text).not.toContain('firebase_uid');
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.headers['set-cookie']?.[0]).toContain('SameSite=Lax');
    expect(firebaseAuth.createSessionCookie).toHaveBeenCalledWith('valid-id-token', {
      expiresIn: 432_000_000,
    });
  });

  it('rejects missing, invalid, and unmapped Firebase credentials', async () => {
    const { app } = setup();
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400);
    expect((await request(app).post('/api/auth/login').send({ idToken: 'invalid' })).status).toBe(401);

    const unmapped = await request(app).post('/api/auth/login').send({ idToken: 'unmapped-id-token' });
    expect(unmapped.status).toBe(403);
    expect(unmapped.body.error.code).toBe('ACCOUNT_NOT_PROVISIONED');
  });

  it('returns the mapped profile from a verified session and clears it on logout', async () => {
    const { app, firebaseAuth } = setup();
    const me = await request(app).get('/api/auth/me').set('Cookie', 'connectsphere_session=valid-session-cookie');
    expect(me.status).toBe(200);
    expect(me.body.user).toEqual({
      id: user.id, email: user.email, displayName: user.display_name, role: user.role,
    });
    expect(firebaseAuth.verifySessionCookie).toHaveBeenCalledWith('valid-session-cookie', true);

    const logout = await request(app).post('/api/auth/logout');
    expect(logout.status).toBe(204);
    expect(logout.headers['set-cookie']?.[0]).toContain('Max-Age=0');
  });
});
