import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assignCoordinator, listAssignments, listCoordinators, listUnassignedRequests } from '../../../backend/src/modules/events/assignment.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
let otherOrganiser: WorkflowActor;
let lead: WorkflowActor;
let otherLead: WorkflowActor;
let alex: WorkflowActor;
let blair: WorkflowActor;
let unavailable: WorkflowActor;
beforeAll(async () => {
  fixture = await createWorkflowFixture();
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Olive Organiser');
  otherOrganiser = await fixture.createUser('EVENT_ORGANISER');
  lead = await fixture.createUser('EVENT_COORDINATOR_LEAD', 'Lead');
  otherLead = await fixture.createUser('EVENT_COORDINATOR_LEAD', 'Other Lead');
  alex = await fixture.createUser('EVENT_COORDINATOR', 'Alex');
  blair = await fixture.createUser('EVENT_COORDINATOR', 'Blair');
  unavailable = await fixture.createUser('EVENT_COORDINATOR', 'Unavailable');
  await fixture.pool.query('UPDATE app_users SET coordinator_available = true WHERE id = ANY($1::uuid[])', [[alex.id, blair.id]]);
});
afterAll(async () => { await fixture?.destroy(); });

async function assignmentRows(id: string) {
  return (await fixture.pool.query(`SELECT coordinator_id, assigned_by, assignment_method, assigned_at, note, unassigned_at
    FROM coordinator_assignments WHERE event_request_id = $1 ORDER BY assigned_at, id`, [id])).rows;
}
async function snapshot(id: string) {
  return { event: await fixture.eventRow(id), history: await assignmentRows(id), statusHistory: await fixture.history(id) };
}
function assign(id: string, coordinatorId = alex.id, actor = lead) {
  return assignCoordinator(fixture.dependencies, { eventRequestId: id, actor, input: { coordinatorId } });
}

describe('KAN-79 Lead initial assignment persistence and concurrency', () => {
  it('shows all Leads only unassigned submitted requests and available coordinator targets', async () => {
    const submitted = await fixture.createEvent({ organiserId: organiser.id, name: 'Unassigned fair' });
    const excluded = [];
    for (const status of ['DRAFT', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const) {
      excluded.push(await fixture.createEvent({ organiserId: organiser.id, status }));
    }
    excluded.push(await fixture.createEvent({ organiserId: organiser.id, coordinatorId: alex.id }));
    for (const actor of [lead, otherLead]) {
      const items = await listUnassignedRequests(fixture.dependencies, actor);
      expect(items.map((item) => item.id)).toContain(submitted);
      expect(items.find((item) => item.id === submitted)).toMatchObject({
        name: 'Unassigned fair', status: 'SUBMITTED', organiserName: 'Olive Organiser',
        startsAt: '2026-12-01T02:00:00.000Z', expectedAttendance: 50,
      });
      for (const id of excluded) expect(items.map((item) => item.id)).not.toContain(id);
      expect((await listCoordinators(fixture.dependencies, actor)).map((item) => item.displayName)).toEqual(['Alex', 'Blair']);
    }
    for (const actor of [organiser, alex]) {
      await expect(listUnassignedRequests(fixture.dependencies, actor)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
      await expect(listCoordinators(fixture.dependencies, actor)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    }
  });

  it.each(['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED'] as const)(
    'records one initial assignment for an active %s event without changing its status', async (status) => {
      const id = await fixture.createEvent({ organiserId: organiser.id, status });
      const originalHistory = await fixture.history(id);
      // Compare database timestamps to the database clock, not the host clock: the
      // isolated PostgreSQL container can differ from Windows by a millisecond.
      const before = (await fixture.pool.query('SELECT clock_timestamp() AS time')).rows[0].time as Date;
      const saved = await assignCoordinator(fixture.dependencies, {
        eventRequestId: id, actor: lead, input: { coordinatorId: blair.id, note: '  Blair knows the venue.  ' },
      });
      expect(saved).toEqual({ eventRequestId: id, assignmentId: expect.any(String), coordinatorId: blair.id, previousCoordinatorId: null });
      expect(await fixture.eventRow(id)).toMatchObject({ coordinator_id: blair.id, status });
      const rows = await assignmentRows(id);
      expect(rows).toEqual([expect.objectContaining({
        coordinator_id: blair.id, assigned_by: lead.id, assignment_method: 'MANUAL', note: 'Blair knows the venue.', unassigned_at: null,
      })]);
      const after = (await fixture.pool.query('SELECT clock_timestamp() AS time')).rows[0].time as Date;
      expect(rows[0].assigned_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(rows[0].assigned_at.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(await fixture.history(id)).toEqual(originalHistory);
      expect(await fixture.notifications(id)).toEqual([]); // KAN-64 integration remains pending.
    },
  );

  it('preserves existing initial assignments on both same-target retry and attempted handover', async () => {
    const id = await fixture.createEvent({ organiserId: organiser.id });
    await assign(id);
    const before = await snapshot(id);
    for (const target of [alex, blair]) {
      await expect(assign(id, target.id, otherLead)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'COORDINATOR_ALREADY_ASSIGNED' });
      expect(await snapshot(id)).toEqual(before);
    }
  });

  it('preserves an existing assignment without history instead of inventing a replacement record', async () => {
    const id = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: alex.id });
    const before = await snapshot(id);
    await expect(assign(id, blair.id)).rejects.toMatchObject({ code: 'COORDINATOR_ALREADY_ASSIGNED' });
    expect(await snapshot(id)).toEqual(before);
  });

  it('preserves inconsistent active assignment history instead of closing or overwriting it', async () => {
    const id = await fixture.createEvent({ organiserId: organiser.id });
    await fixture.pool.query('INSERT INTO coordinator_assignments (event_request_id, coordinator_id, assigned_by) VALUES ($1, $2, $3)', [id, blair.id, lead.id]);
    const before = await snapshot(id);
    await expect(assign(id)).rejects.toMatchObject({ code: 'ASSIGNMENT_HISTORY_CONFLICT' });
    expect(await snapshot(id)).toEqual(before);
  });

  it.each(['DRAFT', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const)('rejects a %s request without changing it', async (status) => {
    const id = await fixture.createEvent({ organiserId: organiser.id, status });
    const before = await snapshot(id);
    await expect(assign(id)).rejects.toMatchObject({ code: status === 'DRAFT' ? 'EVENT_REQUEST_NOT_FOUND' : 'ASSIGNMENT_NOT_ALLOWED' });
    expect(await snapshot(id)).toEqual(before);
  });

  it('rejects unavailable, missing and non-coordinator targets without writes', async () => {
    const id = await fixture.createEvent({ organiserId: organiser.id });
    const before = await snapshot(id);
    for (const targetId of [unavailable.id, organiser.id, lead.id, randomUUID()]) {
      await expect(assign(id, targetId)).rejects.toMatchObject({ code: 'INVALID_COORDINATOR' });
      expect(await snapshot(id)).toEqual(before);
    }
  });

  it('rechecks a target whose role changed after the options were read', async () => {
    const target = await fixture.createUser('EVENT_COORDINATOR');
    await fixture.pool.query('UPDATE app_users SET coordinator_available = true WHERE id = $1', [target.id]);
    expect((await listCoordinators(fixture.dependencies, lead)).some((item) => item.id === target.id)).toBe(true);
    await fixture.pool.query("UPDATE app_users SET role = 'VENUE_STAFF' WHERE id = $1", [target.id]);
    const id = await fixture.createEvent({ organiserId: organiser.id });
    const before = await snapshot(id);
    await expect(assign(id, target.id)).rejects.toMatchObject({ code: 'INVALID_COORDINATOR' });
    expect(await snapshot(id)).toEqual(before);
  });

  it.each(['availability', 'role'] as const)('waits for a concurrent target %s change before validating eligibility', async (change) => {
    const target = await fixture.createUser('EVENT_COORDINATOR');
    await fixture.pool.query('UPDATE app_users SET coordinator_available = true WHERE id = $1', [target.id]);
    const id = await fixture.createEvent({ organiserId: organiser.id });
    const before = await snapshot(id);
    const editor = await fixture.pool.connect();
    let pending: Promise<PromiseSettledResult<Awaited<ReturnType<typeof assign>>>[]> | undefined;
    let results: PromiseSettledResult<Awaited<ReturnType<typeof assign>>>[] = [];
    try {
      await editor.query('BEGIN');
      await editor.query(change === 'availability'
        ? 'UPDATE app_users SET coordinator_available = false WHERE id = $1'
        : "UPDATE app_users SET role = 'VENUE_STAFF' WHERE id = $1", [target.id]);
      pending = Promise.allSettled([assign(id, target.id)]);
      await expect.poll(async () => (await fixture.pool.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE application_name = current_setting('application_name') AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()`)).rows[0].count,
      { timeout: 3000 }).toBe(1);
      await editor.query('COMMIT');
    } finally {
      await editor.query('ROLLBACK');
      editor.release(true);
      if (pending) results = await pending;
    }
    expect(results).toEqual([expect.objectContaining({ status: 'rejected', reason: expect.objectContaining({ code: 'INVALID_COORDINATOR' }) })]);
    expect(await snapshot(id)).toEqual(before);
  });

  it('denies organisers and ordinary coordinators the former self-assignment API', async () => {
    const id = await fixture.createEvent({ organiserId: organiser.id });
    const before = await snapshot(id);
    for (const actor of [organiser, alex]) {
      await expect(assign(id, alex.id, actor)).rejects.toMatchObject({ kind: 'FORBIDDEN', code: 'ASSIGNMENT_FORBIDDEN' });
    }
    expect(await snapshot(id)).toEqual(before);
  });

  it('scopes history to Leads overseeing active events, the owner and the assigned coordinator', async () => {
    const id = await fixture.createEvent({ organiserId: organiser.id });
    await assign(id, blair.id);
    for (const actor of [lead, otherLead, organiser, blair]) {
      expect(await listAssignments(fixture.dependencies, { eventRequestId: id, actor }))
        .toEqual([expect.objectContaining({ coordinatorId: blair.id, assignedById: lead.id, assignmentMethod: 'MANUAL' })]);
    }
    for (const actor of [alex, otherOrganiser]) {
      await expect(listAssignments(fixture.dependencies, { eventRequestId: id, actor })).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
    const unassigned = await fixture.createEvent({ organiserId: organiser.id });
    await expect(listAssignments(fixture.dependencies, { eventRequestId: unassigned, actor: alex })).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(await listAssignments(fixture.dependencies, { eventRequestId: unassigned, actor: lead })).toEqual([]);
  });

  it('reports a missing request as not found', async () => {
    await expect(assign(randomUUID())).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });

  it('rolls back history when the event update fails and permits one clean retry', async () => {
    const id = await fixture.createEvent({ organiserId: organiser.id });
    const before = await snapshot(id);
    await fixture.pool.query(`CREATE FUNCTION reject_test_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected assignment-save failure'; END $$;
      CREATE TRIGGER reject_test_assignment BEFORE UPDATE OF coordinator_id ON event_requests
      FOR EACH ROW EXECUTE FUNCTION reject_test_assignment();`);
    try {
      await expect(assign(id)).rejects.toThrow('Injected assignment-save failure');
      expect(await snapshot(id)).toEqual(before);
    } finally {
      await fixture.pool.query('DROP TRIGGER reject_test_assignment ON event_requests; DROP FUNCTION reject_test_assignment()');
    }
    await assign(id);
    expect(await assignmentRows(id)).toHaveLength(1);
  });

  it('row-locks competing Lead allocations: one winner, one clear conflict, one matching history entry', async () => {
    const id = await fixture.createEvent({ organiserId: organiser.id });
    const blocker = await fixture.pool.connect();
    let pending: Promise<PromiseSettledResult<Awaited<ReturnType<typeof assign>>>[]> | undefined;
    let results: PromiseSettledResult<Awaited<ReturnType<typeof assign>>>[] = [];
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM event_requests WHERE id = $1 FOR UPDATE', [id]);
      pending = Promise.allSettled([assign(id, alex.id, lead), assign(id, blair.id, otherLead)]);
      await expect.poll(async () => (await fixture.pool.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE application_name = current_setting('application_name') AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()`)).rows[0].count,
      { timeout: 3000 }).toBe(2);
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release(true);
      if (pending) results = await pending;
    }
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({ reason: { code: 'COORDINATOR_ALREADY_ASSIGNED' } });
    const winner = results.find((result) => result.status === 'fulfilled');
    expect(winner?.status).toBe('fulfilled');
    if (winner?.status !== 'fulfilled') throw new Error('Expected one committed assignment.');
    expect((await fixture.eventRow(id)).coordinator_id).toBe(winner.value.coordinatorId);
    expect(await assignmentRows(id)).toEqual([expect.objectContaining({
      coordinator_id: winner.value.coordinatorId,
      assigned_by: winner.value.coordinatorId === alex.id ? lead.id : otherLead.id,
      unassigned_at: null,
    })]);
  });
});
