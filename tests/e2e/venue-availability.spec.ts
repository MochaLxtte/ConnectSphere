import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

type Role = 'EVENT_ORGANISER' | 'EVENT_COORDINATOR' | 'VENUE_STAFF' | 'TECHNICAL_SUPPORT_STAFF' | 'ATTENDEE';

const account = (role: Role) => ({
  id: '10000000-0000-4000-8000-000000000051',
  email: `${role.toLowerCase()}@example.test`,
  displayName: `Test ${role.toLowerCase().replaceAll('_', ' ')}`,
  role,
});
const hall = {
  id: '30000000-0000-4000-8000-000000000001', name: 'Harbour Hall', location: 'Level 1, Main Building',
  capacity: 300, opensAt: '08:00', closesAt: '22:00',
  unavailable: [
    // Monday 5 October 10:00–12:00 and Tuesday 6 October 09:00–18:00, Singapore time.
    { id: '40000000-0000-4000-8000-000000000001', kind: 'BOOKING', startsAt: '2026-10-05T02:00:00.000Z', endsAt: '2026-10-05T04:00:00.000Z', event: null },
    { id: '40000000-0000-4000-8000-000000000002', kind: 'BLOCKED', startsAt: '2026-10-06T01:00:00.000Z', endsAt: '2026-10-06T10:00:00.000Z', reason: 'Maintenance' },
  ],
};
const room = {
  id: '30000000-0000-4000-8000-000000000002', name: 'Orchid Seminar Room', location: 'Level 3, Main Building',
  capacity: 40, opensAt: '08:00', closesAt: '20:00',
  unavailable: [
    // Monday 5 October 13:00–15:00, Singapore time.
    { id: '40000000-0000-4000-8000-000000000003', kind: 'BOOKING', startsAt: '2026-10-05T05:00:00.000Z', endsAt: '2026-10-05T07:00:00.000Z', event: null },
  ],
};

async function calendarFixtures(page: Page, user: ReturnType<typeof account> | null) {
  const availabilityReads: { from: string | null; to: string | null }[] = [];
  const unexpectedRequests: string[] = [];
  // Wednesday 7 October 2026, 12:00 in Singapore, so the fixture week is the current week.
  await page.clock.setFixedTime(new Date('2026-10-07T04:00:00.000Z'));
  // Fail closed: these cases verify browser behaviour, not hosted login or database authorisation.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === '/api/auth/me') {
      await route.fulfill({ status: user ? 200 : 401, json: user ? { user } : {
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' },
      } });
    } else if (request.method() === 'GET' && url.pathname === '/api/health') {
      await route.fulfill({ json: { status: 'ok', service: 'connectsphere-api' } });
    } else if (request.method() === 'GET' && url.pathname === '/api/health/ready') {
      await route.fulfill({ json: { status: 'ok', database: 'connected' } });
    } else if (request.method() === 'GET' && url.pathname === '/api/venues/availability') {
      const window = { from: url.searchParams.get('from'), to: url.searchParams.get('to') };
      availabilityReads.push(window);
      await route.fulfill({ json: { ...window, items: [hall, room] } });
    } else if (!(await fulfilWorkspaceRead(route, request))) {
      unexpectedRequests.push(`${request.method()} ${url.pathname}${url.search}`);
      await route.fulfill({ status: 501, json: {
        error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
      } });
    }
  });
  return { availabilityReads, unexpectedRequests };
}

const agendaLines = (page: Page, day: string) =>
  page.getByRole('list', { name: day }).getByRole('listitem');

test('KAN-51 running server requires login for venue availability', async ({ request }) => {
  // No fixtures: the request goes through the Vite proxy to the normal server.ts startup.
  const response = await request.get('/api/venues/availability', {
    params: { from: '2026-10-04T16:00:00.000Z', to: '2026-10-11T16:00:00.000Z' },
  });
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
});

for (const scenario of [
  { label: 'event coordinator', role: 'EVENT_COORDINATOR' as const, links: 1 },
  { label: 'venue staff member', role: 'VENUE_STAFF' as const, links: 1 },
  { label: 'technical support staff member', role: 'TECHNICAL_SUPPORT_STAFF' as const, links: 1 },
  { label: 'event organiser', role: 'EVENT_ORGANISER' as const, links: 0 },
  { label: 'attendee', role: 'ATTENDEE' as const, links: 0 },
  { label: 'signed-out visitor', role: null, links: 0 },
]) {
  test(`KAN-51 venue availability navigation matches ${scenario.label} access`, async ({ page }) => {
    const user = scenario.role ? account(scenario.role) : null;
    const fixture = await calendarFixtures(page, user);
    await page.goto('/');
    if (user) await expect(page.getByText(user.displayName, { exact: true })).toBeVisible();
    else await expect(page.getByRole('article', { name: 'API service', exact: true })).toContainText('Connected');

    await expect(page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Venue availability', exact: true })).toHaveCount(scenario.links);
    expect(fixture.availabilityReads).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

for (const scenario of [
  { label: 'event organiser', role: 'EVENT_ORGANISER' as const },
  { label: 'attendee', role: 'ATTENDEE' as const },
]) {
  test(`KAN-51 ${scenario.label} cannot open the calendar or load venue data`, async ({ page }) => {
    const fixture = await calendarFixtures(page, account(scenario.role));
    await page.goto('/venues/availability');

    await expect(page.getByRole('heading', { name: 'Venue availability', level: 1 })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(
      'Venue availability is for event coordinators, venue staff and technical support staff.',
    );
    await expect(page.getByText('Harbour Hall')).toHaveCount(0);
    expect(fixture.availabilityReads).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

test('KAN-51 signed-out visitor is asked to sign in without loading venue data', async ({ page }) => {
  const fixture = await calendarFixtures(page, null);
  await page.goto('/venues/availability');

  await expect(page.getByRole('alert')).toContainText('Sign in to view venue availability.');
  await expect(page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }))
    .toHaveAttribute('href', '/login');
  expect(fixture.availabilityReads).toEqual([]);
  expect(fixture.unexpectedRequests).toEqual([]);
});

test('KAN-51 venue staff distinguish periods per venue, change week and keep the view after reload', async ({ page }) => {
  const fixture = await calendarFixtures(page, account('VENUE_STAFF'));
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Venue availability', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Harbour Hall', level: 2 })).toBeVisible();
  await expect(page.getByText('5–11 Oct 2026', { exact: true })).toBeVisible();
  await expect(agendaLines(page, 'Mon, 5 Oct')).toHaveText([
    /Available\s+08:00 – 10:00/, /Booked\s+10:00 – 12:00/, /Available\s+12:00 – 22:00/,
  ]);
  await expect(agendaLines(page, 'Tue, 6 Oct')).toHaveText([
    /Available\s+08:00 – 09:00/, /Blocked\s+09:00 – 18:00\s+· Maintenance/, /Available\s+18:00 – 22:00/,
  ]);
  expect(fixture.availabilityReads).toEqual([{ from: '2026-10-04T16:00:00.000Z', to: '2026-10-11T16:00:00.000Z' }]);

  await page.getByRole('combobox', { name: 'Venue' }).selectOption({ label: 'Orchid Seminar Room' });
  await expect(page.getByRole('heading', { name: 'Orchid Seminar Room', level: 2 })).toBeVisible();
  await expect(agendaLines(page, 'Mon, 5 Oct')).toHaveText([
    /Available\s+08:00 – 13:00/, /Booked\s+13:00 – 15:00/, /Available\s+15:00 – 20:00/,
  ]);
  await expect(agendaLines(page, 'Tue, 6 Oct')).toHaveText([/Available\s+08:00 – 20:00/]);

  await page.getByRole('button', { name: 'Next week', exact: true }).click();
  await expect(page.getByText('12–18 Oct 2026', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/week=2026-10-12/);
  await expect(page).toHaveURL(new RegExp(`venue=${room.id}`));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Orchid Seminar Room', level: 2 })).toBeVisible();
  await expect(page.getByText('12–18 Oct 2026', { exact: true })).toBeVisible();
  expect(fixture.availabilityReads.at(-1)).toEqual({ from: '2026-10-11T16:00:00.000Z', to: '2026-10-18T16:00:00.000Z' });
  expect(fixture.unexpectedRequests).toEqual([]);
});

test('KAN-51 calendar fits a narrow screen without horizontal overflow', async ({ page }, testInfo) => {
  const fixture = await calendarFixtures(page, account('TECHNICAL_SUPPORT_STAFF'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/venues/availability');

  await expect(page.getByRole('heading', { name: 'Harbour Hall', level: 2 })).toBeVisible();
  await expect(agendaLines(page, 'Tue, 6 Oct').nth(1)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-venue-availability.png'), fullPage: true });
  expect(fixture.unexpectedRequests).toEqual([]);
});
