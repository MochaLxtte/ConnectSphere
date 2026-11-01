import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabasePool } from '../src/db/pool.js';

// Constructing pg.Pool does not open sockets until a query/connect is requested.
// These tests use the real pool to verify resource limits and error handling.
const pools: ReturnType<typeof createDatabasePool>[] = [];
afterEach(async () => {
  await Promise.all(pools.splice(0).map(pool => pool.end()));
  vi.restoreAllMocks();
});

describe('KAN-24 database pool resource and failure safeguards', () => {
  it('bounds connection use and wait times without opening a connection eagerly', () => {
    const url = 'postgresql://fixture:synthetic-password@127.0.0.1:5432/unused';
    const pool = createDatabasePool(`  ${url}  `); pools.push(pool);
    expect(pool.options).toMatchObject({ connectionString: url, max: 5,
      connectionTimeoutMillis: 5000, query_timeout: 5000, idleTimeoutMillis: 30000 });
    expect(pool.totalCount).toBe(0);
    expect(pool.waitingCount).toBe(0);
  });

  it('handles an idle connection error without crashing or logging connection credentials', () => {
    const url = 'postgresql://fixture:synthetic-password@127.0.0.1:5432/unused';
    const pool = createDatabasePool(url); pools.push(pool);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => pool.emit('error', new Error(`Connection failed: ${url}`))).not.toThrow();
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls.flat().join(' ')).toContain('Check database availability');
    expect(log.mock.calls.flat().join(' ')).not.toContain('synthetic-password');
    expect(log.mock.calls.flat().join(' ')).not.toContain(url);
  });

  it.each(['', 'not-a-url', 'https://project.supabase.co',
    'postgresql://fixture:synthetic-password@project.supabase.co:5432/postgres'])
  ('rejects invalid or insecure configuration before returning a usable pool (%s)', url => {
    expect(() => createDatabasePool(url)).toThrow();
    try { createDatabasePool(url); } catch (error) {
      expect(String(error)).not.toContain('synthetic-password');
    }
  });
});
