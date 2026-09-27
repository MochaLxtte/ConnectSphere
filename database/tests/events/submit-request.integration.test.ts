import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import {
  submitEventRequest,
  SubmitRequestNotFoundError,
  type SubmitActor,
} from '../../../backend/src/modules/events/submit-request.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import { migrate } from '../../migrate.js';

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
const organiser: SubmitActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const otherOrganiser: SubmitActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const coordinator: SubmitActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const originalUpdatedAt = new Date('2026-09-01T00:00:00.000Z');

const dependencies = { pool };

const completeFields = {
  name: 'Career Fair', purpose: 'Recruitment',
  starts_at: new Date('2026-10-01T09:00:00.000Z'), ends_at: new Date('2026-10-01T17:00:00.000Z'),
  expected_attendance: 250, venue_requirements: 'Hall A',
};

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  for (const actor of [organiser, otherOrganiser, coordinator]) {
    await pool.query(
      'INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, $3, $4)',
      [actor.id, `${actor.id}@example.test`, actor.role, actor.role],
    );
  }
  await pool.query('UPDATE app_users SET coordinator_available = true WHERE id = $1', [coordinator.id]);
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

async function createEvent(
  status: EventStatus = 'DRAFT',
  fields: Record<string, unknown> = completeFields,
): Promise<string> {
  const id = randomUUID();
  const columns = ['id', 'organiser_id', 'status', 'updated_at', ...Object.keys(fields)];
  const values = [id, organiser.id, status, originalUpdatedAt, ...Object.values(fields)];
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  await pool.query(
    `INSERT INTO event_requests (${columns.join(', ')}) VALUES (${placeholders})`,
    values,
  );
  return id;
}

async function readState(id: string) {
  const result = await pool.query(
    `SELECT organiser_id AS "organiserId", status, name, updated_at AS "updatedAt"
     FROM event_requests WHERE id = $1`,
    [id],
  );
  return result.rows[0];
}

describe('KAN-6 submission persistence', () => {
  it('transitions a complete draft to SUBMITTED', async () => {
    const eventRequestId = await createEvent();
    const submitted = await submitEventRequest(dependencies, { eventRequestId, actor: organiser });

    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.coordinatorId).toBe(coordinator.id);
    expect(submitted.name).toBe('Career Fair');
    const state = await readState(eventRequestId);
    expect(state.status).toBe('SUBMITTED');
    expect(state.updatedAt).not.toEqual(originalUpdatedAt);
  });

  it('rejects an incomplete draft, leaves it unchanged and lists the missing fields', async () => {
    const eventRequestId = await createEvent('DRAFT', { name: 'Incomplete' });
    const before = await readState(eventRequestId);
    await expect(submitEventRequest(dependencies, { eventRequestId, actor: organiser }))
      .rejects.toMatchObject({ missingFields: expect.arrayContaining(['purpose', 'startsAt']) });
    expect(await readState(eventRequestId)).toEqual(before);
  });

  it.each([
    { name: 'a different organiser', actor: otherOrganiser, status: 'DRAFT' as const, code: 'SUBMIT_FORBIDDEN' },
    { name: 'an unauthenticated actor', actor: null, status: 'DRAFT' as const, code: 'SUBMIT_FORBIDDEN' },
    { name: 'an already-submitted request', actor: organiser, status: 'SUBMITTED' as const, code: 'REQUEST_NOT_SUBMITTABLE' },
  ])('leaves data unchanged for $name', async ({ actor, status, code }) => {
    const eventRequestId = await createEvent(status);
    const before = await readState(eventRequestId);
    await expect(submitEventRequest(dependencies, { eventRequestId, actor }))
      .rejects.toMatchObject({ code });
    expect(await readState(eventRequestId)).toEqual(before);
  });

  it('reports a missing request without recording a change', async () => {
    const eventRequestId = randomUUID();
    await expect(submitEventRequest(dependencies, { eventRequestId, actor: organiser }))
      .rejects.toBeInstanceOf(SubmitRequestNotFoundError);
  });

  it('commits only one of two competing submission attempts', async () => {
    const eventRequestId = await createEvent();
    const blocker = await pool.connect();
    let pending: Promise<PromiseSettledResult<unknown>[]> | undefined;
    let results: PromiseSettledResult<unknown>[] = [];
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM event_requests WHERE id = $1 FOR UPDATE', [eventRequestId]);
      pending = Promise.allSettled(
        [organiser, organiser].map(() => submitEventRequest(dependencies, { eventRequestId, actor: organiser })),
      );
      await expect.poll(async () => {
        const waiting = await admin.query<{ count: number }>(`
          SELECT count(*)::integer AS count FROM pg_stat_activity
          WHERE application_name = $1 AND wait_event_type = 'Lock'
        `, [schema]);
        return waiting.rows[0]!.count;
      }, { timeout: 3_000 }).toBe(2);
    } finally {
      try {
        await blocker.query('ROLLBACK');
      } finally {
        blocker.release(true);
        if (pending) results = await pending;
      }
    }
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: 'rejected', reason: expect.objectContaining({ code: 'REQUEST_NOT_SUBMITTABLE' }),
      }),
    ]));
    const state = await readState(eventRequestId);
    expect(state.status).toBe('SUBMITTED');
  });

  it('submits through HTTP and appears in the coordinator review queue afterwards', async () => {
    const eventRequestId = await createEvent();
    const app = createApp({
      database: pool,
      submittedRequests: {
        pool,
        canViewRequest: () => true,
        canReviewRequest: () => false,
        authenticate: async () => organiser,
      },
    });

    const submitResponse = await request(app).post(`/api/events/${eventRequestId}/submit`);
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.status).toBe('SUBMITTED');

    const coordinatorApp = createApp({
      database: pool,
      submittedRequests: {
        pool,
        canViewRequest: () => true,
        canReviewRequest: () => false,
        authenticate: async () => coordinator,
      },
    });
    const queueResponse = await request(coordinatorApp).get('/api/events');
    expect(queueResponse.status).toBe(200);
    expect(queueResponse.body.items.map((item: { id: string }) => item.id)).toContain(eventRequestId);
  });

  it('hides another organiser\'s draft through HTTP and leaves it unchanged', async () => {
    const eventRequestId = await createEvent();
    const before = await readState(eventRequestId);
    const app = createApp({
      database: pool,
      submittedRequests: {
        pool,
        canViewRequest: () => true,
        canReviewRequest: () => false,
        authenticate: async () => otherOrganiser,
      },
    });

    const response = await request(app).post(`/api/events/${eventRequestId}/submit`);

    expect(response.status).toBe(404);
    expect(await readState(eventRequestId)).toEqual(before);
  });
});
