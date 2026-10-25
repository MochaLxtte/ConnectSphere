import { randomBytes, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import { assignCoordinator, reassignCoordinator } from '../../../backend/src/modules/events/assignment.js';
import { requestClarification, respondToClarification } from '../../../backend/src/modules/events/clarifications.js';
import { isAssignedCoordinator } from '../../../backend/src/modules/events/coordinator-access.js';
import { recordInitialReview } from '../../../backend/src/modules/events/review-decision.js';
import { submitEventRequest } from '../../../backend/src/modules/events/submit-request.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { recordNotifications, type NotificationInput } from '../../../backend/src/modules/notifications/notify.js';
import { REASSIGNED_AWAY_MESSAGE } from '../../../backend/src/modules/notifications/trigger-matrix.js';
import { createVenueBooking, decideVenueBooking } from '../../../backend/src/modules/venues/booking-service.js';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';

type Profile = WorkflowActor & { uid: string };
interface Item {
  id: string; type: string; title: string; message: string; read: boolean; readAt: string | null;
  event: { id: string; name: string | null } | null; booking: { id: string } | null; link: string | null;
}

const supabaseUrl = 'https://kan64-auth.example.test';
const secret = randomBytes(32).toString('hex');
const signingKey = new TextEncoder().encode(secret);
let fixture: WorkflowFixture;
let app: ReturnType<typeof createRuntimeApp>;
let organiser: Profile;
let otherOrganiser: Profile;
let lead: Profile;
let alex: Profile;
let blair: Profile;
let staff: Profile;
let otherStaff: Profile;

async function profile(role: UserRole, name: string = role): Promise<Profile> {
  const actor = await fixture.createUser(role, name);
  const uid = randomUUID();
  await fixture.pool.query('UPDATE app_users SET supabase_user_id=$1, coordinator_available=$2 WHERE id=$3',
    [uid, role === 'EVENT_COORDINATOR', actor.id]);
  return { ...actor, uid };
}

beforeAll(async () => {
  vi.stubEnv('SUPABASE_URL', supabaseUrl);
  vi.stubEnv('SUPABASE_JWT_SECRET', secret);
  fixture = await createWorkflowFixture();
  organiser = await profile('EVENT_ORGANISER', 'Olive');
  otherOrganiser = await profile('EVENT_ORGANISER', 'Other organiser');
  lead = await profile('EVENT_COORDINATOR_LEAD', 'Lead');
  alex = await profile('EVENT_COORDINATOR', 'Alex');
  blair = await profile('EVENT_COORDINATOR', 'Blair');
  staff = await profile('VENUE_STAFF', 'Venue staff');
  otherStaff = await profile('VENUE_STAFF', 'Other staff');
  app = createRuntimeApp({ pool: fixture.pool, isProduction: false });
});
afterAll(async () => {
  try { await fixture?.destroy(); } finally { vi.unstubAllEnvs(); }
});

async function login(actor: Profile) {
  const token = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' })
    .setIssuer(`${supabaseUrl}/auth/v1`).setSubject(actor.uid).setIssuedAt().setExpirationTime('1h').sign(signingKey);
  const session = request.agent(app);
  expect((await session.post('/api/auth/login').send({ accessToken: token })).status).toBe(200);
  return session;
}

const inbox = async (actor: Profile): Promise<Item[]> => (await (await login(actor)).get('/api/notifications')).body.items;
const unread = async (actor: Profile): Promise<number> => (await (await login(actor)).get('/api/notifications/unread-count')).body.unreadCount;
const kinds = (items: Item[]) => items.map((item) => item.type).sort();
const rowsFor = async (eventId: string) =>
  (await fixture.notifications(eventId)).map((row) => [row.type, row.recipient_id] as const).sort();
const count = async () => (await fixture.pool.query<{ n: number }>('SELECT count(*)::int AS n FROM notifications')).rows[0]!.n;
const review = (eventRequestId: string, reviewer: WorkflowActor, input: unknown) =>
  recordInitialReview({ pool: fixture.pool, canReviewRequest: isAssignedCoordinator }, { eventRequestId, reviewer, input });

describe('KAN-64 one event through the whole workflow (AC201–AC203, AC205, AC208)', () => {
  const journey = {} as { eventId: string; bookingId: string; venueId: string };

  it('acknowledges the organiser\'s submission, and only the organiser sees it', async () => {
    journey.eventId = await fixture.createEvent({ organiserId: organiser.id, status: 'DRAFT', name: 'Career fair' });
    await submitEventRequest(fixture.dependencies, { eventRequestId: journey.eventId, actor: organiser });

    expect(await rowsFor(journey.eventId)).toEqual([['REQUEST_SUBMITTED', organiser.id]]);
    const [own, ...rest] = await inbox(organiser);
    expect(rest).toEqual([]);
    expect(own).toMatchObject({
      type: 'REQUEST_SUBMITTED', read: false, readAt: null, link: `/events/${journey.eventId}`,
      event: { id: journey.eventId, name: 'Career fair' }, booking: null,
      message: 'Your event request “Career fair” was submitted. It is waiting to be allocated to a coordinator.',
    });
    expect(await inbox(otherOrganiser)).toEqual([]);
    expect(await inbox(alex)).toEqual([]);
  });

  it('tells the organiser and the new coordinator about the allocation, not the Lead who made it', async () => {
    await assignCoordinator(fixture.dependencies, {
      eventRequestId: journey.eventId, actor: lead, input: { coordinatorId: alex.id, note: 'Initial owner' },
    });
    expect(kinds(await inbox(organiser))).toEqual(['COORDINATOR_ASSIGNED', 'REQUEST_SUBMITTED']);
    const [assigned] = await inbox(alex);
    expect(assigned).toMatchObject({
      type: 'COORDINATOR_ASSIGNED', title: 'Event request assigned to you', link: `/reviews/${journey.eventId}`,
      event: { id: journey.eventId, name: 'Career fair' },
    });
    expect(await inbox(lead)).toEqual([]);
    expect(await inbox(blair)).toEqual([]);
  });

  it('sends the clarification request, then the decision with its reason, to the organiser only', async () => {
    const asked = await requestClarification(fixture.dependencies, {
      eventRequestId: journey.eventId, actor: alex, input: { message: 'Which hall do you need?' },
    });
    await respondToClarification(fixture.dependencies, {
      eventRequestId: journey.eventId, clarificationId: asked.clarificationId, actor: organiser, input: { response: 'The main hall.' },
    });
    await review(journey.eventId, alex, { decision: 'APPROVED', reason: 'Fits the programme' });

    const organiserItems = await inbox(organiser);
    expect(kinds(organiserItems)).toEqual(
      ['CLARIFICATION_REQUESTED', 'COORDINATOR_ASSIGNED', 'REQUEST_SUBMITTED', 'REVIEW_APPROVED']);
    expect(organiserItems.find((item) => item.type === 'CLARIFICATION_REQUESTED')!.message).toContain('Which hall do you need?');
    expect(organiserItems.find((item) => item.type === 'REVIEW_APPROVED')!.message)
      .toBe('Your event request “Career fair” was approved. Reason: Fits the programme.');
    // The coordinator took the actions and is not a recipient of them (AC201 names the organiser only).
    expect(kinds(await inbox(alex))).toEqual(['COORDINATOR_ASSIGNED']);
  });

  it('notifies the organiser, the current coordinator and the deciding staff member of a booking decision', async () => {
    journey.venueId = randomUUID();
    await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)', [journey.venueId, 'Harbour Hall']);
    const booking = await createVenueBooking(fixture.dependencies, { eventRequestId: journey.eventId, actor: alex, input: {
      venueId: journey.venueId, startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T04:00:00.000Z', layout: 'Theatre', notes: null,
    } });
    journey.bookingId = booking.id;
    expect(kinds(await inbox(staff))).toEqual([]);

    await decideVenueBooking(fixture.dependencies, { bookingId: booking.id, actor: staff, input: { decision: 'APPROVED' } });

    expect((await rowsFor(journey.eventId)).filter(([type]) => type === 'VENUE_BOOKING_APPROVED')).toEqual([
      ['VENUE_BOOKING_APPROVED', organiser.id], ['VENUE_BOOKING_APPROVED', alex.id], ['VENUE_BOOKING_APPROVED', staff.id],
    ].sort());
    const [acknowledgement] = await inbox(staff);
    expect(acknowledgement).toMatchObject({
      type: 'VENUE_BOOKING_APPROVED', booking: { id: booking.id }, link: `/venue-bookings/${booking.id}`, event: null,
    });
    expect(acknowledgement!.message.replace(/\s/g, ' ')).toBe('You approved the booking request for “Career fair” at Harbour Hall, '
      + '1 Dec 2026, 10:00 to 1 Dec 2026, 12:00 (Singapore time).');
    const coordinatorItem = (await inbox(alex)).find((item) => item.type === 'VENUE_BOOKING_APPROVED')!;
    expect(coordinatorItem).toMatchObject({ booking: { id: booking.id }, link: `/venue-bookings/${booking.id}` });
    expect(coordinatorItem.message).toContain('Open the booking for details.');
    const organiserItem = (await inbox(organiser)).find((item) => item.type === 'VENUE_BOOKING_APPROVED')!;
    expect(organiserItem).toMatchObject({ link: `/events/${journey.eventId}`, booking: null });
    expect(await inbox(otherStaff)).toEqual([]);
  });

  it('adds nothing for a repeated or refused action (AC207)', async () => {
    const before = await count();
    await expect(decideVenueBooking(fixture.dependencies, { bookingId: journey.bookingId, actor: staff, input: { decision: 'REJECTED' } }))
      .rejects.toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
    await expect(assignCoordinator(fixture.dependencies, { eventRequestId: journey.eventId, actor: lead, input: { coordinatorId: blair.id } }))
      .rejects.toMatchObject({ code: 'COORDINATOR_ALREADY_ASSIGNED' });
    await expect(review(journey.eventId, alex, { decision: 'REJECTED', reason: 'Not suitable' })).rejects.toMatchObject({ code: 'REVIEW_ALREADY_DECIDED' });
    await expect(submitEventRequest(fixture.dependencies, { eventRequestId: journey.eventId, actor: organiser }))
      .rejects.toMatchObject({ code: 'REQUEST_NOT_SUBMITTABLE' });
    expect(await count()).toBe(before);
  });

  it('hides a former coordinator\'s event notices after reassignment but keeps a minimal notice (AC202, AC206)', async () => {
    const current = (await fixture.pool.query<{ id: string }>(
      'SELECT id FROM coordinator_assignments WHERE event_request_id=$1 AND unassigned_at IS NULL', [journey.eventId])).rows[0]!.id;
    const alexSession = await login(alex);
    const earlier = (await alexSession.get('/api/notifications')).body.items as Item[];
    expect(kinds(earlier)).toEqual(['COORDINATOR_ASSIGNED', 'VENUE_BOOKING_APPROVED']);
    const hiddenLater = earlier[0]!.id;
    expect(await unread(alex)).toBe(2);

    const before = await count();
    await reassignCoordinator(fixture.dependencies, { eventRequestId: journey.eventId, actor: lead, input: {
      coordinatorId: blair.id, reason: 'Workload', expectedAssignmentVersion: current,
    } });
    expect(await count()).toBe(before + 3);

    // The previous coordinator keeps only the minimal notice, which names no event and offers no link.
    const afterItems = (await alexSession.get('/api/notifications')).body.items as Item[];
    expect(afterItems).toHaveLength(1);
    expect(afterItems[0]).toMatchObject({
      type: 'COORDINATOR_REASSIGNED_AWAY', message: REASSIGNED_AWAY_MESSAGE, event: null, booking: null, link: null,
    });
    expect(JSON.stringify(afterItems)).not.toContain('Career fair');
    expect(JSON.stringify(afterItems)).not.toContain('Harbour Hall');
    expect(await unread(alex)).toBe(1);
    // A hidden notification can no longer be read or changed, and looks identical to a missing one.
    const hidden = await alexSession.post(`/api/notifications/${hiddenLater}/read`);
    const missing = await alexSession.post(`/api/notifications/${randomUUID()}/read`);
    expect(hidden.status).toBe(404);
    expect(hidden.body).toEqual(missing.body);
    expect((await fixture.pool.query('SELECT read_at FROM notifications WHERE id=$1', [hiddenLater])).rows[0].read_at).toBeNull();

    // The new coordinator and the organiser are told, with current links.
    const [reassigned] = await inbox(blair);
    expect(reassigned).toMatchObject({
      type: 'COORDINATOR_REASSIGNED', title: 'Event request reassigned to you', link: `/reviews/${journey.eventId}`,
    });
    const organiserKinds = kinds(await inbox(organiser));
    expect(organiserKinds).toContain('COORDINATOR_REASSIGNED');
    // The new coordinator did not receive the old coordinator's earlier notices.
    expect(kinds(await inbox(blair))).toEqual(['COORDINATOR_REASSIGNED']);
  });

  it('repeating an unchanged reassignment adds nothing', async () => {
    const current = (await fixture.pool.query<{ id: string }>(
      'SELECT id FROM coordinator_assignments WHERE event_request_id=$1 AND unassigned_at IS NULL', [journey.eventId])).rows[0]!.id;
    const before = await count();
    const result = await reassignCoordinator(fixture.dependencies, { eventRequestId: journey.eventId, actor: lead, input: {
      coordinatorId: blair.id, reason: 'Again', expectedAssignmentVersion: current,
    } });
    expect(result.changed).toBe(false);
    expect(await count()).toBe(before);
  });
});

describe('KAN-64-AC204/AC206 the inbox is private, with read state', () => {
  async function mine() {
    const id = await fixture.createEvent({ organiserId: organiser.id, status: 'DRAFT', name: 'Private event' });
    await submitEventRequest(fixture.dependencies, { eventRequestId: id, actor: organiser });
    return id;
  }

  it('requires a verified session', async () => {
    for (const [method, path] of [['get', '/api/notifications'], ['get', '/api/notifications/unread-count'],
      ['post', '/api/notifications/read-all'], ['post', `/api/notifications/${randomUUID()}/read`]] as const) {
      const response = await request(app)[method](path).send({});
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });

  it('lets another user neither list, count nor mark someone else\'s notification', async () => {
    await mine();
    const [target] = await inbox(organiser);
    const intruder = await login(otherOrganiser);
    expect((await intruder.get('/api/notifications')).body.items).toEqual([]);
    const attempt = await intruder.post(`/api/notifications/${target!.id}/read`);
    expect(attempt.status).toBe(404);
    expect(attempt.body).toEqual((await intruder.post(`/api/notifications/${randomUUID()}/read`)).body);
    expect((await fixture.pool.query('SELECT read_at FROM notifications WHERE id=$1', [target!.id])).rows[0].read_at).toBeNull();
  });

  it('marks one notification read once, keeping its original read time, and updates the count', async () => {
    await mine();
    const session = await login(organiser);
    const before = (await session.get('/api/notifications/unread-count')).body.unreadCount;
    const [target] = (await session.get('/api/notifications')).body.items as Item[];
    const first = await session.post(`/api/notifications/${target!.id}/read`);
    expect(first.status).toBe(200);
    expect(first.body.notification).toMatchObject({ id: target!.id, read: true });
    const readAt = first.body.notification.readAt;
    const second = await session.post(`/api/notifications/${target!.id}/read`);
    expect(second.body.notification.readAt).toBe(readAt);
    expect((await session.get('/api/notifications/unread-count')).body.unreadCount).toBe(before - 1);
  });

  it('marks everything the caller can see as read, and nobody else\'s', async () => {
    await mine();
    const session = await login(organiser);
    const otherBefore = await unread(otherStaff);
    const unreadBefore = (await session.get('/api/notifications/unread-count')).body.unreadCount;
    expect(unreadBefore).toBeGreaterThan(0);
    const result = await session.post('/api/notifications/read-all').send({});
    expect(result.body.updated).toBe(unreadBefore);
    expect((await session.get('/api/notifications/unread-count')).body.unreadCount).toBe(0);
    expect((await session.get('/api/notifications')).body.items.every((item: Item) => item.read)).toBe(true);
    expect((await session.post('/api/notifications/read-all').send({})).body.updated).toBe(0);
    expect(await unread(otherStaff)).toBe(otherBefore);
  });

  it('rejects a malformed notification id', async () => {
    const response = await (await login(organiser)).post('/api/notifications/not-a-uuid/read').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_NOTIFICATION_ID');
  });
});

describe('KAN-64-AC207 persistence is part of the business transaction', () => {
  it('ignores a repeated outcome for the same recipient but keeps distinct recipients', async () => {
    const eventId = await fixture.createEvent({ organiserId: organiser.id, status: 'SUBMITTED' });
    const note = { recipientId: organiser.id, eventRequestId: eventId, type: 'REQUEST_SUBMITTED', title: 'T', message: 'M', dedupeKey: `dup:${eventId}` };
    expect(await recordNotifications(fixture.pool, [note])).toBe(1);
    expect(await recordNotifications(fixture.pool, [note, { ...note, message: 'changed text' }])).toBe(0);
    expect(await recordNotifications(fixture.pool, [{ ...note, recipientId: alex.id }])).toBe(1);
    expect((await fixture.notifications(eventId)).map((row) => row.recipient_id).sort()).toEqual([organiser.id, alex.id].sort());
  });

  it('rolls the whole decision back when its notification cannot be written', async () => {
    const eventId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: alex.id, status: 'SUBMITTED' });
    await fixture.pool.query(`CREATE FUNCTION kan64_block_notification() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.type = 'REVIEW_APPROVED' THEN RAISE EXCEPTION 'blocked for the test'; END IF; RETURN NEW; END $$`);
    await fixture.pool.query(`CREATE TRIGGER kan64_block BEFORE INSERT ON notifications
      FOR EACH ROW EXECUTE FUNCTION kan64_block_notification()`);
    try {
      await expect(review(eventId, alex, { decision: 'APPROVED' })).rejects.toThrow('blocked for the test');
      expect((await fixture.eventRow(eventId)).status).toBe('SUBMITTED');
      expect((await fixture.pool.query('SELECT 1 FROM event_reviews WHERE event_request_id=$1', [eventId])).rowCount).toBe(0);
      expect(await fixture.notifications(eventId)).toEqual([]);
      // A decision whose notification is allowed still commits both together.
      expect((await review(eventId, alex, { decision: 'REJECTED', reason: 'Not suitable' })).decision).toBe('REJECTED');
      expect(await rowsFor(eventId)).toEqual([['REVIEW_REJECTED', organiser.id]]);
    } finally {
      await fixture.pool.query('DROP TRIGGER kan64_block ON notifications');
      await fixture.pool.query('DROP FUNCTION kan64_block_notification()');
    }
  });

  it('rolls an assignment back when its notification cannot be written', async () => {
    const eventId = await fixture.createEvent({ organiserId: organiser.id, status: 'SUBMITTED' });
    await fixture.pool.query(`CREATE FUNCTION kan64_block_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.type = 'COORDINATOR_ASSIGNED' THEN RAISE EXCEPTION 'blocked assignment notice'; END IF; RETURN NEW; END $$`);
    await fixture.pool.query(`CREATE TRIGGER kan64_block_assign BEFORE INSERT ON notifications
      FOR EACH ROW EXECUTE FUNCTION kan64_block_assignment()`);
    try {
      await expect(assignCoordinator(fixture.dependencies, { eventRequestId: eventId, actor: lead, input: { coordinatorId: alex.id } }))
        .rejects.toThrow('blocked assignment notice');
      expect((await fixture.eventRow(eventId)).coordinator_id).toBeNull();
      expect((await fixture.pool.query('SELECT 1 FROM coordinator_assignments WHERE event_request_id=$1', [eventId])).rowCount).toBe(0);
      expect(await fixture.notifications(eventId)).toEqual([]);
    } finally {
      await fixture.pool.query('DROP TRIGGER kan64_block_assign ON notifications');
      await fixture.pool.query('DROP FUNCTION kan64_block_assignment()');
    }
  });
});

describe('KAN-64-AC207/AC208 concurrent delivery and overlapping recipients', () => {
  async function pendingBooking(eventId: string, coordinator: Profile) {
    const venueId = randomUUID();
    await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)', [venueId, `Delivery test hall ${venueId}`]);
    return createVenueBooking(fixture.dependencies, { eventRequestId: eventId, actor: coordinator, input: {
      venueId, startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T04:00:00.000Z', layout: 'Theatre', notes: null,
    } });
  }

  it('TC-20-18 serialises simultaneous writes for one outcome and recipient without duplicate delivery', async () => {
    const eventId = await fixture.createEvent({ organiserId: organiser.id });
    const note = { recipientId: organiser.id, eventRequestId: eventId, type: 'REQUEST_SUBMITTED',
      title: 'Submitted', message: 'Original outcome', dedupeKey: `REQUEST_SUBMITTED:${eventId}` };
    const first = await fixture.pool.connect();
    const second = await fixture.pool.connect();
    let retry: Promise<{ count: number } | { error: unknown }> | undefined;
    try {
      await first.query('BEGIN');
      await second.query('BEGIN');
      const firstPid = (await first.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      const secondPid = (await second.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      expect(await recordNotifications(first, [note])).toBe(1);
      // Hold the first insert uncommitted until PostgreSQL confirms the retry is contending for it.
      // This proves overlap without relying on a timer or the speed of the test machine.
      retry = recordNotifications(second, [{ ...note, message: 'Retry must not replace the original' }])
        .then((written) => ({ count: written }), (error: unknown) => ({ error }));
      await expect.poll(async () => (await fixture.pool.query<{ blockers: number[] }>(
        'SELECT pg_blocking_pids($1) AS blockers', [secondPid])).rows[0]!.blockers,
      { timeout: 3_000 }).toContain(firstPid);
      await first.query('COMMIT');
      expect(await retry).toEqual({ count: 0 });
      await second.query('COMMIT');
      expect(await fixture.notifications(eventId)).toEqual([
        { recipient_id: organiser.id, type: 'REQUEST_SUBMITTED', message: 'Original outcome' },
      ]);
    } finally {
      await first.query('ROLLBACK');
      await retry;
      await second.query('ROLLBACK');
      first.release();
      second.release();
    }
  });

  it('TC-20-18 rolls back a venue decision after notices are inserted, then commits and deduplicates concurrent retries', async () => {
    const eventId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: alex.id, status: 'APPROVED' });
    const booking = await pendingBooking(eventId, alex);
    const readBooking = async () => (await fixture.pool.query('SELECT * FROM venue_bookings WHERE id=$1', [booking.id])).rows[0];
    const beforeBooking = await readBooking();
    const beforeEvent = await fixture.eventRow(eventId);
    // A deferred AFTER trigger fails at COMMIT, after both the decision and all three recipient
    // inserts have happened. The test therefore covers rollback after insertion, not just refusal.
    await fixture.pool.query(`CREATE FUNCTION kan64_fail_venue_commit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.event_request_id = '${eventId}' AND NEW.type = 'VENUE_BOOKING_APPROVED' THEN
          IF (SELECT status FROM venue_bookings WHERE id = NEW.venue_booking_id) <> 'APPROVED'
            OR (SELECT count(*) FROM notifications WHERE event_request_id = NEW.event_request_id
                AND type = 'VENUE_BOOKING_APPROVED') <> 3 THEN
            RAISE EXCEPTION 'decision and all notices must already be written';
          END IF;
          RAISE EXCEPTION 'forced rollback after venue notice insertion';
        END IF;
        RETURN NEW;
      END $$`);
    await fixture.pool.query(`CREATE CONSTRAINT TRIGGER kan64_fail_venue_commit
      AFTER INSERT ON notifications DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION kan64_fail_venue_commit()`);
    try {
      await expect(decideVenueBooking(fixture.dependencies, {
        bookingId: booking.id, actor: staff, input: { decision: 'APPROVED' },
      })).rejects.toThrow('forced rollback after venue notice insertion');
      expect(await readBooking()).toEqual(beforeBooking);
      expect(await fixture.eventRow(eventId)).toEqual(beforeEvent);
      expect(await fixture.notifications(eventId)).toEqual([]);
    } finally {
      await fixture.pool.query('DROP TRIGGER kan64_fail_venue_commit ON notifications');
      await fixture.pool.query('DROP FUNCTION kan64_fail_venue_commit()');
    }

    expect((await decideVenueBooking(fixture.dependencies, {
      bookingId: booking.id, actor: staff, input: { decision: 'APPROVED' },
    })).status).toBe('APPROVED');
    const committedBooking = await readBooking();
    const notes = (await fixture.pool.query<NotificationInput>(`SELECT recipient_id AS "recipientId",
      event_request_id AS "eventRequestId", venue_booking_id AS "venueBookingId", type, title, message,
      dedupe_key AS "dedupeKey" FROM notifications WHERE event_request_id=$1 ORDER BY recipient_id`, [eventId])).rows;
    expect(notes.map((note) => note.recipientId).sort()).toEqual([organiser.id, alex.id, staff.id].sort());
    expect(await Promise.all([
      recordNotifications(fixture.pool, notes), recordNotifications(fixture.pool, notes),
    ])).toEqual([0, 0]);
    await expect(decideVenueBooking(fixture.dependencies, {
      bookingId: booking.id, actor: staff, input: { decision: 'APPROVED' },
    })).rejects.toMatchObject({ code: 'BOOKING_ALREADY_DECIDED' });
    expect(await readBooking()).toEqual(committedBooking);
    expect(await fixture.eventRow(eventId)).toEqual(beforeEvent);
    expect(await rowsFor(eventId)).toEqual([
      ['VENUE_BOOKING_APPROVED', organiser.id], ['VENUE_BOOKING_APPROVED', alex.id], ['VENUE_BOOKING_APPROVED', staff.id],
    ].sort());
  });

  it('TC-20-19 acknowledges the actor and deduplicates overlapping historical-owner/current-coordinator recipients', async () => {
    const owner = await profile('EVENT_ORGANISER', 'Later appointed coordinator');
    const eventId = await fixture.createEvent({ organiserId: owner.id, status: 'DRAFT', name: 'Overlap recipient event' });
    await submitEventRequest(fixture.dependencies, { eventRequestId: eventId, actor: owner });
    expect(await rowsFor(eventId)).toEqual([['REQUEST_SUBMITTED', owner.id]]);
    expect((await inbox(owner)).map((item) => item.type)).toEqual(['REQUEST_SUBMITTED']);

    // Profiles have one current role. A trusted role change can leave the same person owning an
    // older event while now coordinating it; do not fabricate an unsupported multi-role account.
    await fixture.pool.query("UPDATE app_users SET role='EVENT_COORDINATOR', coordinator_available=true WHERE id=$1", [owner.id]);
    const coordinator: Profile = { ...owner, role: 'EVENT_COORDINATOR' };
    await assignCoordinator(fixture.dependencies, { eventRequestId: eventId, actor: lead, input: { coordinatorId: owner.id } });
    expect((await rowsFor(eventId)).filter(([type]) => type === 'COORDINATOR_ASSIGNED'))
      .toEqual([['COORDINATOR_ASSIGNED', owner.id]]);
    expect((await inbox(coordinator)).filter((item) => item.type === 'COORDINATOR_ASSIGNED')).toHaveLength(1);
    await review(eventId, coordinator, { decision: 'APPROVED' });
    const booking = await pendingBooking(eventId, coordinator);
    await decideVenueBooking(fixture.dependencies, { bookingId: booking.id, actor: staff, input: { decision: 'APPROVED' } });
    expect((await rowsFor(eventId)).filter(([type]) => type === 'VENUE_BOOKING_APPROVED')).toEqual([
      ['VENUE_BOOKING_APPROVED', owner.id], ['VENUE_BOOKING_APPROVED', staff.id],
    ].sort());
    const owned = (await inbox(coordinator)).filter((item) => item.type === 'VENUE_BOOKING_APPROVED');
    expect(owned).toHaveLength(1);
    expect(owned[0]).toMatchObject({ event: { id: eventId }, booking: { id: booking.id }, link: `/venue-bookings/${booking.id}` });
    const acknowledgement = (await inbox(staff)).filter((item) => item.booking?.id === booking.id);
    expect(acknowledgement).toHaveLength(1);
    expect(acknowledgement[0]!.message).toContain('You approved');

    const unrelated = await login(otherOrganiser);
    expect((await unrelated.get('/api/notifications')).body.items).toEqual([]);
    expect((await unrelated.get('/api/notifications/unread-count')).body.unreadCount).toBe(0);
    expect((await unrelated.post(`/api/notifications/${owned[0]!.id}/read`)).status).toBe(404);
    expect((await fixture.pool.query('SELECT read_at FROM notifications WHERE id=$1', [owned[0]!.id])).rows[0].read_at).toBeNull();
  });
});
