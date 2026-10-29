import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { inActorTransaction, UUID_PATTERN, WorkflowError, type WorkflowActor } from '../events/workflow-support.js';
import { recordNotifications } from '../notifications/notify.js';
import { equipmentPeriod, MAX_EQUIPMENT_QUANTITY } from './availability-input.js';
import { equipmentWritable, technicalRemediationSql } from '../safety/remediation.js';
import { readEquipmentReservationSnapshot, reserveEquipmentInTransaction } from './reservation-service.js';

const bad = (message: string) => new WorkflowError('INVALID_INPUT', 'INVALID_EQUIPMENT_REQUEST', message);
function conflict(code: string, message: string): never { throw new WorkflowError('CONFLICT', code, message); }
const notFound = () => new WorkflowError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.');
type Reader = Pick<PoolClient, 'query'>;
interface LineInput { equipmentTypeId: string; quantity: number; startsAt: string; endsAt: string; technicalRequirements: string | null }
interface PlanEvent {
  id: string; name: string | null; coordinatorId: string | null; organiserId: string; status: string;
  startsAt: string | null; endsAt: string | null; equipmentRequirements: string | null;
  planStatus: string; eventRevision: number;
  /** KAN-84 Option A: confirmed event under technical safety remediation. */
  technicalRemediation?: boolean;
}
interface PlanLine extends LineInput {
  id: string; status: string; lineRevision: number; equipmentType: string; notes: string | null;
  decisionReason: string | null; decidedAt: string | null; decidedBy: string | null;
  releasedAt: string | null; releasedBy: string | null; releaseReason: string | null; releaseCause: string | null;
}
interface PlanSnapshot { event: PlanEvent; items: PlanLine[] }
const iso = (column: string) => `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const SNAPSHOT = `SELECT jsonb_build_object('id', e.id, 'name', e.name, 'coordinatorId', e.coordinator_id,
  'organiserId', e.organiser_id, 'status', e.status, 'startsAt', ${iso('e.starts_at')}, 'endsAt', ${iso('e.ends_at')},
  'equipmentRequirements', e.equipment_requirements, 'planStatus', e.equipment_plan_status, 'eventRevision', e.revision,
  'technicalRemediation', ${technicalRemediationSql('e.id')}) AS event,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'equipmentTypeId', r.equipment_type_id,
    'equipmentType', t.name, 'quantity', r.quantity, 'startsAt', ${iso('r.starts_at')}, 'endsAt', ${iso('r.ends_at')},
    'technicalRequirements', r.technical_requirements, 'notes', r.notes, 'status', r.status,
    'lineRevision', r.revision, 'decisionReason', r.decision_reason, 'decidedAt', ${iso('r.decided_at')},
    'decidedBy', r.decided_by, 'releasedAt', ${iso('r.released_at')}, 'releasedBy', r.released_by,
    'releaseReason', r.release_reason, 'releaseCause', r.release_cause) ORDER BY r.id), '[]'::jsonb)
    FROM equipment_requests r JOIN equipment_types t ON t.id = r.equipment_type_id WHERE r.event_request_id = e.id) AS items
  FROM event_requests e WHERE ($1::uuid IS NULL OR e.id = $1) AND e.status IN ('APPROVED', 'CONFIRMED')
  AND ($2::text = 'TECHNICAL_SUPPORT_STAFF' OR e.coordinator_id = $3) ORDER BY e.name, e.id`;

/** Includes source values changed by either KAN-26 or KAN-63, not merely the optional line counter. */
export function equipmentPlanRevision(snapshot: PlanSnapshot): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}
function plan(snapshot: PlanSnapshot) {
  const revision = equipmentPlanRevision(snapshot);
  return { eventRequestId: snapshot.event.id, status: snapshot.event.planStatus, revision,
    eventStatus: snapshot.event.status, eventStartsAt: snapshot.event.startsAt, eventEndsAt: snapshot.event.endsAt,
    technicalRemediation: snapshot.event.technicalRemediation === true,
    items: snapshot.items.map(line => ({ ...line, revision, eventRequestId: snapshot.event.id,
      eventName: snapshot.event.name, eventStatus: snapshot.event.status, coordinatorId: snapshot.event.coordinatorId })) };
}
function requireRole(actor: WorkflowActor, roles: readonly string[]) {
  if (!roles.includes(actor.role)) throw new WorkflowError('FORBIDDEN', 'EQUIPMENT_ACCESS_FORBIDDEN', 'Your role cannot access this equipment workflow.');
}
function requireId(id: string) { if (!UUID_PATTERN.test(id)) throw bad('Event and equipment request IDs must be UUIDs.'); }
function object(input: unknown, allowed: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw bad('A JSON object is required.');
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(key => !allowed.includes(key))) throw bad('Unsupported request field.');
  return body;
}
function revision(body: Record<string, unknown>): string {
  if (typeof body.revision !== 'string' || !/^[a-f0-9]{64}$/.test(body.revision)) throw bad('revision must be the current equipment plan version. Reload before saving.');
  return body.revision;
}
function requireRevision(snapshot: PlanSnapshot, expected: string) {
  if (equipmentPlanRevision(snapshot) !== expected) conflict('STALE_EQUIPMENT_REQUEST', 'Equipment or event details changed. Reload before saving.');
}
function parseLine(value: unknown): LineInput {
  const line = object(value, ['equipmentTypeId', 'quantity', 'startsAt', 'endsAt', 'technicalRequirements']);
  if (typeof line.equipmentTypeId !== 'string' || !UUID_PATTERN.test(line.equipmentTypeId)) throw bad('equipmentTypeId must be a UUID.');
  if (!Number.isInteger(line.quantity) || (line.quantity as number) < 1 || (line.quantity as number) > MAX_EQUIPMENT_QUANTITY) throw bad('quantity must be a positive whole number no greater than 2147483647.');
  try { equipmentPeriod(line.startsAt, line.endsAt); } catch { throw bad('Provide a valid positive event period with explicit time offsets.'); }
  if (line.technicalRequirements !== undefined && line.technicalRequirements !== null &&
      (typeof line.technicalRequirements !== 'string' || line.technicalRequirements.trim().length > 2000)) throw bad('technicalRequirements must be at most 2000 characters.');
  return { equipmentTypeId: line.equipmentTypeId.toLowerCase(), quantity: line.quantity as number,
    startsAt: line.startsAt as string, endsAt: line.endsAt as string,
    technicalRequirements: typeof line.technicalRequirements === 'string' ? line.technicalRequirements.trim() || null : null };
}
export function parseEquipmentInput(input: unknown): { lines: LineInput[]; notRequired: boolean } {
  const body = object(input, ['lines', 'notRequired', 'revision']);
  if (body.notRequired !== undefined && typeof body.notRequired !== 'boolean') throw bad('notRequired must be a boolean.');
  const notRequired = body.notRequired === true;
  if (notRequired) {
    if (!Array.isArray(body.lines) || body.lines.length !== 0) throw bad('Not Required can be selected only with no equipment lines.');
    return { lines: [], notRequired };
  }
  if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 30) throw bad('Provide between 1 and 30 equipment lines.');
  const lines = body.lines.map(parseLine);
  if (new Set(lines.map(line => line.equipmentTypeId)).size !== lines.length) throw bad('Use one line per equipment type.');
  return { lines, notRequired };
}
async function snapshots(reader: Reader, actor: WorkflowActor, eventId?: string) {
  return (await reader.query<PlanSnapshot>(SNAPSHOT, [eventId ?? null, actor.role, actor.id])).rows;
}
async function snapshot(reader: Reader, actor: WorkflowActor, eventId: string): Promise<PlanSnapshot> {
  const found = (await snapshots(reader, actor, eventId))[0];
  if (!found) throw notFound();
  return found;
}
async function lockActor(client: Reader, actor: WorkflowActor) {
  const profile = await client.query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 FOR SHARE', [actor.id]);
  if (profile.rows[0]?.role !== actor.role) throw new WorkflowError('FORBIDDEN', 'EQUIPMENT_ACCESS_FORBIDDEN', 'Your equipment access has changed. Sign in again.');
}
/** The immutable event ID is read without a row lock; all writes then use event -> pools -> lines. */
async function lineEvent(client: Reader, lineId: string): Promise<string> {
  const found = await client.query<{ eventId: string }>('SELECT event_request_id AS "eventId" FROM equipment_requests WHERE id = $1', [lineId]);
  if (!found.rows[0]) throw new WorkflowError('NOT_FOUND', 'EQUIPMENT_REQUEST_NOT_FOUND', 'The equipment request was not found.');
  return found.rows[0].eventId;
}
async function lockPlan(client: Reader, actor: WorkflowActor, eventId: string, extraTypes: string[] = []) {
  const found = await client.query<{ status: string; coordinatorId: string | null }>(
    'SELECT status, coordinator_id AS "coordinatorId" FROM event_requests WHERE id = $1 FOR UPDATE', [eventId]);
  const event = found.rows[0];
  if (!event || (actor.role === 'EVENT_COORDINATOR' && event.coordinatorId !== actor.id)) throw notFound();
  if (!(await equipmentWritable(client, eventId, event.status))) {
    conflict('EVENT_NOT_APPROVED', 'Equipment planning requires an approved event, or a confirmed event whose safety review requested technical changes.');
  }
  let validCoordinator = false;
  if (actor.role === 'TECHNICAL_SUPPORT_STAFF' && event.coordinatorId) {
    const recipient = await client.query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 FOR SHARE', [event.coordinatorId]);
    validCoordinator = recipient.rows[0]?.role === 'EVENT_COORDINATOR';
  }
  await client.query(`SELECT t.id FROM equipment_types t WHERE t.id = ANY($2::uuid[]) OR EXISTS (
    SELECT 1 FROM equipment_requests r WHERE r.event_request_id = $1 AND r.equipment_type_id = t.id)
    ORDER BY t.id FOR UPDATE`, [eventId, extraTypes]);
  await client.query('SELECT id FROM equipment_requests WHERE event_request_id = $1 ORDER BY id FOR UPDATE', [eventId]);
  return { snapshot: await snapshot(client, actor, eventId), validCoordinator };
}
function currentLine(state: PlanSnapshot, lineId: string): PlanLine {
  const found = state.items.find(line => line.id === lineId);
  if (!found) throw new WorkflowError('NOT_FOUND', 'EQUIPMENT_REQUEST_NOT_FOUND', 'The equipment request was not found.');
  return found;
}
function requirePeriod(event: PlanEvent, line: LineInput) {
  const expected = equipmentPeriod(event.startsAt, event.endsAt);
  const actual = equipmentPeriod(line.startsAt, line.endsAt);
  if (expected.start !== actual.start || expected.end !== actual.end) conflict('EQUIPMENT_REQUEST_PERIOD_MISMATCH', 'Equipment dates must match the current event period.');
}
async function insertLine(client: Reader, actor: WorkflowActor, eventId: string, line: LineInput) {
  const saved = await client.query<{ id: string }>(`INSERT INTO equipment_requests
    (event_request_id, equipment_type_id, requested_by, quantity, starts_at, ends_at, technical_requirements, notes)
    SELECT $1, t.id, $2, $4, $5, $6, $7, $7 FROM equipment_types t WHERE t.id = $3 AND t.is_active RETURNING id`,
  [eventId, actor.id, line.equipmentTypeId, line.quantity, line.startsAt, line.endsAt, line.technicalRequirements]);
  if (!saved.rows[0]) throw bad('An equipment type was not found or is inactive.');
  return saved.rows[0].id;
}
async function releaseLine(client: Reader, actor: WorkflowActor, id: string, reason: string) {
  await client.query(`WITH stamp AS MATERIALIZED (SELECT clock_timestamp() AS at)
    UPDATE equipment_requests SET status = 'CANCELLED', released_by = $2, released_at = stamp.at,
      release_reason = $3, release_cause = 'MANUAL_CANCELLATION', revision = revision + 1, updated_at = stamp.at
      FROM stamp WHERE id = $1`, [id, actor.id, reason]);
}
export async function saveEquipmentRequest(pool: Pick<Pool, 'connect'>,
  args: { eventId: string; actor: WorkflowActor; input: unknown }) {
  requireRole(args.actor, ['EVENT_COORDINATOR']); requireId(args.eventId);
  const { lines, notRequired } = parseEquipmentInput(args.input);
  const expected = revision(args.input as Record<string, unknown>);
  return inActorTransaction(pool, args.actor.id, async client => {
    await lockActor(client, args.actor);
    const { snapshot: state } = await lockPlan(client, args.actor, args.eventId, lines.map(line => line.equipmentTypeId));
    requireRevision(state, expected);
    const active = state.items.filter(line => line.status !== 'CANCELLED');
    if (notRequired && active.length > 0) conflict('EQUIPMENT_STILL_REQUIRED', 'Cancel all required lines before selecting Not Required.');
    if (active.some(row => row.status !== 'REQUESTED' && lines.some(line => line.equipmentTypeId === row.equipmentTypeId))) {
      conflict('EQUIPMENT_REPLACEMENT_REQUIRED', 'A decided equipment line cannot be revised; cancel or replace it explicitly.');
    }
    for (const line of lines) requirePeriod(state.event, line);
    for (const line of active.filter(row => row.status === 'REQUESTED')) await releaseLine(client, args.actor, line.id, 'Superseded by coordinator request');
    await client.query('UPDATE event_requests SET equipment_plan_status = $2, updated_at = clock_timestamp() WHERE id = $1',
      [args.eventId, notRequired ? 'NOT_REQUIRED' : 'REQUIRED']);
    const ids: string[] = [];
    for (const line of lines) ids.push(await insertLine(client, args.actor, args.eventId, line));
    const saved = plan(await snapshot(client, args.actor, args.eventId));
    return { eventRequestId: args.eventId, status: notRequired ? 'NOT_REQUIRED' : 'REQUESTED',
      lines: saved.items.filter(line => ids.includes(line.id)), revision: saved.revision };
  });
}
export async function listEquipmentRequests(pool: Pick<Pool, 'query'>, args: { actor: WorkflowActor; eventId?: string }) {
  requireRole(args.actor, ['EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF']);
  if (args.eventId) requireId(args.eventId);
  return (await snapshots(pool, args.actor, args.eventId)).flatMap(state => plan(state).items);
}
export async function listEquipmentTypes(pool: Pick<Pool, 'query'>) {
  return (await pool.query<{ id: string; name: string; category: string | null }>(
    'SELECT id, name, category FROM equipment_types WHERE is_active ORDER BY category NULLS LAST, name, id')).rows;
}
export async function getEventEquipmentPlan(pool: Pick<Pool, 'query'>, args: { eventId: string; actor: WorkflowActor }) {
  requireRole(args.actor, ['EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF']); requireId(args.eventId);
  return plan(await snapshot(pool, args.actor, args.eventId));
}
export async function reviewEquipmentRequest(pool: Pick<Pool, 'connect'>,
  args: { lineId: string; actor: WorkflowActor; input: unknown }) {
  requireRole(args.actor, ['TECHNICAL_SUPPORT_STAFF']); requireId(args.lineId);
  const body = object(args.input, ['decision', 'reason', 'revision']);
  const expected = revision(body);
  if (body.decision !== 'RESERVED' && body.decision !== 'REJECTED') throw bad('decision must be RESERVED or REJECTED.');
  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') throw bad('reason must be text.');
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null;
  if (body.decision === 'REJECTED' && !reason) throw bad('A reason is required to reject an equipment request.');
  if (reason && reason.length > 2000) throw bad('reason must be at most 2000 characters.');
  try {
    return await inActorTransaction(pool, args.actor.id, async client => {
      await lockActor(client, args.actor);
      const eventId = await lineEvent(client, args.lineId);
      const { snapshot: state, validCoordinator } = await lockPlan(client, args.actor, eventId);
      requireRevision(state, expected);
      const line = currentLine(state, args.lineId);
      if (line.status !== 'REQUESTED') conflict('EQUIPMENT_ALREADY_DECIDED', 'This equipment request is no longer awaiting review.');
      if (body.decision === 'RESERVED') {
        const reservation = await readEquipmentReservationSnapshot(client, eventId);
        const request = reservation.requests.find(row => row.id === line.id)!;
        await reserveEquipmentInTransaction(client, reservation, request, args.actor, validCoordinator);
      } else {
        await client.query(`WITH stamp AS MATERIALIZED (SELECT clock_timestamp() AS at)
          UPDATE equipment_requests SET status = 'REJECTED', decided_by = $2, decided_at = stamp.at,
            decision_reason = $3, revision = revision + 1, updated_at = stamp.at FROM stamp WHERE id = $1`,
        [line.id, args.actor.id, reason]);
        await recordNotifications(client, [state.event.coordinatorId, args.actor.id].filter((id): id is string => id !== null)
          .map(recipientId => ({ recipientId, eventRequestId: eventId, equipmentRequestId: line.id,
            type: 'EQUIPMENT_REJECTED', title: 'Equipment request rejected',
            message: `An equipment request for ${state.event.name ?? 'your event'} was rejected: ${reason}`,
            dedupeKey: `EQUIPMENT_REJECTED:${line.id}` })));
      }
      return plan(await snapshot(client, args.actor, eventId)).items.find(row => row.id === line.id)!;
    });
  } catch (error) {
    if (error instanceof WorkflowError && error.code === 'EQUIPMENT_STOCK_CONFLICT') {
      conflict('EQUIPMENT_UNAVAILABLE', 'The requested quantity is no longer available for this period.');
    }
    if (typeof error === 'object' && error !== null && 'constraint' in error && error.constraint === 'equipment_requests_within_pool') {
      conflict('EQUIPMENT_UNAVAILABLE', 'The requested quantity is no longer available for this period.');
    }
    throw error;
  }
}
export async function replaceReservedEquipmentLine(pool: Pick<Pool, 'connect'>,
  args: { lineId: string; actor: WorkflowActor; input: unknown }) {
  requireRole(args.actor, ['EVENT_COORDINATOR']); requireId(args.lineId);
  const body = object(args.input, ['replacement', 'revision']);
  const expected = revision(body);
  const replacement = parseLine(body.replacement);
  return inActorTransaction(pool, args.actor.id, async client => {
    await lockActor(client, args.actor);
    const eventId = await lineEvent(client, args.lineId);
    const { snapshot: state } = await lockPlan(client, args.actor, eventId, [replacement.equipmentTypeId]);
    requireRevision(state, expected);
    const line = currentLine(state, args.lineId);
    if (line.status !== 'RESERVED') conflict('EQUIPMENT_NOT_RESERVED', 'Only a reserved line can be replaced.');
    requirePeriod(state.event, replacement);
    if (state.items.some(row => row.id !== line.id && row.status !== 'CANCELLED' && row.equipmentTypeId === replacement.equipmentTypeId)) {
      conflict('EQUIPMENT_REPLACEMENT_REQUIRED', 'Use one active line per equipment type.');
    }
    // Insertion and cancellation are one transaction. New REQUESTED lines must undergo KAN-26 again.
    const newId = await insertLine(client, args.actor, eventId, replacement);
    await releaseLine(client, args.actor, line.id, 'Explicitly replaced by coordinator');
    await client.query("UPDATE event_requests SET equipment_plan_status = 'REQUIRED', updated_at = clock_timestamp() WHERE id = $1", [eventId]);
    const saved = plan(await snapshot(client, args.actor, eventId));
    return { cancelledRequestId: line.id, replacement: saved.items.find(row => row.id === newId)!, revision: saved.revision };
  });
}
export async function cancelEquipmentLine(pool: Pick<Pool, 'connect'>,
  args: { lineId: string; actor: WorkflowActor; input: unknown }) {
  requireRole(args.actor, ['EVENT_COORDINATOR']); requireId(args.lineId);
  const body = object(args.input, ['reason', 'revision']);
  const expected = revision(body);
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason || reason.length > 2000) throw bad('A valid cancellation reason is required.');
  return inActorTransaction(pool, args.actor.id, async client => {
    await lockActor(client, args.actor);
    const eventId = await lineEvent(client, args.lineId);
    const { snapshot: state } = await lockPlan(client, args.actor, eventId);
    requireRevision(state, expected);
    const line = currentLine(state, args.lineId);
    if (!['REQUESTED', 'REJECTED'].includes(line.status)) conflict('EQUIPMENT_CANNOT_BE_CANCELLED', 'Only a requested or rejected line can be cancelled directly.');
    await releaseLine(client, args.actor, line.id, reason);
    return plan(await snapshot(client, args.actor, eventId)).items.find(row => row.id === line.id)!;
  });
}
