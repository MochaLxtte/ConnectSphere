import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import type { EventStatus } from '../../../backend/src/modules/events/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import type { VenueSuitabilityInput } from '../../../backend/src/modules/venues/suitability-input.js';
import {
  checkVenueSuitability, getVenueSuitabilityContext,
} from '../../../backend/src/modules/venues/suitability-service.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;
let organiser: WorkflowActor;
let staff: WorkflowActor;
const startsAt = '2026-12-01T02:00:00.000Z';
const endsAt = '2026-12-01T04:00:00.000Z';

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
  organiser = await fixture.createUser('EVENT_ORGANISER');
  staff = await fixture.createUser('VENUE_STAFF');
});
afterAll(async () => { await fixture?.destroy(); });

async function venue() {
  const id = randomUUID();
  await fixture.pool.query(`INSERT INTO venues
    (id,name,capacity,facilities,accessibility_features,layouts,wheelchair_accessible,opens_at,closes_at)
    VALUES($1,$2,50,ARRAY['Projector'],ARRAY['Hearing loop'],ARRAY['Theatre'],true,'08:00','22:00')`,
  [id, `Hall ${id}`]);
  return id;
}

async function setup(options: { status?: EventStatus; coordinatorId?: string | null } = {}) {
  const eventId = await fixture.createEvent({ organiserId: organiser.id,
    coordinatorId: options.coordinatorId === undefined ? coordinator.id : options.coordinatorId,
    status: options.status ?? 'APPROVED', startsAt, endsAt });
  await fixture.pool.query(`UPDATE event_requests SET venue_requirements=$2,accessibility_needs=$3 WHERE id=$1`,
    [eventId, 'A projector and theatre seating', 'Wheelchair access and hearing loop']);
  const venueId = await venue();
  return { eventId, venueId };
}

async function inputFor(eventId: string, venueId: string): Promise<VenueSuitabilityInput> {
  const context = await getVenueSuitabilityContext(fixture.dependencies, { actor: coordinator, eventId });
  return { venueId, requirementsVersion: context.requirementsVersion, facilities: ['projector'],
    accessibility: ['hearing LOOP'], layout: 'theatre', wheelchairRequired: true,
    requirementsConfirmed: true, unresolvedRequirements: null };
}

const assess = (eventId: string, input: VenueSuitabilityInput, actor = coordinator) =>
  checkVenueSuitability(fixture.dependencies, { actor, eventId, input });

async function addBooking(pair: { eventId: string; venueId: string }, status: string,
  start = startsAt, end = endsAt) {
  const decided = status === 'APPROVED' || status === 'REJECTED';
  const result = await fixture.pool.query<{ id: string }>(`INSERT INTO venue_bookings
    (event_request_id,venue_id,requested_by,status,starts_at,ends_at,decided_by,decided_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
  [pair.eventId, pair.venueId, coordinator.id, status, start, end, decided ? staff.id : null, decided ? new Date() : null]);
  return result.rows[0]!.id;
}

describe('KAN-52 current-data venue suitability against PostgreSQL', () => {
  it('returns current event context with active catalogue values and no unrelated identity data', async () => {
    const pair = await setup();
    const inactive = await venue();
    await fixture.pool.query('UPDATE venues SET is_active=false WHERE id=$1', [inactive]);
    const context = await getVenueSuitabilityContext(fixture.dependencies, { actor: coordinator, eventId: pair.eventId });
    expect(context.event).toEqual({ id: pair.eventId, name: 'Open day', startsAt, endsAt, expectedAttendance: 50,
      venueRequirements: 'A projector and theatre seating', accessibilityNeeds: 'Wheelchair access and hearing loop' });
    expect(context.requirementsVersion).toMatch(/^[a-f0-9]{64}$/);
    expect(context.venues.find(item => item.id === pair.venueId)).toMatchObject({ capacity: 50,
      facilities: ['Projector'], accessibilityFeatures: ['Hearing loop'], layouts: ['Theatre'],
      wheelchairAccessible: true, opensAt: '08:00:00', closesAt: '22:00:00' });
    expect(context.venues.map(item => item.id)).not.toContain(inactive);
    expect(JSON.stringify(context)).not.toContain(organiser.id);
  });

  it('passes a fitting venue and leaves all event, venue, booking, block and audit records untouched', async () => {
    const pair = await setup();
    const input = await inputFor(pair.eventId, pair.venueId);
    const snapshot = async () => ({
      event: (await fixture.pool.query('SELECT * FROM event_requests WHERE id=$1', [pair.eventId])).rows,
      venue: (await fixture.pool.query('SELECT * FROM venues WHERE id=$1', [pair.venueId])).rows,
      bookings: (await fixture.pool.query('SELECT * FROM venue_bookings WHERE event_request_id=$1', [pair.eventId])).rows,
      blocks: (await fixture.pool.query('SELECT * FROM venue_unavailability WHERE venue_id=$1', [pair.venueId])).rows,
      history: await fixture.history(pair.eventId), notifications: await fixture.notifications(pair.eventId),
    });
    const before = await snapshot();
    const result = await assess(pair.eventId, input);
    expect(result).toMatchObject({ eventId: pair.eventId, venueId: pair.venueId, outcome: 'SUITABLE' });
    expect(result.checks).toHaveLength(7);
    expect(result.checks.every(check => check.status === 'PASS')).toBe(true);
    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    { column: 'capacity', value: 49, check: 'capacity' },
    { column: 'facilities', value: ['Projector screen'], check: 'facilities' },
    { column: 'accessibility_features', value: [], check: 'accessibility' },
    { column: 'wheelchair_accessible', value: false, check: 'accessibility' },
    { column: 'layouts', value: ['Classroom'], check: 'layout' },
    { column: 'opens_at', value: '11:00', check: 'availability' },
    { column: 'closes_at', value: '11:00', check: 'availability' },
    { column: 'is_active', value: false, check: 'venueActive' },
  ])('uses the latest venue $column even when the catalogue timestamp is unchanged', async ({ column, value, check }) => {
    const pair = await setup();
    const input = await inputFor(pair.eventId, pair.venueId);
    await fixture.pool.query(`UPDATE venues SET ${column}=$2 WHERE id=$1`, [pair.venueId, value]);
    const result = await assess(pair.eventId, input);
    expect(result.outcome).toBe('UNSUITABLE');
    expect(result.checks.find(item => item.key === check)?.status).toBe('FAIL');
  });

  it.each([
    { column: 'venue_requirements', value: 'Stage and sound system' },
    { column: 'accessibility_needs', value: 'A quiet room' },
    { column: 'expected_attendance', value: 51 },
    { column: 'starts_at', value: '2026-12-01T03:00:00Z' },
    { column: 'ends_at', value: '2026-12-01T05:00:00Z' },
    { column: 'name', value: 'Updated event name' },
  ])('requires reconfirmation after current event $column changes without an updated_at change', async ({ column, value }) => {
    const pair = await setup();
    const input = await inputFor(pair.eventId, pair.venueId);
    const before = await fixture.eventRow(pair.eventId);
    await fixture.pool.query(`UPDATE event_requests SET ${column}=$2 WHERE id=$1`, [pair.eventId, value]);
    expect((await fixture.eventRow(pair.eventId)).updated_at).toEqual(before.updated_at);
    await expect(assess(pair.eventId, input)).rejects.toMatchObject({ code: 'SUITABILITY_CONTEXT_CHANGED' });
    const refreshed = await inputFor(pair.eventId, pair.venueId);
    expect(refreshed.requirementsVersion).not.toBe(input.requirementsVersion);
    await expect(assess(pair.eventId, refreshed)).resolves.toHaveProperty('checks');
  });

  it('reports unavailable required facilities even if no catalogue venue offers that value', async () => {
    const pair = await setup();
    const input = await inputFor(pair.eventId, pair.venueId);
    const result = await assess(pair.eventId, { ...input, facilities: ['Projection dome'] });
    expect(result.checks.find(check => check.key === 'facilities')).toMatchObject({ status: 'FAIL',
      message: expect.stringContaining('Projection dome') });
  });

  it.each(['PENDING', 'REJECTED', 'CANCELLED'])('does not treat a %s request as confirmed availability usage', async status => {
    const pair = await setup();
    await addBooking(pair, status);
    expect((await assess(pair.eventId, await inputFor(pair.eventId, pair.venueId))).outcome).toBe('SUITABLE');
  });

  it('reassesses approved bookings including this event, without exposing another booking identity', async () => {
    const pair = await setup();
    const input = await inputFor(pair.eventId, pair.venueId);
    const id = await addBooking(pair, 'PENDING');
    expect((await assess(pair.eventId, input)).outcome).toBe('SUITABLE');
    await fixture.pool.query("UPDATE venue_bookings SET status='APPROVED',decided_by=$2,decided_at=now() WHERE id=$1", [id, staff.id]);
    const result = await assess(pair.eventId, input);
    expect(result.checks.find(check => check.key === 'availability')?.status).toBe('FAIL');
    expect(JSON.stringify(result)).not.toContain(id);
    expect(JSON.stringify(result)).not.toContain(staff.id);
  });

  it('ignores other venues and permits half-open adjacency for bookings and operational blocks', async () => {
    const pair = await setup();
    await addBooking({ ...pair, venueId: await venue() }, 'APPROVED');
    await addBooking(pair, 'APPROVED', '2026-12-01T01:00:00Z', startsAt);
    await fixture.pool.query(`INSERT INTO venue_unavailability(venue_id,starts_at,ends_at)
      VALUES($1,$2,$3)`, [pair.venueId, endsAt, '2026-12-01T05:00:00Z']);
    const input = await inputFor(pair.eventId, pair.venueId);
    expect((await assess(pair.eventId, input)).outcome).toBe('SUITABLE');
    await fixture.pool.query(`UPDATE venue_unavailability SET starts_at=$2 WHERE venue_id=$1`,
      [pair.venueId, '2026-12-01T03:59:59.999Z']);
    const result = await assess(pair.eventId, input);
    expect(result.checks.find(check => check.key === 'availability')).toMatchObject({ status: 'FAIL',
      message: expect.stringContaining('operational block') });
  });

  it('does not approve an overnight interval merely because both clock times fit', async () => {
    const pair = await setup();
    await fixture.pool.query('UPDATE event_requests SET ends_at=$2 WHERE id=$1', [pair.eventId, '2026-12-02T04:00:00Z']);
    const input = await inputFor(pair.eventId, pair.venueId);
    expect((await assess(pair.eventId, input)).outcome).toBe('UNSUITABLE');
    await fixture.pool.query('UPDATE venues SET opens_at=NULL,closes_at=NULL WHERE id=$1', [pair.venueId]);
    expect((await assess(pair.eventId, input)).outcome).toBe('SUITABLE');
  });

  it('returns NEEDS_REVIEW for missing data or unconfirmed interpretation instead of asserting suitability', async () => {
    const pair = await setup();
    let input = await inputFor(pair.eventId, pair.venueId);
    expect((await assess(pair.eventId, { ...input, requirementsConfirmed: false, facilities: ['Missing stage'] })).outcome).toBe('NEEDS_REVIEW');
    expect((await assess(pair.eventId, { ...input, unresolvedRequirements: 'Check event noise levels' })).outcome).toBe('NEEDS_REVIEW');
    await fixture.pool.query('UPDATE event_requests SET expected_attendance=NULL,starts_at=NULL WHERE id=$1', [pair.eventId]);
    input = await inputFor(pair.eventId, pair.venueId);
    const result = await assess(pair.eventId, input);
    expect(result.outcome).toBe('NEEDS_REVIEW');
    expect(result.checks.filter(check => check.status === 'UNKNOWN').map(check => check.key)).toEqual(['capacity', 'availability']);
  });

  it('KAN-52-AC101 assesses a stored attendance of 0 against capacity and keeps missing attendance distinguishable', async () => {
    const pair = await setup();
    await fixture.pool.query('UPDATE event_requests SET expected_attendance=0 WHERE id=$1', [pair.eventId]);
    const context = await getVenueSuitabilityContext(fixture.dependencies, { actor: coordinator, eventId: pair.eventId });
    expect(context.event.expectedAttendance).toBe(0);
    const zero = await assess(pair.eventId, await inputFor(pair.eventId, pair.venueId));
    expect(zero.outcome).toBe('SUITABLE');
    expect(zero.checks.find(check => check.key === 'capacity'))
      .toEqual({ key: 'capacity', status: 'PASS', message: 'Expected attendance (0) fits the venue capacity (50).' });

    // Other requirements still decide the outcome: a conflicting approved booking makes 0 unsuitable.
    await addBooking(pair, 'APPROVED');
    const booked = await assess(pair.eventId, await inputFor(pair.eventId, pair.venueId));
    expect(booked.outcome).toBe('UNSUITABLE');
    expect(booked.checks.find(check => check.key === 'capacity')?.status).toBe('PASS');

    await fixture.pool.query('UPDATE event_requests SET expected_attendance=NULL WHERE id=$1', [pair.eventId]);
    const missing = await assess(pair.eventId, await inputFor(pair.eventId, pair.venueId));
    expect(missing.checks.find(check => check.key === 'capacity')?.status).toBe('UNKNOWN');
    expect(missing.checks.find(check => check.key === 'capacity')?.message).toContain('no expected attendance');
  });

  it('returns an empty active catalogue normally when no venue is active', async () => {
    const pair = await setup();
    await fixture.pool.query('UPDATE venues SET is_active=false');
    const result = await getVenueSuitabilityContext(fixture.dependencies, { actor: coordinator, eventId: pair.eventId });
    expect(result.venues).toEqual([]);
  });

  it('treats PostgreSQL infinite timestamps as missing timing instead of throwing or claiming suitability', async () => {
    const pair = await setup();
    await fixture.pool.query("UPDATE event_requests SET ends_at='infinity'::timestamptz WHERE id=$1", [pair.eventId]);
    const context = await getVenueSuitabilityContext(fixture.dependencies, { actor: coordinator, eventId: pair.eventId });
    expect(context.event.endsAt).toBeNull();
    const result = await assess(pair.eventId, await inputFor(pair.eventId, pair.venueId));
    expect(result.outcome).toBe('NEEDS_REVIEW');
    expect(result.checks.find(check => check.key === 'availability')?.status).toBe('UNKNOWN');
  });

  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'denies direct service reads to %s', async role => {
      const pair = await setup();
      const input = await inputFor(pair.eventId, pair.venueId);
      const actor = await fixture.createUser(role);
      await expect(getVenueSuitabilityContext(fixture.dependencies, { actor, eventId: pair.eventId }))
        .rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      await expect(assess(pair.eventId, input, actor)).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
    },
  );

  it('hides draft, unrelated, unassigned and missing events before disclosing venue or freshness information', async () => {
    const own = await setup();
    const input = await inputFor(own.eventId, own.venueId);
    const hidden = [await setup({ status: 'DRAFT' }), await setup({ coordinatorId: otherCoordinator.id }),
      await setup({ coordinatorId: null }), { eventId: randomUUID() }];
    for (const pair of hidden) {
      await expect(getVenueSuitabilityContext(fixture.dependencies, { actor: coordinator, eventId: pair.eventId }))
        .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
      await expect(assess(pair.eventId, { ...input, venueId: randomUUID() }))
        .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
    await expect(assess(own.eventId, { ...input, venueId: randomUUID() }))
      .rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
  });

  it('rechecks the current assignment on assessment after context was loaded', async () => {
    const pair = await setup();
    const input = await inputFor(pair.eventId, pair.venueId);
    await fixture.pool.query('UPDATE event_requests SET coordinator_id=$2 WHERE id=$1', [pair.eventId, otherCoordinator.id]);
    await expect(assess(pair.eventId, input)).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });
});

describe('KAN-52 running app cookie authentication and mapped authorisation', () => {
  it('mounts read-only context/assessment with verified profiles, not caller role or event-data overrides', async () => {
    const tokens = new Map<string, string>();
    const app = createRuntimeApp({ pool: fixture.pool, supabaseAuth: {
      async verifyAccessToken(token) {
        const uid = tokens.get(token);
        if (!uid) throw Object.assign(new Error('Invalid fixture token'), { code: 'ERR_JWT_INVALID' });
        return { uid, exp: Math.floor(Date.now() / 1000) + 3600 };
      },
    } });
    async function signIn(actor: WorkflowActor) {
      const uid = randomUUID();
      const token = randomUUID();
      tokens.set(token, uid);
      await fixture.pool.query('UPDATE app_users SET supabase_user_id=$2 WHERE id=$1', [actor.id, uid]);
      const session = request.agent(app);
      const login = await session.post('/api/auth/login').send({ accessToken: token });
      expect(login.status).toBe(200);
      expect(login.body.user.id).toBe(actor.id);
      return session;
    }
    const pair = await setup();
    const path = `/api/events/${pair.eventId}/venue-suitability`;
    const input = await inputFor(pair.eventId, pair.venueId);
    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).post(path).send(input)).status).toBe(401);
    expect((await request(app).get(path).set('Cookie', 'connectsphere_session=untrusted')).status).toBe(401);
    for (const role of ['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] satisfies UserRole[]) {
      const session = await signIn(await fixture.createUser(role));
      expect((await session.get(path).set('X-Role', 'EVENT_COORDINATOR')).status).toBe(403);
      expect((await session.post(path).send(input)).status).toBe(403);
    }
    const unrelated = await signIn(otherCoordinator);
    expect((await unrelated.get(path)).status).toBe(404);
    expect((await unrelated.post(path).send(input)).status).toBe(404);
    const own = await signIn(coordinator);
    const context = await own.get(path);
    expect(context.status).toBe(200);
    expect(context.headers['cache-control']).toBe('no-store');
    expect(context.body.requirementsVersion).toBe(input.requirementsVersion);
    const result = await own.post(path).send(input);
    expect(result.status).toBe(200);
    expect(result.body.assessment.outcome).toBe('SUITABLE');
    expect((await own.post(path).send({ ...input, expectedAttendance: 1 })).status).toBe(400);
    await fixture.pool.query('UPDATE event_requests SET venue_requirements=$2 WHERE id=$1', [pair.eventId, 'Current changed needs']);
    const stale = await own.post(path).send(input);
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('SUITABILITY_CONTEXT_CHANGED');
  });
});
