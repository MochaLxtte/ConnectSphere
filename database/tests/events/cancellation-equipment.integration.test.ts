import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { cancelEvent } from '../../../backend/src/modules/events/cancellation.js';
import { replaceReservedEquipmentLine, reviewEquipmentRequest, saveEquipmentRequest } from '../../../backend/src/modules/equipment/equipment-service.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;
let attendee: WorkflowActor;
let technical: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
  attendee = await fixture.createUser('ATTENDEE');
  technical = await fixture.createUser('TECHNICAL_SUPPORT_STAFF');
});
afterAll(async () => { await fixture?.destroy(); });

const period = { startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T04:00:00.000Z' };

describe('KAN-62 cancellation against PostgreSQL', () => {
  it('atomically records the outcome, releases only this event and notifies its affected users once', async () => {
    const eventId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED' });
    const venueId = randomUUID();
    const equipmentTypeId = randomUUID();
    await fixture.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)', [venueId, `Venue ${venueId}`]);
    await fixture.pool.query('INSERT INTO equipment_types(id,name,total_quantity) VALUES($1,$2,4)', [equipmentTypeId, `EQ ${equipmentTypeId}`]);
    const bookingId = randomUUID();
    await fixture.pool.query(`INSERT INTO venue_bookings(id,event_request_id,venue_id,requested_by,starts_at,ends_at)
      VALUES($1,$2,$3,$4,$5,$6)`, [bookingId, eventId, venueId, coordinator.id, period.startsAt, period.endsAt]);
    const equipmentId = randomUUID();
    await fixture.pool.query(`INSERT INTO equipment_requests(id,event_request_id,equipment_type_id,requested_by,quantity,starts_at,ends_at,status,decided_by,decided_at)
      VALUES($1,$2,$3,$4,2,$5,$6,'RESERVED',$7,now())`, [equipmentId, eventId, equipmentTypeId, coordinator.id,
      period.startsAt, period.endsAt, technical.id]);
    const registrationId = randomUUID();
    await fixture.pool.query(`INSERT INTO event_registrations(id,event_request_id,attendee_id)
      VALUES($1,$2,$3)`, [registrationId, eventId, attendee.id]);
    const unrelated = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED' });
    const unrelatedEquipment = randomUUID();
    await fixture.pool.query(`INSERT INTO equipment_requests(id,event_request_id,equipment_type_id,requested_by,quantity,starts_at,ends_at)
      VALUES($1,$2,$3,$4,1,$5,$6)`, [unrelatedEquipment, unrelated, equipmentTypeId, coordinator.id, period.startsAt, period.endsAt]);

    const saved = await cancelEvent(fixture.pool, { eventRequestId: eventId, actor: organiser,
      input: { reason: 'Venue is unavailable.', confirmAffectedArrangements: true } });
    expect(saved).toMatchObject({ status: 'CANCELLED', released: { venueBookings: 1, equipmentRequests: 1, registrations: 1 } });
    expect(await fixture.eventRow(eventId)).toMatchObject({ status: 'CANCELLED' });
    expect((await fixture.history(eventId)).at(-1)).toMatchObject({ to_status: 'CANCELLED', changed_by: organiser.id });
    expect((await fixture.pool.query('SELECT status,cancellation_reason,cancelled_by FROM equipment_requests WHERE id=$1', [equipmentId])).rows[0])
      .toMatchObject({ status: 'CANCELLED', cancellation_reason: 'Venue is unavailable.', cancelled_by: organiser.id });
    expect((await fixture.pool.query('SELECT status FROM event_registrations WHERE id=$1', [registrationId])).rows[0].status).toBe('CANCELLED');
    expect((await fixture.pool.query('SELECT status FROM equipment_requests WHERE id=$1', [unrelatedEquipment])).rows[0].status).toBe('REQUESTED');
    const notices = await fixture.notifications(eventId);
    expect(notices.map((item) => item.recipient_id)).toContain(attendee.id);
    expect(notices.find((item) => item.recipient_id === attendee.id)?.message).not.toContain('unavailable');
    await expect(cancelEvent(fixture.pool, { eventRequestId: eventId, actor: coordinator,
      input: { reason: 'Repeat', confirmAffectedArrangements: true } })).rejects.toThrow('not in a cancellable state');
    expect(await fixture.notifications(eventId)).toHaveLength(notices.length);
  });

  it('leaves data unchanged when an unrelated coordinator attempts cancellation', async () => {
    const eventId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'CONFIRMED' });
    await expect(cancelEvent(fixture.pool, { eventRequestId: eventId, actor: otherCoordinator,
      input: { reason: 'No access', confirmAffectedArrangements: true } })).rejects.toThrow('not found');
    expect(await fixture.eventRow(eventId)).toMatchObject({ status: 'CONFIRMED' });
    expect(await fixture.notifications(eventId)).toHaveLength(0);
  });
});

describe('KAN-63 equipment review and reservation against PostgreSQL', () => {
  it('reserves a complete line once, rejects an over-capacity overlap, and releases/replaces explicitly', async () => {
    const eventA = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED' });
    const eventB = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED' });
    const typeId = randomUUID();
    await fixture.pool.query('INSERT INTO equipment_types(id,name,total_quantity) VALUES($1,$2,2)', [typeId, `EQ ${typeId}`]);
    const line = (quantity: number) => ({ equipmentTypeId: typeId, quantity, ...period, technicalRequirements: 'Wireless' });
    const first = await saveEquipmentRequest(fixture.pool, { eventId: eventA, actor: coordinator, input: { lines: [line(2)] } });
    const firstId = first.lines[0].id as string;
    const reserved = await reviewEquipmentRequest(fixture.pool, { lineId: firstId, actor: technical, input: { decision: 'RESERVED' } });
    expect(reserved.status).toBe('RESERVED');
    const second = await saveEquipmentRequest(fixture.pool, { eventId: eventB, actor: coordinator, input: { lines: [line(1)] } });
    const secondId = second.lines[0].id as string;
    await expect(reviewEquipmentRequest(fixture.pool, { lineId: secondId, actor: technical,
      input: { decision: 'RESERVED' } })).rejects.toThrow('no longer available');
    expect((await fixture.pool.query('SELECT status FROM equipment_requests WHERE id=$1', [secondId])).rows[0].status).toBe('REQUESTED');
    await expect(reviewEquipmentRequest(fixture.pool, { lineId: secondId, actor: technical,
      input: { decision: 'REJECTED', reason: 'Stock unavailable' } })).resolves.toMatchObject({ status: 'REJECTED' });
    const row = (await fixture.pool.query('SELECT revision FROM equipment_requests WHERE id=$1', [firstId])).rows[0];
    await expect(replaceReservedEquipmentLine(fixture.pool, { lineId: firstId, actor: coordinator,
      input: { revision: row.revision, replacement: line(1) } })).resolves.toMatchObject({ cancelledRequestId: firstId });
    await expect(replaceReservedEquipmentLine(fixture.pool, { lineId: firstId, actor: coordinator,
      input: { revision: row.revision, replacement: line(1) } })).rejects.toThrow('not reserved');
  });
});
