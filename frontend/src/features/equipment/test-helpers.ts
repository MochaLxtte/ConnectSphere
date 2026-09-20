import { vi } from 'vitest';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

export function apiError(code: string, message: string, status: number): Response {
  return jsonResponse({ error: { code, message } }, status);
}

type Reply = Response | ((url: string, body: unknown) => Response | Promise<Response>);

/**
 * Stub fetch with replies keyed by "METHOD /path". A key matches the longest URL prefix; an array
 * of replies is consumed in order, repeating the last one.
 */
export function stubApi(routes: Record<string, Reply | Reply[]>) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  const counters = new Map<string, number>();
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as unknown : undefined;
    calls.push({ method, url, body });
    const key = Object.keys(routes)
      .filter((candidate) => `${method} ${url}`.startsWith(candidate))
      .sort((a, b) => b.length - a.length)[0];
    if (!key) throw new Error(`Unexpected request: ${method} ${url}`);
    const replies = routes[key]!;
    const index = counters.get(key) ?? 0;
    counters.set(key, index + 1);
    const reply = Array.isArray(replies) ? replies[Math.min(index, replies.length - 1)]! : replies;
    const response = typeof reply === 'function' ? await reply(url, body) : reply.clone();
    return response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    calls,
    requests: (method: string, prefix: string) =>
      calls.filter((call) => call.method === method && call.url.startsWith(prefix)),
  };
}

export function equipmentType(overrides: Record<string, unknown> = {}) {
  return {
    id: 'type-1', name: 'Projector', category: 'AV', description: 'Full HD', totalQuantity: 4, isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', ...overrides,
  };
}

export function equipmentRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1', eventRequestId: 'event-1', equipmentTypeId: 'type-1', equipmentName: 'Projector',
    equipmentCategory: 'AV', requestedBy: 'organiser-1', quantity: 2, status: 'REQUESTED',
    startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T09:00:00.000Z', notes: null,
    decidedBy: null, decidedAt: null, decisionReason: null,
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', ...overrides,
  };
}

export function availabilityItem(overrides: Record<string, unknown> = {}) {
  return {
    equipmentTypeId: 'type-1', name: 'Projector', category: 'AV',
    from: '2026-10-01T01:00:00.000Z', to: '2026-10-01T09:00:00.000Z',
    totalQuantity: 4, reservedPeak: 1, available: 3, ...overrides,
  };
}
