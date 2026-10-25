import { describe, expect, it, vi } from 'vitest';
import { assessEquipmentAvailability, fetchEquipmentContext, fetchEquipmentEvents } from './equipment-availability';

describe('KAN-9 equipment API client', () => {
  it('uses only the dedicated encoded read-only check endpoints and passes cancellation signals', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 'a' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ event: { id: 'a' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ assessment: { outcome: 'SHORTFALL' } })));
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    expect(await fetchEquipmentEvents(signal)).toEqual([{ id: 'a' }]);
    expect(await fetchEquipmentContext('a/b', signal)).toEqual({ event: { id: 'a' } });
    expect(await assessEquipmentAvailability('a/b', { mode: 'saved', requirementsVersion: 'v' }, signal)).toEqual({ outcome: 'SHORTFALL' });
    expect(fetch.mock.calls.map((call) => call[0])).toEqual(['/api/equipment/availability/events',
      '/api/equipment/availability/events/a%2Fb', '/api/equipment/availability/events/a%2Fb']);
    for (const call of fetch.mock.calls) expect(call[1].signal).toBe(signal);
    expect(fetch.mock.calls[2]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ mode: 'saved', requirementsVersion: 'v' }) });
  });
  it('preserves structured API failure details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: {
      code: 'EQUIPMENT_CONTEXT_CHANGED', message: 'Refresh requirements.' } }), { status: 409 })));
    await expect(assessEquipmentAvailability('a', { mode: 'saved', requirementsVersion: 'v' }))
      .rejects.toMatchObject({ status: 409, code: 'EQUIPMENT_CONTEXT_CHANGED', message: 'Refresh requirements.' });
  });
});
