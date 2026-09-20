import { notify } from '../notifications/notify.js';
import { DraftUpdateInputError, parseDraftUpdateInput } from './draft-update-input.js';
import { MANDATORY_SUBMISSION_FIELDS } from './submit-input.js';
import type { EventStatus, SaveEventDraftInput } from './types.js';
import {
  cancelOpenArrangements, eventLabel, inActorTransaction, iso, isoOrNull, lockEventRequest,
  optionalText, othersThan, parseObjectBody, readEventRequest, requiredText, requireRelation,
  setEventStatus, WorkflowError,
  type LockedEventRequest, type WorkflowActor, type WorkflowDependencies,
} from './workflow-support.js';

/**
 * CF-19 event change requests. Q-05 and Q-11 are open, so these are PROVISIONAL team rules:
 * - after approval the organiser cannot edit directly; every EventDraftFields field goes
 *   through a change request that the assigned coordinator approves or rejects;
 * - only one PENDING change request per event, and only for APPROVED or CONFIRMED events;
 * - approving a change to the dates or expected attendance cancels the event's open venue
 *   bookings and equipment requests (they must be re-requested) and returns a CONFIRMED
 *   event to APPROVED until it is confirmed again.
 */
const CHANGEABLE_STATUSES: readonly EventStatus[] = ['APPROVED', 'CONFIRMED'];

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type ChangeDecision = 'APPROVED' | 'REJECTED';

export interface ChangeRequestRecord {
  id: string;
  eventRequestId: string;
  requestedById: string;
  requestedByName: string;
  status: ChangeRequestStatus;
  proposedChanges: SaveEventDraftInput;
  reason: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Command {
  eventRequestId: string;
  actor: WorkflowActor;
}

const columnByField: Record<keyof SaveEventDraftInput, string> = {
  name: 'name',
  purpose: 'purpose',
  description: 'description',
  startsAt: 'starts_at',
  endsAt: 'ends_at',
  expectedAttendance: 'expected_attendance',
  venueRequirements: 'venue_requirements',
  accessibilityNeeds: 'accessibility_needs',
  equipmentRequirements: 'equipment_requirements',
  registrationRequired: 'registration_required',
};

const invalid = (message: string) => new WorkflowError('INVALID_INPUT', 'INVALID_CHANGE_REQUEST_INPUT', message);

/** Same field rules as draft saving, plus the completeness an approved event must keep. */
export function parseProposedChanges(input: unknown): SaveEventDraftInput {
  let changes: SaveEventDraftInput;
  try {
    changes = parseDraftUpdateInput(input);
  } catch (error) {
    if (error instanceof DraftUpdateInputError) {
      throw invalid(error.message.replace('The draft update', 'proposedChanges'));
    }
    throw error;
  }
  for (const field of MANDATORY_SUBMISSION_FIELDS) {
    if (!(field in changes)) continue;
    const value = changes[field];
    if (value === null || (typeof value === 'string' && value.trim() === '')) {
      throw invalid(`${field} is required for a submitted event and cannot be cleared.`);
    }
  }
  return changes;
}

export function parseChangeRequestInput(input: unknown): { proposedChanges: SaveEventDraftInput; reason: string } {
  const body = parseObjectBody(input, ['proposedChanges', 'reason']);
  return { proposedChanges: parseProposedChanges(body.proposedChanges), reason: requiredText(body, 'reason') };
}

export function parseChangeDecisionInput(input: unknown): { decision: ChangeDecision; reason: string | null } {
  const body = parseObjectBody(input, ['decision', 'reason']);
  if (body.decision !== 'APPROVED' && body.decision !== 'REJECTED') {
    throw invalid('decision must be APPROVED or REJECTED.');
  }
  return { decision: body.decision, reason: optionalText(body, 'reason') };
}

function effectiveSchedule(event: LockedEventRequest, changes: SaveEventDraftInput) {
  const startsAt = typeof changes.startsAt === 'string' ? new Date(changes.startsAt) : event.startsAt;
  const endsAt = typeof changes.endsAt === 'string' ? new Date(changes.endsAt) : event.endsAt;
  return { startsAt, endsAt };
}

function scheduleIsValid(event: LockedEventRequest, changes: SaveEventDraftInput): boolean {
  const { startsAt, endsAt } = effectiveSchedule(event, changes);
  return !startsAt || !endsAt || endsAt.getTime() > startsAt.getTime();
}

/** True when an approved change alters what venue and equipment arrangements were based on. */
export function affectsArrangements(event: LockedEventRequest, changes: SaveEventDraftInput): boolean {
  const { startsAt, endsAt } = effectiveSchedule(event, changes);
  return startsAt?.getTime() !== event.startsAt?.getTime()
    || endsAt?.getTime() !== event.endsAt?.getTime()
    || ('expectedAttendance' in changes && changes.expectedAttendance !== event.expectedAttendance);
}

function requireChangeableEvent(event: LockedEventRequest): void {
  if (!CHANGEABLE_STATUSES.includes(event.status)) {
    throw new WorkflowError('CONFLICT', 'CHANGE_REQUEST_NOT_ALLOWED', 'Changes can only be requested for approved or confirmed events.');
  }
}

export async function createChangeRequest(
  { pool }: WorkflowDependencies,
  command: Command & { input: unknown },
): Promise<{ changeRequestId: string; eventRequestId: string; status: 'PENDING' }> {
  const { eventRequestId, actor } = command;
  const input = parseChangeRequestInput(command.input);

  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['OWNER'], 'Only the organiser who owns this event can request changes.');
    requireChangeableEvent(event);
    if (!scheduleIsValid(event, input.proposedChanges)) {
      throw invalid('The event must end after it starts.');
    }
    // The event row lock serializes creation, so this check cannot race another request.
    const pending = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM event_change_requests
                      WHERE event_request_id = $1 AND status = 'PENDING') AS exists`,
      [event.id],
    );
    if (pending.rows[0]!.exists) {
      throw new WorkflowError('CONFLICT', 'CHANGE_REQUEST_ALREADY_PENDING', 'This event already has a pending change request.');
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO event_change_requests (event_request_id, requested_by, proposed_changes, reason)
       VALUES ($1, $2, $3::jsonb, $4) RETURNING id`,
      [event.id, actor.id, JSON.stringify(input.proposedChanges), input.reason],
    );
    await notify(client, othersThan(actor.id, event.coordinatorId).map((recipientId) => ({
      recipientId, eventRequestId: event.id, type: 'CHANGE_REQUEST_SUBMITTED',
      title: 'Change request submitted',
      message: `The organiser requested changes to ${eventLabel(event)}: ${input.reason}`,
    })));
    return { changeRequestId: inserted.rows[0]!.id, eventRequestId: event.id, status: 'PENDING' as const };
  });
}

async function lockPendingChange(
  client: Parameters<typeof lockEventRequest>[0],
  eventRequestId: string,
  changeRequestId: string,
): Promise<{ proposedChanges: unknown }> {
  const found = await client.query<{ status: ChangeRequestStatus; proposedChanges: unknown }>(
    `SELECT status, proposed_changes AS "proposedChanges" FROM event_change_requests
     WHERE id = $1 AND event_request_id = $2 FOR UPDATE`,
    [changeRequestId, eventRequestId],
  );
  const change = found.rows[0];
  if (!change) {
    throw new WorkflowError('NOT_FOUND', 'CHANGE_REQUEST_NOT_FOUND', 'The change request was not found.');
  }
  if (change.status !== 'PENDING') {
    throw new WorkflowError('CONFLICT', 'CHANGE_REQUEST_NOT_PENDING', 'This change request has already been closed.');
  }
  return change;
}

export async function withdrawChangeRequest(
  { pool }: WorkflowDependencies,
  { eventRequestId, changeRequestId, actor }: Command & { changeRequestId: string },
): Promise<{ changeRequestId: string; eventRequestId: string; status: 'WITHDRAWN' }> {
  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['OWNER'], 'Only the organiser who owns this event can withdraw a change request.');
    await lockPendingChange(client, event.id, changeRequestId);
    await client.query(
      `UPDATE event_change_requests SET status = 'WITHDRAWN', updated_at = now() WHERE id = $1`,
      [changeRequestId],
    );
    await notify(client, othersThan(actor.id, event.coordinatorId).map((recipientId) => ({
      recipientId, eventRequestId: event.id, type: 'CHANGE_REQUEST_WITHDRAWN',
      title: 'Change request withdrawn',
      message: `The organiser withdrew the change request for ${eventLabel(event)}.`,
    })));
    return { changeRequestId, eventRequestId: event.id, status: 'WITHDRAWN' as const };
  });
}

export interface ChangeDecisionResult {
  changeRequestId: string;
  eventRequestId: string;
  status: ChangeDecision;
  eventStatus: EventStatus;
  cancelledVenueBookings: number;
  cancelledEquipmentRequests: number;
}

export async function decideChangeRequest(
  { pool }: WorkflowDependencies,
  command: Command & { changeRequestId: string; input: unknown },
): Promise<ChangeDecisionResult> {
  const { eventRequestId, changeRequestId, actor } = command;
  const input = parseChangeDecisionInput(command.input);

  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['ASSIGNED_COORDINATOR'], 'Only the assigned coordinator can decide a change request.');
    const change = await lockPendingChange(client, event.id, changeRequestId);

    let eventStatus = event.status;
    let released = { venueBookings: 0, equipmentRequests: 0 };
    if (input.decision === 'APPROVED') {
      requireChangeableEvent(event);
      // Stored JSON is revalidated so an approval can never write unchecked columns or values.
      const changes = parseProposedChanges(change.proposedChanges);
      if (!scheduleIsValid(event, changes)) {
        throw new WorkflowError('CONFLICT', 'CHANGE_REQUEST_NOT_APPLICABLE', 'The proposed dates no longer fit the event; the event must end after it starts.');
      }
      const fields = Object.keys(changes) as (keyof SaveEventDraftInput)[];
      const setClauses = fields.map((field, index) => `${columnByField[field]} = $${index + 2}`);
      const updated = await client.query(
        `UPDATE event_requests SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $1`,
        [event.id, ...fields.map((field) => changes[field])],
      );
      if (updated.rowCount !== 1) throw new Error('The approved changes could not be applied.');

      if (affectsArrangements(event, changes)) {
        released = await cancelOpenArrangements(client, event.id);
        if (event.status === 'CONFIRMED') {
          await setEventStatus(client, event.id, 'APPROVED');
          eventStatus = 'APPROVED';
        }
      }
    }

    await client.query(
      `UPDATE event_change_requests
       SET status = $1, decided_by = $2, decided_at = now(), decision_reason = $3, updated_at = now()
       WHERE id = $4`,
      [input.decision, actor.id, input.reason, changeRequestId],
    );

    const label = eventLabel(event);
    const releasedAny = released.venueBookings + released.equipmentRequests > 0;
    await notify(client, othersThan(actor.id, event.organiserId).map((recipientId) => ({
      recipientId, eventRequestId: event.id,
      type: input.decision === 'APPROVED' ? 'CHANGE_REQUEST_APPROVED' : 'CHANGE_REQUEST_REJECTED',
      title: input.decision === 'APPROVED' ? 'Change request approved' : 'Change request rejected',
      message: input.decision === 'APPROVED'
        ? `Your changes to ${label} were approved and applied.${releasedAny
          ? ' Venue bookings and equipment requests for the previous arrangements were cancelled; please request them again.'
          : ''}${eventStatus !== event.status ? ' The event must be confirmed again.' : ''}`
        : `Your changes to ${label} were rejected.${input.reason ? ` Reason: ${input.reason}` : ''}`,
    })));

    return {
      changeRequestId, eventRequestId: event.id, status: input.decision, eventStatus,
      cancelledVenueBookings: released.venueBookings,
      cancelledEquipmentRequests: released.equipmentRequests,
    };
  });
}

export async function listChangeRequests(
  { pool }: WorkflowDependencies,
  { eventRequestId, actor }: Command,
): Promise<ChangeRequestRecord[]> {
  const event = await readEventRequest(pool, eventRequestId);
  requireRelation(actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
  const found = await pool.query<Omit<ChangeRequestRecord, 'decidedAt' | 'createdAt' | 'updatedAt'> & {
    decidedAt: Date | null; createdAt: Date; updatedAt: Date;
  }>(
    `SELECT c.id, c.event_request_id AS "eventRequestId", c.requested_by AS "requestedById",
            r.display_name AS "requestedByName", c.status, c.proposed_changes AS "proposedChanges",
            c.reason, c.decided_by AS "decidedById", d.display_name AS "decidedByName",
            c.decided_at AS "decidedAt", c.decision_reason AS "decisionReason",
            c.created_at AS "createdAt", c.updated_at AS "updatedAt"
     FROM event_change_requests c
     JOIN app_users r ON r.id = c.requested_by
     LEFT JOIN app_users d ON d.id = c.decided_by
     WHERE c.event_request_id = $1
     ORDER BY c.created_at DESC, c.id`,
    [event.id],
  );
  return found.rows.map((row) => ({
    ...row,
    decidedAt: isoOrNull(row.decidedAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  }));
}
