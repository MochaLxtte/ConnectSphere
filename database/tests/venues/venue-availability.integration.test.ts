import { randomBytes, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import { migrate } from '../../migrate.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
const pool = new pg.Pool({
  connectionString: scopedUrl.toString(),
  connectionTimeoutMillis: 5_000,
  statement_timeout: 5_000,
});
const supabaseUrl = 'https://auth-fixture.example.test';
const secret = randomBytes(32).toString('hex');
const signingKey = new TextEncoder().encode(secret);
// Same factory, session verifier and role gate as server.ts; tokens are signed locally.
const app = createRuntimeApp({ pool, isProduction: false });

// One Singapore-time week: Monday 5 October 00:00 to Monday 12 October 00:00 (+08:00).
const week = { from: '2026-10-05T00:00:00+08:00', to: '2026-10-12T00:00:00+08:00' };
const sgt = (dayAndTime: string) => new Date(`2026-10-${dayAndTime}:00+08:00`).toISOString();

type Account = { id: string; supabaseUserId: string; role: UserRole };
const accounts = {} as Record<
  'organiser' | 'coordinatorA' | 'coordinatorB' | 'venueStaff' | 'technician' | 'attendee', Account
>;
const venue = { hall: randomUUID(), room: randomUUID(), retired: randomUUID() };
const event = { fair: randomUUID(), dinner: randomUUID(), draft: randomUUID() };
const period = {} as Record<string, string>;

async function provision(role: UserRole): Promise<Account> {
  const account = { id: randomUUID(), supabaseUserId: randomUUID(), role };
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, role, supabase_user_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [account.id, `${account.id}@example.test`, 'Fixture member', role, account.supabaseUserId],
  );
  return account;
}

async function signIn(account: Account) {
  const token = await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(`${supabaseUrl}/auth/v1`)
    .setSubject(account.supabaseUserId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3_600)
    .sign(signingKey);
  const session = request.agent(app);
  const login = await session.post('/api/auth/login').send({ accessToken: token });
  expect(login.status).toBe(200);
  expect(login.body.user).toMatchObject({ id: account.id, role: account.role });
  return session;
}

async function createEvent(id: string, name: string, coordinatorId: string, status: EventStatus) {
  await pool.query(
    `INSERT INTO event_requests (id, organiser_id, coordinator_id, status, name)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, accounts.organiser.id, coordinatorId, status, name],
  );
}

async function addBooking(
  venueId: string, eventId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
  startsAt: string, endsAt: string,
): Promise<string> {
  const id = randomUUID();
  const decided = status === 'APPROVED' || status === 'REJECTED';
  await pool.query(
    `INSERT INTO venue_bookings (id, event_request_id, venue_id, requested_by, status, starts_at, ends_at,
       decided_by, decided_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, eventId, venueId, accounts.coordinatorA.id, status, startsAt, endsAt,
      decided ? accounts.venueStaff.id : null, decided ? new Date() : null],
  );
  return id;
}

async function addBlock(venueId: string, startsAt: string, endsAt: string, reason: string | null) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO venue_unavailability (id, venue_id, starts_at, ends_at, reason, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, venueId, startsAt, endsAt, reason, accounts.venueStaff.id],
  );
  return id;
}

beforeAll(async () => {
  vi.stubEnv('SUPABASE_URL', supabaseUrl);
  vi.stubEnv('SUPABASE_JWT_SECRET', secret);
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());

  accounts.organiser = await provision('EVENT_ORGANISER');
  accounts.coordinatorA = await provision('EVENT_COORDINATOR');
  accounts.coordinatorB = await provision('EVENT_COORDINATOR');
  accounts.venueStaff = await provision('VENUE_STAFF');
  accounts.technician = await provision('TECHNICAL_SUPPORT_STAFF');
  accounts.attendee = await provision('ATTENDEE');

  await pool.query(
    `INSERT INTO venues (id, name, location, capacity, opens_at, closes_at, is_active) VALUES
      ($1, 'Hall A', 'Level 1', 300, NULL, NULL, true),
      ($2, 'Room B', NULL, 40, NULL, NULL, true),
      ($3, 'Retired C', 'Annex', 80, NULL, NULL, false)`,
    [venue.hall, venue.room, venue.retired],
  );
  await createEvent(event.fair, 'Career fair', accounts.coordinatorA.id, 'APPROVED');
  await createEvent(event.dinner, 'Alumni dinner', accounts.coordinatorB.id, 'APPROVED');
  await createEvent(event.draft, 'Unsubmitted idea', accounts.coordinatorA.id, 'DRAFT');

  // Hall A: one confirmed booking and one block inside the week; the rest must not appear.
  period.fairBooking = await addBooking(venue.hall, event.fair, 'APPROVED', sgt('05T10:00'), sgt('05T12:00'));
  period.maintenance = await addBlock(venue.hall, sgt('06T09:00'), sgt('06T18:00'), 'Maintenance');
  period.pending = await addBooking(venue.hall, event.dinner, 'PENDING', sgt('05T14:00'), sgt('05T16:00'));
  await addBooking(venue.hall, event.dinner, 'REJECTED', sgt('05T16:00'), sgt('05T17:00'));
  await addBooking(venue.hall, event.dinner, 'CANCELLED', sgt('05T18:00'), sgt('05T19:00'));
  // Half-open boundaries: ending exactly at `from` or starting exactly at `to` is outside the week.
  await addBooking(venue.hall, event.fair, 'APPROVED', sgt('04T20:00'), sgt('05T00:00'));
  await addBooking(venue.hall, event.dinner, 'APPROVED', sgt('12T00:00'), sgt('12T02:00'));
  await addBlock(venue.hall, sgt('12T08:00'), sgt('12T10:00'), 'After the week');

  // Room B: a block spanning the start of the week, the same hour as Hall A's booking, and a
  // booking for a draft that its coordinator must not be able to identify.
  period.polishing = await addBlock(venue.room, sgt('04T18:00'), sgt('05T09:00'), 'Floor polishing');
  period.dinnerBooking = await addBooking(venue.room, event.dinner, 'APPROVED', sgt('05T10:00'), sgt('05T12:00'));
  period.draftBooking = await addBooking(venue.room, event.draft, 'APPROVED', sgt('07T10:00'), sgt('07T11:00'));

  // An inactive venue is never listed, whatever it holds.
  await addBooking(venue.retired, event.fair, 'APPROVED', sgt('05T10:00'), sgt('05T12:00'));
  await addBlock(venue.retired, sgt('08T09:00'), sgt('08T17:00'), 'Retired');
  // Preserve the historical out-of-hours bookings; new approvals enforce current hours.
  await pool.query("UPDATE venues SET opens_at='08:00',closes_at='22:00' WHERE id=$1", [venue.hall]);
});

afterAll(async () => {
  try {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    try {
      await admin.end();
    } finally {
      vi.unstubAllEnvs();
    }
  }
});

/** What every calendar reader sees; only the assigned coordinator's own event names differ. */
function expectedWeek(named: { fair?: boolean; dinner?: boolean } = {}) {
  const result = {
    from: '2026-10-04T16:00:00.000Z',
    to: '2026-10-11T16:00:00.000Z',
    items: [
      {
        id: venue.hall, name: 'Hall A', location: 'Level 1', capacity: 300, opensAt: '08:00', closesAt: '22:00',
        unavailable: [
          {
            id: period.fairBooking, kind: 'BOOKING', startsAt: sgt('05T10:00'), endsAt: sgt('05T12:00'),
            event: named.fair ? { id: event.fair, name: 'Career fair' } : null,
          },
          { id: period.maintenance, kind: 'BLOCKED', startsAt: sgt('06T09:00'), endsAt: sgt('06T18:00'), reason: 'Maintenance' },
        ],
      },
      {
        id: venue.room, name: 'Room B', location: null, capacity: 40, opensAt: null, closesAt: null,
        unavailable: [
          // Returned whole rather than clipped to the window.
          { id: period.polishing, kind: 'BLOCKED', startsAt: sgt('04T18:00'), endsAt: sgt('05T09:00'), reason: 'Floor polishing' },
          {
            id: period.dinnerBooking, kind: 'BOOKING', startsAt: sgt('05T10:00'), endsAt: sgt('05T12:00'),
            event: named.dinner ? { id: event.dinner, name: 'Alumni dinner' } : null,
          },
          { id: period.draftBooking, kind: 'BOOKING', startsAt: sgt('07T10:00'), endsAt: sgt('07T11:00'), event: null },
        ],
      },
    ],
  };
  for (const item of result.items) {
    Object.assign(item, { setupMinutes: 0, turnaroundMinutes: 0 });
    for (const period of item.unavailable) if (period.kind === 'BOOKING') {
      Object.assign(period, { eventStartsAt: period.startsAt, eventEndsAt: period.endsAt, warnings: [] });
    }
  }
  return result;
}

describe('KAN-51 venue availability calendar with PostgreSQL', () => {
  it('requires a verified session before revealing any venue information', async () => {
    const response = await request(app).get('/api/venues/availability').query(week);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(JSON.stringify(response.body)).not.toContain('Hall A');
  });

  it.each(['organiser', 'attendee'] as const)('denies the %s role without returning venue data', async (name) => {
    const session = await signIn(accounts[name]);
    const response = await session.get('/api/venues/availability').query(week);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACTION_FORBIDDEN');
    expect(JSON.stringify(response.body)).not.toContain('Hall A');
  });

  it('shows confirmed bookings and blocked periods on the correct active venue to each internal role', async () => {
    const readers = [
      { name: 'coordinatorA', expected: expectedWeek({ fair: true }) },
      { name: 'coordinatorB', expected: expectedWeek({ dinner: true }) },
      { name: 'venueStaff', expected: expectedWeek() },
      { name: 'technician', expected: expectedWeek() },
    ] as const;
    for (const { name, expected } of readers) {
      const session = await signIn(accounts[name]);
      const response = await session.get('/api/venues/availability').query(week);
      expect(response.status, name).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body, name).toEqual(expected);
    }
  });

  it('rejects an invalid window without reading venue data', async () => {
    const session = await signIn(accounts.venueStaff);
    const response = await session.get('/api/venues/availability').query({ from: week.to, to: week.from });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_AVAILABILITY_WINDOW');
  });

  it('reflects approved, cancelled and newly blocked periods on the next read', async () => {
    const session = await signIn(accounts.technician);
    await pool.query(
      `UPDATE venue_bookings SET status = 'APPROVED', decided_by = $2, decided_at = now() WHERE id = $1`,
      [period.pending, accounts.venueStaff.id],
    );
    await pool.query(`UPDATE venue_bookings SET status = 'CANCELLED' WHERE id = $1`, [period.fairBooking]);
    const inspection = await addBlock(venue.hall, sgt('09T13:00'), sgt('09T15:00'), null);

    const response = await session.get('/api/venues/availability').query(week);
    expect(response.status).toBe(200);
    const hall = response.body.items.find((item: { id: string }) => item.id === venue.hall);
    expect(hall.unavailable).toEqual([
      { id: period.pending, kind: 'BOOKING', startsAt: sgt('05T14:00'), endsAt: sgt('05T16:00'), event: null, eventStartsAt: sgt('05T14:00'), eventEndsAt: sgt('05T16:00'), warnings: [] },
      { id: period.maintenance, kind: 'BLOCKED', startsAt: sgt('06T09:00'), endsAt: sgt('06T18:00'), reason: 'Maintenance' },
      { id: inspection, kind: 'BLOCKED', startsAt: sgt('09T13:00'), endsAt: sgt('09T15:00'), reason: null },
    ]);
    const room = response.body.items.find((item: { id: string }) => item.id === venue.room);
    expect(room.unavailable).toEqual(expectedWeek().items[1]!.unavailable);
  });
});
