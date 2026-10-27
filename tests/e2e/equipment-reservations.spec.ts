import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilNotificationBell } from './workspace-fixtures.js';
import type { EquipmentAvailabilityContext } from '../../frontend/src/features/equipment/api/equipment-availability.js';
import type { EquipmentReservationContext } from '../../frontend/src/features/equipment/api/equipment-reservations.js';

const eventId = '92000000-0000-4000-8000-000000000001', projectorId = '92000000-0000-4000-8000-000000000002';
const projectorRequest = '92000000-0000-4000-8000-000000000003', speakerRequest = '92000000-0000-4000-8000-000000000004';
const base = `/api/equipment/reservations/events/${eventId}`, availabilityUrl = `/api/equipment/availability/events/${eventId}`;
const path = `/equipment/availability/${eventId}`;
const context = (): EquipmentAvailabilityContext => ({
  event: { id: eventId, name: 'Equipment workshop', status: 'APPROVED', startsAt: '2026-11-01T02:00:00.123456Z',
    endsAt: '2026-11-01T04:00:00.123456Z', equipmentRequirements: 'Projectors and speakers.' }, requirementsVersion: 'a'.repeat(64),
  equipmentTypes: [{ id: projectorId, name: 'Projector', category: 'AV', totalQuantity: 5, damagedQuantity: 0, maintenanceQuantity: 0, isActive: true },
    { id: 'speaker-type', name: 'Speaker', category: 'AV', totalQuantity: 5, damagedQuantity: 0, maintenanceQuantity: 0, isActive: true }],
  savedRequests: [{ id: projectorRequest, equipmentTypeId: projectorId, quantity: 3, status: 'REQUESTED',
    startsAt: '2026-11-01T02:00:00.123456Z', endsAt: '2026-11-01T04:00:00.123456Z', notes: null },
  { id: speakerRequest, equipmentTypeId: 'speaker-type', quantity: 1, status: 'REQUESTED',
    startsAt: '2026-11-01T02:00:00.123456Z', endsAt: '2026-11-01T04:00:00.123456Z', notes: null }],
});
async function fixtures(page: Page, options: { role?: string | null; conflict?: boolean; confirmed?: boolean; empty?: boolean } = {}) {
  const role = options.role === undefined ? 'TECHNICAL_SUPPORT_STAFF' : options.role;
  const data = context(); if (options.confirmed) data.event.status = 'CONFIRMED'; if (options.empty) data.savedRequests = [];
  const saved: EquipmentReservationContext = { event: data.event, requirementsVersion: data.requirementsVersion,
    requests: data.savedRequests.map(item => ({ ...item, equipmentName: item.id === projectorRequest ? 'Projector' : 'Speaker',
      decidedBy: null, decidedAt: null, decisionReason: null, releasedBy: null, releasedAt: null, releaseReason: null, releaseCause: null,
      canReserve: !options.confirmed, canCancel: false })),
    readiness: { status: options.empty ? 'NO_REQUIREMENTS' : 'PENDING', activeCount: data.savedRequests.length, reservedCount: 0,
      message: options.empty ? 'No active saved requirements.' : 'Reserve every active saved requirement.' } };
  const writes: { endpoint: string; input: unknown }[] = [], checks: unknown[] = [], unexpected: string[] = [];
  let reads = 0;
  // These browser cases substitute API responses. Real transaction, stock-race and notification
  // guarantees are checked separately by the PostgreSQL integration suite.
  await page.route((url) => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), endpoint = new URL(request.url()).pathname, method = request.method();
    if (endpoint === '/api/auth/me' && method === 'GET') {
      await route.fulfill({ status: role ? 200 : 401, json: role ? { user: {
        id: '92000000-0000-4000-8000-000000000005', role, displayName: 'Test technical support', email: 'tech@example.test',
      } } : { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } } });
    } else if (role === 'TECHNICAL_SUPPORT_STAFF' && endpoint === availabilityUrl) {
      if (method === 'GET') await route.fulfill({ json: data });
      else {
        checks.push(request.postDataJSON()); await route.fulfill({ json: { assessment: {
          eventId, eventName: data.event.name, mode: 'saved', advisory: true, checkedAt: '2026-10-26T03:00:00Z',
          startsAt: data.event.startsAt, endsAt: data.event.endsAt, outcome: 'FULFILLABLE', items: [{
            equipmentTypeId: projectorId, equipmentTypeName: 'Projector', requestedQuantity: 3, totalQuantity: 5,
            damagedQuantity: 0, maintenanceQuantity: 0, operationalQuantity: 5, peakReservedQuantity: 0,
            availableQuantity: 5, shortfallQuantity: 0, isActive: true,
          }],
        } } });
      }
    } else if (role === 'TECHNICAL_SUPPORT_STAFF' && endpoint === base && method === 'GET') {
      reads++; await route.fulfill({ json: saved });
    } else if (role === 'TECHNICAL_SUPPORT_STAFF' && endpoint.startsWith(`${base}/requests/`) && method === 'POST') {
      writes.push({ endpoint, input: request.postDataJSON() });
      if (options.conflict) {
        saved.readiness.status = 'SHORTFALL'; saved.readiness.message = 'Another reservation now uses this stock.';
        await route.fulfill({ status: 409, json: { error: { code: 'EQUIPMENT_STOCK_CONFLICT', message: 'Operational stock is no longer available.' } } });
      } else {
        const id = endpoint.split('/').at(-2), cancel = endpoint.endsWith('/cancel'), row = saved.requests.find(item => item.id === id)!;
        row.status = cancel ? 'CANCELLED' : 'RESERVED'; row.canReserve = false; row.canCancel = !cancel;
        row.decidedBy = 'tech-a'; row.decidedAt = '2026-10-26T03:00:00Z';
        if (cancel) { row.releasedBy = 'tech-a'; row.releasedAt = '2026-10-26T04:00:00Z'; row.releaseCause = 'MANUAL_CANCELLATION';
          row.releaseReason = (request.postDataJSON() as { reason: string }).reason; }
        saved.requirementsVersion = String.fromCharCode(97 + writes.length).repeat(64);
        data.requirementsVersion = saved.requirementsVersion;
        data.savedRequests = data.savedRequests.filter(item => !cancel || item.id !== id).map(item => item.id === id ? { ...item, status: 'RESERVED' } : item);
        saved.readiness.activeCount = saved.requests.filter(item => item.status !== 'CANCELLED').length;
        saved.readiness.reservedCount = saved.requests.filter(item => item.status === 'RESERVED').length;
        saved.readiness.status = saved.readiness.activeCount === saved.readiness.reservedCount ? 'READY' : 'PENDING';
        saved.readiness.message = saved.readiness.status === 'READY' ? 'All active requests reserved within current stock.' : 'Reserve every active saved requirement.';
        await route.fulfill({ json: { changed: true, context: saved } });
      }
    } else if (!(await fulfilNotificationBell(route, request))) {
      unexpected.push(`${method} ${endpoint}`); await route.fulfill({ status: 501, json: {} });
    }
  });
  return { writes, checks, unexpected, data, saved, get reads() { return reads; } };
}

test('KAN-26 technical support reserves all saved needs, refreshes the advisory and cancels with retained history', async ({ page }, testInfo) => {
  const fixture = await fixtures(page); await page.goto(path);
  await page.getByRole('button', { name: 'Check availability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fulfillable', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load saved reservations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reservations pending', exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Reserve Projector request ${projectorRequest}`, exact: true }).click();
  await expect(page.getByRole('form', { name: 'Confirm equipment action' })).toContainText('Projector · 3 units');
  await page.getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await expect(page.getByText('1 of 2 active requests reserved.', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Equipment assessment' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Equipment ready', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: `Reserve Speaker request ${speakerRequest}`, exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Equipment ready', exact: true })).toBeVisible();
  await expect(page.getByText(/coordinator has been notified/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('equipment-reservations-ready-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Check availability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fulfillable', exact: true })).toBeVisible();
  expect(fixture.checks.at(-1)).toEqual({ mode: 'saved', requirementsVersion: 'c'.repeat(64) });
  await page.getByRole('button', { name: `Cancel Projector reservation ${projectorRequest}`, exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('equipment-cancellation-confirmation-mobile.png'), fullPage: true });
  await page.getByRole('form', { name: 'Confirm equipment action' }).screenshot({ path: testInfo.outputPath('equipment-cancellation-confirmation-mobile-detail.png') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await expect(page.getByLabel('Cancellation reason', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Cancellation reason', { exact: true }).fill('Workshop no longer needs projectors');
  await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await expect(page.getByText('Release reason: Workshop no longer needs projectors', { exact: true })).toBeVisible();
  await expect(page.getByText('Status: CANCELLED', { exact: true })).toBeVisible();
  expect(fixture.writes).toEqual([
    { endpoint: `${base}/requests/${projectorRequest}/reserve`, input: { requirementsVersion: 'a'.repeat(64) } },
    { endpoint: `${base}/requests/${speakerRequest}/reserve`, input: { requirementsVersion: 'b'.repeat(64) } },
    { endpoint: `${base}/requests/${projectorRequest}/cancel`, input: { requirementsVersion: 'c'.repeat(64), reason: 'Workshop no longer needs projectors' } },
  ]);
  await page.screenshot({ path: testInfo.outputPath('equipment-reservation-history.png'), fullPage: true });
  await page.reload(); await page.getByRole('button', { name: 'Load saved reservations', exact: true }).click();
  await expect(page.getByText('Release cause: Manual cancellation', { exact: true })).toBeVisible();
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-26 stock conflict refreshes readiness and does not report success', async ({ page }) => {
  const fixture = await fixtures(page, { conflict: true }); await page.goto(path);
  await page.getByRole('button', { name: 'Load saved reservations' }).click();
  await page.getByRole('button', { name: `Reserve Projector request ${projectorRequest}` }).click();
  await page.getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await expect(page.getByText(/Operational stock is no longer available.*Review the refreshed/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Equipment shortfall', exact: true })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Confirm equipment action' })).toHaveCount(0);
  await expect(page.getByText(/reservation saved/)).toHaveCount(0);
  expect(fixture.reads).toBe(2); expect(fixture.writes).toHaveLength(1); expect(fixture.unexpected).toEqual([]);
});

test('KAN-26 unsaved what-if inputs cannot become reservations and an empty context is never ready', async ({ page }, testInfo) => {
  const fixture = await fixtures(page, { empty: true }); await page.goto(path);
  await page.getByRole('combobox', { name: 'Equipment type 1', exact: true }).selectOption(projectorId);
  await page.getByRole('textbox', { name: 'Quantity 1', exact: true }).fill('3');
  await page.getByRole('button', { name: 'Load saved reservations', exact: true }).click();
  await expect(page.getByText(/Ask the assigned coordinator to save equipment requests/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Equipment ready', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Reserve / })).toHaveCount(0); expect(fixture.writes).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('equipment-reservation-empty-mobile.png'), fullPage: true });
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-26 confirmed equipment reservations are read-only', async ({ page }) => {
  const fixture = await fixtures(page, { confirmed: true }); await page.goto(path);
  await page.getByRole('button', { name: 'Load saved reservations' }).click();
  await expect(page.getByText('This event is confirmed. Reservations are read-only.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Reserve |^Cancel / })).toHaveCount(0); expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE', null]) {
  test(`KAN-26 reservation interface excludes ${role ?? 'signed-out visitor'}`, async ({ page }) => {
    const fixture = await fixtures(page, { role }); await page.goto(path);
    await expect(page.getByRole('heading', { name: role ? 'Technical support access only' : 'Sign in required', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load saved reservations' })).toHaveCount(0);
    expect(fixture.reads).toBe(0); expect(fixture.writes).toEqual([]); expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-26 running API requires a session for context and both mutations', async ({ request }) => {
  for (const response of [await request.get(base),
    await request.post(`${base}/requests/${projectorRequest}/reserve`, { data: { requirementsVersion: 'a'.repeat(64) } }),
    await request.post(`${base}/requests/${projectorRequest}/cancel`, { data: { requirementsVersion: 'a'.repeat(64), reason: 'Test cancellation' } })]) {
    expect(response.status()).toBe(401); expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});
