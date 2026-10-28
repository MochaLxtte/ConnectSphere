import type { Request, Route } from '@playwright/test';

/** The top-bar bell asks for the signed-in user's unread count on every page; these fixtures have none. */
export async function fulfilNotificationBell(route: Route, request: Request): Promise<boolean> {
  if (request.method() !== 'GET' || new URL(request.url()).pathname !== '/api/notifications/unread-count') return false;
  await route.fulfill({ json: { unreadCount: 0 } });
  return true;
}

/**
 * Empty responses for the in-scope assignment, clarification, change-request (KAN-15) and
 * status-history panels and the
 * top-bar notification bell (KAN-64), so page fixtures fail on unexpected API requests, including
 * future-sprint features. Returns true when the request was answered here.
 */
export async function fulfilWorkspaceRead(
  route: Route, request: Request, options: { coordinatorBookingEventId?: string } = {},
): Promise<boolean> {
  if (request.method() !== 'GET') return false;
  const url = new URL(request.url());
  const path = url.pathname;

  if (await fulfilNotificationBell(route, request)) return true;

  const emptyList =
    /^\/api\/events\/[^/]+\/(assignments|clarifications|change-requests|history)$/.test(path) ||
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
