import { describe, expect, it } from 'vitest';
import { WorkflowError } from '../../src/modules/events/workflow-support.js';
import { MAX_STOCK_QUANTITY, MAX_STOCK_REASON_LENGTH, parseEquipmentStockInput } from '../../src/modules/equipment/stock-input.js';

const valid = { expectedRevision: 3, damagedQuantity: 2, reason: 'Two projectors dropped in transit.' };
const refused = (input: unknown) => { try { parseEquipmentStockInput(input); } catch (error) { return error as WorkflowError; } throw new Error('accepted'); };

describe('KAN-18-AC101 stock update input', () => {
  it('accepts any one or all of the three quantities with a trimmed reason', () => {
    expect(parseEquipmentStockInput(valid)).toEqual({ expectedRevision: 3, damagedQuantity: 2, reason: 'Two projectors dropped in transit.' });
    expect(parseEquipmentStockInput({ expectedRevision: 0, totalQuantity: 12, damagedQuantity: 1, maintenanceQuantity: 0, reason: '  Restocked  ' }))
      .toEqual({ expectedRevision: 0, totalQuantity: 12, damagedQuantity: 1, maintenanceQuantity: 0, reason: 'Restocked' });
  });
  it('accepts zero and the largest allowed quantity, and revision 0 for a never-changed type', () => {
    expect(parseEquipmentStockInput({ expectedRevision: 0, maintenanceQuantity: 0, reason: 'Back in use' }).maintenanceQuantity).toBe(0);
    expect(parseEquipmentStockInput({ ...valid, totalQuantity: MAX_STOCK_QUANTITY }).totalQuantity).toBe(MAX_STOCK_QUANTITY);
  });
  it.each([-1, 1.5, '3', null, MAX_STOCK_QUANTITY + 1, Number.NaN, Infinity])('refuses a quantity of %s', value => {
    for (const field of ['totalQuantity', 'damagedQuantity', 'maintenanceQuantity']) {
      const error = refused({ expectedRevision: 1, reason: 'x', [field]: value });
      expect(error.code).toBe('INVALID_EQUIPMENT_STOCK_INPUT');
    }
  });
  it('requires the revision the form was based on', () => {
    for (const bad of [undefined, -1, 1.2, '2', null, 2_147_483_648]) {
      expect(refused({ ...valid, expectedRevision: bad }).code).toBe('EXPECTED_REVISION_REQUIRED');
    }
  });
  it('requires at least one quantity', () => {
    expect(refused({ expectedRevision: 1, reason: 'Nothing to change' }).code).toBe('INVALID_EQUIPMENT_STOCK_INPUT');
  });
  it('requires a reason of 1 to 500 characters', () => {
    for (const reason of [undefined, '', '   ', 5, 'x'.repeat(MAX_STOCK_REASON_LENGTH + 1)]) {
      expect(refused({ ...valid, reason }).code).toBe('INVALID_EQUIPMENT_STOCK_INPUT');
    }
    expect(parseEquipmentStockInput({ ...valid, reason: 'x'.repeat(MAX_STOCK_REASON_LENGTH) }).reason).toHaveLength(MAX_STOCK_REASON_LENGTH);
  });
  it('rejects unknown fields and non-objects', () => {
    expect(refused({ ...valid, isActive: false }).code).toBe('INVALID_INPUT');
    for (const bad of [null, [], 'text', 7]) expect(refused(bad).code).toBe('INVALID_INPUT');
  });
});
