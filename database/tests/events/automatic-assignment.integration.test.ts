import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../backend/src/app.js';
import { listAssignments } from '../../../backend/src/modules/events/assignment.js';
import { isAssignedCoordinator } from '../../../backend/src/modules/events/coordinator-access.js';
import { submitEventRequest } from '../../../backend/src/modules/events/submit-request.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
let organiser: WorkflowActor;
beforeAll(async () => { fixture = await createWorkflowFixture(); });
beforeEach(async () => {
  // Only this file's disposable test schema is cleared.
  await fixture.pool.query('DELETE FROM notifications');
  await fixture.pool.query('DELETE FROM event_requests');
  await fixture.pool.query('DELETE FROM app_users');
  organiser = await fixture.createUser('EVENT_ORGANISER', 'Organiser');
});
afterAll(async () => { await fixture?.destroy(); });

const draft = () => fixture.createEvent({ organiserId: organiser.id, status: 'DRAFT' });
const submit = (eventRequestId: string, actor: WorkflowActor | null = organiser) =>
  submitEventRequest(fixture.dependencies, { eventRequestId, actor });
async function snapshot(eventRequestId: string) {
  return {
    event: (await fixture.pool.query('SELECT * FROM event_requests WHERE id = $1', [eventRequestId])).rows[0],
    assignments: (await fixture.pool.query('SELECT * FROM coordinator_assignments WHERE event_request_id = $1 ORDER BY id', [eventRequestId])).rows,
    reviews: (await fixture.pool.query('SELECT * FROM event_reviews WHERE event_request_id = $1', [eventRequestId])).rows,
    history: await fixture.history(eventRequestId), notifications: await fixture.notifications(eventRequestId),
  };
}
function appFor(actor: WorkflowActor) {
  return createApp({ database: fixture.pool, submittedRequests: {
    pool: fixture.pool, authenticate: async () => actor,
    canViewRequest: isAssignedCoordinator, canReviewRequest: isAssignedCoordinator,
  } });
}

// KAN-79 supersedes the original KAN-29 submission allocation policy. Historical
// automatic rows remain valid; neither their data nor Sprint 2 evidence is rewritten.
describe('KAN-79 submission policy supersedes KAN-29 without erasing assignment history', () => {
  it.each(['none', 'unavailable', 'available'] as const)(
    'submits without automatic assignment when coordinator availability is %s', async (availability) => {
      if (availability !== 'none') {
        const coordinator = await fixture.createUser('EVENT_COORDINATOR');
        await fixture.pool.query('UPDATE app_users SET coordinator_available = $1 WHERE id = $2', [availability === 'available', coordinator.id]);
      }
      const id = await draft();
      const response = await request(appFor(organiser)).post(`/api/events/${id}/submit`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id, status: 'SUBMITTED', coordinatorId: null });
      const saved = await snapshot(id);
      expect(saved.event).toMatchObject({ status: 'SUBMITTED', coordinator_id: null });
      expect(saved.assignments).toEqual([]);
      expect(saved.reviews).toEqual([]);
      expect(saved.notifications).toEqual([]); // Notification integration belongs to KAN-64.
      expect(saved.history).toEqual([
        { from_status: null, to_status: 'DRAFT', changed_by: null },
        { from_status: 'DRAFT', to_status: 'SUBMITTED', changed_by: organiser.id },
      ]);
    },
  );

  it('leaves existing automatic assignments and their history unchanged when a new draft is submitted', async () => {
    const coordinator = await fixture.createUser('EVENT_COORDINATOR');
    const existing = await fixture.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id });
    await fixture.pool.query(`INSERT INTO coordinator_assignments
      (event_request_id, coordinator_id, assigned_by, assignment_method, assigned_at)
      VALUES ($1, $2, NULL, 'AUTOMATIC', '2026-09-25T00:00:00Z')`, [existing, coordinator.id]);
    const before = await snapshot(existing);
    expect((await submit(await draft())).coordinatorId).toBeNull();
    expect(await snapshot(existing)).toEqual(before);
    const history = await listAssignments(fixture.dependencies, { eventRequestId: existing, actor: organiser });
    expect(history).toEqual([expect.objectContaining({
      assignmentMethod: 'AUTOMATIC', coordinatorId: coordinator.id,
      assignedById: null, assignedByName: null, assignedAt: '2026-09-25T00:00:00.000Z', unassignedAt: null,
    })]);
    expect((await request(appFor(coordinator)).get(`/api/events/${existing}`)).status).toBe(200);
  });

  it('validates completeness before changing the draft and leaves unrelated requests unchanged', async () => {
    const id = await draft();
    const untouched = await draft();
    await fixture.pool.query('UPDATE event_requests SET purpose = NULL WHERE id = $1', [id]);
    const before = await snapshot(id);
    const otherBefore = await snapshot(untouched);
    await expect(submit(id)).rejects.toMatchObject({ missingFields: ['purpose'] });
    expect(await snapshot(id)).toEqual(before);
    expect(await snapshot(untouched)).toEqual(otherBefore);
  });

  it.each(['signed out', 'other organiser', 'coordinator', 'lead'] as const)(
    'does not submit for an unauthorised %s', async (kind) => {
      const actor = kind === 'signed out' ? null : await fixture.createUser(
        kind === 'coordinator' ? 'EVENT_COORDINATOR' : kind === 'lead' ? 'EVENT_COORDINATOR_LEAD' : 'EVENT_ORGANISER',
      );
      const id = await draft();
      const before = await snapshot(id);
      await expect(submit(id, actor)).rejects.toMatchObject({ code: 'SUBMIT_FORBIDDEN' });
      expect(await snapshot(id)).toEqual(before);
    },
  );

  it.each(['coordinator', 'history'] as const)('preserves and reports an inconsistent draft with existing %s', async (existing) => {
    const coordinator = await fixture.createUser('EVENT_COORDINATOR');
    const id = await draft();
    if (existing === 'coordinator') {
      await fixture.pool.query('UPDATE event_requests SET coordinator_id = $1 WHERE id = $2', [coordinator.id, id]);
    } else {
      await fixture.pool.query('INSERT INTO coordinator_assignments (event_request_id, coordinator_id, assigned_by) VALUES ($1, $2, $2)', [id, coordinator.id]);
    }
    const before = await snapshot(id);
    const response = await request(appFor(organiser)).post(`/api/events/${id}/submit`);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DRAFT_ALREADY_ASSIGNED');
    expect(await snapshot(id)).toEqual(before);
  });

  it('rolls back submission and status history when saving fails, then allows a clean retry', async () => {
    const id = await draft();
    const before = await snapshot(id);
    await fixture.pool.query(`CREATE FUNCTION reject_test_submission() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected event-save failure'; END $$;
      CREATE TRIGGER reject_test_submission BEFORE UPDATE OF status ON event_requests
        FOR EACH ROW WHEN (NEW.status = 'SUBMITTED') EXECUTE FUNCTION reject_test_submission();`);
    try {
      await expect(submit(id)).rejects.toThrow('Injected event-save failure');
      expect(await snapshot(id)).toEqual(before);
    } finally {
      await fixture.pool.query('DROP TRIGGER reject_test_submission ON event_requests; DROP FUNCTION reject_test_submission()');
    }
    expect(await submit(id)).toMatchObject({ status: 'SUBMITTED', coordinatorId: null });
    expect((await snapshot(id)).assignments).toEqual([]);
  });

  it('rejects repeated submission without creating assignment or duplicate status history', async () => {
    const id = await draft();
    await submit(id);
    const before = await snapshot(id);
    await expect(submit(id)).rejects.toMatchObject({ code: 'REQUEST_NOT_SUBMITTABLE' });
    expect(await snapshot(id)).toEqual(before);
    expect(before.assignments).toEqual([]);
    expect(before.history.filter((row) => row.to_status === 'SUBMITTED')).toHaveLength(1);
  });
});
