import type { PoolClient } from 'pg';
import {
  inActorTransaction, requestNotFound, UUID_PATTERN, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { recordNotifications } from '../notifications/notify.js';
import { equipmentReservationNotifications } from '../notifications/trigger-matrix.js';
import { aggregateEquipmentItems, equipmentPeriod } from './availability-input.js';
import { assessEquipmentItem, type EquipmentReservation } from './availability-rules.js';
import { equipmentRequirementsVersion } from './availability-service.js';
import type { EquipmentTypeSummary, SavedEquipmentRequest } from './availability-types.js';
import {
  invalidReservation, parseEquipmentReservationInput, type EquipmentReservationAction,
} from './reservation-input.js';
import type {
  EquipmentReservationContext, EquipmentReservationRequest, EquipmentReservationResult, EquipmentReadiness,
} from './reservation-types.js';

type Reader = Pick<PoolClient, 'query'>;
export type StoredEquipmentRequest = Omit<EquipmentReservationRequest, 'canReserve' | 'canCancel'>;
export interface EquipmentReservationSnapshot {
  event: EquipmentReservationContext['event'];
  coordinatorId: string | null;
  requests: StoredEquipmentRequest[];
  equipmentTypes: EquipmentTypeSummary[];
  reservations: EquipmentReservation[];
}
const iso = (column: string) => `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const conflict = (code: string, message: string) => new WorkflowError('CONFLICT', code, message);

function requireTechnicalSupport(actor: WorkflowActor): void {
  if (actor.role !== 'TECHNICAL_SUPPORT_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only Technical Support Staff can manage equipment reservations.');
  }
}

function requireId(id: string): void {
  if (!UUID_PATTERN.test(id)) throw invalidReservation('Event and equipment request IDs must be UUIDs.');
}

/** One statement supplies a consistent read, including private competing quantities only. */
export async function readEquipmentReservationSnapshot(reader: Reader, eventId: string): Promise<EquipmentReservationSnapshot> {
  const found = await reader.query<EquipmentReservationSnapshot>(`SELECT
    jsonb_build_object('id', e.id, 'name', e.name, 'status', e.status,
      'startsAt', ${iso('e.starts_at')}, 'endsAt', ${iso('e.ends_at')},
      'equipmentRequirements', e.equipment_requirements) AS event,
    e.coordinator_id AS "coordinatorId",
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id, 'equipmentTypeId', r.equipment_type_id, 'equipmentName', t.name,
      'quantity', r.quantity, 'status', r.status, 'startsAt', ${iso('r.starts_at')},
      'endsAt', ${iso('r.ends_at')}, 'notes', r.notes, 'decidedBy', r.decided_by,
      'decidedAt', ${iso('r.decided_at')}, 'decisionReason', r.decision_reason,
      'releasedBy', r.released_by, 'releasedAt', ${iso('r.released_at')},
      'releaseReason', r.release_reason, 'releaseCause', r.release_cause) ORDER BY r.id), '[]'::jsonb)
      FROM equipment_requests r JOIN equipment_types t ON t.id = r.equipment_type_id
      WHERE r.event_request_id = e.id) AS requests,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', t.id, 'name', t.name, 'category', t.category, 'totalQuantity', t.total_quantity,
      'damagedQuantity', t.damaged_quantity, 'maintenanceQuantity', t.maintenance_quantity,
      'isActive', t.is_active) ORDER BY t.id), '[]'::jsonb)
      FROM equipment_types t WHERE EXISTS (SELECT 1 FROM equipment_requests own
        WHERE own.event_request_id = e.id AND own.equipment_type_id = t.id)) AS "equipmentTypes",
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id, 'equipmentTypeId', r.equipment_type_id, 'quantity', r.quantity,
      'startsAt', ${iso('r.starts_at')}, 'endsAt', ${iso('r.ends_at')}) ORDER BY r.id), '[]'::jsonb)
      FROM equipment_requests r WHERE r.status = 'RESERVED'
      AND r.starts_at < e.ends_at AND r.ends_at > e.starts_at
      AND EXISTS (SELECT 1 FROM equipment_requests own WHERE own.event_request_id = e.id
        AND own.equipment_type_id = r.equipment_type_id)) AS reservations
    FROM event_requests e WHERE e.id = $1 AND e.status IN ('APPROVED', 'CONFIRMED')`, [eventId]);
  if (!found.rows[0]) throw requestNotFound();
  return found.rows[0];
}

function activeRequests(requests: readonly StoredEquipmentRequest[]): SavedEquipmentRequest[] {
  return requests.filter((row): row is StoredEquipmentRequest & { status: SavedEquipmentRequest['status'] } =>
    row.status !== 'CANCELLED');
}

function matchingPeriod(event: EquipmentReservationContext['event'], row: StoredEquipmentRequest): boolean {
  try {
    const expected = equipmentPeriod(event.startsAt, event.endsAt);
    const actual = equipmentPeriod(row.startsAt, row.endsAt);
    aggregateEquipmentItems([row]);
    return expected.start === actual.start && expected.end === actual.end;
  } catch (error) {
    if (error instanceof WorkflowError) return false;
    throw error;
  }
}

/** KAN-26 equipment readiness; KAN-61 confirmation reuses it. */
export function equipmentReadiness(snapshot: EquipmentReservationSnapshot): EquipmentReadiness {
  const active = snapshot.requests.filter(row => row.status !== 'CANCELLED');
  const base = { activeCount: active.length, reservedCount: active.filter(row => row.status === 'RESERVED').length };
  if (active.length === 0) return { ...base, status: 'NO_REQUIREMENTS',
    message: 'No active saved equipment requirements. This does not record equipment as Not Required.' };
  if (active.some(row => !matchingPeriod(snapshot.event, row))) {
    return { ...base, status: 'INVALID_REQUIREMENTS', message: 'Reconcile saved quantities and dates with the current event before reserving.' };
  }
  let items: { equipmentTypeId: string; quantity: number }[];
  try { items = aggregateEquipmentItems(active); } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    return { ...base, status: 'INVALID_REQUIREMENTS', message: 'The combined saved quantity exceeds the supported equipment quantity.' };
  }
  const excluded = new Set(active.filter(row => row.status === 'RESERVED').map(row => row.id));
  const types = new Map(snapshot.equipmentTypes.map(row => [row.id, row]));
  const shortfall = items.some(item => {
    const type = types.get(item.equipmentTypeId);
    return !type || assessEquipmentItem(type, item.quantity, snapshot.reservations,
      snapshot.event.startsAt!, snapshot.event.endsAt!, excluded).shortfallQuantity > 0;
  });
  if (shortfall) return { ...base, status: 'SHORTFALL', message: 'Current operational stock cannot fulfil all active equipment requirements.' };
  if (base.reservedCount !== base.activeCount) return { ...base, status: 'PENDING',
    message: 'Every active required line must be reserved before equipment is ready.' };
  return { ...base, status: 'READY', message: 'All active required lines are reserved and currently fulfilable.' };
}

export function equipmentReservationContext(snapshot: EquipmentReservationSnapshot): EquipmentReservationContext {
  return {
    event: snapshot.event,
    requirementsVersion: equipmentRequirementsVersion(snapshot.event, activeRequests(snapshot.requests)),
    requests: snapshot.requests.map(row => ({ ...row,
      canReserve: snapshot.event.status === 'APPROVED' && row.status === 'REQUESTED'
        && snapshot.coordinatorId !== null && matchingPeriod(snapshot.event, row),
      canCancel: snapshot.event.status === 'APPROVED' && row.status === 'RESERVED',
    })),
    readiness: equipmentReadiness(snapshot),
  };
}

export async function getEquipmentReservationContext(
  { pool }: WorkflowDependencies, { actor, eventId }: { actor: WorkflowActor; eventId: string },
): Promise<EquipmentReservationContext> {
  requireTechnicalSupport(actor);
  requireId(eventId);
  return equipmentReservationContext(await readEquipmentReservationSnapshot(pool, eventId));
}

/** A retry may use the exact pre-action version; any intervening source change still conflicts. */
function versionMatches(
  snapshot: EquipmentReservationSnapshot, row: StoredEquipmentRequest, action: EquipmentReservationAction,
  version: string, alreadyApplied: boolean,
): boolean {
  if (version === equipmentRequirementsVersion(snapshot.event, activeRequests(snapshot.requests))) return true;
  if (!alreadyApplied) return false;
  const previous = snapshot.requests.map(item => item.id === row.id
    ? { ...item, status: action === 'reserve' ? 'REQUESTED' as const : 'RESERVED' as const } : item);
  return version === equipmentRequirementsVersion(snapshot.event, activeRequests(previous));
}

export async function changeEquipmentReservation(
  { pool }: WorkflowDependencies,
  { actor, eventId, requestId, action, input }: {
    actor: WorkflowActor; eventId: string; requestId: string; action: EquipmentReservationAction; input: unknown;
  },
): Promise<EquipmentReservationResult> {
  requireTechnicalSupport(actor);
  requireId(eventId);
  requireId(requestId);
  const parsed = parseEquipmentReservationInput(input, action);
  try {
    return await inActorTransaction(pool, actor.id, async client => {
      // Keep the trusted profile stable until commit; a role revoked before this lock cannot write.
      const profile = await client.query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 FOR SHARE', [actor.id]);
      if (profile.rows[0]?.role !== 'TECHNICAL_SUPPORT_STAFF') {
        throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Technical Support access is no longer available.');
      }
      const event = await client.query<{ status: string; coordinatorId: string | null }>(
        'SELECT status, coordinator_id AS "coordinatorId" FROM event_requests WHERE id = $1 FOR UPDATE', [eventId]);
      if (!event.rows[0]) throw requestNotFound();
      if (event.rows[0].status !== 'APPROVED') throw conflict('EQUIPMENT_EVENT_NOT_APPROVED', 'Only an APPROVED event may have equipment reservations changed.');
      // Assignment is stable under the event lock. Lock the recipient profile before any pool
      // so an administrative role change cannot commit a reservation with an unusable notice.
      let validCoordinator = false;
      if (action === 'reserve' && event.rows[0].coordinatorId) {
        const recipient = await client.query<{ role: string }>(
          'SELECT role FROM app_users WHERE id = $1 FOR SHARE', [event.rows[0].coordinatorId]);
        validCoordinator = recipient.rows[0]?.role === 'EVENT_COORDINATOR';
      }
      // Shared writer protocol: event -> sorted pools -> sorted lines. Occupancy is read AFTER locks.
      await client.query(`SELECT t.id FROM equipment_types t WHERE EXISTS (
        SELECT 1 FROM equipment_requests r WHERE r.event_request_id = $1 AND r.equipment_type_id = t.id)
        ORDER BY t.id FOR UPDATE`, [eventId]);
      await client.query('SELECT id FROM equipment_requests WHERE event_request_id = $1 ORDER BY id FOR UPDATE', [eventId]);
      const snapshot = await readEquipmentReservationSnapshot(client, eventId);
      const row = snapshot.requests.find(item => item.id === requestId);
      if (!row) throw new WorkflowError('NOT_FOUND', 'EQUIPMENT_REQUEST_NOT_FOUND', 'The saved equipment request was not found for this event.');
      const alreadyApplied = action === 'reserve' ? row.status === 'RESERVED'
        : row.status === 'CANCELLED' && row.releaseCause === 'MANUAL_CANCELLATION' && row.releaseReason === parsed.reason;
      if (!versionMatches(snapshot, row, action, parsed.requirementsVersion, alreadyApplied)) {
        throw conflict('EQUIPMENT_CONTEXT_CHANGED', 'The event or saved equipment requirements have changed. Refresh before deciding again.');
      }
      if (alreadyApplied) return { changed: false, context: equipmentReservationContext(snapshot) };
      if (action === 'reserve') {
        await reserveEquipmentInTransaction(client, snapshot, row, actor, validCoordinator);
      } else {
        if (row.status !== 'RESERVED') throw conflict('EQUIPMENT_REQUEST_NOT_CANCELLABLE', 'Only an existing reservation can be cancelled.');
        const updated = await client.query(`WITH stamp AS MATERIALIZED (SELECT clock_timestamp() AS at)
          UPDATE equipment_requests SET status = 'CANCELLED', released_by = $1,
          released_at = stamp.at, release_reason = $2, release_cause = 'MANUAL_CANCELLATION',
          updated_at = stamp.at FROM stamp WHERE id = $3 AND event_request_id = $4 AND status = 'RESERVED'`,
        [actor.id, parsed.reason, requestId, eventId]);
        if (updated.rowCount !== 1) throw new Error('The equipment cancellation was not saved.');
      }
      return { changed: true, context: equipmentReservationContext(await readEquipmentReservationSnapshot(client, eventId)) };
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'constraint' in error
      && error.constraint === 'equipment_requests_within_pool') {
      throw conflict('EQUIPMENT_STOCK_CONFLICT', 'Current operational stock cannot fulfil this whole request. Refresh availability.');
    }
    throw error;
  }
}

/** KAN-26 reservation writer reused by KAN-63 after the same actor/event/pool/line locks. */
export async function reserveEquipmentInTransaction(
  client: Reader, snapshot: EquipmentReservationSnapshot, row: StoredEquipmentRequest,
  actor: WorkflowActor, validCoordinator: boolean,
): Promise<void> {
  if (row.status !== 'REQUESTED') throw conflict('EQUIPMENT_REQUEST_NOT_RESERVABLE', 'Only a pending saved request can be reserved.');
  if (!matchingPeriod(snapshot.event, row)) throw conflict('EQUIPMENT_REQUEST_PERIOD_MISMATCH', 'Saved quantities and dates must match the current event.');
  if (!snapshot.coordinatorId || !validCoordinator) {
    throw conflict('EQUIPMENT_COORDINATOR_REQUIRED', 'Assign a current Event Coordinator before reserving equipment.');
  }
  const type = snapshot.equipmentTypes.find(item => item.id === row.equipmentTypeId);
  if (!type || assessEquipmentItem(type, row.quantity, snapshot.reservations,
    row.startsAt, row.endsAt, new Set()).shortfallQuantity > 0) {
    throw conflict('EQUIPMENT_STOCK_CONFLICT', 'Current operational stock cannot fulfil this whole request. Refresh availability.');
  }
  const updated = await client.query(`WITH stamp AS MATERIALIZED (SELECT clock_timestamp() AS at)
    UPDATE equipment_requests SET status = 'RESERVED', decided_by = $1,
    decided_at = stamp.at, decision_reason = NULL, updated_at = stamp.at FROM stamp
    WHERE id = $2 AND event_request_id = $3 AND status = 'REQUESTED'`, [actor.id, row.id, snapshot.event.id]);
  if (updated.rowCount !== 1) throw new Error('The equipment reservation was not saved.');
  await recordNotifications(client, equipmentReservationNotifications({
    eventId: snapshot.event.id, eventName: snapshot.event.name, coordinatorId: snapshot.coordinatorId,
    requestId: row.id, equipmentName: row.equipmentName, quantity: row.quantity, technicalSupportId: actor.id,
  }));
}
