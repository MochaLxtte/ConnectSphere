import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import {
  getCatalogueVenue, listCatalogueVenues, updateCatalogueVenue,
} from '../../../backend/src/modules/venues/venue-catalogue-service.js';
import {
  listVenueFilterOptions, parseVenueSearchQuery, searchVenues,
} from '../../../backend/src/modules/venues/venue-search.js';
import { getVenueSuitabilityContext } from '../../../backend/src/modules/venues/suitability-service.js';
import { listVenueAvailability } from '../../../backend/src/modules/venues/availability.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let staff: WorkflowActor;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  staff = await fixture.createUser('VENUE_STAFF');
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
});
afterAll(async () => { await fixture?.destroy(); });

async function venue(options: { name?: string; isActive?: boolean; capacity?: number } = {}) {
  const id = randomUUID();
  await fixture.pool.query(
    `INSERT INTO venues(id,name,location,capacity,layouts,facilities,accessibility_features,
       wheelchair_accessible,opens_at,closes_at,is_active)
     VALUES($1,$2,'Block B',$3,ARRAY['Theatre'],ARRAY['Projector'],ARRAY['Ramp'],true,'08:00','22:00',$4)`,
    [id, options.name ?? `Venue ${id}`, options.capacity ?? 100, options.isActive ?? true],
  );
  return id;
}

const row = async (id: string) =>
  (await fixture.pool.query('SELECT *, opens_at::text AS opens_text, closes_at::text AS closes_text FROM venues WHERE id = $1', [id])).rows[0];
const update = (venueId: string, input: unknown, actor: WorkflowActor = staff) =>
  updateCatalogueVenue(fixture.dependencies, { actor, venueId, input });

describe('KAN-50 venue catalogue viewing against PostgreSQL (AC1, AC2, AC12)', () => {
  it('lists only active venues, ordered by name, with their recorded information', async () => {
    const tag = randomUUID().slice(0, 8);
    const second = await venue({ name: `${tag} Beta hall` });
    const first = await venue({ name: `${tag} alpha hall` });
    const inactive = await venue({ name: `${tag} Closed hall`, isActive: false });

    const items = await listCatalogueVenues(fixture.dependencies, { actor: staff });
    const ours = items.filter((item) => item.name.startsWith(tag));
    expect(ours.map((item) => item.id)).toEqual([first, second]);
    expect(items.some((item) => item.id === inactive)).toBe(false);
    expect(ours[0]).toMatchObject({
      location: 'Block B', capacity: 100, layouts: ['Theatre'], facilities: ['Projector'],
      accessibilityFeatures: ['Ramp'], wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00',
    });
    expect(new Date(ours[0]!.updatedAt).toISOString()).toBe(ours[0]!.updatedAt);
  });

  it('shows one venue with its current information, and not an inactive or missing one', async () => {
    const id = await venue();
    expect(await getCatalogueVenue(fixture.dependencies, { actor: staff, venueId: id }))
      .toMatchObject({ id, capacity: 100, layouts: ['Theatre'] });
    const inactive = await venue({ isActive: false });
    await expect(getCatalogueVenue(fixture.dependencies, { actor: staff, venueId: inactive }))
      .rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
    await expect(getCatalogueVenue(fixture.dependencies, { actor: staff, venueId: randomUUID() }))
      .rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
  });
});

describe('KAN-50 venue catalogue updates against PostgreSQL (AC3-AC11)', () => {
  it('saves every editable attribute, returns the saved venue and shows it on the next view (AC3-AC9, AC12)', async () => {
    const id = await venue();
    const before = await row(id);
    const saved = await update(id, {
      location: 'Level 4', capacity: 250, facilities: ['Projector', 'Microphone'],
      accessibilityFeatures: ['Lift', 'Hearing loop'], wheelchairAccessible: false,
      layouts: ['Theatre', 'Classroom', 'Banquet'], opensAt: '09:30', closesAt: '21:15',
    });

    const expected = {
      id, location: 'Level 4', capacity: 250, facilities: ['Projector', 'Microphone'],
      accessibilityFeatures: ['Lift', 'Hearing loop'], wheelchairAccessible: false,
      layouts: ['Theatre', 'Classroom', 'Banquet'], opensAt: '09:30', closesAt: '21:15',
    };
    expect(saved).toMatchObject(expected);
    expect(await getCatalogueVenue(fixture.dependencies, { actor: staff, venueId: id })).toMatchObject(expected);
    const after = await row(id);
    expect(after).toMatchObject({ opens_text: '09:30:00', closes_text: '21:15:00' });
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
    expect(after.name).toBe(before.name);
    expect(after.is_active).toBe(true);
  });

  it('keeps several supported layouts on the venue they were saved for and leaves other venues alone (AC10, AC11)', async () => {
    const target = await venue();
    const other = await venue();
    await update(target, { layouts: ['Theatre', 'Boardroom', 'U-shape'] });
    expect((await row(target)).layouts).toEqual(['Theatre', 'Boardroom', 'U-shape']);
    expect((await row(other)).layouts).toEqual(['Theatre']);
  });

  it('leaves omitted fields unchanged and clears a field only when null is sent', async () => {
    const id = await venue();
    await update(id, { capacity: 60 });
    expect(await row(id)).toMatchObject({
      capacity: 60, location: 'Block B', layouts: ['Theatre'], facilities: ['Projector'],
      opens_text: '08:00:00', closes_text: '22:00:00',
    });
    await update(id, { location: null, opensAt: null, closesAt: null });
    expect(await row(id)).toMatchObject({ location: null, opens_text: null, closes_text: null, capacity: 60 });
  });

  it('normalises labels before saving: trimmed and deduplicated ignoring case', async () => {
    const id = await venue();
    await update(id, { facilities: ['  Projector ', 'projector', 'Mic'] });
    expect((await row(id)).facilities).toEqual(['Projector', 'Mic']);
  });

  it('allows the lists to be emptied', async () => {
    const id = await venue();
    await update(id, { facilities: [], layouts: [], accessibilityFeatures: [] });
    expect(await row(id)).toMatchObject({ facilities: [], layouts: [], accessibility_features: [] });
  });

  it('accepts a single operating-hour change that keeps the stored pair ordered', async () => {
    const id = await venue();
    await update(id, { closesAt: '23:00' });
    expect(await row(id)).toMatchObject({ opens_text: '08:00:00', closes_text: '23:00:00' });
  });
});

describe('KAN-50 venue catalogue refusals leave the venue unchanged (AC14 and failure cases)', () => {
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'refuses %s for every operation and changes nothing', async (role) => {
      const id = await venue();
      const before = await row(id);
      const actor = role === 'EVENT_ORGANISER' ? organiser : role === 'EVENT_COORDINATOR'
        ? coordinator : await fixture.createUser(role);
      await expect(update(id, { capacity: 5 }, actor)).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      await expect(getCatalogueVenue(fixture.dependencies, { actor, venueId: id }))
        .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      await expect(listCatalogueVenues(fixture.dependencies, { actor }))
        .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      expect(await row(id)).toEqual(before);
    },
  );

  it('refuses a missing venue and an inactive venue', async () => {
    await expect(update(randomUUID(), { capacity: 5 })).rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
    const inactive = await venue({ isActive: false });
    const before = await row(inactive);
    await expect(update(inactive, { capacity: 5 })).rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
    expect(await row(inactive)).toEqual(before);
  });

  it.each([
    { capacity: 0 }, { capacity: 1.5 }, { name: 'Renamed' }, { facilities: 'Projector' },
    { opensAt: '24:00' }, { opensAt: '10:00', closesAt: '10:00' }, {},
  ])('rejects invalid input %j before touching the venue', async (input) => {
    const id = await venue();
    const before = await row(id);
    await expect(update(id, input)).rejects.toMatchObject({ code: 'INVALID_VENUE_CATALOGUE_INPUT' });
    expect(await row(id)).toEqual(before);
  });

  it.each([{ opensAt: '22:00' }, { opensAt: '23:30' }, { closesAt: '08:00' }, { closesAt: '07:00' }])(
    'rejects a single hour change %j that would reverse the stored 08:00-22:00 pair, with a validation error rather than a database error',
    async (input) => {
      const id = await venue();
      const before = await row(id);
      await expect(update(id, input)).rejects.toMatchObject({ code: 'INVALID_VENUE_CATALOGUE_INPUT' });
      expect(await row(id)).toEqual(before);
    },
  );

  it('accepts the maximum capacity the database allows', async () => {
    const id = await venue();
    await update(id, { capacity: 2_147_483_647 });
    expect((await row(id)).capacity).toBe(2_147_483_647);
  });
});

describe('KAN-50 concurrent venue edits (conflict cases)', () => {
  it('keeps both changes when two staff edit different fields at the same time', async () => {
    const id = await venue();
    await Promise.all([
      update(id, { capacity: 321 }),
      update(id, { facilities: ['Stage', 'Lighting'] }),
      update(id, { layouts: ['Cabaret'] }),
    ]);
    expect(await row(id)).toMatchObject({
      capacity: 321, facilities: ['Stage', 'Lighting'], layouts: ['Cabaret'], location: 'Block B',
    });
  });

  it('ends with exactly one of the submitted values when staff edit the same field at the same time', async () => {
    const id = await venue();
    const capacities = [11, 22, 33, 44, 55, 66];
    await Promise.all(capacities.map((capacity) => update(id, { capacity })));
    expect(capacities).toContain((await row(id)).capacity);
  });

  it('does not let an edit proceed against a venue deactivated first', async () => {
    const id = await venue();
    await fixture.pool.query('UPDATE venues SET is_active = false WHERE id = $1', [id]);
    await expect(update(id, { capacity: 77 })).rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
    expect((await row(id)).capacity).toBe(100);
  });
});

describe('KAN-50 saved changes reach venue search and suitability (AC13)', () => {
  it('makes an updated venue findable by search filters it did not match before', async () => {
    const id = await venue({ capacity: 40 });
    const tag = `Hall-${randomUUID().slice(0, 6)}`;
    const found = async (query: Record<string, unknown>) =>
      (await searchVenues(fixture.dependencies, coordinator, parseVenueSearchQuery(query)))
        .some((result) => result.id === id);

    expect(await found({ capacity: '300' })).toBe(false);
    expect(await found({ layout: 'Lecture' })).toBe(false);
    expect(await found({ facilities: [`${tag} loop`] })).toBe(false);

    await update(id, { capacity: 400, layouts: ['Theatre', 'Lecture'], facilities: ['Projector', `${tag} loop`] });

    expect(await found({ capacity: '300' })).toBe(true);
    expect(await found({ layout: 'Lecture' })).toBe(true);
    expect(await found({ facilities: [`${tag} loop`] })).toBe(true);
  });

  it('stops matching a filter once the venue is changed so it no longer satisfies it', async () => {
    const id = await venue({ capacity: 500 });
    const found = async () => (await searchVenues(fixture.dependencies, coordinator,
      parseVenueSearchQuery({ capacity: '300' }))).some((result) => result.id === id);
    expect(await found()).toBe(true);
    await update(id, { capacity: 20 });
    expect(await found()).toBe(false);
  });

  it('offers newly saved labels as search filter options', async () => {
    const id = await venue();
    const label = `Option ${randomUUID().slice(0, 8)}`;
    expect((await listVenueFilterOptions(fixture.dependencies, coordinator)).facilities).not.toContain(label);
    await update(id, { facilities: [label] });
    expect((await listVenueFilterOptions(fixture.dependencies, coordinator)).facilities).toContain(label);
  });

  it('gives the suitability check the current saved values', async () => {
    const id = await venue();
    const eventId = await fixture.createEvent({
      organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED',
    });
    await update(id, {
      capacity: 640, layouts: ['Banquet'], facilities: ['Stage'], accessibilityFeatures: ['Lift'],
      wheelchairAccessible: false, opensAt: '07:00', closesAt: '23:00',
    });
    const context = await getVenueSuitabilityContext(fixture.dependencies, { actor: coordinator, eventId });
    expect(context.venues.find((candidate) => candidate.id === id)).toMatchObject({
      capacity: 640, layouts: ['Banquet'], facilities: ['Stage'], accessibilityFeatures: ['Lift'],
      wheelchairAccessible: false, opensAt: '07:00:00', closesAt: '23:00:00',
    });
  });

  it('does not change an existing booking when capacity or layouts change', async () => {
    const id = await venue();
    const eventId = await fixture.createEvent({
      organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED',
    });
    const bookingId = randomUUID();
    await fixture.pool.query(`INSERT INTO venue_bookings
      (id,event_request_id,venue_id,requested_by,status,starts_at,ends_at,layout,decided_by,decided_at)
      VALUES($1,$2,$3,$4,'APPROVED','2026-12-01T02:00:00Z','2026-12-01T06:00:00Z','Theatre',$5,now())`,
    [bookingId, eventId, id, coordinator.id, staff.id]);
    await update(id, { capacity: 10, layouts: ['Banquet'] });
    expect((await fixture.pool.query('SELECT status, layout FROM venue_bookings WHERE id = $1', [bookingId])).rows[0])
      .toEqual({ status: 'APPROVED', layout: 'Theatre' });
  });
});

describe('KAN-77 venue buffer durations against PostgreSQL', () => {
  const buffers = async (id: string) => (await fixture.pool.query(
    'SELECT setup_minutes, turnaround_minutes, capacity FROM venues WHERE id = $1', [id])).rows[0];

  it('starts a venue at zero, saves both buffers and shows them on the next read (AC3, AC4)', async () => {
    const id = await venue();
    expect(await getCatalogueVenue(fixture.dependencies, { actor: staff, venueId: id }))
      .toMatchObject({ setupMinutes: 0, turnaroundMinutes: 0 });

    const saved = await update(id, {
      setupMinutes: 30, expectedSetupMinutes: 0, turnaroundMinutes: 1440, expectedTurnaroundMinutes: 0,
    });
    expect(saved).toMatchObject({ setupMinutes: 30, turnaroundMinutes: 1440 });
    expect(await getCatalogueVenue(fixture.dependencies, { actor: staff, venueId: id }))
      .toMatchObject({ setupMinutes: 30, turnaroundMinutes: 1440 });
    expect((await listCatalogueVenues(fixture.dependencies, { actor: staff })).find((item) => item.id === id))
      .toMatchObject({ setupMinutes: 30, turnaroundMinutes: 1440 });
  });

  it('includes the saved buffers in search, suitability and calendar inputs (AC4)', async () => {
    const id = await venue();
    const eventId = await fixture.createEvent({
      organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED',
    });
    await update(id, { setupMinutes: 45, expectedSetupMinutes: 0, turnaroundMinutes: 15, expectedTurnaroundMinutes: 0 });

    const found = await searchVenues(fixture.dependencies, coordinator, parseVenueSearchQuery({}));
    expect(found.find((result) => result.id === id)).toMatchObject({ setupMinutes: 45, turnaroundMinutes: 15 });
    const context = await getVenueSuitabilityContext(fixture.dependencies, { actor: coordinator, eventId });
    expect(context.venues.find((candidate) => candidate.id === id)).toMatchObject({ setupMinutes: 45, turnaroundMinutes: 15 });
    const calendar = await listVenueAvailability(fixture.dependencies, staff,
      { from: '2031-01-12T00:00:00.000Z', to: '2031-01-13T00:00:00.000Z' });
    expect(calendar.find((entry) => entry.id === id)).toMatchObject({ setupMinutes: 45, turnaroundMinutes: 15 });
  });

  it.each([
    [{ setupMinutes: -1, expectedSetupMinutes: 0 }],
    [{ setupMinutes: 1441, expectedSetupMinutes: 0 }],
    [{ turnaroundMinutes: 7.5, expectedTurnaroundMinutes: 0 }],
    [{ turnaroundMinutes: null, expectedTurnaroundMinutes: 0 }],
    [{ setupMinutes: 10 }],
  ])('refuses %j with a validation error and saves nothing (AC2)', async (input) => {
    const id = await venue();
    const before = await row(id);
    await expect(update(id, input)).rejects.toMatchObject({ code: 'INVALID_VENUE_CATALOGUE_INPUT' });
    expect(await row(id)).toEqual(before);
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'refuses a buffer change by %s and leaves the venue unchanged (AC1)', async (role) => {
      const id = await venue();
      const before = await row(id);
      const actor = await fixture.createUser(role);
      await expect(update(id, { setupMinutes: 10, expectedSetupMinutes: 0 }, actor))
        .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      expect(await row(id)).toEqual(before);
    },
  );

  it('refuses a stale buffer edit without overwriting the newer value (AC5)', async () => {
    const id = await venue();
    await update(id, { setupMinutes: 20, expectedSetupMinutes: 0 });
    await expect(update(id, { setupMinutes: 60, expectedSetupMinutes: 0 }))
      .rejects.toMatchObject({ kind: 'CONFLICT', code: 'VENUE_BUFFER_CONFLICT' });
    expect(await buffers(id)).toMatchObject({ setup_minutes: 20 });
  });

  it('preserves an unrelated field edit and refuses only the stale buffer edit (AC5)', async () => {
    const id = await venue();
    await update(id, { capacity: 250 });
    await update(id, { turnaroundMinutes: 30, expectedTurnaroundMinutes: 0 });
    const stale = update(id, { capacity: 260, turnaroundMinutes: 90, expectedTurnaroundMinutes: 0 });
    await expect(stale).rejects.toMatchObject({ code: 'VENUE_BUFFER_CONFLICT' });
    expect(await buffers(id)).toEqual({ setup_minutes: 0, turnaround_minutes: 30, capacity: 250 });
  });

  it('lets exactly one of two concurrent edits from the same loaded value win (AC5)', async () => {
    const id = await venue();
    const results = await Promise.allSettled([
      update(id, { setupMinutes: 15, expectedSetupMinutes: 0 }),
      update(id, { setupMinutes: 25, expectedSetupMinutes: 0 }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const refused = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    expect(refused.reason).toMatchObject({ code: 'VENUE_BUFFER_CONFLICT' });
    const winner = (results.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<{ setupMinutes: number }>).value;
    expect(await buffers(id)).toMatchObject({ setup_minutes: winner.setupMinutes });
  });

  it('keeps both changes when a buffer and another field are edited at the same time', async () => {
    const id = await venue();
    await Promise.all([
      update(id, { setupMinutes: 40, expectedSetupMinutes: 0 }),
      update(id, { capacity: 333 }),
    ]);
    expect(await buffers(id)).toEqual({ setup_minutes: 40, turnaround_minutes: 0, capacity: 333 });
  });

  it('does not change existing bookings when buffers change (AC6 boundary; re-evaluation is KAN-78)', async () => {
    const id = await venue();
    const eventId = await fixture.createEvent({
      organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED',
    });
    const bookingId = randomUUID();
    await fixture.pool.query(`INSERT INTO venue_bookings
      (id,event_request_id,venue_id,requested_by,status,starts_at,ends_at,decided_by,decided_at)
      VALUES($1,$2,$3,$4,'APPROVED','2031-01-12T02:00:00Z','2031-01-12T04:00:00Z',$5,now())`,
    [bookingId, eventId, id, coordinator.id, staff.id]);
    const before = (await fixture.pool.query('SELECT * FROM venue_bookings WHERE id = $1', [bookingId])).rows;
    await update(id, { setupMinutes: 120, expectedSetupMinutes: 0, turnaroundMinutes: 120, expectedTurnaroundMinutes: 0 });
    expect((await fixture.pool.query('SELECT * FROM venue_bookings WHERE id = $1', [bookingId])).rows).toEqual(before);
  });
});
