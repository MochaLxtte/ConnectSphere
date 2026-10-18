import { describe, expect, it, vi } from 'vitest';
import { assignCoordinator, reassignCoordinator } from './assignments';

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

describe('KAN-65 reassignment API contract', () => {
  const input = { coordinatorId: 'new', reason: 'Covering leave', expectedAssignmentVersion: 'version-one' };
  const result = { eventRequestId: 'event/id', assignmentId: 'version-two', coordinatorId: 'new', previousCoordinatorId: 'old', changed: true };
  it.each([true, false])('posts the reason and version and preserves changed=%s', async (changed) => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...result, changed })));
    vi.stubGlobal('fetch', fetch);
    await expect(reassignCoordinator('event/id', input)).resolves.toMatchObject({ ...result, changed });
    expect(fetch).toHaveBeenCalledWith('/api/events/event%2Fid/coordinator/reassign', expect.objectContaining({
      method: 'POST', body: JSON.stringify(input),
    }));
  });
  it.each([null, {}, { ...result, changed: 'true' }, { ...result, eventRequestId: 'another' },
    { ...result, assignmentId: 3 }, { ...result, coordinatorId: 'other' }, { ...result, previousCoordinatorId: null }])(
    'treats a malformed success receipt as uncertain: %j', async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
      await expect(reassignCoordinator('event/id', input)).rejects.toMatchObject({ status: 200, code: 'INVALID_RESPONSE' });
    });
  it('preserves a version conflict for refresh handling', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'ASSIGNMENT_VERSION_CONFLICT', message: 'Refresh the assignment.' },
    }), { status: 409 })));
    await expect(reassignCoordinator('event/id', input)).rejects.toMatchObject({ status: 409, code: 'ASSIGNMENT_VERSION_CONFLICT' });
  });
});
