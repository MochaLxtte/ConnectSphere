import type { PoolClient } from 'pg';
import { DraftUpdateInputError, parseDraftUpdateInput, type DraftUpdateInput } from './draft-update-input.js';
import { assertReadyForSubmission, SubmissionValidationError } from './submit-input.js';
import {
  draftColumnByField, draftSelectColumns, sameValue, toDraftEventRecord, type DraftEventRecord, type DraftRow,
} from './update-draft.js';
import {
  assessChangeImpact, isSignificantField, type ArrangementRecord, type ChangeImpact, type SignificantField,
} from './change-request-impact.js';
import {
  assertExpectedRevision, inActorTransaction, inEventReadTransaction, iso, isoOrNull, lockEventRequest,
  optionalText, parseExpectedRevision, parseObjectBody, requireRelation, WorkflowError,
  type LockedEventRequest, type WorkflowActor, type WorkflowDependencies,
} from './workflow-support.js';
import { recordNotifications } from '../notifications/notify.js';
import {
  changeRequestDecisionNotifications, changeRequestSubmittedNotifications, changeRequestWithdrawnNotifications,
} from '../notifications/change-request-notifications.js';

/**
 * KAN-15 (CF-19) reviewed change requests, design D1-D8 approved 27 October 2026:
 *   owner submits significant-field changes for an APPROVED or CONFIRMED event -> PENDING
 *   assigned coordinator APPROVES (values applied, pending arrangements cancelled) or REJECTS (reason)
 *   owner may WITHDRAW while PENDING
 * The event never changes until approval, and approval is refused when a confirmed arrangement,
 * a confirmed event or active registrations are affected (cancel and resubmit instead).
 */
export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type ChangeValues = Partial<Record<SignificantField, unknown>>;

export interface ChangeRequestRecord {
  id: string;
  eventRequestId: string;
  status: ChangeRequestStatus;
  requestedById: string;
  requestedByName: string;
  proposed: ChangeValues;
  previous: ChangeValues;
  baseRevision: number;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  appliedRevision: number | null;
  cancelledArrangements: { venueBookings: string[]; equipmentRequests: string[] } | null;
  createdAt: string;
  /** PENDING only: the event's current values for the proposed fields. */
  current?: ChangeValues;
  /** PENDING only: a proposed field changed after submission, so the request is out of date. */
  outdated?: boolean;
  /** PENDING only: what approval would cancel or what blocks it (KAN-15-AC4). */
  impact?: ChangeImpact;
}

interface Command {
  eventRequestId: string;
  actor: WorkflowActor;
}

const planningStatuses = ['APPROVED', 'CONFIRMED'];
const dateFields = new Set<SignificantField>(['startsAt', 'endsAt', 'registrationOpensAt', 'registrationClosesAt']);
const invalid = (code: string, message: string) => new WorkflowError('INVALID_INPUT', code, message);
const conflict = (code: string, message: string) => new WorkflowError('CONFLICT', code, message);
const changeRequestNotFound = () =>
  new WorkflowError('NOT_FOUND', 'CHANGE_REQUEST_NOT_FOUND', 'The change request was not found.');

/** Dates are stored and compared as UTC ISO strings, whatever offset the client used. */
function normalise(field: SignificantField, value: unknown): unknown {
  return dateFields.has(field) && typeof value === 'string' ? new Date(value).toISOString() : value;
}

function pick(source: object, fields: readonly SignificantField[]): ChangeValues {
  const values = source as Partial<Record<SignificantField, unknown>>;
  return Object.fromEntries(fields.map((field) => [field, normalise(field, values[field] ?? null)]));
}

function parseSubmission(input: unknown): { changes: ChangeValues; expectedRevision: number } {
  const body = parseObjectBody(input, ['changes', 'expectedRevision']);
  const expectedRevision = parseExpectedRevision(body.expectedRevision, true)!;
  const changes = body.changes;
  if (typeof changes !== 'object' || changes === null || Array.isArray(changes)) {
    throw invalid('INVALID_INPUT', 'changes must be an object of the details to change.');
  }
  const notAllowed = Object.keys(changes).filter((field) => !isSignificantField(field));
  if (notAllowed.length > 0) {
    throw invalid('CHANGE_REQUEST_FIELD_NOT_ALLOWED',
      `These details are not changed through a change request: ${notAllowed.join(', ')}. ` +
      'The coordinator edits the name and description directly.');
  }
  let parsed: DraftUpdateInput;
  try {
    parsed = parseDraftUpdateInput(changes);
  } catch (error) {
    if (error instanceof DraftUpdateInputError) throw invalid('INVALID_INPUT', error.message);
    throw error;
  }
  return { changes: parsed as ChangeValues, expectedRevision };
}

/** KAN-15-AC104: an applied change must leave the event complete and valid, as at submission. */
function assertValidAfterChange(current: DraftEventRecord, proposed: ChangeValues, code: string, kind: 'INVALID_INPUT' | 'CONFLICT') {
  try {
    assertReadyForSubmission({ ...current, ...proposed } as Parameters<typeof assertReadyForSubmission>[0]);
  } catch (error) {
    if (error instanceof SubmissionValidationError) throw new WorkflowError(kind, code, error.message);
    throw error;
  }
}

async function readCurrent(client: Pick<PoolClient, 'query'>, eventRequestId: string): Promise<DraftEventRecord> {
  const found = await client.query<DraftRow>(`SELECT ${draftSelectColumns} FROM event_requests WHERE id = $1`, [eventRequestId]);
  return toDraftEventRecord(found.rows[0]!);
}

async function readArrangements(client: Pick<PoolClient, 'query'>, eventRequestId: string): Promise<ArrangementRecord[]> {
  const found = await client.query<ArrangementRecord>(`
    SELECT 'VENUE_BOOKING' AS kind, b.id, v.name AS label, b.status, NULL::integer AS quantity
    FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
    WHERE b.event_request_id = $1 AND b.status IN ('PENDING', 'HELD', 'APPROVED')
    UNION ALL
    SELECT 'EQUIPMENT_REQUEST', r.id, t.name, r.status, r.quantity
    FROM equipment_requests r JOIN equipment_types t ON t.id = r.equipment_type_id
    WHERE r.event_request_id = $1 AND r.status IN ('REQUESTED', 'RESERVED')
    ORDER BY kind, label, id`, [eventRequestId]);
  return found.rows;
}

async function countActiveRegistrations(client: Pick<PoolClient, 'query'>, eventRequestId: string): Promise<number> {
  const found = await client.query<{ count: number }>(
    `SELECT count(*)::integer AS count FROM event_registrations WHERE event_request_id = $1 AND status = 'REGISTERED'`,
    [eventRequestId]);
  return found.rows[0]!.count;
}

async function impactFor(
  client: Pick<PoolClient, 'query'>, event: Pick<LockedEventRequest, 'id' | 'status'>, fields: readonly SignificantField[],
): Promise<ChangeImpact> {
  return assessChangeImpact({
    fields, eventStatus: event.status,
    arrangements: await readArrangements(client, event.id),
    activeRegistrations: await countActiveRegistrations(client, event.id),
  });
}

/** Proposed fields whose stored value moved after the organiser submitted. */
function outdatedFields(current: DraftEventRecord, previous: ChangeValues): SignificantField[] {
  return (Object.keys(previous) as SignificantField[])
    .filter((field) => !sameValue(field, current[field] ?? null, previous[field] ?? null));
}

type ChangeRequestRow = Omit<ChangeRequestRecord, 'decidedAt' | 'createdAt' | 'current' | 'outdated' | 'impact'> & {
  decidedAt: Date | null; createdAt: Date;
};

async function readChangeRequests(
  client: Pick<PoolClient, 'query'>, event: Pick<LockedEventRequest, 'id' | 'status'>, onlyId?: string,
): Promise<ChangeRequestRecord[]> {
  const found = await client.query<ChangeRequestRow>(`
    SELECT c.id, c.event_request_id AS "eventRequestId", c.status,
      c.requested_by AS "requestedById", requester.display_name AS "requestedByName",
      c.proposed_changes AS proposed, c.previous, c.base_revision AS "baseRevision",
      c.decided_by AS "decidedById", decider.display_name AS "decidedByName",
      c.decided_at AS "decidedAt", c.decision_reason AS "decisionReason",
      c.applied_revision AS "appliedRevision", c.cancelled_arrangements AS "cancelledArrangements",
      c.created_at AS "createdAt"
    FROM event_change_requests c
    JOIN app_users requester ON requester.id = c.requested_by
    LEFT JOIN app_users decider ON decider.id = c.decided_by
    WHERE c.event_request_id = $1 AND ($2::uuid IS NULL OR c.id = $2)
    ORDER BY c.created_at DESC, c.id`, [event.id, onlyId ?? null]);
  const records: ChangeRequestRecord[] = [];
  for (const row of found.rows) {
    const record: ChangeRequestRecord = { ...row, decidedAt: isoOrNull(row.decidedAt), createdAt: iso(row.createdAt) };
    if (row.status === 'PENDING') {
      const fields = Object.keys(row.proposed) as SignificantField[];
      const current = await readCurrent(client, event.id);
      record.current = pick(current, fields);
      record.outdated = outdatedFields(current, row.previous).length > 0;
      record.impact = await impactFor(client, event, fields);
    }
    records.push(record);
  }
  return records;
}

async function readOne(client: Pick<PoolClient, 'query'>, event: Pick<LockedEventRequest, 'id' | 'status'>, id: string) {
  const [record] = await readChangeRequests(client, event, id);
  if (!record) throw changeRequestNotFound();
  return record;
}

/** KAN-15-AC1/AC2/AC101: the owner proposes significant changes; nothing on the event changes yet. */
export async function submitChangeRequest(
  { pool }: WorkflowDependencies,
  { eventRequestId, actor, input }: Command & { input: unknown },
): Promise<ChangeRequestRecord> {
  const { changes, expectedRevision } = parseSubmission(input);
  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['OWNER'], 'Only the organiser who owns this event can request a change.');
    if (!planningStatuses.includes(event.status)) {
      throw conflict('CHANGE_REQUEST_NOT_ALLOWED',
        'Change requests are for approved or confirmed events. Before approval, edit the request directly.');
    }
    assertExpectedRevision(event.revision, expectedRevision);
    const current = await readCurrent(client, event.id);
    const fields = (Object.keys(changes) as SignificantField[])
      .filter((field) => !sameValue(field, current[field] ?? null, changes[field] ?? null));
    if (fields.length === 0) {
      throw invalid('CHANGE_REQUEST_EMPTY', 'The requested values match the current event. Change at least one detail.');
    }
    const proposed = pick(changes, fields);
    assertValidAfterChange(current, proposed, 'CHANGE_REQUEST_INVALID', 'INVALID_INPUT');

    const pending = await client.query(
      `SELECT 1 FROM event_change_requests WHERE event_request_id = $1 AND status = 'PENDING'`, [event.id]);
    if ((pending.rowCount ?? 0) > 0) {
      throw conflict('CHANGE_REQUEST_ALREADY_PENDING',
        'This event already has a change request awaiting review. Withdraw it or wait for the decision.');
    }
    const inserted = await client.query<{ id: string }>(`
      INSERT INTO event_change_requests (event_request_id, requested_by, proposed_changes, previous, base_revision)
      VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [event.id, actor.id, JSON.stringify(proposed), JSON.stringify(pick(current, fields)), event.revision]);
    const id = inserted.rows[0]!.id;
    await recordNotifications(client, changeRequestSubmittedNotifications(event, id));
    return readOne(client, event, id);
  });
}

/** KAN-15-AC3/AC5: owner and assigned coordinator see every request, newest first. */
export async function listChangeRequests(
  { pool }: WorkflowDependencies, { eventRequestId, actor }: Command,
): Promise<ChangeRequestRecord[]> {
  return inEventReadTransaction(pool, actor.id, eventRequestId, async (client, event) => {
    requireRelation(actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
    return readChangeRequests(client, event);
  });
}

function parseDecision(input: unknown) {
  const body = parseObjectBody(input, ['decision', 'reason', 'expectedRevision']);
  if (body.decision !== 'APPROVED' && body.decision !== 'REJECTED') {
    throw invalid('INVALID_INPUT', 'decision must be APPROVED or REJECTED.');
  }
  const reason = optionalText(body, 'reason');
  if (body.decision === 'REJECTED' && !reason) {
    throw invalid('REJECTION_REASON_REQUIRED', 'Give the organiser a reason for rejecting the change.');
  }
  return { decision: body.decision, reason, expectedRevision: parseExpectedRevision(body.expectedRevision, true)! };
}

/**
 * Lock the event's live venue bookings in the order Venue Staff use (venue gate, booking, then
 * event), so an approval cannot deadlock with a concurrent booking decision.
 */
async function lockVenueBookingsBeforeEvent(client: Pick<PoolClient, 'query'>, eventRequestId: string) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended('connectsphere:venue:' || venue_id::text, 0))
    FROM (SELECT DISTINCT venue_id FROM venue_bookings
          WHERE event_request_id = $1 AND status IN ('PENDING', 'HELD', 'APPROVED') ORDER BY venue_id) venues`,
  [eventRequestId]);
  await client.query(`SELECT id FROM venue_bookings
    WHERE event_request_id = $1 AND status IN ('PENDING', 'HELD', 'APPROVED') ORDER BY id FOR UPDATE`, [eventRequestId]);
}

/** KAN-15-AC4-AC8, AC103-AC105: one atomic, revision-checked decision by the assigned coordinator. */
export async function decideChangeRequest(
  { pool }: WorkflowDependencies,
  { eventRequestId, changeRequestId, actor, input }: Command & { changeRequestId: string; input: unknown },
): Promise<ChangeRequestRecord> {
  const { decision, reason, expectedRevision } = parseDecision(input);
  try {
    return await inActorTransaction(pool, actor.id, async (client) => {
      if (decision === 'APPROVED') await lockVenueBookingsBeforeEvent(client, eventRequestId);
      const event = await lockEventRequest(client, eventRequestId);
      requireRelation(actor, event, ['ASSIGNED_COORDINATOR'], 'Only the assigned coordinator can decide a change request.');
      const found = await client.query<{ status: ChangeRequestStatus; proposed: ChangeValues; previous: ChangeValues }>(
        `SELECT status, proposed_changes AS proposed, previous FROM event_change_requests
         WHERE id = $1 AND event_request_id = $2 FOR UPDATE`, [changeRequestId, event.id]);
      const request = found.rows[0];
      if (!request) throw changeRequestNotFound();
      if (request.status !== 'PENDING') {
        throw conflict('CHANGE_REQUEST_NOT_PENDING', 'This change request has already been decided or withdrawn.');
      }
      assertExpectedRevision(event.revision, expectedRevision);

      if (decision === 'REJECTED') {
        await client.query(`UPDATE event_change_requests SET status = 'REJECTED', decided_by = $2,
          decided_at = now(), decision_reason = $3, updated_at = now() WHERE id = $1`, [changeRequestId, actor.id, reason]);
        await recordNotifications(client, changeRequestDecisionNotifications(event,
          { id: changeRequestId, outcome: 'REJECTED', reason, cancelledCount: 0 }));
        return readOne(client, event, changeRequestId);
      }

      if (!planningStatuses.includes(event.status)) {
        throw conflict('CHANGE_REQUEST_EVENT_NOT_PLANNING',
          'The event is no longer approved or confirmed, so this change cannot be applied. Reject it instead.');
      }
      const current = await readCurrent(client, event.id);
      if (outdatedFields(current, request.previous).length > 0) {
        throw conflict('CHANGE_REQUEST_OUTDATED',
          'Some of these details changed after the organiser asked for this change. Reject it and ask for a new request.');
      }
      const fields = Object.keys(request.proposed) as SignificantField[];
      await client.query(`SELECT id FROM equipment_requests WHERE event_request_id = $1
        AND status IN ('REQUESTED', 'RESERVED') ORDER BY id FOR UPDATE`, [event.id]);
      const impact = await impactFor(client, event, fields);
      if (!impact.canApprove) throw conflict('CANCEL_AND_RESUBMIT_REQUIRED', impact.blockedReason!);
      assertValidAfterChange(current, request.proposed, 'CHANGE_REQUEST_INVALID', 'CONFLICT');

      const setClauses = fields.map((field, index) => `${draftColumnByField[field]} = $${index + 2}`);
      const updated = await client.query<DraftRow>(`
        UPDATE event_requests SET ${setClauses.join(', ')}, updated_at = now()
        WHERE id = $1 RETURNING ${draftSelectColumns}`, [event.id, ...fields.map((field) => request.proposed[field])]);
      const applied = toDraftEventRecord(updated.rows[0]!);
      // The KAN-66 edit audit records the applied values against the revision they produced.
      const audit = Object.fromEntries(fields.map((field) => [field, { from: current[field], to: applied[field] }]));
      await client.query(`INSERT INTO event_request_edits
        (event_request_id, revision, edited_by, editor_role, event_status, changes) VALUES ($1, $2, $3, $4, $5, $6)`,
      [event.id, applied.revision, actor.id, 'EVENT_COORDINATOR', applied.status, JSON.stringify(audit)]);

      const cancelReason = 'Cancelled by an approved change request. Request it again for the new event details.';
      const venueIds = impact.pending.filter((item) => item.kind === 'VENUE_BOOKING').map((item) => item.id);
      const equipmentIds = impact.pending.filter((item) => item.kind === 'EQUIPMENT_REQUEST').map((item) => item.id);
      if (venueIds.length > 0) {
        await client.query(`UPDATE venue_bookings SET status = 'CANCELLED', cancelled_by = $2, cancelled_at = now(),
          cancellation_reason = $3, updated_at = now() WHERE id = ANY($1::uuid[]) AND status IN ('PENDING', 'HELD')`,
        [venueIds, actor.id, cancelReason]);
      }
      if (equipmentIds.length > 0) {
        // D8: main has no equipment cancellation metadata yet; adapt once KAN-26/KAN-62 settle theirs.
        await client.query(`UPDATE equipment_requests SET status = 'CANCELLED', updated_at = now()
          WHERE id = ANY($1::uuid[]) AND status = 'REQUESTED'`, [equipmentIds]);
      }
      await client.query(`UPDATE event_change_requests SET status = 'APPROVED', decided_by = $2, decided_at = now(),
        decision_reason = $3, applied_revision = $4, cancelled_arrangements = $5, updated_at = now() WHERE id = $1`,
      [changeRequestId, actor.id, reason, applied.revision,
        JSON.stringify({ venueBookings: venueIds, equipmentRequests: equipmentIds })]);
      await recordNotifications(client, changeRequestDecisionNotifications(event,
        { id: changeRequestId, outcome: 'APPROVED', reason, cancelledCount: venueIds.length + equipmentIds.length }));
      return readOne(client, { id: event.id, status: applied.status }, changeRequestId);
    });
  } catch (error) {
    // A concurrent writer took the same rows in another order; nothing was saved.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '40P01') {
      throw conflict('CHANGE_REQUEST_BUSY', 'Another change to this event was being saved. Refresh and try again.');
    }
    throw error;
  }
}

/** Design D2: the owner may withdraw a request that is still awaiting review. */
export async function withdrawChangeRequest(
  { pool }: WorkflowDependencies,
  { eventRequestId, changeRequestId, actor, input }: Command & { changeRequestId: string; input?: unknown },
): Promise<ChangeRequestRecord> {
  if (input !== undefined) parseObjectBody(input, []);
  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['OWNER'], 'Only the organiser who owns this event can withdraw its change request.');
    const updated = await client.query(`UPDATE event_change_requests SET status = 'WITHDRAWN', decided_by = $3,
      decided_at = now(), updated_at = now() WHERE id = $1 AND event_request_id = $2 AND status = 'PENDING'`,
    [changeRequestId, event.id, actor.id]);
    if ((updated.rowCount ?? 0) === 0) {
      await readOne(client, event, changeRequestId);
      throw conflict('CHANGE_REQUEST_NOT_PENDING', 'This change request has already been decided or withdrawn.');
    }
    await recordNotifications(client, changeRequestWithdrawnNotifications(event, changeRequestId));
    return readOne(client, event, changeRequestId);
  });
}
