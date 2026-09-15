import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  createClient: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-public-key');
  sdk.createClient.mockReset().mockReturnValue({
    auth: { signInWithPassword: sdk.signInWithPassword, signOut: sdk.signOut },
  });
  sdk.signInWithPassword.mockReset();
  sdk.signOut.mockReset().mockResolvedValue({ error: null });
});

afterEach(() => { vi.unstubAllEnvs(); });

describe('KAN-25 Supabase token handoff', () => {
  it('returns the access token and signs out only the temporary SDK session', async () => {
    sdk.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'verified-access-token' } }, error: null,
    });
    const { getSupabaseAccessToken } = await import('./supabase-client.js');

    await expect(getSupabaseAccessToken('organiser@example.test', 'test-password'))
      .resolves.toBe('verified-access-token');

    expect(sdk.createClient).toHaveBeenCalledWith('https://example.supabase.co', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    expect(sdk.signInWithPassword).toHaveBeenCalledWith({
      email: 'organiser@example.test', password: 'test-password',
    });
    expect(sdk.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  });

  it('preserves the sign-in error without signing out any session when credentials are rejected', async () => {
    const error = new Error('Invalid login credentials');
    sdk.signInWithPassword.mockResolvedValue({ data: { session: null }, error });
    const { getSupabaseAccessToken } = await import('./supabase-client.js');

    await expect(getSupabaseAccessToken('organiser@example.test', 'wrong-password')).rejects.toBe(error);
    expect(sdk.signOut).not.toHaveBeenCalled();
  });
});
