import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

type Role = 'EVENT_ORGANISER' | 'EVENT_COORDINATOR' | 'VENUE_STAFF' | 'TECHNICAL_SUPPORT_STAFF' | 'ATTENDEE';

const account = (role: Role) => ({
  id: '10000000-0000-4000-8000-000000000050',
  email: `${role.toLowerCase()}@example.test`,
  displayName: `Test ${role.toLowerCase().replaceAll('_', ' ')}`,
  role,
});
const harbour = {
  id: '30000000-0000-4000-8000-000000000011', name: 'Harbour Hall', description: null,
  location: 'Level 1, Main Building', capacity: 300, layouts: ['Theatre'], facilities: ['Projector'],
  accessibilityFeatures: ['Ramp'], wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00',
  updatedAt: '2026-10-01T00:00:00.000Z',
};
const orchid = {
  id: '30000000-0000-4000-8000-000000000012', name: 'Orchid Seminar Room', description: null,
  location: null, capacity: 40, layouts: [], facilities: [], accessibilityFeatures: [],
  wheelchairAccessible: false, opensAt: null, closesAt: null, updatedAt: '2026-10-01T00:00:00.000Z',
};

interface Options { patchError?: { status: number; code: string; message: string } }

async function catalogueFixtures(page: Page, user: ReturnType<typeof account> | null, options: Options = {}) {
  // A mutable copy, so a saved change is what a later reload reads (KAN-50-AC12).
  const venues = [structuredClone(harbour), structuredClone(orchid)];
  const catalogueReads: string[] = [];
  const patches: { id: string; body: Record<string, unknown> }[] = [];
  const unexpectedRequests: string[] = [];
  // Fail closed: these cases verify browser behaviour, not hosted login or database authorisation.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const one = /^\/api\/venues\/catalogue\/([^/]+)$/.exec(url.pathname);
    const found = one ? venues.find((venue) => venue.id === one[1]) : undefined;
    if (request.method() === 'GET' && url.pathname === '/api/auth/me') {
      await route.fulfill({ status: user ? 200 : 401, json: user ? { user } : {
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' },
      } });
    } else if (request.method() === 'GET' && url.pathname === '/api/health') {
      await route.fulfill({ json: { status: 'ok', service: 'connectsphere-api' } });
    } else if (request.method() === 'GET' && url.pathname === '/api/health/ready') {
      await route.fulfill({ json: { status: 'ok', database: 'connected' } });
    } else if (request.method() === 'GET' && url.pathname === '/api/venues/catalogue') {
      catalogueReads.push(url.pathname);
      await route.fulfill({ json: { items: venues } });
    } else if (request.method() === 'GET' && one) {
      catalogueReads.push(url.pathname);
      await route.fulfill(found ? { json: { venue: found } } : { status: 404, json: {
        error: { code: 'VENUE_NOT_FOUND', message: 'The venue was not found in the active catalogue.' },
      } });
    } else if (request.method() === 'PATCH' && one && found) {
      const body = request.postDataJSON() as Record<string, unknown>;
      patches.push({ id: found.id, body });
      if (options.patchError) {
        await route.fulfill({ status: options.patchError.status, json: { error: {
          code: options.patchError.code, message: options.patchError.message,
        } } });
      } else {
        Object.assign(found, body, { updatedAt: '2026-10-09T08:00:00.000Z' });
        await route.fulfill({ json: { venue: found } });
      }
    } else if (!(await fulfilWorkspaceRead(route, request))) {
      unexpectedRequests.push(`${request.method()} ${url.pathname}${url.search}`);
      await route.fulfill({ status: 501, json: {
        error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
      } });
    }
  });
  return { catalogueReads, patches, unexpectedRequests };
}

const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' });
const field = (page: Page, label: string) => page.getByLabel(label, { exact: true });

test('KAN-50 running server requires login to read or change the venue catalogue', async ({ request }) => {
  // No fixtures: the requests go through the Vite proxy to the normal server.ts startup.
  const list = await request.get('/api/venues/catalogue');
  expect(list.status()).toBe(401);
  expect((await list.json()).error.code).toBe('AUTHENTICATION_REQUIRED');

  const change = await request.patch(`/api/venues/catalogue/${harbour.id}`, { data: { capacity: 5 } });
  expect(change.status()).toBe(401);
  expect((await change.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
});

for (const scenario of [
  { label: 'venue staff member', role: 'VENUE_STAFF' as const, links: 1 },
  { label: 'event coordinator', role: 'EVENT_COORDINATOR' as const, links: 0 },
  { label: 'technical support staff member', role: 'TECHNICAL_SUPPORT_STAFF' as const, links: 0 },
  { label: 'event organiser', role: 'EVENT_ORGANISER' as const, links: 0 },
  { label: 'attendee', role: 'ATTENDEE' as const, links: 0 },
  { label: 'signed-out visitor', role: null, links: 0 },
]) {
  test(`KAN-50 venue catalogue navigation matches ${scenario.label} access`, async ({ page }) => {
    const user = scenario.role ? account(scenario.role) : null;
    const fixture = await catalogueFixtures(page, user);
    await page.goto('/');
    if (user) await expect(page.getByText(user.displayName, { exact: true })).toBeVisible();
    else await expect(page.getByRole('article', { name: 'API service', exact: true })).toContainText('Connected');

    await expect(mainNav(page).getByRole('link', { name: 'Venue catalogue', exact: true })).toHaveCount(scenario.links);
    expect(fixture.catalogueReads).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

for (const scenario of [
  { label: 'event coordinator', role: 'EVENT_COORDINATOR' as const },
  { label: 'technical support staff member', role: 'TECHNICAL_SUPPORT_STAFF' as const },
  { label: 'event organiser', role: 'EVENT_ORGANISER' as const },
  { label: 'attendee', role: 'ATTENDEE' as const },
]) {
  test(`KAN-50 ${scenario.label} cannot open the catalogue or load venue data`, async ({ page }) => {
    const fixture = await catalogueFixtures(page, account(scenario.role));
    for (const path of ['/venue-catalogue', `/venue-catalogue/${harbour.id}`]) {
      await page.goto(path);
      await expect(page.getByRole('alert')).toContainText('The venue catalogue is for venue staff.');
      await expect(page.getByText('Harbour Hall')).toHaveCount(0);
    }
    expect(fixture.catalogueReads).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

test('KAN-50 signed-out visitor is asked to sign in without loading venue data', async ({ page }) => {
  const fixture = await catalogueFixtures(page, null);
  await page.goto('/venue-catalogue');

  await expect(page.getByRole('alert')).toContainText('Sign in to maintain the venue catalogue.');
  await expect(page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }))
    .toHaveAttribute('href', '/login');
  expect(fixture.catalogueReads).toEqual([]);
  expect(fixture.unexpectedRequests).toEqual([]);
});

test('KAN-50 venue staff view the catalogue, update a venue and see the saved values after reload', async ({ page }) => {
  const fixture = await catalogueFixtures(page, account('VENUE_STAFF'));
  await page.goto('/');
  await mainNav(page).getByRole('link', { name: 'Venue catalogue', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Venue catalogue', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Harbour Hall', level: 3 })).toBeVisible();
  await expect(page.getByText('Level 1, Main Building · Capacity 300')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Orchid Seminar Room', level: 3 })).toBeVisible();
  await expect(page.getByText('No location recorded · Capacity 40')).toBeVisible();

  await page.getByRole('link', { name: 'Edit Harbour Hall' }).click();
  await expect(page.getByRole('heading', { name: 'Harbour Hall', level: 1 })).toBeVisible();
  await expect(field(page, 'Location')).toHaveValue('Level 1, Main Building');
  await expect(field(page, 'Maximum capacity')).toHaveValue('300');
  await expect(field(page, 'Facilities')).toHaveValue('Projector');
  await expect(field(page, 'Accessibility features')).toHaveValue('Ramp');
  await expect(field(page, 'Wheelchair accessible')).toBeChecked();
  await expect(field(page, 'Supported room layouts')).toHaveValue('Theatre');
  await expect(field(page, 'Opens')).toHaveValue('08:00');
  await expect(field(page, 'Closes')).toHaveValue('22:00');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();

  await field(page, 'Maximum capacity').fill('350');
  await field(page, 'Supported room layouts').fill('Theatre\nClassroom');
  await field(page, 'Closes').fill('23:00');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('Venue information saved.')).toBeVisible();
  expect(fixture.patches).toEqual([{
    id: harbour.id, body: { capacity: 350, layouts: ['Theatre', 'Classroom'], closesAt: '23:00' },
  }]);

  await page.reload();
  await expect(field(page, 'Maximum capacity')).toHaveValue('350');
  await expect(field(page, 'Supported room layouts')).toHaveValue('Theatre\nClassroom');
  await expect(field(page, 'Closes')).toHaveValue('23:00');
  await expect(field(page, 'Location')).toHaveValue('Level 1, Main Building');

  await page.getByRole('link', { name: 'Back to the catalogue' }).click();
  await expect(page.getByText('Level 1, Main Building · Capacity 350')).toBeVisible();
  expect(fixture.unexpectedRequests).toEqual([]);
});

test('KAN-50 venue staff can fill in the location, several layouts and opening time of a sparse venue', async ({ page }) => {
  const fixture = await catalogueFixtures(page, account('VENUE_STAFF'));
  await page.goto(`/venue-catalogue/${orchid.id}`);
  await expect(page.getByRole('heading', { name: 'Orchid Seminar Room', level: 1 })).toBeVisible();

  await field(page, 'Location').fill('Level 3, Annex');
  await field(page, 'Supported room layouts').fill('Boardroom\nClassroom\nU-shape');
  await field(page, 'Opens').fill('09:00');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('Venue information saved.')).toBeVisible();
  expect(fixture.patches[0]!.body).toEqual({
    location: 'Level 3, Annex', layouts: ['Boardroom', 'Classroom', 'U-shape'], opensAt: '09:00',
  });
});

test('KAN-50 invalid values are explained and cannot be saved', async ({ page }) => {
  const fixture = await catalogueFixtures(page, account('VENUE_STAFF'));
  await page.goto(`/venue-catalogue/${harbour.id}`);
  await expect(page.getByRole('heading', { name: 'Harbour Hall', level: 1 })).toBeVisible();

  await field(page, 'Maximum capacity').fill('0');
  await expect(page.getByRole('alert')).toContainText('Enter a whole number from 1 to');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();

  await field(page, 'Maximum capacity').fill('300');
  await field(page, 'Closes').fill('07:00');
  await expect(page.getByRole('alert')).toContainText('Closing time must be after opening time.');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  expect(fixture.patches).toEqual([]);
});

test('KAN-50 a server rejection is shown and the entered values are kept', async ({ page }) => {
  const fixture = await catalogueFixtures(page, account('VENUE_STAFF'), {
    patchError: { status: 409, code: 'VENUE_INACTIVE', message: 'This venue is no longer active.' },
  });
  await page.goto(`/venue-catalogue/${harbour.id}`);
  await field(page, 'Maximum capacity').fill('120');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByRole('alert')).toContainText('This venue is no longer active.');
  await expect(field(page, 'Maximum capacity')).toHaveValue('120');
  await expect(page.getByText('Venue information saved.')).toHaveCount(0);
  expect(fixture.patches).toHaveLength(1);
});

test('KAN-50 a venue that is not in the active catalogue shows a clear message and a way back', async ({ page }) => {
  await catalogueFixtures(page, account('VENUE_STAFF'));
  await page.goto('/venue-catalogue/30000000-0000-4000-8000-0000000000ff');

  await expect(page.getByRole('alert')).toContainText('This venue is not in the active catalogue.');
  await expect(page.getByRole('link', { name: 'Back to the catalogue' })).toHaveAttribute('href', '/venue-catalogue');
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
});
