import { describe, expect, it, vi } from 'vitest';
import { cancelEquipmentReservation, fetchEquipmentReservations, reserveEquipmentRequest } from './equipment-reservations';

describe('KAN-26 equipment reservation API', () => {
  it('encodes saved identities, preserves versions and forwards abort signals', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ requirementsVersion: 'v1' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ changed: true, context: { requirementsVersion: 'v2' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ changed: false, context: { requirementsVersion: 'v2' } })));
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    expect(await fetchEquipmentReservations('a/b', signal)).toEqual({ requirementsVersion: 'v1' });
    expect(await reserveEquipmentRequest('a/b', 'r/1', 'v1', signal)).toMatchObject({ changed: true });
    expect(await cancelEquipmentReservation('a/b', 'r/1', 'v2', 'No longer needed', signal)).toMatchObject({ changed: false });
    expect(fetch.mock.calls.map(call => call[0])).toEqual(['/api/equipment/reservations/events/a%2Fb',
      '/api/equipment/reservations/events/a%2Fb/requests/r%2F1/reserve', '/api/equipment/reservations/events/a%2Fb/requests/r%2F1/cancel']);
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ requirementsVersion: 'v1' }) });
    expect(fetch.mock.calls[2]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ requirementsVersion: 'v2', reason: 'No longer needed' }) });
    for (const call of fetch.mock.calls) expect(call[1].signal).toBe(signal);
  });
  it('preserves stock-conflict details for a stale reservation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: {
      code: 'EQUIPMENT_STOCK_CONFLICT', message: 'Stock changed.' } }), { status: 409 })));
    await expect(reserveEquipmentRequest('a', 'r', 'v1')).rejects.toMatchObject({ status: 409, code: 'EQUIPMENT_STOCK_CONFLICT' });
  });
});
