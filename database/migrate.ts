import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { migrationDatabaseUrl } from './config.js';
import { validateDatabaseUrl } from '../backend/src/db/connection.js';

// Retired from fresh installs; existing databases keep their table, data and ledger row.
// This is the original file's SHA-256 after normalizing CRLF to LF, as below.
const retiredFirebaseMigration = {
  name: '003_add_firebase_identities.sql',
  checksum: '1befbc68426fd4e58e0f3800c7cc6797de60ff0f350115fab5176243bf275ee4',
} as const;

// These files were renumbered without changing their SQL. Preserve existing ledger
// names and validate their checksums instead of running the same migration again.
const priorMigrationNames: Readonly<Record<string, string>> = {
  '003_add_supabase_user_id.sql': '004_add_supabase_user_id.sql',
  '004_core_feature_schema.sql': '005_core_feature_schema.sql',
  '005_equipment_peak_availability.sql': '006_equipment_peak_availability.sql',
  '006_automatic_coordinator_assignment.sql': '007_automatic_coordinator_assignment.sql',
  // The independently developed KAN-77 branch also used 008. Keep any exact
  // local ledger entry while the integrated sequence reserves 008 for notifications.
  '009_venue_buffer_durations.sql': '008_venue_buffer_durations.sql',
};

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
    const retired = await client.query<{ checksum: string }>(
      'SELECT checksum FROM schema_migrations WHERE name = $1',
      [retiredFirebaseMigration.name],
    );
    if (retired.rows[0] && retired.rows[0].checksum !== retiredFirebaseMigration.checksum) {
      throw new Error(`Applied migration ${retiredFirebaseMigration.name} was modified; reconcile its historical checksum before continuing.`);
    }
    const directory = new URL('./migrations/', import.meta.url);
    const files = (await readdir(directory))
      .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
      .sort();
    const applied: string[] = [];
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
      const priorName = priorMigrationNames[name];
      const existing = await client.query<{ name: string; checksum: string }>(
        'SELECT name, checksum FROM schema_migrations WHERE name = ANY($1::text[])',
        [priorName ? [name, priorName] : [name]],
      );
      // Check every recorded name: a matching alias must not hide a changed checksum.
      for (const previous of existing.rows) {
        if (previous.checksum !== checksum)
          throw new Error(`Applied migration ${previous.name} was modified; add a new migration instead.`);
      }
      if (existing.rows.length > 0) continue;
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
