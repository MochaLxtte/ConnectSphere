import type { PoolClient } from 'pg';
import type { EventStatus } from './types.js';

/** Active workload includes review and planning, but excludes drafts and closed events. */
const ACTIVE_STATUSES: readonly EventStatus[] = [
  'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED',
];

export class AutomaticAssignmentError extends Error {
  constructor(
    public readonly code: 'NO_AVAILABLE_COORDINATOR' | 'DRAFT_ALREADY_ASSIGNED',
    message: string,
  ) {
    super(message);
    this.name = 'AutomaticAssignmentError';
  }
}

/**
 * Called after locking the event, inside a READ COMMITTED transaction. Automatic and
 * manual assignment writers lock the same coordinator rows in UUID order. NO KEY UPDATE
 * permits foreign-key checks while preventing simultaneous workload allocations.
 */
export async function lockCoordinators(client: Pick<PoolClient, 'query'>) {
  const candidates = await client.query<{ id: string; available: boolean }>(`
    SELECT id, coordinator_available AS available FROM app_users
    WHERE role = 'EVENT_COORDINATOR' ORDER BY id FOR NO KEY UPDATE
  `);
  return candidates.rows;
}

/** Choose and record an initial assignment; the caller saves coordinator_id and commits. */
export async function assignInitialCoordinator(
  client: Pick<PoolClient, 'query'>,
  event: { id: string; coordinatorId: string | null },
): Promise<string> {
  const existing = await client.query(
    'SELECT 1 FROM coordinator_assignments WHERE event_request_id = $1 AND unassigned_at IS NULL',
    [event.id],
  );
  if (event.coordinatorId !== null || existing.rows.length > 0) {
    throw new AutomaticAssignmentError(
      'DRAFT_ALREADY_ASSIGNED',
      'This draft already has a coordinator assignment. Ask the team to check its assignment before submitting.',
    );
  }

  const candidates = await lockCoordinators(client);
  const eligibleIds = candidates.filter((candidate) => candidate.available).map((candidate) => candidate.id);
  // Use a separate statement AFTER waiting for locks, so READ COMMITTED sees the
  // previous allocation's committed workload. Never combine this count with the lock query.
  const selected = await client.query<{ id: string }>(`
    SELECT u.id FROM app_users u
    LEFT JOIN event_requests e ON e.coordinator_id = u.id AND e.status = ANY($2::text[])
    WHERE u.id = ANY($1::uuid[])
    GROUP BY u.id ORDER BY count(e.id), u.id LIMIT 1
  `, [eligibleIds, ACTIVE_STATUSES]);
  const coordinator = selected.rows[0];
  if (!coordinator) {
    throw new AutomaticAssignmentError(
      'NO_AVAILABLE_COORDINATOR',
      'No event coordinator is currently available. Your request is still a draft. Please try again later.',
    );
  }

  await client.query(`
    INSERT INTO coordinator_assignments
      (event_request_id, coordinator_id, assigned_by, assignment_method)
    VALUES ($1, $2, NULL, 'AUTOMATIC')
  `, [event.id, coordinator.id]);
  return coordinator.id;
}
