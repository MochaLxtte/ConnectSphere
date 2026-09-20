import { describe, expect, it } from 'vitest';
import {
  parseAvailabilityWindow, parseEquipmentListFilter, parseEquipmentTypeCreateInput,
  parseEquipmentTypeUpdateInput,
} from '../../src/modules/equipment/equipment-input.js';
import { EquipmentInputError } from '../../src/modules/equipment/errors.js';
import {
  parseEquipmentDecisionInput, parseEquipmentRequestCreateInput, parseEquipmentRequestFilter,
  parseEquipmentRequestUpdateInput,
} from '../../src/modules/equipment/request-input.js';

const eventRequestId = '10000000-0000-4000-8000-000000000001';
const equipmentTypeId = '40000000-0000-4000-8000-000000000001';

describe('equipment type input', () => {
  it('trims text, defaults optional fields and keeps a zero quantity', () => {
    expect(parseEquipmentTypeCreateInput({ name: '  Projector ', totalQuantity: 0 })).toEqual({
      name: 'Projector', category: null, description: null, totalQuantity: 0, isActive: true,
    });
    expect(parseEquipmentTypeCreateInput({
      name: 'Mic', category: ' Audio ', description: '  ', totalQuantity: 4, isActive: false,
    })).toEqual({ name: 'Mic', category: 'Audio', description: null, totalQuantity: 4, isActive: false });
  });

  it.each([
    [null], [[]], ['text'],
    [{ totalQuantity: 1 }],
    [{ name: 'Mic' }],
    [{ name: '   ', totalQuantity: 1 }],
    [{ name: 'x'.repeat(121), totalQuantity: 1 }],
    [{ name: 'Mic', totalQuantity: -1 }],
    [{ name: 'Mic', totalQuantity: 1.5 }],
    [{ name: 'Mic', totalQuantity: '3' }],
    [{ name: 'Mic', totalQuantity: 1_000_001 }],
    [{ name: 'Mic', totalQuantity: 1, isActive: 'yes' }],
    [{ name: 'Mic', totalQuantity: 1, category: 7 }],
    [{ name: 'Mic', totalQuantity: 1, id: equipmentTypeId }],
    [{ name: 'Mic', totalQuantity: 1, createdAt: 'now' }],
  ])('rejects an invalid create body: %j', (body) => {
    expect(() => parseEquipmentTypeCreateInput(body)).toThrow(EquipmentInputError);
  });

  it('keeps omitted update fields absent and lets null clear optional text', () => {
    expect(parseEquipmentTypeUpdateInput({ category: null, isActive: false }))
      .toEqual({ category: null, isActive: false });
    expect(parseEquipmentTypeUpdateInput({ totalQuantity: 0 })).toEqual({ totalQuantity: 0 });
    expect(() => parseEquipmentTypeUpdateInput({})).toThrow('At least one field');
    expect(() => parseEquipmentTypeUpdateInput({ name: null })).toThrow(EquipmentInputError);
  });

  it('parses list filters supplied once as text', () => {
    expect(parseEquipmentListFilter({})).toEqual({ q: null, category: null });
    expect(parseEquipmentListFilter({ q: ' mic ', category: '' })).toEqual({ q: 'mic', category: null });
    expect(() => parseEquipmentListFilter({ q: ['a', 'b'] }))
      .toThrow(expect.objectContaining({ code: 'INVALID_EQUIPMENT_LIST_FILTER' }));
  });

  it('requires an ordered availability window', () => {
    const window = parseAvailabilityWindow({ from: '2026-10-01T09:00:00+08:00', to: '2026-10-01T02:00:00Z' });
    expect(window.from.toISOString()).toBe('2026-10-01T01:00:00.000Z');
    expect(window.to.toISOString()).toBe('2026-10-01T02:00:00.000Z');
    for (const query of [
      {}, { from: '2026-10-01T09:00:00Z' }, { from: 'soon', to: 'later' },
      { from: '2026-10-01T09:00:00Z', to: '2026-10-01T09:00:00Z' },
      { from: '2026-10-01T10:00:00Z', to: '2026-10-01T09:00:00Z' },
      { from: ['2026-10-01T09:00:00Z', '2026-10-02T09:00:00Z'], to: '2026-10-03T09:00:00Z' },
    ]) {
      expect(() => parseAvailabilityWindow(query))
        .toThrow(expect.objectContaining({ code: 'INVALID_AVAILABILITY_WINDOW' }));
    }
  });
});

describe('equipment request input', () => {
  it('leaves an omitted interval for the service to default from the event', () => {
    expect(parseEquipmentRequestCreateInput({ eventRequestId, equipmentTypeId, quantity: 2 })).toEqual({
      eventRequestId, equipmentTypeId, quantity: 2, startsAt: null, endsAt: null, notes: null,
    });
    const parsed = parseEquipmentRequestCreateInput({
      eventRequestId, equipmentTypeId, quantity: 1, notes: ' Stage left ',
      startsAt: '2026-10-01T09:00:00Z', endsAt: '2026-10-01T11:00:00Z',
    });
    expect(parsed.notes).toBe('Stage left');
    expect(parsed.startsAt?.toISOString()).toBe('2026-10-01T09:00:00.000Z');
  });

  it.each([
    [{ equipmentTypeId, quantity: 1 }],
    [{ eventRequestId: 'nope', equipmentTypeId, quantity: 1 }],
    [{ eventRequestId, equipmentTypeId: "' OR 1=1--", quantity: 1 }],
    [{ eventRequestId, equipmentTypeId, quantity: 0 }],
    [{ eventRequestId, equipmentTypeId, quantity: 2.5 }],
    [{ eventRequestId, equipmentTypeId }],
    [{ eventRequestId, equipmentTypeId, quantity: 1, startsAt: 'tomorrow' }],
    [{ eventRequestId, equipmentTypeId, quantity: 1, startsAt: '2026-10-01T11:00:00Z', endsAt: '2026-10-01T09:00:00Z' }],
    [{ eventRequestId, equipmentTypeId, quantity: 1, notes: 5 }],
    [{ eventRequestId, equipmentTypeId, quantity: 1, status: 'RESERVED' }],
    [{ eventRequestId, equipmentTypeId, quantity: 1, requestedBy: eventRequestId }],
  ])('rejects an invalid create body: %j', (body) => {
    expect(() => parseEquipmentRequestCreateInput(body))
      .toThrow(expect.objectContaining({ code: 'INVALID_EQUIPMENT_REQUEST_INPUT' }));
  });

  it('validates updates and lets null clear notes only', () => {
    expect(parseEquipmentRequestUpdateInput({ quantity: 3, notes: null })).toEqual({ quantity: 3, notes: null });
    for (const body of [
      {}, null, { quantity: 0 }, { startsAt: null }, { equipmentTypeId }, { status: 'CANCELLED' },
      { startsAt: '2026-10-01T11:00:00Z', endsAt: '2026-10-01T11:00:00Z' },
    ]) {
      expect(() => parseEquipmentRequestUpdateInput(body)).toThrow(EquipmentInputError);
    }
  });

  it('requires a reason only for a rejection', () => {
    expect(parseEquipmentDecisionInput({ decision: 'RESERVED' })).toEqual({ decision: 'RESERVED', reason: null });
    expect(parseEquipmentDecisionInput({ decision: 'REJECTED', reason: ' Broken ' }))
      .toEqual({ decision: 'REJECTED', reason: 'Broken' });
    for (const body of [
      { decision: 'REJECTED' }, { decision: 'REJECTED', reason: '   ' }, { decision: 'REJECTED', reason: null },
      { decision: 'APPROVED' }, { decision: 'RESERVED', reason: 3 }, { decision: 'RESERVED', decidedBy: 'x' }, [],
    ]) {
      expect(() => parseEquipmentDecisionInput(body))
        .toThrow(expect.objectContaining({ code: 'INVALID_EQUIPMENT_DECISION_INPUT' }));
    }
  });

  it('parses the list filter', () => {
    expect(parseEquipmentRequestFilter({})).toEqual({ eventRequestId: null, status: null });
    expect(parseEquipmentRequestFilter({ eventRequestId, status: 'REQUESTED' }))
      .toEqual({ eventRequestId, status: 'REQUESTED' });
    for (const query of [{ eventRequestId: 'x' }, { status: 'PENDING' }, { status: ['REQUESTED', 'RESERVED'] }]) {
      expect(() => parseEquipmentRequestFilter(query))
        .toThrow(expect.objectContaining({ code: 'INVALID_EQUIPMENT_REQUEST_FILTER' }));
    }
  });
});
