export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isErrorEnvelope(value: unknown): value is { error: { code: string; message: string } } {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

/** Keep calls same-origin; Vite proxies /api to Express during development. */
export async function getJson<T>(path: `/api/${string}`, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { Accept: 'application/json' }, signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      'Unable to reach the API. Check that the backend is running, then try again.',
      0,
      'NETWORK_ERROR',
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'The API returned an unreadable response. Check the backend and try again.',
      response.status,
      'INVALID_RESPONSE',
    );
  }

  if (!response.ok) {
    if (isErrorEnvelope(data))
      throw new ApiError(data.error.message, response.status, data.error.code);
    throw new ApiError(
      `The request failed (HTTP ${response.status}). Please try again.`,
      response.status,
      'REQUEST_FAILED',
    );
  }
  return data as T;
}

/** Keep calls same-origin; Vite proxies /api to Express during development. */
export function postJson<T>(path: `/api/${string}`, body: unknown, signal?: AbortSignal): Promise<T> {
  return sendJson<T>('POST', path, body, signal);
}

/** Keep calls same-origin; Vite proxies /api to Express during development. */
export function patchJson<T>(path: `/api/${string}`, body: unknown, signal?: AbortSignal): Promise<T> {
  return sendJson<T>('PATCH', path, body, signal);
}

/** Keep calls same-origin; Vite proxies /api to Express during development. */
export function deleteJson<T>(path: `/api/${string}`, signal?: AbortSignal): Promise<T> {
  return sendJson<T>('DELETE', path, undefined, signal);
}

async function sendJson<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: `/api/${string}`,
  body: unknown,
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
      'Unable to reach the API. Check that the backend is running, then try again.',
      0,
      'NETWORK_ERROR',
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'The API returned an unreadable response. Check the backend and try again.',
      response.status,
      'INVALID_RESPONSE',
    );
  }

  if (!response.ok) {
    if (isErrorEnvelope(data))
      throw new ApiError(data.error.message, response.status, data.error.code);
    throw new ApiError(
      `The request failed (HTTP ${response.status}). Please try again.`,
      response.status,
      'REQUEST_FAILED',
    );
  }
  return data as T;
}
