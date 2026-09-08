import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { migrationDatabaseUrl } from './config.js';
import { validateDatabaseUrl } from '../backend/src/db/connection.js';

export async function migrate(connectionString: string): Promise<string[]> {
  const client = new pg.Client({
    connectionString: validateDatabaseUrl(connectionString),
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    // Serialize bootstrap and migration history updates across developer/CI processes.
    await client.query('SELECT pg_advisory_xact_lock(2122026)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const directory = new URL('./migrations/', import.meta.url);
    const files = (await readdir(directory))
      .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
      .sort();
    const applied: string[] = [];
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
      const existing = await client.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE name = $1',
        [name],
      );
      const previous = existing.rows[0];
      if (previous) {
        if (previous.checksum !== checksum)
          throw new Error(`Applied migration ${name} was modified; add a new migration instead.`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
        name,
        checksum,
      ]);
      applied.push(name);
    }
    await client.query('COMMIT');
    return applied;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const applied = await migrate(migrationDatabaseUrl());
    console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Migration failed.');
    process.exitCode = 1;
  }
}
