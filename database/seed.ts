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
    // Catalogue tables arrive with migration 005; an older schema keeps its original seed.
    const catalogue = await client.query<{ ready: boolean }>(
      "SELECT to_regclass('venues') IS NOT NULL AND to_regclass('equipment_types') IS NOT NULL AS ready",
    );
    if (!catalogue.rows[0]?.ready) {
      await client.query('COMMIT');
      return;
    }
    // Fictional catalogue entries so the venue and equipment pages have something to show.
    await client.query(`INSERT INTO venues
      (id, name, description, location, capacity, layouts, facilities, accessibility_features,
       wheelchair_accessible, opens_at, closes_at) VALUES
      ('30000000-0000-4000-8000-000000000001', 'Harbour Hall', 'Large hall for conferences and town halls.',
       'Level 1, Main Building', 300, '{THEATRE,BANQUET,CLASSROOM}', '{PROJECTOR,PA_SYSTEM,STAGE,WIFI}',
       '{STEP_FREE_ACCESS,HEARING_LOOP,ACCESSIBLE_TOILET}', true, '08:00', '22:00'),
      ('30000000-0000-4000-8000-000000000002', 'Orchid Seminar Room', 'Seminar room for workshops and briefings.',
       'Level 3, Main Building', 40, '{CLASSROOM,BOARDROOM,U_SHAPE}', '{PROJECTOR,WHITEBOARD,WIFI}',
       '{STEP_FREE_ACCESS}', true, '08:00', '20:00'),
      ('30000000-0000-4000-8000-000000000003', 'Rooftop Terrace', 'Open-air space for networking sessions.',
       'Level 8, Annex', 120, '{STANDING,COCKTAIL}', '{PA_SYSTEM}', '{}', false, '10:00', '22:00')
      ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO equipment_types (id, name, category, description, total_quantity) VALUES
      ('40000000-0000-4000-8000-000000000001', 'Portable projector', 'AV', 'Full HD projector with HDMI.', 6),
      ('40000000-0000-4000-8000-000000000002', 'Wireless microphone', 'AV', 'Handheld microphone with receiver.', 12),
      ('40000000-0000-4000-8000-000000000003', 'Laptop', 'IT', 'Presentation laptop with adapters.', 8),
      ('40000000-0000-4000-8000-000000000004', 'Folding table', 'FURNITURE', '1.8 m folding table.', 30)
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
