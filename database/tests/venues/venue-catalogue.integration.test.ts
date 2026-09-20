import { randomUUID } from 'node:crypto';
import express from 'express';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createVenuesRouter } from '../../../backend/src/modules/venues/index.js';
import type { VenueActor } from '../../../backend/src/modules/venues/types.js';
import { parseVenueCreateInput, parseVenueFilters } from '../../../backend/src/modules/venues/venue-input.js';
import {
  createUnavailability, createVenue, deleteUnavailability, getVenue, getVenueAvailability,
  getVenueSuitability, listVenues, updateVenue,
} from '../../../backend/src/modules/venues/venue-service.js';
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

const staff: VenueActor = { id: randomUUID(), role: 'VENUE_STAFF' };
const organiser: VenueActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const otherOrganiser: VenueActor = { id: randomUUID(), role: 'EVENT_ORGANISER' };
const coordinator: VenueActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const otherCoordinator: VenueActor = { id: randomUUID(), role: 'EVENT_COORDINATOR' };
const attendee: VenueActor = { id: randomUUID(), role: 'ATTENDEE' };

let hallId = '';
let roomId = '';
let closedId = '';
let bookedEventId = '';

async function createEvent(overrides: {
  startsAt?: string; endsAt?: string; attendance?: number; needs?: string | null; name?: string;
} = {}): Promise<string> {
  const id = randomUUID();
  await pool.query(`
    INSERT INTO event_requests (id, organiser_id, coordinator_id, status, name, starts_at, ends_at,
      expected_attendance, accessibility_needs)
    VALUES ($1, $2, $3, 'APPROVED', $4, $5, $6, $7, $8)
  `, [
    id, organiser.id, coordinator.id, overrides.name ?? 'Secret product launch',
    overrides.startsAt ?? '2026-11-02T02:00:00Z', overrides.endsAt ?? '2026-11-02T04:00:00Z',
    overrides.attendance ?? 80, overrides.needs ?? null,
  ]);
  return id;
}

async function approvedBooking(venueId: string, eventRequestId: string, startsAt: string, endsAt: string) {
  await pool.query(`
    INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, status, starts_at, ends_at, decided_by, decided_at)
    VALUES ($1, $2, $3, 'APPROVED', $4, $5, $6, now())
  `, [eventRequestId, venueId, organiser.id, startsAt, endsAt, staff.id]);
}

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  for (const actor of [staff, organiser, otherOrganiser, coordinator, otherCoordinator, attendee]) {
    await pool.query(
      'INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, $3, $4)',
      [actor.id, `${actor.id}@example.test`, actor.role, actor.role],
    );
  }
  hallId = (await createVenue(pool, parseVenueCreateInput({
    name: 'Grand Hall', location: 'Block A, Level 1', description: 'Tiered 100%_seating hall', capacity: 300,
    layouts: ['Theatre', 'Banquet'], facilities: ['Projector', 'Stage', 'PA system'],
    accessibilityFeatures: ['Hearing loop'], wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00',
  }))).id;
  roomId = (await createVenue(pool, parseVenueCreateInput({
    name: 'Meeting Room 2', location: 'Block B', capacity: 20, layouts: ['Boardroom'], facilities: ['Projector'],
  }))).id;
  closedId = (await createVenue(pool, parseVenueCreateInput({
    name: 'Old Annex', capacity: 500, isActive: false,
  }))).id;
  bookedEventId = await createEvent();
  await approvedBooking(hallId, bookedEventId, '2026-11-02T02:00:00Z', '2026-11-02T04:00:00Z');
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

const names = async (actor: VenueActor, query: Record<string, string>) =>
  (await listVenues(pool, actor, parseVenueFilters(query))).map((venue) => venue.name);

describe('CF-08 venue catalogue persistence', () => {
  it('returns stored fields with HH:MM hours and ISO timestamps', async () => {
    const venue = await getVenue(pool, organiser, hallId);
    expect(venue).toMatchObject({
      id: hallId, name: 'Grand Hall', capacity: 300, layouts: ['Theatre', 'Banquet'],
      facilities: ['Projector', 'Stage', 'PA system'], accessibilityFeatures: ['Hearing loop'],
      wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00', isActive: true,
    });
    expect(venue.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it('hides inactive venues from everyone except venue staff', async () => {
    expect(await names(organiser, {})).toEqual(['Grand Hall', 'Meeting Room 2']);
    expect(await names(attendee, {})).toEqual(['Grand Hall', 'Meeting Room 2']);
    expect(await names(staff, {})).toEqual(['Grand Hall', 'Meeting Room 2', 'Old Annex']);
    await expect(getVenue(pool, organiser, closedId)).rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
    expect((await getVenue(pool, staff, closedId)).isActive).toBe(false);
  });

  it('rejects a duplicate name case-insensitively on create and update', async () => {
    await expect(createVenue(pool, parseVenueCreateInput({ name: 'grand hall', capacity: 5 })))
      .rejects.toMatchObject({ code: 'VENUE_NAME_TAKEN' });
    await expect(updateVenue(pool, staff, roomId, { name: 'GRAND HALL' }))
      .rejects.toMatchObject({ code: 'VENUE_NAME_TAKEN' });
    expect((await getVenue(pool, staff, roomId)).name).toBe('Meeting Room 2');
  });

  it('updates only supplied fields, bumps updated_at and validates merged operating hours', async () => {
    await pool.query("UPDATE venues SET updated_at = '2026-01-01T00:00:00Z' WHERE id = $1", [roomId]);
    const updated = await updateVenue(pool, staff, roomId, { capacity: 24, opensAt: '09:00' });
    expect(updated).toMatchObject({ name: 'Meeting Room 2', capacity: 24, opensAt: '09:00', closesAt: null, facilities: ['Projector'] });
    expect(updated.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
    await expect(updateVenue(pool, staff, roomId, { closesAt: '08:00' }))
      .rejects.toMatchObject({ code: 'INVALID_VENUE_INPUT' });
    expect((await getVenue(pool, staff, roomId)).closesAt).toBeNull();
    await expect(updateVenue(pool, staff, randomUUID(), { capacity: 5 }))
      .rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
  });
});

describe('CF-10 venue search and filters', () => {
  it('searches name, location and description without treating wildcards specially', async () => {
    expect(await names(organiser, { q: 'grand' })).toEqual(['Grand Hall']);
    expect(await names(organiser, { q: 'block b' })).toEqual(['Meeting Room 2']);
    expect(await names(organiser, { q: '100%_seat' })).toEqual(['Grand Hall']);
    expect(await names(organiser, { q: '%' })).toEqual(['Grand Hall']);
    expect(await names(organiser, { q: '_' })).toEqual(['Grand Hall']);
    expect(await names(organiser, { q: "'; DROP TABLE venues;--" })).toEqual([]);
  });

  it('filters by capacity, all required facilities, accessibility and layout', async () => {
    expect(await names(organiser, { minCapacity: '25' })).toEqual(['Grand Hall']);
    expect(await names(organiser, { facilities: 'Projector' })).toEqual(['Grand Hall', 'Meeting Room 2']);
    expect(await names(organiser, { facilities: 'Projector,Stage' })).toEqual(['Grand Hall']);
    expect(await names(organiser, { facilities: 'Projector,Pool' })).toEqual([]);
    expect(await names(organiser, { accessibilityFeatures: 'Hearing loop' })).toEqual(['Grand Hall']);
    expect(await names(organiser, { wheelchairAccessible: 'true' })).toEqual(['Grand Hall']);
    expect(await names(organiser, { layout: 'boardroom' })).toEqual(['Meeting Room 2']);
  });

  it('excludes venues with an overlapping approved booking or block, but not adjacent or pending ones', async () => {
    const overlapping = { availableFrom: '2026-11-02T03:00:00Z', availableTo: '2026-11-02T05:00:00Z' };
    const adjacent = { availableFrom: '2026-11-02T04:00:00Z', availableTo: '2026-11-02T06:00:00Z' };
    expect(await names(organiser, overlapping)).toEqual(['Meeting Room 2']);
    expect(await names(organiser, adjacent)).toEqual(['Grand Hall', 'Meeting Room 2']);

    await pool.query(`
      INSERT INTO venue_bookings (event_request_id, venue_id, requested_by, starts_at, ends_at)
      VALUES ($1, $2, $3, '2026-11-02T03:00:00Z', '2026-11-02T05:00:00Z')
    `, [bookedEventId, roomId, organiser.id]);
    expect(await names(organiser, overlapping)).toEqual(['Meeting Room 2']);

    const block = await createUnavailability(pool, staff, roomId, {
      startsAt: '2026-11-02T04:30:00.000Z', endsAt: '2026-11-02T05:30:00.000Z', reason: 'Deep clean',
    });
    expect(await names(organiser, overlapping)).toEqual([]);
    await deleteUnavailability(pool, roomId, block.id);
    expect(await names(organiser, overlapping)).toEqual(['Meeting Room 2']);
  });
});

describe('CF-09 availability calendar', () => {
  const range = { from: '2026-11-01T16:00:00.000Z', to: '2026-11-08T16:00:00.000Z' };

  it('hides event names and block reasons from organisers and attendees', async () => {
    const block = await createUnavailability(pool, staff, hallId, {
      startsAt: '2026-11-03T01:00:00.000Z', endsAt: '2026-11-03T05:00:00.000Z', reason: 'Fire alarm test',
    });
    for (const actor of [organiser, attendee]) {
      const calendar = await getVenueAvailability(pool, actor, hallId, range);
      expect(calendar.operatingHours).toEqual({ opensAt: '08:00', closesAt: '22:00' });
      expect(calendar.timezone).toBe('Asia/Singapore');
      expect(calendar.busy).toEqual([
        { kind: 'BOOKING', startsAt: '2026-11-02T02:00:00.000Z', endsAt: '2026-11-02T04:00:00.000Z' },
        { kind: 'BLOCKED', startsAt: '2026-11-03T01:00:00.000Z', endsAt: '2026-11-03T05:00:00.000Z' },
      ]);
      expect(JSON.stringify(calendar)).not.toMatch(/Secret|Fire alarm/);
    }
    for (const actor of [staff, otherCoordinator]) {
      const calendar = await getVenueAvailability(pool, actor, hallId, range);
      expect(calendar.busy).toEqual([
        expect.objectContaining({ kind: 'BOOKING', eventName: 'Secret product launch', id: expect.any(String) }),
        expect.objectContaining({ kind: 'BLOCKED', reason: 'Fire alarm test', id: block.id }),
      ]);
    }
    await deleteUnavailability(pool, hallId, block.id);
  });

  it('only reports intervals overlapping the requested window', async () => {
    const calendar = await getVenueAvailability(pool, organiser, hallId, {
      from: '2026-11-02T04:00:00.000Z', to: '2026-11-03T00:00:00.000Z',
    });
    expect(calendar.busy).toEqual([]);
  });

  it('refuses a block over an approved booking and a delete against the wrong venue', async () => {
    await expect(createUnavailability(pool, staff, hallId, {
      startsAt: '2026-11-02T03:00:00.000Z', endsAt: '2026-11-02T06:00:00.000Z', reason: null,
    })).rejects.toMatchObject({
      code: 'VENUE_BLOCK_CONFLICT',
      details: { conflicts: [{ startsAt: '2026-11-02T02:00:00.000Z', endsAt: '2026-11-02T04:00:00.000Z' }] },
    });
    const count = await pool.query('SELECT count(*)::int AS count FROM venue_unavailability WHERE venue_id = $1', [hallId]);
    expect(count.rows[0].count).toBe(0);

    const block = await createUnavailability(pool, staff, hallId, {
      startsAt: '2026-11-02T04:00:00.000Z', endsAt: '2026-11-02T06:00:00.000Z', reason: null,
    });
    const stored = await pool.query('SELECT created_by FROM venue_unavailability WHERE id = $1', [block.id]);
    expect(stored.rows[0].created_by).toBe(staff.id);
    await expect(deleteUnavailability(pool, roomId, block.id))
      .rejects.toMatchObject({ code: 'VENUE_UNAVAILABILITY_NOT_FOUND' });
    await deleteUnavailability(pool, hallId, block.id);
    await expect(deleteUnavailability(pool, hallId, block.id))
      .rejects.toMatchObject({ code: 'VENUE_UNAVAILABILITY_NOT_FOUND' });
  });
});

describe('CF-11 suitability against stored data', () => {
  it('reports each failed check for the owner and the assigned coordinator', async () => {
    const eventRequestId = await createEvent({
      startsAt: '2026-11-02T03:00:00Z', endsAt: '2026-11-02T15:00:00Z', attendance: 400, needs: 'Step-free access',
    });
    for (const actor of [organiser, coordinator]) {
      const result = await getVenueSuitability(pool, actor, hallId, eventRequestId);
      expect(result.suitable).toBe(false);
      expect(Object.fromEntries(result.checks.map((check) => [check.code, check.passed]))).toEqual({
        ACTIVE: true, CAPACITY: false, ACCESSIBILITY: true, OPERATING_HOURS: false, AVAILABILITY: false,
      });
    }
    const room = await getVenueSuitability(pool, organiser, roomId, eventRequestId);
    expect(room.checks.find((check) => check.code === 'ACCESSIBILITY')?.passed).toBe(false);
  });

  it('finds a fitting venue suitable', async () => {
    const eventRequestId = await createEvent({ startsAt: '2026-11-05T02:00:00Z', endsAt: '2026-11-05T04:00:00Z' });
    expect((await getVenueSuitability(pool, organiser, hallId, eventRequestId)).suitable).toBe(true);
  });

  it('masks other people\'s events, missing events and hidden venues', async () => {
    const eventRequestId = await createEvent();
    for (const actor of [otherOrganiser, otherCoordinator]) {
      await expect(getVenueSuitability(pool, actor, hallId, eventRequestId))
        .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
    await expect(getVenueSuitability(pool, organiser, hallId, randomUUID()))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    await expect(getVenueSuitability(pool, organiser, closedId, eventRequestId))
      .rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
  });
});

describe('venue routes against PostgreSQL', () => {
  function appFor(actor: VenueActor | null) {
    const app = express();
    app.use(express.json());
    app.use('/api/venues', createVenuesRouter({ pool, authenticate: async () => actor }));
    return app;
  }

  it('creates, filters and reads a venue through HTTP', async () => {
    const created = await request(appFor(staff)).post('/api/venues')
      .send({ name: 'Rooftop Terrace', capacity: 60, facilities: ['Bar'], opensAt: '17:00', closesAt: '23:00' });
    expect(created.status).toBe(201);
    const duplicate = await request(appFor(staff)).post('/api/venues').send({ name: 'rooftop terrace', capacity: 1 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('VENUE_NAME_TAKEN');

    const listed = await request(appFor(attendee)).get('/api/venues?facilities=Bar');
    expect(listed.status).toBe(200);
    expect(listed.body.items.map((venue: { name: string }) => venue.name)).toEqual(['Rooftop Terrace']);

    const hidden = await request(appFor(attendee)).get(`/api/venues/${closedId}`);
    const missing = await request(appFor(attendee)).get(`/api/venues/${randomUUID()}`);
    expect(hidden.status).toBe(404);
    expect(hidden.body).toEqual(missing.body);
    expect((await request(appFor(organiser)).patch(`/api/venues/${created.body.id}`).send({ capacity: 1 })).status).toBe(403);
  });
});
