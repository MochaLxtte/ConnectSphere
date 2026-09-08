import pg from 'pg';
import { validateDatabaseUrl } from './connection.js';

/** Minimal interface used by the readiness endpoint; tests inject a fake database. */
export interface HealthDatabase {
  query(
    sql: string,
    values?: string[],
  ): Promise<{
    rows: Array<{ key: string; value: string }>;
  }>;
}

export function createDatabasePool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: validateDatabaseUrl(databaseUrl),
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
    idleTimeoutMillis: 30_000,
    // Each developer/API process shares the hosted project's connection budget.
    max: 5,
  });

  // An error on an idle client must have a listener to avoid an uncaught event.
  // Keep connection details out of routine logs and HTTP responses.
  pool.on('error', () => {
    console.error('An idle PostgreSQL connection failed. Check database availability.');
  });
  return pool;
}
