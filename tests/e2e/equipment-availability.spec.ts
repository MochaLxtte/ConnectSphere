import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilNotificationBell } from './workspace-fixtures.js';
import type { EquipmentAvailabilityAssessment, EquipmentAvailabilityContext } from '../../frontend/src/features/equipment/api/equipment-availability.js';

const eventId = '90000000-0000-4000-8000-000000000001';
const projectorId = '90000000-0000-4000-8000-000000000002';
const speakerId = '90000000-0000-4000-8000-000000000003';
const base = '/api/equipment/availability/events';
const path = '/equipment/availability';
const context = (): EquipmentAvailabilityContext => ({
  event: { id: eventId, name: 'Technology workshop', status: 'APPROVED', startsAt: '2026-11-01T02:00:00.123456Z',
    endsAt: '2026-11-01T04:00:00.123456Z', equipmentRequirements: 'Projectors and speakers for the workshop.' },
  requirementsVersion: 'a'.repeat(64), equipmentTypes: [
    { id: projectorId, name: 'Projector', category: 'AV', totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1, isActive: true },
    { id: speakerId, name: 'Speaker', category: 'AV', totalQuantity: 5, damagedQuantity: 0, maintenanceQuantity: 0, isActive: true },
  ],
  savedRequests: [{ id: '90000000-0000-4000-8000-000000000004', equipmentTypeId: projectorId, quantity: 3,
    status: 'REQUESTED', startsAt: '2026-11-01T02:00:00.123456Z', endsAt: '2026-11-01T04:00:00.123456Z', notes: null }],
});
const result = (): EquipmentAvailabilityAssessment => ({
  eventId, eventName: 'Technology workshop', mode: 'saved', advisory: true, outcome: 'FULFILLABLE',
  startsAt: '2026-11-01T02:00:00.123456Z', endsAt: '2026-11-01T04:00:00.123456Z', checkedAt: '2026-10-26T02:00:00Z',
  items: [{ equipmentTypeId: projectorId, equipmentTypeName: 'Projector', requestedQuantity: 3, totalQuantity: 10,
    damagedQuantity: 2, maintenanceQuantity: 1, operationalQuantity: 7, peakReservedQuantity: 4,
    availableQuantity: 3, shortfallQuantity: 0, isActive: true }],
});

async function fixtures(page: Page, options: { role?: string | null; saved?: boolean; conflict?: boolean } = {}) {
  const role = options.role === undefined ? 'TECHNICAL_SUPPORT_STAFF' : options.role;
  const data = context(); if (options.saved === false) data.savedRequests = [];
  const submissions: unknown[] = [], unexpected: string[] = [];
  let assessment = result(), reads = 0;
  // These cases exercise the real UI and routing with explicit API substitutes.
  // Database integration tests separately establish quantity arithmetic and absence of writes.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request(), endpoint = new URL(request.url()).pathname, method = request.method();
    if (endpoint === '/api/auth/me' && method === 'GET') {
      await route.fulfill({ status: role ? 200 : 401, json: role ? { user: {
        id: '90000000-0000-4000-8000-000000000005', displayName: 'Test technical support', role, email: 'tech@example.test',
      } } : { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } } });
    } else if (role === 'TECHNICAL_SUPPORT_STAFF' && endpoint === base && method === 'GET') {
      await route.fulfill({ json: { items: [data.event] } });
    } else if (role === 'TECHNICAL_SUPPORT_STAFF' && endpoint === `${base}/${eventId}`) {
      if (method === 'GET') { reads++; await route.fulfill({ json: data }); }
      else if (method === 'POST') {
        submissions.push(request.postDataJSON());
        if (options.conflict && submissions.length === 1) {
          data.requirementsVersion = 'b'.repeat(64); data.event.equipmentRequirements = 'Updated workshop equipment requirements';
          await route.fulfill({ status: 409, json: { error: { code: 'EQUIPMENT_CONTEXT_CHANGED', message: 'Requirements changed.' } } });
        } else await route.fulfill({ json: { assessment } });
      } else { unexpected.push(`${method} ${endpoint}`); await route.fulfill({ status: 501, json: {} }); }
    } else if (!(await fulfilNotificationBell(route, request))) {
      unexpected.push(`${method} ${endpoint}`); await route.fulfill({ status: 501, json: {} });
    }
  });
  return { submissions, unexpected, data, setResult(value: EquipmentAvailabilityAssessment) { assessment = value; },
    get reads() { return reads; } };
}

test('KAN-9 technical support follows event list to saved quantities and a fresh shortage result', async ({ page }, testInfo) => {
  const fixture = await fixtures(page);
  await page.goto(path);
  await expect(page.getByRole('link', { name: 'Equipment availability', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review queue', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Technology workshop', exact: true }).click();
  await expect(page.getByText(/Quantity 3 · REQUESTED/)).toBeVisible();
  await page.getByRole('button', { name: 'Check availability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fulfillable', exact: true })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Projector 3 10 2 1 7 4 3 0 Available', exact: true })).toBeVisible();
  expect(fixture.submissions).toEqual([{ mode: 'saved', requirementsVersion: 'a'.repeat(64) }]);
  const shortage = result(); shortage.outcome = 'SHORTFALL'; shortage.items[0]!.availableQuantity = 2;
  shortage.items[0]!.shortfallQuantity = 1; shortage.items[0]!.peakReservedQuantity = 5;
  fixture.setResult(shortage);
  await page.getByRole('button', { name: 'Recheck availability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shortfall / Unfulfillable' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Projector 3 10 2 1 7 5 2 1 Shortfall' })).toHaveClass(/shortfall-row/);
  await expect(page.getByText(/Advisory only/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('equipment-shortfall-desktop.png'), fullPage: true });
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-9 unsaved checks retain microseconds, validate fields and clear results when edited', async ({ page }, testInfo) => {
  const fixture = await fixtures(page, { saved: false }); fixture.setResult({ ...result(), mode: 'what-if' });
  await page.goto(`${path}/${eventId}`);
  await expect(page.getByRole('radio', { name: 'Saved equipment requests', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Check starts (Singapore time)', { exact: true })).toHaveValue('2026-11-01T10:00:00.123456');
  await page.getByRole('combobox', { name: 'Equipment type 1', exact: true }).selectOption(projectorId);
  await page.getByRole('textbox', { name: 'Quantity 1', exact: true }).fill('1.5');
  await page.getByLabel('Check starts (Singapore time)', { exact: true }).fill('2026-02-30T10:00');
  await page.getByRole('button', { name: 'Check availability', exact: true }).click();
  await expect(page.getByText(/Enter a valid start date/)).toBeVisible();
  await expect(page.getByText(/Enter a whole quantity/)).toBeVisible(); expect(fixture.submissions).toEqual([]);
  await page.getByRole('textbox', { name: 'Quantity 1', exact: true }).fill('3');
  await page.getByLabel('Check starts (Singapore time)', { exact: true }).fill('2026-11-01T10:00:00.123456');
  await page.getByRole('button', { name: 'Check availability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fulfillable', exact: true })).toBeVisible();
  expect(fixture.submissions).toEqual([{ mode: 'what-if', requirementsVersion: 'a'.repeat(64),
    startsAt: '2026-11-01T10:00:00.123456+08:00', endsAt: '2026-11-01T12:00:00.123456+08:00',
    items: [{ equipmentTypeId: projectorId, quantity: 3 }] }]);
  await page.getByRole('textbox', { name: 'Quantity 1', exact: true }).fill('4');
  await expect(page.getByRole('region', { name: 'Equipment assessment' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('equipment-what-if-mobile.png'), fullPage: true });
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-9 changed saved requirements reload before another assessment', async ({ page }) => {
  const fixture = await fixtures(page, { conflict: true });
  await page.goto(`${path}/${eventId}`);
  await page.getByRole('button', { name: 'Check availability', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('The event or saved equipment requests changed');
  await expect(page.getByText('Updated workshop equipment requirements', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Equipment assessment' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Check availability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fulfillable', exact: true })).toBeVisible();
  expect(fixture.submissions[1]).toEqual({ mode: 'saved', requirementsVersion: 'b'.repeat(64) });
  expect(fixture.reads).toBe(2); expect(fixture.unexpected).toEqual([]);
});

for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE', null]) {
  test(`KAN-9 direct equipment URL is protected for ${role ?? 'signed-out visitor'}`, async ({ page }) => {
    const fixture = await fixtures(page, { role });
    await page.goto(`${path}/${eventId}`);
    await expect(page.getByRole('heading', { name: role ? 'Technical support access only' : 'Sign in required', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Equipment availability', exact: true })).toHaveCount(0);
    expect(fixture.reads).toBe(0); expect(fixture.submissions).toEqual([]); expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-9 running API requires login on list, context and assessment', async ({ request }) => {
  for (const response of [await request.get(base), await request.get(`${base}/${eventId}`),
    await request.post(`${base}/${eventId}`, { data: { mode: 'saved', requirementsVersion: 'a'.repeat(64) } })]) {
    expect(response.status()).toBe(401); expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});
