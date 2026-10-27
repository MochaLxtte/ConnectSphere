import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import {
  checkEquipmentAvailability, equipmentRequirementsVersion, getEquipmentAvailabilityContext,
  listEquipmentAvailabilityEvents,
} from '../../src/modules/equipment/availability-service.js';
import type { EquipmentAvailabilityContext, SavedEquipmentRequest } from '../../src/modules/equipment/availability-types.js';

const actor: WorkflowActor = { id: '09000000-0000-4000-8000-000000000001', role: 'TECHNICAL_SUPPORT_STAFF' };
const eventId = '09000000-0000-4000-8000-000000000002';
const typeId = '09000000-0000-4000-8000-000000000003';
const startsAt = '2027-01-01T10:00:00.000001Z';
const endsAt = '2027-01-01T12:00:00.000001Z';
const event: EquipmentAvailabilityContext['event'] = {
  id: eventId, name: 'Workshop', status: 'APPROVED', startsAt, endsAt, equipmentRequirements: 'Projector',
};
const saved: SavedEquipmentRequest = {
  id: '09000000-0000-4000-8000-000000000004', equipmentTypeId: typeId,
  quantity: 4, status: 'RESERVED', startsAt, endsAt, notes: null,
};
const type = { id: typeId, name: 'Projector', category: 'AV', totalQuantity: 10,
  damagedQuantity: 1, maintenanceQuantity: 1, isActive: true };
const snapshot = () => ({ event: { ...event }, savedRequests: [{ ...saved }],
  equipmentTypes: [{ ...type }], reservations: [{ ...saved }] });
const query = vi.fn();
const connect = vi.fn();
const dependencies = { pool: { query, connect } as unknown as Pick<Pool, 'query' | 'connect'> };
const savedInput = (row = snapshot()) => ({ mode: 'saved', requirementsVersion: equipmentRequirementsVersion(row.event, row.savedRequests) });
const proposedInput = (row = snapshot(), quantity = 4) => ({
  ...savedInput(row), mode: 'what-if', startsAt, endsAt, items: [{ equipmentTypeId: typeId, quantity }],
});
const check = (input: unknown) => checkEquipmentAvailability(dependencies, { actor, eventId, input });

beforeEach(() => { vi.clearAllMocks(); query.mockResolvedValue({ rows: [snapshot()] }); });

describe('KAN-9 current equipment context and source version', () => {
  it('reads minimum eligible event summaries without invoking a transaction or changing data', async () => {
    const summary = { id: eventId, name: event.name, status: event.status, startsAt, endsAt };
    query.mockResolvedValue({ rows: [{ event: summary }] });
    expect(await listEquipmentAvailabilityEvents(dependencies, actor)).toEqual([summary]);
    expect(query.mock.calls[0]?.[0]).toContain("WHERE e.status IN ('APPROVED', 'CONFIRMED')");
    expect(query.mock.calls[0]?.[0]).not.toContain('organiser_id');
    expect(connect).not.toHaveBeenCalled();
  });
  it('returns current saved statuses including rejected demand and excludes reservation identities', async () => {
    const row = snapshot();
    row.savedRequests.push({ ...saved, id: 'rejected', status: 'REJECTED', quantity: 1 });
    row.reservations.push({ ...saved, id: 'private-other-event-reservation' });
    query.mockResolvedValue({ rows: [row] });
    const context = await getEquipmentAvailabilityContext(dependencies, { actor, eventId });
    expect(context).toEqual({ event, savedRequests: row.savedRequests, equipmentTypes: [type],
      requirementsVersion: equipmentRequirementsVersion(event, row.savedRequests) });
    expect(JSON.stringify(context)).not.toContain('private-other-event-reservation');
    expect(context).not.toHaveProperty('reservations');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[1]).toEqual([eventId, false, null, null, null]);
    expect(query.mock.calls[0]?.[0]).toContain("r.status <> 'CANCELLED'");
  });
  it('hashes actual event and saved values consistently, independent of database row order', () => {
    const second = { ...saved, id: 'other', status: 'REQUESTED' as const };
    const version = equipmentRequirementsVersion(event, [saved, second]);
    expect(equipmentRequirementsVersion(event, [second, saved])).toBe(version);
    for (const patch of [{ quantity: 5 }, { status: 'REJECTED' as const }, { notes: 'Changed' },
      { startsAt: '2027-01-01T10:00:00.000002Z' }, { equipmentTypeId: 'changed' }]) {
      expect(equipmentRequirementsVersion(event, [{ ...saved, ...patch }, second])).not.toBe(version);
    }
    for (const patch of [{ name: 'Changed' }, { status: 'CONFIRMED' as const },
      { equipmentRequirements: 'Speakers' }, { startsAt: '2027-01-01T10:00:00.000002Z' }]) {
      expect(equipmentRequirementsVersion({ ...event, ...patch }, [saved, second])).not.toBe(version);
    }
    expect(equipmentRequirementsVersion(event, [saved])).not.toBe(version);
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'denies direct %s service calls before database reads or input validation', async role => {
      const wrongActor = { ...actor, role };
      await expect(listEquipmentAvailabilityEvents(dependencies, wrongActor)).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      await expect(getEquipmentAvailabilityContext(dependencies, { actor: wrongActor, eventId })).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      await expect(checkEquipmentAvailability(dependencies, { actor: wrongActor, eventId, input: null })).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
      expect(query).not.toHaveBeenCalled();
    },
  );
  it('rejects malformed IDs in direct service calls', async () => {
    await expect(getEquipmentAvailabilityContext(dependencies, { actor, eventId: 'bad' })).rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_AVAILABILITY_INPUT' });
    await expect(checkEquipmentAvailability(dependencies, { actor, eventId: 'bad', input: savedInput() })).rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_AVAILABILITY_INPUT' });
    expect(query).not.toHaveBeenCalled();
  });
  it('returns not found for missing or ineligible events and never falls back to a broader read', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(getEquipmentAvailabilityContext(dependencies, { actor, eventId })).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    await expect(check(savedInput())).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(query.mock.calls[0]?.[0]).toContain("e.status IN ('APPROVED', 'CONFIRMED')");
  });
});

describe('KAN-9 read-only saved and unsaved availability checks', () => {
  it('assesses current saved demand, excluding only the exact own RESERVED line IDs', async () => {
    const row = snapshot();
    row.savedRequests.push({ ...saved, id: 'requested', quantity: 1, status: 'REQUESTED' },
      { ...saved, id: 'rejected', quantity: 1, status: 'REJECTED' });
    row.reservations.push({ ...saved, id: 'another-reservation', quantity: 2 });
    query.mockResolvedValue({ rows: [row] });
    const result = await check(savedInput(row));
    expect(result).toMatchObject({ eventId, mode: 'saved', advisory: true, outcome: 'FULFILLABLE',
      startsAt, endsAt, items: [{ requestedQuantity: 6, operationalQuantity: 8, peakReservedQuantity: 2,
        availableQuantity: 6, shortfallQuantity: 0 }] });
    expect(Number.isFinite(Date.parse(result.checkedAt))).toBe(true);
    expect(JSON.stringify(result)).not.toContain('another-reservation');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[1]).toEqual([eventId, true, null, null, null]);
    expect(query.mock.calls[0]?.[0]).toContain("r.status = 'RESERVED'");
    expect(connect).not.toHaveBeenCalled();
  });
  it('counts existing own reservations as competing demand in unsaved mode', async () => {
    expect(await check(proposedInput(snapshot(), 5))).toMatchObject({ mode: 'what-if', outcome: 'SHORTFALL',
      items: [{ requestedQuantity: 5, peakReservedQuantity: 4, availableQuantity: 4, shortfallQuantity: 1 }] });
    expect(query.mock.calls[0]?.[1]).toEqual([eventId, true, startsAt, endsAt, [typeId]]);
    expect(query.mock.calls[0]?.[0]).not.toMatch(/\b(UPDATE|INSERT|DELETE|FOR UPDATE)\b/);
    expect(connect).not.toHaveBeenCalled();
  });
  it('uses a freshly read stock and reservations snapshot even when requirements have not changed', async () => {
    const row = snapshot();
    row.equipmentTypes[0]!.maintenanceQuantity = 5;
    row.reservations.push({ ...saved, id: 'new', quantity: 2 });
    query.mockResolvedValue({ rows: [row] });
    expect(await check(savedInput())).toMatchObject({ outcome: 'SHORTFALL',
      items: [{ operationalQuantity: 4, peakReservedQuantity: 2, availableQuantity: 2, shortfallQuantity: 2 }] });
  });
  it('refuses a stale saved or proposed request after source requirements change', async () => {
    const row = snapshot();
    row.savedRequests[0]!.quantity = 5;
    query.mockResolvedValue({ rows: [row] });
    for (const input of [savedInput(), proposedInput()]) {
      await expect(check(input)).rejects.toMatchObject({ code: 'EQUIPMENT_CONTEXT_CHANGED', kind: 'CONFLICT' });
    }
  });
  it('rejects an empty saved request but permits a nonempty unsaved assessment', async () => {
    const row = snapshot();
    row.savedRequests = [];
    query.mockResolvedValue({ rows: [row] });
    await expect(check(savedInput(row))).rejects.toMatchObject({ code: 'EQUIPMENT_REQUIREMENTS_EMPTY' });
    expect(await check(proposedInput(row))).toMatchObject({ outcome: 'FULFILLABLE' });
  });
  it.each(['startsAt', 'endsAt'] as const)('rejects a saved %s mismatch at microsecond precision', async field => {
    const row = snapshot();
    row.savedRequests[0]![field] = row.savedRequests[0]![field].replace('000001', '000002');
    query.mockResolvedValue({ rows: [row] });
    await expect(check(savedInput(row))).rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_PERIOD_MISMATCH' });
  });
  it('accepts equal saved and event instants expressed with different time zones', async () => {
    const row = snapshot();
    row.savedRequests[0]!.startsAt = '2027-01-01T18:00:00.000001+08:00';
    row.savedRequests[0]!.endsAt = '2027-01-01T20:00:00.000001+08:00';
    query.mockResolvedValue({ rows: [row] });
    expect(await check(savedInput(row))).toMatchObject({ outcome: 'FULFILLABLE' });
  });
  it('refuses missing saved event dates while supporting an explicitly valid hypothetical period', async () => {
    const row = snapshot();
    row.event.startsAt = null;
    query.mockResolvedValue({ rows: [row] });
    await expect(check(savedInput(row))).rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_AVAILABILITY_INPUT' });
    expect(await check(proposedInput(row))).toMatchObject({ mode: 'what-if' });
  });
  it('reports inactive equipment as a shortfall in both modes instead of dropping the demand', async () => {
    const row = snapshot();
    row.equipmentTypes[0]!.isActive = false;
    query.mockResolvedValue({ rows: [row] });
    for (const input of [savedInput(row), proposedInput(row)]) {
      expect(await check(input)).toMatchObject({ outcome: 'SHORTFALL', items: [{ isActive: false, operationalQuantity: 0, shortfallQuantity: 4 }] });
    }
  });
  it('rejects an unknown equipment type instead of reporting an empty success', async () => {
    const row = snapshot();
    row.equipmentTypes = [];
    query.mockResolvedValue({ rows: [row] });
    await expect(check(proposedInput(row))).rejects.toMatchObject({ code: 'EQUIPMENT_TYPE_NOT_FOUND' });
  });
  it('propagates database failures without attempting a write or fallback snapshot', async () => {
    query.mockRejectedValue(new Error('database failed'));
    await expect(check(savedInput())).rejects.toThrow('database failed');
    expect(query).toHaveBeenCalledTimes(1);
    expect(connect).not.toHaveBeenCalled();
  });
});
