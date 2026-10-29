import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
let a1: WorkflowActor;
let a2: WorkflowActor;
let a3: WorkflowActor;
const api = '/api/attendee';
const SECOND = 1000;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Olivia Organiser');
  coordinator = await fixture.createUser('EVENT_COORDINATOR', 'Casey Coordinator');
  a1 = await fixture.createUser('ATTENDEE', 'Ava Attendee');
  a2 = await fixture.createUser('ATTENDEE', 'Ben Attendee');
  a3 = await fixture.createUser('ATTENDEE', 'Cleo Attendee');
});
afterAll(async () => { await fixture?.destroy(); });

function app(actor: WorkflowActor | null) {
  // Only identity verification is substituted; the service, locks, triggers and constraints are real PostgreSQL.
  const authenticate = async () => actor as never;
  const assigned = (who: { id: string }, found: { coordinatorId: string | null }) => who.id === found.coordinatorId;
  return createApp({ database: fixture.pool, workspace: { pool: fixture.pool, authenticate: async () => actor },
    submittedRequests: { pool: fixture.pool, authenticate, canViewRequest: assigned as never, canReviewRequest: assigned as never } });
}

interface EventOptions {
  status?: 'CONFIRMED' | 'APPROVED' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED';
  required?: boolean | null; capacity?: number | null; opensMs?: number | null; closesMs?: number | null; startsMs?: number; endsMs?: number;
  description?: string | null;
}
async function event(options: EventOptions = {}): Promise<string> {
  const id = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: options.status ?? 'CONFIRMED',
    startsAt: at(options.startsMs ?? 7 * 24 * 3600 * SECOND), endsAt: at(options.endsMs ?? 7 * 24 * 3600 * SECOND + 3_600_000), name: `Registration ${randomUUID()}` });
  await fixture.pool.query(`UPDATE event_requests SET registration_required=$2, registration_capacity=$3, registration_opens_at=$4,
    registration_closes_at=$5, description=$6, accessibility_needs='Step-free entrance' WHERE id=$1`,
  [id, options.required === undefined ? true : options.required, options.capacity === undefined ? 10 : options.capacity,
    options.opensMs === undefined || options.opensMs === null ? null : at(options.opensMs),
    options.closesMs === undefined || options.closesMs === null ? null : at(options.closesMs), options.description ?? 'Meet employers']);
  return id;
}
const register = (id: string, actor: WorkflowActor | null, body: unknown = {}) => request(app(actor)).post(`${api}/events/${id}/register`).send(body as object);
const rows = async (eventId: string, attendeeId?: string) => (await fixture.pool.query(
  `SELECT * FROM event_registrations WHERE event_request_id=$1 AND ($2::uuid IS NULL OR attendee_id=$2) ORDER BY registered_at`, [eventId, attendeeId ?? null])).rows;
const active = async (eventId: string) => Number((await fixture.pool.query(
  `SELECT count(*) FROM event_registrations WHERE event_request_id=$1 AND status='REGISTERED'`, [eventId])).rows[0].count);
const notices = async (eventId: string, type: string) => (await fixture.pool.query(
  'SELECT recipient_id, message FROM notifications WHERE event_request_id=$1 AND type=$2 ORDER BY recipient_id', [eventId, type])).rows;

describe('KAN-14 registering for an event against real PostgreSQL', () => {
  it('KAN-14-AC1/AC101 shows the details and conditions an attendee needs, and nothing about people', async () => {
    const id = await event({ capacity: 5, opensMs: -3_600_000, closesMs: 3 * 24 * 3600 * SECOND });
    const venueId = randomUUID();
    await fixture.pool.query(`INSERT INTO venues(id,name,location,capacity) VALUES($1,$2,'Level 2, Block A',100)`, [venueId, `Hall ${venueId}`]);
    await fixture.pool.query(`INSERT INTO venue_bookings(id,event_request_id,venue_id,requested_by,starts_at,ends_at,status,decided_by,decided_at)
      SELECT $4,$1,$2,$3,starts_at,ends_at,'APPROVED',$3,now() FROM event_requests WHERE id=$1`, [id, venueId, coordinator.id, randomUUID()]);
    const pending = randomUUID();
    await fixture.pool.query(`INSERT INTO venues(id,name,capacity) VALUES($1,$2,10)`, [pending, `Pending ${pending}`]);
    await fixture.pool.query(`INSERT INTO venue_bookings(event_request_id,venue_id,requested_by,starts_at,ends_at)
      SELECT $1,$2,$3,starts_at,ends_at FROM event_requests WHERE id=$1`, [id, pending, coordinator.id]);
    await register(id, a2).expect(201);
    const response = await request(app(a1)).get(`${api}/events/${id}`).expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.event).toMatchObject({ id, status: 'CONFIRMED', description: 'Meet employers', accessibilityNeeds: 'Step-free entrance',
      registration: { required: true, capacity: 5, placesRemaining: 4 } });
    expect(response.body.event.venues).toHaveLength(1);
    expect(response.body.event.venues[0]).toMatchObject({ location: 'Level 2, Block A' });
    expect(response.body.event.registration.opensAt).toBeTruthy();
    expect(response.body.availability).toMatchObject({ canRegister: true, reason: null, placesRemaining: 4 });
    expect(response.body.registration).toBeNull();
    const text = JSON.stringify(response.body);
    for (const hidden of [organiser.id, coordinator.id, a2.id, 'Olivia', 'Casey', 'Ben Attendee', 'equipment']) expect(text).not.toContain(hidden);
  });

  it('KAN-14-AC3/AC4 saves one registration for the right attendee and event, and shows it again after a reload', async () => {
    const id = await event();
    const other = await event();
    const response = await register(id, a1);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ changed: true, registration: { status: 'REGISTERED', withdrawnAt: null },
      availability: { canRegister: false, reason: 'ALREADY_REGISTERED' }, event: { registration: { placesRemaining: 9 } } });
    expect(await rows(id)).toEqual([expect.objectContaining({ attendee_id: a1.id, status: 'REGISTERED', withdrawn_at: null })]);
    expect(await rows(other)).toEqual([]);
    const reopened = await request(app(a1)).get(`${api}/events/${id}`).expect(200);
    expect(reopened.body.registration).toMatchObject({ id: response.body.registration.id, status: 'REGISTERED' });
    const mine = (await request(app(a1)).get(`${api}/registrations`).expect(200)).body.items;
    const own = mine.filter((item: { event: { id: string } }) => item.event.id === id);
    expect(own).toHaveLength(1);
    expect(own[0]).toMatchObject({ status: 'REGISTERED', event: { id, status: 'CONFIRMED' } });
    expect(mine.map((item: { event: { id: string } }) => item.event.id)).not.toContain(other);
  });

  it('KAN-14-AC8 shows another attendee nothing of a registration that is not theirs', async () => {
    const id = await event();
    await register(id, a1).expect(201);
    const seen = (await request(app(a2)).get(`${api}/events/${id}`).expect(200)).body;
    expect(seen.registration).toBeNull();
    expect(seen.availability.canRegister).toBe(true);
    expect((await request(app(a2)).get(`${api}/registrations`).expect(200)).body.items.map((item: { event: { id: string } }) => item.event.id)).not.toContain(id);
    const forged = await register(id, a2, { attendeeId: a1.id });
    expect(forged.status).toBe(400);
    expect(forged.body.error.code).toBe('INVALID_INPUT');
    expect(await rows(id, a2.id)).toEqual([]);
    expect((await register(id, a2).set('X-User-Id', a1.id)).status).toBe(201);
    expect((await rows(id)).map(row => row.attendee_id).sort()).toEqual([a1.id, a2.id].sort());
  });

  it.each([
    ['an APPROVED event', { status: 'APPROVED' as const }], ['a SUBMITTED event', { status: 'SUBMITTED' as const }],
    ['a COMPLETED event with no registration', { status: 'COMPLETED' as const }], ['a CANCELLED event with no registration', { status: 'CANCELLED' as const }],
  ])('KAN-14-AC2 does not reveal or register %s', async (_name, options) => {
    const id = await event(options);
    expect((await request(app(a1)).get(`${api}/events/${id}`)).status).toBe(404);
    const response = await register(id, a1);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
    expect(await rows(id)).toEqual([]);
  });

  it.each([
    ['registration switched off', { required: false }, 'REGISTRATION_DISABLED'],
    ['registration never decided', { required: null }, 'REGISTRATION_DISABLED'],
    ['the window not yet open', { opensMs: 120 * SECOND }, 'REGISTRATION_NOT_OPEN'],
    ['the window already closed', { closesMs: -2 * SECOND }, 'REGISTRATION_CLOSED'],
    ['the event already started', { startsMs: -60 * SECOND, endsMs: 3_600_000 }, 'REGISTRATION_EVENT_STARTED'],
    ['capacity zero', { capacity: 0 }, 'REGISTRATION_FULL'],
  ])('KAN-14-AC2/AC6 refuses with a clear reason when %s, and creates no record', async (_name, options, code) => {
    const id = await event(options as EventOptions);
    const response = await register(id, a1);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe(code);
    expect(response.body.error.message.length).toBeGreaterThan(10);
    expect(await rows(id)).toEqual([]);
    expect(await notices(id, 'REGISTRATION_CONFIRMED')).toEqual([]);
    const detail = (await request(app(a1)).get(`${api}/events/${id}`).expect(200)).body;
    expect(detail.availability.canRegister).toBe(false);
  });

  it('KAN-14-AC102 uses [opens, closes) by the database clock: just opened is accepted, just closed is refused', async () => {
    const opened = await event({ opensMs: -1 * SECOND, closesMs: 3_600_000 });
    expect((await register(opened, a1)).status).toBe(201);
    const closesSoon = await event({ opensMs: -3_600_000, closesMs: 2_500 });
    expect((await register(closesSoon, a1)).status).toBe(201);
    const closed = await event({ opensMs: -3_600_000, closesMs: 1_500 });
    await new Promise(resolve => setTimeout(resolve, 1_800));
    const response = await register(closed, a2);
    expect(response.body.error.code).toBe('REGISTRATION_CLOSED');
    expect(await rows(closed)).toEqual([]);
  });

  it('KAN-14-AC102 treats a null window and a null capacity as unbounded', async () => {
    const id = await event({ capacity: null, opensMs: null, closesMs: null });
    expect((await register(id, a1)).status).toBe(201);
    expect((await register(id, a2)).status).toBe(201);
    expect((await request(app(a3)).get(`${api}/events/${id}`).expect(200)).body.event.registration).toMatchObject({ capacity: null, placesRemaining: null });
  });

  it('KAN-14-AC7 refuses a duplicate active registration and keeps one record', async () => {
    const id = await event();
    await register(id, a1).expect(201);
    const again = await register(id, a1);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('REGISTRATION_ALREADY_REGISTERED');
    expect(await rows(id, a1.id)).toHaveLength(1);
    expect(await active(id)).toBe(1);
    expect(await notices(id, 'REGISTRATION_CONFIRMED')).toHaveLength(1);
  });

  it('KAN-14-AC103 lets a withdrawn attendee re-register on the same record, taking one place', async () => {
    const id = await event({ capacity: 2 });
    const first = await register(id, a1);
    await fixture.pool.query(`UPDATE event_registrations SET status='WITHDRAWN', withdrawn_at=now() WHERE id=$1`, [first.body.registration.id]);
    expect(await active(id)).toBe(0);
    const again = await register(id, a1);
    expect(again.status).toBe(201);
    expect(again.body.registration.id).toBe(first.body.registration.id);
    expect(again.body.registration).toMatchObject({ status: 'REGISTERED', withdrawnAt: null });
    expect(await rows(id, a1.id)).toHaveLength(1);
    expect(await active(id)).toBe(1);
    expect(await notices(id, 'REGISTRATION_CONFIRMED')).toHaveLength(2);
  });

  it('KAN-14-AC103 refuses a withdrawn attendee when the window has closed or the event is full, leaving the record unchanged', async () => {
    const closed = await event({ closesMs: 3_000 });
    const mine = await register(closed, a1);
    await fixture.pool.query(`UPDATE event_registrations SET status='WITHDRAWN', withdrawn_at=now() WHERE id=$1`, [mine.body.registration.id]);
    await new Promise(resolve => setTimeout(resolve, 3_300));
    const late = await register(closed, a1);
    expect(late.body.error.code).toBe('REGISTRATION_CLOSED');
    expect(await rows(closed, a1.id)).toEqual([expect.objectContaining({ status: 'WITHDRAWN' })]);
    const full = await event({ capacity: 1 });
    const withdrawn = await register(full, a1);
    await fixture.pool.query(`UPDATE event_registrations SET status='WITHDRAWN', withdrawn_at=now() WHERE id=$1`, [withdrawn.body.registration.id]);
    await register(full, a2).expect(201);
    const retry = await register(full, a1);
    expect(retry.body.error.code).toBe('REGISTRATION_FULL');
    expect(await rows(full, a1.id)).toEqual([expect.objectContaining({ status: 'WITHDRAWN' })]);
  });

  it('KAN-14-AC5/AC104 gives the last place to exactly one of two simultaneous attendees', async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const id = await event({ capacity: 1 });
      const results = await Promise.all([register(id, a1), register(id, a2)]);
      expect(results.map(result => result.status).sort()).toEqual([201, 409]);
      expect(results.find(result => result.status === 409)!.body.error.code).toBe('REGISTRATION_FULL');
      expect(await active(id)).toBe(1);
      const winner = (await rows(id))[0].attendee_id;
      expect((await notices(id, 'REGISTRATION_CONFIRMED')).map(item => item.recipient_id)).toEqual([winner]);
      expect((await notices(id, 'REGISTRATION_RECEIVED')).map(item => item.recipient_id).sort()).toEqual([organiser.id, coordinator.id].sort());
    }
  });

  it('KAN-14-AC5 counts a place that committed while the request was waiting for the event lock', async () => {
    const id = await event({ capacity: 1 });
    const holder = await fixture.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT id FROM event_requests WHERE id = $1 FOR UPDATE', [id]);
      const pending = register(id, a1).then(response => response);
      const applicationName = new URL(fixture.pool.options.connectionString!).searchParams.get('application_name');
      for (let attempt = 0; attempt < 200; attempt++) {
        const waiting = await fixture.pool.query(`SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock'
          AND strpos(query,'FOR UPDATE')>0 AND pid <> pg_backend_pid()`, [applicationName]);
        if (waiting.rows.length) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      await holder.query('INSERT INTO event_registrations(event_request_id,attendee_id) VALUES($1,$2)', [id, a2.id]);
      await holder.query('COMMIT');
      const response = await pending;
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('REGISTRATION_FULL');
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      holder.release();
    }
    expect(await active(id)).toBe(1);
    expect((await rows(id))[0].attendee_id).toBe(a2.id);
    expect(await notices(id, 'REGISTRATION_CONFIRMED')).toEqual([]);
  });

  it('KAN-14-AC5 never exceeds capacity under many simultaneous attendees', async () => {
    const people = await Promise.all(Array.from({ length: 8 }, () => fixture.createUser('ATTENDEE')));
    const id = await event({ capacity: 3 });
    const results = await Promise.all(people.map(person => register(id, person)));
    expect(results.filter(result => result.status === 201)).toHaveLength(3);
    expect(results.filter(result => result.status === 409).every(result => result.body.error.code === 'REGISTRATION_FULL')).toBe(true);
    expect(await active(id)).toBe(3);
    expect((await notices(id, 'REGISTRATION_CONFIRMED'))).toHaveLength(3);
  });

  it('KAN-14-AC104 acknowledges the attendee and tells the managers only the running count', async () => {
    const id = await event({ capacity: 4 });
    await register(id, a1).expect(201);
    await register(id, a2).expect(201);
    expect((await notices(id, 'REGISTRATION_CONFIRMED')).map(item => item.recipient_id).sort()).toEqual([a1.id, a2.id].sort());
    const managers = await notices(id, 'REGISTRATION_RECEIVED');
    expect(managers.map(item => item.recipient_id).sort()).toEqual([organiser.id, coordinator.id, organiser.id, coordinator.id].sort());
    const name = (await fixture.eventRow(id)).name as string;
    expect(managers.map(item => item.message).sort()).toEqual([
      `A new attendee registered for “${name}”: 1 of 4 places taken.`, `A new attendee registered for “${name}”: 1 of 4 places taken.`,
      `A new attendee registered for “${name}”: 2 of 4 places taken.`, `A new attendee registered for “${name}”: 2 of 4 places taken.`,
    ]);
    expect(managers.every(item => !item.message.includes('Ava') && !item.message.includes('Ben'))).toBe(true);
    const inbox = await request(app(a1)).get('/api/notifications').expect(200);
    expect(inbox.body.items.find((item: { type: string; link: string | null }) => item.type === 'REGISTRATION_CONFIRMED' && item.link === `/attend/${id}`)).toMatchObject({ event: null });
    const strangerInbox = (await request(app(a3)).get('/api/notifications').expect(200)).body.items as { link: string | null }[];
    expect(strangerInbox.filter(item => item.link === `/attend/${id}`)).toEqual([]);
    const organiserInbox = (await request(app(organiser)).get('/api/notifications').expect(200)).body.items as { type: string; event: { id: string } | null }[];
    expect(organiserInbox.filter(item => item.type === 'REGISTRATION_RECEIVED' && item.event?.id === id)).toHaveLength(2);
  });

  it('rolls the registration back, and frees the place, if a notice cannot be written', async () => {
    const id = await event({ capacity: 1 });
    await fixture.pool.query(`CREATE FUNCTION registration_notice_fails() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.type = 'REGISTRATION_RECEIVED' THEN RAISE EXCEPTION 'notice failed'; END IF; RETURN NEW; END $$`);
    await fixture.pool.query('CREATE TRIGGER registration_notice_fails BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION registration_notice_fails()');
    try {
      expect((await register(id, a1)).status).toBe(500);
    } finally {
      await fixture.pool.query('DROP TRIGGER registration_notice_fails ON notifications');
      await fixture.pool.query('DROP FUNCTION registration_notice_fails()');
    }
    expect(await rows(id)).toEqual([]);
    expect(await notices(id, 'REGISTRATION_CONFIRMED')).toEqual([]);
    expect((await register(id, a2)).status).toBe(201);
  });

  it('keeps the database capacity guard as a last line even if the service were bypassed', async () => {
    const id = await event({ capacity: 1 });
    await register(id, a1).expect(201);
    await expect(fixture.pool.query('INSERT INTO event_registrations(event_request_id,attendee_id) VALUES($1,$2)', [id, a2.id]))
      .rejects.toMatchObject({ constraint: 'event_registrations_within_capacity' });
    const roomy = await event({ capacity: 5 });
    await register(roomy, a1).expect(201);
    await expect(fixture.pool.query('INSERT INTO event_registrations(event_request_id,attendee_id) VALUES($1,$2)', [roomy, a1.id]))
      .rejects.toMatchObject({ code: '23505' });
  });

  it('KAN-14-AC4 keeps showing an attendee their own registration after the event is completed or cancelled', async () => {
    const id = await event();
    await register(id, a1).expect(201);
    await fixture.pool.query(`UPDATE event_requests SET status='COMPLETED' WHERE id=$1`, [id]);
    const done = (await request(app(a1)).get(`${api}/events/${id}`).expect(200)).body;
    expect(done.registration.status).toBe('REGISTERED');
    expect(done.availability).toMatchObject({ canRegister: false, reason: 'ALREADY_REGISTERED' });
    expect((await request(app(a2)).get(`${api}/events/${id}`)).status).toBe(404);
    expect((await register(id, a2)).status).toBe(404);
  });

  it('lists only confirmed, registration-taking events that have not started, each with the caller\'s own state', async () => {
    const open = await event({ capacity: 3 });
    const off = await event({ required: false });
    const started = await event({ startsMs: -60 * SECOND, endsMs: 3_600_000 });
    const approved = await event({ status: 'APPROVED' });
    await register(open, a1).expect(201);
    const list = (await request(app(a1)).get(`${api}/events`).expect(200)).body.items as { id: string; ownStatus: string | null }[];
    const ids = list.map(item => item.id);
    expect(ids).toContain(open);
    for (const hidden of [off, started, approved]) expect(ids).not.toContain(hidden);
    expect(list.find(item => item.id === open)).toMatchObject({ ownStatus: 'REGISTERED', availability: { reason: 'ALREADY_REGISTERED' }, registration: { placesRemaining: 2 } });
    const other = (await request(app(a2)).get(`${api}/events`).expect(200)).body.items as { id: string; ownStatus: string | null }[];
    expect(other.find(item => item.id === open)).toMatchObject({ ownStatus: null, availability: { canRegister: true } });
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF'] as UserRole[])(
    'KAN-14-AC101 refuses %s on every route and registers nobody', async role => {
      const id = await event();
      const other = await fixture.createUser(role);
      for (const attempt of [request(app(other)).get(`${api}/events`), request(app(other)).get(`${api}/registrations`),
        request(app(other)).get(`${api}/events/${id}`), request(app(other)).post(`${api}/events/${id}/register`).send({})]) {
        expect((await attempt).status).toBe(403);
      }
      expect(await rows(id)).toEqual([]);
    });

  it('KAN-14-AC101 refuses a signed-out caller and an attendee whose role was removed before the write', async () => {
    const id = await event();
    expect((await register(id, null)).status).toBe(401);
    expect((await request(app(null)).get(`${api}/events`)).status).toBe(401);
    const demoted = await fixture.createUser('ATTENDEE');
    await fixture.pool.query(`UPDATE app_users SET role='EVENT_ORGANISER' WHERE id=$1`, [demoted.id]);
    expect((await register(id, demoted)).status).toBe(403);
    expect(await rows(id)).toEqual([]);
  });

  it('rejects a malformed event id and an unknown event', async () => {
    expect((await request(app(a1)).get(`${api}/events/not-a-uuid`)).body.error.code).toBe('INVALID_EVENT_ID');
    expect((await register(randomUUID(), a1)).body.error.code).toBe('EVENT_NOT_FOUND');
  });
});
