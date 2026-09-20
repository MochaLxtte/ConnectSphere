import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { migrate } from '../migrate.js';

// Explicit opt-in prevents accidentally using a developer's ordinary DATABASE_URL.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
const pool = new pg.Pool({ connectionString: scopedUrl.toString() });

const organiser = randomUUID();
const venueStaff = randomUUID();
const attendeeA = randomUUID();
const attendeeB = randomUUID();
const eventA = randomUUID();
const eventB = randomUUID();
const venue = randomUUID();
const projector = randomUUID();

const morning = ['2027-01-10T01:00:00Z', '2027-01-10T04:00:00Z'] as const;
const overlapping = ['2027-01-10T03:00:00Z', '2027-01-10T06:00:00Z'] as const;
const adjacent = ['2027-01-10T04:00:00Z', '2027-01-10T06:00:00Z'] as const;

async function requestBooking(event: string, [startsAt, endsAt]: readonly [string, string]) {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [event, venue, organiser, startsAt, endsAt],
  );
  return result.rows[0]!.id;
}

function approveBooking(id: string) {
  return pool.query(
    `UPDATE venue_bookings SET status = 'APPROVED', decided_by = $2, decided_at = now()
     WHERE id = $1`,
    [id, venueStaff],
  );
}

async function requestEquipment(event: string, quantity: number) {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO equipment_requests
       (event_request_id, equipment_type_id, requested_by, quantity, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [event, projector, organiser, quantity, ...morning],
  );
  return result.rows[0]!.id;
}

function reserveEquipment(id: string) {
  return pool.query(
    `UPDATE equipment_requests SET status = 'RESERVED', decided_by = $2, decided_at = now()
     WHERE id = $1`,
    [id, venueStaff],
  );
}

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, role) VALUES
      ($1, 'organiser@core.test', 'Organiser', 'EVENT_ORGANISER'),
      ($2, 'venue@core.test', 'Venue Staff', 'VENUE_STAFF'),
      ($3, 'attendee-a@core.test', 'Attendee A', 'ATTENDEE'),
      ($4, 'attendee-b@core.test', 'Attendee B', 'ATTENDEE')`,
    [organiser, venueStaff, attendeeA, attendeeB],
  );
  await pool.query(
    `INSERT INTO event_requests (id, organiser_id, name, registration_capacity) VALUES
      ($1, $3, 'Event A', 1), ($2, $3, 'Event B', NULL)`,
    [eventA, eventB, organiser],
  );
  await pool.query(`INSERT INTO venues (id, name, capacity) VALUES ($1, 'Hall 1', 100)`, [venue]);
  await pool.query(
    `INSERT INTO equipment_types (id, name, total_quantity) VALUES ($1, 'Projector', 3)`,
    [projector],
  );
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

test('CORE-DB-01 status changes are recorded with the transaction actor when supplied', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.actor_id', $1, true)", [organiser]);
    await client.query("UPDATE event_requests SET status = 'SUBMITTED' WHERE id = $1", [eventA]);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  // Unchanged statuses and updates outside an attributed transaction.
  await pool.query("UPDATE event_requests SET status = 'SUBMITTED', name = 'Event A' WHERE id = $1", [eventA]);
  await pool.query("UPDATE event_requests SET status = 'APPROVED' WHERE id = $1", [eventA]);
  const history = await pool.query(
    `SELECT from_status, to_status, changed_by FROM event_status_history
     WHERE event_request_id = $1 ORDER BY created_at, to_status DESC`,
    [eventA],
  );
  expect(history.rows).toEqual([
    { from_status: null, to_status: 'DRAFT', changed_by: null },
    { from_status: 'DRAFT', to_status: 'SUBMITTED', changed_by: organiser },
    { from_status: 'SUBMITTED', to_status: 'APPROVED', changed_by: null },
  ]);
});

test('CORE-DB-02 approved venue bookings cannot overlap each other or blocked periods', async () => {
  const first = await requestBooking(eventA, morning);
  const second = await requestBooking(eventB, overlapping);
  const third = await requestBooking(eventB, adjacent);
  await approveBooking(first);
  // Pending requests may overlap; the conflict is raised when approval would double-book.
  await expect(approveBooking(second)).rejects.toMatchObject({
    code: '23P01', constraint: 'venue_bookings_no_overlap',
  });
  await approveBooking(third);

  await pool.query(
    `INSERT INTO venue_unavailability (venue_id, starts_at, ends_at, reason)
     VALUES ($1, '2027-02-01T00:00:00Z', '2027-02-02T00:00:00Z', 'Maintenance')`,
    [venue],
  );
  const blocked = await requestBooking(eventA, ['2027-02-01T02:00:00Z', '2027-02-01T03:00:00Z']);
  await expect(approveBooking(blocked)).rejects.toMatchObject({
    code: '23P01', constraint: 'venue_bookings_not_blocked',
  });

  // Cancelling the approved booking releases the period.
  await pool.query("UPDATE venue_bookings SET status = 'CANCELLED' WHERE id = $1", [first]);
  await approveBooking(await requestBooking(eventB, morning));
});

test('CORE-DB-03 a venue decision requires its decision maker and time', async () => {
  const booking = await requestBooking(eventA, ['2027-03-01T01:00:00Z', '2027-03-01T02:00:00Z']);
  await expect(
    pool.query("UPDATE venue_bookings SET status = 'REJECTED' WHERE id = $1", [booking]),
  ).rejects.toMatchObject({ code: '23514' });
});

test('CORE-DB-04 equipment reservations cannot exceed the pooled quantity', async () => {
  const two = await requestEquipment(eventA, 2);
  const another = await requestEquipment(eventB, 2);
  const one = await requestEquipment(eventB, 1);
  await reserveEquipment(two);
  await expect(reserveEquipment(another)).rejects.toMatchObject({
    code: '23P01', constraint: 'equipment_requests_within_pool',
  });
  await reserveEquipment(one);
});

test('CORE-DB-05 registrations respect capacity, uniqueness and withdrawal', async () => {
  const register = (event: string, attendee: string) => pool.query(
    'INSERT INTO event_registrations (event_request_id, attendee_id) VALUES ($1, $2)',
    [event, attendee],
  );
  await register(eventA, attendeeA);
  await expect(register(eventA, attendeeB)).rejects.toMatchObject({
    code: '23P01', constraint: 'event_registrations_within_capacity',
  });
  await pool.query(
    `UPDATE event_registrations SET status = 'WITHDRAWN', withdrawn_at = now()
     WHERE event_request_id = $1 AND attendee_id = $2`,
    [eventA, attendeeA],
  );
  await register(eventA, attendeeB);
  // No capacity recorded means no limit.
  await register(eventB, attendeeA);
  await register(eventB, attendeeB);
  await expect(register(eventB, attendeeA)).rejects.toMatchObject({ code: '23505' });
});

test('CORE-DB-06 one active coordinator assignment and non-empty change requests', async () => {
  const assign = () => pool.query(
    `INSERT INTO coordinator_assignments (event_request_id, coordinator_id, assigned_by)
     VALUES ($1, $2, $2)`,
    [eventA, venueStaff],
  );
  await assign();
  await expect(assign()).rejects.toMatchObject({ code: '23505' });
  await pool.query('UPDATE coordinator_assignments SET unassigned_at = now() WHERE event_request_id = $1', [eventA]);
  await assign();

  await expect(pool.query(
    `INSERT INTO event_change_requests (event_request_id, requested_by, proposed_changes, reason)
     VALUES ($1, $2, '{}', 'Empty change')`,
    [eventA, organiser],
  )).rejects.toMatchObject({ code: '23514' });
  await pool.query(
    `INSERT INTO event_change_requests (event_request_id, requested_by, proposed_changes, reason)
     VALUES ($1, $2, '{"expectedAttendance": 120}', 'More sign-ups than planned')`,
    [eventA, organiser],
  );
});
