import { render } from '@testing-library/vue';
import type { Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { PublicEvent } from './api/registrations';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

export function errorResponse(status: number, code: string, message = 'Request failed.'): Response {
  return jsonResponse({ error: { code, message } }, status);
}

export function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((fulfil) => { resolve = fulfil; });
  return { promise, resolve };
}

export async function flush(): Promise<void> {
  // Allow response parsing and Vue updates to finish before checking stale responses.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export function publicEvent(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: 'event-1', name: 'Career fair', purpose: 'Meet employers', description: 'A public description.',
    startsAt: '2026-10-01T02:00:00Z', endsAt: '2026-10-01T04:00:00Z',
    venue: { name: 'Main Hall', location: 'Block A' },
    registrationCapacity: 50, registeredCount: 38, spotsLeft: 12,
    registrationOpensAt: null, registrationClosesAt: null,
    isOpen: true, closedReason: null, myRegistrationStatus: null,
    ...overrides,
  };
}

export function user(role: string, id = 'user-1') {
  return { id, email: `${id}@example.com`, displayName: 'Test user', role };
}

/** Render a page or component at `path`; `pattern` exposes route params such as `/browse/:id`. */
export async function renderAt(component: Component, path: string, options: { pattern?: string; props?: Record<string, unknown> } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...(options.pattern ? [{ path: options.pattern, component }] : []),
      { path: '/:pathMatch(.*)*', component },
    ],
  });
  await router.push(path);
  await router.isReady();
  const view = render(component, { props: options.props, global: { plugins: [router] } });
  return { ...view, router };
}

export function calls(fetchMock: { mock: { calls: unknown[][] } }): string[] {
  return fetchMock.mock.calls.map(([path, init]) =>
    `${(init as RequestInit | undefined)?.method ?? 'GET'} ${String(path)}`);
}
