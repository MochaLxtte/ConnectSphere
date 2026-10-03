import { randomUUID } from 'node:crypto';
import pg from 'pg';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { migrate } from '../../migrate.js';

/** Isolated schema per test file, matching the other events integration tests. */
export async function createWorkflowFixture() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: testUrl });
  const scopedUrl = new URL(testUrl);
  scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
  scopedUrl.searchParams.set('application_name', schema);
  const pool = new pg.Pool({
    connectionString: scopedUrl.toString(), max: 4,
    connectionTimeoutMillis: 5_000, statement_timeout: 5_000,
  });

  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());

  async function createUser(role: UserRole, displayName: string = role): Promise<WorkflowActor> {
    const id = randomUUID();
    await pool.query(
      'INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, $3, $4)',
      [id, `${id}@example.test`, displayName, role],
    );
    return { id, role };
  }

  async function createEvent(options: {
    organiserId: string; coordinatorId?: string | null; status?: EventStatus;
    startsAt?: string; endsAt?: string; name?: string;
  }): Promise<string> {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO event_requests (id, organiser_id, coordinator_id, status, name, purpose, starts_at,
         ends_at, expected_attendance, venue_requirements, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'Purpose', $6, $7, 50, 'A hall', '2026-09-01T00:00:00Z')`,
      [id, options.organiserId, options.coordinatorId ?? null, options.status ?? 'SUBMITTED',
        options.name ?? 'Open day', options.startsAt ?? '2026-12-01T02:00:00Z',
        options.endsAt ?? '2026-12-01T06:00:00Z'],
    );
    return id;
  }

  async function eventRow(id: string) {
    const found = await pool.query(
      `SELECT status, coordinator_id, name, starts_at, ends_at, expected_attendance, updated_at
       FROM event_requests WHERE id = $1`, [id]);
    return found.rows[0];
  }

  async function notifications(eventRequestId: string) {
    const found = await pool.query<{ recipient_id: string; type: string; message: string }>(
      'SELECT recipient_id, type, message FROM notifications WHERE event_request_id = $1 ORDER BY type, recipient_id',
      [eventRequestId],
    );
    return found.rows;
  }

  async function history(eventRequestId: string) {
    const found = await pool.query<{ from_status: string | null; to_status: string; changed_by: string | null }>(
      `SELECT from_status, to_status, changed_by FROM event_status_history
       WHERE event_request_id = $1 ORDER BY created_at, (from_status IS NOT NULL)`,
      [eventRequestId],
    );
    return found.rows;
  }

  async function destroy() {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }

  return {
    pool, dependencies: { pool }, createUser, createEvent, eventRow, notifications, history,
    destroy,
  };
}

export type WorkflowFixture = Awaited<ReturnType<typeof createWorkflowFixture>>;
