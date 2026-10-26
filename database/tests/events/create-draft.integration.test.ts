import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import { createDraft, DraftCreateForbiddenError } from '../../../backend/src/modules/events/create-draft.js';
import { updateEventRequest, type DraftActor } from '../../../backend/src/modules/events/update-draft.js';
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
const coordinator: DraftActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };

const dependencies = { pool };

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
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

async function readState(id: string) {
  const result = await pool.query(
    `SELECT organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status, name,
       expected_attendance AS "expectedAttendance", registration_required AS "registrationRequired",
       registration_capacity AS "registrationCapacity", registration_opens_at AS "registrationOpensAt",
       registration_closes_at AS "registrationClosesAt"
     FROM event_requests WHERE id = $1`,
    [id],
  );
  return result.rows[0];
}

async function countRequests(): Promise<number> {
  const result = await pool.query<{ count: number }>('SELECT count(*)::int AS count FROM event_requests');
  return result.rows[0]?.count ?? 0;
}

function appFor(actor: DraftActor | null) {
  return createApp({
    database: pool,
    submittedRequests: {
      pool,
      canViewRequest: () => true,
      canReviewRequest: () => false,
      authenticate: async () => actor,
    },
  });
}

describe('CF-02/CF-03 draft creation persistence', () => {
  it('creates an empty DRAFT owned by the organiser', async () => {
    const created = await createDraft(dependencies, { actor: organiser, input: undefined });

    expect(created).toMatchObject({
      organiserId: organiser.id, coordinatorId: null, status: 'DRAFT', name: null, startsAt: null,
      registrationRequired: null, registrationCapacity: null,
      registrationOpensAt: null, registrationClosesAt: null,
    });
    expect(created.createdAt).toBe(created.updatedAt);
    expect(await readState(created.id)).toMatchObject({
      organiserId: organiser.id, coordinatorId: null, status: 'DRAFT', name: null,
    });
  });

  it('stores the supplied fields, including the registration settings', async () => {
    const created = await createDraft(dependencies, {
      actor: organiser,
      input: {
        name: 'Career Fair', startsAt: '2026-10-01T09:00:00+08:00', expectedAttendance: 250,
        registrationRequired: true, registrationCapacity: 120,
        registrationOpensAt: '2026-09-20T01:00:00.000Z', registrationClosesAt: '2026-09-30T15:59:00.000Z',
      },
    });

    expect(created).toMatchObject({
      name: 'Career Fair', startsAt: '2026-10-01T01:00:00.000Z', endsAt: null, expectedAttendance: 250,
      registrationRequired: true, registrationCapacity: 120,
      registrationOpensAt: '2026-09-20T01:00:00.000Z', registrationClosesAt: '2026-09-30T15:59:00.000Z',
    });
    expect(await readState(created.id)).toMatchObject({
      name: 'Career Fair', expectedAttendance: 250, registrationCapacity: 120,
      registrationOpensAt: new Date('2026-09-20T01:00:00.000Z'),
    });
  });

  it('attributes the initial status history entry to the organiser', async () => {
    const created = await createDraft(dependencies, { actor: organiser, input: { name: 'Audited' } });
    const history = await pool.query(
      `SELECT from_status AS "fromStatus", to_status AS "toStatus", changed_by AS "changedBy"
       FROM event_status_history WHERE event_request_id = $1`,
      [created.id],
    );
    expect(history.rows).toEqual([{ fromStatus: null, toStatus: 'DRAFT', changedBy: organiser.id }]);
  });

  it('lets the owner keep editing the new draft, including its registration settings', async () => {
    const created = await createDraft(dependencies, { actor: organiser, input: { name: 'First save' } });
    const updated = await updateEventRequest(dependencies, {
      eventRequestId: created.id, actor: organiser,
      input: { registrationRequired: true, registrationCapacity: 40, registrationClosesAt: '2026-10-01T00:00:00Z' },
    });

    expect(updated).toMatchObject({
      name: 'First save', status: 'DRAFT', registrationRequired: true, registrationCapacity: 40,
      registrationOpensAt: null, registrationClosesAt: '2026-10-01T00:00:00.000Z',
    });
    const cleared = await updateEventRequest(dependencies, {
      eventRequestId: created.id, actor: organiser,
      input: { registrationRequired: false, registrationCapacity: null, registrationClosesAt: null },
    });
    expect(cleared).toMatchObject({ registrationCapacity: null, registrationClosesAt: null });
  });

  it.each([
    { name: 'an unauthenticated actor', actor: null },
    { name: 'a coordinator', actor: coordinator },
  ])('creates nothing for $name', async ({ actor }) => {
    const before = await countRequests();
    await expect(createDraft(dependencies, { actor, input: { name: 'Attempted' } }))
      .rejects.toBeInstanceOf(DraftCreateForbiddenError);
    expect(await countRequests()).toBe(before);
  });

  it('creates nothing when the input is invalid', async () => {
    const before = await countRequests();
    await expect(createDraft(dependencies, {
      actor: organiser, input: { name: 'Forged owner', organiserId: otherOrganiser.id },
    })).rejects.toThrow('Unsupported field: organiserId.');
    expect(await countRequests()).toBe(before);
  });

  it('creates a draft through HTTP and returns it on the next GET and draft list', async () => {
    const app = appFor(organiser);

    const postResponse = await request(app).post('/api/events').send({ name: 'Created via HTTP' });
    expect(postResponse.status).toBe(201);
    expect(postResponse.body).toMatchObject({
      name: 'Created via HTTP', status: 'DRAFT', organiserId: organiser.id,
    });

    const getResponse = await request(app).get(`/api/events/${postResponse.body.id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.name).toBe('Created via HTTP');
    expect(getResponse.body.actions.canEditDraft).toBe(true);

    const listResponse = await request(app).get('/api/events?scope=drafts');
    expect(listResponse.body.items.map((item: { id: string }) => item.id)).toContain(postResponse.body.id);
  });

  it('ignores a forged owner through HTTP and hides the draft from other organisers', async () => {
    const before = await countRequests();
    const forged = await request(appFor(organiser)).post('/api/events')
      .send({ name: 'Forged', organiserId: otherOrganiser.id });
    expect(forged.status).toBe(400);
    expect(forged.body.error.code).toBe('INVALID_DRAFT_INPUT');
    expect(await countRequests()).toBe(before);

    const created = await request(appFor(organiser)).post('/api/events').send({ name: 'Private draft' });
    const patch = await request(appFor(otherOrganiser))
      .patch(`/api/events/${created.body.id}`).send({ name: 'Attempted change' });
    expect(patch.status).toBe(404);
    expect((await readState(created.body.id)).name).toBe('Private draft');
  });

  it('refuses a coordinator through HTTP without creating a row', async () => {
    const before = await countRequests();
    const response = await request(appFor(coordinator)).post('/api/events').send({ name: 'Attempted' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('DRAFT_CREATE_FORBIDDEN');
    expect(await countRequests()).toBe(before);
  });
});
