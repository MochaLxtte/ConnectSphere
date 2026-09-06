import { describe, expect, it, vi } from 'vitest';
import { getJson } from './api-client';
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
});
