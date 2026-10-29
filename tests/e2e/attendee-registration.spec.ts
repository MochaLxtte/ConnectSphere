import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilNotificationBell } from './workspace-fixtures.js';

const eventId = '14000000-0000-4000-8000-0000000000e1';
const attendee = { id: '14000000-0000-4000-8000-0000000000a1', email: 'attendee@example.test', displayName: 'Test attendee', role: 'ATTENDEE' };
const conditions = (remaining: number | null, capacity: number | null = 10) => ({ required: true, opensAt: '2026-10-01T02:00:00.000Z', closesAt: '2031-01-10T02:00:00.000Z', capacity, placesRemaining: remaining });
const event = (remaining: number | null) => ({ id: eventId, name: 'Career fair', purpose: 'Meet employers', description: 'A full day programme.', startsAt: '2031-01-12T02:00:00.000Z',
  endsAt: '2031-01-12T06:00:00.000Z', accessibilityNeeds: 'Step-free entrance', status: 'CONFIRMED',
  venues: [{ name: 'Harbour Hall', location: 'Level 2', startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T06:00:00.000Z' }], registration: conditions(remaining) });
const open = (remaining: number | null) => ({ canRegister: true, reason: null, message: 'Registration is open.', placesRemaining: remaining });
const taken = (remaining: number | null) => ({ canRegister: false, reason: 'ALREADY_REGISTERED', message: 'You are already registered for this event.', placesRemaining: remaining });

/** A small stateful stand-in: the first registration fills the event for someone else, the second works. */
async function fixtures(page: Page, options: { role?: string | null; fullOnFirst?: boolean } = {}) {
  const role = options.role === undefined ? 'ATTENDEE' : options.role;
  let registered = false; let full = false; let attempts = 0;
  const posts: unknown[] = []; const unexpected: string[] = []; let reads = 0;
  const detail = () => registered
    ? { event: event(7), registration: { id: 'r1', status: 'REGISTERED', registeredAt: '2026-10-29T03:00:00.000Z', withdrawnAt: null }, availability: taken(7) }
    : full ? { event: event(0), registration: null, availability: { canRegister: false, reason: 'FULL', message: 'This event is full.', placesRemaining: 0 } }
      : { event: event(8), registration: null, availability: open(8) };
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    if (path === '/api/auth/me' && method === 'GET') {
      await route.fulfill({ status: role ? 200 : 401, json: role ? { user: { ...attendee, role } } : { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } } });
    } else if (role === 'ATTENDEE' && path === '/api/attendee/events' && method === 'GET') {
      reads++; const d = detail();
      await route.fulfill({ json: { items: [{ id: eventId, name: 'Career fair', startsAt: event(1).startsAt, endsAt: event(1).endsAt, registration: d.event.registration,
        ownStatus: d.registration ? 'REGISTERED' : null, availability: d.availability }] } });
    } else if (role === 'ATTENDEE' && path === '/api/attendee/registrations' && method === 'GET') {
      await route.fulfill({ json: { items: registered ? [{ id: 'r1', status: 'REGISTERED', registeredAt: '2026-10-29T03:00:00.000Z', withdrawnAt: null,
        event: { id: eventId, name: 'Career fair', startsAt: event(1).startsAt, endsAt: event(1).endsAt, status: 'CONFIRMED' } }] : [] } });
    } else if (role === 'ATTENDEE' && path === `/api/attendee/events/${eventId}` && method === 'GET') {
      reads++; await route.fulfill({ json: detail() });
    } else if (role === 'ATTENDEE' && path === `/api/attendee/events/${eventId}/register` && method === 'POST') {
      posts.push(request.postDataJSON()); attempts++;
      if (options.fullOnFirst && attempts === 1) { full = true; await route.fulfill({ status: 409, json: { error: { code: 'REGISTRATION_FULL', message: 'This event is full.' } } }); }
      else { registered = true; await route.fulfill({ status: 201, json: { ...detail(), changed: true } }); }
    } else if (!(await fulfilNotificationBell(route, request))) {
      unexpected.push(`${method} ${path}`); await route.fulfill({ status: 501, json: {} });
    }
  });
  return { posts, unexpected, get reads() { return reads; } };
}

test('KAN-14 an attendee reads the event, registers once and sees the registration again after a reload', async ({ page }, testInfo) => {
  const fixture = await fixtures(page);
  await page.goto('/attend');
  await expect(page.getByRole('link', { name: 'Events', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review queue', exact: true })).toHaveCount(0);
  await expect(page.getByText('Registration open')).toBeVisible();
  await page.getByRole('link', { name: 'Career fair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Career fair', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText('Harbour Hall · Level 2')).toBeVisible();
  await expect(page.getByText('Step-free entrance')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Registration conditions' })).toContainText('8 of 10 places left');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Register for this event', exact: true }).click();
  await expect(page.getByText('You are registered. We have saved your place.')).toBeVisible();
  await expect(page.getByText(/Your registration:/)).toContainText('Registered');
  await expect(page.getByRole('button', { name: 'Register for this event' })).toHaveCount(0);
  expect(fixture.posts).toEqual([{}]);
  await page.screenshot({ path: testInfo.outputPath('attendee-registered-desktop.png'), fullPage: true });
  await page.reload();
  await expect(page.getByText(/Your registration:/)).toContainText('Registered');
  await page.getByRole('link', { name: 'Back to events', exact: true }).click();
  await expect(page.getByRole('list', { name: 'My registrations' })).toContainText('Career fair');
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-14 a full event is explained and keeps the attendee from registering', async ({ page }) => {
  const fixture = await fixtures(page, { fullOnFirst: true });
  await page.goto(`/attend/${eventId}`);
  await page.getByRole('button', { name: 'Register for this event', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('This event is full.');
  await expect(page.getByRole('button', { name: 'Register for this event' })).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Registration conditions' })).toContainText('0 of 10 places left');
  expect(fixture.posts).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', null]) {
  test(`KAN-14 the attendee pages are protected for ${role ?? 'a signed-out visitor'}`, async ({ page }) => {
    const fixture = await fixtures(page, { role });
    for (const path of ['/attend', `/attend/${eventId}`]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: role ? 'Attendee access only' : 'Sign in required', exact: true })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Events', exact: true })).toHaveCount(0);
    expect(fixture.reads).toBe(0); expect(fixture.posts).toEqual([]); expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-14 the event page fits a narrow screen without sideways scrolling', async ({ page }, testInfo) => {
  await fixtures(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`/attend/${eventId}`);
  await expect(page.getByRole('button', { name: 'Register for this event', exact: true })).toBeVisible();
  const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, window: window.innerWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.window);
  await page.screenshot({ path: testInfo.outputPath('attendee-event-mobile.png'), fullPage: true });
});

test('KAN-14 the running API requires login to list, read or register', async ({ request }) => {
  for (const response of [await request.get('/api/attendee/events'), await request.get('/api/attendee/registrations'),
    await request.get(`/api/attendee/events/${eventId}`), await request.post(`/api/attendee/events/${eventId}/register`, { data: {} })]) {
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});
