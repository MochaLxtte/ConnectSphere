import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilNotificationBell } from './workspace-fixtures.js';

const eventId = '10000000-0000-4000-8000-000000000079';
const coordinatorId = '10000000-0000-4000-8000-000000000029';
const lead = {
  id: '10000000-0000-4000-8000-000000000078',
  displayName: 'Test allocation Lead', email: 'lead@example.test', role: 'EVENT_COORDINATOR_LEAD',
};
const coordinator = { id: coordinatorId, displayName: 'Available coordinator', email: 'coordinator@example.test' };
const summary = {
  id: eventId, name: 'Lead allocation workshop', status: 'SUBMITTED', organiserName: 'Test organiser',
  coordinatorId: null as string | null, coordinatorName: null as string | null,
  startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
  expectedAttendance: 50, updatedAt: '2026-10-19T02:00:00.000Z',
};
type Options = {
  user?: typeof lead | null; available?: boolean; conflict?: boolean; status?: string; holdWrite?: Promise<void>;
};
async function fixtures(page: Page, options: Options = {}) {
  let user = options.user === undefined ? lead : options.user;
  let assigned = false;
  let writes = 0;
  const calls: string[] = [];
  const unexpected: string[] = [];
  const current = () => ({ ...summary, status: options.status ?? summary.status,
    coordinatorId: assigned ? coordinatorId : null, coordinatorName: assigned ? coordinator.displayName : null });
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    if (path.startsWith('/api/events')) calls.push(`${method} ${path}`);
    if (path === '/api/auth/me' && method === 'GET') {
      await route.fulfill({ status: user ? 200 : 401, json: user ? { user } : { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } } });
    } else if (path === '/api/auth/logout' && method === 'POST') {
      user = null;
      await route.fulfill({ status: 204 });
    } else if (path === '/api/health' || path === '/api/health/ready') {
      await route.fulfill({ json: { status: 'ok', service: 'connectsphere-api', database: 'connected' } });
    } else if (method === 'GET' && path === '/api/events/unassigned') {
      await route.fulfill({ json: { items: assigned ? [] : [current()] } });
    } else if (method === 'GET' && path === '/api/events/coordinators') {
      await route.fulfill({ json: { items: options.available === false ? [] : [coordinator] } });
    } else if (method === 'GET' && path === '/api/events/oversight') {
      await route.fulfill({ json: { items: [current()] } });
    } else if (method === 'GET' && path === `/api/events/oversight/${eventId}`) {
      await route.fulfill({ json: { ...current(), purpose: 'Allocate responsibility', description: 'Basic planning information',
        venueRequirements: 'A hall', accessibilityNeeds: 'Step-free access', equipmentRequirements: 'Projector',
        registrationRequired: false, actions: { canAssignCoordinator: !assigned } } });
    } else if (method === 'GET' && path === `/api/events/${eventId}/assignments`) {
      await route.fulfill({ json: { items: assigned ? [{
        id: '10000000-0000-4000-8000-000000000080', coordinatorId, coordinatorName: coordinator.displayName,
        assignmentMethod: 'MANUAL', assignedById: lead.id, assignedByName: lead.displayName,
        note: null, assignedAt: '2026-10-19T02:00:00.000Z', unassignedAt: null,
      }] : [] } });
    } else if (method === 'PUT' && path === `/api/events/${eventId}/coordinator`) {
      writes += 1;
      expect(req.postDataJSON().coordinatorId).toBe(coordinatorId);
      await options.holdWrite;
      assigned = true;
      await route.fulfill(options.conflict ? { status: 409, json: {
        error: { code: 'COORDINATOR_ALREADY_ASSIGNED', message: 'This request already has a coordinator.' },
      } } : { json: { eventRequestId: eventId, coordinatorId, previousCoordinatorId: null,
        assignmentId: '10000000-0000-4000-8000-000000000080' } });
    } else if (await fulfilNotificationBell(route, req)) {
      // Answered: the top-bar notification bell (KAN-64).
    } else {
      unexpected.push(`${method} ${path}`);
      await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No API fixture configured.' } } });
    }
  });
  return { calls, unexpected, writes: () => writes };
}

// API fixtures prove browser wiring and session lifecycle only. Real role mapping,
// transaction conflicts and record integrity are exercised by database integration tests.
test.describe('KAN-79 Lead allocation browser workflow', () => {
  test('assigns from the queue and keeps the allocation accessible in active-event oversight', async ({ page }) => {
    const fixture = await fixtures(page);
    await page.goto('/lead');
    await expect(page.getByRole('heading', { name: 'Assignment queue', exact: true })).toBeVisible();
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(navigation.getByRole('link', { name: 'Review queue', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Assign', exact: true })).toBeDisabled();
    await page.getByRole('combobox', { name: `Coordinator for ${summary.name}` }).selectOption(coordinatorId);
    await page.getByRole('button', { name: 'Assign', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('is now assigned to Available coordinator');
    await expect(page.getByRole('heading', { name: 'No requests are awaiting assignment' })).toBeVisible();
    await page.getByRole('link', { name: 'Open allocation', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Event allocation', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assignment history', exact: true })).toBeVisible();
    await expect(page.getByText('Assigned by Test allocation Lead', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assign coordinator', exact: true })).toHaveCount(0);
    await expect(page.getByRole('radio')).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to event oversight', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Event oversight', exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('Available coordinator', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: summary.name, exact: true })).toBeVisible();
    expect(fixture.writes()).toBe(1);
    expect(fixture.unexpected).toEqual([]);
  });

  test('allows initial allocation of an active confirmed event through its oversight detail', async ({ page }) => {
    const fixture = await fixtures(page, { status: 'CONFIRMED' });
    await page.goto(`/lead/oversight/${eventId}`);
    await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Assign to', exact: true }).selectOption(coordinatorId);
    await page.getByRole('textbox', { name: 'Note', exact: false }).fill('Coordinate this existing event.');
    await page.getByRole('button', { name: 'Assign coordinator', exact: true }).click();
    await expect(page.getByText('Available coordinator is now the coordinator for this request.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assignment history' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assign coordinator', exact: true })).toHaveCount(0);
    expect(fixture.writes()).toBe(1);
    expect(fixture.unexpected).toEqual([]);
  });

  test('handles a stale assignment conflict by refreshing the queue without claiming success', async ({ page }) => {
    const fixture = await fixtures(page, { conflict: true });
    await page.goto('/lead');
    await page.getByRole('combobox', { name: `Coordinator for ${summary.name}` }).selectOption(coordinatorId);
    await page.getByRole('button', { name: 'Assign', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('was assigned by another Lead');
    await expect(page.getByRole('heading', { name: 'No requests are awaiting assignment' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open allocation', exact: true })).toHaveCount(0);
    expect(fixture.writes()).toBe(1);
    expect(fixture.unexpected).toEqual([]);
  });

  test('keeps a submitted request visible when no coordinator is available', async ({ page }) => {
    const fixture = await fixtures(page, { available: false });
    await page.goto('/lead');
    await expect(page.getByRole('link', { name: summary.name, exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('No event coordinators are currently available');
    await expect(page.getByRole('button', { name: 'Assign', exact: true })).toBeDisabled();
    expect(fixture.writes()).toBe(0);
    expect(fixture.unexpected).toEqual([]);
  });

  test('clears private allocation data on logout and ignores a late in-flight save result', async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const fixture = await fixtures(page, { holdWrite: pending });
    await page.goto('/lead');
    await page.getByRole('combobox', { name: `Coordinator for ${summary.name}` }).selectOption(coordinatorId);
    await page.getByRole('button', { name: 'Assign', exact: true }).click();
    await expect.poll(fixture.writes).toBe(1);
    await expect(page.getByRole('button', { name: 'Assigning…' })).toBeDisabled();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in required', exact: true })).toBeVisible();
    release();
    await expect(page.getByText(summary.name, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open allocation', exact: true })).toHaveCount(0);
    expect(fixture.unexpected).toEqual([]);
  });

  for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE']) {
    for (const path of ['/lead', '/lead/oversight', `/lead/oversight/${eventId}`, '/reviews/unassigned']) {
      test(`${role} cannot open ${path} or load Lead data`, async ({ page }) => {
        const fixture = await fixtures(page, { user: { ...lead, role } });
        await page.goto(path);
        await expect(page.getByRole('heading', { name: 'Lead access only', exact: true })).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Assignment queue', exact: true })).toHaveCount(0);
        expect(fixture.calls).toEqual([]);
        expect(fixture.unexpected).toEqual([]);
      });
    }
  }

  test('does not load Lead data before a session has been verified', async ({ page }) => {
    const fixture = await fixtures(page);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/auth/me', async (route) => {
      await pending;
      await route.fulfill({ json: { user: lead } });
    });
    await page.goto('/lead');
    await expect(page.getByText('Checking your session…', { exact: true })).toBeVisible();
    expect(fixture.calls).toEqual([]);
    release();
    await expect(page.getByRole('link', { name: summary.name, exact: true })).toBeVisible();
    expect(fixture.unexpected).toEqual([]);
  });

  test('requires sign-in on a direct oversight link', async ({ page }) => {
    const fixture = await fixtures(page, { user: null });
    await page.goto(`/lead/oversight/${eventId}`);
    await expect(page.getByRole('heading', { name: 'Sign in required', exact: true })).toBeVisible();
    expect(fixture.calls).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });
});
