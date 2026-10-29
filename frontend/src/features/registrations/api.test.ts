import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRoster, listMine, withdraw } from './api.js';

describe('KAN-17/67 registration API requests', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('reads the own list and a safely encoded event roster using the same-origin API', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await listMine(); await getRoster('event/other');
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/registrations/mine');
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/events/event%2Fother/registrations');
  });
  it('posts explicit confirmation and propagates refused withdrawals', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'WITHDRAWAL_NOT_ALLOWED', message: 'Event started' } }), { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(withdraw('reg/one')).rejects.toMatchObject({ status: 409, code: 'WITHDRAWAL_NOT_ALLOWED' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/registrations/reg%2Fone/withdraw');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ confirm: true });
  });
});
