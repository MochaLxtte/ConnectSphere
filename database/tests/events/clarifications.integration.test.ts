import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  listClarifications, requestClarification, respondToClarification, startReview,
} from '../../../backend/src/modules/events/clarifications.js';
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

const newEvent = (status: Parameters<WorkflowFixture['createEvent']>[0]['status'] = 'SUBMITTED') =>
  fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status });

describe('CF-04 clarification persistence', () => {
  it('runs the full start-review, ask, answer cycle with attributed status history', async () => {
    const eventRequestId = await newEvent();
    expect(await startReview(fixture.dependencies, { eventRequestId, actor: coordinator }))
      .toEqual({ eventRequestId, status: 'UNDER_REVIEW' });

    const asked = await requestClarification(fixture.dependencies, {
      eventRequestId, actor: coordinator, input: { message: '  Which hall do you need?  ' },
    });
    expect(asked).toEqual({ clarificationId: expect.any(String), eventRequestId, status: 'CLARIFICATION_REQUESTED' });
    expect((await fixture.eventRow(eventRequestId)).status).toBe('CLARIFICATION_REQUESTED');

    const answered = await respondToClarification(fixture.dependencies, {
      eventRequestId, clarificationId: asked.clarificationId, actor: organiser,
      input: { response: ' The main hall. ' },
    });
    expect(answered.status).toBe('SUBMITTED');
    expect((await fixture.eventRow(eventRequestId)).status).toBe('SUBMITTED');

    expect(await fixture.history(eventRequestId)).toEqual([
      { from_status: null, to_status: 'SUBMITTED', changed_by: null },
      { from_status: 'SUBMITTED', to_status: 'UNDER_REVIEW', changed_by: coordinator.id },
      { from_status: 'UNDER_REVIEW', to_status: 'CLARIFICATION_REQUESTED', changed_by: coordinator.id },
      { from_status: 'CLARIFICATION_REQUESTED', to_status: 'SUBMITTED', changed_by: organiser.id },
    ]);
    expect(await fixture.notifications(eventRequestId)).toEqual([]);

    for (const actor of [organiser, coordinator]) {
      expect(await listClarifications(fixture.dependencies, { eventRequestId, actor })).toEqual([{
        id: asked.clarificationId, eventRequestId, requestedById: coordinator.id, requestedByName: 'Casey',
        message: 'Which hall do you need?', response: 'The main hall.',
        createdAt: expect.any(String), respondedAt: expect.any(String),
      }]);
    }
    for (const actor of [otherOrganiser, otherCoordinator]) {
      await expect(listClarifications(fixture.dependencies, { eventRequestId, actor }))
        .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
  });

  it('keeps CLARIFICATION_REQUESTED until every open question is answered', async () => {
    const eventRequestId = await newEvent('CLARIFICATION_REQUESTED');
    const ids = [randomUUID(), randomUUID()];
    for (const id of ids) {
      await fixture.pool.query(
        'INSERT INTO event_clarifications (id, event_request_id, requested_by, message) VALUES ($1, $2, $3, $4)',
        [id, eventRequestId, coordinator.id, 'Question'],
      );
    }
    const first = await respondToClarification(fixture.dependencies, {
      eventRequestId, clarificationId: ids[0]!, actor: organiser, input: { response: 'One' },
    });
    expect(first.status).toBe('CLARIFICATION_REQUESTED');
    expect((await fixture.eventRow(eventRequestId)).status).toBe('CLARIFICATION_REQUESTED');
    const second = await respondToClarification(fixture.dependencies, {
      eventRequestId, clarificationId: ids[1]!, actor: organiser, input: { response: 'Two' },
    });
    expect(second.status).toBe('SUBMITTED');

    await expect(respondToClarification(fixture.dependencies, {
      eventRequestId, clarificationId: ids[0]!, actor: organiser, input: { response: 'Again' },
    })).rejects.toMatchObject({ kind: 'CONFLICT', code: 'CLARIFICATION_ALREADY_ANSWERED' });
  });

  it.each([
    { name: 'an unrelated coordinator', actor: () => otherCoordinator, status: 'SUBMITTED', expected: { kind: 'NOT_FOUND' } },
    { name: 'the owning organiser', actor: () => organiser, status: 'SUBMITTED', expected: { kind: 'FORBIDDEN' } },
    { name: 'an approved request', actor: () => coordinator, status: 'APPROVED', expected: { code: 'CLARIFICATION_NOT_ALLOWED' } },
    { name: 'a request already awaiting clarification', actor: () => coordinator, status: 'CLARIFICATION_REQUESTED', expected: { code: 'CLARIFICATION_NOT_ALLOWED' } },
    { name: 'a draft', actor: () => coordinator, status: 'DRAFT', expected: { kind: 'NOT_FOUND' } },
  ] as const)('does not record a clarification for $name', async ({ actor, status, expected }) => {
    const eventRequestId = await newEvent(status);
    const before = await fixture.eventRow(eventRequestId);
    await expect(requestClarification(fixture.dependencies, {
      eventRequestId, actor: actor(), input: { message: 'Question' },
    })).rejects.toMatchObject(expected);
    expect(await fixture.eventRow(eventRequestId)).toEqual(before);
    const stored = await fixture.pool.query('SELECT 1 FROM event_clarifications WHERE event_request_id = $1', [eventRequestId]);
    expect(stored.rowCount).toBe(0);
    expect(await fixture.notifications(eventRequestId)).toEqual([]);
  });

  it('validates the message before touching the database', async () => {
    const eventRequestId = await newEvent();
    for (const input of [{}, { message: ' ' }, { message: 'ok', status: 'APPROVED' }]) {
      await expect(requestClarification(fixture.dependencies, { eventRequestId, actor: coordinator, input }))
        .rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    }
  });

  it('refuses responses from anyone but the owner, and for another request\'s clarification', async () => {
    const eventRequestId = await newEvent();
    const otherEvent = await newEvent();
    const { clarificationId } = await requestClarification(fixture.dependencies, {
      eventRequestId, actor: coordinator, input: { message: 'Question' },
    });
    await expect(respondToClarification(fixture.dependencies, {
      eventRequestId, clarificationId, actor: coordinator, input: { response: 'x' },
    })).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(respondToClarification(fixture.dependencies, {
      eventRequestId, clarificationId, actor: otherOrganiser, input: { response: 'x' },
    })).rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'EVENT_REQUEST_NOT_FOUND' });
    await expect(respondToClarification(fixture.dependencies, {
      eventRequestId: otherEvent, clarificationId, actor: organiser, input: { response: 'x' },
    })).rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'CLARIFICATION_NOT_FOUND' });
    const stored = await fixture.pool.query('SELECT response FROM event_clarifications WHERE id = $1', [clarificationId]);
    expect(stored.rows[0].response).toBeNull();
  });

  it('only starts a review from SUBMITTED and only for the assigned coordinator', async () => {
    const underReview = await newEvent('UNDER_REVIEW');
    await expect(startReview(fixture.dependencies, { eventRequestId: underReview, actor: coordinator }))
      .rejects.toMatchObject({ kind: 'CONFLICT', code: 'REVIEW_NOT_STARTABLE' });
    const submitted = await newEvent();
    await expect(startReview(fixture.dependencies, { eventRequestId: submitted, actor: otherCoordinator }))
      .rejects.toMatchObject({ kind: 'NOT_FOUND' });
    await expect(startReview(fixture.dependencies, { eventRequestId: submitted, actor: organiser }))
      .rejects.toMatchObject({ kind: 'FORBIDDEN' });
    expect((await fixture.eventRow(submitted)).status).toBe('SUBMITTED');
  });
});
