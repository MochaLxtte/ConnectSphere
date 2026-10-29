import type { PoolClient } from 'pg';
import {
  inActorTransaction, iso, UUID_PATTERN, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { invalidStock, parseEquipmentStockInput } from './stock-input.js';
import { findStockShortfalls, operationalQuantity, stockStatus, type ReservedLine } from './stock-rules.js';
import type {
  EquipmentStockChange, EquipmentStockDetail, EquipmentStockItem, EquipmentStockShortfall,
  EquipmentStockUpdateInput, EquipmentStockUpdateResult,
} from './stock-types.js';

type Reader = Pick<PoolClient, 'query'>;

interface TypeRow {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
  totalQuantity: number;
  damagedQuantity: number;
  maintenanceQuantity: number;
  revision: number;
  updatedAt: Date | string;
}

interface LineRow {
  id: string;
  equipmentTypeId: string;
  quantity: number;
  startsAt: string;
  endsAt: string;
  eventId: string;
  eventName: string | null;
  coordinatorId: string | null;
}

const iso6 = (column: string) => `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const TYPE_COLUMNS = `t.id, t.name, t.category, t.is_active AS "isActive", t.total_quantity AS "totalQuantity",
  t.damaged_quantity AS "damagedQuantity", t.maintenance_quantity AS "maintenanceQuantity",
  t.stock_revision AS revision, t.updated_at AS "updatedAt"`;

function requireTechnicalSupport(actor: WorkflowActor): void {
  if (actor.role !== 'TECHNICAL_SUPPORT_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only Technical Support Staff can view or change equipment stock.');
  }
}

function requireTypeId(id: string): void {
  if (!UUID_PATTERN.test(id)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_EQUIPMENT_TYPE_ID', 'The equipment type ID must be a UUID.');
  }
}

const notFound = () => new WorkflowError('NOT_FOUND', 'EQUIPMENT_TYPE_NOT_FOUND', 'The equipment type was not found.');

/** Every live reservation, so a stock figure is judged against everything reserved at once. */
async function reservedLines(reader: Reader, typeId?: string): Promise<LineRow[]> {
  const found = await reader.query<LineRow>(
    `SELECT r.id, r.equipment_type_id AS "equipmentTypeId", r.quantity, ${iso6('r.starts_at')} AS "startsAt",
       ${iso6('r.ends_at')} AS "endsAt", e.id AS "eventId", e.name AS "eventName", e.coordinator_id AS "coordinatorId"
     FROM equipment_requests r JOIN event_requests e ON e.id = r.event_request_id
     WHERE r.status = 'RESERVED' AND ($1::uuid IS NULL OR r.equipment_type_id = $1)
     ORDER BY r.id`, [typeId ?? null]);
  return found.rows;
}

function toItem(row: TypeRow, shortfallEventCount: number): EquipmentStockItem {
  const operational = operationalQuantity(row);
  return {
    id: row.id, name: row.name, category: row.category, isActive: row.isActive,
    totalQuantity: row.totalQuantity, damagedQuantity: row.damagedQuantity, maintenanceQuantity: row.maintenanceQuantity,
    operationalQuantity: operational, unavailableQuantity: row.damagedQuantity + row.maintenanceQuantity,
    status: stockStatus(row), revision: row.revision, shortfallEventCount, updatedAt: iso(row.updatedAt),
  };
}

function toShortfalls(operational: number, lines: readonly LineRow[]): EquipmentStockShortfall[] {
  const gaps = findStockShortfalls(operational, lines.map((line): ReservedLine => ({
    id: line.id, equipmentTypeId: line.equipmentTypeId, quantity: line.quantity,
    startsAt: line.startsAt, endsAt: line.endsAt, eventId: line.eventId,
  })));
  return gaps.map(gap => {
    const own = lines.filter(line => line.eventId === gap.eventId);
    return {
      eventId: gap.eventId, eventName: own[0]?.eventName ?? null,
      startsAt: own.map(line => line.startsAt).sort()[0]!, endsAt: own.map(line => line.endsAt).sort().at(-1)!,
      reservedQuantity: gap.reservedQuantity, peakReservedQuantity: gap.peakReservedQuantity,
      operationalQuantity: operational, shortfallQuantity: gap.shortfallQuantity,
    };
  });
}

async function readHistory(reader: Reader, typeId: string): Promise<EquipmentStockChange[]> {
  const found = await reader.query<{
    id: string; revision: number; changedById: string; changedByName: string | null; changedAt: Date | string; reason: string;
    pt: number; pd: number; pm: number; nt: number; nd: number; nm: number;
  }>(`SELECT c.id, c.revision, c.changed_by AS "changedById", u.display_name AS "changedByName", c.changed_at AS "changedAt",
        c.reason, c.previous_total_quantity AS pt, c.previous_damaged_quantity AS pd, c.previous_maintenance_quantity AS pm,
        c.new_total_quantity AS nt, c.new_damaged_quantity AS nd, c.new_maintenance_quantity AS nm
      FROM equipment_stock_changes c LEFT JOIN app_users u ON u.id = c.changed_by
      WHERE c.equipment_type_id = $1 ORDER BY c.revision DESC LIMIT 20`, [typeId]);
  return found.rows.map(row => ({
    id: row.id, revision: row.revision, changedById: row.changedById, changedByName: row.changedByName,
    changedAt: iso(row.changedAt), reason: row.reason,
    previous: { totalQuantity: row.pt, damagedQuantity: row.pd, maintenanceQuantity: row.pm },
    next: { totalQuantity: row.nt, damagedQuantity: row.nd, maintenanceQuantity: row.nm },
  }));
}

async function readDetail(reader: Reader, typeId: string): Promise<EquipmentStockDetail> {
  const found = await reader.query<TypeRow>(`SELECT ${TYPE_COLUMNS} FROM equipment_types t WHERE t.id = $1`, [typeId]);
  const row = found.rows[0];
  if (!row) throw notFound();
  const shortfalls = toShortfalls(operationalQuantity(row), await reservedLines(reader, typeId));
  return { item: toItem(row, shortfalls.length), history: await readHistory(reader, typeId), shortfalls };
}

/** KAN-18-AC1/AC3: the current stock and operational status of every equipment type. */
export async function listEquipmentStock(
  { pool }: WorkflowDependencies, { actor }: { actor: WorkflowActor },
): Promise<EquipmentStockItem[]> {
  requireTechnicalSupport(actor);
  const types = await pool.query<TypeRow>(`SELECT ${TYPE_COLUMNS} FROM equipment_types t ORDER BY lower(t.name), t.id`);
  const lines = await reservedLines(pool);
  return types.rows.map(row => toItem(row, toShortfalls(operationalQuantity(row),
    lines.filter(line => line.equipmentTypeId === row.id)).length));
}

export async function getEquipmentStock(
  { pool }: WorkflowDependencies, { actor, typeId }: { actor: WorkflowActor; typeId: string },
): Promise<EquipmentStockDetail> {
  requireTechnicalSupport(actor);
  requireTypeId(typeId);
  return readDetail(pool, typeId);
}

type Quantities = Pick<EquipmentStockChange['next'], 'totalQuantity' | 'damagedQuantity' | 'maintenanceQuantity'>;

function merge(current: Quantities, input: EquipmentStockUpdateInput): Quantities {
  return {
    totalQuantity: input.totalQuantity ?? current.totalQuantity,
    damagedQuantity: input.damagedQuantity ?? current.damagedQuantity,
    maintenanceQuantity: input.maintenanceQuantity ?? current.maintenanceQuantity,
  };
}

const sameQuantities = (a: Quantities, b: Quantities) => a.totalQuantity === b.totalQuantity
  && a.damagedQuantity === b.damagedQuantity && a.maintenanceQuantity === b.maintenanceQuantity;

/** Thrown inside the transaction when a reservation committed after the events were chosen; the caller retries with them. */
class EventLockSetChanged extends Error {
  constructor(readonly eventIds: string[]) { super('The reserved events changed while the stock was being locked.'); }
}
const MAX_LOCK_ATTEMPTS = 5;

/** Events that hold a live reservation of this type: the ones a stock loss may leave uncovered and tell. */
async function reservedEventIds(reader: Reader, typeId: string): Promise<string[]> {
  const found = await reader.query<{ id: string }>(
    `SELECT DISTINCT r.event_request_id AS id FROM equipment_requests r WHERE r.equipment_type_id = $1 AND r.status = 'RESERVED'`, [typeId]);
  return found.rows.map(row => row.id);
}

/**
 * KAN-18-AC2/AC3/AC6/AC101-AC103: change pooled total, damaged or maintenance quantities. The change
 * and its history row commit together. Existing reservations are never altered. When the change loses
 * usable units, migration 019's `notify_equipment_shortfall` trigger, the only notice writer, tells each
 * affected event's people in this same transaction; the response reports the shortfall itself.
 *
 * Lock order matches cancellation, completion and reservation (event, then equipment pool). The trigger's
 * notices reference the affected events, so those events are locked first, before the pool; taking the
 * pool first deadlocked with a concurrent cancellation of an affected event. A reservation that commits
 * between choosing the events and locking the pool restarts the attempt with the larger set.
 */
export async function updateEquipmentStock(
  { pool }: WorkflowDependencies,
  { actor, typeId, input }: { actor: WorkflowActor; typeId: string; input: unknown },
): Promise<EquipmentStockUpdateResult> {
  requireTechnicalSupport(actor);
  requireTypeId(typeId);
  const parsed = parseEquipmentStockInput(input);
  let known: string[] = [];
  for (let attempt = 0; attempt < MAX_LOCK_ATTEMPTS; attempt++) {
    try {
      return await inActorTransaction(pool, actor.id, client => applyStockChange(client, actor, typeId, parsed, known));
    } catch (error) {
      if (!(error instanceof EventLockSetChanged)) throw error;
      known = error.eventIds;
    }
  }
  throw new WorkflowError('CONFLICT', 'EQUIPMENT_STOCK_BUSY', 'Reservations for this equipment kept changing. Try saving again.');
}

async function applyStockChange(
  client: PoolClient, actor: WorkflowActor, typeId: string, parsed: EquipmentStockUpdateInput,
  known: readonly string[],
): Promise<EquipmentStockUpdateResult> {
  // Keep the trusted profile stable until commit; a role revoked before this lock cannot write.
  const profile = await client.query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 FOR SHARE', [actor.id]);
  if (profile.rows[0]?.role !== 'TECHNICAL_SUPPORT_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Technical Support access is no longer available.');
  }
  const eventIds = [...new Set([...known, ...await reservedEventIds(client, typeId)])].sort();
  if (eventIds.length > 0) await client.query('SELECT id FROM event_requests WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE', [eventIds]);
  // The pool lock is the one every reservation and release takes, so the reserved set below is stable.
  const locked = await client.query<TypeRow>(`SELECT ${TYPE_COLUMNS} FROM equipment_types t WHERE t.id = $1 FOR UPDATE`, [typeId]);
  const row = locked.rows[0];
  if (!row) throw notFound();
  const held = new Set(eventIds);
  const current = await reservedEventIds(client, typeId);
  if (current.some(id => !held.has(id))) throw new EventLockSetChanged([...new Set([...eventIds, ...current])].sort());

  const before: Quantities = { totalQuantity: row.totalQuantity, damagedQuantity: row.damagedQuantity, maintenanceQuantity: row.maintenanceQuantity };
  const after = merge(before, parsed);

  if (row.revision !== parsed.expectedRevision) {
    // A retry of a change that already committed is answered with the saved state, not an error.
    const last = row.revision === parsed.expectedRevision + 1 ? (await readHistory(client, typeId))[0] : undefined;
    if (last && last.revision === row.revision && last.changedById === actor.id && last.reason === parsed.reason
      && sameQuantities(last.next, merge(last.previous, parsed))) {
      return { ...(await readDetail(client, typeId)), changed: false, notifiedEvents: 0 };
    }
    throw new WorkflowError('CONFLICT', 'EQUIPMENT_STOCK_REVISION_CONFLICT',
      'This stock was changed after you opened it. Reload to see the current quantities, then make your change again.');
  }
  if (after.damagedQuantity + after.maintenanceQuantity > after.totalQuantity) {
    throw invalidStock('Damaged plus maintenance quantities cannot be more than the total quantity.');
  }
  if (sameQuantities(before, after)) {
    return { ...(await readDetail(client, typeId)), changed: false, notifiedEvents: 0 };
  }

  const updated = await client.query<{ revision: number }>(
    `UPDATE equipment_types SET total_quantity = $2, damaged_quantity = $3, maintenance_quantity = $4,
       stock_revision = stock_revision + 1, updated_at = clock_timestamp()
     WHERE id = $1 RETURNING stock_revision AS revision`,
    [typeId, after.totalQuantity, after.damagedQuantity, after.maintenanceQuantity]);
  const revision = updated.rows[0]?.revision;
  if (revision === undefined) throw new Error('The equipment stock change was not saved.');
  await client.query(
    `INSERT INTO equipment_stock_changes (equipment_type_id, revision, changed_by, reason,
       previous_total_quantity, previous_damaged_quantity, previous_maintenance_quantity,
       new_total_quantity, new_damaged_quantity, new_maintenance_quantity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [typeId, revision, actor.id, parsed.reason, before.totalQuantity, before.damagedQuantity, before.maintenanceQuantity,
      after.totalQuantity, after.damagedQuantity, after.maintenanceQuantity]);

  // The UPDATE above fired the trigger; count the events it told, from the rows this transaction wrote.
  const told = await client.query<{ n: number }>(
    `SELECT count(DISTINCT event_request_id)::integer AS n FROM notifications
     WHERE type = 'EQUIPMENT_UNAVAILABLE' AND xmin = pg_current_xact_id()::xid`);
  return { ...(await readDetail(client, typeId)), changed: true, notifiedEvents: told.rows[0]?.n ?? 0 };
}
