import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilNotificationBell } from './workspace-fixtures.js';

const coordinatorId = '12000000-0000-4000-8000-000000000001';
const hall = {
  id: '12000000-0000-4000-8000-000000000002', name: 'Harbour Hall', description: 'A large hall by the water.',
  location: '1 Marina Way', capacity: 200, layouts: ['Theatre', 'Banquet'], facilities: ['Projector', 'Wi-Fi'],
  accessibilityFeatures: ['Hearing loop'], wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00',
  updatedAt: '2026-10-01T02:00:00Z',
};
const room = {
  id: '12000000-0000-4000-8000-000000000003', name: 'Garden Room', description: null, location: '9 Orchid Road',
  capacity: 40, layouts: ['Boardroom'], facilities: ['Wi-Fi'], accessibilityFeatures: [] as string[],
  wheelchairAccessible: false, opensAt: null, closesAt: null, updatedAt: '2026-10-02T02:00:00Z',
};
const filterOptions = {
  layouts: ['Banquet', 'Boardroom', 'Theatre'], facilities: ['Projector', 'Wi-Fi'], accessibility: ['Hearing loop'],
};

/** A small stand-in for the server's filtering, so the page's wiring is checked end to end in the browser. */
function matching(params: URLSearchParams) {
  return [hall, room].filter((venue) =>
    (!params.get('capacity') || venue.capacity >= Number(params.get('capacity')))
    && (!params.get('attendance') || venue.capacity >= Number(params.get('attendance')))
    && (!params.get('location') || `${venue.name} ${venue.location}`.toLowerCase().includes(params.get('location')!.toLowerCase()))
    && (!params.get('layout') || venue.layouts.includes(params.get('layout')!))
    && (!params.get('wheelchairAccessible') || venue.wheelchairAccessible)
    && params.getAll('facilities').every((facility) => venue.facilities.includes(facility))
    && params.getAll('accessibility').every((feature) => venue.accessibilityFeatures.includes(feature)));
}

async function fixtures(page: Page, role: string | null = 'EVENT_COORDINATOR') {
  const searches: URLSearchParams[] = [];
  const unexpected: string[] = [];
  // Browser fixtures check the real UI and routing. PostgreSQL integration tests separately
  // verify the real filtering, availability exclusion and role enforcement.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const error = (code: string, message: string) => ({ error: { code, message } });
    if (request.method() === 'GET' && url.pathname === '/api/auth/me') {
      await route.fulfill({ status: role ? 200 : 401, json: role ? { user: {
        id: coordinatorId, role, displayName: 'Test coordinator', email: 'coordinator@example.test',
      } } : error('AUTHENTICATION_REQUIRED', 'Sign in required.') });
    } else if (role === 'EVENT_COORDINATOR' && request.method() === 'GET' && url.pathname === '/api/venues/filter-options') {
      await route.fulfill({ json: filterOptions });
    } else if (role === 'EVENT_COORDINATOR' && request.method() === 'GET' && url.pathname === '/api/venues/search-venues') {
      searches.push(url.searchParams);
      await route.fulfill({ json: { items: matching(url.searchParams) } });
    } else if (await fulfilNotificationBell(route, request)) {
      // Answered: the top-bar notification bell (KAN-64).
    } else {
      unexpected.push(`${request.method()} ${url.pathname}`);
      await route.fulfill({ status: 501, json: error('UNEXPECTED_TEST_REQUEST', 'No fixture configured.') });
    }
  });
  return { searches, unexpected };
}

const results = (page: Page) => page.getByRole('list', { name: 'Matching venues' });

for (const fieldName of ['Event start (Singapore time)', 'Event end (Singapore time)']) {
  test(`KAN-12 four-digit year advances to time in ${fieldName}`, async ({ page }) => {
    const fixture = await fixtures(page);
    await page.goto('/venues');
    await expect(page.getByText('2 venues found')).toBeVisible();
    const field = page.getByLabel(fieldName);
    await field.fill('2025-11-16T10:00');
    await field.focus();
    // Chromium's en-US native control: move to the first segment, then to the year.
    // Real keystrokes are necessary; fill() bypasses native segment auto-advance.
    for (let i = 0; i < 8; i += 1) await field.press('ArrowLeft');
    await field.press('ArrowRight');
    await field.press('ArrowRight');
    await field.pressSequentially('202611');
    await expect(field).toHaveValue('2026-11-16T11:00');
    expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-12 running API requires login for venue search and filter lists', async ({ request }) => {
  for (const path of ['/api/venues/search-venues', '/api/venues/filter-options']) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});

test('KAN-12 coordinator sees every venue first, then narrows, changes and clears filters', async ({ page }, testInfo) => {
  const fixture = await fixtures(page);
  await page.goto('/venues');
  await expect(page.getByRole('heading', { name: 'Search venues', level: 1 })).toBeVisible();
  await expect(page.getByText('2 venues found')).toBeVisible();
  await expect(results(page).getByRole('heading', { name: 'Harbour Hall' })).toBeVisible();
  await expect(results(page).getByRole('heading', { name: 'Garden Room' })).toBeVisible();
  await expect(results(page).getByText('Up to 200 guests')).toBeVisible();

  await page.getByLabel('Minimum capacity').fill('100');
  await page.getByRole('checkbox', { name: 'Projector' }).check();
  await page.getByRole('button', { name: /Search venues/ }).click();
  await expect(page.getByText('1 venue found')).toBeVisible();
  await expect(results(page).getByRole('heading', { name: 'Garden Room' })).toHaveCount(0);
  expect(fixture.searches.at(-1)!.get('capacity')).toBe('100');
  expect(fixture.searches.at(-1)!.getAll('facilities')).toEqual(['Projector']);

  await page.getByRole('checkbox', { name: 'Projector' }).uncheck();
  await page.getByLabel('Minimum capacity').fill('');
  await page.getByLabel('Room layout').selectOption('Boardroom');
  await page.getByRole('button', { name: /Search venues/ }).click();
  await expect(results(page).getByRole('heading', { name: 'Garden Room' })).toBeVisible();
  await expect(results(page).getByRole('heading', { name: 'Harbour Hall' })).toHaveCount(0);

  await page.getByLabel('Minimum capacity').fill('5000');
  await page.getByRole('button', { name: /Search venues/ }).click();
  await expect(page.getByRole('heading', { name: 'No venue matches these filters' })).toBeVisible();
  await testInfo.attach('no-match', { body: await page.screenshot(), contentType: 'image/png' });

  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page.getByText('2 venues found')).toBeVisible();
  await expect(page.getByLabel('Minimum capacity')).toHaveValue('');
  await expect(page.getByLabel('Room layout')).toHaveValue('');
  expect(fixture.searches.at(-1)!.toString()).toBe('');
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-12 an end time before the start is refused before any request is sent', async ({ page }) => {
  const fixture = await fixtures(page);
  await page.goto('/venues');
  await expect(page.getByText('2 venues found')).toBeVisible();
  await page.getByLabel('Event start (Singapore time)').fill('2026-10-05T12:00');
  await page.getByLabel('Event end (Singapore time)').fill('2026-10-05T10:00');
  await expect(page.getByRole('alert')).toHaveText('The end time must be after the start time.');
  await expect(page.getByRole('button', { name: /Search venues/ })).toBeDisabled();
  expect(fixture.searches).toHaveLength(1);

  await page.getByLabel('Event end (Singapore time)').fill('2026-10-05T14:30');
  await page.getByRole('button', { name: /Search venues/ }).click();
  await expect.poll(() => fixture.searches.length).toBe(2);
  expect(fixture.searches[1]!.get('startsAt')).toBe('2026-10-05T04:00:00.000Z');
  expect(fixture.searches[1]!.get('endsAt')).toBe('2026-10-05T06:30:00.000Z');
});

test('KAN-12 a signed-out visitor is asked to sign in and no venue data is requested', async ({ page }) => {
  const fixture = await fixtures(page, null);
  await page.goto('/venues');
  await expect(page.getByText('Sign in to search venues.')).toBeVisible();
  await expect(page.locator('#main-content').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Venue filters' })).toHaveCount(0);
  expect(fixture.searches).toHaveLength(0);
});

for (const role of ['EVENT_ORGANISER', 'VENUE_STAFF']) {
  test(`KAN-12 ${role} cannot use venue search and no venue data is requested`, async ({ page }) => {
    const fixture = await fixtures(page, role);
    await page.goto('/venues');
    await expect(page.getByText('This page is for event coordinators.')).toBeVisible();
    await expect(page.getByRole('form', { name: 'Venue filters' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Harbour Hall' })).toHaveCount(0);
    expect(fixture.searches).toHaveLength(0);
    expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-12 search page fits a phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await fixtures(page);
  await page.goto('/venues');
  await expect(page.getByText('2 venues found')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
