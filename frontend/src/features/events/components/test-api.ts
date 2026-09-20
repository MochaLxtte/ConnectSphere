import { vi } from 'vitest';

type Reply = { status?: number; body: unknown } | (() => { status?: number; body: unknown });

/** Test helper: stub fetch with replies keyed by "METHOD /path" and record the calls made. */
export function stubApi(routes: Record<string, Reply>) {
  const calls: { key: string; body: unknown }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    calls.push({ key, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    const route = routes[key];
    if (!route) return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: `No stub for ${key}` } }), { status: 404 });
    const reply = typeof route === 'function' ? route() : route;
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    calls,
    writes: () => calls.filter((call) => !call.key.startsWith('GET ')),
    set(key: string, reply: Reply) { routes[key] = reply; },
  };
}

export const apiError = (status: number, code: string, message: string) =>
  ({ status, body: { error: { code, message } } });
