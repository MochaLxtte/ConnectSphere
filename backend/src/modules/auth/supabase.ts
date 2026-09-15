import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';

export interface SupabaseAccessTokenClaims {
  /** Supabase auth.users.id (uuid) — the subject of the token. */
  sub: string;
  email?: string;
  /** Unix seconds. Used to bound the HttpOnly cookie's own lifetime. */
  exp: number;
}

let cachedJwks: JWTVerifyGetKey | null = null;
let cachedSecret: Uint8Array | null = null;

/**
 * Resolve the key material used to verify Supabase access tokens locally, with no per-request
 * network call.
 *
 * Supabase projects created with the current default (asymmetric ES256 signing keys) are
 * verified against the project's published JWKS endpoint; `jose` fetches it once and caches it.
 * Older projects still on the legacy shared HS256 secret are verified with SUPABASE_JWT_SECRET
 * instead — set that variable only if your project's Auth settings show a legacy secret.
 *
 * `jose` verifies an HS256 secret as a raw `Uint8Array`, not a Node `KeyObject` — there's no
 * `createSecretKey` export in `jose` itself (that's a Node `crypto` function, and unnecessary
 * here since `jwtVerify` accepts the raw bytes directly).
 */
function verificationKey(): JWTVerifyGetKey | Uint8Array {
  const { SUPABASE_URL, SUPABASE_JWT_SECRET } = process.env;
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required to verify Supabase access tokens.');
  }
  if (SUPABASE_JWT_SECRET) {
    return cachedSecret ??= new TextEncoder().encode(SUPABASE_JWT_SECRET);
  }
  return cachedJwks ??= createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', SUPABASE_URL));
}

/** Verify a Supabase access token and return its trusted claims. Throws on any invalid token. */
export async function verifySupabaseAccessToken(token: string): Promise<SupabaseAccessTokenClaims> {
  const { SUPABASE_URL, SUPABASE_JWT_SECRET } = process.env;
  const options = { issuer: `${SUPABASE_URL}/auth/v1` };
  const { payload } = SUPABASE_JWT_SECRET
    ? await jwtVerify(token, verificationKey() as Uint8Array, options)
    : await jwtVerify(token, verificationKey() as JWTVerifyGetKey, options);
  if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') {
    throw new Error('Invalid Supabase access token.');
  }
  return {
    sub: payload.sub,
    exp: payload.exp,
    // Spread conditionally rather than `email: undefined` — with exactOptionalPropertyTypes,
    // an optional property must be either absent or a real string, never present-but-undefined.
    ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
  };
}

/** jose throws distinct, named errors for any untrusted, malformed, or expired token. */
export function isSupabaseTokenError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && typeof (error as { code: unknown }).code === 'string'
    && (error as { code: string }).code.startsWith('ERR_JW');
}