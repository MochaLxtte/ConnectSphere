import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

type Role = 'EVENT_ORGANISER' | 'EVENT_COORDINATOR' | 'EVENT_COORDINATOR_LEAD' | 'VENUE_STAFF' | 'TECHNICAL_SUPPORT_STAFF' | 'ATTENDEE';
interface Notice {
  id: string; type: string; title: string; message: string; read: boolean; readAt: string | null; createdAt: string;
  event: { id: string; name: string | null } | null; booking: { id: string } | null; link: string | null;
}

const account = (role: Role) => ({
  id: '10000000-0000-4000-8000-000000000064', email: `${role.toLowerCase()}@example.test`,
  displayName: `Test ${role.toLowerCase().replaceAll('_', ' ')}`, role,
});
const eventId = '20000000-0000-4000-8000-000000000064';
const bookingId = '30000000-0000-4000-8000-000000000064';
const seed = (): Notice[] => [
  {
    id: 'a0000000-0000-4000-8000-000000000001', type: 'VENUE_BOOKING_APPROVED', title: 'Venue booking approved',
    message: 'Venue staff approved the booking request for “Career fair” at Harbour Hall. Open the booking for details.',
    read: false, readAt: null, createdAt: '2026-10-05T04:00:00.000Z',
    event: { id: eventId, name: 'Career fair' }, booking: { id: bookingId }, link: `/venue-bookings/${bookingId}`,
  }, {
    id: 'a0000000-0000-4000-8000-000000000002', type: 'REVIEW_APPROVED', title: 'Event request approved',
    message: 'Your event request “Career fair” was approved. Reason: Fits the programme.',
    read: false, readAt: null, createdAt: '2026-10-05T02:00:00.000Z',
    event: { id: eventId, name: 'Career fair' }, booking: null, link: `/events/${eventId}`,
  }, {
    id: 'a0000000-0000-4000-8000-000000000003', type: 'COORDINATOR_REASSIGNED_AWAY', title: 'Event reassigned',
    message: 'An event request you coordinated was reassigned to another coordinator. You no longer have access to it.',
    read: true, readAt: '2026-10-04T05:00:00.000Z', createdAt: '2026-10-04T03:00:00.000Z', event: null, booking: null, link: null,
  },
];

async function inboxFixtures(page: Page, user: ReturnType<typeof account> | null, options: { listStatus?: number } = {}) {
  let notices = seed();
  const writes: string[] = [];
  const listReads: number[] = [];
  const unexpectedRequests: string[] = [];
  const unreadCount = () => notices.filter((notice) => !notice.read).length;
  // Fail closed: only the inbox calls, the session and what the shared workspace helper answers.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    if (method === 'GET' && pathname === '/api/auth/me') {
      await route.fulfill({ status: user ? 200 : 401, json: user ? { user } : {
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' },
      } });
    } else if (method === 'GET' && (pathname === '/api/health' || pathname === '/api/health/ready')) {
      await route.fulfill({ json: { status: 'ok', service: 'connectsphere-api', database: 'connected' } });
    } else if (method === 'GET' && pathname === '/api/notifications/unread-count') {
      await route.fulfill({ json: { unreadCount: unreadCount() } });
    } else if (method === 'GET' && pathname === '/api/notifications') {
      listReads.push(1);
      await route.fulfill(options.listStatus ? { status: options.listStatus, json: {
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      } } : { json: { items: notices } });
    } else if (method === 'POST' && pathname === '/api/notifications/read-all') {
      writes.push('read-all');
      const updated = unreadCount();
      notices = notices.map((notice) => ({ ...notice, read: true, readAt: notice.readAt ?? '2026-10-06T01:00:00.000Z' }));
      await route.fulfill({ json: { updated } });
    } else if (method === 'POST' && /^\/api\/notifications\/[^/]+\/read$/.test(pathname)) {
      const id = pathname.split('/')[3]!;
      writes.push(id);
      notices = notices.map((notice) => (notice.id === id
        ? { ...notice, read: true, readAt: notice.readAt ?? '2026-10-06T01:00:00.000Z' } : notice));
      await route.fulfill({ json: { notification: notices.find((notice) => notice.id === id) } });
    } else if (!(await fulfilWorkspaceRead(route, request))) {
      unexpectedRequests.push(`${method} ${pathname}`);
      await route.fulfill({ status: 501, json: {
        error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
      } });
    }
  });
  return { writes, listReads, unexpectedRequests };
}

const bell = (page: Page, name: string | RegExp) => page.getByRole('banner').getByRole('link', { name });

test('KAN-64 running server requires login for every notification route', async ({ request }) => {
  // No fixtures: the request goes through the Vite proxy to the normal server.ts startup.
  const responses = await Promise.all([
    request.get('/api/notifications'),
    request.get('/api/notifications/unread-count'),
    request.post('/api/notifications/read-all'),
    request.post('/api/notifications/10000000-0000-4000-8000-000000000099/read'),
  ]);
  for (const response of responses) {
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});

for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const) {
  test(`KAN-64 ${role} has a bell showing the unread count and an inbox`, async ({ page }) => {
    const fixture = await inboxFixtures(page, account(role));
    await page.goto('/');
    await expect(bell(page, 'Notifications, 2 unread')).toBeVisible();
    await expect(bell(page, 'Notifications, 2 unread')).toContainText('2');
    await bell(page, 'Notifications, 2 unread').click();
    await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Notifications' }).getByRole('listitem')).toHaveCount(3);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

test('KAN-64 a signed-out visitor sees no bell and is asked to sign in without loading notifications', async ({ page }) => {
  const fixture = await inboxFixtures(page, null);
  await page.goto('/notifications');
  await expect(page.getByRole('alert')).toContainText('Sign in to view your notifications.');
  await expect(page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/login');
  await expect(page.getByRole('banner').getByRole('link', { name: /^Notifications/ })).toHaveCount(0);
  expect(fixture.listReads).toEqual([]);
  expect(fixture.unexpectedRequests).toEqual([]);
});

test('KAN-64 shows unread and read notices with their links, marks one read and updates the bell', async ({ page }) => {
  const fixture = await inboxFixtures(page, account('EVENT_ORGANISER'));
  await page.goto('/notifications');
  const rows = page.getByRole('list', { name: 'Notifications' }).getByRole('listitem');
  await expect(rows).toHaveCount(3);

  await expect(rows.nth(0)).toContainText('Venue booking approved');
  await expect(rows.nth(0).getByText('Unread', { exact: true })).toBeVisible();
  await expect(rows.nth(0).getByRole('link', { name: 'Open booking' })).toHaveAttribute('href', `/venue-bookings/${bookingId}`);
  await expect(rows.nth(1).getByRole('link', { name: 'Open event request' })).toHaveAttribute('href', `/events/${eventId}`);
  await expect(rows.nth(2).getByText('Unread', { exact: true })).toHaveCount(0);
  // The minimal notice names no event and offers no link.
  await expect(rows.nth(2).getByRole('link')).toHaveCount(0);
  await expect(rows.nth(2)).not.toContainText('Career fair');
  await expect(page.getByText('2 unread notifications')).toBeVisible();

  await rows.nth(1).getByRole('button', { name: /Mark as read/ }).click();
  await expect(rows.nth(1).getByText('Unread', { exact: true })).toHaveCount(0);
  await expect(page.getByText('1 unread notification', { exact: false })).toBeVisible();
  await expect(bell(page, 'Notifications, 1 unread')).toBeVisible();
  expect(fixture.writes).toEqual(['a0000000-0000-4000-8000-000000000002']);

  await page.reload();
  await expect(page.getByRole('list', { name: 'Notifications' }).getByRole('listitem').nth(1).getByText('Unread', { exact: true })).toHaveCount(0);
  await expect(bell(page, 'Notifications, 1 unread')).toBeVisible();
  expect(fixture.unexpectedRequests).toEqual([]);
});

test('KAN-64 marks every notification read and removes the badge', async ({ page }) => {
  const fixture = await inboxFixtures(page, account('VENUE_STAFF'));
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Mark all as read', exact: true }).click();
  await expect(page.getByText('2 notifications marked as read.')).toBeVisible();
  await expect(page.getByText('Unread', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mark all as read', exact: true })).toBeDisabled();
  await expect(bell(page, 'Notifications')).toBeVisible();
  expect(fixture.writes).toEqual(['read-all']);
  expect(fixture.unexpectedRequests).toEqual([]);
});

test('KAN-64 a failed load shows an error that can be retried', async ({ page }) => {
  await inboxFixtures(page, account('EVENT_COORDINATOR'), { listStatus: 500 });
  await page.goto('/notifications');
  await expect(page.getByRole('alert')).toContainText('An unexpected error occurred.');
  await expect(page.getByRole('list', { name: 'Notifications' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
});

test('KAN-64 the inbox and bell fit a narrow screen without horizontal overflow', async ({ page }, testInfo) => {
  const fixture = await inboxFixtures(page, account('EVENT_COORDINATOR'));
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/notifications');
  await expect(page.getByRole('list', { name: 'Notifications' }).getByRole('listitem')).toHaveCount(3);
  await expect(bell(page, 'Notifications, 2 unread')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-notifications.png'), fullPage: true });
  expect(fixture.unexpectedRequests).toEqual([]);
});
