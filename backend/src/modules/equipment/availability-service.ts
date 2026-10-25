import { createHash } from 'node:crypto';
import {
  requestNotFound, UUID_PATTERN, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import {
  aggregateEquipmentItems, equipmentPeriod, invalidAvailability, parseEquipmentAvailabilityInput,
} from './availability-input.js';
import { assessEquipmentItem, type EquipmentReservation } from './availability-rules.js';
import type {
  EquipmentAvailabilityAssessment, EquipmentAvailabilityContext, EquipmentAvailabilityInput,
  EquipmentEventSummary, SavedEquipmentRequest,
} from './availability-types.js';

type Snapshot = Omit<EquipmentAvailabilityContext, 'requirementsVersion'> & {
  reservations: EquipmentReservation[];
};

const iso = (column: string) => `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const eventJson = `jsonb_build_object('id', e.id, 'name', e.name, 'status', e.status,
  'startsAt', ${iso('e.starts_at')}, 'endsAt', ${iso('e.ends_at')})`;

function requireTechnicalSupport(actor: WorkflowActor): void {
  if (actor.role !== 'TECHNICAL_SUPPORT_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN',
      'Only Technical Support Staff can check equipment availability.');
  }
}

function requireEventId(eventId: string): void {
  if (!UUID_PATTERN.test(eventId)) throw invalidAvailability('eventId must be a UUID.');
}

/** Hash source values, not updated_at: direct database edits must invalidate old forms too. */
export function equipmentRequirementsVersion(
  event: EquipmentAvailabilityContext['event'], savedRequests: readonly SavedEquipmentRequest[],
): string {
  const stableEvent = {
    id: event.id, name: event.name, status: event.status, startsAt: event.startsAt,
    endsAt: event.endsAt, equipmentRequirements: event.equipmentRequirements,
  };
  const requests = [...savedRequests].sort((a, b) => a.id.localeCompare(b.id)).map(item => ({
    id: item.id, equipmentTypeId: item.equipmentTypeId, quantity: item.quantity, status: item.status,
    startsAt: item.startsAt, endsAt: item.endsAt, notes: item.notes,
  }));
  return createHash('sha256').update(JSON.stringify({ event: stableEvent, requests })).digest('hex');
}

export async function listEquipmentAvailabilityEvents(
  { pool }: WorkflowDependencies, actor: WorkflowActor,
): Promise<EquipmentEventSummary[]> {
  requireTechnicalSupport(actor);
  const found = await pool.query<{ event: EquipmentEventSummary }>(`SELECT ${eventJson} AS event
    FROM event_requests e WHERE e.status IN ('APPROVED', 'CONFIRMED')
    ORDER BY e.starts_at ASC NULLS LAST, e.id`);
  return found.rows.map(row => row.event);
}

/** All inputs come from one PostgreSQL statement snapshot; this endpoint performs no writes. */
async function readSnapshot(
  { pool }: WorkflowDependencies, eventId: string, input?: EquipmentAvailabilityInput,
): Promise<Snapshot> {
  const result = await pool.query<Snapshot>(`SELECT
    ${eventJson} || jsonb_build_object('equipmentRequirements', e.equipment_requirements) AS event,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', t.id, 'name', t.name, 'category', t.category, 'totalQuantity', t.total_quantity,
      'damagedQuantity', t.damaged_quantity, 'maintenanceQuantity', t.maintenance_quantity,
      'isActive', t.is_active) ORDER BY lower(t.name), t.id), '[]'::jsonb)
      FROM equipment_types t WHERE t.is_active OR $2::boolean OR EXISTS (
        SELECT 1 FROM equipment_requests own WHERE own.event_request_id = e.id
        AND own.equipment_type_id = t.id AND own.status <> 'CANCELLED')) AS "equipmentTypes",
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id, 'equipmentTypeId', r.equipment_type_id, 'quantity', r.quantity, 'status', r.status,
      'startsAt', ${iso('r.starts_at')}, 'endsAt', ${iso('r.ends_at')}, 'notes', r.notes)
      ORDER BY r.id), '[]'::jsonb) FROM equipment_requests r
      WHERE r.event_request_id = e.id AND r.status <> 'CANCELLED') AS "savedRequests",
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id, 'equipmentTypeId', r.equipment_type_id, 'quantity', r.quantity,
      'startsAt', ${iso('r.starts_at')}, 'endsAt', ${iso('r.ends_at')}) ORDER BY r.id), '[]'::jsonb)
      FROM equipment_requests r WHERE $2::boolean AND r.status = 'RESERVED'
      AND r.starts_at < COALESCE($4::timestamptz, e.ends_at)
      AND r.ends_at > COALESCE($3::timestamptz, e.starts_at)
      AND (r.equipment_type_id = ANY($5::uuid[]) OR ($5::uuid[] IS NULL AND EXISTS (
        SELECT 1 FROM equipment_requests own WHERE own.event_request_id = e.id
        AND own.status <> 'CANCELLED' AND own.equipment_type_id = r.equipment_type_id)))) AS reservations
    FROM event_requests e WHERE e.id = $1 AND e.status IN ('APPROVED', 'CONFIRMED')`,
  [eventId, input !== undefined, input?.mode === 'what-if' ? input.startsAt : null,
    input?.mode === 'what-if' ? input.endsAt : null,
    input?.mode === 'what-if' ? input.items.map(item => item.equipmentTypeId) : null]);
  const snapshot = result.rows[0];
  if (!snapshot) throw requestNotFound();
  return snapshot;
}

export async function getEquipmentAvailabilityContext(
  dependencies: WorkflowDependencies, { actor, eventId }: { actor: WorkflowActor; eventId: string },
): Promise<EquipmentAvailabilityContext> {
  requireTechnicalSupport(actor);
  requireEventId(eventId);
  const { event, savedRequests, equipmentTypes } = await readSnapshot(dependencies, eventId);
  return { event, equipmentTypes, savedRequests,
    requirementsVersion: equipmentRequirementsVersion(event, savedRequests) };
}

export async function checkEquipmentAvailability(
  dependencies: WorkflowDependencies,
  { actor, eventId, input }: { actor: WorkflowActor; eventId: string; input: unknown },
): Promise<EquipmentAvailabilityAssessment> {
  requireTechnicalSupport(actor);
  requireEventId(eventId);
  const parsed = parseEquipmentAvailabilityInput(input);
  const snapshot = await readSnapshot(dependencies, eventId, parsed);
  const { event, savedRequests, equipmentTypes, reservations } = snapshot;
  if (equipmentRequirementsVersion(event, savedRequests) !== parsed.requirementsVersion) {
    throw new WorkflowError('CONFLICT', 'EQUIPMENT_CONTEXT_CHANGED',
      'The event or saved equipment requirements have changed. Refresh and check again.');
  }
  let startsAt: string;
  let endsAt: string;
  let requestedItems: { equipmentTypeId: string; quantity: number }[];
  const excludedIds = new Set<string>();
  if (parsed.mode === 'saved') {
    if (savedRequests.length === 0) {
      throw new WorkflowError('INVALID_INPUT', 'EQUIPMENT_REQUIREMENTS_EMPTY',
        'This event has no saved equipment requirements. Use an unsaved check to assess proposed items.');
    }
    const eventPeriod = equipmentPeriod(event.startsAt, event.endsAt);
    startsAt = event.startsAt!;
    endsAt = event.endsAt!;
    for (const saved of savedRequests) {
      const period = equipmentPeriod(saved.startsAt, saved.endsAt);
      if (period.start !== eventPeriod.start || period.end !== eventPeriod.end) {
        throw new WorkflowError('CONFLICT', 'EQUIPMENT_REQUEST_PERIOD_MISMATCH',
          'Saved equipment request dates do not match the current event. Reconcile the requests before checking saved requirements.');
      }
      if (saved.status === 'RESERVED') excludedIds.add(saved.id);
    }
    requestedItems = aggregateEquipmentItems(savedRequests);
  } else {
    startsAt = parsed.startsAt;
    endsAt = parsed.endsAt;
    requestedItems = parsed.items;
  }
  const catalogue = new Map(equipmentTypes.map(type => [type.id, type]));
  const items = requestedItems.map(item => {
    const type = catalogue.get(item.equipmentTypeId);
    if (!type) throw new WorkflowError('INVALID_INPUT', 'EQUIPMENT_TYPE_NOT_FOUND',
      'An equipment type is no longer in the catalogue. Refresh and select a current equipment type.');
    return assessEquipmentItem(type, item.quantity, reservations, startsAt, endsAt, excludedIds);
  });
  return {
    eventId: event.id, eventName: event.name, mode: parsed.mode, startsAt, endsAt,
    checkedAt: new Date().toISOString(), advisory: true,
    outcome: items.every(item => item.shortfallQuantity === 0) ? 'FULFILLABLE' : 'SHORTFALL', items,
  };
}
