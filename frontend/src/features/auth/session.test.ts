import { beforeEach, describe, expect, it, vi } from 'vitest';

const token = vi.hoisted(() => vi.fn());
vi.mock('./supabase-client.js', () => ({ getSupabaseAccessToken: token }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const user = { id: 'organiser-one', email: 'organiser@example.test', displayName: 'Organiser', role: 'EVENT_ORGANISER' as const };
const other = { ...user, id: 'coordinator-two', role: 'EVENT_COORDINATOR' as const };
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
let session: typeof import('./session');
let request: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(async () => {
  vi.resetModules();
  token.mockReset().mockResolvedValue('synthetic-token');
  request = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', request);
  session = await import('./session');
});

describe('KAN-25 browser identity lifecycle', () => {
  it('restores only the server-returned identity and exposes loading until it completes', async () => {
    const pending = deferred<Response>();
    request.mockReturnValue(pending.promise);
    const restore = session.restoreSession();
    expect(session.authSession.loading).toBe(true);
    expect(session.authSession.user).toBeNull();
    pending.resolve(reply({ user }));
    await restore;
    expect(request).toHaveBeenCalledWith('/api/auth/me', { headers: { Accept: 'application/json' }, signal: undefined });
    expect(session.authSession.user).toEqual(user);
    expect(session.authSession.loading).toBe(false);
  });

  it('clears a cached identity on HTTP 401', async () => {
    request.mockResolvedValueOnce(reply({ user })).mockResolvedValueOnce(reply({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in' } }, 401));
    await session.restoreSession();
    await session.restoreSession();
    expect(session.authSession.user).toBeNull();
    expect(session.authSession.loading).toBe(false);
  });

  it('preserves the known identity and exposes API failure instead of inventing a sign-out', async () => {
    request.mockResolvedValueOnce(reply({ user })).mockRejectedValueOnce(new Error('offline'));
    await session.restoreSession();
    await expect(session.restoreSession()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(session.authSession.user).toEqual(user);
    expect(session.authSession.loading).toBe(false);
  });

  it('hands the temporary token to the API without sending credentials to it', async () => {
    request.mockResolvedValue(reply({ user }));
    await expect(session.signIn('organiser@example.test', 'synthetic-password')).resolves.toEqual(user);
    expect(token).toHaveBeenCalledExactlyOnceWith('organiser@example.test', 'synthetic-password');
    expect(request).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST', body: JSON.stringify({ accessToken: 'synthetic-token' }) }));
    expect(session.authSession.user).toEqual(user);
  });

  it('does not call the login API when the identity provider rejects credentials', async () => {
    token.mockRejectedValue(new Error('Invalid credentials'));
    await expect(session.signIn('organiser@example.test', 'wrong')).rejects.toThrow('Invalid credentials');
    expect(request).not.toHaveBeenCalled();
    expect(session.authSession.user).toBeNull();
  });

  it('does not adopt an identity when the API refuses the token handoff', async () => {
    request.mockResolvedValue(reply({ error: { code: 'ACCOUNT_NOT_LINKED', message: 'Account is not linked' } }, 403));
    await expect(session.signIn('organiser@example.test', 'synthetic-password')).rejects.toMatchObject({ status: 403, code: 'ACCOUNT_NOT_LINKED' });
    expect(session.authSession.user).toBeNull();
  });

  it('clears browser identity after successful logout', async () => {
    request.mockResolvedValueOnce(reply({ user })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await session.restoreSession();
    await session.signOut();
    expect(request).toHaveBeenLastCalledWith('/api/auth/logout', { method: 'POST', headers: { Accept: 'application/json' } });
    expect(session.authSession.user).toBeNull();
  });

  it.each(['http', 'network'] as const)('keeps identity available for retry after %s logout failure', async (failure) => {
    request.mockResolvedValueOnce(reply({ user }));
    await session.restoreSession();
    if (failure === 'http') request.mockResolvedValueOnce(reply({}, 503));
    else request.mockRejectedValueOnce(new Error('offline'));
    await expect(session.signOut()).rejects.toThrow(failure === 'http' ? 'Unable to sign out' : 'offline');
    expect(session.authSession.user).toEqual(user);
  });

  it('cannot restore an old identity after the server invalidates local access', async () => {
    const pending = deferred<Response>();
    request.mockReturnValue(pending.promise);
    const restore = session.restoreSession();
    session.clearLocalSession();
    pending.resolve(reply({ user }));
    await restore;
    expect(session.authSession.user).toBeNull();
    expect(session.authSession.loading).toBe(false);
  });

  it('a delayed restore cannot undo successful logout', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const restore = session.restoreSession();
    await session.signOut();
    pending.resolve(reply({ user }));
    await restore;
    expect(session.authSession.user).toBeNull();
  });

  it('a delayed restore cannot overwrite a newer signed-in identity', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(reply({ user: other }));
    const restore = session.restoreSession();
    await session.signIn('coordinator@example.test', 'synthetic-password');
    pending.resolve(reply({ user }));
    await restore;
    expect(session.authSession.user).toEqual(other);
  });

  it('an older unauthorized restore cannot erase a newer valid restore', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(reply({ user: other }));
    const first = session.restoreSession();
    await session.restoreSession();
    pending.resolve(reply({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401));
    await first;
    expect(session.authSession.user).toEqual(other);
  });

  it('an older restore does not end the newer restore loading state', async () => {
    const firstReply = deferred<Response>();
    const secondReply = deferred<Response>();
    request.mockReturnValueOnce(firstReply.promise).mockReturnValueOnce(secondReply.promise);
    const first = session.restoreSession();
    const second = session.restoreSession();
    firstReply.resolve(reply({ user }));
    await first;
    expect(session.authSession.loading).toBe(true);
    expect(session.authSession.user).toBeNull();
    secondReply.resolve(reply({ user: other }));
    await second;
    expect(session.authSession.user).toEqual(other);
    expect(session.authSession.loading).toBe(false);
  });

  it('clears an already-sent login cookie after local invalidation instead of reporting sign-in success', async () => {
    const pending = deferred<Response>();
    let cookieIdentity: string | null = null;
    request.mockImplementationOnce(() => pending.promise.then((response) => { cookieIdentity = user.id; return response; }))
      .mockImplementationOnce(async () => { cookieIdentity = null; return new Response(null, { status: 204 }); });
    const login = session.signIn('organiser@example.test', 'synthetic-password');
    const outcome = expect(login).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    await vi.waitFor(() => expect(request).toHaveBeenCalled());
    session.clearLocalSession();
    pending.resolve(reply({ user }));
    await outcome;
    expect(session.authSession.user).toBeNull();
    expect(cookieIdentity).toBeNull();
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/login', '/api/auth/logout']);
  });

  it('waits for a delayed logout cookie before sending a newer login', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(reply({ user: other }));
    const logout = session.signOut();
    const login = session.signIn('coordinator@example.test', 'synthetic-password');
    await vi.waitFor(() => expect(token).toHaveBeenCalled());
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/logout']);
    pending.resolve(new Response(null, { status: 204 }));
    await logout;
    await expect(login).resolves.toEqual(other);
    expect(session.authSession.user).toEqual(other);
  });

  it.each(['clear', 'logout'] as const)('does not hand a provider token to the API after %s supersedes sign-in', async (action) => {
    const pending = deferred<string>();
    token.mockReturnValue(pending.promise);
    request.mockResolvedValue(new Response(null, { status: 204 }));
    const login = session.signIn('organiser@example.test', 'synthetic-password');
    const outcome = expect(login).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    if (action === 'clear') session.clearLocalSession();
    else await session.signOut();
    pending.resolve('obsolete-token');
    await outcome;
    expect(request.mock.calls.map(([path]) => path)).toEqual(action === 'clear' ? [] : ['/api/auth/logout']);
    expect(session.authSession.user).toBeNull();
    expect(session.authSession.loading).toBe(false);
  });

  it('orders an in-flight login cleanup before the later requested logout', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValue(new Response(null, { status: 204 }));
    const login = session.signIn('organiser@example.test', 'synthetic-password');
    const outcome = expect(login).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    const logout = session.signOut();
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/login']);
    pending.resolve(reply({ user }));
    await outcome;
    await logout;
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/login', '/api/auth/logout', '/api/auth/logout']);
    expect(session.authSession.user).toBeNull();
    expect(session.authSession.loading).toBe(false);
  });

  it('a failed preceding logout does not block the next explicit login', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(reply({ user: other }));
    const logout = session.signOut();
    const logoutOutcome = expect(logout).rejects.toMatchObject({ code: 'REQUEST_FAILED' });
    const login = session.signIn('coordinator@example.test', 'synthetic-password');
    await vi.waitFor(() => expect(token).toHaveBeenCalled());
    expect(request).toHaveBeenCalledOnce();
    pending.resolve(reply({}, 503));
    await logoutOutcome;
    await expect(login).resolves.toEqual(other);
    expect(session.authSession.user).toEqual(other);
  });

  it('finishes stale login cleanup before applying the later login cookie', async () => {
    const pending = deferred<Response>();
    let cookieIdentity: string | null = null;
    request.mockImplementationOnce(() => pending.promise.then((response) => { cookieIdentity = user.id; return response; }))
      .mockImplementationOnce(async () => { cookieIdentity = null; return new Response(null, { status: 204 }); })
      .mockImplementationOnce(async () => { cookieIdentity = other.id; return reply({ user: other }); });
    const first = session.signIn('organiser@example.test', 'synthetic-password');
    const firstOutcome = expect(first).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    const second = session.signIn('coordinator@example.test', 'synthetic-password');
    pending.resolve(reply({ user }));
    await firstOutcome;
    await expect(second).resolves.toEqual(other);
    expect(cookieIdentity).toBe(other.id);
    expect(session.authSession.user).toEqual(other);
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/login', '/api/auth/logout', '/api/auth/login']);
  });

  it('does not block a later login when an already-sent login fails', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(reply({ user: other }));
    const first = session.signIn('organiser@example.test', 'synthetic-password');
    const firstOutcome = expect(first).rejects.toMatchObject({ status: 403 });
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    const second = session.signIn('coordinator@example.test', 'synthetic-password');
    pending.resolve(reply({ error: { code: 'ACCOUNT_NOT_LINKED', message: 'Not linked' } }, 403));
    await firstOutcome;
    await expect(second).resolves.toEqual(other);
    expect(session.authSession.user).toEqual(other);
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/login', '/api/auth/login']);
  });

  it('skips an obsolete login queued behind another session write', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(reply({ user: other }));
    const logout = session.signOut();
    const first = session.signIn('organiser@example.test', 'synthetic-password');
    const firstOutcome = expect(first).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    await vi.waitFor(() => expect(token).toHaveBeenCalledTimes(1));
    const second = session.signIn('coordinator@example.test', 'synthetic-password');
    pending.resolve(new Response(null, { status: 204 }));
    await logout;
    await firstOutcome;
    await expect(second).resolves.toEqual(other);
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/logout', '/api/auth/login']);
  });

  it('does not restore a cookie until an in-flight logout has completed', async () => {
    const pending = deferred<Response>();
    request.mockResolvedValueOnce(reply({ user }));
    await session.restoreSession();
    request.mockClear().mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(reply({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Signed out' } }, 401));
    const logout = session.signOut();
    const restore = session.restoreSession();
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(request.mock.calls[0]?.[0]).toBe('/api/auth/logout');
    pending.resolve(new Response(null, { status: 204 }));
    await logout;
    await restore;
    expect(session.authSession.user).toBeNull();
    expect(session.authSession.loading).toBe(false);
  });

  it('a local clear also cancels a restore waiting for a session write', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise);
    const logout = session.signOut();
    const restore = session.restoreSession();
    session.clearLocalSession();
    pending.resolve(new Response(null, { status: 204 }));
    await logout;
    await restore;
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/logout']);
    expect(session.authSession.user).toBeNull();
  });

  it('restores the cookie after an ongoing login without superseding that login', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(reply({ user }));
    const login = session.signIn('organiser@example.test', 'synthetic-password');
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    const restore = session.restoreSession();
    expect(request).toHaveBeenCalledOnce();
    pending.resolve(reply({ user }));
    await expect(login).resolves.toEqual(user);
    await restore;
    expect(session.authSession.user).toEqual(user);
    expect(session.authSession.loading).toBe(false);
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/login', '/api/auth/me']);
  });

  it('reports failed cleanup of a superseded login and permits a later explicit retry', async () => {
    const pending = deferred<Response>();
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(reply({}, 503))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const login = session.signIn('organiser@example.test', 'synthetic-password');
    const outcome = expect(login).rejects.toMatchObject({ code: 'REQUEST_FAILED' });
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    session.clearLocalSession();
    pending.resolve(reply({ user }));
    await outcome;
    expect(session.authSession.user).toBeNull();
    await session.signOut();
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/login', '/api/auth/logout', '/api/auth/logout']);
  });
});
