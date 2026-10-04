import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import {
  createVenueBlock, deleteVenueBlock, listVenueBlocks,
} from '../../../backend/src/modules/venues/block-service.js';
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

const startsAt = '2026-12-01T02:00:00.000Z';
const endsAt = '2026-12-01T06:00:00.000Z';

async function venue(options: { isActive?: boolean } = {}) {
  const id = randomUUID();
  await fixture.pool.query(
    'INSERT INTO venues(id,name,capacity,is_active) VALUES($1,$2,100,$3)',
    [id, `Venue ${id}`, options.isActive ?? true],
  );
  return id;
}

async function approvedBooking(venueId: string) {
  const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED' });
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO venue_bookings
    (id,event_request_id,venue_id,requested_by,status,starts_at,ends_at,decided_by,decided_at,updated_at)
    VALUES($1,$2,$3,$4,'APPROVED',$5,$6,$7,now(),now())`,
  [id, eventRequestId, venueId, coordinator.id, startsAt, endsAt, staff.id]);
  return id;
}

async function row(id: string) {
  return (await fixture.pool.query('SELECT * FROM venue_unavailability WHERE id = $1', [id])).rows[0];
}

const create = (venueId: string, actor: WorkflowActor, overrides: Partial<{ startsAt: string; endsAt: string; reason: string }> = {}) =>
  createVenueBlock(fixture.dependencies,
    { actor, venueId, input: { startsAt, endsAt, reason: 'Scheduled maintenance', ...overrides } });

describe('KAN-55 venue-unavailability blocks against PostgreSQL', () => {
  it('creates a block associated with the correct venue and records the reason (AC1-AC7)', async () => {
    const venueId = await venue();
    const saved = await create(venueId, staff);
    expect(saved).toMatchObject({
      venueId, startsAt, endsAt, reason: 'Scheduled maintenance', createdBy: staff.id,
    });
    expect(await row(saved.id)).toMatchObject({
      venue_id: venueId, reason: 'Scheduled maintenance', created_by: staff.id,
    });
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'refuses creation by %s without inserting a row (AC13)', async (role) => {
      const venueId = await venue();
      const actor = role === 'EVENT_ORGANISER' ? organiser : await fixture.createUser(role);
      await expect(create(venueId, actor)).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      expect((await fixture.pool.query('SELECT count(*)::int AS count FROM venue_unavailability WHERE venue_id = $1', [venueId])).rows[0].count)
        .toBe(0);
    },
  );

  it('refuses a missing or inactive venue', async () => {
    await expect(create(randomUUID(), staff)).rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
    const venueId = await venue({ isActive: false });
    await expect(create(venueId, staff)).rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
  });

  it('refuses a block overlapping an existing approved booking without displacing it', async () => {
    const venueId = await venue();
    const bookingId = await approvedBooking(venueId);
    await expect(create(venueId, staff)).rejects.toMatchObject({ code: 'VENUE_BOOKING_CONFLICT' });
    expect((await fixture.pool.query('SELECT status FROM venue_bookings WHERE id = $1', [bookingId])).rows[0].status)
      .toBe('APPROVED');
    expect((await fixture.pool.query('SELECT count(*)::int AS count FROM venue_unavailability WHERE venue_id = $1', [venueId])).rows[0].count)
      .toBe(0);
  });

  it('allows an adjacent block that does not overlap an approved booking', async () => {
    const venueId = await venue();
    await approvedBooking(venueId);
    const saved = await create(venueId, staff, { startsAt: endsAt, endsAt: '2026-12-01T08:00:00.000Z' });
    expect(saved.startsAt).toBe(endsAt);
  });

  it('lists a venue\'s blocks earliest first and only for that venue', async () => {
    const venueId = await venue();
    const other = await venue();
    const second = await create(venueId, staff, { startsAt: endsAt, endsAt: '2026-12-01T08:00:00.000Z' });
    const first = await create(venueId, staff);
    await create(other, staff);
    const items = await listVenueBlocks(fixture.dependencies, { actor: staff, venueId });
    expect(items.map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it('deletes a block and returns the same not-found response for a missing one', async () => {
    const venueId = await venue();
    const saved = await create(venueId, staff);
    await deleteVenueBlock(fixture.dependencies, { actor: staff, blockId: saved.id });
    expect(await row(saved.id)).toBeUndefined();
    await expect(deleteVenueBlock(fixture.dependencies, { actor: staff, blockId: saved.id }))
      .rejects.toMatchObject({ code: 'VENUE_BLOCK_NOT_FOUND' });
  });

  it('refuses deletion by a non-staff actor and leaves the row unchanged', async () => {
    const venueId = await venue();
    const saved = await create(venueId, staff);
    await expect(deleteVenueBlock(fixture.dependencies, { actor: coordinator, blockId: saved.id }))
      .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
    expect(await row(saved.id)).toBeDefined();
  });
});
