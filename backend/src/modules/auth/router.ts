import { Router, type Request } from 'express';
import type { AuthDatabase } from './user-repository.js';
import { findUserBySupabaseUid } from './user-repository.js';
import { isSupabaseTokenError, verifySupabaseAccessToken } from './supabase.js';
import type { AuthenticatedUser } from './types.js';

const COOKIE_NAME = 'connectsphere_session';
// Upper bound only — the cookie's actual lifetime always follows the token's own `exp` claim,
// so raising your Supabase project's JWT expiry is what actually extends sessions.
const MAX_SESSION_DURATION_SECONDS = 5 * 24 * 60 * 60;

export interface SupabaseSessionAuth {
  verifyAccessToken(accessToken: string): Promise<{ uid: string; exp: number }>;
}

/** Default wiring against the real Supabase verifier; inject a fake in tests. */
export const defaultSupabaseSessionAuth: SupabaseSessionAuth = {
  async verifyAccessToken(accessToken) {
    const claims = await verifySupabaseAccessToken(accessToken);
    return { uid: claims.sub, exp: claims.exp };
  },
};

export interface AuthRouterDependencies {
  database: AuthDatabase;
  supabaseAuth: SupabaseSessionAuth;
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

function serializeSessionCookie(value: string, maxAgeSeconds: number, isProduction: boolean): string {
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isProduction ? '; Secure' : ''}`;
}

function parseAccessToken(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  return Object.keys(input).length === 1 && typeof input.accessToken === 'string' && input.accessToken.length > 0
    ? input.accessToken : null;
}

/** Never let a Supabase token outlive its own `exp`, and never exceed our own cap either. */
function cookieMaxAgeSeconds(exp: number): number {
  const secondsUntilExpiry = exp - Math.floor(Date.now() / 1000);
  return Math.max(0, Math.min(secondsUntilExpiry, MAX_SESSION_DURATION_SECONDS));
}

/** Verify the session cookie and derive the application's trusted profile and role. */
export async function authenticateRequest(
  database: AuthDatabase, supabaseAuth: SupabaseSessionAuth, request: Request,
): Promise<AuthenticatedUser | null> {
  const cookie = readCookie(request);
  if (!cookie) return null;
  try {
    const claims = await supabaseAuth.verifyAccessToken(cookie);
    return findUserBySupabaseUid(database, claims.uid);
  } catch (error) {
    if (isSupabaseTokenError(error)) return null;
    throw error;
  }
}

export function createAuthRouter({ database, supabaseAuth, isProduction = false }: AuthRouterDependencies) {
  const router = Router();
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/login', async (request, response, next) => {
    const accessToken = parseAccessToken(request.body);
    if (!accessToken) {
      response.status(400).json({ error: { code: 'INVALID_LOGIN_INPUT', message: 'A Supabase access token is required.' } });
      return;
    }
    try {
      const claims = await supabaseAuth.verifyAccessToken(accessToken);
      const user = await findUserBySupabaseUid(database, claims.uid);
      if (!user) {
        response.status(403).json({ error: { code: 'ACCOUNT_NOT_PROVISIONED', message: 'This account is not authorised for ConnectSphere.' } });
        return;
      }
      // The verified Supabase access token *is* the session artifact — the cookie just carries
      // it to the browser as HttpOnly so client-side JS never touches it again.
      response.set('Set-Cookie', serializeSessionCookie(accessToken, cookieMaxAgeSeconds(claims.exp), isProduction));
      response.status(200).json({ user });
    } catch (error) {
      // Malformed/expired/untrusted tokens are expected user-facing authentication failures;
      // unexpected repository failures still follow the application's generic error handler.
      if (isSupabaseTokenError(error)) {
        response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } });
        return;
      }
      next(error);
    }
  });

  router.get('/me', async (request, response, next) => {
    try {
      const user = await authenticateRequest(database, supabaseAuth, request);
      if (!user) {
        response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } });
        return;
      }
      response.status(200).json({ user });
    } catch (error) { next(error); }
  });

  router.post('/logout', (_request, response) => {
    // The session is a stateless verified token, so logout just stops sending the cookie back —
    // there is nothing to revoke server-side. The token remains valid, at Supabase's layer,
    // until it naturally expires; that's why the JWT expiry configured in Supabase should stay
    // short-to-moderate rather than relying on this endpoint for revocation.
    response.set('Set-Cookie', serializeSessionCookie('', 0, isProduction));
    response.status(204).end();
  });
  return router;
}