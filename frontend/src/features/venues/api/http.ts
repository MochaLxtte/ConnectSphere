import { ApiError } from '../../../lib/api-client';

/**
 * PATCH/DELETE companion to the shared getJson/postJson helpers, with the same error contract:
 * network failures, unreadable bodies and the JSON error envelope all become ApiError.
 */
export async function sendJson<T>(
  method: 'PATCH' | 'DELETE',
  path: `/api/${string}`,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined
        ? { Accept: 'application/json' }
        : { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      'Unable to reach the API. Check that the backend is running, then try again.', 0, 'NETWORK_ERROR',
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'The API returned an unreadable response. Check the backend and try again.',
      response.status, 'INVALID_RESPONSE',
    );
  }

  if (!response.ok) {
    const envelope = (data as { error?: { code?: unknown; message?: unknown } } | null)?.error;
    if (typeof envelope?.code === 'string' && typeof envelope.message === 'string') {
      throw new ApiError(envelope.message, response.status, envelope.code);
    }
    throw new ApiError(`The request failed (HTTP ${response.status}). Please try again.`, response.status, 'REQUEST_FAILED');
  }
  return data as T;
}
