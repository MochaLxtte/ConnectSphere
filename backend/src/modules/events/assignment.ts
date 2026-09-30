import type { UserRole } from '../auth/types.js';
import type { EventStatus } from './types.js';
import { lockCoordinators } from './automatic-assignment.js';
import {
  inActorTransaction, iso, isoOrNull, lockEventRequest, optionalText,
  parseObjectBody, readEventRequest, requestNotFound, requireRelation, UUID_PATTERN, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from './workflow-support.js';

/**
 * Manual initial assignment supports the Sprint 2 self/other-coordinator decision:
 * - any Event Coordinator may see unassigned requests in the current review/planning scope;
 * - any Event Coordinator may assign an unassigned request to themself or a colleague;
 * - an existing assignment cannot be replaced; handover is future KAN-65 work;
 * - drafts, rejected requests and later lifecycle states cannot be assigned.
 * Coordinators unrelated to an already-assigned request get the same 404 as a missing one.
 */
const ASSIGNABLE_STATUSES: readonly EventStatus[] = [
  'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED',
];

export interface UnassignedRequest {
  id: string;
  name: string | null;
  status: EventStatus;
  organiserName: string;
  startsAt: string | null;
  endsAt: string | null;
  expectedAttendance: number | null;
  updatedAt: string;
}

export interface CoordinatorOption {
  id: string;
  displayName: string;
  email: string;
}

export interface AssignmentRecord {
  id: string;
  coordinatorId: string;
  coordinatorName: string;
  assignmentMethod: 'AUTOMATIC' | 'MANUAL';
  assignedById: string | null;
  assignedByName: string | null;
  note: string | null;
  assignedAt: string;
  unassignedAt: string | null;
}

export interface AssignmentInput {
  coordinatorId: string;
  note: string | null;
}

function requireCoordinator(actor: WorkflowActor): void {
  if (actor.role !== 'EVENT_COORDINATOR') {
    throw new WorkflowError('FORBIDDEN', 'ASSIGNMENT_FORBIDDEN', 'Only event coordinators can manage assignments.');
  }
}

export function parseAssignmentInput(input: unknown): AssignmentInput {
  const body = parseObjectBody(input, ['coordinatorId', 'note']);
  if (typeof body.coordinatorId !== 'string' || !UUID_PATTERN.test(body.coordinatorId)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_ASSIGNMENT_INPUT', 'coordinatorId must be a UUID.');
  }
  return { coordinatorId: body.coordinatorId.toLowerCase(), note: optionalText(body, 'note') };
}

/** Unassigned requests in the supported review/planning states. */
export async function listUnassignedRequests(
  { pool }: WorkflowDependencies,
  actor: WorkflowActor,
): Promise<UnassignedRequest[]> {
  requireCoordinator(actor);
  const found = await pool.query<Omit<UnassignedRequest, 'startsAt' | 'endsAt' | 'updatedAt'> & {
    startsAt: Date | null; endsAt: Date | null; updatedAt: Date;
  }>(
    `SELECT e.id, e.name, e.status, u.display_name AS "organiserName", e.starts_at AS "startsAt",
            e.ends_at AS "endsAt", e.expected_attendance AS "expectedAttendance",
            e.updated_at AS "updatedAt"
     FROM event_requests e JOIN app_users u ON u.id = e.organiser_id
     WHERE e.coordinator_id IS NULL AND e.status = ANY($1::text[])
     ORDER BY e.updated_at ASC, e.id ASC`,
    [ASSIGNABLE_STATUSES],
  );
  return found.rows.map((row) => ({
    ...row,
    startsAt: isoOrNull(row.startsAt),
    endsAt: isoOrNull(row.endsAt),
    updatedAt: iso(row.updatedAt),
  }));
}

export async function listCoordinators(
  { pool }: WorkflowDependencies,
  actor: WorkflowActor,
): Promise<CoordinatorOption[]> {
  requireCoordinator(actor);
  const found = await pool.query<CoordinatorOption>(
    `SELECT id, display_name AS "displayName", email FROM app_users
     WHERE role = 'EVENT_COORDINATOR' ORDER BY lower(display_name), id`,
  );
  return found.rows;
}

export interface AssignmentResult {
  eventRequestId: string;
  assignmentId: string;
  coordinatorId: string;
  previousCoordinatorId: string | null;
}

/** Record a manual initial assignment without replacing an existing assignment or history. */
export async function assignCoordinator(
  { pool }: WorkflowDependencies,
  command: { eventRequestId: string; actor: WorkflowActor; input: unknown },
): Promise<AssignmentResult> {
  const { eventRequestId, actor } = command;
  const input = parseAssignmentInput(command.input);
  requireCoordinator(actor);

  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    // Hide drafts and other coordinators' requests before revealing any state conflict.
    if (event.status === 'DRAFT') throw requestNotFound();
    if (event.coordinatorId !== null && event.coordinatorId !== actor.id) throw requestNotFound();
    if (!ASSIGNABLE_STATUSES.includes(event.status)) {
      throw new WorkflowError('CONFLICT', 'ASSIGNMENT_NOT_ALLOWED', 'An event request in this status cannot be assigned.');
    }
    if (event.coordinatorId === input.coordinatorId) {
      throw new WorkflowError('CONFLICT', 'COORDINATOR_ALREADY_ASSIGNED', 'This coordinator is already assigned to the request.');
    }
    if (event.coordinatorId !== null) {
      throw new WorkflowError('CONFLICT', 'REASSIGNMENT_NOT_AVAILABLE', 'This request already has a coordinator. Reassignment is not available.');
    }

    const activeAssignment = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM coordinator_assignments
                      WHERE event_request_id = $1 AND unassigned_at IS NULL) AS exists`,
      [event.id],
    );
    if (activeAssignment.rows[0]!.exists) {
      throw new WorkflowError('CONFLICT', 'ASSIGNMENT_HISTORY_CONFLICT', 'This request already has an active assignment record. Its assignment must be reconciled before assigning it.');
    }

    await lockCoordinators(client);
    const targets = await client.query<{ role: UserRole }>(
      'SELECT role FROM app_users WHERE id = $1',
      [input.coordinatorId],
    );
    const target = targets.rows[0];
    if (!target || target.role !== 'EVENT_COORDINATOR') {
      throw new WorkflowError('INVALID_INPUT', 'INVALID_COORDINATOR', 'The selected user is not an event coordinator.');
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO coordinator_assignments (event_request_id, coordinator_id, assigned_by, note)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [event.id, input.coordinatorId, actor.id, input.note],
    );
    const updated = await client.query(
      'UPDATE event_requests SET coordinator_id = $1, updated_at = now() WHERE id = $2',
      [input.coordinatorId, event.id],
    );
    if (updated.rowCount !== 1) throw new Error('The coordinator assignment could not be saved.');

    return {
      eventRequestId: event.id,
      assignmentId: inserted.rows[0]!.id,
      coordinatorId: input.coordinatorId,
      previousCoordinatorId: event.coordinatorId,
    };
  });
}

export async function listAssignments(
  { pool }: WorkflowDependencies,
  command: { eventRequestId: string; actor: WorkflowActor },
): Promise<AssignmentRecord[]> {
  const event = await readEventRequest(pool, command.eventRequestId);
  // Coordinators may already see unassigned non-draft requests, so their (empty or closed)
  // history is visible to them too; everything else needs a relationship to the request.
  const triaging = command.actor.role === 'EVENT_COORDINATOR'
    && event.coordinatorId === null && event.status !== 'DRAFT';
  if (!triaging) requireRelation(command.actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
  const found = await pool.query<Omit<AssignmentRecord, 'assignedAt' | 'unassignedAt'> & {
    assignedAt: Date; unassignedAt: Date | null;
  }>(
    `SELECT a.id, a.coordinator_id AS "coordinatorId", c.display_name AS "coordinatorName",
            a.assignment_method AS "assignmentMethod",
            a.assigned_by AS "assignedById", b.display_name AS "assignedByName", a.note,
            a.assigned_at AS "assignedAt", a.unassigned_at AS "unassignedAt"
     FROM coordinator_assignments a
     JOIN app_users c ON c.id = a.coordinator_id
     LEFT JOIN app_users b ON b.id = a.assigned_by
     WHERE a.event_request_id = $1
     ORDER BY a.assigned_at DESC, a.id`,
    [event.id],
  );
  return found.rows.map((row) => ({
    ...row, assignedAt: iso(row.assignedAt), unassignedAt: isoOrNull(row.unassignedAt),
  }));
}
