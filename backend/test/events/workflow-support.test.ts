import { describe, expect, it } from 'vitest';
import { parseAssignmentInput } from '../../src/modules/events/assignment.js';
import {
  affectsArrangements, parseChangeDecisionInput, parseChangeRequestInput,
} from '../../src/modules/events/change-requests.js';
import {
  othersThan, parseObjectBody, relationTo, requiredText, requireRelation,
  type LockedEventRequest, type WorkflowActor,
} from '../../src/modules/events/workflow-support.js';

const organiser: WorkflowActor = { id: '10000000-0000-4000-8000-000000000001', role: 'EVENT_ORGANISER' };
const coordinator: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const event: LockedEventRequest = {
  id: '30000000-0000-4000-8000-000000000001', organiserId: organiser.id, coordinatorId: coordinator.id,
  status: 'APPROVED', name: 'Open day', startsAt: new Date('2026-10-01T02:00:00Z'),
  endsAt: new Date('2026-10-01T06:00:00Z'), expectedAttendance: 80, hasEnded: false,
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

  it('never lists the actor as a notification recipient', () => {
    expect(othersThan(coordinator.id, organiser.id, coordinator.id, null, organiser.id, undefined))
      .toEqual([organiser.id]);
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
    expect(parseAssignmentInput({ coordinatorId: coordinator.id, note: '  Handing over.  ' }))
      .toEqual({ coordinatorId: coordinator.id, note: 'Handing over.' });
    expect(parseAssignmentInput({ coordinatorId: coordinator.id, note: ' ' }).note).toBeNull();
    for (const body of [{}, { coordinatorId: 'me' }, { coordinatorId: coordinator.id, assignedBy: 'x' },
      { coordinatorId: coordinator.id, note: 5 }]) {
      expect(() => parseAssignmentInput(body)).toThrowError(expect.objectContaining({ kind: 'INVALID_INPUT' }));
    }
  });

  it('validates proposed changes with the draft rules and keeps mandatory fields filled', () => {
    expect(parseChangeRequestInput({
      proposedChanges: { expectedAttendance: 120, description: null }, reason: ' More sign-ups. ',
    })).toEqual({ proposedChanges: { expectedAttendance: 120, description: null }, reason: 'More sign-ups.' });

    for (const body of [
      { proposedChanges: {}, reason: 'r' },
      { proposedChanges: { status: 'CONFIRMED' }, reason: 'r' },
      { proposedChanges: { organiserId: organiser.id }, reason: 'r' },
      { proposedChanges: { expectedAttendance: -1 }, reason: 'r' },
      { proposedChanges: { startsAt: 'tomorrow' }, reason: 'r' },
      { proposedChanges: { name: null }, reason: 'r' },
      { proposedChanges: { name: '  ' }, reason: 'r' },
      { proposedChanges: { endsAt: null }, reason: 'r' },
      { proposedChanges: { name: 'New' }, reason: ' ' },
      { proposedChanges: { name: 'New' } },
      { proposedChanges: ['name'], reason: 'r' },
    ]) {
      expect(() => parseChangeRequestInput(body))
        .toThrowError(expect.objectContaining({ kind: 'INVALID_INPUT' }));
    }
  });

  it('parses a change decision', () => {
    expect(parseChangeDecisionInput({ decision: 'REJECTED', reason: ' Clash. ' }))
      .toEqual({ decision: 'REJECTED', reason: 'Clash.' });
    expect(parseChangeDecisionInput({ decision: 'APPROVED' })).toEqual({ decision: 'APPROVED', reason: null });
    expect(() => parseChangeDecisionInput({ decision: 'WITHDRAWN' })).toThrow(/APPROVED or REJECTED/);
  });

  it('flags only real changes to dates or attendance as affecting arrangements', () => {
    expect(affectsArrangements(event, { name: 'Renamed', expectedAttendance: 80 })).toBe(false);
    expect(affectsArrangements(event, { startsAt: '2026-10-01T10:00:00+08:00' })).toBe(false);
    expect(affectsArrangements(event, { startsAt: '2026-10-01T03:00:00Z' })).toBe(true);
    expect(affectsArrangements(event, { endsAt: '2026-10-01T07:00:00Z' })).toBe(true);
    expect(affectsArrangements(event, { expectedAttendance: 81 })).toBe(true);
  });
});
