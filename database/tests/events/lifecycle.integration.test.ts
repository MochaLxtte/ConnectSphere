import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cancelEvent, completeEvent, confirmEvent, listStatusHistory,
} from '../../../backend/src/modules/events/lifecycle.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let otherOrganiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;
let attendee: WorkflowActor;
let withdrawnAttendee: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Olive');
  otherOrganiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR', 'Casey');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
  attendee = await fixture.createUser('ATTENDEE');
  withdrawnAttendee = await fixture.createUser('ATTENDEE');
});
afterAll(async () => { await fixture.destroy(); });

type Status = Parameters<WorkflowFixture['createEvent']>[0]['status'];
const newEvent = (status: Status, extra: { startsAt?: string; endsAt?: string } = {}) =>
  fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status, ...extra });

describe('CF-06 lifecycle persistence', () => {
  it('confirms an approved event once a venue is approved and no equipment decision is pending', async () => {
    const eventRequestId = await newEvent('APPROVED');
    const confirm = () => confirmEvent(fixture.dependencies, { eventRequestId, actor: coordinator });

    await fixture.addVenueBooking(eventRequestId, organiser.id, 'PENDING');
    await expect(confirm()).rejects.toMatchObject({ kind: 'CONFLICT', code: 'VENUE_BOOKING_REQUIRED' });

    await fixture.addVenueBooking(eventRequestId, organiser.id, 'APPROVED');
    const equipment = await fixture.addEquipmentRequest(eventRequestId, organiser.id, 'REQUESTED');
    await expect(confirm()).rejects.toMatchObject({ kind: 'CONFLICT', code: 'EQUIPMENT_REQUESTS_PENDING' });
    expect((await fixture.eventRow(eventRequestId)).status).toBe('APPROVED');

    await fixture.pool.query(
      "UPDATE equipment_requests SET status = 'RESERVED', decided_by = $2, decided_at = now() WHERE id = $1",
      [equipment, coordinator.id],
    );
    expect(await confirm()).toEqual({ eventRequestId, status: 'CONFIRMED' });
    expect((await fixture.eventRow(eventRequestId)).status).toBe('CONFIRMED');
    expect((await fixture.notifications(eventRequestId)).map((row) => [row.type, row.recipient_id]))
      .toEqual([['EVENT_CONFIRMED', organiser.id]]);
    await expect(confirm()).rejects.toMatchObject({ code: 'EVENT_NOT_CONFIRMABLE' });

    const entries = await listStatusHistory(fixture.dependencies, { eventRequestId, actor: organiser });
    expect(entries.map((entry) => [entry.fromStatus, entry.toStatus, entry.changedByName])).toEqual([
      [null, 'APPROVED', null], ['APPROVED', 'CONFIRMED', 'Casey'],
    ]);
    expect(await listStatusHistory(fixture.dependencies, { eventRequestId, actor: coordinator })).toHaveLength(2);
    for (const actor of [otherOrganiser, otherCoordinator, attendee]) {
      await expect(listStatusHistory(fixture.dependencies, { eventRequestId, actor }))
        .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
  });

  it('only lets the assigned coordinator confirm or complete', async () => {
    const eventRequestId = await newEvent('APPROVED');
    await fixture.addVenueBooking(eventRequestId, organiser.id, 'APPROVED');
    await expect(confirmEvent(fixture.dependencies, { eventRequestId, actor: organiser }))
      .rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(confirmEvent(fixture.dependencies, { eventRequestId, actor: otherCoordinator }))
      .rejects.toMatchObject({ kind: 'NOT_FOUND' });
    await expect(completeEvent(fixture.dependencies, { eventRequestId, actor: organiser }))
      .rejects.toMatchObject({ kind: 'FORBIDDEN' });
    expect((await fixture.eventRow(eventRequestId)).status).toBe('APPROVED');
  });

  it('cancels as the organiser, releasing arrangements and notifying coordinator and registered attendees', async () => {
    const eventRequestId = await newEvent('CONFIRMED');
    const approved = await fixture.addVenueBooking(eventRequestId, organiser.id, 'APPROVED');
    const pending = await fixture.addVenueBooking(eventRequestId, organiser.id, 'PENDING');
    const rejected = await fixture.addVenueBooking(eventRequestId, organiser.id, 'REJECTED');
    const reserved = await fixture.addEquipmentRequest(eventRequestId, organiser.id, 'RESERVED');
    const requested = await fixture.addEquipmentRequest(eventRequestId, organiser.id, 'REQUESTED');
    await fixture.pool.query(
      'INSERT INTO event_registrations (event_request_id, attendee_id) VALUES ($1, $2)',
      [eventRequestId, attendee.id],
    );
    await fixture.pool.query(
      `INSERT INTO event_registrations (event_request_id, attendee_id, status, withdrawn_at)
       VALUES ($1, $2, 'WITHDRAWN', now())`,
      [eventRequestId, withdrawnAttendee.id],
    );

    const result = await cancelEvent(fixture.dependencies, {
      eventRequestId, actor: organiser, input: { reason: '  Speaker unavailable.  ' },
    });
    expect(result).toEqual({
      eventRequestId, status: 'CANCELLED',
      cancelledVenueBookings: 2, cancelledEquipmentRequests: 2, notifiedAttendees: 1,
    });
    expect((await fixture.eventRow(eventRequestId)).status).toBe('CANCELLED');
    expect(await fixture.statusOf('venue_bookings', approved)).toBe('CANCELLED');
    expect(await fixture.statusOf('venue_bookings', pending)).toBe('CANCELLED');
    expect(await fixture.statusOf('venue_bookings', rejected)).toBe('REJECTED');
    expect(await fixture.statusOf('equipment_requests', reserved)).toBe('CANCELLED');
    expect(await fixture.statusOf('equipment_requests', requested)).toBe('CANCELLED');

    const sent = await fixture.notifications(eventRequestId);
    expect(sent.map((row) => row.recipient_id).sort()).toEqual([attendee.id, coordinator.id].sort());
    expect(sent.find((row) => row.recipient_id === coordinator.id)!.message).toContain('Speaker unavailable.');
    expect(sent.find((row) => row.recipient_id === attendee.id)!.message).not.toContain('Speaker unavailable.');
    expect((await fixture.history(eventRequestId)).at(-1))
      .toEqual({ from_status: 'CONFIRMED', to_status: 'CANCELLED', changed_by: organiser.id });

    await expect(cancelEvent(fixture.dependencies, { eventRequestId, actor: organiser, input: { reason: 'Again' } }))
      .rejects.toMatchObject({ kind: 'CONFLICT', code: 'EVENT_NOT_CANCELLABLE' });
  });

  it.each(['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED'] as const)(
    'lets the assigned coordinator cancel a %s request and notifies the organiser', async (status) => {
      const eventRequestId = await newEvent(status);
      await cancelEvent(fixture.dependencies, { eventRequestId, actor: coordinator, input: { reason: 'Policy.' } });
      expect((await fixture.eventRow(eventRequestId)).status).toBe('CANCELLED');
      expect((await fixture.notifications(eventRequestId)).map((row) => row.recipient_id)).toEqual([organiser.id]);
    },
  );

  it.each(['DRAFT', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const)(
    'refuses to cancel a %s request', async (status) => {
      const eventRequestId = await newEvent(status);
      await expect(cancelEvent(fixture.dependencies, { eventRequestId, actor: organiser, input: { reason: 'r' } }))
        .rejects.toMatchObject({ kind: 'CONFLICT', code: 'EVENT_NOT_CANCELLABLE' });
      expect((await fixture.eventRow(eventRequestId)).status).toBe(status);
    },
  );

  it('requires a reason and a related actor to cancel', async () => {
    const eventRequestId = await newEvent('APPROVED');
    for (const input of [{}, { reason: '  ' }, { reason: 'ok', status: 'CANCELLED' }, null]) {
      await expect(cancelEvent(fixture.dependencies, { eventRequestId, actor: organiser, input }))
        .rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    }
    for (const actor of [otherOrganiser, otherCoordinator, attendee]) {
      await expect(cancelEvent(fixture.dependencies, { eventRequestId, actor, input: { reason: 'r' } }))
        .rejects.toMatchObject({ kind: 'NOT_FOUND' });
    }
    expect((await fixture.eventRow(eventRequestId)).status).toBe('APPROVED');
  });

  it('completes a confirmed event only after it has ended', async () => {
    const upcoming = await newEvent('CONFIRMED', { startsAt: '2999-01-01T00:00:00Z', endsAt: '2999-01-01T04:00:00Z' });
    await expect(completeEvent(fixture.dependencies, { eventRequestId: upcoming, actor: coordinator }))
      .rejects.toMatchObject({ kind: 'CONFLICT', code: 'EVENT_NOT_ENDED' });

    const approvedPast = await newEvent('APPROVED', { startsAt: '2020-01-01T00:00:00Z', endsAt: '2020-01-01T04:00:00Z' });
    await expect(completeEvent(fixture.dependencies, { eventRequestId: approvedPast, actor: coordinator }))
      .rejects.toMatchObject({ kind: 'CONFLICT', code: 'EVENT_NOT_COMPLETABLE' });

    const ended = await newEvent('CONFIRMED', { startsAt: '2020-01-01T00:00:00Z', endsAt: '2020-01-01T04:00:00Z' });
    expect(await completeEvent(fixture.dependencies, { eventRequestId: ended, actor: coordinator }))
      .toEqual({ eventRequestId: ended, status: 'COMPLETED' });
    expect((await fixture.eventRow(ended)).status).toBe('COMPLETED');
    expect((await fixture.history(ended)).at(-1))
      .toEqual({ from_status: 'CONFIRMED', to_status: 'COMPLETED', changed_by: coordinator.id });
    expect((await fixture.notifications(ended)).map((row) => [row.type, row.recipient_id]))
      .toEqual([['EVENT_COMPLETED', organiser.id]]);
  });
});
