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
  'coordinator_assignments',
  'equipment_requests',
  'equipment_types',
  'event_change_requests',
  'event_clarifications',
  'event_registrations',
  'event_requests',
  'event_reviews',
  'event_status_history',
  'notifications',
  'scaffold_metadata',
  'schema_migrations',
  'venue_bookings',
  'venue_outage_impacts',
  'venue_unavailability',
  'venues',
];

async function expectDataApiAccessBlocked(database: pg.Pool, expectedTables = applicationTables): Promise<void> {
  const tables = await database.query(`
    SELECT c.relname AS name, c.relrowsecurity AS rls_enabled,
      EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS permissions
        WHERE permissions.grantee = 0
      ) AS public_access
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = current_schema() AND c.relname = ANY($1::text[])
    ORDER BY c.relname
  `, [expectedTables]);
  expect(tables.rows).toEqual(expectedTables.map((name) => ({
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
  `, [expectedTables]);
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
    '003_add_supabase_user_id.sql', '004_core_feature_schema.sql',
    '005_equipment_peak_availability.sql', '006_automatic_coordinator_assignment.sql',
    '007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql',
  ]);
  expect(await migrate(scopedUrl.toString())).toEqual([]);
  expect((await pool.query("SELECT to_regclass('app_user_identities') AS legacy_table")).rows)
    .toEqual([{ legacy_table: null }]);
  expect((await pool.query("SELECT name FROM schema_migrations WHERE name = '003_add_firebase_identities.sql'")).rows)
    .toEqual([]);
  await expectDataApiAccessBlocked(pool);
  await seed(scopedUrl.toString());
  expect((await pool.query('SELECT id FROM venues')).rows).toHaveLength(3);
  expect((await pool.query('SELECT id FROM equipment_types')).rows).toEqual([]);
  // Retained historical catalogue data survives seeding even though new equipment
  // examples are outside the active application scope.
  const retainedEquipmentId = randomUUID();
  await pool.query(
    'INSERT INTO equipment_types (id, name, total_quantity) VALUES ($1, $2, $3)',
    [retainedEquipmentId, 'Existing equipment record', 7],
  );
  await pool.query('UPDATE event_requests SET name = $1 WHERE id = $2', [
    'Keep this edit',
    '20000000-0000-4000-8000-000000000001',
  ]);
  await seed(scopedUrl.toString());
  expect((await pool.query('SELECT id, name, total_quantity FROM equipment_types')).rows).toEqual([
    { id: retainedEquipmentId, name: 'Existing equipment record', total_quantity: 7 },
  ]);
  const users = await pool.query('SELECT role, password_hash FROM app_users ORDER BY role');
  expect(users.rows).toEqual([
    { role: 'EVENT_COORDINATOR', password_hash: null },
    { role: 'EVENT_ORGANISER', password_hash: null },
  ]);
  // Fictional seeded profiles must not silently receive real submitted events.
  const availability = await pool.query('SELECT coordinator_available FROM app_users');
  expect(availability.rows.every((user) => user.coordinator_available === false)).toBe(true);
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

  expect(await migrate(legacyUrl.toString())).toEqual([
    '002_restrict_data_api_access.sql',
    '003_add_supabase_user_id.sql', '004_core_feature_schema.sql',
    '005_equipment_peak_availability.sql', '006_automatic_coordinator_assignment.sql',
    '007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql',
  ]);
  expect(await migrate(legacyUrl.toString())).toEqual([]);
  expect((await legacyPool.query("SELECT to_regclass('app_user_identities') AS legacy_table")).rows)
    .toEqual([{ legacy_table: null }]);
  await expectDataApiAccessBlocked(legacyPool);
  const request = await legacyPool.query('SELECT name FROM event_requests');
  expect(request.rows).toEqual([{ name: 'Preserve the existing request' }]);
  const history = await legacyPool.query('SELECT checksum FROM schema_migrations WHERE name = $1', [
    '001_initial_scaffold.sql',
  ]);
  expect(history.rows).toEqual([{ checksum: initialChecksum }]);
});

const retiredFirebaseName = '003_add_firebase_identities.sql';
const retiredFirebaseChecksum = '1befbc68426fd4e58e0f3800c7cc6797de60ff0f350115fab5176243bf275ee4';

async function applyHistoricalMigration(database: pg.Pool, currentName: string, historicalName: string): Promise<void> {
  const sql = await readFile(new URL(`../migrations/${currentName}`, import.meta.url), 'utf8');
  await database.query(sql);
  const checksum = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
  await database.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [historicalName, checksum]);
}

async function withPreAutomaticDatabase(
  historicalMigration: { name: string; checksum: string },
  check: (database: pg.Pool, connectionString: string) => Promise<void>,
): Promise<void> {
  const upgradeSchema = `test_${randomUUID().replaceAll('-', '')}`;
  const upgradeUrl = new URL(testUrl!);
  upgradeUrl.searchParams.set('options', `-c search_path=${upgradeSchema}`);
  const database = new pg.Pool({ connectionString: upgradeUrl.toString() });
  await admin.query(`CREATE SCHEMA "${upgradeSchema}"`);
  try {
    await database.query(`CREATE TABLE schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const [currentName, historicalName] of [
      ['001_initial_scaffold.sql', '001_initial_scaffold.sql'],
      ['002_restrict_data_api_access.sql', '002_restrict_data_api_access.sql'],
      ['003_add_supabase_user_id.sql', '004_add_supabase_user_id.sql'],
      ['004_core_feature_schema.sql', '005_core_feature_schema.sql'],
      ['005_equipment_peak_availability.sql', '006_equipment_peak_availability.sql'],
    ] as const) {
      await applyHistoricalMigration(database, currentName, historicalName);
    }
    // Recreate only the retired schema shape as an upgrade fixture. Production code
    // must neither create this table nor invent an application-history row for it.
    await database.query(`CREATE TABLE app_user_identities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
      firebase_uid text NOT NULL UNIQUE CHECK (length(trim(firebase_uid)) > 0),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE app_user_identities ENABLE ROW LEVEL SECURITY;
    REVOKE ALL PRIVILEGES ON TABLE app_user_identities FROM PUBLIC;
    DO $$
    DECLARE api_role text;
    BEGIN
      FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
          EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE app_user_identities FROM %I', api_role);
        END IF;
      END LOOP;
    END
    $$;`);
    await database.query(
      `INSERT INTO schema_migrations (name, checksum, applied_at)
       VALUES ($1, $2, '2026-09-14T00:00:00Z')`,
      [historicalMigration.name, historicalMigration.checksum],
    );
    const organiserId = randomUUID();
    const coordinatorId = randomUUID();
    const eventId = randomUUID();
    await database.query(
      `INSERT INTO app_users (id, email, display_name, role, supabase_user_id) VALUES
       ($1, 'owner@legacy.test', 'Existing organiser', 'EVENT_ORGANISER', $3),
       ($2, 'coordinator@legacy.test', 'Existing coordinator', 'EVENT_COORDINATOR', $4)`,
      [organiserId, coordinatorId, randomUUID(), randomUUID()],
    );
    await database.query(
      "INSERT INTO app_user_identities (user_id, firebase_uid) VALUES ($1, 'preserve-existing-firebase-uid')",
      [organiserId],
    );
    await database.query(
      `INSERT INTO event_requests (id, organiser_id, coordinator_id, status, name)
       VALUES ($1, $2, $3, 'SUBMITTED', 'Preserve existing assignment')`,
      [eventId, organiserId, coordinatorId],
    );
    await database.query(
      `INSERT INTO coordinator_assignments (event_request_id, coordinator_id, assigned_by, note)
       VALUES ($1, $2, $2, 'Original manual assignment')`,
      [eventId, coordinatorId],
    );
    await check(database, upgradeUrl.toString());
  } finally {
    await database.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${upgradeSchema}" CASCADE`);
  }
}

test.each([
  { name: retiredFirebaseName, checksum: retiredFirebaseChecksum },
  { name: '003_add_supabase_auth.sql', checksum: 'dashboard-era-checksum' },
])('SCF-DB-03 upgrading a legacy database preserves $name and existing records', async (historicalMigration) => {
  await withPreAutomaticDatabase(historicalMigration, async (database, connectionString) => {
    const before = {
      identities: (await database.query('SELECT * FROM app_user_identities')).rows,
      users: (await database.query('SELECT * FROM app_users ORDER BY id')).rows,
      events: (await database.query('SELECT * FROM event_requests')).rows,
      assignments: (await database.query('SELECT * FROM coordinator_assignments')).rows,
      migrations: (await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows,
    };
    expect(await migrate(connectionString)).toEqual(['006_automatic_coordinator_assignment.sql', '007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql']);
    expect(await migrate(connectionString)).toEqual([]);
    expect((await database.query('SELECT * FROM app_user_identities')).rows).toEqual(before.identities);
    expect((await database.query('SELECT * FROM app_users ORDER BY id')).rows)
      .toEqual(before.users.map((user) => ({ ...user, coordinator_available: false })));
    expect((await database.query('SELECT * FROM event_requests')).rows).toEqual(before.events);
    expect((await database.query('SELECT * FROM coordinator_assignments')).rows)
      .toEqual(before.assignments.map((assignment) => ({ ...assignment, assignment_method: 'MANUAL' })));
    const oldHistory = await database.query(
      "SELECT * FROM schema_migrations WHERE name NOT IN ('006_automatic_coordinator_assignment.sql', '007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql') ORDER BY name",
    );
    expect(oldHistory.rows).toEqual(before.migrations);
    if (historicalMigration.name !== retiredFirebaseName) {
      expect((await database.query('SELECT name FROM schema_migrations WHERE name = $1', [retiredFirebaseName])).rows)
        .toEqual([]);
    }
    await expectDataApiAccessBlocked(database, ['app_user_identities', ...applicationTables]);
  });
});

test('SCF-DB-04 a changed retired checksum prevents pending migrations and preserves historical data', async () => {
  await withPreAutomaticDatabase({ name: retiredFirebaseName, checksum: 'changed' }, async (database, connectionString) => {
    const before = {
      identities: (await database.query('SELECT * FROM app_user_identities')).rows,
      assignments: (await database.query('SELECT * FROM coordinator_assignments')).rows,
      migrations: (await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows,
    };
    await expect(migrate(connectionString)).rejects.toThrow(`Applied migration ${retiredFirebaseName} was modified`);
    expect((await database.query('SELECT * FROM app_user_identities')).rows).toEqual(before.identities);
    expect((await database.query('SELECT * FROM coordinator_assignments')).rows).toEqual(before.assignments);
    expect((await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows).toEqual(before.migrations);
    const addedColumns = await database.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND ((table_name = 'app_users' AND column_name = 'coordinator_available')
          OR (table_name = 'coordinator_assignments' AND column_name = 'assignment_method'))
    `);
    expect(addedColumns.rows).toEqual([]);
  });
});

test('SCF-DB-05 databases with old 007 keep their complete history without rerunning or adding renamed entries', async () => {
  await withPreAutomaticDatabase({ name: retiredFirebaseName, checksum: retiredFirebaseChecksum }, async (database, connectionString) => {
    await applyHistoricalMigration(database,
      '006_automatic_coordinator_assignment.sql', '007_automatic_coordinator_assignment.sql');
    const before = {
      migrations: (await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows,
      users: (await database.query('SELECT * FROM app_users ORDER BY id')).rows,
      assignments: (await database.query('SELECT * FROM coordinator_assignments')).rows,
      identities: (await database.query('SELECT * FROM app_user_identities')).rows,
    };
    expect(await migrate(connectionString)).toEqual(['007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql']);
    expect(await migrate(connectionString)).toEqual([]);
    expect((await database.query("SELECT * FROM schema_migrations WHERE name NOT IN ('007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql') ORDER BY name")).rows).toEqual(before.migrations);
    expect((await database.query('SELECT * FROM app_users ORDER BY id')).rows).toEqual(before.users);
    expect((await database.query('SELECT * FROM coordinator_assignments')).rows).toEqual(before.assignments);
    expect((await database.query('SELECT * FROM app_user_identities')).rows).toEqual(before.identities);
  });
});

test('SCF-DB-06 a dashboard-era Supabase history name is preserved but is not treated as a renamed migration', async () => {
  await withPreAutomaticDatabase({ name: '003_add_supabase_auth.sql', checksum: 'dashboard-era-checksum' }, async (database, connectionString) => {
    // This environment has the mapping column from dashboard work but has never
    // recorded either exact filename for the repository's Supabase migration.
    await database.query("DELETE FROM schema_migrations WHERE name = '004_add_supabase_user_id.sql'");
    const dashboardBefore = await database.query(
      "SELECT * FROM schema_migrations WHERE name = '003_add_supabase_auth.sql'",
    );
    const usersBefore = (await database.query('SELECT * FROM app_users ORDER BY id')).rows;
    expect(await migrate(connectionString)).toEqual([
      '003_add_supabase_user_id.sql', '006_automatic_coordinator_assignment.sql', '007_add_coordinator_lead.sql',
      '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql',
    ]);
    expect(await migrate(connectionString)).toEqual([]);
    expect((await database.query("SELECT * FROM schema_migrations WHERE name = '003_add_supabase_auth.sql'")).rows)
      .toEqual(dashboardBefore.rows);
    expect((await database.query('SELECT * FROM app_users ORDER BY id')).rows)
      .toEqual(usersBefore.map((user) => ({ ...user, coordinator_available: false })));
    expect((await database.query('SELECT name FROM schema_migrations WHERE name = $1', [retiredFirebaseName])).rows)
      .toEqual([]);
  });
});

test.each([
  { changedName: '005_core_feature_schema.sql', duplicate: false },
  { changedName: '005_core_feature_schema.sql', duplicate: true },
  { changedName: '004_core_feature_schema.sql', duplicate: true },
])('SCF-DB-07 a changed $changedName with duplicate=$duplicate prevents pending migrations', async ({ changedName, duplicate }) => {
  await withPreAutomaticDatabase({ name: retiredFirebaseName, checksum: retiredFirebaseChecksum }, async (database, connectionString) => {
    if (duplicate) {
      await database.query(`INSERT INTO schema_migrations (name, checksum)
        SELECT '004_core_feature_schema.sql', checksum FROM schema_migrations
        WHERE name = '005_core_feature_schema.sql'`);
    }
    await database.query('UPDATE schema_migrations SET checksum = $1 WHERE name = $2', ['changed', changedName]);
    // An earlier idempotent migration would run and add a current ledger row; its
    // insertion must also roll back when the later canonical/alias mismatch is found.
    await database.query("DELETE FROM schema_migrations WHERE name = '004_add_supabase_user_id.sql'");
    const before = {
      migrations: (await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows,
      users: (await database.query('SELECT * FROM app_users ORDER BY id')).rows,
      assignments: (await database.query('SELECT * FROM coordinator_assignments')).rows,
    };
    await expect(migrate(connectionString)).rejects.toThrow(`Applied migration ${changedName} was modified`);
    expect((await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows).toEqual(before.migrations);
    expect((await database.query('SELECT * FROM app_users ORDER BY id')).rows).toEqual(before.users);
    expect((await database.query('SELECT * FROM coordinator_assignments')).rows).toEqual(before.assignments);
  });
});

test('SCF-DB-08 matching current and prior ledger names are both retained without duplicate execution', async () => {
  await withPreAutomaticDatabase({ name: retiredFirebaseName, checksum: retiredFirebaseChecksum }, async (database, connectionString) => {
    await database.query(`INSERT INTO schema_migrations (name, checksum)
      SELECT '004_core_feature_schema.sql', checksum FROM schema_migrations
      WHERE name = '005_core_feature_schema.sql'`);
    const before = (await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows;
    expect(await migrate(connectionString)).toEqual(['006_automatic_coordinator_assignment.sql', '007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql']);
    expect((await database.query(
      "SELECT * FROM schema_migrations WHERE name NOT IN ('006_automatic_coordinator_assignment.sql', '007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql') ORDER BY name",
    )).rows).toEqual(before);
    expect(await migrate(connectionString)).toEqual([]);
  });
});

test('KAN-79 migration adds trusted Lead profiles while preserving existing automatic assignments and history', async () => {
  await withPreAutomaticDatabase({ name: retiredFirebaseName, checksum: retiredFirebaseChecksum }, async (database, connectionString) => {
    await applyHistoricalMigration(database, '006_automatic_coordinator_assignment.sql', '006_automatic_coordinator_assignment.sql');
    await database.query("UPDATE coordinator_assignments SET assignment_method = 'AUTOMATIC', assigned_by = NULL");
    const before = {
      users: (await database.query('SELECT * FROM app_users ORDER BY id')).rows,
      events: (await database.query('SELECT * FROM event_requests ORDER BY id')).rows,
      assignments: (await database.query('SELECT * FROM coordinator_assignments ORDER BY id')).rows,
      migrations: (await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows,
    };
    expect(await migrate(connectionString)).toEqual(['007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql']);
    expect(await migrate(connectionString)).toEqual([]);
    expect((await database.query('SELECT * FROM app_users ORDER BY id')).rows).toEqual(before.users);
    expect((await database.query('SELECT * FROM event_requests ORDER BY id')).rows).toEqual(before.events);
    expect((await database.query('SELECT * FROM coordinator_assignments ORDER BY id')).rows).toEqual(before.assignments);
    expect((await database.query("SELECT * FROM schema_migrations WHERE name NOT IN ('007_add_coordinator_lead.sql', '008_notification_inbox.sql', '009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql') ORDER BY name")).rows).toEqual(before.migrations);
    await database.query("INSERT INTO app_users (email, display_name, role) VALUES ('lead@example.test', 'Lead', 'EVENT_COORDINATOR_LEAD')");
    await expect(database.query("INSERT INTO app_users (email, display_name, role) VALUES ('invalid@example.test', 'Invalid', 'SUPER_ADMIN')"))
      .rejects.toMatchObject({ code: '23514' });
    await expectDataApiAccessBlocked(database, ['app_user_identities', ...applicationTables]);
  });
});

test('KAN-77 migration gives existing venues zero buffers and preserves bookings and history', async () => {
  await withPreAutomaticDatabase({ name: retiredFirebaseName, checksum: retiredFirebaseChecksum }, async (database, connectionString) => {
    await applyHistoricalMigration(database, '006_automatic_coordinator_assignment.sql', '006_automatic_coordinator_assignment.sql');
    await applyHistoricalMigration(database, '007_add_coordinator_lead.sql', '007_add_coordinator_lead.sql');
    await applyHistoricalMigration(database, '008_notification_inbox.sql', '008_notification_inbox.sql');
    const event = (await database.query('SELECT id, coordinator_id FROM event_requests LIMIT 1')).rows[0];
    const venue = (await database.query(
      `INSERT INTO venues (name, capacity, layouts, opens_at, closes_at)
       VALUES ('Existing hall', 120, '{Theatre}', '08:00', '22:00') RETURNING id`,
    )).rows[0];
    await database.query(
      `INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, status, starts_at, ends_at, decided_by, decided_at)
       VALUES ($1, $2, $3, 'APPROVED', '2031-01-12T02:00:00Z', '2031-01-12T04:00:00Z', $3, now())`,
      [event.id, venue.id, event.coordinator_id],
    );
    const before = {
      venues: (await database.query('SELECT * FROM venues ORDER BY id')).rows,
      bookings: (await database.query('SELECT * FROM venue_bookings ORDER BY id')).rows,
      migrations: (await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows,
    };

    expect(await migrate(connectionString)).toEqual(['009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql']);
    expect(await migrate(connectionString)).toEqual([]);

    expect((await database.query('SELECT * FROM venues ORDER BY id')).rows)
      .toEqual(before.venues.map((row) => ({ ...row, setup_minutes: 0, turnaround_minutes: 0 })));
    // Migration 011 (KAN-81) also runs here and adds a null replaces_booking_id to each existing booking.
    expect((await database.query('SELECT * FROM venue_bookings ORDER BY id')).rows)
      .toEqual(before.bookings.map((row) => ({ ...row, replaces_booking_id: null })));
    expect((await database.query("SELECT * FROM schema_migrations WHERE name NOT IN ('009_venue_buffer_durations.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql') ORDER BY name")).rows)
      .toEqual(before.migrations);

    await database.query('UPDATE venues SET setup_minutes = 1440, turnaround_minutes = 0 WHERE id = $1', [venue.id]);
    for (const [column, value] of [['setup_minutes', 1441], ['turnaround_minutes', -1]] as const) {
      await expect(database.query(`UPDATE venues SET ${column} = $2 WHERE id = $1`, [venue.id, value]))
        .rejects.toMatchObject({ code: '23514' });
    }
    await expect(database.query('UPDATE venues SET setup_minutes = NULL WHERE id = $1', [venue.id]))
      .rejects.toMatchObject({ code: '23502' });
    await expectDataApiAccessBlocked(database, ['app_user_identities', ...applicationTables]);
  });
});

test('KAN-77 integration preserves the original branch migration name without reapplying its columns', async () => {
  await withPreAutomaticDatabase({ name: retiredFirebaseName, checksum: retiredFirebaseChecksum }, async (database, connectionString) => {
    await applyHistoricalMigration(database, '006_automatic_coordinator_assignment.sql', '006_automatic_coordinator_assignment.sql');
    await applyHistoricalMigration(database, '007_add_coordinator_lead.sql', '007_add_coordinator_lead.sql');
    await applyHistoricalMigration(database, '009_venue_buffer_durations.sql', '008_venue_buffer_durations.sql');
    const before = (await database.query('SELECT * FROM schema_migrations ORDER BY name')).rows;
    expect(await migrate(connectionString)).toEqual(['008_notification_inbox.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql']);
    expect(await migrate(connectionString)).toEqual([]);
    expect((await database.query("SELECT * FROM schema_migrations WHERE name NOT IN ('008_notification_inbox.sql', '010_venue_outage_impacts.sql', '011_venue_booking_replacements.sql') ORDER BY name")).rows)
      .toEqual(before);
    expect((await database.query(
      "SELECT name FROM schema_migrations WHERE name = '009_venue_buffer_durations.sql'",
    )).rows).toEqual([]);
    await database.query("UPDATE schema_migrations SET checksum = 'changed' WHERE name = '008_venue_buffer_durations.sql'");
    await expect(migrate(connectionString)).rejects.toThrow('Applied migration 008_venue_buffer_durations.sql was modified');
  });
});
