import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilNotificationBell } from './workspace-fixtures.js';

const eventId = '10000000-0000-4000-8000-000000000065';
const oldId = '10000000-0000-4000-8000-000000000029';
const newId = '10000000-0000-4000-8000-000000000030';
const versionOne = '10000000-0000-4000-8000-000000000080';
const versionTwo = '10000000-0000-4000-8000-000000000081';
const lead = { id: '10000000-0000-4000-8000-000000000079', role: 'EVENT_COORDINATOR_LEAD',
  displayName: 'Test Lead', email: 'lead@example.test' };
const options = [
  { id: oldId, displayName: 'Previous coordinator', email: 'old@example.test' },
  { id: newId, displayName: 'Replacement coordinator', email: 'new@example.test' },
] as const;
const reason = 'Covering the previous coordinator during leave.';
type FixtureOptions = { status?: string; role?: string; available?: boolean;
  outcome?: 'conflict' | 'uncertain' | 'unavailable'; hold?: Promise<void> };

async function fixtures(page: Page, settings: FixtureOptions = {}) {
  let moved = false;
  let signedIn = true;
  const writes: unknown[] = [];
  const unexpected: string[] = [];
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (path === '/api/auth/me') {
      await route.fulfill(signedIn ? { json: { user: { ...lead, role: settings.role ?? lead.role } } }
        : { status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } } });
    } else if (path === '/api/auth/logout' && method === 'POST') {
      signedIn = false; await route.fulfill({ status: 204 });
    } else if (path === '/api/health' || path === '/api/health/ready') {
      await route.fulfill({ json: { status: 'ok', database: 'connected' } });
    } else if (path === `/api/events/oversight/${eventId}` && method === 'GET') {
      await route.fulfill({ json: { id: eventId, name: 'Coordinator handover workshop',
        status: settings.status ?? 'APPROVED', organiserName: 'Test organiser',
        coordinatorId: moved ? newId : oldId, coordinatorName: moved ? options[1].displayName : options[0].displayName,
        assignmentVersion: moved ? versionTwo : versionOne, startsAt: null, endsAt: null, updatedAt: '2026-10-19T02:00:00Z',
        expectedAttendance: 50, purpose: 'Retain event information during handover', description: 'Original event',
        venueRequirements: 'A hall', accessibilityNeeds: null, equipmentRequirements: null, registrationRequired: false,
        actions: { canAssignCoordinator: false, canReassignCoordinator: true } } });
    } else if (path === `/api/events/${eventId}/assignments` && method === 'GET') {
      const previous = { id: versionOne, coordinatorId: oldId, coordinatorName: options[0].displayName,
        assignmentMethod: 'AUTOMATIC', assignedById: null, assignedByName: null, note: null,
        assignedAt: '2026-10-01T02:00:00Z', unassignedAt: moved ? '2026-10-19T02:00:00Z' : null };
      await route.fulfill({ json: { items: moved ? [{ id: versionTwo, coordinatorId: newId,
        coordinatorName: options[1].displayName, assignmentMethod: 'MANUAL', assignedById: lead.id,
        assignedByName: lead.displayName, note: reason, assignedAt: '2026-10-19T02:00:00Z', unassignedAt: null }, previous] : [previous] } });
    } else if (path === '/api/events/coordinators' && method === 'GET') {
      await route.fulfill({ json: { items: settings.available === false ? [options[0]] : options } });
    } else if (path === `/api/events/${eventId}/coordinator/reassign` && method === 'POST') {
      writes.push(request.postDataJSON());
      expect(request.postDataJSON()).toEqual({ coordinatorId: newId, reason, expectedAssignmentVersion: versionOne });
      await settings.hold;
      if (settings.outcome === 'unavailable') {
        settings.available = false;
        await route.fulfill({ status: 400, json: { error: { code: 'INVALID_COORDINATOR', message: 'Select an available coordinator.' } } });
      } else {
        moved = true;
        await route.fulfill(settings.outcome === 'conflict'
          ? { status: 409, json: { error: { code: 'ASSIGNMENT_VERSION_CONFLICT', message: 'The assignment changed. Refresh it.' } } }
          : settings.outcome === 'uncertain'
            ? { status: 502, body: 'Gateway response unavailable', contentType: 'text/plain' }
            : { json: { eventRequestId: eventId, assignmentId: versionTwo, coordinatorId: newId,
              previousCoordinatorId: oldId, changed: true } });
      }
    } else if (await fulfilNotificationBell(route, request)) {
      // Answered: the top-bar notification bell (KAN-64).
    } else {
      unexpected.push(`${method} ${path}`);
      await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'Missing test fixture' } } });
    }
  });
  return { writes, unexpected };
}

async function selectReplacement(page: Page) {
  await page.getByRole('combobox', { name: 'Reassign to', exact: true }).selectOption(newId);
  await page.getByRole('textbox', { name: 'Reason for reassignment', exact: true }).fill(`  ${reason}  `);
}

// Browser fixtures prove UI wiring and reconciliation. Database integration tests
// independently verify real authorization, locking, rollback and history integrity.
test.describe('KAN-65 Lead reassignment browser workflow', () => {
  for (const status of ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED']) {
    test(`hands over ${status} with a required reason and preserves its existing history`, async ({ page }) => {
      const fixture = await fixtures(page, { status });
      await page.goto(`/lead/oversight/${eventId}`);
      await expect(page.getByRole('button', { name: 'Reassign coordinator', exact: true })).toBeDisabled();
      await expect(page.getByRole('option', { name: /Previous coordinator/ })).toHaveCount(0);
      await page.getByRole('combobox', { name: 'Reassign to' }).selectOption(newId);
      await page.getByRole('textbox', { name: 'Reason for reassignment' }).fill('   ');
      await expect(page.getByRole('button', { name: 'Reassign coordinator' })).toBeDisabled();
      await selectReplacement(page);
      await page.getByRole('button', { name: 'Reassign coordinator', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Reassigned from Previous coordinator to Replacement coordinator' })).toBeVisible();
      await expect(page.getByText('Ended', { exact: true })).toBeVisible();
      await expect(page.getByText('Current', { exact: true })).toBeVisible();
      await expect(page.getByText('Assigned automatically on', { exact: false })).toBeVisible();
      await expect(page.getByText('Assigned by Test Lead', { exact: false })).toBeVisible();
      await expect(page.getByRole('option', { name: /Replacement coordinator/ })).toHaveCount(0);
      await expect(page.getByRole('option', { name: /Previous coordinator/ })).toHaveCount(1);
      await expect(page.getByRole('radio')).toHaveCount(0);
      await page.reload();
      await expect(page.getByText('Original event', { exact: true })).toBeVisible();
      await expect(page.getByText(reason, { exact: true })).toBeVisible();
      expect(fixture.writes).toHaveLength(1); expect(fixture.unexpected).toEqual([]);
    });
  }
  test('reconciles a stale version and requires a fresh selection without announcing success', async ({ page }) => {
    const fixture = await fixtures(page, { outcome: 'conflict' });
    await page.goto(`/lead/oversight/${eventId}`); await selectReplacement(page);
    await page.getByRole('button', { name: 'Reassign coordinator' }).click();
    await expect(page.getByRole('alert')).toContainText('assignment changed');
    await expect(page.getByText('Ended', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reassign coordinator' })).toBeDisabled();
    await expect(page.getByText('Reassigned from', { exact: false })).toHaveCount(0);
    expect(fixture.writes).toHaveLength(1); expect(fixture.unexpected).toEqual([]);
  });
  test('blocks retries after an uncertain response until explicit refresh', async ({ page }) => {
    const fixture = await fixtures(page, { outcome: 'uncertain' });
    await page.goto(`/lead/oversight/${eventId}`); await selectReplacement(page);
    await page.getByRole('button', { name: 'Reassign coordinator' }).click();
    await expect(page.getByRole('alert')).toContainText('could not confirm');
    await expect(page.getByRole('button', { name: 'Reassign coordinator' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Refresh assignment', exact: true }).click();
    await expect(page.getByText('Ended', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reassign coordinator' })).toBeDisabled();
    expect(fixture.writes).toHaveLength(1); expect(fixture.unexpected).toEqual([]);
  });
  test('refreshes a target that became unavailable', async ({ page }) => {
    const fixture = await fixtures(page, { outcome: 'unavailable' });
    await page.goto(`/lead/oversight/${eventId}`); await selectReplacement(page);
    await page.getByRole('button', { name: 'Reassign coordinator' }).click();
    await expect(page.getByText('No other event coordinators are currently available.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reassign coordinator' })).toBeDisabled();
    await expect(page.getByText('Ended', { exact: true })).toHaveCount(0);
    expect(fixture.writes).toHaveLength(1); expect(fixture.unexpected).toEqual([]);
  });
  test('does not submit without an available replacement', async ({ page }) => {
    const fixture = await fixtures(page, { available: false });
    await page.goto(`/lead/oversight/${eventId}`);
    await expect(page.getByText('No other event coordinators are currently available.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reassign coordinator' })).toBeDisabled();
    expect(fixture.writes).toEqual([]); expect(fixture.unexpected).toEqual([]);
  });
  for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF']) {
    test(`${role} cannot open the reassignment interface`, async ({ page }) => {
      const fixture = await fixtures(page, { role }); await page.goto(`/lead/oversight/${eventId}`);
      await expect(page.getByRole('heading', { name: 'Lead access only' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reassign coordinator' })).toHaveCount(0);
      expect(fixture.writes).toEqual([]); expect(fixture.unexpected).toEqual([]);
    });
  }
  test('discards late handover feedback after logout and prevents duplicate submits', async ({ page }) => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const fixture = await fixtures(page, { hold }); await page.goto(`/lead/oversight/${eventId}`);
    await selectReplacement(page); await page.getByRole('button', { name: 'Reassign coordinator' }).click();
    await expect.poll(() => fixture.writes.length).toBe(1);
    await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in required' })).toBeVisible();
    release();
    await expect(page.getByText('Coordinator handover workshop', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Reassigned from', { exact: false })).toHaveCount(0);
    expect(fixture.writes).toHaveLength(1); expect(fixture.unexpected).toEqual([]);
  });
});
