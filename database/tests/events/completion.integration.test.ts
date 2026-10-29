import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let otherOrganiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;
let technical: WorkflowActor;
let attendee: WorkflowActor;
const past = { startsAt: '2020-01-12T02:00:00.000Z', endsAt: '2020-01-12T06:00:00.000Z' };
const future = { startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T06:00:00.000Z' };

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Olivia Organiser');
  otherOrganiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR', 'Casey Coordinator');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
  technical = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
  attendee = await fixture.createUser('ATTENDEE');
});
afterAll(async () => { await fixture?.destroy(); });

function app(actor: WorkflowActor | null = coordinator) {
  // Only identity verification and the fixture-only assignment policy are substituted; the service,
  // transaction, triggers and guards are real PostgreSQL.
  const authenticate = async () => actor as never;
  const assigned = (who: { id: string }, found: { coordinatorId: string | null }) => who.id === found.coordinatorId;
  return createApp({ database: fixture.pool, workspace: { pool: fixture.pool, authenticate: async () => actor },
    submittedRequests: { pool: fixture.pool, authenticate, canViewRequest: assigned as never, canReviewRequest: assigned as never } });
}
/** Equipment can only be reserved while an event is APPROVED, so confirm it after its lines exist. */
const confirm = (id: string) => fixture.pool.query(`UPDATE event_requests SET status='CONFIRMED' WHERE id=$1`, [id]);
const event = (options: { status?: 'CONFIRMED' | 'APPROVED' | 'SUBMITTED' | 'CANCELLED' | 'REJECTED' | 'DRAFT' | 'COMPLETED'; times?: typeof past; owner?: WorkflowActor | null } = {}) =>
  fixture.createEvent({ organiserId: organiser.id, coordinatorId: options.owner === undefined ? coordinator.id : options.owner?.id ?? null,
    status: options.status ?? 'CONFIRMED', ...(options.times ?? past), name: `Completion ${randomUUID()}` });
const complete = (id: string, actor: WorkflowActor | null = coordinator) => request(app(actor)).post(`/api/events/${id}/complete`);

async function equipmentType(total = 10) {
  const id = randomUUID();
  await fixture.pool.query('INSERT INTO equipment_types(id,name,total_quantity) VALUES($1,$2,$3)', [id, `EQ ${id}`, total]);
  return id;
}
async function equipmentLine(eventId: string, typeId: string, quantity: number, status: 'RESERVED' | 'REQUESTED' | 'REJECTED' = 'RESERVED', times = past) {
  const id = randomUUID();
  const decided = status !== 'REQUESTED';
  await fixture.pool.query(`INSERT INTO equipment_requests(id,event_request_id,equipment_type_id,requested_by,quantity,starts_at,ends_at,status,decided_by,decided_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, eventId, typeId, coordinator.id, quantity, times.startsAt, times.endsAt, status,
    decided ? technical.id : null, decided ? new Date() : null]);
  return id;
}
const line = async (id: string) => (await fixture.pool.query('SELECT * FROM equipment_requests WHERE id=$1', [id])).rows[0];
const completedNotices = async (eventId: string) => (await fixture.pool.query(
  `SELECT recipient_id, message FROM notifications WHERE event_request_id=$1 AND type='EVENT_COMPLETED' ORDER BY recipient_id`, [eventId])).rows;
async function snapshot(eventId: string) {
  return { event: await fixture.eventRow(eventId), history: await fixture.history(eventId),
    lines: (await fixture.pool.query('SELECT * FROM equipment_requests WHERE event_request_id=$1 ORDER BY id', [eventId])).rows,
    notices: await fixture.notifications(eventId) };
}

describe('KAN-10 completing an event against real PostgreSQL', () => {
  it('KAN-10-AC2 moves an ended CONFIRMED event to COMPLETED, recording the correct event, actor and time', async () => {
    const id = await event();
    const other = await event();
    const before = Date.now();
    const response = await complete(id);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.completion).toMatchObject({ eventRequestId: id, status: 'COMPLETED', completedById: coordinator.id,
      completedByName: 'Casey Coordinator', releasedEquipmentRequests: 0 });
    expect(Date.parse(response.body.completion.completedAt)).toBeGreaterThanOrEqual(before - 1000);
    expect(await fixture.eventRow(id)).toMatchObject({ status: 'COMPLETED' });
    expect((await fixture.history(id)).at(-1)).toEqual({ from_status: 'CONFIRMED', to_status: 'COMPLETED', changed_by: coordinator.id });
    expect((await fixture.eventRow(other)).status).toBe('CONFIRMED');
    expect((await fixture.history(other)).map(item => item.to_status)).not.toContain('COMPLETED');
  });

  it('KAN-10-AC3 keeps COMPLETED after a refresh for the organiser and the coordinator, and shows it to nobody else', async () => {
    const id = await event();
    await complete(id).expect(200);
    for (const actor of [organiser, coordinator]) {
      const detail = await request(app(actor)).get(`/api/events/${id}`).expect(200);
      expect(detail.body.status).toBe('COMPLETED');
    }
    const read = async (actor: WorkflowActor) => (await request(app(actor)).get(`/api/events/${id}/completion`).expect(200)).body.completion;
    expect(await read(organiser)).toMatchObject({ eventRequestId: id, status: 'COMPLETED', completedByName: 'Casey Coordinator' });
    expect(await read(coordinator)).toMatchObject({ completedById: coordinator.id });
    expect(await read(otherOrganiser)).toBeNull();
    expect(await read(otherCoordinator)).toBeNull();
    expect((await request(app(otherOrganiser)).get(`/api/events/${id}`)).status).toBe(404);
  });

  it('KAN-10-AC3 reports no completion for an event that is not completed', async () => {
    const id = await event();
    expect((await request(app()).get(`/api/events/${id}/completion`).expect(200)).body.completion).toBeNull();
  });

  it('KAN-10-AC4/AC102 releases only this event\'s reserved equipment, once, and leaves other events and lines alone', async () => {
    const type = await equipmentType();
    const id = await event({ status: 'APPROVED' });
    const other = await event({ status: 'APPROVED' });
    const reservedOne = await equipmentLine(id, type, 3);
    const reservedTwo = await equipmentLine(id, type, 2);
    const requested = await equipmentLine(id, type, 1, 'REQUESTED');
    const rejected = await equipmentLine(id, type, 1, 'REJECTED');
    const othersReserved = await equipmentLine(other, type, 4);
    await confirm(id); await confirm(other);
    const response = await complete(id);
    expect(response.body.completion.releasedEquipmentRequests).toBe(2);
    for (const released of [reservedOne, reservedTwo]) {
      expect(await line(released)).toMatchObject({ status: 'CANCELLED', release_cause: 'EVENT_COMPLETED', release_reason: 'Event completed.', released_by: coordinator.id });
      expect((await line(released)).released_at).toBeInstanceOf(Date);
    }
    expect(await line(requested)).toMatchObject({ status: 'REQUESTED', release_cause: null });
    expect(await line(rejected)).toMatchObject({ status: 'REJECTED', release_cause: null });
    expect(await line(othersReserved)).toMatchObject({ status: 'RESERVED', release_cause: null });
    const firstRelease = (await line(reservedOne)).released_at;
    expect((await complete(id)).status).toBe(409);
    expect((await line(reservedOne)).released_at).toEqual(firstRelease);
    expect(await line(othersReserved)).toMatchObject({ status: 'RESERVED' });
    expect((await request(app(coordinator)).get(`/api/events/${id}/completion`)).body.completion.releasedEquipmentRequests).toBe(2);
  });

  it('KAN-10-AC102 returns the released stock to other events', async () => {
    const type = await equipmentType(5);
    const id = await event({ status: 'APPROVED' });
    await equipmentLine(id, type, 5);
    await confirm(id);
    const free = async () => (await fixture.pool.query(
      `SELECT 5 - COALESCE(sum(quantity),0) AS free FROM equipment_requests WHERE equipment_type_id=$1 AND status='RESERVED'`, [type])).rows[0].free;
    expect(Number(await free())).toBe(0);
    await complete(id).expect(200);
    expect(Number(await free())).toBe(5);
  });

  it('KAN-10-AC102 keeps registrations and venue bookings readable and unchanged', async () => {
    const id = await event();
    const venueId = randomUUID();
    await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)', [venueId, `Venue ${venueId}`]);
    const bookingId = randomUUID();
    await fixture.pool.query(`INSERT INTO venue_bookings(id,event_request_id,venue_id,requested_by,starts_at,ends_at,status,decided_by,decided_at)
      VALUES($1,$2,$3,$4,$5,$6,'APPROVED',$4,now())`, [bookingId, id, venueId, coordinator.id, past.startsAt, past.endsAt]);
    const registrationId = randomUUID();
    await fixture.pool.query('INSERT INTO event_registrations(id,event_request_id,attendee_id) VALUES($1,$2,$3)', [registrationId, id, attendee.id]);
    await complete(id).expect(200);
    expect((await fixture.pool.query('SELECT status FROM venue_bookings WHERE id=$1', [bookingId])).rows[0].status).toBe('APPROVED');
    expect((await fixture.pool.query('SELECT status FROM event_registrations WHERE id=$1', [registrationId])).rows[0].status).toBe('REGISTERED');
    const bookings = await request(app(coordinator)).get(`/api/venue-bookings?eventRequestId=${id}`).expect(200);
    expect(bookings.body.items.map((item: { id: string }) => item.id)).toEqual([bookingId]);
  });

  it('KAN-10-AC101 refuses an event that has not ended yet, by the database clock, and changes nothing', async () => {
    const type = await equipmentType();
    const id = await event({ status: 'APPROVED', times: future });
    await equipmentLine(id, type, 2, 'RESERVED', future);
    await confirm(id);
    const before = await snapshot(id);
    const response = await complete(id);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EVENT_NOT_ENDED');
    expect(await snapshot(id)).toEqual(before);
  });

  it('KAN-10-AC101 decides ended-or-not at the end instant itself, not by the page or the caller', async () => {
    const justOver = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'CONFIRMED',
      startsAt: new Date(Date.now() - 3_600_000).toISOString(), endsAt: new Date(Date.now() - 2_000).toISOString() });
    const justBefore = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'CONFIRMED',
      startsAt: new Date(Date.now() - 3_600_000).toISOString(), endsAt: new Date(Date.now() + 120_000).toISOString() });
    expect((await complete(justOver)).status).toBe(200);
    expect((await complete(justBefore)).body.error.code).toBe('EVENT_NOT_ENDED');
    expect((await fixture.eventRow(justBefore)).status).toBe('CONFIRMED');
  });

  it('TC-06-15 refuses just before the end instant and accepts once it has passed, by the database clock', async () => {
    const ends = new Date(Date.now() + 2_500);
    const id = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'CONFIRMED',
      startsAt: new Date(Date.now() - 3_600_000).toISOString(), endsAt: ends.toISOString() });
    const before = await complete(id);
    expect(before.status).toBe(409);
    expect(before.body.error.code).toBe('EVENT_NOT_ENDED');
    expect((await fixture.eventRow(id)).status).toBe('CONFIRMED');
    await new Promise(resolve => setTimeout(resolve, Math.max(0, ends.getTime() - Date.now()) + 300));
    const after = await complete(id);
    expect(after.status).toBe(200);
    expect(after.body.completion.status).toBe('COMPLETED');
    expect((await fixture.history(id)).filter(item => item.to_status === 'COMPLETED')).toHaveLength(1);
  });

  it.each(['APPROVED', 'SUBMITTED', 'CANCELLED', 'REJECTED'] as const)('KAN-10-AC5 refuses a %s event and leaves it and its reservations unchanged', async status => {
    const id = await event({ status });
    const before = await snapshot(id);
    const response = await complete(id);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EVENT_NOT_COMPLETABLE');
    expect(await snapshot(id)).toEqual(before);
  });

  it('KAN-10-AC5 treats a draft as not found and a completed event as already completed', async () => {
    const draft = await event({ status: 'DRAFT' });
    expect((await complete(draft)).status).toBe(404);
    const done = await event({ status: 'COMPLETED' });
    const before = await snapshot(done);
    expect((await complete(done)).body.error.code).toBe('EVENT_ALREADY_COMPLETED');
    expect(await snapshot(done)).toEqual(before);
  });

  it('KAN-10-AC1/AC101 lets only the currently assigned coordinator complete the event', async () => {
    const type = await equipmentType();
    const id = await event({ status: 'APPROVED' });
    await equipmentLine(id, type, 2);
    await confirm(id);
    const before = await snapshot(id);
    expect((await complete(id, otherCoordinator)).status).toBe(404);
    const unassigned = await event({ owner: null });
    expect((await complete(unassigned)).status).toBe(404);
    expect(await snapshot(id)).toEqual(before);
    const lead = await fixture.createUser('EVENT_COORDINATOR_LEAD');
    for (const other of [organiser, lead, technical, attendee, await fixture.createUser('VENUE_STAFF')]) {
      expect((await complete(id, other)).status).toBe(403);
    }
    expect((await complete(id, null)).status).toBe(401);
    expect(await snapshot(id)).toEqual(before);
  });

  it('KAN-10-AC101 removes a coordinator who was reassigned away or whose role changed before the write', async () => {
    const id = await event();
    await fixture.pool.query('UPDATE event_requests SET coordinator_id=$2 WHERE id=$1', [id, otherCoordinator.id]);
    expect((await complete(id)).status).toBe(404);
    const demoted = await fixture.createUser('EVENT_COORDINATOR');
    const own = await event({ owner: demoted });
    await fixture.pool.query(`UPDATE app_users SET role='ATTENDEE' WHERE id=$1`, [demoted.id]);
    expect((await complete(own, demoted)).status).toBe(404);
    expect((await fixture.eventRow(own)).status).toBe('CONFIRMED');
  });

  it('KAN-10-AC103 lets exactly one of two simultaneous completions win, with one release and one set of notices', async () => {
    const type = await equipmentType();
    const id = await event({ status: 'APPROVED' });
    const reserved = await equipmentLine(id, type, 3);
    await confirm(id);
    const other = await event();
    const results = await Promise.all([complete(id), complete(id)]);
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect((await fixture.history(id)).filter(item => item.to_status === 'COMPLETED')).toHaveLength(1);
    expect((await line(reserved)).release_cause).toBe('EVENT_COMPLETED');
    expect(await completedNotices(id)).toHaveLength(2);
    expect((await fixture.eventRow(other)).status).toBe('CONFIRMED');
    // TC-06-18: a retry after the race changes nothing further
    const afterRace = await snapshot(id);
    expect((await complete(id)).status).toBe(409);
    expect(await snapshot(id)).toEqual(afterRace);
    expect(await completedNotices(id)).toHaveLength(2);
  });

  it('KAN-10-AC103 tells the organiser and acknowledges the coordinator once each, and nobody else', async () => {
    const id = await event();
    await complete(id).expect(200);
    await complete(id).expect(409);
    const notices = await completedNotices(id);
    expect(notices.map(item => item.recipient_id).sort()).toEqual([organiser.id, coordinator.id].sort());
    expect(notices.find(item => item.recipient_id === organiser.id)?.message).toContain('Registration is now closed');
    expect(notices.find(item => item.recipient_id === coordinator.id)?.message).toContain('equipment reservations were released');
    const inbox = await request(app(organiser)).get('/api/notifications').expect(200);
    expect(inbox.body.items.find((item: { type: string }) => item.type === 'EVENT_COMPLETED')).toMatchObject({ event: { id }, link: `/events/${id}` });
    const coordinatorInbox = await request(app(coordinator)).get('/api/notifications').expect(200);
    expect(coordinatorInbox.body.items.find((item: { type: string }) => item.type === 'EVENT_COMPLETED')).toMatchObject({ link: `/reviews/${id}` });
    expect((await fixture.pool.query(`SELECT 1 FROM notifications WHERE type='EVENT_COMPLETED' AND recipient_id IN ($1,$2)`, [otherOrganiser.id, attendee.id])).rows).toEqual([]);
  });

  it('rolls the status, the equipment release and the history back if a notice cannot be written', async () => {
    const type = await equipmentType();
    const id = await event({ status: 'APPROVED' });
    const reserved = await equipmentLine(id, type, 3);
    await confirm(id);
    const before = await snapshot(id);
    await fixture.pool.query(`CREATE FUNCTION completion_notice_fails() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.type = 'EVENT_COMPLETED' THEN RAISE EXCEPTION 'notice failed'; END IF; RETURN NEW; END $$`);
    await fixture.pool.query('CREATE TRIGGER completion_notice_fails BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION completion_notice_fails()');
    try {
      expect((await complete(id)).status).toBe(500);
    } finally {
      await fixture.pool.query('DROP TRIGGER completion_notice_fails ON notifications');
      await fixture.pool.query('DROP FUNCTION completion_notice_fails()');
    }
    expect(await snapshot(id)).toEqual(before);
    expect((await line(reserved)).status).toBe('RESERVED');
  });

  it('rejects a malformed event id', async () => {
    expect((await request(app()).post('/api/events/not-a-uuid/complete')).body.error.code).toBe('INVALID_EVENT_REQUEST_ID');
  });

  it.each(['EVENT_ORGANISER', 'ATTENDEE', 'TECHNICAL_SUPPORT_STAFF'] as UserRole[])('does not let %s read another person\'s completion', async role => {
    const id = await event();
    await complete(id).expect(200);
    const stranger = await fixture.createUser(role);
    const response = await request(app(stranger)).get(`/api/events/${id}/completion`);
    expect(response.status === 403 || (response.status === 200 && response.body.completion === null)).toBe(true);
  });
});
