import { Router, type Request } from 'express';
import type { AuthDatabase } from './user-repository.js';
import { findUserByFirebaseUid } from './user-repository.js';
import type { AuthenticatedUser } from './types.js';

const COOKIE_NAME = 'connectsphere_session';
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export interface FirebaseSessionAuth {
  verifyIdToken(idToken: string): Promise<{ uid: string; auth_time?: number }>;
  createSessionCookie(idToken: string, options: { expiresIn: number }): Promise<string>;
  verifySessionCookie(cookie: string, checkRevoked: boolean): Promise<{ uid: string }>;
}

export interface AuthRouterDependencies {
  database: AuthDatabase;
  firebaseAuth: FirebaseSessionAuth;
  isProduction?: boolean;
}

function readCookie(request: Request): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME && value.length === 1) {
      try { return decodeURIComponent(value[0]!); } catch { return null; }
    }
  }
  return null;
}

function serializeSessionCookie(value: string, maxAge: number, isProduction: boolean): string {
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProduction ? '; Secure' : ''}`;
}

function isFirebaseCredentialError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && typeof error.code === 'string' && error.code.startsWith('auth/');
}

function parseIdToken(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  return Object.keys(input).length === 1 && typeof input.idToken === 'string' && input.idToken.length > 0
    ? input.idToken : null;
}

/** Verify the Firebase session and derive the application's trusted profile and role. */
export async function authenticateRequest(
  database: AuthDatabase, firebaseAuth: FirebaseSessionAuth, request: Request,
): Promise<AuthenticatedUser | null> {
  const cookie = readCookie(request);
  if (!cookie) return null;
  try {
    const session = await firebaseAuth.verifySessionCookie(cookie, true);
    return findUserByFirebaseUid(database, session.uid);
  } catch (error) {
    if (isFirebaseCredentialError(error)) return null;
    throw error;
  }
}

export function createAuthRouter({ database, firebaseAuth, isProduction = false }: AuthRouterDependencies) {
  const router = Router();
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/login', async (request, response, next) => {
    const idToken = parseIdToken(request.body);
    if (!idToken) {
      response.status(400).json({ error: { code: 'INVALID_LOGIN_INPUT', message: 'A Firebase ID token is required.' } });
      return;
    }
    try {
      const decoded = await firebaseAuth.verifyIdToken(idToken);
      const user = await findUserByFirebaseUid(database, decoded.uid);
      if (!user) {
        response.status(403).json({ error: { code: 'ACCOUNT_NOT_PROVISIONED', message: 'This account is not authorised for ConnectSphere.' } });
        return;
      }
      const firebaseSessionCookie = await firebaseAuth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS });
      response.set('Set-Cookie', serializeSessionCookie(firebaseSessionCookie, SESSION_DURATION_MS / 1000, isProduction));
      response.status(200).json({ user });
    } catch (error) {
      // Firebase credential errors are expected user-facing authentication failures; unexpected
      // repository/Admin failures still follow the application's generic error handler.
      if (isFirebaseCredentialError(error)) {
        response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } });
        return;
      }
      next(error);
    }
  });

  router.get('/me', async (request, response, next) => {
    try {
      const user = await authenticateRequest(database, firebaseAuth, request);
      if (!user) {
        response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } });
        return;
      }
      response.status(200).json({ user });
    } catch (error) { next(error); }
  });

  router.post('/logout', (_request, response) => {
    response.set('Set-Cookie', serializeSessionCookie('', 0, isProduction));
    response.status(204).end();
  });
  return router;
}
