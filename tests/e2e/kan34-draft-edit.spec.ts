import { expect, test } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

test('KAN-34 registration toggles and cleared values survive save and reopening', async ({ page }) => {
  const user = { id: '10000000-0000-4000-8000-000000000031', email: 'organiser@example.test', displayName: 'Test organiser', role: 'EVENT_ORGANISER' };
  let draft = {
    id: '10000000-0000-4000-8000-000000000034', organiserId: user.id, coordinatorId: null,
    status: 'DRAFT', name: 'Saved draft', purpose: 'Workshop', description: 'Clear me',
    startsAt: null, endsAt: null, expectedAttendance: null, venueRequirements: null,
    accessibilityNeeds: null, equipmentRequirements: null, registrationRequired: false,
    registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null,
    createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z',
    review: null, actions: { canEditDraft: true, canMakeInitialDecision: false },
  };
  let saves = 0;
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    if (path === '/api/auth/me') await route.fulfill({ json: { user } });
    else if (path === `/api/events/${draft.id}` && req.method() === 'GET') await route.fulfill({ json: draft });
    else if (path === `/api/events/${draft.id}` && req.method() === 'PATCH') {
      saves++; draft = { ...draft, ...req.postDataJSON() };
      await route.fulfill({ json: draft });
    } else if (!(await fulfilWorkspaceRead(route, req))) await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'Unexpected request' } } });
  });
  await page.goto(`/events/${draft.id}/edit`);
  await expect(page.getByLabel(/^Event name/)).toHaveValue('Saved draft');
  await page.getByRole('radio', { name: 'Registration required', exact: true }).check();
  await page.getByLabel(/^Registration capacity/).fill('25');
  await page.getByLabel(/^Registration opens/).fill('2026-12-01T09:00');
  await page.getByLabel(/^Registration closes/).fill('2026-12-02T09:00');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved.');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Registration required', exact: true })).toBeChecked();
  await expect(page.getByLabel(/^Registration capacity/)).toHaveValue('25');
  await page.getByRole('radio', { name: 'No registration', exact: true }).check();
  await page.getByLabel(/^Description/).fill('');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved.');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'No registration', exact: true })).toBeChecked();
  await expect(page.getByLabel(/^Registration capacity/)).toHaveCount(0);
  await expect(page.getByLabel(/^Description/)).toHaveValue('');
  expect(draft).toMatchObject({ status: 'DRAFT', purpose: 'Workshop', registrationRequired: false,
    registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null, description: null });
  expect(saves).toBe(2);
});
