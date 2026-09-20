import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createChangeRequest, decideChangeRequest, listChangeRequests, withdrawChangeRequest,
} from '../../../backend/src/modules/events/change-requests.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let otherOrganiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Olive');
  otherOrganiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR', 'Casey');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
});
afterAll(async () => { await fixture.destroy(); });

const newEvent = (status: Parameters<WorkflowFixture['createEvent']>[0]['status'] = 'APPROVED') =>
  fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status });

async function propose(eventRequestId: string, proposedChanges: Record<string, unknown>) {
  const created = await createChangeRequest(fixture.dependencies, {
    eventRequestId, actor: organiser, input: { proposedChanges, reason: 'Plans changed.' },
  });
  return created.changeRequestId;
}

describe('CF-19 change request persistence', () => {
  it('stores a pending change, lists it for participants and blocks a second pending change', async () => {
    const eventRequestId = await newEvent();
    const changeRequestId = await propose(eventRequestId, { name: 'Open day 2.0', description: null });

    for (const actor of [organiser, coordinator]) {
      expect(await listChangeRequests(fixture.dependencies, { eventRequestId, actor })).toEqual([
        expect.objectContaining({
          id: changeRequestId, status: 'PENDING', requestedByName: 'Olive', reason: 'Plans changed.',
          proposedChanges: { name: 'Open day 2.0', description: null }, decidedById: null, decidedAt: null,
        }),
      ]);
    }
    for (const actor of [otherOrganiser, otherCoordinator]) {
      await expect(listChangeRequests(fixture.dependencies, { eventRequestId, actor }))
        .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
    expect((await fixture.notifications(eventRequestId)).map((row) => [row.type, row.recipient_id]))
      .toEqual([['CHANGE_REQUEST_SUBMITTED', coordinator.id]]);
    // The event itself is untouched until a decision.
    expect((await fixture.eventRow(eventRequestId)).name).toBe('Open day');

    await expect(propose(eventRequestId, { name: 'Another' }))
      .rejects.toMatchObject({ kind: 'CONFLICT', code: 'CHANGE_REQUEST_ALREADY_PENDING' });
  });

  it.each(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const)(
    'refuses a change request while the event is %s', async (status) => {
      const eventRequestId = await newEvent(status);
      await expect(propose(eventRequestId, { name: 'New' }))
        .rejects.toMatchObject({ kind: 'CONFLICT', code: 'CHANGE_REQUEST_NOT_ALLOWED' });
    },
  );

  it('refuses requests from non-owners and invalid proposals', async () => {
    const eventRequestId = await newEvent();
    const input = { proposedChanges: { name: 'New' }, reason: 'r' };
    await expect(createChangeRequest(fixture.dependencies, { eventRequestId, actor: otherOrganiser, input }))
      .rejects.toMatchObject({ kind: 'NOT_FOUND' });
    await expect(createChangeRequest(fixture.dependencies, { eventRequestId, actor: coordinator, input }))
      .rejects.toMatchObject({ kind: 'FORBIDDEN' });
    // Ends before the stored start time.
    await expect(propose(eventRequestId, { endsAt: '2026-12-01T01:00:00Z' }))
      .rejects.toMatchObject({ kind: 'INVALID_INPUT', code: 'INVALID_CHANGE_REQUEST_INPUT' });
    await expect(propose(eventRequestId, { status: 'CONFIRMED' })).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    const stored = await fixture.pool.query('SELECT 1 FROM event_change_requests WHERE event_request_id = $1', [eventRequestId]);
    expect(stored.rowCount).toBe(0);
  });

  it('applies an approved cosmetic change without touching arrangements or confirmation', async () => {
    const eventRequestId = await newEvent('CONFIRMED');
    const booking = await fixture.addVenueBooking(eventRequestId, organiser.id, 'APPROVED');
    const equipment = await fixture.addEquipmentRequest(eventRequestId, organiser.id, 'RESERVED');
    const changeRequestId = await propose(eventRequestId, { name: 'Renamed', registrationRequired: true });

    const result = await decideChangeRequest(fixture.dependencies, {
      eventRequestId, changeRequestId, actor: coordinator, input: { decision: 'APPROVED' },
    });
    expect(result).toEqual({
      changeRequestId, eventRequestId, status: 'APPROVED', eventStatus: 'CONFIRMED',
      cancelledVenueBookings: 0, cancelledEquipmentRequests: 0,
    });
    const event = await fixture.eventRow(eventRequestId);
    expect(event).toMatchObject({ name: 'Renamed', status: 'CONFIRMED' });
    expect(await fixture.statusOf('venue_bookings', booking)).toBe('APPROVED');
    expect(await fixture.statusOf('equipment_requests', equipment)).toBe('RESERVED');
  });

  it('applies a schedule change, releases open arrangements and returns a confirmed event to APPROVED', async () => {
    const eventRequestId = await newEvent('CONFIRMED');
    const approved = await fixture.addVenueBooking(eventRequestId, organiser.id, 'APPROVED');
    const pending = await fixture.addVenueBooking(eventRequestId, organiser.id, 'PENDING');
    const rejected = await fixture.addVenueBooking(eventRequestId, organiser.id, 'REJECTED');
    const reserved = await fixture.addEquipmentRequest(eventRequestId, organiser.id, 'RESERVED');
    const requested = await fixture.addEquipmentRequest(eventRequestId, organiser.id, 'REQUESTED');
    const refused = await fixture.addEquipmentRequest(eventRequestId, organiser.id, 'REJECTED');
    const otherEvent = await newEvent('CONFIRMED');
    const untouched = await fixture.addVenueBooking(otherEvent, organiser.id, 'APPROVED');
    const changeRequestId = await propose(eventRequestId, {
      startsAt: '2026-12-02T02:00:00Z', endsAt: '2026-12-02T08:00:00Z', expectedAttendance: 75,
    });

    const result = await decideChangeRequest(fixture.dependencies, {
      eventRequestId, changeRequestId, actor: coordinator, input: { decision: 'APPROVED', reason: ' Fine. ' },
    });
    expect(result).toMatchObject({
      status: 'APPROVED', eventStatus: 'APPROVED', cancelledVenueBookings: 2, cancelledEquipmentRequests: 2,
    });

    const event = await fixture.eventRow(eventRequestId);
    expect(event.status).toBe('APPROVED');
    expect(event.starts_at).toEqual(new Date('2026-12-02T02:00:00Z'));
    expect(event.ends_at).toEqual(new Date('2026-12-02T08:00:00Z'));
    expect(event.expected_attendance).toBe(75);
    expect(await fixture.statusOf('venue_bookings', approved)).toBe('CANCELLED');
    expect(await fixture.statusOf('venue_bookings', pending)).toBe('CANCELLED');
    expect(await fixture.statusOf('venue_bookings', rejected)).toBe('REJECTED');
    expect(await fixture.statusOf('venue_bookings', untouched)).toBe('APPROVED');
    expect(await fixture.statusOf('equipment_requests', reserved)).toBe('CANCELLED');
    expect(await fixture.statusOf('equipment_requests', requested)).toBe('CANCELLED');
    expect(await fixture.statusOf('equipment_requests', refused)).toBe('REJECTED');

    expect((await fixture.history(eventRequestId)).at(-1))
      .toEqual({ from_status: 'CONFIRMED', to_status: 'APPROVED', changed_by: coordinator.id });
    const [record] = await listChangeRequests(fixture.dependencies, { eventRequestId, actor: organiser });
    expect(record).toMatchObject({
      status: 'APPROVED', decidedById: coordinator.id, decidedByName: 'Casey', decisionReason: 'Fine.',
    });
    const sent = await fixture.notifications(eventRequestId);
    const approval = sent.find((row) => row.type === 'CHANGE_REQUEST_APPROVED');
    expect(approval).toMatchObject({ recipient_id: organiser.id });
    expect(approval!.message).toMatch(/request them again/);
    expect(approval!.message).toMatch(/confirmed again/);

    // A closed change cannot be decided or withdrawn again.
    await expect(decideChangeRequest(fixture.dependencies, {
      eventRequestId, changeRequestId, actor: coordinator, input: { decision: 'REJECTED' },
    })).rejects.toMatchObject({ kind: 'CONFLICT', code: 'CHANGE_REQUEST_NOT_PENDING' });
    await expect(withdrawChangeRequest(fixture.dependencies, { eventRequestId, changeRequestId, actor: organiser }))
      .rejects.toMatchObject({ code: 'CHANGE_REQUEST_NOT_PENDING' });
  });

  it('records a rejection without changing the event', async () => {
    const eventRequestId = await newEvent();
    const booking = await fixture.addVenueBooking(eventRequestId, organiser.id, 'APPROVED');
    const changeRequestId = await propose(eventRequestId, { expectedAttendance: 500 });
    const before = await fixture.eventRow(eventRequestId);
    const result = await decideChangeRequest(fixture.dependencies, {
      eventRequestId, changeRequestId, actor: coordinator, input: { decision: 'REJECTED', reason: 'Too many.' },
    });
    expect(result).toMatchObject({ status: 'REJECTED', eventStatus: 'APPROVED', cancelledVenueBookings: 0 });
    expect(await fixture.eventRow(eventRequestId)).toEqual(before);
    expect(await fixture.statusOf('venue_bookings', booking)).toBe('APPROVED');
    const rejection = (await fixture.notifications(eventRequestId)).find((row) => row.type === 'CHANGE_REQUEST_REJECTED');
    expect(rejection).toMatchObject({ recipient_id: organiser.id });
    expect(rejection!.message).toContain('Too many.');
    // The organiser may now propose again.
    await expect(propose(eventRequestId, { expectedAttendance: 90 })).resolves.toEqual(expect.any(String));
  });

  it('lets only the owner withdraw and only the assigned coordinator decide', async () => {
    const eventRequestId = await newEvent();
    const changeRequestId = await propose(eventRequestId, { name: 'New' });
    const decide = (actor: WorkflowActor) => decideChangeRequest(fixture.dependencies, {
      eventRequestId, changeRequestId, actor, input: { decision: 'APPROVED' },
    });
    await expect(decide(organiser)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(decide(otherCoordinator)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    await expect(withdrawChangeRequest(fixture.dependencies, { eventRequestId, changeRequestId, actor: coordinator }))
      .rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(withdrawChangeRequest(fixture.dependencies, { eventRequestId, changeRequestId: randomUUID(), actor: organiser }))
      .rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'CHANGE_REQUEST_NOT_FOUND' });
    expect((await fixture.eventRow(eventRequestId)).name).toBe('Open day');

    expect(await withdrawChangeRequest(fixture.dependencies, { eventRequestId, changeRequestId, actor: organiser }))
      .toEqual({ changeRequestId, eventRequestId, status: 'WITHDRAWN' });
    await expect(decide(coordinator)).rejects.toMatchObject({ code: 'CHANGE_REQUEST_NOT_PENDING' });
    expect((await fixture.notifications(eventRequestId)).map((row) => row.type))
      .toEqual(['CHANGE_REQUEST_SUBMITTED', 'CHANGE_REQUEST_WITHDRAWN']);
  });

  it('cannot approve a change after the event was cancelled, but can still reject it', async () => {
    const eventRequestId = await newEvent();
    const changeRequestId = await propose(eventRequestId, { name: 'New' });
    await fixture.pool.query("UPDATE event_requests SET status = 'CANCELLED' WHERE id = $1", [eventRequestId]);
    await expect(decideChangeRequest(fixture.dependencies, {
      eventRequestId, changeRequestId, actor: coordinator, input: { decision: 'APPROVED' },
    })).rejects.toMatchObject({ kind: 'CONFLICT', code: 'CHANGE_REQUEST_NOT_ALLOWED' });
    expect((await fixture.eventRow(eventRequestId)).name).toBe('Open day');
    await expect(decideChangeRequest(fixture.dependencies, {
      eventRequestId, changeRequestId, actor: coordinator, input: { decision: 'REJECTED' },
    })).resolves.toMatchObject({ status: 'REJECTED' });
  });

  it('commits only one of two competing decisions', async () => {
    const eventRequestId = await newEvent();
    const changeRequestId = await propose(eventRequestId, { name: 'Raced' });
    const results = await Promise.allSettled((['APPROVED', 'REJECTED'] as const).map((decision) =>
      decideChangeRequest(fixture.dependencies, { eventRequestId, changeRequestId, actor: coordinator, input: { decision } })));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected'))
      .toMatchObject({ reason: { code: 'CHANGE_REQUEST_NOT_PENDING' } });
  });
});
