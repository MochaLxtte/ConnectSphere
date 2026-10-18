import type { UserRole } from '../auth/types.js';
import type { EventStatus } from './types.js';
import {
  inActorTransaction, iso, isoOrNull, lockEventRequest, optionalText,
  parseObjectBody, readEventRequest, requestNotFound, requireRelation, UUID_PATTERN, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from './workflow-support.js';

/** KAN-79: active non-draft oversight is separate from coordinator decision authority. */
const ACTIVE_STATUSES: readonly EventStatus[] = [
  'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED',
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

export interface LeadEventSummary extends UnassignedRequest {
  coordinatorId: string | null;
  coordinatorName: string | null;
}

/** Basic allocation context only: no review, booking, roster or decision controls. */
export interface LeadEventDetail extends LeadEventSummary {
  purpose: string | null;
  description: string | null;
  venueRequirements: string | null;
  accessibilityNeeds: string | null;
  equipmentRequirements: string | null;
  registrationRequired: boolean | null;
  actions: { canAssignCoordinator: boolean };
}

type DatedRequestRow<T extends UnassignedRequest> = Omit<T, 'startsAt' | 'endsAt' | 'updatedAt'> & {
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  updatedAt: Date | string;
};

const summaryColumns = `e.id, e.name, e.status, u.display_name AS "organiserName",
  e.starts_at AS "startsAt", e.ends_at AS "endsAt",
  e.expected_attendance AS "expectedAttendance", e.updated_at AS "updatedAt"`;

const oversightColumns = `${summaryColumns}, e.coordinator_id AS "coordinatorId",
  c.display_name AS "coordinatorName"`;

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

function requireLead(actor: WorkflowActor): void {
  if (actor.role !== 'EVENT_COORDINATOR_LEAD') {
    throw new WorkflowError('FORBIDDEN', 'ASSIGNMENT_FORBIDDEN', 'Only coordinator Leads can manage assignments.');
  }
}

export function parseAssignmentInput(input: unknown): AssignmentInput {
  const body = parseObjectBody(input, ['coordinatorId', 'note']);
  if (typeof body.coordinatorId !== 'string' || !UUID_PATTERN.test(body.coordinatorId)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_ASSIGNMENT_INPUT', 'coordinatorId must be a UUID.');
  }
  return { coordinatorId: body.coordinatorId.toLowerCase(), note: optionalText(body, 'note') };
}

/** Newly submitted requests waiting for their initial Lead allocation. */
export async function listUnassignedRequests(
  { pool }: WorkflowDependencies,
  actor: WorkflowActor,
): Promise<UnassignedRequest[]> {
  requireLead(actor);
  const found = await pool.query<DatedRequestRow<UnassignedRequest>>(
    `SELECT ${summaryColumns}
     FROM event_requests e JOIN app_users u ON u.id = e.organiser_id
     WHERE e.coordinator_id IS NULL AND e.status = 'SUBMITTED'
     ORDER BY e.updated_at ASC, e.id ASC`,
  );
  return found.rows.map((row) => ({
    ...row,
    startsAt: isoOrNull(row.startsAt),
    endsAt: isoOrNull(row.endsAt),
    updatedAt: iso(row.updatedAt),
  }));
}

/** All Leads share oversight of active events; this never grants workflow mutations. */
export async function listLeadOversight(
  { pool }: WorkflowDependencies,
  actor: WorkflowActor,
): Promise<LeadEventSummary[]> {
  requireLead(actor);
  const found = await pool.query<DatedRequestRow<LeadEventSummary>>(
    `SELECT ${oversightColumns}
     FROM event_requests e JOIN app_users u ON u.id = e.organiser_id
     LEFT JOIN app_users c ON c.id = e.coordinator_id
     WHERE e.status = ANY($1::text[])
     ORDER BY e.updated_at DESC, e.id ASC`,
    [ACTIVE_STATUSES],
  );
  return found.rows.map((row) => ({
    ...row, startsAt: isoOrNull(row.startsAt), endsAt: isoOrNull(row.endsAt), updatedAt: iso(row.updatedAt),
  }));
}

export async function getLeadEventDetail(
  { pool }: WorkflowDependencies,
  command: { eventRequestId: string; actor: WorkflowActor },
): Promise<LeadEventDetail> {
  requireLead(command.actor);
  const found = await pool.query<DatedRequestRow<Omit<LeadEventDetail, 'actions'>> & {
    hasActiveAssignment: boolean;
  }>(
    `SELECT ${oversightColumns}, e.purpose, e.description,
       e.venue_requirements AS "venueRequirements", e.accessibility_needs AS "accessibilityNeeds",
       e.equipment_requirements AS "equipmentRequirements", e.registration_required AS "registrationRequired",
       EXISTS (SELECT 1 FROM coordinator_assignments a
               WHERE a.event_request_id = e.id AND a.unassigned_at IS NULL) AS "hasActiveAssignment"
     FROM event_requests e JOIN app_users u ON u.id = e.organiser_id
     LEFT JOIN app_users c ON c.id = e.coordinator_id
     WHERE e.id = $1 AND e.status = ANY($2::text[])`,
    [command.eventRequestId, ACTIVE_STATUSES],
  );
  const row = found.rows[0];
  if (!row) throw requestNotFound();
  const { hasActiveAssignment, ...detail } = row;
  return {
    ...detail,
    startsAt: isoOrNull(detail.startsAt), endsAt: isoOrNull(detail.endsAt), updatedAt: iso(detail.updatedAt),
    actions: { canAssignCoordinator: detail.coordinatorId === null && !hasActiveAssignment },
  };
}

export async function listCoordinators(
  { pool }: WorkflowDependencies,
  actor: WorkflowActor,
): Promise<CoordinatorOption[]> {
  requireLead(actor);
  const found = await pool.query<CoordinatorOption>(
    `SELECT id, display_name AS "displayName", email FROM app_users
     WHERE role = 'EVENT_COORDINATOR' AND coordinator_available = true
     ORDER BY lower(display_name), id`,
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
  requireLead(actor);
  const input = parseAssignmentInput(command.input);

  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    // Even Leads cannot inspect drafts through an allocation action.
    if (event.status === 'DRAFT') throw requestNotFound();
    if (!ACTIVE_STATUSES.includes(event.status)) {
      throw new WorkflowError('CONFLICT', 'ASSIGNMENT_NOT_ALLOWED', 'An event request in this status cannot be assigned.');
    }
    if (event.coordinatorId !== null) {
      throw new WorkflowError('CONFLICT', 'COORDINATOR_ALREADY_ASSIGNED', 'This request already has a coordinator. Refresh to see the current assignment.');
    }

    const activeAssignment = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM coordinator_assignments
                      WHERE event_request_id = $1 AND unassigned_at IS NULL) AS exists`,
      [event.id],
    );
    if (activeAssignment.rows[0]!.exists) {
      throw new WorkflowError('CONFLICT', 'ASSIGNMENT_HISTORY_CONFLICT', 'This request already has an active assignment record. Its assignment must be reconciled before assigning it.');
    }

    // Lock the selected profile after the event. A concurrent availability/role change
    // must finish before eligibility is checked; unrelated allocations need not wait.
    const targets = await client.query<{ role: UserRole; available: boolean }>(
      'SELECT role, coordinator_available AS available FROM app_users WHERE id = $1 FOR NO KEY UPDATE',
      [input.coordinatorId],
    );
    const target = targets.rows[0];
    if (!target || target.role !== 'EVENT_COORDINATOR' || !target.available) {
      throw new WorkflowError('INVALID_INPUT', 'INVALID_COORDINATOR', 'Select an event coordinator who is available for assignment.');
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO coordinator_assignments (event_request_id, coordinator_id, assigned_by, note)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [event.id, input.coordinatorId, actor.id, input.note],
    );
    const assignment = inserted.rows[0];
    if (!assignment) throw new Error('The coordinator assignment history could not be saved.');
    const updated = await client.query(
      'UPDATE event_requests SET coordinator_id = $1, updated_at = now() WHERE id = $2',
      [input.coordinatorId, event.id],
    );
    if (updated.rowCount !== 1) throw new Error('The coordinator assignment could not be saved.');

    return {
      eventRequestId: event.id,
      assignmentId: assignment.id,
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
  // Lead oversight is read-only and limited to active events. Ordinary coordinators
  // always need the current assignment, including when the request is unassigned.
  if (command.actor.role === 'EVENT_COORDINATOR_LEAD') {
    if (!ACTIVE_STATUSES.includes(event.status)) throw requestNotFound();
  } else {
    requireRelation(command.actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
  }
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
