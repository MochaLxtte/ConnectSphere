import { ApiError } from '../../../lib/api-client';

/** PATCH counterpart of the shared postJson helper, with the same error handling. */
export async function patchJson<T>(path: `/api/${string}`, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    const error = typeof data === 'object' && data !== null && 'error' in data ? data.error : null;
    if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' &&
        'message' in error && typeof error.message === 'string') {
      throw new ApiError(error.message, response.status, error.code);
    }
    throw new ApiError(`The request failed (HTTP ${response.status}). Please try again.`, response.status, 'REQUEST_FAILED');
  }
  return data as T;
}
