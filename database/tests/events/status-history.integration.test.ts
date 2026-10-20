import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  requestClarification, respondToClarification, startReview,
} from '../../../backend/src/modules/events/clarifications.js';
import { listStatusHistory } from '../../../backend/src/modules/events/status-history.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let otherOrganiser: WorkflowActor;
let coordinator: WorkflowActor;
let otherCoordinator: WorkflowActor;
let attendee: WorkflowActor;

beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Olive');
  otherOrganiser = await fixture.createUser('EVENT_ORGANISER');
  coordinator = await fixture.createUser('EVENT_COORDINATOR', 'Casey');
  otherCoordinator = await fixture.createUser('EVENT_COORDINATOR');
  attendee = await fixture.createUser('ATTENDEE');
});

afterAll(async () => { await fixture.destroy(); });

describe('KAN-16 status history persistence and access', () => {
  it('shows the owner and assigned coordinator ordered, attributed history from the review workflow', async () => {
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id });
    await startReview(fixture.dependencies, { eventRequestId, actor: coordinator });
    const { clarificationId } = await requestClarification(fixture.dependencies, {
      eventRequestId, actor: coordinator, input: { message: 'Which hall?' },
    });
    await respondToClarification(fixture.dependencies, {
      eventRequestId, clarificationId, actor: organiser, input: { response: 'Main hall.' },
    });

    for (const actor of [organiser, coordinator]) {
      const entries = await listStatusHistory(fixture.dependencies, { eventRequestId, actor });
      expect(entries.map((entry) => [entry.fromStatus, entry.toStatus, entry.changedById, entry.changedByName]))
        .toEqual([
          [null, 'SUBMITTED', null, null],
          ['SUBMITTED', 'UNDER_REVIEW', coordinator.id, 'Casey'],
          ['UNDER_REVIEW', 'CLARIFICATION_REQUESTED', coordinator.id, 'Casey'],
          ['CLARIFICATION_REQUESTED', 'SUBMITTED', organiser.id, 'Olive'],
        ]);
      expect(new Set(entries.map((entry) => entry.id)).size).toBe(4);
      const times = entries.map((entry) => entry.createdAt);
      expect(times).toEqual([...times].sort());
      expect(times.every((time) => new Date(time).toISOString() === time)).toBe(true);
    }
    // KAN-64-AC201: the clarification request is the only step in this workflow that notifies.
    expect((await fixture.notifications(eventRequestId)).map((row) => [row.type, row.recipient_id]))
      .toEqual([['CLARIFICATION_REQUESTED', organiser.id]]);
  });

  it('hides history from unrelated users and reports missing requests in the same way', async () => {
    const eventRequestId = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id });
    for (const actor of [otherOrganiser, otherCoordinator, attendee]) {
      await expect(listStatusHistory(fixture.dependencies, { eventRequestId, actor }))
        .rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'EVENT_REQUEST_NOT_FOUND' });
    }
    await expect(listStatusHistory(fixture.dependencies, { eventRequestId: randomUUID(), actor: organiser }))
      .rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'EVENT_REQUEST_NOT_FOUND' });
  });

  it('lets only the owner read a draft history and does not expose unassigned history to coordinators', async () => {
    const draft = await fixture.createEvent({
      organiserId: organiser.id, coordinatorId: coordinator.id, status: 'DRAFT',
    });
    expect(await listStatusHistory(fixture.dependencies, { eventRequestId: draft, actor: organiser }))
      .toEqual([expect.objectContaining({ fromStatus: null, toStatus: 'DRAFT' })]);
    await expect(listStatusHistory(fixture.dependencies, { eventRequestId: draft, actor: coordinator }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    const unassigned = await fixture.createEvent({ organiserId: organiser.id });
    await expect(listStatusHistory(fixture.dependencies, { eventRequestId: unassigned, actor: coordinator }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });

  it.each(['CONFIRMED', 'CANCELLED', 'COMPLETED'] as const)(
    'reads retained %s records without changing their state', async (status) => {
      // Compatibility with stored states does not provide lifecycle transition actions.
      const eventRequestId = await fixture.createEvent({
        organiserId: organiser.id, coordinatorId: coordinator.id, status,
      });
      const before = await fixture.eventRow(eventRequestId);
      expect(await listStatusHistory(fixture.dependencies, { eventRequestId, actor: organiser }))
        .toEqual([expect.objectContaining({ fromStatus: null, toStatus: status, changedById: null })]);
      expect(await fixture.eventRow(eventRequestId)).toEqual(before);
    },
  );
});
