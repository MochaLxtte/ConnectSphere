import { describe, expect, it, vi } from 'vitest';
import { fetchEquipmentStock, fetchEquipmentStockDetail, stockStatusLabel, updateEquipmentStock } from './equipment-stock';

describe('KAN-18 equipment stock API client', () => {
  it('uses the dedicated encoded stock endpoints and passes cancellation signals', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 'a' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ item: { id: 'a/b' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ changed: true })));
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    expect(await fetchEquipmentStock(signal)).toEqual([{ id: 'a' }]);
    expect(await fetchEquipmentStockDetail('a/b', signal)).toEqual({ item: { id: 'a/b' } });
    const update = { expectedRevision: 2, damagedQuantity: 3, reason: 'Dropped' };
    expect(await updateEquipmentStock('a/b', update, signal)).toEqual({ changed: true });
    expect(fetch.mock.calls.map(call => call[0])).toEqual(['/api/equipment/stock', '/api/equipment/stock/a%2Fb', '/api/equipment/stock/a%2Fb']);
    expect(fetch.mock.calls[2]?.[1]).toMatchObject({ method: 'PATCH', body: JSON.stringify(update) });
    for (const call of fetch.mock.calls) expect(call[1].signal).toBe(signal);
  });
  it('preserves structured failures such as a stale revision', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: {
      code: 'EQUIPMENT_STOCK_REVISION_CONFLICT', message: 'Reload.' } }), { status: 409 })));
    await expect(updateEquipmentStock('a', { expectedRevision: 0, damagedQuantity: 1, reason: 'x' }))
      .rejects.toMatchObject({ status: 409, code: 'EQUIPMENT_STOCK_REVISION_CONFLICT', message: 'Reload.' });
  });
  it('labels the three operational states in plain words', () => {
    expect(stockStatusLabel).toEqual({ AVAILABLE: 'Available', PARTLY_UNAVAILABLE: 'Partly unavailable', UNAVAILABLE: 'Unavailable' });
  });
});
