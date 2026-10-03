import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import {
  decideVenueBooking, getVenueBooking, listVenueBookings,
} from '../../../backend/src/modules/venues/booking-service.js';
import { listVenueAvailability } from '../../../backend/src/modules/venues/availability.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let staff: WorkflowActor;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  staff = await fixture.createUser('VENUE_STAFF');
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
});
afterAll(async () => { await fixture?.destroy(); });

const startsAt = '2026-12-01T02:00:00.000Z';
const endsAt = '2026-12-01T06:00:00.000Z';

async function booking(options: {
  venueId?: string; eventRequestId?: string; eventStatus?: EventStatus; coordinatorId?: string;
  startsAt?: string; endsAt?: string;
} = {}) {
  const venueId = options.venueId ?? randomUUID();
  if (!options.venueId) {
    await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)',
      [venueId, `Venue ${venueId}`]);
  }
  const eventRequestId = options.eventRequestId ?? await fixture.createEvent({
    organiserId: organiser.id, coordinatorId: options.coordinatorId ?? coordinator.id,
    status: options.eventStatus ?? 'APPROVED',
  });
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO venue_bookings
    (id,event_request_id,venue_id,requested_by,starts_at,ends_at,layout,notes,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,'Theatre','Projector required','2026-10-01T00:00:00Z')`,
  [id, eventRequestId, venueId, coordinator.id, options.startsAt ?? startsAt, options.endsAt ?? endsAt]);
  return { id, eventRequestId, venueId };
}

async function row(id: string) {
  return (await fixture.pool.query('SELECT * FROM venue_bookings WHERE id = $1', [id])).rows[0];
}
const decide = (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
  decideVenueBooking(fixture.dependencies, { bookingId: id, actor: staff, input: { decision, reason } });

describe('KAN-8 atomic venue booking decisions against PostgreSQL', () => {
  it.each(['APPROVED', 'REJECTED'] as const)('records %s, attribution and information without changing the event', async (decision) => {
    const created = await booking();
    const eventBefore = await fixture.eventRow(created.eventRequestId);
    const historyBefore = await fixture.history(created.eventRequestId);
    const calendar = () => listVenueAvailability(fixture.dependencies, coordinator, { from: startsAt, to: endsAt });
    expect((await calendar()).find(venue => venue.id === created.venueId)?.unavailable).toEqual([]);
    const saved = await decide(created.id, decision, '  Venue requirements reviewed.  ');
    expect(saved).toMatchObject({
      id: created.id, eventRequestId: created.eventRequestId, venueId: created.venueId,
      eventStatus: 'APPROVED', status: decision, decidedBy: staff.id,
      decisionReason: 'Venue requirements reviewed.', startsAt, endsAt,
      layout: 'Theatre', notes: 'Projector required', expectedAttendance: 50, venueRequirements: 'A hall',
    });
    expect(saved.decidedAt).toEqual(expect.any(String));
    expect(saved.updatedAt).not.toBe('2026-10-01T00:00:00.000Z');
    expect(await row(created.id)).toMatchObject({
      status: decision, decided_by: staff.id, decision_reason: 'Venue requirements reviewed.',
    });
    expect(await fixture.eventRow(created.eventRequestId)).toEqual(eventBefore);
    expect(await fixture.history(created.eventRequestId)).toEqual(historyBefore);
    expect(await fixture.notifications(created.eventRequestId)).toEqual([]);
    expect(await listVenueBookings(fixture.dependencies,
      { actor: staff, eventRequestId: created.eventRequestId })).toEqual([]);
    expect(await getVenueBooking(fixture.dependencies, { actor: staff, bookingId: created.id })).toEqual(saved);
    expect(await getVenueBooking(fixture.dependencies, { actor: coordinator, bookingId: created.id })).toEqual(saved);
    expect((await calendar()).find(venue => venue.id === created.venueId)?.unavailable).toEqual(
      decision === 'APPROVED' ? [{
        id: created.id, kind: 'BOOKING', startsAt, endsAt,
        event: { id: created.eventRequestId, name: 'Open day' },
      }] : [],
    );
  });

  it('shows staff pending requests with timing and requirements, and coordinator all own outcomes', async () => {
    const first = await booking();
    const second = await booking({ eventRequestId: first.eventRequestId });
    await decide(second.id, 'REJECTED');
    const staffQueue = await listVenueBookings(fixture.dependencies,
      { actor: staff, eventRequestId: first.eventRequestId });
    expect(staffQueue).toHaveLength(1);
    expect(staffQueue[0]).toMatchObject({
      id: first.id, status: 'PENDING', eventStartsAt: startsAt, eventEndsAt: endsAt,
      eventName: 'Open day', purpose: 'Purpose', venueRequirements: 'A hall',
    });
    const coordinatorItems = await listVenueBookings(fixture.dependencies,
      { actor: coordinator, eventRequestId: first.eventRequestId });
    expect(coordinatorItems.map(item => item.id)).toEqual([first.id, second.id]);
    expect(coordinatorItems.map(item => item.status)).toEqual(['PENDING', 'REJECTED']);
  });

  it('hides unrelated and draft event bookings from coordinators, including filtered lists', async () => {
    const unrelated = await booking({ coordinatorId: otherCoordinator.id });
    const draft = await booking({ eventStatus: 'DRAFT' });
    for (const item of [unrelated, draft]) {
      await expect(getVenueBooking(fixture.dependencies, { bookingId: item.id, actor: coordinator }))
        .rejects.toMatchObject({ code: 'VENUE_BOOKING_NOT_FOUND' });
      expect(await listVenueBookings(fixture.dependencies,
        { actor: coordinator, eventRequestId: item.eventRequestId })).toEqual([]);
    }
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'denies direct service decisions by %s and leaves the record unchanged', async (role) => {
      const created = await booking();
      const actor = await fixture.createUser(role);
      const before = await row(created.id);
      await expect(decideVenueBooking(fixture.dependencies,
        { bookingId: created.id, actor, input: { decision: 'APPROVED' } }))
        .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      expect(await row(created.id)).toEqual(before);
    },
  );

  it('leaves the original decision unchanged after both duplicate and opposite attempts', async () => {
    const created = await booking();
    await decide(created.id, 'APPROVED');
    const before = await row(created.id);
    for (const decision of ['APPROVED', 'REJECTED'] as const) {
      await expect(decide(created.id, decision)).rejects.toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
      expect(await row(created.id)).toEqual(before);
    }
  });

  it('permits exactly one winner when approval and rejection compete for the same request', async () => {
    const created = await booking();
    const results = await Promise.allSettled([decide(created.id, 'APPROVED'), decide(created.id, 'REJECTED')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toEqual([
      expect.objectContaining({ reason: expect.objectContaining({ code: 'BOOKING_ALREADY_DECIDED' }) }),
    ]);
    const winner = results.find(result => result.status === 'fulfilled');
    if (!winner || winner.status !== 'fulfilled') throw new Error('Expected one winner.');
    expect((await row(created.id)).status).toBe(winner.value.status);
  });

  it('serializes concurrent overlapping approvals for different events at the same venue', async () => {
    const first = await booking();
    const second = await booking({ venueId: first.venueId });
    const blocker = await fixture.pool.connect();
    let attempts: Promise<PromiseSettledResult<Awaited<ReturnType<typeof decide>>>[]> | undefined;
    let results: PromiseSettledResult<Awaited<ReturnType<typeof decide>>>[] = [];
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM venues WHERE id = $1 FOR UPDATE', [first.venueId]);
      attempts = Promise.allSettled([decide(first.id, 'APPROVED'), decide(second.id, 'APPROVED')]);
      await expect.poll(async () => {
        const found = await fixture.pool.query<{ count: number }>(`SELECT count(*)::integer AS count
          FROM pg_stat_activity WHERE application_name = current_schema() AND wait_event_type = 'Lock'`);
        return found.rows[0]!.count;
      }, { timeout: 3000 }).toBe(2);
    } finally {
      try { await blocker.query('ROLLBACK'); } finally {
        blocker.release(true);
        if (attempts) results = await attempts;
      }
    }
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toEqual([
      expect.objectContaining({ reason: expect.objectContaining({ code: 'VENUE_BOOKING_CONFLICT' }) }),
    ]);
    const rows = await fixture.pool.query('SELECT status FROM venue_bookings WHERE venue_id = $1', [first.venueId]);
    expect(rows.rows.map(item => item.status).sort()).toEqual(['APPROVED', 'PENDING']);
  });

  it('allows adjacent bookings and ignores rejected and pending requests when checking availability', async () => {
    const rejected = await booking();
    await decide(rejected.id, 'REJECTED');
    const accepted = await booking({ venueId: rejected.venueId });
    await booking({ venueId: rejected.venueId });
    await expect(decide(accepted.id, 'APPROVED')).resolves.toMatchObject({ status: 'APPROVED' });
    const adjacent = await booking({ venueId: rejected.venueId, startsAt: endsAt, endsAt: '2026-12-01T08:00:00Z' });
    await expect(decide(adjacent.id, 'APPROVED')).resolves.toMatchObject({ status: 'APPROVED' });
  });

  it('rejects approval overlapping an operational block without writing any decision', async () => {
    const created = await booking();
    await fixture.pool.query(`INSERT INTO venue_unavailability(venue_id,starts_at,ends_at,reason)
      VALUES($1,$2,$3,'Maintenance')`, [created.venueId, startsAt, endsAt]);
    const before = await row(created.id);
    await expect(decide(created.id, 'APPROVED')).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    expect(await row(created.id)).toEqual(before);
    await expect(decide(created.id, 'REJECTED', 'Maintenance')).resolves.toMatchObject({ status: 'REJECTED' });
  });

  it.each(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const)(
    'refuses approval for a %s event but still lets staff reject the stale pending request', async (eventStatus) => {
      const created = await booking({ eventStatus });
      const before = await row(created.id);
      await expect(decide(created.id, 'APPROVED')).rejects.toMatchObject({ code: 'EVENT_NOT_APPROVED' });
      expect(await row(created.id)).toEqual(before);
      await expect(decide(created.id, 'REJECTED')).resolves.toMatchObject({ status: 'REJECTED' });
    },
  );

  it('refuses an inactive venue approval but permits rejection', async () => {
    const created = await booking();
    await fixture.pool.query('UPDATE venues SET is_active=false WHERE id=$1', [created.venueId]);
    const before = await row(created.id);
    await expect(decide(created.id, 'APPROVED')).rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
    expect(await row(created.id)).toEqual(before);
    await expect(decide(created.id, 'REJECTED')).resolves.toMatchObject({ status: 'REJECTED' });
  });

  it('rolls back all decision fields when the database refuses the write', async () => {
    const created = await booking();
    const before = await row(created.id);
    await fixture.pool.query(`ALTER TABLE venue_bookings ADD CONSTRAINT test_decision_failure
      CHECK(id <> '${created.id}'::uuid OR status = 'PENDING') NOT VALID`);
    try {
      await expect(decide(created.id, 'APPROVED')).rejects.toMatchObject({ code: '23514' });
      expect(await row(created.id)).toEqual(before);
    } finally {
      await fixture.pool.query('ALTER TABLE venue_bookings DROP CONSTRAINT test_decision_failure');
    }
  });

  it('returns the same not-found response for a missing booking', async () => {
    await expect(decide(randomUUID(), 'APPROVED')).rejects.toMatchObject({ code: 'VENUE_BOOKING_NOT_FOUND' });
  });
});

describe('KAN-8 runtime cookie authentication and database role mapping', () => {
  it('uses the mapped role, persists a staff decision and exposes it only to the assigned coordinator', async () => {
    const claims = new Map<string, string>();
    // Only token verification is a fixture. Cookie handling, app_users mapping, route mounting,
    // permissions and persistence use the production runtime factory and PostgreSQL.
    const app = createRuntimeApp({ pool: fixture.pool, supabaseAuth: {
      async verifyAccessToken(token) {
        const uid = claims.get(token);
        if (!uid) throw Object.assign(new Error('Untrusted fixture token'), { code: 'ERR_JWT_INVALID' });
        return { uid, exp: Math.floor(Date.now() / 1000) + 3600 };
      },
    } });
    async function sessionFor(actor: WorkflowActor) {
      const uid = randomUUID();
      const token = randomUUID();
      claims.set(token, uid);
      await fixture.pool.query('UPDATE app_users SET supabase_user_id=$1 WHERE id=$2', [uid, actor.id]);
      const session = request.agent(app);
      expect((await session.post('/api/auth/login').send({ accessToken: token })).status).toBe(200);
      return session;
    }
    const created = await booking();
    const path = `/api/venue-bookings/${created.id}`;
    for (const attempt of [request(app).get('/api/venue-bookings'), request(app).get(path),
      request(app).post(`${path}/decision`).send({ decision: 'APPROVED' })]) {
      expect((await attempt).status).toBe(401);
    }
    expect((await request(app).get(path).set('Cookie', 'connectsphere_session=invalid')).status).toBe(401);
    for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] satisfies UserRole[]) {
      const user = role === 'EVENT_COORDINATOR' ? coordinator : await fixture.createUser(role);
      const session = await sessionFor(user);
      expect((await session.post(`${path}/decision`).set('X-Role', 'VENUE_STAFF')
        .send({ decision: 'APPROVED' })).status).toBe(403);
      if (role !== 'EVENT_COORDINATOR') expect((await session.get(path)).status).toBe(403);
    }
    const staffSession = await sessionFor(staff);
    const queue = await staffSession.get('/api/venue-bookings').query({ eventRequestId: created.eventRequestId });
    expect(queue.status).toBe(200);
    expect(queue.body.items.map((item: { id: string }) => item.id)).toEqual([created.id]);
    const decision = await staffSession.post(`${path}/decision`).send({ decision: 'REJECTED', reason: 'Insufficient capacity.' });
    expect(decision.status).toBe(200);
    expect(decision.body.booking).toMatchObject({ status: 'REJECTED', decidedBy: staff.id, decisionReason: 'Insufficient capacity.' });
    expect((await staffSession.post(`${path}/decision`).send({ decision: 'APPROVED' })).status).toBe(409);
    const coordinatorSession = await sessionFor(coordinator);
    expect((await coordinatorSession.get(path)).body.booking.decisionReason).toBe('Insufficient capacity.');
    const approved = await booking();
    const approval = await staffSession.post(`/api/venue-bookings/${approved.id}/decision`).send({ decision: 'APPROVED' });
    expect(approval.status).toBe(200);
    const availability = await coordinatorSession.get('/api/venues/availability').query({ from: startsAt, to: endsAt });
    expect(availability.status).toBe(200);
    const visibleVenues = availability.body.items as { id: string; unavailable: { id: string }[] }[];
    expect(visibleVenues.find(venue => venue.id === approved.venueId)?.unavailable.map(period => period.id)).toEqual([approved.id]);
    expect(visibleVenues.find(venue => venue.id === created.venueId)?.unavailable).toEqual([]);
    const outsider = await sessionFor(otherCoordinator);
    expect((await outsider.get(path)).status).toBe(404);
    expect((await outsider.get('/api/venue-bookings').query({ eventRequestId: created.eventRequestId })).body.items).toEqual([]);
  });
});
