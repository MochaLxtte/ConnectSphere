import { expect, test, type Page } from '@playwright/test';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

const user = {
  id: '10000000-0000-4000-8000-000000000031',
  email: 'organiser@example.test',
  displayName: 'Test organiser',
  role: 'EVENT_ORGANISER',
};
const statuses = [
  ['DRAFT', 'Draft'],
  ['SUBMITTED', 'Submitted'],
  ['UNDER_REVIEW', 'Under review'],
  ['CLARIFICATION_REQUESTED', 'Clarification requested'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
] as const;
const requests = statuses.map(([status], index) => ({
  id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name: index === 0 ? null : `Community event ${index + 1}`,
  status: status as string,
  createdAt: '2026-09-15T01:00:00.000Z',
  updatedAt: '2026-09-16T23:30:00.000Z',
}));

type ListResponse = { status?: number; body: unknown };

async function fixtureList(page: Page, respond: () => ListResponse) {
  const unexpectedRequests: string[] = [];
  // These fixtures test browser behaviour; real authentication/ownership and persistence
  // are covered separately. Fail closed so no unexpected call reaches the database.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === '/api/auth/me') {
      await route.fulfill({ json: { user } });
    } else if (request.method() === 'GET' && url.pathname === '/api/events' && url.search === '?scope=all') {
      const response = respond();
      await route.fulfill({ status: response.status ?? 200, json: response.body });
    } else if (!(await fulfilWorkspaceRead(route, request))) {
      unexpectedRequests.push(`${request.method()} ${url.pathname}${url.search}`);
      await route.fulfill({ status: 501, json: {
        error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
      } });
    }
  });
  return unexpectedRequests;
}

test('KAN-16 organisers see all request statuses and refresh a changed outcome', async ({ page }, testInfo) => {
  let approved = false;
  const unexpectedRequests = await fixtureList(page, () => ({ body: {
    items: requests.map((request, index) => index === 1 && approved
      ? { ...request, status: 'APPROVED', updatedAt: '2026-09-17T01:00:00.000Z' }
      : request).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
  } }));

  await page.goto('/events');
  await expect(page.getByRole('heading', { name: 'Event requests', level: 1, exact: true })).toBeVisible();
  const list = page.getByRole('list', { name: 'Your event requests' });
  const rows = list.getByRole('listitem');
  await expect(rows).toHaveCount(6);
  for (const [index, [, label]] of statuses.entries()) {
    await expect(rows.nth(index).getByText(label, { exact: true })).toBeVisible();
    await expect(rows.nth(index)).toContainText(index === 0 ? 'Untitled event request' : `Community event ${index + 1}`);
    await expect(rows.nth(index).locator('time')).toHaveAttribute('datetime', requests[index]!.updatedAt);
  }
  await expect(list.getByRole('link')).toHaveCount(requests.length);
  for (const [index, request] of requests.entries()) {
    // A draft links to its edit form; every other status links to the read-only detail view.
    const expectedHref = request.status === 'DRAFT' ? `/events/${request.id}/edit` : `/events/${request.id}`;
    await expect(rows.nth(index).getByRole('link')).toHaveAttribute('href', expectedHref);
  }
  approved = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  const updatedRow = list.getByRole('listitem').filter({ hasText: 'Community event 2' });
  await expect(updatedRow.getByText('Approved', { exact: true })).toBeVisible();
  await expect(updatedRow.locator('time')).toHaveAttribute('datetime', '2026-09-17T01:00:00.000Z');
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  expect(unexpectedRequests).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('organiser-list-desktop.png'), fullPage: true });
});

test('KAN-16 long request names and clarification status fit a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const longName = `Neighbourhood community programme ${'LongUnbrokenEventName'.repeat(10)}`;
  const unexpectedRequests = await fixtureList(page, () => ({ body: { items: [
    { ...requests[3], name: longName },
    { ...requests[0], name: '   ' },
  ] } }));

  await page.goto('/events');
  const list = page.getByRole('list', { name: 'Your event requests' });
  await expect(list.getByText(longName, { exact: true })).toBeVisible();
  await expect(list.getByText('Clarification requested', { exact: true })).toBeVisible();
  await expect(list.getByText('Untitled event request', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(unexpectedRequests).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('organiser-list-mobile.png'), fullPage: true });
});

test('KAN-16 list failure can be retried and an empty result is explicit', async ({ page }) => {
  let unavailable = true;
  const unexpectedRequests = await fixtureList(page, () => unavailable
    ? { status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable.' } } }
    : { body: { items: [] } });

  await page.goto('/events');
  const retry = page.getByRole('button', { name: 'Try again', exact: true });
  await expect(retry).toBeVisible();
  await expect(page.getByRole('list', { name: 'Your event requests' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'No event requests yet', exact: true })).toHaveCount(0);
  unavailable = false;
  await retry.click();
  await expect(page.getByRole('heading', { name: 'No event requests yet', exact: true })).toBeVisible();
  await expect(retry).toHaveCount(0);
  expect(unexpectedRequests).toEqual([]);
});

test('KAN-16 an expired session removes private requests and allows signing in again', async ({ page, baseURL }) => {
  let expired = false;
  const unexpectedRequests = await fixtureList(page, () => expired
    ? { status: 401, body: { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view event requests.' } } }
    : { body: { items: requests } });
  const appOrigin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== appOrigin, async (route) => {
    if (new URL(route.request().url()).hostname === 'fonts.googleapis.com') {
      // Optional page typography is unrelated to authentication; use the system font.
      await route.fulfill({ contentType: 'text/css', body: '' });
      return;
    }
    // No external authentication service is needed to show the login form.
    // Block unexpected Supabase/network calls rather than reaching a live project.
    unexpectedRequests.push(`${route.request().method()} ${route.request().url()}`);
    await route.fulfill({ status: 501, json: {
      error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No external request was expected.' },
    } });
  });

  await page.goto('/events');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  const list = page.getByRole('list', { name: 'Your event requests' });
  await expect(list.getByRole('listitem')).toHaveCount(6);

  expired = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('Sign in to view your event requests.', { exact: true })).toBeVisible();
  await expect(list).toHaveCount(0);
  await expect(page.getByText('Community event 2', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);

  await page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  await expect(page.getByRole('link', { name: 'Go to overview', exact: true })).toHaveCount(0);
  expect(unexpectedRequests).toEqual([]);
});
