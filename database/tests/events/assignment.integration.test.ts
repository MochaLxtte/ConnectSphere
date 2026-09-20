import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assignCoordinator, listAssignments, listCoordinators, listUnassignedRequests,
} from '../../../backend/src/modules/events/assignment.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let otherOrganiser: WorkflowActor;
let alex: WorkflowActor;
let blair: WorkflowActor;
let casey: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Olive Organiser');
  otherOrganiser = await fixture.createUser('EVENT_ORGANISER');
  alex = await fixture.createUser('EVENT_COORDINATOR', 'Alex');
  blair = await fixture.createUser('EVENT_COORDINATOR', 'Blair');
  casey = await fixture.createUser('EVENT_COORDINATOR', 'Casey');
});
afterAll(async () => { await fixture.destroy(); });

async function assignmentRows(eventRequestId: string) {
  const found = await fixture.pool.query(
    `SELECT coordinator_id, assigned_by, note, unassigned_at IS NULL AS active
     FROM coordinator_assignments WHERE event_request_id = $1 ORDER BY assigned_at, unassigned_at NULLS LAST`,
    [eventRequestId],
  );
  return found.rows;
}

describe('CF-05 coordinator assignment persistence', () => {
  it('lists only assignable unassigned requests, and only for coordinators', async () => {
    const open = await fixture.createEvent({ organiserId: organiser.id, name: 'Unassigned fair' });
    const draft = await fixture.createEvent({ organiserId: organiser.id, status: 'DRAFT' });
    const rejected = await fixture.createEvent({ organiserId: organiser.id, status: 'REJECTED' });
    const assigned = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: alex.id });

    const items = await listUnassignedRequests(fixture.dependencies, alex);
    const ids = items.map((item) => item.id);
    expect(ids).toContain(open);
    expect(ids).not.toContain(draft);
    expect(ids).not.toContain(rejected);
    expect(ids).not.toContain(assigned);
    expect(items.find((item) => item.id === open)).toMatchObject({
      name: 'Unassigned fair', status: 'SUBMITTED', organiserName: 'Olive Organiser',
      startsAt: '2026-12-01T02:00:00.000Z', expectedAttendance: 50,
    });

    await expect(listUnassignedRequests(fixture.dependencies, organiser))
      .rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(listCoordinators(fixture.dependencies, organiser))
      .rejects.toMatchObject({ kind: 'FORBIDDEN' });
    const coordinators = await listCoordinators(fixture.dependencies, alex);
    expect(coordinators.map((item) => item.displayName)).toEqual(['Alex', 'Blair', 'Casey']);
  });

  it('assigns an unassigned request, records history and notifies everyone but the actor', async () => {
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id });
    const saved = await assignCoordinator(fixture.dependencies, {
      eventRequestId, actor: alex, input: { coordinatorId: blair.id, note: '  Blair knows the venue.  ' },
    });
    expect(saved).toEqual({
      eventRequestId, assignmentId: expect.any(String), coordinatorId: blair.id, previousCoordinatorId: null,
    });

    const event = await fixture.eventRow(eventRequestId);
    expect(event.coordinator_id).toBe(blair.id);
    expect(event.status).toBe('SUBMITTED');
    expect(event.updated_at).not.toEqual(new Date('2026-09-01T00:00:00Z'));
    expect(await assignmentRows(eventRequestId)).toEqual([
      { coordinator_id: blair.id, assigned_by: alex.id, note: 'Blair knows the venue.', active: true },
    ]);
    const sent = await fixture.notifications(eventRequestId);
    expect(sent.map((row) => [row.type, row.recipient_id])).toEqual([
      ['COORDINATOR_ASSIGNED', blair.id], ['COORDINATOR_CHANGED', organiser.id],
    ]);
  });

  it('lets the assigned coordinator hand over, closing the previous assignment', async () => {
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id });
    await assignCoordinator(fixture.dependencies, { eventRequestId, actor: alex, input: { coordinatorId: alex.id } });
    const handedOver = await assignCoordinator(fixture.dependencies, {
      eventRequestId, actor: alex, input: { coordinatorId: casey.id },
    });
    expect(handedOver.previousCoordinatorId).toBe(alex.id);
    expect(await assignmentRows(eventRequestId)).toEqual([
      { coordinator_id: alex.id, assigned_by: alex.id, note: null, active: false },
      { coordinator_id: casey.id, assigned_by: alex.id, note: null, active: true },
    ]);
    expect((await fixture.eventRow(eventRequestId)).coordinator_id).toBe(casey.id);
    // Self-assignment notified only the organiser; the hand-over told Casey and the organiser.
    const sent = await fixture.notifications(eventRequestId);
    expect(sent.some((row) => row.recipient_id === alex.id)).toBe(false);
    expect(sent.filter((row) => row.type === 'COORDINATOR_ASSIGNED').map((row) => row.recipient_id)).toEqual([casey.id]);

    const records = await listAssignments(fixture.dependencies, { eventRequestId, actor: organiser });
    expect(records.map((record) => [record.coordinatorName, record.assignedByName, record.unassignedAt === null]))
      .toEqual(expect.arrayContaining([['Casey', 'Alex', true], ['Alex', 'Alex', false]]));
    expect(await listAssignments(fixture.dependencies, { eventRequestId, actor: casey })).toHaveLength(2);
    // The previous coordinator and unrelated users no longer see the history.
    for (const actor of [alex, otherOrganiser]) {
      await expect(listAssignments(fixture.dependencies, { eventRequestId, actor }))
        .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
  });

  it('notifies the previous coordinator when a seeded assignment without history is handed over', async () => {
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: blair.id });
    await assignCoordinator(fixture.dependencies, { eventRequestId, actor: blair, input: { coordinatorId: casey.id } });
    expect((await assignmentRows(eventRequestId)).filter((row) => row.active)).toHaveLength(1);
    expect((await fixture.notifications(eventRequestId)).some((row) => row.recipient_id === blair.id)).toBe(false);
  });

  it.each([
    { name: 'another coordinator reassigning an assigned request', status: 'SUBMITTED', assigned: true, actor: () => blair, target: () => blair.id, expected: { kind: 'NOT_FOUND' } },
    { name: 'an organiser', status: 'SUBMITTED', assigned: false, actor: () => organiser, target: () => alex.id, expected: { kind: 'FORBIDDEN', code: 'ASSIGNMENT_FORBIDDEN' } },
    { name: 'a draft', status: 'DRAFT', assigned: false, actor: () => alex, target: () => alex.id, expected: { kind: 'NOT_FOUND' } },
    { name: 'a rejected request', status: 'REJECTED', assigned: false, actor: () => alex, target: () => alex.id, expected: { code: 'ASSIGNMENT_NOT_ALLOWED' } },
    { name: 'a cancelled request', status: 'CANCELLED', assigned: true, actor: () => alex, target: () => blair.id, expected: { code: 'ASSIGNMENT_NOT_ALLOWED' } },
    { name: 'a completed request', status: 'COMPLETED', assigned: true, actor: () => alex, target: () => blair.id, expected: { code: 'ASSIGNMENT_NOT_ALLOWED' } },
    { name: 'a target who is not a coordinator', status: 'APPROVED', assigned: false, actor: () => alex, target: () => organiser.id, expected: { code: 'INVALID_COORDINATOR' } },
    { name: 'a target who does not exist', status: 'APPROVED', assigned: false, actor: () => alex, target: () => randomUUID(), expected: { code: 'INVALID_COORDINATOR' } },
    { name: 'the coordinator who is already assigned', status: 'APPROVED', assigned: true, actor: () => alex, target: () => alex.id, expected: { code: 'COORDINATOR_ALREADY_ASSIGNED' } },
  ] as const)('leaves data unchanged for $name', async ({ status, assigned, actor, target, expected }) => {
    const eventRequestId = await fixture.createEvent({
      organiserId: organiser.id, status, coordinatorId: assigned ? alex.id : null,
    });
    const before = await fixture.eventRow(eventRequestId);
    await expect(assignCoordinator(fixture.dependencies, {
      eventRequestId, actor: actor(), input: { coordinatorId: target() },
    })).rejects.toMatchObject(expected);
    expect(await fixture.eventRow(eventRequestId)).toEqual(before);
    expect(await assignmentRows(eventRequestId)).toEqual([]);
    expect(await fixture.notifications(eventRequestId)).toEqual([]);
  });

  it('shows any coordinator the history of an unassigned non-draft request, but never a draft', async () => {
    const unassigned = await fixture.createEvent({ organiserId: organiser.id });
    expect(await listAssignments(fixture.dependencies, { eventRequestId: unassigned, actor: casey })).toEqual([]);
    const draft = await fixture.createEvent({ organiserId: organiser.id, status: 'DRAFT' });
    await expect(listAssignments(fixture.dependencies, { eventRequestId: draft, actor: casey }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    await expect(listAssignments(fixture.dependencies, { eventRequestId: unassigned, actor: otherOrganiser }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });

  it('reports a missing request as not found', async () => {
    await expect(assignCoordinator(fixture.dependencies, {
      eventRequestId: randomUUID(), actor: alex, input: { coordinatorId: alex.id },
    })).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });

  it('lets only one of two coordinators claim the same unassigned request', async () => {
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id });
    const results = await Promise.allSettled([alex, blair].map((actor) => assignCoordinator(
      fixture.dependencies, { eventRequestId, actor, input: { coordinatorId: actor.id } },
    )));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected'))
      .toMatchObject({ reason: { code: 'EVENT_REQUEST_NOT_FOUND' } });
    expect((await assignmentRows(eventRequestId)).filter((row) => row.active)).toHaveLength(1);
  });
});
