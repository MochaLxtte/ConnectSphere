import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { migrationDatabaseUrl } from './config.js';
import { validateDatabaseUrl } from '../backend/src/db/connection.js';

export async function seed(connectionString: string): Promise<void> {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Development seed is disabled in production.');
  const client = new pg.Client({
    connectionString: validateDatabaseUrl(connectionString),
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO app_users (id, email, display_name, role) VALUES
      ('10000000-0000-4000-8000-000000000001', 'organiser@example.test', 'Sample Organiser', 'EVENT_ORGANISER'),
      ('10000000-0000-4000-8000-000000000002', 'coordinator@example.test', 'Sample Coordinator', 'EVENT_COORDINATOR')
      ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO event_requests (id, organiser_id, name, description) VALUES
      ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
      'Sample planning workshop', 'Incomplete draft for local development. No customer data.')
      ON CONFLICT DO NOTHING`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await seed(migrationDatabaseUrl());
    console.log(
      'Development sample data added; existing records preserved. These accounts have no login credentials.',
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Seed failed.');
    process.exitCode = 1;
  }
}
