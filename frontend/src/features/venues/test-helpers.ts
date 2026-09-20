import { vi } from 'vitest';

export interface RecordedCall {
  method: string;
  url: string;
  body: unknown;
}

type Reply = { status?: number; body: unknown };
type Route = (call: RecordedCall) => Reply | undefined;

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

/** Stub global fetch with ordered route handlers; unmatched requests fail the test loudly. */
export function stubApi(...routes: Route[]) {
  const calls: RecordedCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: RecordedCall = {
      method: init?.method ?? 'GET',
      url: String(input),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    for (const route of routes) {
      const reply = route(call);
      if (reply) return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
    }
    throw new Error(`Unexpected request: ${call.method} ${call.url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

/** Reply to a method + URL prefix. A function body is evaluated per call so tests can change state. */
export function on(method: string, urlPrefix: string, body: unknown | (() => Reply), status = 200): Route {
  return (call) => {
    if (call.method !== method || !call.url.startsWith(urlPrefix)) return undefined;
    return typeof body === 'function' ? (body as () => Reply)() : { status, body };
  };
}
