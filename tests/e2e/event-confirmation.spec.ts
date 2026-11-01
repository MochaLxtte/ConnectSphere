import type { Page, Request, Route } from '@playwright/test';
import { expect, test } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

// Browser-boundary checks with substituted API responses; the server rules, locking and
// PostgreSQL triggers are covered by database/tests/events/confirmation.integration.test.ts.
const organiser = { id: '10000000-0000-4000-8000-000000000061', email: 'organiser@example.test', displayName: 'Test organiser', role: 'EVENT_ORGANISER' };
const coordinator = { id: '20000000-0000-4000-8000-000000000061', email: 'coordinator@example.test', displayName: 'Casey Coordinator', role: 'EVENT_COORDINATOR' };
const eventId = '30000000-0000-4000-8000-000000000061';

const event = (status: string) => ({
  id: eventId, organiserId: organiser.id, coordinatorId: coordinator.id, status,
  name: 'Graduation dinner', purpose: 'Celebration', description: 'Annual dinner',
  startsAt: '2035-01-01T10:00:00.000Z', endsAt: '2035-01-01T14:00:00.000Z', expectedAttendance: 120,
  venueRequirements: 'Ballroom', accessibilityNeeds: null, equipmentRequirements: null,
  registrationRequired: false, registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null,
  revision: 2, createdAt: '2034-10-01T00:00:00Z', updatedAt: '2034-10-02T00:00:00Z',
  review: { reviewId: 'r1', eventRequestId: eventId, reviewedBy: coordinator.id, decision: 'APPROVED', reason: null, createdAt: '2034-10-03T00:00:00Z' },
  actions: { canEditDraft: false, canMakeInitialDecision: false, canEditDetails: false, editMode: null, editableFields: [] },
});
const checks = (outage: boolean) => [
  { key: 'VENUE', ready: !outage, message: outage
    ? 'Resolve 1 venue booking still requiring outage recovery before confirming.' : 'Every live venue arrangement is approved.' },
  { key: 'EQUIPMENT', ready: true, message: 'Equipment is recorded as Not Required.' },
  { key: 'CHANGE_REQUEST', ready: true, message: 'No significant change is pending.' },
];
const confirmedRecord = { confirmedBy: coordinator.id, confirmedByName: 'Casey Coordinator', confirmedAt: '2034-12-01T02:00:00.000Z' };

async function stubApi(page: Page, user: object, handle: (path: string, request: Request, route: Route) => Promise<boolean>) {
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path === '/api/auth/me') await route.fulfill({ json: { user } });
    else if (await handle(path, request, route)) return;
    else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: eventId }))) {
      await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'Unexpected request' } } });
    }
  });
}

for (const scenario of ['saved', 'read failure', 'uncertain save'] as const) {
  test(`KAN-61 new venue request clears stale Ready with unchanged event revision: ${scenario}`, async ({ page }, testInfo) => {
    const refreshFailure = scenario === 'read failure';
    const venueId = '40000000-0000-4000-8000-000000000061';
    let pending = false;
    let submitted = false;
    let confirmationReads = 0;
    let releaseRead!: () => void;
    const blockedRead = new Promise<void>(resolve => { releaseRead = resolve; });
    const writes: string[] = [];
    const details = event('APPROVED');
    const booking = { id: '50000000-0000-4000-8000-000000000061', eventRequestId: eventId, eventName: details.name,
      eventStatus: 'APPROVED', venueId, venueName: 'Additional classroom', status: 'PENDING',
      startsAt: details.startsAt, endsAt: details.endsAt, layout: 'CLASSROOM', notes: null,
      decidedBy: null, decidedAt: null, decisionReason: null, createdAt: details.createdAt, updatedAt: details.updatedAt,
      eventStartsAt: details.startsAt, eventEndsAt: details.endsAt, purpose: details.purpose, description: details.description,
      expectedAttendance: 120, venueRequirements: 'Ballroom', accessibilityNeeds: null, recovery: [],
      replacesBookingId: null, replacedByBookingIds: [], holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
      cancelledBy: null, cancelledAt: null, cancellationReason: null };
    await stubApi(page, coordinator, async (path, request, route) => {
      if (path === `/api/events/${eventId}`) await route.fulfill({ json: details });
      else if (path === '/api/venues/search-venues') await route.fulfill({ json: { items: [{ id: venueId,
        name: 'Additional classroom', capacity: 150, description: null, location: 'Level 1', layouts: ['CLASSROOM'],
        facilities: [], accessibilityFeatures: [], wheelchairAccessible: false, opensAt: null, closesAt: null,
        updatedAt: details.updatedAt }] } });
      else if (path === '/api/venue-bookings') await route.fulfill({ json: { items: [
        { ...booking, id: '50000000-0000-4000-8000-000000000062', venueName: 'Original approved hall', status: 'APPROVED' },
        ...(submitted ? [{ ...booking, status: pending ? 'PENDING' : 'APPROVED' }] : []),
      ] } });
      else if (path === `/api/events/${eventId}/venue-bookings` && request.method() === 'POST') {
        pending = true; submitted = true; writes.push(path);
        await route.fulfill(scenario === 'uncertain save'
          ? { status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Save response was lost.' } } }
          : { status: 201, json: { booking } });
      } else if (path === `/api/events/${eventId}/confirmation`) {
        confirmationReads += 1;
        if (confirmationReads === 2) {
          await blockedRead;
          if (refreshFailure) {
            await route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Readiness temporarily unavailable.' } } });
            return true;
          }
        }
        await route.fulfill({ json: { eventRequestId: eventId, status: 'APPROVED', started: false,
          canConfirm: !pending, readiness: { ready: !pending, checks: checks(false).map(check =>
            check.key === 'VENUE' && pending ? { ...check, ready: false, message: 'Resolve 1 venue arrangement awaiting approval before confirming.' } : check) },
          confirmation: null } });
      } else return false;
      return true;
    });
    await page.goto(`/reviews/${eventId}`);
    const confirmation = page.getByRole('region', { name: 'Event confirmation', exact: true });
    await expect(confirmation).toContainText('Every live venue arrangement is approved.');
    await confirmation.getByRole('checkbox').check();
    // A sibling's in-progress form must survive both the arrangement change and the quiet detail refresh.
    const technicalNotes = page.getByRole('textbox', { name: 'Technical requirements', exact: true });
    await technicalNotes.fill('Retain this unfinished equipment request');
    const venuePanel = page.getByRole('region', { name: 'Venue booking requests', exact: true });
    await venuePanel.getByRole('combobox', { name: 'Venue', exact: true }).selectOption(venueId);
    await venuePanel.getByLabel('Starts (Singapore time)', { exact: true }).fill('2035-01-01T18:00');
    await venuePanel.getByLabel('Ends (Singapore time)', { exact: true }).fill('2035-01-01T22:00');
    await venuePanel.getByRole('textbox', { name: 'Room layout (optional)', exact: true }).fill('CLASSROOM');
    await venuePanel.getByRole('button', { name: 'Request this venue', exact: true }).click();
    await expect(confirmation.getByText('Loading confirmation details…')).toBeVisible();
    await expect(confirmation.getByRole('button', { name: 'Confirm event' })).toHaveCount(0);
    await expect(confirmation).not.toContainText('Every live venue arrangement is approved.');
    await expect(technicalNotes).toHaveValue('Retain this unfinished equipment request');
    releaseRead();
    if (refreshFailure) {
      await expect(confirmation.getByRole('alert')).toHaveText('Readiness temporarily unavailable.');
      await expect(confirmation.getByRole('button', { name: 'Confirm event' })).toHaveCount(0);
      await confirmation.getByRole('button', { name: 'Reload confirmation details' }).click();
    }
    await expect(confirmation.getByRole('list')).toContainText('Resolve 1 venue arrangement awaiting approval before confirming.');
    await expect(confirmation.getByRole('button', { name: 'Confirm event' })).toHaveCount(0);
    await expect(technicalNotes).toHaveValue('Retain this unfinished equipment request');
    expect(writes).toEqual([`/api/events/${eventId}/venue-bookings`]);
    expect(confirmationReads).toBe(refreshFailure ? 3 : 2);
    await confirmation.screenshot({ path: testInfo.outputPath('confirmation-after-pending-booking.png') });
    if (scenario === 'uncertain save') {
      await venuePanel.getByRole('button', { name: 'Review current bookings' }).click();
      await expect(venuePanel.getByText('Pending', { exact: true })).toBeVisible();
      await expect(confirmation.getByRole('button', { name: 'Confirm event' })).toHaveCount(0);
      expect(writes).toHaveLength(1);
    }
    // A later staff decision does not update the event revision either. Explicit list refresh
    // reconciles the dependent summary as well, without resubmitting the venue request.
    pending = false;
    await venuePanel.getByRole('button', { name: 'Refresh booking requests' }).click();
    await expect(confirmation.getByRole('button', { name: 'Confirm event' })).toBeDisabled();
    await expect(confirmation.getByRole('checkbox')).not.toBeChecked();
    await expect(technicalNotes).toHaveValue('Retain this unfinished equipment request');
    expect(writes).toHaveLength(1);
  });
}

test('KAN-61-AC3/AC4 coordinator confirms a ready event and the outcome persists after reload', async ({ page }, testInfo) => {
  let status = 'APPROVED';
  const writes: unknown[] = [];
  await stubApi(page, coordinator, async (path, request, route) => {
    if (path === `/api/events/${eventId}`) await route.fulfill({ json: event(status) });
    else if (path === `/api/events/${eventId}/confirmation`) {
      await route.fulfill({ json: status === 'CONFIRMED'
        ? { eventRequestId: eventId, status, started: false, canConfirm: false, readiness: null, confirmation: confirmedRecord }
        : { eventRequestId: eventId, status, started: false, canConfirm: true, readiness: { ready: true, checks: checks(false) }, confirmation: null } });
    } else if (path === `/api/events/${eventId}/confirm` && request.method() === 'POST') {
      writes.push(request.postDataJSON()); status = 'CONFIRMED';
      await route.fulfill({ json: { confirmation: { eventRequestId: eventId, status, changed: true, confirmation: confirmedRecord } } });
    } else return false;
    return true;
  });

  await page.goto(`/reviews/${eventId}`);
  const panel = page.getByRole('region', { name: 'Event confirmation' });
  await expect(panel.getByRole('list', { name: 'Confirmation readiness' })).toContainText('Every live venue arrangement is approved.');
  const confirm = panel.getByRole('button', { name: 'Confirm event' });
  await expect(confirm).toBeDisabled();
  await panel.getByRole('checkbox').check();
  await page.screenshot({ path: testInfo.outputPath('coordinator-ready.png'), fullPage: true });
  await confirm.click();
  await expect(panel.getByText('The event is confirmed.')).toBeVisible();
  await expect(panel.getByTestId('confirmation-record')).toContainText('Confirmed by Casey Coordinator');
  expect(writes).toEqual([{}]);

  await page.reload();
  await expect(page.getByRole('region', { name: 'Event confirmation' }).getByTestId('confirmation-record')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm event' })).toHaveCount(0);
});

test('KAN-61-AC105 an outage still needing recovery blocks confirmation with a reason', async ({ page }) => {
  await stubApi(page, coordinator, async (path, _request, route) => {
    if (path === `/api/events/${eventId}`) await route.fulfill({ json: event('APPROVED') });
    else if (path === `/api/events/${eventId}/confirmation`) {
      await route.fulfill({ json: { eventRequestId: eventId, status: 'APPROVED', started: false, canConfirm: false,
        readiness: { ready: false, checks: checks(true) }, confirmation: null } });
    } else return false;
    return true;
  });
  await page.goto(`/reviews/${eventId}`);
  const panel = page.getByRole('region', { name: 'Event confirmation' });
  await expect(panel).toContainText('Resolve 1 venue booking still requiring outage recovery before confirming.');
  await expect(panel.getByRole('button', { name: 'Confirm event' })).toHaveCount(0);
});

test('KAN-61-AC4 the organiser sees who confirmed the event and when, on desktop and narrow screens', async ({ page }, testInfo) => {
  await stubApi(page, organiser, async (path, _request, route) => {
    if (path === `/api/events/${eventId}`) await route.fulfill({ json: event('CONFIRMED') });
    else if (path === `/api/events/${eventId}/confirmation`) {
      await route.fulfill({ json: { eventRequestId: eventId, status: 'CONFIRMED', started: false, canConfirm: false,
        readiness: null, confirmation: confirmedRecord } });
    } else return false;
    return true;
  });
  await page.goto(`/events/${eventId}`);
  const record = page.getByRole('region', { name: 'Event confirmation' }).getByTestId('confirmation-record');
  await expect(record).toContainText('Confirmed by Casey Coordinator');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(record).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('organiser-mobile.png'), fullPage: true });
});
