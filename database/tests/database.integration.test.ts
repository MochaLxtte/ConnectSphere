import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
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
const legacySchema = `test_${randomUUID().replaceAll('-', '')}`;
const legacyUrl = new URL(testUrl);
legacyUrl.searchParams.set('options', `-c search_path=${legacySchema}`);
const legacyPool = new pg.Pool({ connectionString: legacyUrl.toString() });
const applicationTables = [
  'app_users',
  'event_clarifications',
  'event_requests',
  'event_reviews',
  'scaffold_metadata',
  'schema_migrations',
];

async function expectDataApiAccessBlocked(database: pg.Pool): Promise<void> {
  const tables = await database.query(`
    SELECT c.relname AS name, c.relrowsecurity AS rls_enabled,
      EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS permissions
        WHERE permissions.grantee = 0
      ) AS public_access
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = current_schema() AND c.relname = ANY($1::text[])
    ORDER BY c.relname
  `, [applicationTables]);
  expect(tables.rows).toEqual(applicationTables.map((name) => ({
    name, rls_enabled: true, public_access: false,
  })));

  // Supabase roles are checked when present; CI does not need to create global roles.
  const roles = await database.query(`
    SELECT r.rolname, c.relname,
      has_table_privilege(r.oid, c.oid,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS has_access
    FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
      AND n.nspname = current_schema() AND c.relname = ANY($1::text[])
  `, [applicationTables]);
  for (const role of roles.rows) expect(role.has_access, `${role.rolname}: ${role.relname}`).toBe(false);
}

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query(`CREATE SCHEMA "${legacySchema}"`);
});

afterAll(async () => {
  await pool.end();
  await legacyPool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.query(`DROP SCHEMA IF EXISTS "${legacySchema}" CASCADE`);
  await admin.end();
});

test('SCF-DB-01 migrations persist schema, seeds preserve edits, and HTTP readiness reaches PostgreSQL', async () => {
  expect(await migrate(scopedUrl.toString())).toEqual([
    '001_initial_scaffold.sql', '002_restrict_data_api_access.sql',
  ]);
  expect(await migrate(scopedUrl.toString())).toEqual([]);
  await expectDataApiAccessBlocked(pool);
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

test('SCF-DB-02 upgrading the original schema preserves data and removes existing Data API grants', async () => {
  // Recreate a database already running 001, including its original migration checksum.
  const initialSql = await readFile(new URL('../migrations/001_initial_scaffold.sql', import.meta.url), 'utf8');
  const initialChecksum = createHash('sha256').update(initialSql.replace(/\r\n/g, '\n')).digest('hex');
  await legacyPool.query(`CREATE TABLE schema_migrations (
    name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  await legacyPool.query(initialSql);
  await legacyPool.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
    '001_initial_scaffold.sql', initialChecksum,
  ]);
  await seed(legacyUrl.toString());
  await legacyPool.query('UPDATE event_requests SET name = $1 WHERE id = $2', [
    'Preserve the existing request', '20000000-0000-4000-8000-000000000001',
  ]);
  // Deliberately create grants that the upgrade must remove, within this test schema only.
  await legacyPool.query(`GRANT SELECT ON ALL TABLES IN SCHEMA "${legacySchema}" TO PUBLIC`);
  const apiRoles = await legacyPool.query<{ rolname: string }>(
    "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')",
  );
  for (const { rolname } of apiRoles.rows) {
    await legacyPool.query(`GRANT SELECT ON ALL TABLES IN SCHEMA "${legacySchema}" TO "${rolname}"`);
  }

  expect(await migrate(legacyUrl.toString())).toEqual(['002_restrict_data_api_access.sql']);
  expect(await migrate(legacyUrl.toString())).toEqual([]);
  await expectDataApiAccessBlocked(legacyPool);
  const request = await legacyPool.query('SELECT name FROM event_requests');
  expect(request.rows).toEqual([{ name: 'Preserve the existing request' }]);
  const history = await legacyPool.query('SELECT checksum FROM schema_migrations WHERE name = $1', [
    '001_initial_scaffold.sql',
  ]);
  expect(history.rows).toEqual([{ checksum: initialChecksum }]);
});
