import type { Pool, PoolClient } from 'pg';

/** Run work in one READ COMMITTED transaction; roll back and rethrow on any failure. */
export async function withTransaction<T>(
  pool: Pick<Pool, 'connect'>,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Discard a connection whose transaction could not be cleaned up.
      releaseError = rollbackError instanceof Error ? rollbackError : new Error('Rollback failed.');
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

export function isDatabaseError(error: unknown, code: string, constraint: string): boolean {
  return typeof error === 'object' && error !== null &&
    'code' in error && error.code === code &&
    'constraint' in error && error.constraint === constraint;
}
