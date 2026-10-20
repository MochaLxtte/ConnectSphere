import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import {
  updateOwnedDraft,
  DraftRequestNotFoundError,
  type DraftActor,
} from '../../../backend/src/modules/events/update-draft.js';
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
const organiser: DraftActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const otherOrganiser: DraftActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const originalUpdatedAt = new Date('2026-09-01T00:00:00.000Z');

const dependencies = { pool };

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  for (const actor of [organiser, otherOrganiser]) {
    await pool.query(
      'INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, $3, $4)',
      [actor.id, `${actor.id}@example.test`, actor.role, actor.role],
    );
  }
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

async function createEvent(
  status: EventStatus = 'DRAFT',
  fields: Record<string, unknown> = {},
): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO event_requests (id, organiser_id, status, name, purpose, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, organiser.id, status, fields.name ?? 'Original name', fields.purpose ?? 'Original purpose', originalUpdatedAt],
  );
  return id;
}

async function readState(id: string) {
  const result = await pool.query(
    `SELECT organiser_id AS "organiserId", status, name, purpose, description,
       expected_attendance AS "expectedAttendance", updated_at AS "updatedAt"
     FROM event_requests WHERE id = $1`,
    [id],
  );
  return result.rows[0];
}

describe('KAN-34 draft update persistence', () => {
  it('saves a changed field and leaves other fields unchanged', async () => {
    const eventRequestId = await createEvent();
    const updated = await updateOwnedDraft(dependencies, {
      eventRequestId, actor: organiser, input: { name: 'Updated name' },
    });

    expect(updated.name).toBe('Updated name');
    expect(updated.purpose).toBe('Original purpose');
    expect(updated.status).toBe('DRAFT');
    const state = await readState(eventRequestId);
    expect(state.name).toBe('Updated name');
    expect(state.purpose).toBe('Original purpose');
    expect(state.updatedAt).not.toEqual(originalUpdatedAt);
  });

  it('clears a field when explicitly set to null without touching omitted fields', async () => {
    const eventRequestId = await createEvent();
    const updated = await updateOwnedDraft(dependencies, {
      eventRequestId, actor: organiser, input: { purpose: null },
    });

    expect(updated.purpose).toBeNull();
    expect(updated.name).toBe('Original name');
  });

  it('keeps the request in DRAFT status after saving changes', async () => {
    const eventRequestId = await createEvent();
    await updateOwnedDraft(dependencies, {
      eventRequestId, actor: organiser, input: { name: 'Still a draft' },
    });
    const state = await readState(eventRequestId);
    expect(state.status).toBe('DRAFT');
  });

  it('reflects the latest saved values when read again afterwards', async () => {
    const eventRequestId = await createEvent();
    await updateOwnedDraft(dependencies, {
      eventRequestId, actor: organiser, input: { name: 'First save' },
    });
    await updateOwnedDraft(dependencies, {
      eventRequestId, actor: organiser, input: { description: 'Added later' },
    });
    const state = await readState(eventRequestId);
    expect(state.name).toBe('First save');
    expect(state.description).toBe('Added later');
  });

  it.each([
    { name: 'a different organiser', actor: otherOrganiser, status: 'DRAFT' as const, code: 'DRAFT_EDIT_FORBIDDEN' },
    { name: 'an unauthenticated actor', actor: null, status: 'DRAFT' as const, code: 'DRAFT_EDIT_FORBIDDEN' },
    { name: 'a submitted request', actor: organiser, status: 'SUBMITTED' as const, code: 'DRAFT_NOT_EDITABLE' },
  ])('leaves data unchanged for $name', async ({ actor, status, code }) => {
    const eventRequestId = await createEvent(status);
    const before = await readState(eventRequestId);
    await expect(updateOwnedDraft(dependencies, {
      eventRequestId, actor, input: { name: 'Attempted change' },
    })).rejects.toMatchObject({ code });
    expect(await readState(eventRequestId)).toEqual(before);
  });

  it('reports a missing request without recording a change', async () => {
    const eventRequestId = randomUUID();
    await expect(updateOwnedDraft(dependencies, {
      eventRequestId, actor: organiser, input: { name: 'Attempted change' },
    })).rejects.toBeInstanceOf(DraftRequestNotFoundError);
  });

  it('saves a draft through HTTP and reflects it on the next GET', async () => {
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

    const patchResponse = await request(app)
      .patch(`/api/events/${eventRequestId}`)
      .send({ name: 'Saved via HTTP' });
    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.name).toBe('Saved via HTTP');
    expect(patchResponse.body.status).toBe('DRAFT');

    const getResponse = await request(app).get(`/api/events/${eventRequestId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.name).toBe('Saved via HTTP');
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

    const response = await request(app)
      .patch(`/api/events/${eventRequestId}`)
      .send({ name: 'Attempted change' });

    expect(response.status).toBe(404);
    expect(await readState(eventRequestId)).toEqual(before);
  });
});

describe('KAN-34-AC101 strict calendar-date draft validation', () => {
  const app = createApp({
    database: pool,
    submittedRequests: {
      pool,
      canViewRequest: () => true,
      canReviewRequest: () => false,
      authenticate: async () => organiser,
    },
  });

  async function readStartsAt(id: string): Promise<string | null> {
    const result = await pool.query('SELECT starts_at AS "startsAt" FROM event_requests WHERE id = $1', [id]);
    const startsAt = result.rows[0].startsAt as Date | null;
    return startsAt === null ? null : startsAt.toISOString();
  }

  it.each(['2026-02-30T09:00:00Z', '2027-02-29T09:00:00Z', '2026-13-01T09:00:00Z'])(
    'refuses %s as a validation error and leaves the draft unchanged',
    async (startsAt) => {
      const eventRequestId = await createEvent();
      const before = await readState(eventRequestId);

      const response = await request(app).patch(`/api/events/${eventRequestId}`).send({ startsAt, name: 'Changed' });

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual({
        code: 'INVALID_DRAFT_UPDATE', message: 'startsAt must be an ISO 8601 date-time string or null.',
      });
      expect(await readState(eventRequestId)).toEqual(before);
      expect(await readStartsAt(eventRequestId)).toBeNull();
    },
  );

  it.each([
    ['2028-02-29T09:00:00Z', '2028-02-29T09:00:00.000Z'],
    ['2028-02-29T17:00:00+08:00', '2028-02-29T09:00:00.000Z'],
  ])('saves the real date-time %s', async (startsAt, stored) => {
    const eventRequestId = await createEvent();

    const response = await request(app).patch(`/api/events/${eventRequestId}`).send({ startsAt });

    expect(response.status).toBe(200);
    expect(response.body.startsAt).toBe(stored);
    expect(await readStartsAt(eventRequestId)).toBe(stored);
  });
});
