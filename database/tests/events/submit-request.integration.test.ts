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

async function assignmentState(id: string) {
  const result = await pool.query(
    `SELECT coordinator_id AS "coordinatorId",
            (SELECT count(*)::int FROM coordinator_assignments WHERE event_request_id = $1) AS "assignments"
     FROM event_requests WHERE id = $1`,
    [id],
  );
  return result.rows[0] as { coordinatorId: string | null; assignments: number };
}

const asOrganiser = () => createApp({
  database: pool,
  submittedRequests: {
    pool, canViewRequest: () => true, canReviewRequest: () => false, authenticate: async () => organiser,
  },
});

describe('KAN-59 saved drafts with blank or invalid values stay DRAFT (S1-DEF-04, KAN-6-AC2)', () => {
  it.each([
    ['name', 'name'], ['purpose', 'purpose'], ['venue_requirements', 'venueRequirements'],
  ] as const)('refuses a blank %s of any whitespace kind and changes nothing', async (column, field) => {
    for (const blank of ['', '   ', '\n\t ']) {
      const eventRequestId = await createEvent('DRAFT', { ...completeFields, [column]: blank });
      const before = await readState(eventRequestId);
      await expect(submitEventRequest(dependencies, { eventRequestId, actor: organiser }))
        .rejects.toMatchObject({ name: 'SubmissionValidationError', missingFields: [field], invalidFields: [] });
      expect(await readState(eventRequestId)).toEqual(before);
      expect(await assignmentState(eventRequestId)).toEqual({ coordinatorId: null, assignments: 0 });
    }
  });

  it.each([
    ['equal to the start', new Date('2026-10-01T09:00:00.000Z')],
    ['before the start', new Date('2026-09-30T09:00:00.000Z')],
  ])('refuses an end %s and changes nothing', async (_label, endsAt) => {
    const eventRequestId = await createEvent('DRAFT', { ...completeFields, ends_at: endsAt });
    const before = await readState(eventRequestId);
    await expect(submitEventRequest(dependencies, { eventRequestId, actor: organiser }))
      .rejects.toMatchObject({
        missingFields: [], invalidFields: [{ field: 'endsAt', message: 'The end must be after the start.' }],
      });
    expect(await readState(eventRequestId)).toEqual(before);
    expect(await assignmentState(eventRequestId)).toEqual({ coordinatorId: null, assignments: 0 });
  });

  it('refuses a registration window that closes before it opens, only while registration is required', async () => {
    const window = {
      registration_opens_at: new Date('2026-09-25T00:00:00.000Z'),
      registration_closes_at: new Date('2026-09-20T00:00:00.000Z'),
    };
    const required = await createEvent('DRAFT', { ...completeFields, registration_required: true, ...window });
    const before = await readState(required);
    await expect(submitEventRequest(dependencies, { eventRequestId: required, actor: organiser }))
      .rejects.toMatchObject({ invalidFields: [expect.objectContaining({ field: 'registrationClosesAt' })] });
    expect(await readState(required)).toEqual(before);

    const notRequired = await createEvent('DRAFT', { ...completeFields, registration_required: false, ...window });
    expect((await submitEventRequest(dependencies, { eventRequestId: notRequired, actor: organiser })).status)
      .toBe('SUBMITTED');
  });

  it('accepts a valid registration window and a blank capacity meaning no limit', async () => {
    const eventRequestId = await createEvent('DRAFT', {
      ...completeFields, registration_required: true,
      registration_opens_at: new Date('2026-09-20T00:00:00.000Z'),
      registration_closes_at: new Date('2026-09-25T00:00:00.000Z'),
    });
    expect((await submitEventRequest(dependencies, { eventRequestId, actor: organiser })).status).toBe('SUBMITTED');
  });

  it('still accepts an expected attendance of 0 (open question in the 9 October decision entry)', async () => {
    const eventRequestId = await createEvent('DRAFT', { ...completeFields, expected_attendance: 0 });
    expect((await submitEventRequest(dependencies, { eventRequestId, actor: organiser })).status).toBe('SUBMITTED');
  });

  it('reports every problem in one error and the request can be corrected and submitted afterwards', async () => {
    const eventRequestId = await createEvent('DRAFT', {
      ...completeFields, name: '  ', ends_at: new Date('2026-09-30T09:00:00.000Z'),
    });
    await expect(submitEventRequest(dependencies, { eventRequestId, actor: organiser })).rejects.toMatchObject({
      missingFields: ['name'], invalidFields: [expect.objectContaining({ field: 'endsAt' })],
    });
    expect((await readState(eventRequestId)).status).toBe('DRAFT');

    await pool.query('UPDATE event_requests SET name = $2, ends_at = $3 WHERE id = $1',
      [eventRequestId, 'Corrected name', new Date('2026-10-01T17:00:00.000Z')]);
    const submitted = await submitEventRequest(dependencies, { eventRequestId, actor: organiser });
    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.name).toBe('Corrected name');
  });

  it('returns 400 SUBMISSION_INCOMPLETE through HTTP for a blank name and keeps the draft', async () => {
    const eventRequestId = await createEvent('DRAFT', { ...completeFields, name: '   ' });
    const before = await readState(eventRequestId);
    const response = await request(asOrganiser()).post(`/api/events/${eventRequestId}/submit`);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'SUBMISSION_INCOMPLETE', missingFields: ['name'] });
    expect(response.body.error).not.toHaveProperty('fieldErrors');
    expect(await readState(eventRequestId)).toEqual(before);
  });

  it('returns 400 SUBMISSION_INVALID with field messages through HTTP and keeps the draft', async () => {
    const eventRequestId = await createEvent('DRAFT', {
      ...completeFields, ends_at: new Date('2026-09-30T09:00:00.000Z'),
    });
    const before = await readState(eventRequestId);
    const response = await request(asOrganiser()).post(`/api/events/${eventRequestId}/submit`);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'SUBMISSION_INVALID', missingFields: [], fieldErrors: { endsAt: 'The end must be after the start.' },
    });
    expect(await readState(eventRequestId)).toEqual(before);
  });

  it('does not reveal completeness to another organiser: the invalid draft is still a 404', async () => {
    const eventRequestId = await createEvent('DRAFT', { ...completeFields, name: null });
    const app = createApp({
      database: pool,
      submittedRequests: {
        pool, canViewRequest: () => true, canReviewRequest: () => false, authenticate: async () => otherOrganiser,
      },
    });
    const response = await request(app).post(`/api/events/${eventRequestId}/submit`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
  });
});
