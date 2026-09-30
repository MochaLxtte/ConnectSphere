import { describe, expect, it } from 'vitest';
import { parseAssignmentInput } from '../../src/modules/events/assignment.js';
import {
  parseObjectBody, relationTo, requiredText, requireRelation,
  type LockedEventRequest, type WorkflowActor,
} from '../../src/modules/events/workflow-support.js';

const organiser: WorkflowActor = { id: '10000000-0000-4000-8000-000000000001', role: 'EVENT_ORGANISER' };
const coordinator: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const event: LockedEventRequest = {
  id: '30000000-0000-4000-8000-000000000001', organiserId: organiser.id, coordinatorId: coordinator.id,
  status: 'APPROVED',
};

describe('workflow access rules', () => {
  it('recognises only the owner and the assigned coordinator', () => {
    expect(relationTo(organiser, event)).toBe('OWNER');
    expect(relationTo(coordinator, event)).toBe('ASSIGNED_COORDINATOR');
    expect(relationTo({ ...coordinator, id: organiser.id }, event)).toBeNull();
    expect(relationTo({ ...organiser, id: coordinator.id }, event)).toBeNull();
    expect(relationTo({ id: organiser.id, role: 'ATTENDEE' }, event)).toBeNull();
    expect(relationTo(coordinator, { ...event, coordinatorId: null })).toBeNull();
  });

  it('masks unrelated actors and drafts as not found, and refuses a related actor with 403 semantics', () => {
    expect(() => requireRelation({ ...coordinator, id: organiser.id }, event, ['ASSIGNED_COORDINATOR']))
      .toThrowError(expect.objectContaining({ kind: 'NOT_FOUND', code: 'EVENT_REQUEST_NOT_FOUND' }));
    expect(() => requireRelation(coordinator, { ...event, status: 'DRAFT' }, ['ASSIGNED_COORDINATOR']))
      .toThrowError(expect.objectContaining({ kind: 'NOT_FOUND' }));
    expect(() => requireRelation(organiser, event, ['ASSIGNED_COORDINATOR']))
      .toThrowError(expect.objectContaining({ kind: 'FORBIDDEN', code: 'ACTION_FORBIDDEN' }));
    expect(requireRelation(organiser, { ...event, status: 'DRAFT' }, ['OWNER'])).toBe('OWNER');
  });

});

describe('workflow input parsing', () => {
  it.each([null, [], 'text', 4])('rejects a non-object body: %j', (body) => {
    expect(() => parseObjectBody(body, ['reason'])).toThrowError(expect.objectContaining({ kind: 'INVALID_INPUT' }));
  });

  it('rejects unknown keys and blank or oversized text', () => {
    expect(() => parseObjectBody({ reason: 'x', status: 'APPROVED' }, ['reason'])).toThrow(/status/);
    expect(() => requiredText({ reason: '   ' }, 'reason')).toThrow(/non-empty/);
    expect(() => requiredText({ reason: 'x'.repeat(2001) }, 'reason')).toThrow(/2000/);
    expect(requiredText({ reason: '  ok  ' }, 'reason')).toBe('ok');
  });

  it('parses an assignment and rejects non-UUID coordinators or extra fields', () => {
    expect(parseAssignmentInput({ coordinatorId: coordinator.id, note: '  Initial assignment.  ' }))
      .toEqual({ coordinatorId: coordinator.id, note: 'Initial assignment.' });
    expect(parseAssignmentInput({ coordinatorId: coordinator.id, note: ' ' }).note).toBeNull();
    for (const body of [{}, { coordinatorId: 'me' }, { coordinatorId: coordinator.id, assignedBy: 'x' },
      { coordinatorId: coordinator.id, note: 5 }]) {
      expect(() => parseAssignmentInput(body)).toThrowError(expect.objectContaining({ kind: 'INVALID_INPUT' }));
    }
  });

});
