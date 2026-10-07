import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { migrate } from '../../migrate.js';
import { parseVenueSearchQuery, searchVenues } from '../../../backend/src/modules/venues/venue-search.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
const pool = new pg.Pool({ connectionString: scopedUrl.toString() });
const venueId = randomUUID();
const organiserId = randomUUID();
const coordinatorId = randomUUID();
const staffId = randomUUID();
const eventId = randomUUID();
const bookingId = randomUUID();
const actor = { id: coordinatorId, role: 'EVENT_COORDINATOR' as const };
const window = { startsAt: '2027-01-10T09:00:00+08:00', endsAt: '2027-01-10T12:00:00+08:00' };
const search = () => searchVenues({ pool }, actor, parseVenueSearchQuery(window));

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  await pool.query(`INSERT INTO app_users (id, email, display_name, role) VALUES
    ($1, 'organiser@search.test', 'Organiser', 'EVENT_ORGANISER'),
    ($2, 'coordinator@search.test', 'Coordinator', 'EVENT_COORDINATOR'),
    ($3, 'staff@search.test', 'Venue staff', 'VENUE_STAFF')`, [organiserId, coordinatorId, staffId]);
  await pool.query(`INSERT INTO event_requests (id, organiser_id, coordinator_id, status)
    VALUES ($1, $2, $3, 'APPROVED')`, [eventId, organiserId, coordinatorId]);
  await pool.query(`INSERT INTO venues (id, name, capacity) VALUES ($1, 'Search fixture', 40)`, [venueId]);
  await pool.query(`INSERT INTO venue_bookings
    (id, event_request_id, venue_id, requested_by, starts_at, ends_at)
    VALUES ($1, $2, $3, $4, $5, $6)`,
  [bookingId, eventId, venueId, coordinatorId, window.startsAt, window.endsAt]);
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

it('KAN-12/KAN-8 search excludes approved reservations, but not pending or rejected requests', async () => {
  expect((await search()).map(v => v.id)).toEqual([venueId]);
  await pool.query(`UPDATE venue_bookings SET status = 'APPROVED', decided_by = $2, decided_at = now()
    WHERE id = $1`, [bookingId, staffId]);
  expect(await search()).toEqual([]);
  // Fixture state change exercises the search query; the decision API forbids reversing a decision.
  await pool.query(`UPDATE venue_bookings SET status = 'REJECTED' WHERE id = $1`, [bookingId]);
  expect((await search()).map(v => v.id)).toEqual([venueId]);
});

it('KAN-12/KAN-51 search excludes operational blocks and allows adjacent periods', async () => {
  const block = await pool.query<{ id: string }>(`INSERT INTO venue_unavailability (venue_id, starts_at, ends_at)
    VALUES ($1, $2, $3) RETURNING id`, [venueId, window.startsAt, window.endsAt]);
  expect(await search()).toEqual([]);
  await pool.query(`UPDATE venue_unavailability SET starts_at = $2, ends_at = $2::timestamptz + interval '1 hour'
    WHERE id = $1`, [block.rows[0]!.id, window.endsAt]);
  expect((await search()).map(v => v.id)).toEqual([venueId]);
});

it('KAN-12 keeps search restricted to coordinators', async () => {
  await expect(searchVenues({ pool }, { id: organiserId, role: 'EVENT_ORGANISER' },
    parseVenueSearchQuery({}))).rejects.toMatchObject({ code: 'VENUE_SEARCH_FORBIDDEN' });
});

it.each([
  ['08:00', '20:00', '2027-02-10T18:00:00+08:00', '2027-02-11T10:00:00+08:00', false],
  [null, null, '2027-02-10T18:00:00+08:00', '2027-02-12T10:00:00+08:00', true],
  ['08:00', null, '2027-02-10T18:00:00+08:00', '2027-02-11T00:00:00+08:00', true],
  ['00:00', '24:00', '2027-02-10T18:00:00+08:00', '2027-02-12T10:00:00+08:00', true],
  ['09:00:30', '18:00', '2027-02-10T09:00:29+08:00', '2027-02-10T12:00:00+08:00', false],
  ['09:00:30', '18:00', '2027-02-10T09:00:30+08:00', '2027-02-10T12:00:00+08:00', true],
] as const)('KAN-12/KAN-52 applies continuous venue hours %s–%s to %s–%s (available=%s)',
  async (opensAt, closesAt, startsAt, endsAt, available) => {
    const id = randomUUID();
    await pool.query(`INSERT INTO venues (id, name, capacity, opens_at, closes_at)
      VALUES ($1, $2, 100, $3, $4)`, [id, `Hours ${id}`, opensAt, closesAt]);
    const results = await searchVenues({ pool }, actor, parseVenueSearchQuery({
      location: `Hours ${id}`, startsAt, endsAt,
    }));
    expect(results.map(venue => venue.id)).toEqual(available ? [id] : []);
  });
