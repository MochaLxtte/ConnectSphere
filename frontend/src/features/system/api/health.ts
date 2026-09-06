import { ApiError, getJson } from '../../../lib/api-client';

export interface ApiHealth {
  status: 'ok';
  service: 'connectsphere-api';
}

export interface DatabaseHealth {
  status: 'ok';
  database: 'connected';
}

export async function checkApi(signal?: AbortSignal): Promise<ApiHealth> {
  const result = await getJson<Partial<ApiHealth> | null>('/api/health', signal);
  if (result?.status !== 'ok' || result.service !== 'connectsphere-api') {
    throw new ApiError(
      'The API health response does not match the expected contract.',
      200,
      'INVALID_RESPONSE',
    );
  }
  return result as ApiHealth;
}

export async function checkDatabase(signal?: AbortSignal): Promise<DatabaseHealth> {
  const result = await getJson<Partial<DatabaseHealth> | null>('/api/health/ready', signal);
  if (result?.status !== 'ok' || result.database !== 'connected') {
    throw new ApiError(
      'The database health response does not match the expected contract.',
      200,
      'INVALID_RESPONSE',
    );
  }
  return result as DatabaseHealth;
}
