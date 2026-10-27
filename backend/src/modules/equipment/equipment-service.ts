import type { Pool, PoolClient } from 'pg';
import { inActorTransaction, WorkflowError, type WorkflowActor } from '../events/workflow-support.js';
import { recordNotifications } from '../notifications/notify.js';

const bad = (message: string) => new WorkflowError('INVALID_INPUT', 'INVALID_EQUIPMENT_REQUEST', message);
const conflict = (code: string, message: string) => new WorkflowError('CONFLICT', code, message);
interface LineInput { equipmentTypeId: string; quantity: number; startsAt: string; endsAt: string; technicalRequirements: string | null }

export function parseEquipmentInput(input: unknown): { lines: LineInput[]; notRequired: boolean } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw bad('A JSON object is required.');
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => !['lines', 'notRequired', 'revision'].includes(key))) throw bad('Unsupported request field.');
  if (typeof body.notRequired !== 'undefined' && typeof body.notRequired !== 'boolean') throw bad('notRequired must be a boolean.');
  const notRequired = body.notRequired === true;
  if (notRequired) {
    if (!Array.isArray(body.lines) || body.lines.length !== 0) throw bad('Not Required can be selected only with no equipment lines.');
    return { lines: [], notRequired };
  }
  if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 30) throw bad('Provide between 1 and 30 equipment lines.');
  const lines = body.lines.map((value): LineInput => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw bad('Each line must be an object.');
    const line = value as Record<string, unknown>;
    if (Object.keys(line).some((key) => !['equipmentTypeId', 'quantity', 'startsAt', 'endsAt', 'technicalRequirements'].includes(key))) throw bad('Unsupported line field.');
    if (typeof line.equipmentTypeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(line.equipmentTypeId)) throw bad('equipmentTypeId must be a UUID.');
    if (!Number.isInteger(line.quantity) || (line.quantity as number) < 1) throw bad('quantity must be a positive whole number.');
    if (typeof line.startsAt !== 'string' || typeof line.endsAt !== 'string' || !Number.isFinite(Date.parse(line.startsAt)) || !Number.isFinite(Date.parse(line.endsAt)) || Date.parse(line.endsAt) <= Date.parse(line.startsAt)) throw bad('Provide a valid positive event period.');
    if (line.technicalRequirements !== undefined && line.technicalRequirements !== null && (typeof line.technicalRequirements !== 'string' || line.technicalRequirements.trim().length > 2000)) throw bad('technicalRequirements must be at most 2000 characters.');
    return { equipmentTypeId: line.equipmentTypeId, quantity: line.quantity as number,
      startsAt: new Date(line.startsAt).toISOString(), endsAt: new Date(line.endsAt).toISOString(),
      technicalRequirements: typeof line.technicalRequirements === 'string' ? line.technicalRequirements.trim() || null : null };
  });
  if (new Set(lines.map((line) => line.equipmentTypeId)).size !== lines.length) throw bad('Use one line per equipment type.');
  return { lines, notRequired };
}

async function eventForCoordinator(client: Pick<PoolClient, 'query'>, eventId: string, actor: WorkflowActor) {
  const found = await client.query<{ status: string; coordinatorId: string | null; organiserId: string }>(
    'SELECT status, coordinator_id AS "coordinatorId", organiser_id AS "organiserId" FROM event_requests WHERE id = $1 FOR UPDATE', [eventId]);
  const event = found.rows[0];
  if (!event || event.coordinatorId !== actor.id || actor.role !== 'EVENT_COORDINATOR') {
    throw new WorkflowError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.');
  }
  if (event.status !== 'APPROVED') conflict('EVENT_NOT_APPROVED', 'Equipment planning requires an approved event.');
  return event;
}

export async function saveEquipmentRequest(pool: Pick<Pool, 'connect'>,
  args: { eventId: string; actor: WorkflowActor; input: unknown }) {
  const { lines, notRequired } = parseEquipmentInput(args.input);
  return inActorTransaction(pool, args.actor.id, async (client) => {
    await eventForCoordinator(client, args.eventId, args.actor);
    const current = await client.query<{ id: string; status: string; revision: number; equipmentTypeId: string }>(
      'SELECT id, status, revision, equipment_type_id AS "equipmentTypeId" FROM equipment_requests WHERE event_request_id = $1 ORDER BY id FOR UPDATE', [args.eventId]);
    const body = args.input as Record<string, unknown>;
    const expectedRevision = body.revision;
    const revision = current.rows.reduce((sum, row) => sum + row.revision, 0);
    if (expectedRevision !== undefined && expectedRevision !== revision) conflict('STALE_EQUIPMENT_REQUEST', 'Equipment details changed. Reload before saving.');
    const active = current.rows.filter((row) => row.status !== 'CANCELLED');
    if (notRequired && active.length > 0) conflict('EQUIPMENT_STILL_REQUIRED', 'Cancel all required lines before selecting Not Required.');
    if (active.some((row) => row.status !== 'REQUESTED' && lines.some((line) => line.equipmentTypeId === row.equipmentTypeId))) {
      conflict('EQUIPMENT_REPLACEMENT_REQUIRED', 'A decided equipment line cannot be revised; cancel or replace it explicitly.');
    }
    await client.query(`UPDATE equipment_requests SET status = 'CANCELLED', released_by = $2,
      released_at = now(), release_reason = 'Superseded by coordinator request',
      release_cause = 'MANUAL_CANCELLATION', revision = revision + 1,
      updated_at = now() WHERE event_request_id = $1 AND status = 'REQUESTED'`, [args.eventId, args.actor.id]);
    await client.query('UPDATE event_requests SET equipment_plan_status = $2, updated_at = now() WHERE id = $1',
      [args.eventId, notRequired ? 'NOT_REQUIRED' : 'REQUIRED']);
    const saved = [];
    for (const line of lines) {
      const result = await client.query(`INSERT INTO equipment_requests
        (event_request_id, equipment_type_id, requested_by, quantity, starts_at, ends_at, technical_requirements)
        SELECT $1, t.id, $2, $4, $5, $6, $7 FROM equipment_types t WHERE t.id = $3 AND t.is_active
        RETURNING id, equipment_type_id AS "equipmentTypeId", quantity, starts_at AS "startsAt",
          ends_at AS "endsAt", technical_requirements AS "technicalRequirements", status, revision`,
      [args.eventId, args.actor.id, line.equipmentTypeId, line.quantity, line.startsAt, line.endsAt, line.technicalRequirements]);
      if (!result.rows[0]) throw bad('An equipment type was not found or is inactive.');
      saved.push(result.rows[0]);
    }
    return { eventRequestId: args.eventId, status: notRequired ? 'NOT_REQUIRED' : 'REQUESTED', lines: saved,
      revision: revision + 1 };
  });
}

export async function listEquipmentRequests(pool: Pick<Pool, 'query'>,
  args: { actor: WorkflowActor; eventId?: string }) {
  if (!['EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF'].includes(args.actor.role)) {
    throw new WorkflowError('FORBIDDEN', 'EQUIPMENT_ACCESS_FORBIDDEN', 'Your role cannot view equipment requests.');
  }
  const found = await pool.query(`SELECT r.id, r.event_request_id AS "eventRequestId", e.name AS "eventName",
    e.coordinator_id AS "coordinatorId", r.equipment_type_id AS "equipmentTypeId", t.name AS "equipmentType",
    r.quantity, r.starts_at AS "startsAt", r.ends_at AS "endsAt", r.technical_requirements AS "technicalRequirements",
    r.status, r.revision, r.decision_reason AS "decisionReason", r.decided_at AS "decidedAt"
    FROM equipment_requests r JOIN event_requests e ON e.id = r.event_request_id
    JOIN equipment_types t ON t.id = r.equipment_type_id
    WHERE ($1::uuid IS NULL OR e.id = $1) AND ($2::text = 'TECHNICAL_SUPPORT_STAFF' OR e.coordinator_id = $3)
    ORDER BY e.name, r.created_at, r.id`, [args.eventId ?? null, args.actor.role, args.actor.id]);
  return found.rows;
}

export async function listEquipmentTypes(pool: Pick<Pool, 'query'>) {
  const found = await pool.query<{ id: string; name: string; category: string | null }>(
    'SELECT id, name, category FROM equipment_types WHERE is_active ORDER BY category NULLS LAST, name, id');
  return found.rows;
}

export async function getEventEquipmentPlan(pool: Pick<Pool, 'query'>,
  args: { eventId: string; actor: WorkflowActor }) {
  if (!['EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF'].includes(args.actor.role)) {
    throw new WorkflowError('FORBIDDEN', 'EQUIPMENT_ACCESS_FORBIDDEN', 'Your role cannot view equipment requests.');
  }
  const event = await pool.query<{ coordinatorId: string | null; status: string }>(
    'SELECT coordinator_id AS "coordinatorId", equipment_plan_status AS status FROM event_requests WHERE id = $1', [args.eventId]);
  if (!event.rows[0] || (args.actor.role === 'EVENT_COORDINATOR' && event.rows[0].coordinatorId !== args.actor.id)) {
    throw new WorkflowError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.');
  }
  const items = await listEquipmentRequests(pool, { actor: args.actor, eventId: args.eventId });
  return { eventRequestId: args.eventId, status: event.rows[0].status, items };
}

export async function reviewEquipmentRequest(pool: Pick<Pool, 'connect'>,
  args: { lineId: string; actor: WorkflowActor; input: unknown }) {
  if (args.actor.role !== 'TECHNICAL_SUPPORT_STAFF') throw new WorkflowError('FORBIDDEN', 'EQUIPMENT_REVIEW_FORBIDDEN', 'Only Technical Support Staff can review equipment requests.');
  if (!args.input || typeof args.input !== 'object' || Array.isArray(args.input)) throw bad('A JSON object is required.');
  const body = args.input as Record<string, unknown>;
  if (!['RESERVED', 'REJECTED'].includes(String(body.decision)) || Object.keys(body).some((key) => !['decision', 'reason', 'revision'].includes(key))) throw bad('decision must be RESERVED or REJECTED.');
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null;
  if (body.decision === 'REJECTED' && !reason) throw bad('A reason is required to reject an equipment request.');
  if (reason && reason.length > 2000) throw bad('reason must be at most 2000 characters.');
  return inActorTransaction(pool, args.actor.id, async (client) => {
    const found = await client.query<{ eventId: string; status: string; revision: number; coordinatorId: string | null; organiserId: string; name: string | null }>(
      `SELECT r.event_request_id AS "eventId", r.status, r.revision, e.coordinator_id AS "coordinatorId",
        e.organiser_id AS "organiserId", e.name FROM equipment_requests r JOIN event_requests e ON e.id = r.event_request_id
        WHERE r.id = $1 FOR UPDATE OF r, e`, [args.lineId]);
    const line = found.rows[0];
    if (!line) throw new WorkflowError('NOT_FOUND', 'EQUIPMENT_REQUEST_NOT_FOUND', 'The equipment request was not found.');
    if (line.status !== 'REQUESTED') conflict('EQUIPMENT_ALREADY_DECIDED', 'This equipment request is no longer awaiting review.');
    if (body.revision !== undefined && body.revision !== line.revision) conflict('STALE_EQUIPMENT_REQUEST', 'This request changed. Reload before reviewing.');
    const event = await client.query<{ status: string }>('SELECT status FROM event_requests WHERE id = $1', [line.eventId]);
    if (event.rows[0]?.status !== 'APPROVED') conflict('EVENT_NOT_APPROVED', 'Equipment requests can be reviewed only for approved events.');
    let updated;
    try {
      updated = await client.query(`UPDATE equipment_requests SET status = $2, decided_by = $3,
        decided_at = now(), decision_reason = $4, revision = revision + 1, updated_at = now()
        WHERE id = $1 AND status = 'REQUESTED' RETURNING id, status, quantity, revision, decided_at AS "decidedAt", decision_reason AS "decisionReason"`,
      [args.lineId, body.decision, args.actor.id, reason]);
    } catch (error) {
      if (typeof error === 'object' && error !== null &&
          (('constraint' in error && error.constraint === 'equipment_requests_within_pool') ||
           ('code' in error && error.code === '23P01'))) {
        conflict('EQUIPMENT_UNAVAILABLE', 'The requested quantity is no longer available for this period.');
      }
      throw error;
    }
    if (!updated.rows[0]) conflict('EQUIPMENT_ALREADY_DECIDED', 'This equipment request is no longer awaiting review.');
    await recordNotifications(client, [line.coordinatorId, line.organiserId].filter((id): id is string => Boolean(id)).map((recipientId) => ({
      recipientId, eventRequestId: line.eventId, type: `EQUIPMENT_${body.decision}`,
      title: body.decision === 'RESERVED' ? 'Equipment reserved' : 'Equipment request rejected',
      message: body.decision === 'RESERVED' ? `Equipment was reserved for ${line.name ?? 'your event'}.`
        : `An equipment request for ${line.name ?? 'your event'} was rejected: ${reason}`,
      dedupeKey: `EQUIPMENT_REVIEW:${args.lineId}:${updated.rows[0].revision}`,
    })));
    return updated.rows[0];
  });
}

export async function replaceReservedEquipmentLine(pool: Pick<Pool, 'connect'>,
  args: { lineId: string; actor: WorkflowActor; input: unknown }) {
  if (!args.input || typeof args.input !== 'object' || Array.isArray(args.input)) throw bad('A JSON object is required.');
  const body = args.input as Record<string, unknown>;
  const lines = parseEquipmentInput({ lines: [body.replacement] }).lines;
  const replacement = lines[0]!;
  return inActorTransaction(pool, args.actor.id, async (client) => {
    const old = await client.query<{ eventId: string; status: string; revision: number }>(
      'SELECT event_request_id AS "eventId", status, revision FROM equipment_requests WHERE id = $1 FOR UPDATE', [args.lineId]);
    const line = old.rows[0];
    if (!line) throw new WorkflowError('NOT_FOUND', 'EQUIPMENT_REQUEST_NOT_FOUND', 'The equipment request was not found.');
    if (line.status !== 'RESERVED') conflict('EQUIPMENT_NOT_RESERVED', 'Only a reserved line can be replaced.');
    if (body.revision !== line.revision) conflict('STALE_EQUIPMENT_REQUEST', 'This reservation changed. Reload before replacing.');
    await eventForCoordinator(client, line.eventId, args.actor);
    await client.query(`UPDATE equipment_requests SET status = 'CANCELLED', released_by = $2,
      released_at = now(), release_reason = 'Explicitly replaced by coordinator',
      release_cause = 'MANUAL_CANCELLATION', revision = revision + 1,
      updated_at = now() WHERE id = $1 AND status = 'RESERVED'`, [args.lineId, args.actor.id]);
    const inserted = await client.query(`INSERT INTO equipment_requests
      (event_request_id, equipment_type_id, requested_by, quantity, starts_at, ends_at, technical_requirements)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, status, revision`,
    [line.eventId, replacement.equipmentTypeId, args.actor.id, replacement.quantity, replacement.startsAt, replacement.endsAt, replacement.technicalRequirements]);
    return { cancelledRequestId: args.lineId, replacement: inserted.rows[0] };
  });
}

export async function cancelEquipmentLine(pool: Pick<Pool, 'connect'>,
  args: { lineId: string; actor: WorkflowActor; input: unknown }) {
  if (!args.input || typeof args.input !== 'object' || Array.isArray(args.input)) throw bad('A cancellation reason is required.');
  const body = args.input as Record<string, unknown>;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason || reason.length > 2000 || Object.keys(body).some((key) => key !== 'reason')) throw bad('A valid cancellation reason is required.');
  return inActorTransaction(pool, args.actor.id, async (client) => {
    const found = await client.query<{ eventId: string; status: string }>(
      'SELECT event_request_id AS "eventId", status FROM equipment_requests WHERE id = $1 FOR UPDATE', [args.lineId]);
    const line = found.rows[0];
    if (!line) throw new WorkflowError('NOT_FOUND', 'EQUIPMENT_REQUEST_NOT_FOUND', 'The equipment request was not found.');
    await eventForCoordinator(client, line.eventId, args.actor);
    if (line.status !== 'REQUESTED' && line.status !== 'REJECTED') conflict('EQUIPMENT_CANNOT_BE_CANCELLED', 'Only a requested or rejected line can be cancelled directly.');
    const updated = await client.query(`UPDATE equipment_requests SET status = 'CANCELLED', released_by = $2,
      released_at = now(), release_reason = $3, release_cause = 'MANUAL_CANCELLATION',
      revision = revision + 1, updated_at = now()
      WHERE id = $1 AND status = $4 RETURNING id, status, revision`, [args.lineId, args.actor.id, reason, line.status]);
    if (!updated.rows[0]) conflict('STALE_EQUIPMENT_REQUEST', 'This equipment line changed. Reload before cancelling.');
    return updated.rows[0];
  });
}
