import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { migrate } from '../../migrate.js';

const original021Checksum = '2603919c447b67d7d80192ba67a1ab14a8cac028b3082dc2ec8af931769e27b5';
const migration022 = '022_safety_review_remediation.sql';
const start = '2035-03-01T02:00:00Z';
const end = '2035-03-01T05:00:00Z';

async function legacyFixture() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: testUrl });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const scopedUrl = new URL(testUrl);
  scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
  const pool = new pg.Pool({ connectionString: scopedUrl.toString(), max: 3 });
  const destroy = async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  };
  try {
    await pool.query(`CREATE TABLE schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const directory = new URL('../../migrations/', import.meta.url);
    const files = (await readdir(directory)).filter(name => /^\d+_[a-z0-9_]+\.sql$/.test(name) && name < migration022).sort();
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
      if (name === '021_safety_reviews.sql') expect(checksum).toBe(original021Checksum);
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations(name, checksum) VALUES ($1, $2)', [name, checksum]);
    }
    const owner = randomUUID(), coordinator = randomUUID(), officer = randomUUID(), technician = randomUUID();
    for (const [id, role] of [[owner, 'EVENT_ORGANISER'], [coordinator, 'EVENT_COORDINATOR'],
      [officer, 'SAFETY_OFFICER'], [technician, 'TECHNICAL_SUPPORT_STAFF']]) {
      await pool.query('INSERT INTO app_users(id, email, display_name, role) VALUES ($1, $2, $3, $3)',
        [id, `${id}@example.test`, role]);
    }
    async function eventWithReview(status: 'APPROVED' | 'CHANGES_REQUESTED') {
      const eventId = randomUUID(), venueId = randomUUID(), typeId = randomUUID(), lineId = randomUUID(), reviewId = randomUUID();
      await pool.query(`INSERT INTO event_requests(id, organiser_id, coordinator_id, status, name, starts_at,
          ends_at, expected_attendance, venue_requirements, equipment_requirements, equipment_plan_status)
        VALUES ($1, $2, $3, 'APPROVED', 'Keep legacy event', $4, $5, 50, 'A hall', 'Speakers', 'REQUIRED')`,
      [eventId, owner, coordinator, start, end]);
      await pool.query('INSERT INTO venues(id, name, capacity, layouts) VALUES ($1, $2, 100, $3)',
        [venueId, `Hall ${venueId}`, ['Theatre', 'Banquet']]);
      const bookingId = (await pool.query<{ id: string }>(`INSERT INTO venue_bookings(event_request_id,
          venue_id, requested_by, status, starts_at, ends_at, layout, decided_by, decided_at)
        VALUES ($1, $2, $3, 'APPROVED', $4, $5, 'Theatre', $3, now()) RETURNING id`,
      [eventId, venueId, coordinator, start, end])).rows[0]!.id;
      await pool.query('INSERT INTO equipment_types(id, name, total_quantity) VALUES ($1, $2, 10)',
        [typeId, `Speakers ${typeId}`]);
      await pool.query(`INSERT INTO equipment_requests(id, event_request_id, equipment_type_id, requested_by,
          quantity, starts_at, ends_at, status, decided_by, decided_at)
        VALUES ($1, $2, $3, $4, 2, $5, $6, 'RESERVED', $7, now())`,
      [lineId, eventId, typeId, coordinator, start, end, technician]);
      await pool.query(`INSERT INTO safety_reviews(id, event_request_id, round, status, arrangement_fingerprint,
          emergency_access, equipment_placement, submitted_by, decided_by, decided_at, decision_notes, requested_areas)
        VALUES ($1, $2, 1, $3, safety_arrangement_fingerprint($2), 'Keep exits clear', 'Stage left',
          $4, $5, now(), 'Keep original decision', $6)`,
      [reviewId, eventId, status, coordinator, officer, status === 'CHANGES_REQUESTED' ? ['VENUE', 'TECHNICAL'] : null]);
      await pool.query("UPDATE event_requests SET status = 'CONFIRMED' WHERE id = $1", [eventId]);
      if (status === 'APPROVED') {
        await pool.query(`UPDATE event_requests SET preparation_started_at = now(), preparation_started_by = $2,
          preparation_safety_review_id = $3 WHERE id = $1`, [eventId, coordinator, reviewId]);
      }
      await pool.query(`INSERT INTO notifications(recipient_id, event_request_id, safety_review_id, type,
          title, message, dedupe_key) VALUES ($1, $2, $3, 'SAFETY_REVIEW_DECIDED', 'Legacy decision',
          'Preserve this notification', ($3::uuid)::text)`, [coordinator, eventId, reviewId]);
      return { eventId, venueId, bookingId, typeId, lineId, reviewId };
    }
    const requested = await eventWithReview('CHANGES_REQUESTED');
    const approved = await eventWithReview('APPROVED');
    const fingerprints = async (eventId = requested.eventId) => (await pool.query<{ venue: string; technical: string }>(
      `SELECT safety_planning_area_fingerprint($1, 'VENUE') AS venue,
        safety_planning_area_fingerprint($1, 'TECHNICAL') AS technical`, [eventId])).rows[0]!;
    return { pool, schema, url: scopedUrl.toString(), requested, approved, coordinator, technician, fingerprints, destroy };
  } catch (error) {
    await destroy();
    throw error;
  }
}

describe('KAN-84 additive 021 to 022 safety remediation upgrade', () => {
  it('preserves applied history, decided rounds, preparation and notices; backfills conservative baselines and reruns safely', async () => {
    const f = await legacyFixture();
    try {
      const before = await Promise.all(['schema_migrations', 'safety_reviews', 'event_requests', 'notifications', 'app_users']
        .map(table => f.pool.query(`SELECT * FROM ${table} ORDER BY ${table === 'schema_migrations' ? 'name' : 'id'}`)));
      expect(await migrate(f.url)).toEqual([migration022]);
      expect(await migrate(f.url)).toEqual([]);
      const after = await Promise.all(['schema_migrations', 'safety_reviews', 'event_requests', 'notifications', 'app_users']
        .map(table => f.pool.query(`SELECT * FROM ${table}${table === 'schema_migrations' ? " WHERE name <> '022_safety_review_remediation.sql'" : ''}
          ORDER BY ${table === 'schema_migrations' ? 'name' : 'id'}`)));
      expect(after.map(result => result.rows)).toEqual(before.map(result => result.rows));
      const fingerprints = await f.fingerprints();
      expect((await f.pool.query(`SELECT review_id, venue_fingerprint, technical_fingerprint
        FROM safety_review_change_baselines`)).rows).toEqual([{ review_id: f.requested.reviewId,
        venue_fingerprint: fingerprints.venue, technical_fingerprint: fingerprints.technical }]);
      // Existing approvals are retained as history, not silently rewritten to match stronger checks.
      expect((await f.pool.query(`SELECT arrangement_fingerprint <> safety_arrangement_fingerprint(event_request_id)
        AS stale FROM safety_reviews WHERE id = $1`, [f.approved.reviewId])).rows[0]?.stale).toBe(true);
    } finally { await f.destroy(); }
  });

  it('distinguishes venue and technical changes; ordinary names, descriptions and safety notes do not satisfy remediation', async () => {
    const f = await legacyFixture();
    try {
      await migrate(f.url);
      const original = await f.fingerprints();
      expect(original.venue).toMatch(/^[0-9a-f]{32}$/);
      expect(original.technical).toMatch(/^[0-9a-f]{32}$/);
      await f.pool.query("UPDATE event_requests SET name = 'A different name', description = 'Different text' WHERE id = $1", [f.requested.eventId]);
      await f.pool.query(`INSERT INTO safety_reviews(event_request_id, round, arrangement_fingerprint,
          emergency_access, equipment_placement, submitted_by)
        VALUES ($1, 2, safety_arrangement_fingerprint($1), 'Edited note only', 'Other note', $2)`,
      [f.requested.eventId, f.coordinator]);
      expect(await f.fingerprints()).toEqual(original);
      await f.pool.query('UPDATE venues SET turnaround_minutes = 15 WHERE id = $1', [f.requested.venueId]);
      const venueChanged = await f.fingerprints();
      expect(venueChanged.venue).not.toBe(original.venue);
      expect(venueChanged.technical).toBe(original.technical);
      await f.pool.query('UPDATE equipment_types SET damaged_quantity = 1 WHERE id = $1', [f.requested.typeId]);
      const bothChanged = await f.fingerprints();
      expect(bothChanged.venue).toBe(venueChanged.venue);
      expect(bothChanged.technical).not.toBe(original.technical);
      await f.pool.query('UPDATE event_requests SET expected_attendance = 60 WHERE id = $1', [f.requested.eventId]);
      const attendanceChanged = await f.fingerprints();
      expect(attendanceChanged.venue).not.toBe(bothChanged.venue);
      expect(attendanceChanged.technical).toBe(bothChanged.technical);
      await expect(f.pool.query("SELECT safety_planning_area_fingerprint($1, 'UNKNOWN')", [f.requested.eventId]))
        .rejects.toMatchObject({ code: '22023' });
    } finally { await f.destroy(); }
  });

  it('opens the confirmed-event reservation gate only for current technical changes and closes it on resubmission', async () => {
    const f = await legacyFixture();
    const reserve = (event = f.requested) => f.pool.query(`INSERT INTO equipment_requests(event_request_id,
        equipment_type_id, requested_by, quantity, starts_at, ends_at, status, decided_by, decided_at)
      VALUES ($1, $2, $3, 1, $4, $5, 'RESERVED', $6, now())`,
    [event.eventId, event.typeId, f.coordinator, start, end, f.technician]);
    try {
      await expect(reserve()).rejects.toMatchObject({ constraint: 'equipment_reservation_event_approved' });
      await migrate(f.url);
      await reserve();
      await expect(reserve(f.approved)).rejects.toMatchObject({ constraint: 'equipment_reservation_event_approved' });
      await f.pool.query(`INSERT INTO safety_reviews(event_request_id, round, arrangement_fingerprint, submitted_by)
        VALUES ($1, 2, safety_arrangement_fingerprint($1), $2)`, [f.requested.eventId, f.coordinator]);
      await expect(reserve()).rejects.toMatchObject({ constraint: 'equipment_reservation_event_approved' });
    } finally { await f.destroy(); }
  });

  it('keeps helpers and baselines private and preserves immutable review history', async () => {
    const f = await legacyFixture();
    try {
      await migrate(f.url);
      const tables = await f.pool.query(`SELECT c.relrowsecurity AS rls,
          EXISTS(SELECT 1 FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) p
            WHERE p.grantee = 0) AS public_access
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = current_schema() AND c.relname = 'safety_review_change_baselines'`);
      expect(tables.rows).toEqual([{ rls: true, public_access: false }]);
      const functions = await f.pool.query(`SELECT p.proname, p.proconfig,
          EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
            WHERE a.grantee = 0) AS public_access
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = current_schema() AND p.proname IN ('safety_arrangement_fingerprint',
          'safety_planning_area_fingerprint', 'prevent_equipment_overbooking', 'protect_decided_safety_review',
          'protect_safety_change_baseline')`);
      expect(functions.rows).toHaveLength(5);
      for (const row of functions.rows) {
        expect(row.public_access, row.proname).toBe(false);
        expect(row.proconfig, row.proname).toContain(`search_path=${f.schema}, pg_temp`);
      }
      await expect(f.pool.query('UPDATE safety_reviews SET decision_notes = $2 WHERE id = $1',
        [f.requested.reviewId, 'Rewritten history'])).rejects.toMatchObject({ code: '23514' });
      const baseline = (await f.pool.query('SELECT * FROM safety_review_change_baselines WHERE review_id = $1',
        [f.requested.reviewId])).rows;
      await expect(f.pool.query('UPDATE safety_review_change_baselines SET venue_fingerprint = md5($2) WHERE review_id = $1',
        [f.requested.reviewId, 'Forged baseline'])).rejects.toMatchObject({ code: '23514' });
      await expect(f.pool.query('DELETE FROM safety_review_change_baselines WHERE review_id = $1',
        [f.requested.reviewId])).rejects.toMatchObject({ code: '23514' });
      expect((await f.pool.query('SELECT * FROM safety_review_change_baselines WHERE review_id = $1',
        [f.requested.reviewId])).rows).toEqual(baseline);
    } finally { await f.destroy(); }
  });

  it('refuses unknown or revised 021 checksums without applying 022 or rewriting the ledger', async () => {
    const f = await legacyFixture();
    try {
      for (const checksum of ['unknown-edit', '598eed6b3bb81c3e3eba45802e5903a61b4e0b5608d974c83b8c9cb12781a554']) {
        await f.pool.query("UPDATE schema_migrations SET checksum = $1 WHERE name = '021_safety_reviews.sql'", [checksum]);
        await expect(migrate(f.url)).rejects.toThrow('Applied migration 021_safety_reviews.sql was modified');
        expect((await f.pool.query("SELECT checksum FROM schema_migrations WHERE name = '021_safety_reviews.sql'")).rows)
          .toEqual([{ checksum }]);
        expect((await f.pool.query('SELECT name FROM schema_migrations WHERE name = $1', [migration022])).rows).toEqual([]);
        expect((await f.pool.query("SELECT to_regclass('safety_review_change_baselines') AS baseline")).rows)
          .toEqual([{ baseline: null }]);
      }
    } finally { await f.destroy(); }
  });
});
