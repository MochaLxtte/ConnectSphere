import type { Request, Route } from '@playwright/test';

/**
 * Empty responses for the in-scope assignment, clarification and status-history panels,
 * so page fixtures fail on unexpected API requests, including future-sprint features.
 * Returns true when the request was answered here.
 */
export async function fulfilWorkspaceRead(route: Route, request: Request): Promise<boolean> {
  if (request.method() !== 'GET') return false;
  const path = new URL(request.url()).pathname;

  const emptyList =
    /^\/api\/events\/[^/]+\/(assignments|clarifications|history)$/.test(path) ||
    path === '/api/events/coordinators';
  if (emptyList) {
    await route.fulfill({ json: { items: [] } });
    return true;
  }
  return false;
}
