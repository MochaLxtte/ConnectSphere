import type { Page, Request, Route } from '@playwright/test';
import { expect, test } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

// Browser-boundary checks with substituted API responses; the server rules and PostgreSQL
// behaviour are covered by database/tests/events/planning-edits.integration.test.ts.
const organiser = { id: '10000000-0000-4000-8000-000000000066', email: 'organiser@example.test', displayName: 'Test organiser', role: 'EVENT_ORGANISER' };
const coordinator = { id: '20000000-0000-4000-8000-000000000066', email: 'coordinator@example.test', displayName: 'Test coordinator', role: 'EVENT_COORDINATOR' };
const allFields = [
  'name', 'description', 'purpose', 'startsAt', 'endsAt', 'expectedAttendance', 'venueRequirements',
  'accessibilityNeeds', 'equipmentRequirements', 'registrationRequired', 'registrationCapacity',
  'registrationOpensAt', 'registrationClosesAt',
];

function eventRequest(status: string, actions: Record<string, unknown>) {
  return {
    id: '30000000-0000-4000-8000-000000000066', organiserId: organiser.id, coordinatorId: coordinator.id,
    status, name: 'Career fair', purpose: 'Hiring', description: 'Annual fair',
    startsAt: '2026-12-01T01:00:00.000Z', endsAt: '2026-12-01T09:00:00.000Z', expectedAttendance: 200,
    venueRequirements: 'Hall A', accessibilityNeeds: null, equipmentRequirements: null,
    registrationRequired: false, registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null,
    revision: 4, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', review: null,
    actions: { canEditDraft: false, canMakeInitialDecision: false, ...actions },
  };
}

async function stubApi(
  page: Page, user: object,
  handle: (path: string, request: Request, route: Route) => Promise<boolean>,
) {
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path === '/api/auth/me') await route.fulfill({ json: { user } });
    else if (await handle(path, request, route)) return;
    else if (!(await fulfilWorkspaceRead(route, request))) {
      await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'Unexpected request' } } });
    }
  });
}

test('KAN-66-AC101/AC3 organiser edits a submitted request and sees it after refresh', async ({ page }) => {
  let current = eventRequest('UNDER_REVIEW', {
    canEditDetails: true, editMode: 'PRE_APPROVAL', editableFields: allFields,
  });
  const patches: unknown[] = [];
  await stubApi(page, organiser, async (path, request, route) => {
    if (path !== `/api/events/${current.id}`) return false;
    if (request.method() === 'GET') await route.fulfill({ json: current });
    else {
      const { expectedRevision, ...changes } = request.postDataJSON();
      patches.push({ expectedRevision, ...changes });
      current = { ...current, ...changes, revision: current.revision + 1 };
      await route.fulfill({ json: current });
    }
    return true;
  });

  await page.goto(`/events/${current.id}`);
  await page.getByRole('link', { name: 'Edit details' }).click();
  await expect(page.getByLabel(/^Purpose/)).toHaveValue('Hiring');
  await page.getByLabel(/^Purpose/).fill('Graduate hiring');
  await page.getByLabel(/^Expected attendance/).fill('260');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page).toHaveURL(`/events/${current.id}`);
  await page.reload();
  await expect(page.getByText('Graduate hiring')).toBeVisible();
  expect(patches).toEqual([{ expectedRevision: 4, purpose: 'Graduate hiring', expectedAttendance: 260 }]);
  expect(current).toMatchObject({ status: 'UNDER_REVIEW', coordinatorId: coordinator.id });
});

test('KAN-66-AC103 a stale save is refused and the latest details can be reloaded', async ({ page }) => {
  let reads = 0;
  const original = eventRequest('SUBMITTED', { canEditDetails: true, editMode: 'PRE_APPROVAL', editableFields: allFields });
  await stubApi(page, organiser, async (path, request, route) => {
    if (path !== `/api/events/${original.id}`) return false;
    if (request.method() === 'GET') {
      reads++;
      await route.fulfill({ json: reads === 1 ? original : { ...original, purpose: 'Changed in another tab', revision: 5 } });
    } else {
      await route.fulfill({ status: 409, json: { error: { code: 'EVENT_REVISION_CONFLICT', message: 'Changed.' } } });
    }
    return true;
  });

  await page.goto(`/events/${original.id}/details`);
  await page.getByLabel(/^Purpose/).fill('My edit');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('alert')).toContainText('saved a newer version');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reload latest details' }).click();
  await expect(page.getByLabel(/^Purpose/)).toHaveValue('Changed in another tab');
});

test('KAN-66-AC102 coordinator sees only name and description for an approved event', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  let current = eventRequest('APPROVED', {
    canEditDetails: true, editMode: 'PLANNING', editableFields: ['name', 'description'],
  });
  const patches: unknown[] = [];
  await stubApi(page, coordinator, async (path, request, route) => {
    if (path === `/api/events/${current.id}`) {
      if (request.method() === 'GET') await route.fulfill({ json: current });
      else {
        patches.push(request.postDataJSON());
        current = { ...current, name: request.postDataJSON().name, revision: 5 };
        await route.fulfill({ json: current });
      }
      return true;
    }
    return fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: current.id });
  });

  await page.goto(`/reviews/${current.id}`);
  await page.getByRole('link', { name: 'Edit name or description' }).click();
  await expect(page.getByLabel(/^Event name/)).toHaveValue('Career fair');
  await expect(page.getByLabel(/^Starts/)).toHaveCount(0);
  await expect(page.getByRole('note')).toContainText('need a reviewed change request');
  await page.getByLabel(/^Event name/).fill('Career fair 2026');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(`/reviews/${current.id}`);
  await expect(page.getByRole('region', { name: 'Safety review' })).toContainText('No safety review has been submitted yet.');
  expect(patches).toEqual([{ name: 'Career fair 2026', expectedRevision: 4 }]);
  expect(pageErrors).toEqual([]);
});
