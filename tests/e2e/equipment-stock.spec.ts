import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilNotificationBell } from './workspace-fixtures.js';
import type { EquipmentStockDetail, EquipmentStockItem } from '../../frontend/src/features/equipment/api/equipment-stock.js';

const projectorId = '18000000-0000-4000-8000-000000000001';
const speakerId = '18000000-0000-4000-8000-000000000002';
const eventId = '18000000-0000-4000-8000-000000000003';
const stock = '/api/equipment/stock';

function item(over: Partial<EquipmentStockItem> = {}): EquipmentStockItem {
  const base: EquipmentStockItem = {
    id: projectorId, name: 'Projector', category: 'AV', isActive: true, totalQuantity: 10, damagedQuantity: 0, maintenanceQuantity: 0,
    operationalQuantity: 10, unavailableQuantity: 0, status: 'AVAILABLE', revision: 0, shortfallEventCount: 0,
    updatedAt: '2026-10-26T02:00:00.000Z', ...over,
  };
  const operational = base.isActive ? base.totalQuantity - base.damagedQuantity - base.maintenanceQuantity : 0;
  return { ...base, operationalQuantity: operational, unavailableQuantity: base.damagedQuantity + base.maintenanceQuantity,
    status: operational <= 0 ? 'UNAVAILABLE' : base.damagedQuantity + base.maintenanceQuantity > 0 ? 'PARTLY_UNAVAILABLE' : 'AVAILABLE' };
}

/** A small stateful stand-in for the API: it enforces the revision and the quantity rules the server does. */
async function fixtures(page: Page, options: { role?: string | null; reservedByEvent?: number } = {}) {
  const role = options.role === undefined ? 'TECHNICAL_SUPPORT_STAFF' : options.role;
  const reserved = options.reservedByEvent ?? 0;
  const types = new Map<string, EquipmentStockItem>([[projectorId, item()], [speakerId, item({ id: speakerId, name: 'Speaker', totalQuantity: 4 })]]);
  const history: Record<string, EquipmentStockDetail['history']> = { [projectorId]: [], [speakerId]: [] };
  const patches: unknown[] = []; const unexpected: string[] = []; let reads = 0; let staleNext = false;
  const gaps = (current: EquipmentStockItem) => reserved > current.operationalQuantity ? [{
    eventId, eventName: 'Career fair', startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T06:00:00.000Z', reservedQuantity: reserved,
    peakReservedQuantity: reserved, operationalQuantity: current.operationalQuantity, shortfallQuantity: reserved - current.operationalQuantity }] : [];
  const withGaps = (current: EquipmentStockItem) => ({ ...current, shortfallEventCount: gaps(current).length });
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), endpoint = new URL(request.url()).pathname, method = request.method();
    const match = endpoint.match(/^\/api\/equipment\/stock\/([0-9a-f-]{36})$/);
    if (endpoint === '/api/auth/me' && method === 'GET') {
      await route.fulfill({ status: role ? 200 : 401, json: role ? { user: { id: '18000000-0000-4000-8000-000000000009',
        displayName: 'Test technical support', role, email: 'tech@example.test' } } : { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } } });
    } else if (role === 'TECHNICAL_SUPPORT_STAFF' && endpoint === stock && method === 'GET') {
      reads++; await route.fulfill({ json: { items: [...types.values()].map(withGaps) } });
    } else if (role === 'TECHNICAL_SUPPORT_STAFF' && match && method === 'GET') {
      const current = types.get(match[1]!)!; await route.fulfill({ json: { item: withGaps(current), history: history[current.id], shortfalls: gaps(current) } });
    } else if (role === 'TECHNICAL_SUPPORT_STAFF' && match && method === 'PATCH') {
      const body = request.postDataJSON() as { expectedRevision: number; totalQuantity?: number; damagedQuantity?: number; maintenanceQuantity?: number; reason: string };
      patches.push(body);
      const current = types.get(match[1]!)!;
      if (staleNext || body.expectedRevision !== current.revision) {
        if (staleNext) { staleNext = false; types.set(current.id, item({ ...current, damagedQuantity: 6, revision: current.revision + 1 })); }
        await route.fulfill({ status: 409, json: { error: { code: 'EQUIPMENT_STOCK_REVISION_CONFLICT', message: 'This stock was changed after you opened it. Reload to see the current quantities, then make your change again.' } } });
        return;
      }
      const next = item({ ...current, totalQuantity: body.totalQuantity ?? current.totalQuantity, damagedQuantity: body.damagedQuantity ?? current.damagedQuantity,
        maintenanceQuantity: body.maintenanceQuantity ?? current.maintenanceQuantity, revision: current.revision + 1 });
      const lost = next.operationalQuantity < current.operationalQuantity && gaps(next).length > 0;
      history[current.id] = [{ id: `c${next.revision}`, revision: next.revision, changedById: 'tech', changedByName: 'Test technical support',
        changedAt: '2026-10-26T03:00:00.000Z', reason: body.reason,
        previous: { totalQuantity: current.totalQuantity, damagedQuantity: current.damagedQuantity, maintenanceQuantity: current.maintenanceQuantity },
        next: { totalQuantity: next.totalQuantity, damagedQuantity: next.damagedQuantity, maintenanceQuantity: next.maintenanceQuantity } }, ...history[current.id]!];
      types.set(current.id, next);
      await route.fulfill({ json: { item: withGaps(next), history: history[current.id], shortfalls: gaps(next), changed: true, notifiedEvents: lost ? 1 : 0 } });
    } else if (!(await fulfilNotificationBell(route, request))) {
      unexpected.push(`${method} ${endpoint}`); await route.fulfill({ status: 501, json: {} });
    }
  });
  return { patches, unexpected, get reads() { return reads; }, makeNextSaveStale() { staleNext = true; } };
}

const openEditor = async (page: Page, name = 'Projector') => {
  await page.getByRole('button', { name: `Update stock for ${name}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: `Update ${name}`, exact: true })).toBeVisible();
};

test('KAN-18 technical support marks equipment unavailable, sees the shortfall it causes and then restores it', async ({ page }, testInfo) => {
  const fixture = await fixtures(page, { reservedByEvent: 7 });
  await page.goto('/equipment/stock');
  await expect(page.getByRole('link', { name: 'Equipment stock', exact: true })).toBeVisible();
  const projector = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Projector', exact: true }) }).first();
  await expect(projector).toContainText('Available');
  await expect(projector).toContainText(/Usable\s*10/);
  await openEditor(page);
  await page.getByLabel('Damaged', { exact: true }).fill('5');
  await page.getByLabel('Under maintenance', { exact: true }).fill('1');
  await expect(page.getByText(/Usable after this change/)).toContainText('4');
  await expect(page.getByRole('button', { name: 'Save stock change', exact: true })).toBeDisabled();
  await page.getByLabel('Reason for the change', { exact: true }).fill('Fault found in the batch.');
  await page.getByRole('button', { name: 'Save stock change', exact: true }).click();
  await expect(page.getByText(/Stock saved\. Shortfall notices were sent for 1 affected event\./)).toBeVisible();
  const gaps = page.getByRole('list', { name: 'Reservations not fully covered' });
  await expect(gaps).toContainText('Career fair');
  await expect(gaps).toContainText('3 short');
  await expect(page.getByRole('list', { name: 'Recent stock changes' })).toContainText('Damaged 0 → 5, Maintenance 0 → 1');
  await expect(projector).toContainText('Partly unavailable');
  await expect(projector).toContainText('1 event has more reserved than is usable.');
  expect(fixture.patches).toEqual([{ expectedRevision: 0, totalQuantity: 10, damagedQuantity: 5, maintenanceQuantity: 1, reason: 'Fault found in the batch.' }]);
  await page.screenshot({ path: testInfo.outputPath('equipment-stock-shortfall-desktop.png'), fullPage: true });

  // AC6: restore, based on the revision just saved
  await page.getByLabel('Damaged', { exact: true }).fill('0');
  await page.getByLabel('Under maintenance', { exact: true }).fill('0');
  await page.getByLabel('Reason for the change', { exact: true }).fill('Repaired and tested.');
  await page.getByRole('button', { name: 'Save stock change', exact: true }).click();
  await expect(page.getByText('Every reservation of this equipment is covered by the usable stock.')).toBeVisible();
  await expect(projector).toContainText('Available');
  await expect(projector).toContainText(/Usable\s*10/);
  expect(fixture.patches[1]).toMatchObject({ expectedRevision: 1, damagedQuantity: 0, maintenanceQuantity: 0 });
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-18 a stale form is refused and the current quantities are reloaded before saving again', async ({ page }) => {
  const fixture = await fixtures(page);
  await page.goto('/equipment/stock');
  await openEditor(page);
  fixture.makeNextSaveStale();
  await page.getByLabel('Damaged', { exact: true }).fill('2');
  await page.getByLabel('Reason for the change', { exact: true }).fill('From an old form.');
  await page.getByRole('button', { name: 'Save stock change', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('This stock was changed after you opened it.');
  await page.getByRole('button', { name: 'Reload stock', exact: true }).click();
  await expect(page.getByLabel('Damaged', { exact: true })).toHaveValue('6');
  await expect(page.getByText(/Based on revision 1/)).toBeVisible();
  await page.getByLabel('Damaged', { exact: true }).fill('2');
  await page.getByLabel('Reason for the change', { exact: true }).fill('Two repaired.');
  await page.getByRole('button', { name: 'Save stock change', exact: true }).click();
  await expect(page.getByText('Stock saved.')).toBeVisible();
  expect(fixture.patches.map(body => (body as { expectedRevision: number }).expectedRevision)).toEqual([0, 1]);
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-18 invalid quantities and a missing reason are explained and cannot be saved', async ({ page }) => {
  const fixture = await fixtures(page);
  await page.goto('/equipment/stock');
  await openEditor(page);
  const save = page.getByRole('button', { name: 'Save stock change', exact: true });
  await page.getByLabel('Damaged', { exact: true }).fill('-1');
  await expect(page.getByText('Enter a whole number from 0 to 1,000,000.')).toBeVisible();
  await page.getByLabel('Damaged', { exact: true }).fill('8');
  await page.getByLabel('Under maintenance', { exact: true }).fill('5');
  await expect(page.getByText('Damaged plus maintenance cannot be more than the total quantity.')).toBeVisible();
  await page.getByLabel('Reason for the change', { exact: true }).fill('Some reason');
  await expect(save).toBeDisabled();
  await page.getByLabel('Under maintenance', { exact: true }).fill('1');
  await page.getByLabel('Reason for the change', { exact: true }).fill('   ');
  await expect(save).toBeDisabled();
  expect(fixture.patches).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

for (const role of ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE', null]) {
  test(`KAN-18 the stock URL is protected for ${role ?? 'a signed-out visitor'}`, async ({ page }) => {
    const fixture = await fixtures(page, { role });
    await page.goto('/equipment/stock');
    await expect(page.getByRole('heading', { name: role ? 'Technical support access only' : 'Sign in required', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Equipment stock', exact: true })).toHaveCount(0);
    expect(fixture.reads).toBe(0); expect(fixture.patches).toEqual([]); expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-18 the stock list and editor fit a narrow screen without sideways scrolling', async ({ page }, testInfo) => {
  await fixtures(page, { reservedByEvent: 7 });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/equipment/stock');
  await openEditor(page);
  await page.getByLabel('Damaged', { exact: true }).fill('5');
  await page.getByLabel('Reason for the change', { exact: true }).fill('Fault found.');
  await page.getByRole('button', { name: 'Save stock change', exact: true }).click();
  await expect(page.getByText(/Stock saved\./)).toBeVisible();
  const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, window: window.innerWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.window);
  await page.screenshot({ path: testInfo.outputPath('equipment-stock-mobile.png'), fullPage: true });
});

test('KAN-18 the running API requires login for the stock list, detail and update', async ({ request }) => {
  for (const response of [await request.get(stock), await request.get(`${stock}/${projectorId}`),
    await request.patch(`${stock}/${projectorId}`, { data: { expectedRevision: 0, damagedQuantity: 1, reason: 'x' } })]) {
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});
