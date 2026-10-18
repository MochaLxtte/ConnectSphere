import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
let staff: WorkflowActor;
let lead: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
  // KAN-79 Lead allocation only accepts available coordinators.
  await fixture.pool.query('UPDATE app_users SET coordinator_available = true WHERE id = $1', [coordinator.id]);
  staff = await fixture.createUser('VENUE_STAFF');
  lead = await fixture.createUser('EVENT_COORDINATOR_LEAD');
});
afterAll(async () => { await fixture?.destroy(); });

const startsAt = '2027-03-02T02:00:00.000Z';
const endsAt = '2027-03-02T06:00:00.000Z';
const window = { from: '2027-03-01T00:00:00.000Z', to: '2027-03-04T00:00:00.000Z' };

/** Real cookie sessions and database role mapping; only Supabase token verification is injected. */
function runtime() {
  const claims = new Map<string, string>();
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
  return { sessionFor };
}

describe('KAN-79 regression of the connected S2-T23 workflow through the running API (automated stand-in for the hosted walkthrough)', () => {
  it('takes a draft to an approved venue booking with the right effects at each step', async () => {
    const venueId = randomUUID();
    await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,120)', [venueId, `Venue ${venueId}`]);
    const { sessionFor } = runtime();
    const organiserSession = await sessionFor(organiser);
    const coordinatorSession = await sessionFor(coordinator);
    const staffSession = await sessionFor(staff);
    const leadSession = await sessionFor(lead);
    const searchQuery = { startsAt, endsAt, attendance: 60 };
    const foundInSearch = async () => {
      const found = await coordinatorSession.get('/api/venues/search-venues').query(searchQuery);
      expect(found.status).toBe(200);
      return found.body.items.some((item: { id: string }) => item.id === venueId);
    };
    const venueInCalendar = async () => {
      const calendar = await staffSession.get('/api/venues/availability').query(window);
      expect(calendar.status).toBe(200);
      return calendar.body.items.find((item: { id: string }) => item.id === venueId) as
        { unavailable: { startsAt: string; endsAt: string }[] };
    };

    // KAN-79 supersedes KAN-29: submit unassigned, then allocate through the Lead workflow.
    const created = await organiserSession.post('/api/events').send({
      name: 'Connected workflow fair', purpose: 'Sprint 2 walkthrough', startsAt, endsAt,
      expectedAttendance: 60, venueRequirements: 'A hall for 60 people', registrationRequired: false,
    });
    expect(created.status).toBe(201);
    const eventId: string = created.body.id;
    const submitted = await organiserSession.post(`/api/events/${eventId}/submit`).send({});
    expect(submitted.status).toBe(200);
    expect(submitted.body).toMatchObject({ status: 'SUBMITTED', coordinatorId: null });
    expect((await coordinatorSession.get(`/api/events/${eventId}`)).status).toBe(404);
    const allocated = await leadSession.put(`/api/events/${eventId}/coordinator`).send({ coordinatorId: coordinator.id });
    expect(allocated.status).toBe(200);
    expect((await fixture.eventRow(eventId)).coordinator_id).toBe(coordinator.id);

    // The organiser and venue staff cannot use coordinator venue search; the assigned coordinator can.
    expect((await organiserSession.get('/api/venues/search-venues')).status).toBe(403);
    expect((await staffSession.get('/api/venues/search-venues')).status).toBe(403);
    expect(await foundInSearch()).toBe(true);

    // Approving a booking needs an approved event (KAN-8), so the coordinator approves the event first (KAN-36).
    const bookingPath = `/api/events/${eventId}/venue-bookings`;
    const body = { venueId, startsAt, endsAt, layout: 'Theatre', notes: 'Projector needed' };
    const approvedEvent = await coordinatorSession.post(`/api/events/${eventId}/reviews`).send({ decision: 'APPROVED' });
    expect(approvedEvent.status).toBe(201);

    // KAN-53: the request is saved as pending and does not reserve the venue or change the event.
    const requested = await coordinatorSession.post(bookingPath).send(body);
    expect(requested.status).toBe(201);
    const booking = requested.body.booking;
    expect(booking).toMatchObject({ status: 'PENDING', venueId, eventRequestId: eventId, decidedBy: null });
    expect((await venueInCalendar()).unavailable).toEqual([]);
    expect(await foundInSearch()).toBe(true);
    expect((await fixture.eventRow(eventId))?.status).toBe('APPROVED');

    // KAN-8: venue staff see it in their queue and approve it once.
    const queue = await staffSession.get('/api/venue-bookings').query({ eventRequestId: eventId });
    expect(queue.body.items.map((item: { id: string }) => item.id)).toEqual([booking.id]);
    const decided = await staffSession.post(`/api/venue-bookings/${booking.id}/decision`).send({ decision: 'APPROVED' });
    expect(decided.status).toBe(200);
    expect(decided.body.booking).toMatchObject({ status: 'APPROVED', decidedBy: staff.id });

    // The coordinator sees the outcome; the event is unchanged; the calendar and search now show it booked.
    const outcome = await coordinatorSession.get(`/api/venue-bookings/${booking.id}`);
    expect(outcome.body.booking).toEqual(decided.body.booking);
    expect((await fixture.eventRow(eventId))?.status).toBe('APPROVED');
    const calendarVenue = await venueInCalendar();
    expect(calendarVenue.unavailable).toHaveLength(1);
    expect(calendarVenue.unavailable[0]).toMatchObject({ startsAt, endsAt });
    expect(await foundInSearch()).toBe(false);

    // KAN-54: a second request for the same period is refused and nothing is created.
    const second = await coordinatorSession.post(bookingPath).send(body);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('VENUE_BOOKING_CONFLICT');
    const rows = await fixture.pool.query('SELECT status FROM venue_bookings WHERE event_request_id=$1', [eventId]);
    expect(rows.rows).toEqual([{ status: 'APPROVED' }]);
  });
});
