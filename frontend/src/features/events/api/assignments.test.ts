import { describe, expect, it, vi } from 'vitest';
import { assignCoordinator } from './assignments';

describe('KAN-79 allocation API failures', () => {
  it('reports an uncertain network result for reconciliation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Connection reset')));
    await expect(assignCoordinator('event', { coordinatorId: 'coordinator' }))
      .rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
  it('preserves cancellation so a departed view cannot show a network error', async () => {
    const controller = new AbortController(); controller.abort();
    const error = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(assignCoordinator('event', { coordinatorId: 'coordinator' }, controller.signal)).rejects.toBe(error);
  });
  it('reports an unreadable successful response as uncertain', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Gateway reply</html>', { status: 200 })));
    await expect(assignCoordinator('event', { coordinatorId: 'coordinator' }))
      .rejects.toMatchObject({ status: 200, code: 'INVALID_RESPONSE' });
  });
  it.each([null, {}, { error: { code: 'BAD', message: 42 } }])('handles malformed error envelopes safely: %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 503 })));
    await expect(assignCoordinator('event', { coordinatorId: 'coordinator' }))
      .rejects.toMatchObject({ status: 503, code: 'REQUEST_FAILED' });
  });
});
