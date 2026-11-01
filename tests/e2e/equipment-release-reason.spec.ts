import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';
import type { EquipmentLine, EquipmentPlan } from '../../frontend/src/features/events/api/arrangements.js';

const eventId = '63000000-0000-4000-8000-000000000101';
const typeId = '63000000-0000-4000-8000-000000000102';
const lineId = '63000000-0000-4000-8000-000000000103';
const coordinatorId = '63000000-0000-4000-8000-000000000104';
const organiserId = '63000000-0000-4000-8000-000000000105';

// Browser/UI integration only: authentication and every API response are substituted.
// This verifies rendered reason labels, cancellation payload/reload and responsive layout;
// it does not establish actual persistence, permissions or lifecycle release acceptance.
async function fixtures(page: Page) {
  const event = {
    id: eventId, organiserId, coordinatorId, status: 'APPROVED', name: 'Equipment release history', revision: 1,
    purpose: 'Teaching', description: 'A workshop.', startsAt: '2031-01-01T01:00:00.123Z', endsAt: '2031-01-01T03:00:00.123Z',
    expectedAttendance: 10, venueRequirements: 'Hall', accessibilityNeeds: null, equipmentRequirements: 'Projector',
    registrationRequired: false, createdAt: '2026-10-28T00:00:00Z', updatedAt: '2026-10-28T00:00:00Z', review: null,
    actions: { canEditDraft: false, canMakeInitialDecision: false },
  };
  const item: EquipmentLine = {
    id: lineId, eventRequestId: eventId, eventName: event.name, eventStatus: event.status,
    equipmentTypeId: typeId, equipmentType: 'Projector', quantity: 2, startsAt: event.startsAt, endsAt: event.endsAt,
    technicalRequirements: 'HDMI', status: 'REJECTED', revision: 'a'.repeat(64), decisionReason: 'No compatible stock',
    releaseReason: null,
  };
  const plan: EquipmentPlan = {
    eventRequestId: eventId, eventStatus: event.status, status: 'REQUIRED', items: [item],
    revision: item.revision, eventStartsAt: event.startsAt, eventEndsAt: event.endsAt,
  };
  const writes: { path: string; body: unknown }[] = [];
  const unexpected: string[] = [];
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    if (path === '/api/auth/me') {
      await route.fulfill({ json: { user: { id: coordinatorId, role: 'EVENT_COORDINATOR',
        displayName: 'Test Coordinator', email: 'coordinator@example.test' } } });
    } else if (method === 'GET' && path === '/api/events/' + eventId) {
      await route.fulfill({ json: event });
    } else if (method === 'GET' && path === '/api/events/' + eventId + '/equipment-requests') {
      await route.fulfill({ json: { plan } });
    } else if (method === 'GET' && path === '/api/equipment-types') {
      await route.fulfill({ json: { items: [{ id: typeId, name: 'Projector', category: 'AV' }] } });
    } else if (method === 'POST' && path === '/api/equipment-requests/' + lineId + '/cancel') {
      const body = request.postDataJSON() as { reason: string; revision: string };
      writes.push({ path, body });
      item.status = 'CANCELLED'; item.releaseReason = body.reason;
      item.revision = plan.revision = 'b'.repeat(64);
      await route.fulfill({ json: { request: item } });
    } else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: eventId }))) {
      unexpected.push(method + ' ' + path);
      await route.fulfill({ status: 501, json: {} });
    }
  });
  return { writes, unexpected };
}

for (const width of [1280, 390]) {
  test(`KAN-63 API-substituted UI separates cancellation and review reasons at ${width}px`, async ({ page }) => {
    const fixture = await fixtures(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/reviews/' + eventId);
    const panel = page.getByRole('region', { name: 'Equipment arrangements', exact: true });
    await expect(panel.getByText('— REJECTED: No compatible stock', { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Cancel line', exact: true }).click();
    await panel.getByLabel('Cancellation reason', { exact: true }).fill('No longer needed');
    await panel.getByRole('button', { name: 'Confirm line cancellation', exact: true }).click();
    await expect(panel.getByText('Release reason: No longer needed', { exact: true })).toBeVisible();
    await expect(panel.getByText('Previous review reason: No compatible stock', { exact: true })).toBeVisible();
    await expect(panel.getByText('— CANCELLED', { exact: true })).toBeVisible();
    await expect(panel.getByText('— CANCELLED: No compatible stock', { exact: true })).toHaveCount(0);
    await panel.getByRole('button', { name: 'Reload equipment', exact: true }).click();
    await expect(panel.getByText('Release reason: No longer needed', { exact: true })).toBeVisible();
    await expect(panel.getByText('Previous review reason: No compatible stock', { exact: true })).toBeVisible();
    expect(fixture.writes).toEqual([{ path: '/api/equipment-requests/' + lineId + '/cancel',
      body: { reason: 'No longer needed', revision: 'a'.repeat(64) } }]);
    expect(fixture.unexpected).toEqual([]);
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await panel.screenshot({
      path: `docs/scrum/sprint-04/evidence/release-regressions-20261101/equipment-reasons-${width}.png`,
    });
  });
}
