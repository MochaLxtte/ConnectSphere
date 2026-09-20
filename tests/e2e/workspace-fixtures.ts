import type { Request, Route } from '@playwright/test';

/**
 * Empty responses for the read-only calls made by the notification bell and the planning
 * panels, so page fixtures can keep failing on any other unexpected API request.
 * Returns true when the request was answered here.
 */
export async function fulfilWorkspaceRead(route: Route, request: Request): Promise<boolean> {
  if (request.method() !== 'GET') return false;
  const path = new URL(request.url()).pathname;

  if (path === '/api/notifications/unread-count') {
    await route.fulfill({ json: { unreadCount: 0 } });
    return true;
  }
  const attendees = /^\/api\/registrations\/events\/([^/]+)\/attendees$/.exec(path);
  if (attendees) {
    await route.fulfill({ json: {
      eventRequestId: attendees[1],
      counts: { registered: 0, withdrawn: 0, capacity: null, spotsLeft: null },
      items: [],
    } });
    return true;
  }
  if (path === '/api/equipment/availability') {
    // This route echoes the resolved window alongside the items; keep the fixture that shape.
    const window = new URL(request.url()).searchParams;
    await route.fulfill({ json: {
      from: window.get('from') ?? '', to: window.get('to') ?? '', items: [],
    } });
    return true;
  }
  const emptyList =
    /^\/api\/events\/[^/]+\/(assignments|clarifications|change-requests|history)$/.test(path) ||
    ['/api/events/coordinators', '/api/venue-bookings', '/api/equipment-requests', '/api/venues',
      '/api/equipment'].includes(path);
  if (emptyList) {
    await route.fulfill({ json: { items: [] } });
    return true;
  }
  return false;
}
