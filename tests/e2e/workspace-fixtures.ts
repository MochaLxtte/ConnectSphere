import type { Request, Route } from '@playwright/test';

/**
 * Empty responses for the in-scope assignment, clarification and status-history panels,
 * so page fixtures fail on unexpected API requests, including future-sprint features.
 * Returns true when the request was answered here.
 */
export async function fulfilWorkspaceRead(
  route: Route, request: Request, options: { coordinatorBookingEventId?: string } = {},
): Promise<boolean> {
  if (request.method() !== 'GET') return false;
  const url = new URL(request.url());
  const path = url.pathname;

  const emptyList =
    /^\/api\/events\/[^/]+\/(assignments|clarifications|history)$/.test(path) ||
    path === '/api/events/coordinators';
  if (emptyList) {
    await route.fulfill({ json: { items: [] } });
    return true;
  }
  // Only coordinator detail fixtures opt into the new KAN-53 panel's reads.
  // Organiser fixtures still fail if the panel tries to request private booking data.
  if (options.coordinatorBookingEventId && (
    (path === '/api/venue-bookings' && url.search === `?eventRequestId=${options.coordinatorBookingEventId}`)
    || (path === '/api/venues/search-venues' && !url.search)
  )) {
    await route.fulfill({ json: { items: [] } });
    return true;
  }
  return false;
}
