import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';
import type { EquipmentLine, EquipmentPlan } from '../../frontend/src/features/events/api/arrangements.js';

const eventId = '63000000-0000-4000-8000-000000000001';
const typeId = '63000000-0000-4000-8000-000000000002';
const lineId = '63000000-0000-4000-8000-000000000003';
const coordinatorId = '63000000-0000-4000-8000-000000000004';
const organiserId = '63000000-0000-4000-8000-000000000005';
type Role = 'EVENT_COORDINATOR' | 'EVENT_ORGANISER' | 'TECHNICAL_SUPPORT_STAFF' | 'ATTENDEE';

async function fixtures(page: Page, options: { role?: Role; staleReview?: boolean; cancelledResponseLost?: boolean; savedLine?: boolean } = {}) {
  let role: Role = options.role ?? 'EVENT_COORDINATOR';
  const event = {
    id: eventId, organiserId, coordinatorId, status: 'APPROVED', name: 'Equipment request workshop', revision: 1,
    purpose: 'Teaching', description: 'A workshop.', startsAt: '2031-01-01T01:00:00.123Z', endsAt: '2031-01-01T03:00:00.123Z',
    expectedAttendance: 10, venueRequirements: 'Hall', accessibilityNeeds: null, equipmentRequirements: 'Projector',
    registrationRequired: false, createdAt: '2026-10-28T00:00:00Z', updatedAt: '2026-10-28T00:00:00Z', review: null,
    actions: { canEditDraft: false, canMakeInitialDecision: false },
  };
  const item = (): EquipmentLine => ({
    id: lineId, eventRequestId: eventId, eventName: event.name, eventStatus: event.status,
    equipmentTypeId: typeId, equipmentType: 'Projector', quantity: 2, startsAt: event.startsAt, endsAt: event.endsAt,
    technicalRequirements: 'HDMI', status: 'REQUESTED', revision: 'a'.repeat(64), decisionReason: null,
  });
  const plan: EquipmentPlan = {
    eventRequestId: eventId, eventStatus: 'APPROVED', status: 'REQUIRED', items: options.savedLine ? [item()] : [],
    revision: 'a'.repeat(64), eventStartsAt: event.startsAt, eventEndsAt: event.endsAt,
  };
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const unexpected: string[] = [];
  let reviewAttempts = 0;
  let cancellation: { status: string; cancelledAt: string; reason: string } | null = null;
  const advance = () => {
    plan.revision = String.fromCharCode(97 + writes.length).repeat(64);
    for (const row of plan.items) row.revision = plan.revision;
  };
  // Browser interaction coverage uses substituted APIs; real persistence, permissions,
  // concurrent stock checks and notification rollback are covered by database integration.
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    if (path === '/api/auth/me') {
      await route.fulfill({ json: { user: { id: role === 'EVENT_ORGANISER' ? organiserId : coordinatorId,
        role, displayName: 'Test ' + role, email: 'test@example.test' } } });
    } else if (method === 'GET' && path === '/api/events/' + eventId) {
      await route.fulfill({ json: event });
    } else if (method === 'GET' && path === '/api/events/' + eventId + '/equipment-requests') {
      await route.fulfill({ json: { plan } });
    } else if (method === 'GET' && path === '/api/equipment-types') {
      await route.fulfill({ json: { items: [{ id: typeId, name: 'Projector', category: 'AV' }] } });
    } else if (method === 'GET' && path === '/api/equipment-requests') {
      await route.fulfill({ json: { items: plan.items } });
    } else if (method === 'GET' && path === '/api/events/' + eventId + '/cancellation') {
      await route.fulfill({ json: { cancellation } });
    } else if (method === 'POST' && [
      '/api/events/' + eventId + '/equipment-requests', '/api/equipment-requests/' + lineId + '/review',
      '/api/equipment-requests/' + lineId + '/replace', '/api/events/' + eventId + '/cancel',
    ].includes(path)) {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ path, body });
      if (path.endsWith('/review')) {
        reviewAttempts++;
        if (options.staleReview && reviewAttempts === 1) {
          advance();
          await route.fulfill({ status: 409, json: { error: { code: 'STALE_EQUIPMENT_REQUEST', message: 'The equipment plan changed. Reload it.' } } });
          return;
        }
        plan.items[0]!.status = body.decision as string;
        advance(); await route.fulfill({ json: { request: plan.items[0] } });
      } else if (path.endsWith('/replace')) {
        plan.items[0]!.status = 'CANCELLED';
        plan.items.push({ ...item(), ...(body.replacement as object), id: 'replacement-line' });
        advance(); await route.fulfill({ json: { replacement: { replacement: plan.items[1] } } });
      } else if (path.endsWith('/cancel')) {
        event.status = 'CANCELLED'; event.revision++;
        cancellation = { status: 'CANCELLED', cancelledAt: '2026-10-28T02:00:00Z', reason: body.reason as string };
        await route.fulfill(options.cancelledResponseLost
          ? { status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Response lost; check the saved outcome.' } } }
          : { json: { cancellation } });
      } else {
        plan.items = body.notRequired ? [] : (body.lines as Array<Partial<EquipmentLine>>).map(value => ({ ...item(), ...value }));
        plan.status = body.notRequired ? 'NOT_REQUIRED' : 'REQUIRED';
        advance(); await route.fulfill({ json: { request: { status: plan.status, lines: plan.items } } });
      }
    } else if (!(await fulfilWorkspaceRead(route, request, role === 'EVENT_COORDINATOR' ? { coordinatorBookingEventId: eventId } : {}))) {
      unexpected.push(method + ' ' + path); await route.fulfill({ status: 501, json: {} });
    }
  });
  return { writes, unexpected, event, plan, setRole(value: Role) { role = value; } };
}

test('KAN-63/KAN-26 coordinator request, Technical Support review and explicit reservation replacement', async ({ page }) => {
  const fixture = await fixtures(page);
  await page.goto('/reviews/' + eventId);
  await page.getByRole('combobox', { name: 'Equipment type', exact: true }).selectOption(typeId);
  await page.getByLabel('Quantity', { exact: true }).fill('2');
  await page.getByLabel('Technical requirements', { exact: true }).fill('HDMI');
  await page.getByRole('button', { name: 'Save equipment request', exact: true }).click();
  await expect(page.getByText('Equipment request saved.', { exact: true })).toBeVisible();
  expect(fixture.writes[0]!.body).toEqual({ revision: 'a'.repeat(64), notRequired: false,
    lines: [{ equipmentTypeId: typeId, quantity: 2, startsAt: fixture.event.startsAt, endsAt: fixture.event.endsAt, technicalRequirements: 'HDMI' }] });

  fixture.setRole('TECHNICAL_SUPPORT_STAFF');
  await page.goto('/equipment-requests');
  await page.getByRole('button', { name: 'Reserve full line', exact: true }).click();
  await expect(page.getByText('The full equipment line was reserved.', { exact: true })).toBeVisible();
  expect(fixture.writes[1]!.body).toEqual({ decision: 'RESERVED', revision: 'b'.repeat(64) });

  fixture.setRole('EVENT_COORDINATOR');
  await page.goto('/reviews/' + eventId);
  await page.getByRole('button', { name: 'Replace reserved line', exact: true }).click();
  await page.getByLabel('Quantity', { exact: true }).fill('3');
  const button = page.getByRole('button', { name: 'Confirm replacement', exact: true });
  await expect(button).toBeDisabled();
  await page.getByRole('checkbox', { name: /Release the existing reservation/ }).check();
  await button.click();
  await expect(page.getByText('The old reservation was released and a new equipment request was saved for review.', { exact: true })).toBeVisible();
  expect(fixture.writes[2]!.body).toEqual({ revision: 'c'.repeat(64),
    replacement: { equipmentTypeId: typeId, quantity: 3, startsAt: fixture.event.startsAt, endsAt: fixture.event.endsAt, technicalRequirements: 'HDMI' } });
  expect(fixture.plan.items.map(row => row.status)).toEqual(['CANCELLED', 'REQUESTED']);
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-63 stale queue decisions require refresh and a deliberate retry with the new revision', async ({ page }) => {
  const fixture = await fixtures(page, { role: 'TECHNICAL_SUPPORT_STAFF', savedLine: true, staleReview: true });
  await page.goto('/equipment-requests');
  await page.getByRole('button', { name: 'Reserve full line', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Reload it');
  await expect(page.getByRole('button', { name: 'Reserve full line', exact: true })).toBeDisabled();
  expect(fixture.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reserve full line', exact: true })).toBeEnabled();
  expect(fixture.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Reserve full line', exact: true }).click();
  await expect(page.getByText('The full equipment line was reserved.', { exact: true })).toBeVisible();
  expect(fixture.writes[1]!.body.revision).toBe('b'.repeat(64));
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-62 a lost cancellation response is reconciled without cancelling twice', async ({ page }) => {
  const fixture = await fixtures(page, { role: 'EVENT_ORGANISER', cancelledResponseLost: true });
  await page.goto('/events/' + eventId);
  const panel = page.getByRole('region', { name: 'Event cancellation', exact: true });
  await panel.getByLabel('Reason', { exact: true }).fill('Schedule changed');
  await panel.getByRole('checkbox').check();
  await panel.getByRole('button', { name: 'Cancel event', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('Response lost');
  await expect(panel.getByRole('button', { name: 'Cancel event', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Refresh cancellation details', exact: true }).click();
  await expect(panel.getByText('This event was cancelled. The saved reason is visible to event managers.', { exact: true })).toBeVisible();
  expect(fixture.writes).toHaveLength(1);
  await page.reload();
  await expect(panel).toContainText('Reason: Schedule changed');
  expect(fixture.writes).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-63 attendee direct navigation cannot see or review the equipment queue', async ({ page }) => {
  const fixture = await fixtures(page, { role: 'ATTENDEE', savedLine: true });
  await page.goto('/equipment-requests');
  await expect(page.getByRole('alert')).toContainText('Sign in as Technical Support');
  await expect(page.getByText('Equipment request workshop', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reserve full line', exact: true })).toHaveCount(0);
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.unexpected).toEqual([]);
});
