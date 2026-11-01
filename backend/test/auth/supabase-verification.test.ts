import { createServer, type Server } from 'node:http';
import { exportJWK, generateKeyPair, SignJWT, type JWK, type JWTPayload } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Real signatures and a loopback JWKS endpoint exercise our verifier's wiring without
// contacting Supabase or depending on a shared project, credentials or internet access.
let firstKey: Awaited<ReturnType<typeof generateKeyPair>>;
let rotatedKey: Awaited<ReturnType<typeof generateKeyPair>>;
let firstJwk: JWK;
let rotatedJwk: JWK;
let server: Server;
let origin: string;
let responseStatus: number;
let responseBody: unknown;
let requests: string[];
const subject = '25000000-0000-4000-8000-000000000001';
const secret = new TextEncoder().encode('synthetic-local-test-signing-key-with-at-least-32-bytes');

beforeAll(async () => {
  firstKey = await generateKeyPair('ES256');
  rotatedKey = await generateKeyPair('ES256');
  firstJwk = { ...await exportJWK(firstKey.publicKey), kid: 'initial-key', alg: 'ES256', use: 'sig' };
  rotatedJwk = { ...await exportJWK(rotatedKey.publicKey), kid: 'rotated-key', alg: 'ES256', use: 'sig' };
});

beforeEach(async () => {
  vi.resetModules();
  requests = [];
  responseStatus = 200;
  responseBody = { keys: [firstJwk] };
  server = createServer((request, response) => {
    requests.push(request.url ?? '');
    response.writeHead(responseStatus, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(responseBody));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a loopback TCP listener');
  origin = `http://127.0.0.1:${address.port}`;
  vi.stubEnv('SUPABASE_URL', origin);
  vi.stubEnv('SUPABASE_JWT_SECRET', '');
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function token(
  overrides: Record<string, unknown> = {},
  key = firstKey.privateKey,
  kid = 'initial-key',
) {
  return new SignJWT({
    iss: `${origin}/auth/v1`, sub: subject,
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: 'fixture@example.test', ...overrides,
  } as JWTPayload).setProtectedHeader({ alg: 'ES256', kid }).sign(key);
}

describe('KAN-25-AC1/AC2 Supabase token verification boundary', () => {
  it('verifies ES256 against the configured project endpoint and reuses its public key cache', async () => {
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const signed = await token({ exp: expiresAt, role: 'EVENT_COORDINATOR_LEAD', extra: 'untrusted metadata' });
    await expect(verifySupabaseAccessToken(signed)).resolves.toEqual({ sub: subject, exp: expiresAt, email: 'fixture@example.test' });
    await expect(verifySupabaseAccessToken(signed)).resolves.toEqual({ sub: subject, exp: expiresAt, email: 'fixture@example.test' });
    expect(requests).toEqual(['/auth/v1/.well-known/jwks.json']);
  });

  it('refreshes for a rotated signing key after the JWKS cooldown', async () => {
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    await verifySupabaseAccessToken(await token());
    responseBody = { keys: [rotatedJwk] };
    const signed = await token({}, rotatedKey.privateKey, 'rotated-key');
    // Advance only JOSE's cache clock; real sockets and timers keep running normally.
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 31_000);
    await expect(verifySupabaseAccessToken(signed)).resolves.toMatchObject({ sub: subject });
    expect(requests).toEqual(['/auth/v1/.well-known/jwks.json', '/auth/v1/.well-known/jwks.json']);
  });

  it('verifies the legacy HS256 configuration locally without fetching JWKS', async () => {
    vi.stubEnv('SUPABASE_JWT_SECRET', new TextDecoder().decode(secret));
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const signed = await new SignJWT({ sub: subject, exp: expiresAt })
      .setIssuer(`${origin}/auth/v1`).setProtectedHeader({ alg: 'HS256' }).sign(secret);
    await expect(verifySupabaseAccessToken(signed)).resolves.toEqual({ sub: subject, exp: expiresAt });
    await expect(verifySupabaseAccessToken(signed)).resolves.toEqual({ sub: subject, exp: expiresAt });
    expect(requests).toEqual([]);
  });

  it('refuses an HS256 signature made with a different secret', async () => {
    vi.stubEnv('SUPABASE_JWT_SECRET', new TextDecoder().decode(secret));
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    const signed = await new SignJWT({ sub: subject, exp: Math.floor(Date.now() / 1000) + 3600 })
      .setIssuer(`${origin}/auth/v1`).setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode('different-synthetic-test-key-with-more-than-32-bytes'));
    await expect(verifySupabaseAccessToken(signed)).rejects.toMatchObject({ code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' });
    expect(requests).toEqual([]);
  });

  it.each([
    ['wrong project issuer', () => ({ iss: 'https://another-project.example.test/auth/v1' }), 'ERR_JWT_CLAIM_VALIDATION_FAILED'],
    ['expired token', () => ({ exp: Math.floor(Date.now() / 1000) - 1 }), 'ERR_JWT_EXPIRED'],
    ['future not-before', () => ({ nbf: Math.floor(Date.now() / 1000) + 3600 }), 'ERR_JWT_CLAIM_VALIDATION_FAILED'],
  ] as const)('rejects %s even when its signature is valid', async (_name, overrides, code) => {
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    await expect(verifySupabaseAccessToken(await token(overrides()))).rejects.toMatchObject({ code });
  });

  it('refuses a wrong signature even when the attacker reuses the trusted key id', async () => {
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    await expect(verifySupabaseAccessToken(await token({}, rotatedKey.privateKey)))
      .rejects.toMatchObject({ code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' });
  });

  it('refuses an unknown key id instead of trusting token contents', async () => {
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    await expect(verifySupabaseAccessToken(await token({}, rotatedKey.privateKey, 'unknown-key')))
      .rejects.toMatchObject({ code: 'ERR_JWKS_NO_MATCHING_KEY' });
  });

  it.each([
    ['missing subject', { sub: undefined }],
    ['non-string subject', { sub: 123 }],
    ['missing expiry', { exp: undefined }],
  ])('rejects a correctly signed token with %s', async (_name, overrides) => {
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    await expect(verifySupabaseAccessToken(await token(overrides))).rejects.toThrow('Invalid Supabase access token.');
  });

  it.each([undefined, null, 123])('omits an absent or non-string email (%j) from trusted claims', async email => {
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    const result = await verifySupabaseAccessToken(await token({ email }));
    expect(result).toMatchObject({ sub: subject });
    expect(result).not.toHaveProperty('email');
  });

  it('refuses malformed tokens without requesting any key', async () => {
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    await expect(verifySupabaseAccessToken('not-a-jwt')).rejects.toMatchObject({ code: 'ERR_JWS_INVALID' });
    expect(requests).toEqual([]);
  });

  it('fails closed when the signing-key endpoint is unavailable, then recovers on retry', async () => {
    responseStatus = 503;
    responseBody = { error: 'fixture unavailable' };
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    const signed = await token();
    await expect(verifySupabaseAccessToken(signed)).rejects.toThrow();
    responseStatus = 200;
    responseBody = { keys: [firstJwk] };
    await expect(verifySupabaseAccessToken(signed)).resolves.toMatchObject({ sub: subject });
    expect(requests).toHaveLength(2);
  });

  it('fails closed on a malformed signing-key set', async () => {
    responseBody = { keys: 'not a key array' };
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    await expect(verifySupabaseAccessToken(await token())).rejects.toMatchObject({ code: 'ERR_JWKS_INVALID' });
  });

  it('requires the project URL even when a legacy signing secret is configured', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_JWT_SECRET', new TextDecoder().decode(secret));
    const { verifySupabaseAccessToken } = await import('../../src/modules/auth/supabase.js');
    await expect(verifySupabaseAccessToken('unused')).rejects.toThrow('SUPABASE_URL is required');
    expect(requests).toEqual([]);
  });

  it.each([
    [null, false], [undefined, false], ['ERR_JWT_EXPIRED', false], [{}, false],
    [{ code: 401 }, false], [{ code: 'ECONNREFUSED' }, false],
    [{ code: 'ERR_JWT_EXPIRED' }, true], [{ code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' }, true],
    [{ code: 'ERR_JWKS_NO_MATCHING_KEY' }, true],
  ])('classifies only JOSE token/key errors (%j)', async (error, expected) => {
    const { isSupabaseTokenError } = await import('../../src/modules/auth/supabase.js');
    expect(isSupabaseTokenError(error)).toBe(expected);
  });
});
