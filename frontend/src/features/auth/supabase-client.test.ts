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

  it('refuses a provider response without a session even if no provider error was supplied', async () => {
    sdk.signInWithPassword.mockResolvedValue({ data: { session: null }, error: null });
    const { getSupabaseAccessToken } = await import('./supabase-client.js');
    await expect(getSupabaseAccessToken('organiser@example.test', 'synthetic-password'))
      .rejects.toThrow('Unable to sign in');
    expect(sdk.signOut).not.toHaveBeenCalled();
  });

  it.each(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])('refuses missing %s before attempting credential exchange', async (setting) => {
    vi.stubEnv(setting, '');
    const { getSupabaseAccessToken } = await import('./supabase-client.js');
    await expect(getSupabaseAccessToken('organiser@example.test', 'synthetic-password'))
      .rejects.toThrow('Supabase sign-in is not configured');
    expect(sdk.createClient).not.toHaveBeenCalled();
    expect(sdk.signInWithPassword).not.toHaveBeenCalled();
  });

  it('reuses the configured client but cleans each separate temporary session', async () => {
    sdk.signInWithPassword
      .mockResolvedValueOnce({ data: { session: { access_token: 'token-one' } }, error: null })
      .mockResolvedValueOnce({ data: { session: { access_token: 'token-two' } }, error: null });
    const { getSupabaseAccessToken } = await import('./supabase-client.js');
    await expect(getSupabaseAccessToken('one@example.test', 'synthetic-password')).resolves.toBe('token-one');
    await expect(getSupabaseAccessToken('two@example.test', 'synthetic-password')).resolves.toBe('token-two');
    expect(sdk.createClient).toHaveBeenCalledTimes(1);
    expect(sdk.signOut).toHaveBeenCalledTimes(2);
  });

  it('does not return a token while temporary SDK session cleanup is unresolved or rejects', async () => {
    sdk.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'token-one' } }, error: null });
    let rejectCleanup!: (error: Error) => void;
    sdk.signOut.mockReturnValue(new Promise((_, reject) => { rejectCleanup = reject; }));
    const { getSupabaseAccessToken } = await import('./supabase-client.js');
    const received = vi.fn();
    const attempt = getSupabaseAccessToken('one@example.test', 'synthetic-password');
    const result = attempt.then(received, (error: Error) => error);
    await vi.waitFor(() => expect(sdk.signOut).toHaveBeenCalled());
    expect(received).not.toHaveBeenCalled();
    rejectCleanup(new Error('Cleanup unavailable'));
    await expect(result).resolves.toEqual(new Error('Cleanup unavailable'));
    expect(received).not.toHaveBeenCalled();
  });
});
