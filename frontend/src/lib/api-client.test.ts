import { describe, expect, it, vi } from 'vitest';
import { deleteJson, getJson, patchJson, postJson } from './api-client';
import { checkApi, checkDatabase } from '../features/system/api/health';

describe('API contract handling', () => {
  it('preserves the backend database error code and message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable.' },
          }),
          { status: 503 },
        ),
      ),
    );
    await expect(checkDatabase()).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database is unavailable.',
    });
  });

  it('does not report an unrelated JSON response as a healthy service', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ok', service: 'different-api' })),
        ),
    );
    await expect(checkApi()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('explains network failures without exposing low-level fetch errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(getJson('/api/health')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });

  it.each([
    { method: 'POST', send: () => postJson('/api/events', { name: 'Workshop' }), body: { name: 'Workshop' } },
    { method: 'PATCH', send: () => patchJson('/api/events/event-one', { name: 'Workshop' }), body: { name: 'Workshop' } },
    { method: 'DELETE', send: () => deleteJson('/api/events/event-one'), body: undefined },
  ])('sends the $method contract and returns the saved JSON outcome', async ({ method, send, body }) => {
    const outcome = { id: 'event-one', saved: true };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(outcome)));
    vi.stubGlobal('fetch', fetchMock);

    await expect(send()).resolves.toEqual(outcome);

    const [, request] = fetchMock.mock.calls[0];
    expect(request.method).toBe(method);
    expect(request.headers).toEqual(body === undefined
      ? { Accept: 'application/json' }
      : { Accept: 'application/json', 'Content-Type': 'application/json' });
    expect(request.body).toBe(body === undefined ? undefined : JSON.stringify(body));
  });

  it('preserves a mutation refusal code instead of treating it as a successful save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'EVENT_REVISION_CONFLICT', message: 'Refresh the event before saving.' },
    }), { status: 409 })));

    await expect(patchJson('/api/events/event-one', { name: 'Workshop' })).rejects.toMatchObject({
      name: 'ApiError', status: 409, code: 'EVENT_REVISION_CONFLICT',
      message: 'Refresh the event before saving.',
    });
  });

  it.each([
    { name: 'GET', send: () => getJson('/api/events/event-one') },
    { name: 'POST', send: () => postJson('/api/events', { name: 'Workshop' }) },
  ])('reports unreadable $name responses as uncertain, including successful HTTP responses', async ({ send }) => {
    // A successful HTTP status with invalid JSON is not proof that the caller has a usable saved outcome.
    for (const status of [200, 502]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Proxy response</html>', { status })));
      await expect(send()).rejects.toMatchObject({
        name: 'ApiError', status, code: 'INVALID_RESPONSE',
        message: 'The API returned an unreadable response. Check the backend and try again.',
      });
    }
  });

  it.each([
    null,
    'Gateway unavailable',
    { message: 'Gateway unavailable' },
    { error: null },
    { error: { code: 'UNAVAILABLE' } },
    { error: { code: 503, message: 'Unavailable' } },
    { error: { code: 'UNAVAILABLE', message: 503 } },
  ])('uses safe HTTP feedback for an invalid error envelope: %j', async body => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 503 })));

    await expect(getJson('/api/events/event-one')).rejects.toMatchObject({
      name: 'ApiError', status: 503, code: 'REQUEST_FAILED',
      message: 'The request failed (HTTP 503). Please try again.',
    });
  });

  it('also handles a mutation error without the application error envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Proxy failed' }), { status: 502 })));

    await expect(deleteJson('/api/events/event-one')).rejects.toMatchObject({
      name: 'ApiError', status: 502, code: 'REQUEST_FAILED',
      message: 'The request failed (HTTP 502). Please try again.',
    });
  });

  it.each([
    { name: 'GET', send: (signal: AbortSignal) => getJson('/api/events/event-one', signal) },
    { name: 'POST', send: (signal: AbortSignal) => postJson('/api/events', { name: 'Workshop' }, signal) },
  ])('forwards $name cancellation without replacing it with a network failure', async ({ send }) => {
    const controller = new AbortController();
    const aborted = new DOMException('The operation was aborted.', 'AbortError');
    const fetchMock = vi.fn().mockImplementation((_path: string, request: RequestInit) => {
      expect(request.signal).toBe(controller.signal);
      controller.abort();
      return Promise.reject(aborted);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(send(controller.signal)).rejects.toBe(aborted);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a mutation transport failure without retrying a potentially saved operation', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(postJson('/api/events', { name: 'Workshop' })).rejects.toMatchObject({
      code: 'NETWORK_ERROR', status: 0,
      message: 'Unable to reach the API. Check that the backend is running, then try again.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
