import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import { assignCoordinator, listAssignments } from '../../../backend/src/modules/events/assignment.js';
import { isAssignedCoordinator } from '../../../backend/src/modules/events/coordinator-access.js';
import { submitEventRequest } from '../../../backend/src/modules/events/submit-request.js';
import type { EventRecord } from '../../../backend/src/modules/events/types.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
const firstCoordinatorId = '10000000-0000-4000-8000-000000000001';
const secondCoordinatorId = '10000000-0000-4000-8000-000000000002';

beforeAll(async () => { fixture = await createWorkflowFixture(); });
beforeEach(async () => {
  // The fixture pool points only at this file's temporary schema, never public.
  await fixture.pool.query('DELETE FROM notifications');
  await fixture.pool.query('DELETE FROM event_requests');
  await fixture.pool.query('DELETE FROM app_users');
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Organiser');
});
afterAll(async () => { await fixture?.destroy(); });

async function coordinator(id: string, available?: boolean): Promise<WorkflowActor> {
  const columns = available === undefined ? '' : ', coordinator_available';
  const placeholder = available === undefined ? '' : ', $3';
  await fixture.pool.query(
    `INSERT INTO app_users (id, email, display_name, role${columns})
     VALUES ($1, $2, $2, 'EVENT_COORDINATOR'${placeholder})`,
    available === undefined ? [id, `${id}@example.test`] : [id, `${id}@example.test`, available],
  );
  return { id, role: 'EVENT_COORDINATOR' };
}

const draft = () => fixture.createEvent({ organiserId: organiser.id, status: 'DRAFT' });
const submit = (eventRequestId: string, actor: WorkflowActor | null = organiser) =>
  submitEventRequest(fixture.dependencies, { eventRequestId, actor });

async function assignmentRows(eventRequestId: string) {
  const result = await fixture.pool.query<{
    coordinator_id: string; assigned_by: string | null;
    assignment_method: 'AUTOMATIC' | 'MANUAL'; active: boolean;
  }>(
    `SELECT coordinator_id, assigned_by, assignment_method, unassigned_at IS NULL AS active
     FROM coordinator_assignments WHERE event_request_id = $1 ORDER BY assigned_at, id`,
    [eventRequestId],
  );
  return result.rows;
}

async function snapshot(eventRequestId: string) {
  const event = await fixture.pool.query('SELECT * FROM event_requests WHERE id = $1', [eventRequestId]);
  const reviews = await fixture.pool.query('SELECT * FROM event_reviews WHERE event_request_id = $1', [eventRequestId]);
  return {
    event: event.rows[0], assignments: await assignmentRows(eventRequestId),
    history: await fixture.history(eventRequestId), reviews: reviews.rows,
    notifications: await fixture.notifications(eventRequestId),
  };
}

function appFor(actor: WorkflowActor) {
  return createApp({
    database: fixture.pool,
    submittedRequests: {
      pool: fixture.pool, authenticate: async () => actor,
      canViewRequest: isAssignedCoordinator, canReviewRequest: isAssignedCoordinator,
    },
  });
}

/** Hold a real database lock until both submissions demonstrably contend, without sleeps. */
async function contendingSubmissions(eventIds: string[], lockSql: string, lockId: string) {
  const blocker = await fixture.pool.connect();
  let pending: Promise<PromiseSettledResult<EventRecord>[]> | undefined;
  let results: PromiseSettledResult<EventRecord>[] = [];
  try {
    await blocker.query('BEGIN');
    await blocker.query(lockSql, [lockId]);
    pending = Promise.allSettled(eventIds.map((id) => submit(id)));
    await expect.poll(async () => {
      const waiting = await fixture.pool.query<{ count: number }>(`
        SELECT count(*)::integer AS count FROM pg_stat_activity
        WHERE application_name = current_setting('application_name')
          AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()
      `);
      return waiting.rows[0]!.count;
    }, { timeout: 3_000 }).toBe(2);
  } finally {
    try {
      await blocker.query('ROLLBACK');
    } finally {
      blocker.release(true);
      if (pending) results = await pending;
    }
  }
  return results;
}

describe('KAN-29 automatic coordinator assignment persistence', () => {
  it('starts coordinators unavailable and keeps a failed submission editable until someone opts in', async () => {
    const candidate = await coordinator(firstCoordinatorId);
    const availability = await fixture.pool.query('SELECT coordinator_available FROM app_users WHERE id = $1', [candidate.id]);
    expect(availability.rows[0].coordinator_available).toBe(false);
    const id = await draft();
    const before = await snapshot(id);

    const failed = await request(appFor(organiser)).post(`/api/events/${id}/submit`);
    expect(failed.status).toBe(409);
    expect(failed.body.error.code).toBe('NO_AVAILABLE_COORDINATOR');
    expect(await snapshot(id)).toEqual(before);

    await fixture.pool.query('UPDATE app_users SET coordinator_available = true WHERE id = $1', [candidate.id]);
    expect(await submit(id)).toMatchObject({ id, status: 'SUBMITTED', coordinatorId: candidate.id });
  });

  it('does not submit when there are no coordinator profiles', async () => {
    const id = await draft();
    const before = await snapshot(id);
    await expect(submit(id)).rejects.toMatchObject({ code: 'NO_AVAILABLE_COORDINATOR' });
    expect(await snapshot(id)).toEqual(before);
  });

  it('ignores unavailable coordinators and available profiles with every non-coordinator role', async () => {
    await coordinator(firstCoordinatorId, false);
    const chosen = await coordinator(secondCoordinatorId, true);
    for (const role of ['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const) {
      const wrongRole = await fixture.createUser(role);
      await fixture.pool.query('UPDATE app_users SET coordinator_available = true WHERE id = $1', [wrongRole.id]);
    }
    // Each excluded profile has less work than the only eligible coordinator.
    await fixture.createEvent({ organiserId: organiser.id, coordinatorId: chosen.id });
    expect((await submit(await draft())).coordinatorId).toBe(chosen.id);
  });

  it('selects the least-loaded available coordinator ahead of the lower UUID', async () => {
    const busy = await coordinator(firstCoordinatorId, true);
    const quieter = await coordinator(secondCoordinatorId, true);
    for (let count = 0; count < 3; count += 1) {
      await fixture.createEvent({ organiserId: organiser.id, coordinatorId: busy.id });
    }
    await fixture.createEvent({ organiserId: organiser.id, coordinatorId: quieter.id });
    expect((await submit(await draft())).coordinatorId).toBe(quieter.id);
  });

  it('breaks equal-load ties by UUID regardless of profile creation or display-name order', async () => {
    await coordinator(secondCoordinatorId, true);
    await coordinator(firstCoordinatorId, true);
    await fixture.pool.query('UPDATE app_users SET display_name = $1 WHERE id = $2', ['Zoe', firstCoordinatorId]);
    await fixture.pool.query('UPDATE app_users SET display_name = $1 WHERE id = $2', ['Aaron', secondCoordinatorId]);
    expect((await submit(await draft())).coordinatorId).toBe(firstCoordinatorId);
  });

  it.each([
    ['SUBMITTED', secondCoordinatorId], ['UNDER_REVIEW', secondCoordinatorId],
    ['CLARIFICATION_REQUESTED', secondCoordinatorId], ['APPROVED', secondCoordinatorId],
    ['CONFIRMED', secondCoordinatorId], ['DRAFT', firstCoordinatorId],
    ['REJECTED', firstCoordinatorId], ['CANCELLED', firstCoordinatorId], ['COMPLETED', firstCoordinatorId],
  ] as const)('counts the %s state according to the active-workload policy', async (status, expected) => {
    await coordinator(firstCoordinatorId, true);
    await coordinator(secondCoordinatorId, true);
    await fixture.createEvent({ organiserId: organiser.id, coordinatorId: firstCoordinatorId, status });
    expect((await submit(await draft())).coordinatorId).toBe(expected);
  });

  it('records a system assignment on the correct request and grants only its coordinator queue/detail access', async () => {
    const chosen = await coordinator(firstCoordinatorId, true);
    const unrelated = await coordinator(secondCoordinatorId, false);
    const id = await draft();
    const untouchedId = await draft();
    const untouched = await snapshot(untouchedId);
    const response = await request(appFor(organiser)).post(`/api/events/${id}/submit`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id, status: 'SUBMITTED', coordinatorId: chosen.id });
    expect(await assignmentRows(id)).toEqual([
      { coordinator_id: chosen.id, assigned_by: null, assignment_method: 'AUTOMATIC', active: true },
    ]);
    expect(await snapshot(untouchedId)).toEqual(untouched);
    expect((await snapshot(id)).reviews).toEqual([]);
    expect(await fixture.notifications(id)).toEqual([]);
    expect(await fixture.history(id)).toEqual([
      { from_status: null, to_status: 'DRAFT', changed_by: null },
      { from_status: 'DRAFT', to_status: 'SUBMITTED', changed_by: organiser.id },
    ]);
    expect(await listAssignments(fixture.dependencies, { eventRequestId: id, actor: organiser }))
      .toEqual([expect.objectContaining({
        coordinatorId: chosen.id, assignmentMethod: 'AUTOMATIC', assignedById: null, assignedByName: null,
      })]);

    const assignedApp = appFor(chosen);
    const queue = await request(assignedApp).get('/api/events');
    expect(queue.status).toBe(200);
    expect(queue.body.items.map((item: { id: string }) => item.id)).toEqual([id]);
    const detail = await request(assignedApp).get(`/api/events/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ coordinatorId: chosen.id, status: 'SUBMITTED', review: null });
    expect(detail.body.actions.canMakeInitialDecision).toBe(true);
    const denied = await request(appFor(unrelated)).get(`/api/events/${id}`);
    expect(denied.status).toBe(404);
    const unrelatedQueue = await request(appFor(unrelated)).get('/api/events');
    expect(unrelatedQueue.body.items).toEqual([]);
  });

  it('validates completeness before assigning and leaves an incomplete draft unchanged', async () => {
    await coordinator(firstCoordinatorId, true);
    const id = await draft();
    await fixture.pool.query('UPDATE event_requests SET purpose = NULL WHERE id = $1', [id]);
    const before = await snapshot(id);
    await expect(submit(id)).rejects.toMatchObject({ missingFields: ['purpose'] });
    expect(await snapshot(id)).toEqual(before);
  });

  it.each(['signed out', 'other organiser', 'coordinator'] as const)('does not allocate for an unauthorised %s', async (kind) => {
    const candidate = await coordinator(firstCoordinatorId, true);
    const actor = kind === 'signed out' ? null : kind === 'coordinator'
      ? candidate : await fixture.createUser('EVENT_ORGANISER');
    const id = await draft();
    const before = await snapshot(id);
    await expect(submit(id, actor)).rejects.toMatchObject({ code: 'SUBMIT_FORBIDDEN' });
    expect(await snapshot(id)).toEqual(before);
  });

  it('does not overwrite an unexpected existing draft coordinator or active history entry', async () => {
    const candidate = await coordinator(firstCoordinatorId, true);
    for (const existing of ['coordinator', 'history'] as const) {
      const id = await draft();
      if (existing === 'coordinator') {
        await fixture.pool.query('UPDATE event_requests SET coordinator_id = $1 WHERE id = $2', [candidate.id, id]);
      } else {
        await fixture.pool.query(
          'INSERT INTO coordinator_assignments (event_request_id, coordinator_id, assigned_by) VALUES ($1, $2, $2)',
          [id, candidate.id],
        );
      }
      const before = await snapshot(id);
      const response = await request(appFor(organiser)).post(`/api/events/${id}/submit`);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DRAFT_ALREADY_ASSIGNED');
      expect(await snapshot(id)).toEqual(before);
    }
  });

  it('rolls back assignment history if saving the submitted event fails', async () => {
    await coordinator(firstCoordinatorId, true);
    const id = await draft();
    const before = await snapshot(id);
    await fixture.pool.query(`
      CREATE FUNCTION reject_test_submission() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected event-save failure'; END $$;
      CREATE TRIGGER reject_test_submission BEFORE UPDATE OF status ON event_requests
        FOR EACH ROW WHEN (NEW.status = 'SUBMITTED') EXECUTE FUNCTION reject_test_submission();
    `);
    try {
      await expect(submit(id)).rejects.toThrow('Injected event-save failure');
      expect(await snapshot(id)).toEqual(before);
    } finally {
      await fixture.pool.query('DROP TRIGGER reject_test_submission ON event_requests; DROP FUNCTION reject_test_submission()');
    }
    // A retry after the failure is fixed must allocate once, not find stale history.
    expect((await submit(id)).coordinatorId).toBe(firstCoordinatorId);
    expect(await assignmentRows(id)).toHaveLength(1);
  });

  it('retains the first assignment and single history record when submission is retried', async () => {
    await coordinator(firstCoordinatorId, true);
    await coordinator(secondCoordinatorId, true);
    const id = await draft();
    await submit(id);
    const before = await snapshot(id);
    await expect(submit(id)).rejects.toMatchObject({ code: 'REQUEST_NOT_SUBMITTABLE' });
    expect(await snapshot(id)).toEqual(before);
  });

  it('commits one assignment when two submissions contend on the same draft', async () => {
    await coordinator(firstCoordinatorId, true);
    await coordinator(secondCoordinatorId, true);
    const id = await draft();
    const results = await contendingSubmissions(
      [id, id], 'SELECT id FROM event_requests WHERE id = $1 FOR UPDATE', id,
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected'))
      .toMatchObject({ reason: { code: 'REQUEST_NOT_SUBMITTABLE' } });
    expect(await assignmentRows(id)).toHaveLength(1);
    expect((await fixture.history(id)).filter((entry) => entry.to_status === 'SUBMITTED')).toHaveLength(1);
  });

  it('uses the committed workload when different drafts contend for tied coordinators', async () => {
    await coordinator(firstCoordinatorId, true);
    await coordinator(secondCoordinatorId, true);
    const ids = [await draft(), await draft()];
    const results = await contendingSubmissions(
      ids, 'SELECT id FROM app_users WHERE id = $1 FOR NO KEY UPDATE', firstCoordinatorId,
    );
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    const rows = await Promise.all(ids.map((id) => fixture.eventRow(id)));
    expect(rows.map((row) => row.coordinator_id).sort()).toEqual([firstCoordinatorId, secondCoordinatorId]);
    expect(rows.every((row) => row.status === 'SUBMITTED')).toBe(true);
    for (const id of ids) expect(await assignmentRows(id)).toHaveLength(1);
  });

  it('waits for a competing initial manual assignment and counts its committed workload', async () => {
    const initial = await coordinator(firstCoordinatorId, true);
    await coordinator(secondCoordinatorId, true);
    const manualEventId = await fixture.createEvent({ organiserId: organiser.id });
    const automaticEventId = await draft();
    expect((await fixture.eventRow(manualEventId)).coordinator_id).toBeNull();
    let resumeCommit!: () => void;
    let reportCommit!: () => void;
    const commitGate = new Promise<void>((resolve) => { resumeCommit = resolve; });
    const reachedCommit = new Promise<void>((resolve) => { reportCommit = resolve; });

    // Run the actual manual service and real queries, pausing only its COMMIT.
    // This proves it holds the shared coordinator locks, not just an event-row lock.
    const manualPool = new Proxy(fixture.pool, {
      get(target, key) {
        if (key === 'connect') return async () => {
          const client = await target.connect();
          return new Proxy(client, {
            get(connection, property) {
              if (property === 'query') return async (...args: unknown[]) => {
                if (args[0] === 'COMMIT') {
                  reportCommit();
                  await commitGate;
                }
                return Reflect.apply(connection.query, connection, args);
              };
              const value = Reflect.get(connection, property);
              return typeof value === 'function' ? value.bind(connection) : value;
            },
          });
        };
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });

    // Attach rejection handlers immediately so failed setup also settles both services.
    const manual = Promise.allSettled([assignCoordinator({ pool: manualPool }, {
      eventRequestId: manualEventId, actor: initial, input: { coordinatorId: initial.id },
    })]);
    let automatic: Promise<PromiseSettledResult<EventRecord>[]> | undefined;
    try {
      await Promise.race([
        reachedCommit,
        manual.then(([result]) => {
          if (result?.status === 'rejected') throw result.reason;
          throw new Error('The manual assignment finished without reaching the commit barrier.');
        }),
      ]);
      automatic = Promise.allSettled([submit(automaticEventId)]);
      await expect.poll(async () => {
        const waiting = await fixture.pool.query<{ count: number }>(`
          SELECT count(*)::integer AS count FROM pg_stat_activity
          WHERE application_name = current_setting('application_name')
            AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()
        `);
        return waiting.rows[0]!.count;
      }, { timeout: 3_000 }).toBe(1);
    } finally {
      resumeCommit();
      await Promise.all([manual, automatic]);
    }

    expect(await manual).toEqual([expect.objectContaining({
      status: 'fulfilled', value: expect.objectContaining({ coordinatorId: firstCoordinatorId }),
    })]);
    expect(await automatic).toEqual([expect.objectContaining({
      status: 'fulfilled', value: expect.objectContaining({ coordinatorId: secondCoordinatorId, status: 'SUBMITTED' }),
    })]);
    expect(await assignmentRows(manualEventId)).toEqual([
      { coordinator_id: firstCoordinatorId, assigned_by: initial.id, assignment_method: 'MANUAL', active: true },
    ]);
    expect(await assignmentRows(automaticEventId)).toEqual([
      { coordinator_id: secondCoordinatorId, assigned_by: null, assignment_method: 'AUTOMATIC', active: true },
    ]);
    expect(await fixture.notifications(manualEventId)).toEqual([]);
    expect(await fixture.notifications(automaticEventId)).toEqual([]);
  });

  it('keeps an automatic assignment when availability changes and rejects manual handover', async () => {
    const initial = await coordinator(firstCoordinatorId, true);
    const replacement = await coordinator(secondCoordinatorId, false);
    const id = await draft();
    await submit(id);
    await fixture.pool.query('UPDATE app_users SET coordinator_available = false WHERE id = $1', [initial.id]);
    const before = await snapshot(id);
    expect((await fixture.eventRow(id)).coordinator_id).toBe(initial.id);
    expect((await request(appFor(initial)).get(`/api/events/${id}`)).status).toBe(200);

    // An unrelated coordinator cannot take over an existing assignment.
    await expect(assignCoordinator(fixture.dependencies, {
      eventRequestId: id, actor: replacement, input: { coordinatorId: replacement.id },
    })).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    await expect(assignCoordinator(fixture.dependencies, {
      eventRequestId: id, actor: initial, input: { coordinatorId: replacement.id },
    })).rejects.toMatchObject({ kind: 'CONFLICT', code: 'REASSIGNMENT_NOT_AVAILABLE' });
    expect(await snapshot(id)).toEqual(before);
    expect((await request(appFor(initial)).get(`/api/events/${id}`)).status).toBe(200);
    expect((await request(appFor(replacement)).get(`/api/events/${id}`)).status).toBe(404);
    const history = await listAssignments(fixture.dependencies, { eventRequestId: id, actor: organiser });
    expect(history).toEqual([
      expect.objectContaining({
        coordinatorId: initial.id, assignmentMethod: 'AUTOMATIC', assignedByName: null, unassignedAt: null,
      }),
    ]);
  });
});
