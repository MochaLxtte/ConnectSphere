import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { recordNotifications } from '../../src/modules/notifications/notify.js';
import { getEquipmentStock, listEquipmentStock, updateEquipmentStock } from '../../src/modules/equipment/stock-service.js';

vi.mock('../../src/modules/notifications/notify.js', () => ({
  recordNotifications: vi.fn(async (_client: unknown, items: unknown[]) => items.length),
}));

const actor: WorkflowActor = { id: '18000000-0000-4000-8000-000000000001', role: 'TECHNICAL_SUPPORT_STAFF' };
const typeId = '18000000-0000-4000-8000-000000000002';
const otherType = '18000000-0000-4000-8000-000000000012';
const coordinatorA = '18000000-0000-4000-8000-0000000000a1';
const coordinatorB = '18000000-0000-4000-8000-0000000000a2';
const at = (hour: number) => `2031-01-12T${String(hour).padStart(2, '0')}:00:00.000000Z`;

interface Row { id: string; name: string; category: string | null; isActive: boolean; totalQuantity: number;
  damagedQuantity: number; maintenanceQuantity: number; revision: number; updatedAt: string }
const type = (over: Partial<Row> = {}): Row => ({ id: typeId, name: 'Projector', category: 'AV', isActive: true, totalQuantity: 10,
  damagedQuantity: 0, maintenanceQuantity: 0, revision: 0, updatedAt: '2026-10-26T02:00:00.000Z', ...over });
const line = (id: string, eventId: string, quantity: number, from: number, to: number, coordinatorId: string | null = coordinatorA, typeKey = typeId) => ({
  id, equipmentTypeId: typeKey, quantity, startsAt: at(from), endsAt: at(to), eventId, eventName: `Event ${eventId}`, coordinatorId });

let row: Row; let types: Row[]; let lines: ReturnType<typeof line>[]; let history: Record<string, unknown>[];
let role: string | null; let validCoordinators: string[]; let updateReturnsRow: boolean; let insertReturnsRow: boolean;
const statements: string[] = [];
const release = vi.fn();
const query = vi.fn(async (sql: string, values: unknown[] = []) => {
  statements.push(sql.replace(/\s+/g, ' ').trim());
  if (sql.includes('FROM app_users WHERE id = $1 FOR SHARE')) return { rows: role ? [{ role }] : [] };
  if (sql.includes('FROM app_users WHERE id = ANY')) return { rows: validCoordinators.map(id => ({ id })) };
  if (sql.includes('FROM equipment_types t WHERE t.id = $1 FOR UPDATE')) return { rows: row ? [{ ...row }] : [] };
  if (sql.includes('FROM equipment_types t WHERE t.id = $1')) return { rows: row ? [{ ...row }] : [] };
  if (sql.includes('FROM equipment_types t ORDER BY')) return { rows: types.map(item => ({ ...item })) };
  if (sql.includes('FROM equipment_requests r JOIN event_requests e')) {
    const wanted = values[0] as string | null;
    return { rows: lines.filter(item => !wanted || item.equipmentTypeId === wanted) };
  }
  if (sql.includes('FROM equipment_stock_changes c')) return { rows: history };
  if (sql.startsWith('UPDATE equipment_types')) {
    if (!updateReturnsRow) return { rows: [] };
    Object.assign(row, { totalQuantity: values[1], damagedQuantity: values[2], maintenanceQuantity: values[3], revision: row.revision + 1 });
    return { rows: [{ revision: row.revision }] };
  }
  if (sql.startsWith('INSERT INTO equipment_stock_changes')) return { rows: insertReturnsRow ? [{ id: 'change-1' }] : [] };
  return { rows: [] };
});
const dependencies = { pool: { query, connect: vi.fn(async () => ({ query, release })) } as unknown as Pick<Pool, 'query' | 'connect'> };
const update = (input: unknown, who: WorkflowActor = actor) => updateEquipmentStock(dependencies, { actor: who, typeId, input });
const body = { expectedRevision: 0, damagedQuantity: 5, reason: 'Fault found.' };

beforeEach(() => {
  vi.clearAllMocks(); statements.length = 0;
  row = type(); types = [row, type({ id: otherType, name: 'Speaker', revision: 2 })]; lines = []; history = []; role = 'TECHNICAL_SUPPORT_STAFF';
  validCoordinators = [coordinatorA, coordinatorB]; updateReturnsRow = true; insertReturnsRow = true;
});

describe('KAN-18 stock service access and reads', () => {
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'KAN-18-AC101 refuses %s before touching the database', async who => {
      const other = { ...actor, role: who };
      await expect(listEquipmentStock(dependencies, { actor: other })).rejects.toMatchObject({ kind: 'FORBIDDEN', code: 'ACTION_FORBIDDEN' });
      await expect(getEquipmentStock(dependencies, { actor: other, typeId })).rejects.toMatchObject({ kind: 'FORBIDDEN' });
      await expect(update(body, other)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
      expect(query).not.toHaveBeenCalled();
      expect(dependencies.pool.connect).not.toHaveBeenCalled();
    });
  it('rejects a malformed type id', async () => {
    await expect(getEquipmentStock(dependencies, { actor, typeId: 'bad' })).rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_TYPE_ID' });
    await expect(updateEquipmentStock(dependencies, { actor, typeId: 'bad', input: body })).rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_TYPE_ID' });
  });
  it('validates the update body before opening a transaction', async () => {
    await expect(update({ expectedRevision: 0, reason: 'x' })).rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_STOCK_INPUT' });
    expect(dependencies.pool.connect).not.toHaveBeenCalled();
  });
  it('KAN-18-AC1 lists each type with operational quantity, status and its own shortfall count', async () => {
    row.damagedQuantity = 5; types = [row, type({ id: otherType, name: 'Speaker', totalQuantity: 4, revision: 2 })];
    lines = [line('l1', 'e1', 7, 2, 6), line('l2', 'e2', 2, 2, 6, coordinatorB, otherType)];
    const items = await listEquipmentStock(dependencies, { actor });
    expect(items).toEqual([
      expect.objectContaining({ id: typeId, operationalQuantity: 5, unavailableQuantity: 5, status: 'PARTLY_UNAVAILABLE', revision: 0, shortfallEventCount: 1 }),
      expect.objectContaining({ id: otherType, operationalQuantity: 4, status: 'AVAILABLE', revision: 2, shortfallEventCount: 0 }),
    ]);
    expect(items[0]!.updatedAt).toBe('2026-10-26T02:00:00.000Z');
  });
  it('reads one type with its history and the period each shortfall covers', async () => {
    row.damagedQuantity = 6; lines = [line('l1', 'e1', 7, 2, 4), line('l2', 'e1', 3, 6, 9), line('l3', 'e2', 2, 3, 5)];
    history = [{ id: 'c1', revision: 1, changedById: actor.id, changedByName: 'Taylor', changedAt: '2026-10-25T04:00:00.000Z', reason: 'Dropped',
      pt: 10, pd: 0, pm: 0, nt: 10, nd: 6, nm: 0 }];
    const found = await getEquipmentStock(dependencies, { actor, typeId });
    expect(found.history).toEqual([{ id: 'c1', revision: 1, changedById: actor.id, changedByName: 'Taylor', changedAt: '2026-10-25T04:00:00.000Z',
      reason: 'Dropped', previous: { totalQuantity: 10, damagedQuantity: 0, maintenanceQuantity: 0 }, next: { totalQuantity: 10, damagedQuantity: 6, maintenanceQuantity: 0 } }]);
    expect(found.shortfalls.map(gap => [gap.eventId, gap.shortfallQuantity, gap.startsAt, gap.endsAt])).toEqual([
      ['e1', 5, at(2), at(9)], ['e2', 5, at(3), at(5)],
    ]);
    expect(found.item.shortfallEventCount).toBe(2);
  });
  it('reports a missing type', async () => {
    row = undefined as never;
    await expect(getEquipmentStock(dependencies, { actor, typeId })).rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'EQUIPMENT_TYPE_NOT_FOUND' });
  });
});

describe('KAN-18 stock service update', () => {
  it('KAN-18-AC2/AC3 saves the quantities with a new revision and a history row, in one transaction', async () => {
    const result = await update(body);
    expect(result).toMatchObject({ changed: true, notifiedEvents: 0, item: { damagedQuantity: 5, operationalQuantity: 5, revision: 1 } });
    expect(statements[0]).toBe('BEGIN ISOLATION LEVEL READ COMMITTED');
    expect(statements).toContain('COMMIT');
    expect(statements.some(sql => sql.startsWith('INSERT INTO equipment_stock_changes'))).toBe(true);
    expect(query.mock.calls.find(call => String(call[0]).startsWith('INSERT INTO equipment_stock_changes'))![1])
      .toEqual([typeId, 1, actor.id, 'Fault found.', 10, 0, 0, 10, 5, 0]);
    expect(recordNotifications).not.toHaveBeenCalled();
  });
  it('KAN-18-AC102 notifies each affected coordinator once and keeps the reservations', async () => {
    lines = [line('l1', 'e1', 7, 2, 6, coordinatorA), line('l2', 'e2', 4, 4, 8, coordinatorB)];
    const result = await update({ ...body, damagedQuantity: 4 });
    expect(result.notifiedEvents).toBe(2);
    expect(result.shortfalls.map(gap => [gap.eventId, gap.shortfallQuantity])).toEqual([['e1', 5], ['e2', 5]]);
    const sent = vi.mocked(recordNotifications).mock.calls[0]![1];
    expect(sent.map(item => [item.recipientId, item.type, item.dedupeKey])).toEqual([
      [coordinatorA, 'EQUIPMENT_STOCK_SHORTFALL', 'EQUIPMENT_STOCK_SHORTFALL:change-1:e1'],
      [coordinatorB, 'EQUIPMENT_STOCK_SHORTFALL', 'EQUIPMENT_STOCK_SHORTFALL:change-1:e2'],
    ]);
    expect(statements.some(sql => sql.startsWith('UPDATE equipment_requests'))).toBe(false);
  });
  it('skips an event with no coordinator or a coordinator who is no longer one', async () => {
    lines = [line('l1', 'e1', 7, 2, 6, null), line('l2', 'e2', 4, 4, 8, coordinatorB)];
    validCoordinators = [coordinatorA];
    const result = await update(body);
    expect(result.shortfalls.map(gap => gap.eventId)).toEqual(['e1', 'e2']);
    expect(result.notifiedEvents).toBe(0);
    expect(vi.mocked(recordNotifications).mock.calls[0]![1]).toEqual([]);
  });
  it('does not notify when the change is not a loss, even if a shortfall remains', async () => {
    row = type({ damagedQuantity: 6, revision: 3 }); lines = [line('l1', 'e1', 7, 2, 6)];
    const result = await update({ expectedRevision: 3, damagedQuantity: 5, reason: 'One repaired.' });
    expect(result.shortfalls).toHaveLength(1);
    expect(result.notifiedEvents).toBe(0);
    expect(recordNotifications).not.toHaveBeenCalled();
  });
  it('does not notify when the loss leaves every reservation covered', async () => {
    lines = [line('l1', 'e1', 3, 2, 6)];
    expect((await update(body)).notifiedEvents).toBe(0);
    expect(recordNotifications).not.toHaveBeenCalled();
  });
  it('KAN-18-AC103 refuses a stale revision with a message that asks for a reload', async () => {
    row = type({ revision: 3 });
    await expect(update({ ...body, expectedRevision: 1 })).rejects.toMatchObject({ kind: 'CONFLICT', code: 'EQUIPMENT_STOCK_REVISION_CONFLICT' });
    expect(statements).toContain('ROLLBACK');
    expect(statements.some(sql => sql.startsWith('UPDATE equipment_types'))).toBe(false);
  });
  it('KAN-18-AC103 answers a retry of the change that just committed with the saved state', async () => {
    row = type({ damagedQuantity: 5, revision: 1 });
    history = [{ id: 'c1', revision: 1, changedById: actor.id, changedByName: 'Taylor', changedAt: '2026-10-25T04:00:00.000Z', reason: 'Fault found.',
      pt: 10, pd: 0, pm: 0, nt: 10, nd: 5, nm: 0 }];
    const result = await update(body);
    expect(result).toMatchObject({ changed: false, notifiedEvents: 0, item: { revision: 1, damagedQuantity: 5 } });
    expect(statements.some(sql => sql.startsWith('UPDATE equipment_types') || sql.startsWith('INSERT INTO equipment_stock_changes'))).toBe(false);
  });
  it.each([
    ['another technician', { changedById: 'someone-else' }],
    ['a different reason', { reason: 'Other reason' }],
    ['different quantities', { nd: 6 }],
    ['a different revision', { revision: 5 }],
  ])('KAN-18-AC103 still refuses a stale form when the latest change was by %s', async (_name, override) => {
    row = type({ damagedQuantity: 5, revision: 1 });
    history = [{ id: 'c1', revision: 1, changedById: actor.id, changedByName: null, changedAt: '2026-10-25T04:00:00.000Z', reason: 'Fault found.',
      pt: 10, pd: 0, pm: 0, nt: 10, nd: 5, nm: 0, ...override }];
    await expect(update(body)).rejects.toMatchObject({ code: 'EQUIPMENT_STOCK_REVISION_CONFLICT' });
  });
  it('refuses a stale revision that is more than one ahead without reading history', async () => {
    row = type({ revision: 4 });
    await expect(update({ ...body, expectedRevision: 1 })).rejects.toMatchObject({ code: 'EQUIPMENT_STOCK_REVISION_CONFLICT' });
    expect(statements.some(sql => sql.includes('FROM equipment_stock_changes c'))).toBe(false);
  });
  it('KAN-18-AC101 refuses damaged plus maintenance above the total, counting what is already recorded', async () => {
    row = type({ maintenanceQuantity: 6 });
    await expect(update({ expectedRevision: 0, damagedQuantity: 5, reason: 'x' })).rejects.toMatchObject({ kind: 'INVALID_INPUT', code: 'INVALID_EQUIPMENT_STOCK_INPUT' });
    await expect(update({ expectedRevision: 0, totalQuantity: 5, reason: 'x' })).rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_STOCK_INPUT' });
  });
  it('records nothing when the quantities already match', async () => {
    const result = await update({ expectedRevision: 0, totalQuantity: 10, damagedQuantity: 0, maintenanceQuantity: 0, reason: 'No difference.' });
    expect(result).toMatchObject({ changed: false, item: { revision: 0 } });
    expect(statements.some(sql => sql.startsWith('UPDATE equipment_types'))).toBe(false);
  });
  it('KAN-18-AC101 refuses when the technician role was removed before the lock', async () => {
    role = 'EVENT_ORGANISER';
    await expect(update(body)).rejects.toMatchObject({ kind: 'FORBIDDEN', message: 'Technical Support access is no longer available.' });
    role = null;
    await expect(update(body)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    expect(statements.some(sql => sql.startsWith('UPDATE equipment_types'))).toBe(false);
  });
  it('reports a missing type', async () => {
    row = undefined as never;
    await expect(update(body)).rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'EQUIPMENT_TYPE_NOT_FOUND' });
  });
  it('rolls back and surfaces an error when the row or its history cannot be written', async () => {
    updateReturnsRow = false;
    await expect(update(body)).rejects.toThrow('The equipment stock change was not saved.');
    expect(statements).toContain('ROLLBACK');
    updateReturnsRow = true; insertReturnsRow = false; row = type();
    await expect(update(body)).rejects.toThrow('The equipment stock history was not saved.');
  });
  it('an inactive type has no operational units, so every reservation is a shortfall', async () => {
    row = type({ isActive: false }); lines = [line('l1', 'e1', 2, 2, 6)];
    const result = await update(body);
    expect(result.item).toMatchObject({ operationalQuantity: 0, status: 'UNAVAILABLE' });
    expect(result.shortfalls[0]).toMatchObject({ eventId: 'e1', shortfallQuantity: 2 });
    expect(result.notifiedEvents).toBe(0);
  });
});
