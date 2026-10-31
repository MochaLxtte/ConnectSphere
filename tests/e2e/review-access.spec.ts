import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

const requestId = '10000000-0000-4000-8000-000000000033';
const coordinator = {
  id: '10000000-0000-4000-8000-000000000025',
  email: 'coordinator@example.test',
  displayName: 'Test coordinator',
  role: 'EVENT_COORDINATOR',
};
const organiser = {
  id: '10000000-0000-4000-8000-000000000031',
  email: 'organiser@example.test',
  displayName: 'Test organiser',
  role: 'EVENT_ORGANISER',
};
const detail = {
  id: requestId,
  organiserId: organiser.id,
  coordinatorId: coordinator.id,
  status: 'SUBMITTED',
  name: 'Private community workshop',
  purpose: 'Bring neighbours together',
  description: 'Submitted programme details.',
  startsAt: null,
  endsAt: null,
  expectedAttendance: 25,
  venueRequirements: null,
  accessibilityNeeds: null,
  equipmentRequirements: null,
  registrationRequired: false,
  createdAt: '2026-09-17T01:00:00.000Z',
  updatedAt: '2026-09-17T01:00:00.000Z',
  review: null,
  actions: { canEditDraft: false, canMakeInitialDecision: true },
};

async function reviewFixtures(page: Page, initialUser: typeof coordinator | null) {
  let user = initialUser;
  const eventCalls: string[] = [];
  const unexpectedRequests: string[] = [];
  // Intercept all APIs, including writes. These cases verify browser access and
  // session lifecycle behaviour, not hosted login or database authorisation.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const { pathname: path, search } = new URL(request.url());
    if (path.startsWith('/api/events')) eventCalls.push(`${request.method()} ${path}${search}`);
    if (request.method() === 'GET' && path === '/api/auth/me') {
      await route.fulfill({ status: user ? 200 : 401, json: user ? { user } : {
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' },
      } });
    } else if (request.method() === 'GET' && path === '/api/health') {
      await route.fulfill({ json: { status: 'ok', service: 'connectsphere-api' } });
    } else if (request.method() === 'GET' && path === '/api/health/ready') {
      await route.fulfill({ json: { status: 'ok', database: 'connected' } });
    } else if (request.method() === 'POST' && path === '/api/auth/logout') {
      user = null;
      await route.fulfill({ status: 204 });
    } else if (request.method() === 'GET' && path === '/api/events') {
      // KAN-56: the decided-request history is empty in these access fixtures.
      await route.fulfill({ json: { items: search === '?scope=history' ? [] : [detail] } });
    } else if (request.method() === 'GET' && path === `/api/events/${requestId}`) {
      await route.fulfill({ json: detail });
    } else if (request.method() === 'GET' && path === '/api/events/unassigned') {
      await route.fulfill({ json: { items: [{ ...detail, organiserName: 'Test organiser' }] } });
    } else if (!(await fulfilWorkspaceRead(route, request,
      user?.role === 'EVENT_COORDINATOR' ? { coordinatorBookingEventId: requestId } : {}))) {
      unexpectedRequests.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 501, json: {
        error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
      } });
    }
  });
  return { eventCalls, unexpectedRequests };
}

for (const scenario of [
  { label: 'organiser', user: organiser, reviewLinks: 0, organiserLinks: 1 },
  { label: 'signed-out visitor', user: null, reviewLinks: 0, organiserLinks: 1 },
  { label: 'coordinator', user: coordinator, reviewLinks: 1, organiserLinks: 0 },
]) {
  test(`KAN-25 dashboard review navigation matches ${scenario.label} access`, async ({ page }) => {
    const fixture = await reviewFixtures(page, scenario.user);
    await page.goto('/');
    if (scenario.user) await expect(page.getByText(scenario.user.displayName, { exact: true })).toBeVisible();
    else await expect(page.getByRole('article', { name: 'API service', exact: true })).toContainText('Connected');

    await expect(page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Review queue', exact: true })).toHaveCount(scenario.reviewLinks);
    await expect(page.getByRole('link', { name: /Review event requests/ })).toHaveCount(scenario.reviewLinks);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Unassigned requests', exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Event requests', exact: true })).toHaveCount(scenario.organiserLinks);
    expect(fixture.eventCalls).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

for (const path of ['/reviews', `/reviews/${requestId}`]) {
  test(`KAN-25/KAN-33 organiser cannot open ${path} or load review data`, async ({ page }) => {
    const fixture = await reviewFixtures(page, organiser);
    await page.goto(path);

    await expect(page.getByRole('heading', { name: 'Coordinator access only', level: 1 })).toBeVisible();
    await expect(page.getByText('This page is for event coordinators.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to your event requests', exact: true }))
      .toHaveAttribute('href', '/events');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Review queue', exact: true })).toHaveCount(0);
    await expect(page.getByText('For coordinators', { exact: true })).toHaveCount(0);
    await expect(page.getByText(detail.name, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('radio')).toHaveCount(0);
    expect(fixture.eventCalls).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  test(`KAN-25/KAN-33 signed-out visitor cannot open ${path} or load review data`, async ({ page }) => {
    const fixture = await reviewFixtures(page, null);
    await page.goto(path);

    await expect(page.getByRole('heading', { name: 'Sign in required', level: 1 })).toBeVisible();
    await expect(page.getByText('Sign in to access event reviews.', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }))
      .toHaveAttribute('href', '/login');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Review queue', exact: true })).toHaveCount(0);
    await expect(page.getByText(detail.name, { exact: true })).toHaveCount(0);
    expect(fixture.eventCalls).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  test(`KAN-25/KAN-33 coordinator sees ${path} and signing out clears its data`, async ({ page }) => {
    const fixture = await reviewFixtures(page, coordinator);
    await page.goto(path);

    await expect(page.getByText(detail.name, { exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Review queue', exact: true })).toBeVisible();
    const expectedReads = path === '/reviews' ? ['GET /api/events', 'GET /api/events?scope=history']
      : [`GET /api/events/${requestId}`, `GET /api/events/${requestId}/assignments`,
          `GET /api/events/${requestId}/clarifications`,
          `GET /api/events/${requestId}/history`];
    await expect.poll(() => [...fixture.eventCalls].sort()).toEqual(expectedReads.sort());
    if (path === `/reviews/${requestId}`) {
      await expect(page.getByRole('radio')).toHaveCount(2);
      await expect(page.getByRole('combobox', { name: 'Hand over to' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^(Confirm event|Mark completed)$/i })).toHaveCount(0);
      // KAN-62 now permits cancellation of a submitted assigned request, with explicit confirmation.
      await expect(page.getByRole('button', { name: 'Cancel event', exact: true })).toBeDisabled();
    }

    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in required', level: 1 })).toBeVisible();
    await expect(page.getByText(detail.name, { exact: true })).toHaveCount(0);
    await expect(page.getByText(detail.description, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Event cancellation', exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Review queue', exact: true })).toHaveCount(0);
    expect([...fixture.eventCalls].sort()).toEqual(expectedReads.sort());
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

test('KAN-25/KAN-33 review queue waits for a verified coordinator session', async ({ page }) => {
  const fixture = await reviewFixtures(page, coordinator);
  let releaseSession!: () => void;
  const sessionReady = new Promise<void>((resolve) => { releaseSession = resolve; });
  await page.route('**/api/auth/me', async (route) => {
    await sessionReady;
    await route.fulfill({ json: { user: coordinator } });
  });
  await page.goto('/reviews');

  await expect(page.getByText('Checking your session…', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Review queue', exact: true })).toHaveCount(0);
  expect(fixture.eventCalls).toEqual([]);

  releaseSession();
  await expect(page.getByText(detail.name, { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Review queue', exact: true })).toBeVisible();
  await expect.poll(() => [...fixture.eventCalls].sort())
    .toEqual(['GET /api/events', 'GET /api/events?scope=history']);
  expect(fixture.unexpectedRequests).toEqual([]);
});

for (const width of [1280, 390]) {
  for (const queueState of ['ready', 'empty', 'error', 'loading'] as const) {
    test(`KAN-33 review queue panels keep readable insets in ${queueState} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const fixture = await reviewFixtures(page, coordinator);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      await page.route((url) => url.pathname === '/api/events', async (route) => {
        if (queueState === 'loading') await gate;
        const history = new URL(route.request().url()).searchParams.get('scope') === 'history';
        await route.fulfill(queueState === 'error'
          ? { status: 500, json: { error: { code: 'READ_FAILED', message: 'The queue could not be loaded.' } } }
          : { json: { items: queueState === 'empty' ? [] : [{ ...detail,
              name: 'Community workshop with a longer event name for narrow screens',
              status: history ? 'APPROVED' : 'SUBMITTED' }] } });
      });
      try {
        await page.goto('/reviews');
        const panels = page.locator('main > .panel');
        await expect(panels).toHaveCount(2);
        if (queueState === 'ready') await expect(panels.first().getByRole('link')).toBeVisible();
        if (queueState === 'empty') await expect(page.getByRole('heading', { name: 'No requests are awaiting review' })).toBeVisible();
        if (queueState === 'error') await expect(panels.first().getByRole('alert')).toBeVisible();
        if (queueState === 'loading') await expect(panels.first()).toContainText('Loading the review queue');
        await page.locator('main').screenshot({ path: testInfo.outputPath(`queue-${queueState}-${width}.png`) });
        for (const panel of await panels.all()) {
          const inset = await panel.evaluate((el) => {
            const s = getComputedStyle(el);
            return Math.min(...[s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat));
          });
          expect(inset, 'Visible content needs space inside every side of the card').toBeGreaterThanOrEqual(16);
        }
        // The label remains in the accessibility tree, without an accidental visual heading.
        await expect(page.locator('#queue-title')).toHaveCSS('position', 'absolute');
        await expect(page.getByRole('region', { name: 'Submitted event requests awaiting review' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        expect(fixture.unexpectedRequests).toEqual([]);
      } finally { release(); }
    });
  }
}
