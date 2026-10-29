import { WorkflowError, parseObjectBody } from '../events/workflow-support.js';
import type { EquipmentStockUpdateInput } from './stock-types.js';

export const MAX_STOCK_QUANTITY = 1_000_000;
export const MAX_STOCK_REASON_LENGTH = 500;

export function invalidStock(message: string): WorkflowError {
  return new WorkflowError('INVALID_INPUT', 'INVALID_EQUIPMENT_STOCK_INPUT', message);
}

function quantity(body: Record<string, unknown>, field: 'totalQuantity' | 'damagedQuantity' | 'maintenanceQuantity'): number | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_STOCK_QUANTITY) {
    throw invalidStock(`${field} must be a whole number from 0 to ${MAX_STOCK_QUANTITY.toLocaleString('en-SG')}.`);
  }
  return value;
}

/**
 * KAN-18-AC101: nonnegative whole quantities, a reason, and the revision the form was based on.
 * Whether damaged + maintenance fits within the total depends on the current row, so it is checked
 * under the row lock by the service.
 */
export function parseEquipmentStockInput(input: unknown): EquipmentStockUpdateInput {
  const body = parseObjectBody(input, ['expectedRevision', 'totalQuantity', 'damagedQuantity', 'maintenanceQuantity', 'reason']);
  const revision = body.expectedRevision;
  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 0 || revision > 2_147_483_647) {
    throw new WorkflowError('INVALID_INPUT', 'EXPECTED_REVISION_REQUIRED',
      'expectedRevision is required; reload the stock list and try again.');
  }
  const totalQuantity = quantity(body, 'totalQuantity');
  const damagedQuantity = quantity(body, 'damagedQuantity');
  const maintenanceQuantity = quantity(body, 'maintenanceQuantity');
  if (totalQuantity === undefined && damagedQuantity === undefined && maintenanceQuantity === undefined) {
    throw invalidStock('Supply at least one of totalQuantity, damagedQuantity or maintenanceQuantity.');
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason || reason.length > MAX_STOCK_REASON_LENGTH) {
    throw invalidStock(`A reason of 1 to ${MAX_STOCK_REASON_LENGTH} characters is required.`);
  }
  return {
    expectedRevision: revision, reason,
    ...(totalQuantity !== undefined ? { totalQuantity } : {}),
    ...(damagedQuantity !== undefined ? { damagedQuantity } : {}),
    ...(maintenanceQuantity !== undefined ? { maintenanceQuantity } : {}),
  };
}
