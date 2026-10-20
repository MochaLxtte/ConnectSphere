import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';
import { createVenueBooking, decideVenueBooking, getVenueBooking, listVenueBookings } from '../../../backend/src/modules/venues/booking-service.js';
import { listVenueAvailability } from '../../../backend/src/modules/venues/availability.js';
import { searchVenues, parseVenueSearchQuery } from '../../../backend/src/modules/venues/venue-search.js';
import { getVenueSuitabilityContext, checkVenueSuitability } from '../../../backend/src/modules/venues/suitability-service.js';
import { createVenueBlock } from '../../../backend/src/modules/venues/block-service.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';

let f: WorkflowFixture;
let staff: WorkflowActor;
let coordinator: WorkflowActor;
let organiser: WorkflowActor;
const start = '2030-12-01T02:00:00.000Z'; // 10:00 Singapore
const end = '2030-12-01T04:00:00.000Z';
beforeAll(async () => {
  f = await createWorkflowFixture();
  staff = await f.createUser('VENUE_STAFF');
  coordinator = await f.createUser('EVENT_COORDINATOR');
  organiser = await f.createUser('EVENT_ORGANISER');
});
afterAll(async () => { await f?.destroy(); });
async function venue(setup = 30, turnaround = 45) {
  const id = randomUUID();
  await f.pool.query(`INSERT INTO venues(id,name,capacity,setup_minutes,turnaround_minutes)
    VALUES($1,$2,100,$3,$4)`, [id, `Buffer ${id}`, setup, turnaround]);
  return id;
}
async function request(venueId: string, startsAt = start, endsAt = end) {
  const eventId = await f.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id,
    status: 'APPROVED', startsAt, endsAt });
  return createVenueBooking(f.dependencies, { actor: coordinator, eventRequestId: eventId,
    input: { venueId, startsAt, endsAt } });
}
const approve = (id: string) => decideVenueBooking(f.dependencies,
  { actor: staff, bookingId: id, input: { decision: 'APPROVED' } });

describe('KAN-78 occupied intervals with real PostgreSQL', () => {
  it('uses 09:30–12:45 in search, submission, approval, calendar and suitability', async () => {
    const id = await venue();
    const search = await searchVenues(f.dependencies, coordinator, parseVenueSearchQuery({ startsAt: start, endsAt: end }));
    expect(search.find(v => v.id === id)).toMatchObject({ occupiedStartsAt: '2030-12-01T01:30:00.000Z', occupiedEndsAt: '2030-12-01T04:45:00.000Z' });
    const pending = await request(id);
    expect(pending).toMatchObject({ startsAt: start, endsAt: end, occupiedStartsAt: '2030-12-01T01:30:00.000Z', occupiedEndsAt: '2030-12-01T04:45:00.000Z' });
    const context = await getVenueSuitabilityContext(f.dependencies, { actor: coordinator, eventId: pending.eventRequestId });
    const assess = () => checkVenueSuitability(f.dependencies, { actor: coordinator, eventId: pending.eventRequestId,
      input: { venueId: id, requirementsVersion: context.requirementsVersion, facilities: [], accessibility: [], layout: null,
        wheelchairRequired: false, requirementsConfirmed: true, unresolvedRequirements: null } });
    expect((await assess()).checks.find(c => c.key === 'availability')?.status).toBe('PASS');
    await approve(pending.id);
    const result = await listVenueAvailability(f.dependencies, coordinator,
      { from: '2030-12-01T01:30:00Z', to: '2030-12-01T01:45:00Z' });
    expect(result.find(v => v.id === id)?.unavailable[0]).toMatchObject({ startsAt: '2030-12-01T01:30:00.000Z', endsAt: '2030-12-01T04:45:00.000Z', eventStartsAt: start, eventEndsAt: end });
    expect((await assess()).checks.find(c => c.key === 'availability')?.status).toBe('FAIL');
    expect((await searchVenues(f.dependencies, coordinator, parseVenueSearchQuery({ startsAt: start, endsAt: end }))).some(v => v.id === id)).toBe(false);
  });

  it('permits exact occupied adjacency but refuses a one-minute buffer overlap', async () => {
    const id = await venue();
    await approve((await request(id)).id);
    // Previous occupied end 12:45; next event begins 13:15 with 30 minutes setup.
    await approve((await request(id, '2030-12-01T05:15:00Z', '2030-12-01T06:00:00Z')).id);
    await expect(request(id, '2030-12-01T05:14:00Z', '2030-12-01T06:00:00Z')).rejects.toMatchObject({ code: 'VENUE_BOOKING_CONFLICT' });
  });

  it('pending and rejected requests do not reserve time; zero durations preserve event time', async () => {
    const id = await venue(0, 0);
    const a = await request(id);
    const b = await request(id);
    await decideVenueBooking(f.dependencies, { actor: staff, bookingId: a.id, input: { decision: 'REJECTED' } });
    expect(await approve(b.id)).toMatchObject({ occupiedStartsAt: start, occupiedEndsAt: end });
  });

  it('checks buffer-only operational overlaps in both write directions and at approval', async () => {
    const id = await venue();
    const pending = await request(id);
    await createVenueBlock(f.dependencies, { actor: staff, venueId: id,
      input: { startsAt: '2030-12-01T01:15:00Z', endsAt: '2030-12-01T01:45:00Z', reason: 'Maintenance' } });
    await expect(approve(pending.id)).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    await expect(request(id)).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    const other = await venue();
    await approve((await request(other)).id);
    await expect(createVenueBlock(f.dependencies, { actor: staff, venueId: other,
      input: { startsAt: '2030-12-01T04:30:00Z', endsAt: '2030-12-01T05:00:00Z', reason: 'Reset' } }))
      .rejects.toMatchObject({ code: 'VENUE_BOOKING_CONFLICT' });
  });

  it('checks full occupied operating hours including invalid and restricted cross-day windows', async () => {
    const id = await venue();
    await f.pool.query(`UPDATE venues SET opens_at='10:00', closes_at='18:00' WHERE id=$1`, [id]);
    await expect(request(id)).rejects.toMatchObject({ code: 'VENUE_OUTSIDE_OPERATING_HOURS' });
    expect((await searchVenues(f.dependencies, coordinator, parseVenueSearchQuery({ startsAt: start, endsAt: end }))).some(v => v.id === id)).toBe(false);
    await f.pool.query(`UPDATE venues SET opens_at='00:00', closes_at='23:59' WHERE id=$1`, [id]);
    await expect(request(id, '2030-12-01T16:10:00Z', '2030-12-01T17:00:00Z')).rejects.toMatchObject({ code: 'VENUE_OUTSIDE_OPERATING_HOURS' });
    expect((await f.pool.query(`SELECT venue_interval_within_hours($1,$2,'18:00','09:00') AS ok`, [start, end])).rows[0].ok).toBe(false);
  });

  it('re-evaluates both existing overlaps without changing booking rows or unrelated venues', async () => {
    const id = await venue(0, 0);
    const a = await request(id); await approve(a.id);
    const b = await request(id, end, '2030-12-01T06:00:00Z'); await approve(b.id);
    const other = await venue(0, 0); const c = await request(other); await approve(c.id);
    const before = (await f.pool.query('SELECT * FROM venue_bookings WHERE venue_id=$1 ORDER BY id', [id])).rows;
    await f.pool.query('UPDATE venues SET setup_minutes=30,turnaround_minutes=45 WHERE id=$1', [id]);
    for (const booking of [a, b]) expect((await getVenueBooking(f.dependencies, { actor: staff, bookingId: booking.id })).warnings).toContain('APPROVED_BOOKING_OVERLAP');
    expect((await listVenueBookings(f.dependencies, { actor: staff })).map(b => b.id)).toEqual(expect.arrayContaining([a.id, b.id]));
    expect((await getVenueBooking(f.dependencies, { actor: staff, bookingId: c.id })).warnings).toEqual([]);
    expect((await f.pool.query('SELECT * FROM venue_bookings WHERE venue_id=$1 ORDER BY id', [id])).rows).toEqual(before);
    await expect(request(id)).rejects.toMatchObject({ code: 'VENUE_BOOKING_CONFLICT' });
    await f.pool.query('UPDATE venues SET setup_minutes=0,turnaround_minutes=0 WHERE id=$1', [id]);
    expect((await getVenueBooking(f.dependencies, { actor: staff, bookingId: a.id })).warnings).toEqual([]);
  });

  it('retains ended booking history when buffers change', async () => {
    const id = await venue(0, 0);
    const past = await request(id, '2020-01-01T02:00:00Z', '2020-01-01T04:00:00Z'); await approve(past.id);
    const before = await getVenueBooking(f.dependencies, { actor: staff, bookingId: past.id });
    await f.pool.query('UPDATE venues SET setup_minutes=1440,turnaround_minutes=1440 WHERE id=$1', [id]);
    expect(await getVenueBooking(f.dependencies, { actor: staff, bookingId: past.id })).toEqual(before);
  });

  it('identifies existing operational and hours violations after a duration edit', async () => {
    const id = await venue(0, 0);
    await f.pool.query(`UPDATE venues SET opens_at='10:00',closes_at='18:00' WHERE id=$1`, [id]);
    const a = await request(id); await approve(a.id);
    await createVenueBlock(f.dependencies, { actor: staff, venueId: id,
      input: { startsAt: '2030-12-01T01:00:00Z', endsAt: '2030-12-01T01:45:00Z', reason: 'Cleaning' } });
    await f.pool.query('UPDATE venues SET setup_minutes=30 WHERE id=$1', [id]);
    expect((await getVenueBooking(f.dependencies, { actor: staff, bookingId: a.id })).warnings)
      .toEqual(expect.arrayContaining(['OPERATIONAL_BLOCK_OVERLAP', 'OUTSIDE_OPERATING_HOURS']));
    expect((await getVenueBooking(f.dependencies, { actor: coordinator, bookingId: a.id })).warnings)
      .toContain('OPERATIONAL_BLOCK_OVERLAP');
  });

  it('serialises concurrent approvals of buffer-only conflicts', async () => {
    const id = await venue();
    const a = await request(id); const b = await request(id, end, '2030-12-01T06:00:00Z');
    const results = await Promise.allSettled([approve(a.id), approve(b.id)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
  });

  it('reads a concurrent buffer edit after the venue lock before approval', async () => {
    const id = await venue(0, 0);
    const a = await request(id); await approve(a.id);
    const b = await request(id, end, '2030-12-01T06:00:00Z');
    const client = await f.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE venues SET turnaround_minutes=30 WHERE id=$1', [id]);
      const approval = approve(b.id);
      // Attach rejection handling before releasing the lock.
      const checked = expect(approval).rejects.toMatchObject({ code: 'VENUE_BOOKING_CONFLICT' });
      await client.query('COMMIT');
      await checked;
    } finally { await client.query('ROLLBACK'); client.release(); }
  });

  it('enforces existing calendar and booking privacy', async () => {
    const id = await venue(); const b = await request(id); await approve(b.id);
    await expect(getVenueBooking(f.dependencies, { actor: organiser, bookingId: b.id })).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
    await expect(listVenueAvailability(f.dependencies, organiser, { from: start, to: end })).rejects.toMatchObject({ code: 'VENUE_AVAILABILITY_FORBIDDEN' });
    const stranger = await f.createUser('EVENT_COORDINATOR');
    await expect(getVenueBooking(f.dependencies, { actor: stranger, bookingId: b.id })).rejects.toMatchObject({ code: 'VENUE_BOOKING_NOT_FOUND' });
    const calendar = await listVenueAvailability(f.dependencies, stranger, { from: start, to: end });
    expect(calendar.find(v => v.id === id)?.unavailable[0]).toMatchObject({ event: null });
  });
});
