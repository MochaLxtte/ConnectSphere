import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { migrate } from '../migrate.js';
import { seed } from '../seed.js';

// Explicit opt-in prevents accidentally using a developer's ordinary DATABASE_URL.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
const pool = new pg.Pool({ connectionString: scopedUrl.toString() });

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

test('SCF-DB-01 migrations persist schema, seeds preserve edits, and HTTP readiness reaches PostgreSQL', async () => {
  expect(await migrate(scopedUrl.toString())).toEqual(['001_initial_scaffold.sql']);
  expect(await migrate(scopedUrl.toString())).toEqual([]);
  await seed(scopedUrl.toString());
  await pool.query('UPDATE event_requests SET name = $1 WHERE id = $2', [
    'Keep this edit',
    '20000000-0000-4000-8000-000000000001',
  ]);
  await seed(scopedUrl.toString());
  const users = await pool.query('SELECT role, password_hash FROM app_users ORDER BY role');
  expect(users.rows).toEqual([
    { role: 'EVENT_COORDINATOR', password_hash: null },
    { role: 'EVENT_ORGANISER', password_hash: null },
  ]);
  const drafts = await pool.query(
    'SELECT name, status, starts_at, registration_required FROM event_requests',
  );
  expect(drafts.rows).toEqual([
    { name: 'Keep this edit', status: 'DRAFT', starts_at: null, registration_required: null },
  ]);
  const app = createApp({ database: pool });
  const ready = await request(app).get('/api/health/ready');
  expect(ready.status).toBe(200);
  expect(ready.body).toEqual({ status: 'ok', database: 'connected' });
  await pool.query("DELETE FROM scaffold_metadata WHERE key = 'scaffold_version'");
  expect((await request(app).get('/api/health/ready')).status).toBe(503);
  // Detect edits to applied migration history rather than silently accepting drift.
  await pool.query("UPDATE schema_migrations SET checksum = 'changed'");
  await expect(migrate(scopedUrl.toString())).rejects.toThrow('was modified');
});
