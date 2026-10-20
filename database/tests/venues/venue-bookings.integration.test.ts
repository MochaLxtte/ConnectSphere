import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import {
  createVenueBooking, decideVenueBooking, getVenueBooking, listVenueBookings,
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
        id: created.id, kind: 'BOOKING', startsAt, endsAt, eventStartsAt: startsAt, eventEndsAt: endsAt, warnings: [],
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

const submission = { venueId: '', startsAt, endsAt, layout: 'Theatre', notes: 'Projector required' };
const submit = (eventRequestId: string, actor: WorkflowActor, overrides: Partial<typeof submission> = {}) =>
  createVenueBooking(fixture.dependencies,
    { eventRequestId, actor, input: { ...submission, ...overrides } });

async function submissionTarget(venueId?: string) {
  const id = venueId ?? randomUUID();
  if (!venueId) await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)', [id, `Venue ${id}`]);
  const eventRequestId = await fixture.createEvent({
    organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED',
  });
  return { venueId: id, eventRequestId };
}

async function submissionState(eventRequestId: string) {
  return {
    event: (await fixture.pool.query('SELECT * FROM event_requests WHERE id=$1', [eventRequestId])).rows[0],
    bookings: (await fixture.pool.query('SELECT * FROM venue_bookings WHERE event_request_id=$1 ORDER BY id', [eventRequestId])).rows,
    history: await fixture.history(eventRequestId),
    notifications: await fixture.notifications(eventRequestId),
  };
}

describe('KAN-53 venue booking submission against PostgreSQL', () => {
  it('creates a pending booking associated with the correct event and venue (AC1-AC7, AC9, AC10)', async () => {
    const venueId = randomUUID();
    await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)', [venueId, `Venue ${venueId}`]);
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id });
    const saved = await submit(eventRequestId, coordinator, { venueId });
    expect(saved).toMatchObject({
      eventRequestId, venueId, status: 'PENDING', startsAt, endsAt,
      layout: 'Theatre', notes: 'Projector required', decidedBy: null, decidedAt: null,
      venueRequirements: 'A hall',
    });
    expect(await row(saved.id)).toMatchObject({
      event_request_id: eventRequestId, venue_id: venueId, requested_by: coordinator.id, status: 'PENDING',
    });
  });

  it('becomes visible to venue staff review and to the coordinator, but not before approval (AC8)', async () => {
    const created = await booking({ eventStatus: 'SUBMITTED' });
    const saved = await submit(created.eventRequestId, coordinator, { venueId: created.venueId });
    const staffQueue = await listVenueBookings(fixture.dependencies, { actor: staff, eventRequestId: created.eventRequestId });
    expect(staffQueue.map((item) => item.id)).toContain(saved.id);
    expect(saved.status).toBe('PENDING');
    const coordinatorItems = await listVenueBookings(fixture.dependencies, { actor: coordinator, eventRequestId: created.eventRequestId });
    expect(coordinatorItems.map((item) => item.id)).toContain(saved.id);
  });

  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'refuses submission by %s without creating a row (AC11)', async (role) => {
      const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id });
      const before = await fixture.pool.query('SELECT count(*)::int AS count FROM venue_bookings WHERE event_request_id = $1', [eventRequestId]);
      const actor = role === 'EVENT_ORGANISER' ? organiser : await fixture.createUser(role);
      await expect(submit(eventRequestId, actor, { venueId: randomUUID() }))
        .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      expect((await fixture.pool.query('SELECT count(*)::int AS count FROM venue_bookings WHERE event_request_id = $1', [eventRequestId])).rows[0].count)
        .toBe(before.rows[0].count);
    },
  );

  it('refuses submission by an unrelated or unassigned coordinator with the same not-found response (AC11)', async () => {
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id });
    await expect(submit(eventRequestId, otherCoordinator, { venueId: randomUUID() }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    const draftId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'DRAFT' });
    await expect(submit(draftId, coordinator, { venueId: randomUUID() }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });

  it.each(['REJECTED', 'CANCELLED', 'COMPLETED'] as const)(
    'refuses submission for a %s event', async (eventStatus) => {
      const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: eventStatus });
      await expect(submit(eventRequestId, coordinator, { venueId: randomUUID() }))
        .rejects.toMatchObject({ code: 'EVENT_NOT_ELIGIBLE' });
    },
  );

  it('refuses submission for a missing or inactive venue', async () => {
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id });
    await expect(submit(eventRequestId, coordinator, { venueId: randomUUID() }))
      .rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
    const venueId = randomUUID();
    await fixture.pool.query('INSERT INTO venues(id,name,capacity,is_active) VALUES($1,$2,100,false)', [venueId, `Venue ${venueId}`]);
    await expect(submit(eventRequestId, coordinator, { venueId }))
      .rejects.toMatchObject({ code: 'VENUE_INACTIVE' });
  });

  it('allows several pending requests for the same event and venue without auto-approving any (AC9)', async () => {
    const venueId = randomUUID();
    await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)', [venueId, `Venue ${venueId}`]);
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id });
    const first = await submit(eventRequestId, coordinator, { venueId });
    const second = await submit(eventRequestId, coordinator, { venueId });
    expect(first.status).toBe('PENDING');
    expect(second.status).toBe('PENDING');
    expect(first.id).not.toBe(second.id);
  });

  it.each(['approved booking', 'operational block'] as const)(
    'refuses submission overlapping an %s without inserting a booking or changing the event', async (kind) => {
      const existing = await booking();
      if (kind === 'approved booking') await decide(existing.id, 'APPROVED');
      else await fixture.pool.query(`INSERT INTO venue_unavailability(venue_id,starts_at,ends_at,reason)
        VALUES($1,$2,$3,'Maintenance')`, [existing.venueId, startsAt, endsAt]);
      const target = await submissionTarget(existing.venueId);
      const before = await submissionState(target.eventRequestId);
      const existingBefore = await row(existing.id);
      await expect(submit(target.eventRequestId, coordinator, { venueId: target.venueId }))
        .rejects.toMatchObject({ code: kind === 'approved booking' ? 'VENUE_BOOKING_CONFLICT' : 'VENUE_UNAVAILABLE' });
      expect(await submissionState(target.eventRequestId)).toEqual(before);
      expect(await row(existing.id)).toEqual(existingBefore);
    },
  );

  it.each(['approved booking', 'operational block'] as const)(
    'permits submission immediately before and after an %s', async (kind) => {
      const existing = await booking();
      if (kind === 'approved booking') await decide(existing.id, 'APPROVED');
      else await fixture.pool.query(`INSERT INTO venue_unavailability(venue_id,starts_at,ends_at)
        VALUES($1,$2,$3)`, [existing.venueId, startsAt, endsAt]);
      const target = await submissionTarget(existing.venueId);
      const before = await submissionState(target.eventRequestId);
      const earlier = await submit(target.eventRequestId, coordinator, {
        venueId: target.venueId, startsAt: '2026-12-01T00:00:00.000Z', endsAt: startsAt,
      });
      const later = await submit(target.eventRequestId, coordinator, {
        venueId: target.venueId, startsAt: endsAt, endsAt: '2026-12-01T08:00:00.000Z',
      });
      expect(earlier.status).toBe('PENDING');
      expect(later.status).toBe('PENDING');
      const after = await submissionState(target.eventRequestId);
      expect(after.bookings).toHaveLength(2);
      expect({ ...after, bookings: [] }).toEqual(before);
    },
  );

  it.each(['approved booking', 'operational block'] as const)(
    'sees an %s committed while submission waits for the venue lock', async (kind) => {
      const existing = await booking();
      const target = await submissionTarget(existing.venueId);
      const before = await submissionState(target.eventRequestId);
      const writer = await fixture.pool.connect();
      let attempt: Promise<PromiseSettledResult<Awaited<ReturnType<typeof submit>>>[]> | undefined;
      let results: PromiseSettledResult<Awaited<ReturnType<typeof submit>>>[] = [];
      try {
        await writer.query('BEGIN');
        await writer.query('SELECT id FROM venues WHERE id=$1 FOR UPDATE', [existing.venueId]);
        attempt = Promise.allSettled([submit(target.eventRequestId, coordinator, { venueId: target.venueId })]);
        // Observe the service actually blocked on the venue row; no timing-based sleeps.
        await expect.poll(async () => {
          const waiting = await fixture.pool.query<{ count: number }>(`SELECT count(*)::integer AS count
            FROM pg_stat_activity WHERE application_name=current_schema() AND wait_event_type='Lock'
              AND query LIKE '%FROM venues WHERE id = $1 FOR UPDATE%'`);
          return waiting.rows[0]!.count;
        }, { timeout: 3000 }).toBe(1);
        if (kind === 'approved booking') {
          await writer.query(`UPDATE venue_bookings SET status='APPROVED',decided_by=$2,decided_at=now()
            WHERE id=$1`, [existing.id, staff.id]);
        } else {
          await writer.query(`INSERT INTO venue_unavailability(venue_id,starts_at,ends_at,reason)
            VALUES($1,$2,$3,'Committed during submission wait')`, [existing.venueId, startsAt, endsAt]);
        }
        await writer.query('COMMIT');
      } finally {
        try { await writer.query('ROLLBACK'); } finally {
          writer.release(true);
          if (attempt) results = await attempt;
        }
      }
      expect(results).toEqual([expect.objectContaining({ status: 'rejected',
        reason: expect.objectContaining({ code: kind === 'approved booking' ? 'VENUE_BOOKING_CONFLICT' : 'VENUE_UNAVAILABLE' }),
      })]);
      expect(await submissionState(target.eventRequestId)).toEqual(before);
    },
  );
});

describe('KAN-53/KAN-8 runtime submission-to-decision workflow', () => {
  async function runtime() {
    const claims = new Map<string, string>();
    // Supabase token verification is injected; cookie handling, current DB role/relation checks,
    // mounted endpoints and persisted records are the actual runtime implementation.
    const app = createRuntimeApp({ pool: fixture.pool, supabaseAuth: {
      async verifyAccessToken(token) {
        const uid = claims.get(token);
        if (!uid) throw Object.assign(new Error('Invalid fixture token'), { code: 'ERR_JWT_INVALID' });
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
    return { app, sessionFor };
  }

  it.each(['APPROVED', 'REJECTED'] as const)('persists coordinator submission, staff %s and coordinator outcome', async (decision) => {
    const { sessionFor } = await runtime();
    const target = await submissionTarget();
    const before = await submissionState(target.eventRequestId);
    const coordinatorSession = await sessionFor(coordinator);
    const staffSession = await sessionFor(staff);
    const path = `/api/events/${target.eventRequestId}/venue-bookings`;
    const created = await coordinatorSession.post(path).send({ ...submission, venueId: target.venueId });
    expect(created.status).toBe(201);
    expect(created.headers['cache-control']).toBe('no-store');
    const saved = created.body.booking;
    expect(saved).toMatchObject({ eventRequestId: target.eventRequestId, venueId: target.venueId,
      status: 'PENDING', decidedBy: null, decidedAt: null, startsAt, endsAt });
    expect(await row(saved.id)).toMatchObject({ requested_by: coordinator.id, status: 'PENDING' });
    const detailPath = `/api/venue-bookings/${saved.id}`;
    const queue = await staffSession.get('/api/venue-bookings').query({ eventRequestId: target.eventRequestId });
    expect(queue.status).toBe(200);
    expect(queue.body.items.map((item: { id: string }) => item.id)).toEqual([saved.id]);
    const decided = await staffSession.post(`${detailPath}/decision`).send({ decision, reason: 'Staff assessment.' });
    expect(decided.status).toBe(200);
    expect(decided.body.booking).toMatchObject({ id: saved.id, status: decision, decidedBy: staff.id });
    const outcome = await coordinatorSession.get(detailPath);
    expect(outcome.status).toBe(200);
    expect(outcome.body.booking).toEqual(decided.body.booking);
    const repeated = await staffSession.post(`${detailPath}/decision`).send({ decision });
    expect(repeated.status).toBe(409);
    expect(repeated.body.error.code).toBe('BOOKING_ALREADY_DECIDED');
    expect((await staffSession.get('/api/venue-bookings').query({ eventRequestId: target.eventRequestId })).body.items).toEqual([]);
    const after = await submissionState(target.eventRequestId);
    expect(after.bookings).toHaveLength(1);
    expect({ ...after, bookings: [] }).toEqual(before);

    if (decision === 'APPROVED') {
      const overlap = await coordinatorSession.post(path).send({ ...submission, venueId: target.venueId });
      expect(overlap.status).toBe(409);
      expect(overlap.body.error.code).toBe('VENUE_BOOKING_CONFLICT');
      expect(await submissionState(target.eventRequestId)).toEqual(after);
    }
  });

  it('enforces mapped roles, current assignment and private errors on the running submission endpoint', async () => {
    const { app, sessionFor } = await runtime();
    const target = await submissionTarget();
    const before = await submissionState(target.eventRequestId);
    const path = `/api/events/${target.eventRequestId}/venue-bookings`;
    const body = { ...submission, venueId: target.venueId };
    expect((await request(app).post(path).send(body)).status).toBe(401);
    expect((await request(app).post(path).set('Cookie', 'connectsphere_session=invalid').send(body)).status).toBe(401);
    for (const role of ['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const) {
      const actor = await fixture.createUser(role);
      const session = await sessionFor(actor);
      const denied = await session.post(path).set('X-Role', 'EVENT_COORDINATOR').set('X-User-Id', coordinator.id).send(body);
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe('ACTION_FORBIDDEN');
    }
    const outsider = await sessionFor(otherCoordinator);
    const hidden = await outsider.post(path).send(body);
    const absent = await outsider.post(`/api/events/${randomUUID()}/venue-bookings`).send(body);
    expect(hidden.status).toBe(404);
    expect(hidden.body).toEqual(absent.body);
    expect(hidden.body.error.code).toBe('EVENT_REQUEST_NOT_FOUND');
    const own = await sessionFor(coordinator);
    const forged = await own.post(path).send({ ...body, requestedBy: otherCoordinator.id, status: 'APPROVED' });
    expect(forged.status).toBe(400);
    expect(await submissionState(target.eventRequestId)).toEqual(before);
    await fixture.pool.query('UPDATE event_requests SET coordinator_id=$2 WHERE id=$1', [target.eventRequestId, otherCoordinator.id]);
    const reassignedBefore = await submissionState(target.eventRequestId);
    expect((await own.post(path).send(body)).status).toBe(404);
    expect(await submissionState(target.eventRequestId)).toEqual(reassignedBefore);
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

describe('KAN-54 conflict detection scope against PostgreSQL', () => {
  it('does not treat an approved booking at another venue as a conflict (KAN-54-AC3)', async () => {
    const elsewhere = await booking();
    await decide(elsewhere.id, 'APPROVED');
    const target = await submissionTarget();
    expect(target.venueId).not.toBe(elsewhere.venueId);
    const created = await submit(target.eventRequestId, coordinator, { venueId: target.venueId });
    expect(created.status).toBe('PENDING');
    await expect(decide(created.id, 'APPROVED')).resolves.toMatchObject({ status: 'APPROVED' });
  });

  it('does not treat an operational block at another venue as a conflict (KAN-54-AC3, AC5)', async () => {
    const other = await booking();
    await fixture.pool.query(`INSERT INTO venue_unavailability(venue_id,starts_at,ends_at,reason)
      VALUES($1,$2,$3,'Maintenance')`, [other.venueId, startsAt, endsAt]);
    const target = await submissionTarget();
    const created = await submit(target.eventRequestId, coordinator, { venueId: target.venueId });
    await expect(decide(created.id, 'APPROVED')).resolves.toMatchObject({ status: 'APPROVED' });
  });

  it('ignores a cancelled booking when assessing the same venue and period (KAN-54-AC1, AC4)', async () => {
    const cancelled = await booking();
    await fixture.pool.query("UPDATE venue_bookings SET status='CANCELLED' WHERE id=$1", [cancelled.id]);
    const target = await submissionTarget(cancelled.venueId);
    const created = await submit(target.eventRequestId, coordinator, { venueId: cancelled.venueId });
    await expect(decide(created.id, 'APPROVED')).resolves.toMatchObject({ status: 'APPROVED' });
  });
});
