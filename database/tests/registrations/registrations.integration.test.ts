import { randomUUID } from 'node:crypto';
import express from 'express';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getDiscoverableEvent,
  listAttendees,
  listDiscoverableEvents,
  listMyRegistrations,
  registerForEvent,
  withdrawFromEvent,
  type RegistrationActor,
} from '../../../backend/src/modules/registrations/registration-service.js';
import { createRegistrationsRouter } from '../../../backend/src/modules/registrations/router.js';
import { migrate } from '../../migrate.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
scopedUrl.searchParams.set('application_name', schema);
const pool = new pg.Pool({
  connectionString: scopedUrl.toString(), max: 6,
  connectionTimeoutMillis: 5_000, statement_timeout: 5_000,
});
const dependencies = { pool };

const organiser: RegistrationActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const otherOrganiser: RegistrationActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const coordinator: RegistrationActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const otherCoordinator: RegistrationActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const venueStaff: RegistrationActor = { id: randomUUID(), role: 'VENUE_STAFF' };
const alice: RegistrationActor = { id: randomUUID(), role: 'ATTENDEE' };
const ben: RegistrationActor = { id: randomUUID(), role: 'ATTENDEE' };
const names = new Map([[alice.id, 'Alice Tan'], [ben.id, 'Ben Lim']]);

const hours = (count: number) => new Date(Date.now() + count * 3_600_000);

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  for (const actor of [organiser, otherOrganiser, coordinator, otherCoordinator, venueStaff, alice, ben]) {
    await pool.query(
      'INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, $3, $4)',
      [actor.id, `${actor.id}@example.test`, names.get(actor.id) ?? actor.role, actor.role],
    );
  }
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

interface EventFixture {
  status?: string;
  registrationRequired?: boolean | null;
  capacity?: number | null;
  startsAt?: Date | null;
  opensAt?: Date | null;
  closesAt?: Date | null;
  name?: string;
}

async function createEvent(fixture: EventFixture = {}): Promise<string> {
  const id = randomUUID();
  const startsAt = fixture.startsAt === undefined ? hours(48) : fixture.startsAt;
  await pool.query(
    `INSERT INTO event_requests (id, organiser_id, coordinator_id, status, name, purpose, description,
       starts_at, ends_at, venue_requirements, registration_required, registration_capacity,
       registration_opens_at, registration_closes_at)
     VALUES ($1, $2, $3, $4, $5, 'Public purpose', 'Public description', $6, $7,
       'INTERNAL venue requirements', $8, $9, $10, $11)`,
    [
      id, organiser.id, coordinator.id, fixture.status ?? 'APPROVED', fixture.name ?? 'Career fair',
      startsAt, startsAt ? new Date(startsAt.getTime() + 3_600_000) : null,
      fixture.registrationRequired === undefined ? true : fixture.registrationRequired,
      fixture.capacity ?? null, fixture.opensAt ?? null, fixture.closesAt ?? null,
    ],
  );
  return id;
}

async function registrationRows(eventId: string) {
  const result = await pool.query(
    `SELECT attendee_id, status, withdrawn_at FROM event_registrations
     WHERE event_request_id = $1 ORDER BY registered_at, id`,
    [eventId],
  );
  return result.rows;
}

async function notificationsFor(eventId: string) {
  const result = await pool.query(
    'SELECT recipient_id, type FROM notifications WHERE event_request_id = $1 ORDER BY created_at, type',
    [eventId],
  );
  return result.rows.map((row) => `${row.recipient_id}:${row.type}`).sort();
}

describe('CF-18 attendee registration persistence', () => {
  it('lists only discoverable events with public fields, counts, venue and the caller\'s status', async () => {
    const open = await createEvent({ capacity: 3, name: 'Open evening' });
    const confirmed = await createEvent({ status: 'CONFIRMED', name: 'Confirmed talk' });
    const hidden = await Promise.all([
      createEvent({ status: 'DRAFT' }), createEvent({ status: 'SUBMITTED' }), createEvent({ status: 'REJECTED' }),
      createEvent({ status: 'CANCELLED' }), createEvent({ status: 'COMPLETED' }),
      createEvent({ registrationRequired: false }), createEvent({ registrationRequired: null }),
    ]);
    const venueId = randomUUID();
    await pool.query(
      "INSERT INTO venues (id, name, location, capacity) VALUES ($1, $2, 'Level 2, Block A', 100)",
      [venueId, `Hall ${venueId}`],
    );
    await pool.query(
      `INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, status, starts_at, ends_at, decided_by, decided_at)
       VALUES ($1, $2, $3, 'APPROVED', $4, $5, $6, now())`,
      [open, venueId, organiser.id, hours(48), hours(49), venueStaff.id],
    );
    await registerForEvent(dependencies, alice, open);

    const items = await listDiscoverableEvents(dependencies, alice);
    const ids = items.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining([open, confirmed]));
    hidden.forEach((id) => expect(ids).not.toContain(id));

    const item = items.find((candidate) => candidate.id === open)!;
    expect(item).toEqual({
      id: open, name: 'Open evening', purpose: 'Public purpose', description: 'Public description',
      startsAt: expect.any(String), endsAt: expect.any(String),
      venue: { name: `Hall ${venueId}`, location: 'Level 2, Block A' },
      registrationCapacity: 3, registeredCount: 1, spotsLeft: 2,
      registrationOpensAt: null, registrationClosesAt: null,
      isOpen: true, closedReason: null, myRegistrationStatus: 'REGISTERED',
    });
    // Nothing internal leaks, even under other key names.
    const serialised = JSON.stringify(items);
    for (const secret of [organiser.id, coordinator.id, 'INTERNAL venue requirements']) {
      expect(serialised).not.toContain(secret);
    }

    expect((await getDiscoverableEvent(dependencies, ben, open)).myRegistrationStatus).toBeNull();
    expect((await getDiscoverableEvent(dependencies, organiser, confirmed)).venue).toBeNull();
    for (const id of [...hidden, randomUUID()]) {
      await expect(getDiscoverableEvent(dependencies, alice, id)).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
    }
  });

  it('registers, notifies the organiser and attendee, and refuses a duplicate', async () => {
    const eventId = await createEvent({ capacity: 5 });
    const saved = await registerForEvent(dependencies, alice, eventId);
    expect(saved).toEqual({
      registrationId: expect.any(String), eventRequestId: eventId, status: 'REGISTERED',
      registeredAt: expect.any(String), withdrawnAt: null,
    });
    expect(await notificationsFor(eventId)).toEqual([
      `${alice.id}:REGISTRATION_CONFIRMED`, `${organiser.id}:ATTENDEE_REGISTERED`,
    ].sort());
    const organiserMessage = await pool.query(
      "SELECT message FROM notifications WHERE event_request_id = $1 AND type = 'ATTENDEE_REGISTERED'", [eventId],
    );
    expect(organiserMessage.rows[0].message).toBe('Alice Tan registered for Career fair.');

    await expect(registerForEvent(dependencies, alice, eventId)).rejects.toMatchObject({ code: 'ALREADY_REGISTERED' });
    expect(await registrationRows(eventId)).toHaveLength(1);
    expect(await notificationsFor(eventId)).toHaveLength(2);
  });

  it('withdraws, then re-registers by reusing the same row', async () => {
    const eventId = await createEvent({ capacity: 1 });
    const first = await registerForEvent(dependencies, alice, eventId);
    const withdrawn = await withdrawFromEvent(dependencies, alice, eventId);
    expect(withdrawn).toMatchObject({ registrationId: first.registrationId, status: 'WITHDRAWN' });
    expect(withdrawn.withdrawnAt).toEqual(expect.any(String));
    expect(await notificationsFor(eventId)).toEqual(expect.arrayContaining([
      `${alice.id}:REGISTRATION_WITHDRAWN`, `${organiser.id}:ATTENDEE_WITHDREW`,
    ]));
    await expect(withdrawFromEvent(dependencies, alice, eventId)).rejects.toMatchObject({ code: 'NOT_REGISTERED' });

    // The freed place can be taken, and the withdrawn attendee then finds the event full.
    await registerForEvent(dependencies, ben, eventId);
    await expect(registerForEvent(dependencies, alice, eventId))
      .rejects.toMatchObject({ code: 'REGISTRATION_FULL', reason: 'FULL' });
    await withdrawFromEvent(dependencies, ben, eventId);

    const again = await registerForEvent(dependencies, alice, eventId);
    expect(again).toMatchObject({ registrationId: first.registrationId, status: 'REGISTERED', withdrawnAt: null });
    expect(new Date(again.registeredAt).getTime()).toBeGreaterThanOrEqual(new Date(first.registeredAt).getTime());
    const rows = await registrationRows(eventId);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.attendee_id === alice.id)).toMatchObject({ status: 'REGISTERED', withdrawn_at: null });
  });

  it.each([
    ['REGISTRATION_CLOSED', 'NOT_OPEN_YET', { opensAt: hours(1) }],
    ['REGISTRATION_CLOSED', 'REGISTRATION_ENDED', { closesAt: hours(-1) }],
    ['REGISTRATION_CLOSED', 'EVENT_STARTED', { startsAt: hours(-1) }],
    ['REGISTRATION_FULL', 'FULL', { capacity: 0 }],
  ] as const)('refuses registration with %s (%s) and writes nothing', async (code, reason, fixture) => {
    const eventId = await createEvent(fixture);
    await expect(registerForEvent(dependencies, alice, eventId)).rejects.toMatchObject({ code, reason });
    expect(await registrationRows(eventId)).toEqual([]);
    expect(await notificationsFor(eventId)).toEqual([]);
    expect(await getDiscoverableEvent(dependencies, alice, eventId))
      .toMatchObject({ isOpen: false, closedReason: reason });
  });

  it('accepts registration inside an explicit window', async () => {
    const eventId = await createEvent({ opensAt: hours(-1), closesAt: hours(1) });
    await expect(registerForEvent(dependencies, alice, eventId)).resolves.toMatchObject({ status: 'REGISTERED' });
  });

  it('hides non-discoverable events from registration and refuses other roles', async () => {
    for (const fixture of [{ status: 'DRAFT' }, { status: 'CANCELLED' }, { registrationRequired: false }]) {
      const eventId = await createEvent(fixture);
      await expect(registerForEvent(dependencies, alice, eventId)).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
      await expect(withdrawFromEvent(dependencies, alice, eventId)).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
    }
    await expect(registerForEvent(dependencies, alice, randomUUID())).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
    const eventId = await createEvent();
    await expect(registerForEvent(dependencies, organiser, eventId)).rejects.toMatchObject({ code: 'REGISTRATION_FORBIDDEN' });
    await expect(withdrawFromEvent(dependencies, coordinator, eventId)).rejects.toMatchObject({ code: 'REGISTRATION_FORBIDDEN' });
    expect(await registrationRows(eventId)).toEqual([]);
  });

  it('refuses withdrawal once the event has started but still allows it after cancellation', async () => {
    const started = await createEvent();
    await registerForEvent(dependencies, alice, started);
    await pool.query('UPDATE event_requests SET starts_at = $2 WHERE id = $1', [started, hours(-1)]);
    await expect(withdrawFromEvent(dependencies, alice, started)).rejects.toMatchObject({ code: 'WITHDRAWAL_CLOSED' });
    expect((await registrationRows(started))[0]).toMatchObject({ status: 'REGISTERED' });

    const cancelled = await createEvent();
    await registerForEvent(dependencies, alice, cancelled);
    await pool.query("UPDATE event_requests SET status = 'CANCELLED' WHERE id = $1", [cancelled]);
    await expect(withdrawFromEvent(dependencies, alice, cancelled)).resolves.toMatchObject({ status: 'WITHDRAWN' });
  });

  it('rolls the registration back when its notification cannot be saved', async () => {
    const eventId = await createEvent({ name: 'Rollback check' });
    // A fixture trigger fails the notification insert inside the same transaction.
    await pool.query(`
      CREATE FUNCTION fail_rollback_check() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.event_request_id = '${eventId}' THEN RAISE EXCEPTION 'notification failure'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER notifications_fail_rollback_check BEFORE INSERT ON notifications
        FOR EACH ROW EXECUTE FUNCTION fail_rollback_check();
    `);
    try {
      await expect(registerForEvent(dependencies, alice, eventId)).rejects.toThrow('notification failure');
      expect(await registrationRows(eventId)).toEqual([]);
    } finally {
      await pool.query('DROP TRIGGER notifications_fail_rollback_check ON notifications; DROP FUNCTION fail_rollback_check();');
    }
  });

  it('lets exactly one of two simultaneous registrations take the last place', async () => {
    for (let round = 0; round < 5; round += 1) {
      const eventId = await createEvent({ capacity: 1 });
      const results = await Promise.allSettled([
        registerForEvent(dependencies, alice, eventId), registerForEvent(dependencies, ben, eventId),
      ]);
      const fulfilled = results.filter((result) => result.status === 'fulfilled');
      const rejected = results.filter((result) => result.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ code: 'REGISTRATION_FULL' });
      const rows = await registrationRows(eventId);
      expect(rows.filter((row) => row.status === 'REGISTERED')).toHaveLength(1);
      // The loser's notifications rolled back with its registration.
      expect(await notificationsFor(eventId)).toHaveLength(2);
    }
  });

  it('lets exactly one of two simultaneous re-registrations reuse its row for the last place', async () => {
    const eventId = await createEvent({ capacity: 2 });
    await registerForEvent(dependencies, alice, eventId);
    await registerForEvent(dependencies, ben, eventId);
    await withdrawFromEvent(dependencies, alice, eventId);
    await withdrawFromEvent(dependencies, ben, eventId);
    await pool.query('UPDATE event_requests SET registration_capacity = 1 WHERE id = $1', [eventId]);
    const results = await Promise.allSettled([
      registerForEvent(dependencies, alice, eventId), registerForEvent(dependencies, ben, eventId),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason)
      .toMatchObject({ code: 'REGISTRATION_FULL' });
  });

  it('keeps one REGISTERED row when the same attendee double-submits', async () => {
    const eventId = await createEvent();
    const results = await Promise.allSettled([
      registerForEvent(dependencies, alice, eventId), registerForEvent(dependencies, alice, eventId),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason)
      .toMatchObject({ code: 'ALREADY_REGISTERED' });
    expect(await registrationRows(eventId)).toHaveLength(1);
  });

  it('lists the caller\'s own registrations with an event summary', async () => {
    const carol: RegistrationActor = { id: randomUUID(), role: 'ATTENDEE' };
    await pool.query(
      "INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, 'Carol', 'ATTENDEE')",
      [carol.id, `${carol.id}@example.test`],
    );
    const kept = await createEvent({ name: 'Kept event' });
    const left = await createEvent({ name: 'Left event' });
    await registerForEvent(dependencies, carol, kept);
    await registerForEvent(dependencies, carol, left);
    await registerForEvent(dependencies, alice, left);
    await withdrawFromEvent(dependencies, carol, left);

    const mine = await listMyRegistrations(dependencies, carol);
    expect(mine.map((item) => [item.event.name, item.status, item.event.canWithdraw])).toEqual([
      ['Left event', 'WITHDRAWN', false], ['Kept event', 'REGISTERED', true],
    ]);
    expect(mine[1]).toMatchObject({
      eventRequestId: kept, withdrawnAt: null,
      event: { id: kept, status: 'APPROVED', startsAt: expect.any(String), venue: null },
    });
    expect(JSON.stringify(mine)).not.toContain(organiser.id);
    expect(await listMyRegistrations(dependencies, venueStaff)).toEqual([]);
  });

  it('shows attendees only to the owning organiser and the assigned coordinator', async () => {
    const eventId = await createEvent({ capacity: 10 });
    await registerForEvent(dependencies, alice, eventId);
    await registerForEvent(dependencies, ben, eventId);
    await withdrawFromEvent(dependencies, ben, eventId);

    for (const viewer of [organiser, coordinator]) {
      const list = await listAttendees(dependencies, viewer, eventId);
      expect(list.counts).toEqual({ registered: 1, withdrawn: 1, capacity: 10, spotsLeft: 9 });
      expect(list.items).toEqual([
        {
          registrationId: expect.any(String), displayName: 'Alice Tan', email: `${alice.id}@example.test`,
          status: 'REGISTERED', registeredAt: expect.any(String), withdrawnAt: null,
        },
        {
          registrationId: expect.any(String), displayName: 'Ben Lim', email: `${ben.id}@example.test`,
          status: 'WITHDRAWN', registeredAt: expect.any(String), withdrawnAt: expect.any(String),
        },
      ]);
    }
    for (const viewer of [otherOrganiser, otherCoordinator, venueStaff, alice]) {
      await expect(listAttendees(dependencies, viewer, eventId)).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
    }
    // Role alone is not enough: a coordinator id stored as organiser_id must not match.
    await expect(listAttendees(dependencies, { id: coordinator.id, role: 'EVENT_ORGANISER' }, eventId))
      .rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
  });

  it('serves the same rules over HTTP', async () => {
    let actor: RegistrationActor | null = alice;
    const app = express();
    app.use(express.json());
    app.use('/api/registrations', createRegistrationsRouter({ pool, authenticate: async () => actor }));
    const eventId = await createEvent({ capacity: 1 });

    const registered = await request(app).post(`/api/registrations/events/${eventId}/register`);
    expect(registered.status).toBe(201);
    expect((await request(app).post(`/api/registrations/events/${eventId}/register`)).body.error.code)
      .toBe('ALREADY_REGISTERED');
    const detail = await request(app).get(`/api/registrations/events/${eventId}`);
    expect(detail.body).toMatchObject({ isOpen: false, closedReason: 'FULL', myRegistrationStatus: 'REGISTERED' });

    actor = ben;
    const full = await request(app).post(`/api/registrations/events/${eventId}/register`);
    expect(full.status).toBe(409);
    expect(full.body.error).toMatchObject({ code: 'REGISTRATION_FULL', reason: 'FULL' });
    expect((await request(app).post(`/api/registrations/events/${eventId}/withdraw`)).body.error.code)
      .toBe('NOT_REGISTERED');
    expect((await request(app).get(`/api/registrations/events/${eventId}/attendees`)).status).toBe(404);

    actor = organiser;
    const attendees = await request(app).get(`/api/registrations/events/${eventId}/attendees`);
    expect(attendees.status).toBe(200);
    expect(attendees.body.counts).toEqual({ registered: 1, withdrawn: 0, capacity: 1, spotsLeft: 0 });

    actor = null;
    expect((await request(app).get('/api/registrations/events')).status).toBe(401);
  });
});
