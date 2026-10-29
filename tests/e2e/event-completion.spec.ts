import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

const requestId = '10000000-0000-4000-8000-000000000a10';
const coordinator = { id: '10000000-0000-4000-8000-000000000a11', email: 'coordinator@example.test', displayName: 'Casey Coordinator', role: 'EVENT_COORDINATOR' };
const organiser = { id: '10000000-0000-4000-8000-000000000a12', email: 'organiser@example.test', displayName: 'Olivia Organiser', role: 'EVENT_ORGANISER' };
const baseDetail = {
  id: requestId, organiserId: organiser.id, coordinatorId: coordinator.id, status: 'CONFIRMED', name: 'Career fair', purpose: 'Meet employers',
  description: null, startsAt: '2026-10-28T02:00:00.000Z', endsAt: '2026-10-28T06:00:00.000Z', expectedAttendance: 40,
  venueRequirements: 'A hall', accessibilityNeeds: null, equipmentRequirements: null, registrationRequired: false,
  createdAt: '2026-09-17T01:00:00.000Z', updatedAt: '2026-09-17T01:00:00.000Z', revision: 3, review: null,
  actions: { canEditDraft: false, canMakeInitialDecision: false },
};
const completion = { eventRequestId: requestId, status: 'COMPLETED', completedById: coordinator.id, completedByName: 'Casey Coordinator',
  completedAt: '2026-10-29T03:00:00.000Z', releasedEquipmentRequests: 2 };

/** A small stateful stand-in: it refuses completion once ("not ended"), then accepts it, as the server would. */
async function fixtures(page: Page, options: { user: typeof coordinator | typeof organiser | null; status?: string; refuseFirst?: boolean }) {
  const detail = { ...baseDetail, status: options.status ?? 'CONFIRMED' };
  let completed = detail.status === 'COMPLETED';
  let refusals = options.refuseFirst ? 1 : 0;
  const posts: string[] = []; const unexpected: string[] = [];
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request(); const { pathname: path } = new URL(request.url());
    if (request.method() === 'GET' && path === '/api/auth/me') {
      await route.fulfill({ status: options.user ? 200 : 401, json: options.user ? { user: options.user } : { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } } });
    } else if (request.method() === 'GET' && (path === '/api/events' || path === '/api/events/unassigned')) {
      await route.fulfill({ json: { items: [{ ...detail, status: completed ? 'COMPLETED' : detail.status }] } });
    } else if (request.method() === 'GET' && path === `/api/events/${requestId}`) {
      await route.fulfill({ json: { ...detail, status: completed ? 'COMPLETED' : detail.status } });
    } else if (request.method() === 'GET' && path === `/api/events/${requestId}/completion`) {
      await route.fulfill({ json: { completion: completed ? completion : null } });
    } else if (request.method() === 'POST' && path === `/api/events/${requestId}/complete`) {
      posts.push(path);
      if (refusals > 0) {
        refusals--;
        await route.fulfill({ status: 409, json: { error: { code: 'EVENT_NOT_ENDED', message: 'This event has not ended yet. It can be marked completed after it ends.' } } });
      } else { completed = true; await route.fulfill({ json: { completion } }); }
    } else if (!(await fulfilWorkspaceRead(route, request, options.user?.role === 'EVENT_COORDINATOR' ? { coordinatorBookingEventId: requestId } : {}))) {
      unexpected.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No fixture.' } } });
    }
  });
  return { posts, unexpected };
}

test('KAN-10 the assigned coordinator is refused before the event ends, then completes it and sees the outcome', async ({ page }, testInfo) => {
  const fixture = await fixtures(page, { user: coordinator, refuseFirst: true });
  await page.goto(`/reviews/${requestId}`);
  const panel = page.getByRole('region', { name: 'Event completion' });
  await expect(panel).toContainText('It ends at');
  const button = panel.getByRole('button', { name: 'Mark event as completed', exact: true });
  await expect(button).toBeDisabled();
  await panel.getByRole('checkbox').check();
  await button.click();
  await expect(panel.getByRole('alert')).toContainText('This event has not ended yet.');
  await expect(panel.getByRole('checkbox')).not.toBeChecked();
  await panel.getByRole('checkbox').check();
  await panel.getByRole('button', { name: 'Mark event as completed', exact: true }).click();
  await expect(panel.getByText(/This event was marked completed/)).toBeVisible();
  await expect(panel).toContainText('by Casey Coordinator');
  await expect(panel).toContainText('Equipment reservations released: 2');
  await expect(panel.getByRole('button', { name: 'Mark event as completed' })).toHaveCount(0);
  await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Event completion' })).toContainText('This event was marked completed');
  expect(fixture.posts).toHaveLength(2);
  expect(fixture.unexpected).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('event-completion-desktop.png'), fullPage: true });
});

test('KAN-10 the organiser sees the completed status and outcome but has no completion action', async ({ page }) => {
  const fixture = await fixtures(page, { user: organiser, status: 'COMPLETED' });
  await page.goto(`/events/${requestId}`);
  const panel = page.getByRole('region', { name: 'Event completion' });
  await expect(panel).toContainText('This event was marked completed');
  await expect(panel).not.toContainText('Equipment reservations released');
  await expect(panel.getByRole('button')).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-10 the organiser has no completion action on a confirmed event', async ({ page }) => {
  const fixture = await fixtures(page, { user: organiser });
  await page.goto(`/events/${requestId}`);
  await expect(page.getByRole('heading', { name: 'Career fair', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Event completion' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mark event as completed' })).toHaveCount(0);
  expect(fixture.posts).toEqual([]); expect(fixture.unexpected).toEqual([]);
});

test('KAN-10 an approved event offers no completion action to the coordinator', async ({ page }) => {
  const fixture = await fixtures(page, { user: coordinator, status: 'APPROVED' });
  await page.goto(`/reviews/${requestId}`);
  await expect(page.getByRole('heading', { name: 'Career fair', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Event completion' })).toHaveCount(0);
  expect(fixture.posts).toEqual([]);
});

test('KAN-10 the completion panel fits a narrow screen without sideways scrolling', async ({ page }, testInfo) => {
  await fixtures(page, { user: coordinator });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`/reviews/${requestId}`);
  const panel = page.getByRole('region', { name: 'Event completion' });
  await panel.getByRole('checkbox').check();
  await expect(panel.getByRole('button', { name: 'Mark event as completed', exact: true })).toBeEnabled();
  const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, window: window.innerWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.window);
  await page.screenshot({ path: testInfo.outputPath('event-completion-mobile.png'), fullPage: true });
});

test('KAN-10 the running API requires login to complete or read a completion', async ({ request }) => {
  for (const response of [await request.post(`/api/events/${requestId}/complete`), await request.get(`/api/events/${requestId}/completion`)]) {
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});
