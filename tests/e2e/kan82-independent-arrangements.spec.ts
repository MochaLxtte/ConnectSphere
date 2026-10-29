import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';
import type { VenueBooking } from '../../backend/src/modules/venues/booking-service.js';

const eventId = '82000000-0000-4000-8000-000000000001';
const hallId = '82000000-0000-4000-8000-000000000002';
const studioId = '82000000-0000-4000-8000-000000000003';
const hallBookingId = '82000000-0000-4000-8000-000000000004';
const studioBookingId = '82000000-0000-4000-8000-000000000005';
const replacementId = '82000000-0000-4000-8000-000000000006';
const coordinatorId = '82000000-0000-4000-8000-000000000007';
const organiserId = '82000000-0000-4000-8000-000000000008';
const event = {
  id: eventId, organiserId, coordinatorId, status: 'APPROVED', name: 'Careers fair',
  purpose: 'Meet employers', description: 'Booths and talks.',
  startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z', expectedAttendance: 60,
  venueRequirements: 'Hall and a breakout room', accessibilityNeeds: null,
  equipmentRequirements: null, registrationRequired: false,
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', review: null,
  actions: { canEditDraft: false, canMakeInitialDecision: false },
};
const venue = (id: string, name: string) => ({
  id, name, capacity: 100, description: null, location: null, layouts: [], facilities: [],
  accessibilityFeatures: [], wheelchairAccessible: true, opensAt: null, closesAt: null,
  updatedAt: '2026-10-01T00:00:00.000Z',
});
const booking = (id: string, venueId: string, venueName: string, startsAt: string, endsAt: string): VenueBooking => ({
  id, eventRequestId: eventId, eventName: event.name, eventStatus: 'APPROVED', venueId, venueName,
  status: 'APPROVED', startsAt, endsAt, layout: null, notes: null, decidedBy: 'staff', decidedAt: '2026-10-05T00:00:00.000Z',
  decisionReason: null, createdAt: '2026-10-05T00:00:00.000Z', updatedAt: '2026-10-05T00:00:00.000Z',
  eventStartsAt: event.startsAt, eventEndsAt: event.endsAt, purpose: event.purpose, description: event.description,
  expectedAttendance: event.expectedAttendance, venueRequirements: event.venueRequirements, accessibilityNeeds: null,
  recovery: [], replacesBookingId: null, replacedByBookingIds: [],
  holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
  cancelledBy: null, cancelledAt: null, cancellationReason: null,
});

async function fixtures(page: Page) {
  // Response fixtures for the browser flow only. PostgreSQL integration tests establish persistence,
  // locking, authorization, release of the period and notifications.
  const bookings: VenueBooking[] = [
    booking(hallBookingId, hallId, 'Harbour Hall', '2026-12-01T02:00:00.000Z', '2026-12-01T06:00:00.000Z'),
    booking(studioBookingId, studioId, 'River Studio', '2026-12-01T03:00:00.000Z', '2026-12-01T05:00:00.000Z'),
  ];
  const writes: { path: string; body: unknown }[] = [];
  const unexpected: string[] = [];
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    if (method === 'GET' && path === '/api/auth/me') {
      await route.fulfill({ json: { user: { id: coordinatorId, role: 'EVENT_COORDINATOR',
        email: 'coordinator@example.test', displayName: 'Test coordinator' } } });
    } else if (method === 'GET' && path === `/api/events/${eventId}`) {
      await route.fulfill({ json: event });
    } else if (method === 'GET' && path === '/api/venues/search-venues' && !url.search) {
      await route.fulfill({ json: { items: [venue(hallId, 'Harbour Hall'), venue(studioId, 'River Studio')] } });
    } else if (method === 'GET' && path === '/api/venue-bookings' && url.search === `?eventRequestId=${eventId}`) {
      await route.fulfill({ json: { items: bookings } });
    } else if (method === 'POST' && path === `/api/venue-bookings/${hallBookingId}/cancel`) {
      const body = request.postDataJSON() as { reason: string };
      writes.push({ path, body });
      Object.assign(bookings[0]!, { status: 'CANCELLED', cancelledBy: coordinatorId,
        cancelledAt: '2026-10-28T00:00:00.000Z', cancellationReason: body.reason });
      await route.fulfill({ json: { booking: bookings[0] } });
    } else if (method === 'POST' && path === `/api/events/${eventId}/venue-bookings`) {
      const body = request.postDataJSON() as { venueId: string; startsAt: string; endsAt: string; replacesBookingId?: string };
      writes.push({ path, body });
      const created = { ...booking(replacementId, body.venueId, 'River Studio', body.startsAt, body.endsAt),
        status: 'PENDING' as const, decidedBy: null, decidedAt: null, replacesBookingId: body.replacesBookingId ?? null };
      bookings.push(created);
      bookings[0]!.replacedByBookingIds = [replacementId];
      await route.fulfill({ status: 201, json: { booking: created } });
    } else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: eventId }))) {
      unexpected.push(`${method} ${path}${url.search}`);
      await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No fixture configured.' } } });
    }
  });
  return { bookings, writes, unexpected };
}

test('KAN-82 running API requires login to cancel a venue arrangement', async ({ request }) => {
  const response = await request.post(`/api/venue-bookings/${hallBookingId}/cancel`, { data: { reason: 'x' } });
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
});

test('KAN-82 coordinator cancels one arrangement, keeps the other and requests a linked replacement', async ({ page }, testInfo) => {
  const fixture = await fixtures(page);
  await page.goto(`/reviews/${eventId}`);
  const panel = page.getByRole('region', { name: 'Venue booking requests', exact: true });
  await expect(panel.getByRole('button', { name: 'Cancel arrangement', exact: true })).toHaveCount(2);

  await panel.getByRole('button', { name: 'Cancel arrangement', exact: true }).first().click();
  const confirm = panel.getByRole('form', { name: 'Cancel Harbour Hall', exact: true });
  await expect(confirm).toContainText('Careers fair at Harbour Hall, 1 Dec 2026');
  await expect(confirm).toContainText('releases this venue period straight away');
  await expect(confirm.getByRole('button', { name: 'Confirm cancellation', exact: true })).toBeDisabled();
  await confirm.getByLabel('Reason for cancelling', { exact: true }).fill('Need a smaller room');
  await confirm.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();

  await expect(panel.getByRole('status').filter({ hasText: 'was cancelled and its venue period released' })).toBeVisible();
  await expect(panel.getByText('Cancellation reason: Need a smaller room', { exact: true })).toBeVisible();
  // AC3/AC8: the other arrangement is still approved and still manageable on its own.
  await expect(panel.getByRole('button', { name: 'Cancel arrangement', exact: true })).toHaveCount(1);
  await expect(panel.getByText('Approved', { exact: true })).toHaveCount(1);

  await panel.getByRole('button', { name: 'Request replacement', exact: true }).click();
  await expect(panel.getByLabel(/This request replaces/)).toHaveValue(hallBookingId);
  await expect(panel.getByText(/The cancelled arrangement stays cancelled\./)).toBeVisible();
  await panel.getByRole('combobox', { name: 'Venue', exact: true }).selectOption(studioId);
  await panel.getByLabel('Starts (Singapore time)', { exact: true }).fill('2026-12-01T13:00');
  await panel.getByLabel('Ends (Singapore time)', { exact: true }).fill('2026-12-01T15:00');
  await panel.getByRole('button', { name: 'Request this venue', exact: true }).click();

  await expect(panel.getByText(/^Replaced by River Studio, 1 Dec 2026.*\(Pending\)\.$/)).toBeVisible();
  await expect(panel.getByText(/^Replaces the cancelled arrangement Harbour Hall/)).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Request replacement', exact: true })).toHaveCount(0);
  expect(fixture.writes).toEqual([
    { path: `/api/venue-bookings/${hallBookingId}/cancel`, body: { reason: 'Need a smaller room' } },
    { path: `/api/events/${eventId}/venue-bookings`, body: { venueId: studioId, startsAt: '2026-12-01T05:00:00.000Z',
      endsAt: '2026-12-01T07:00:00.000Z', layout: null, notes: null, replacesBookingId: hallBookingId } },
  ]);
  expect(fixture.unexpected).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('kan82-cancel-and-replace.png'), fullPage: true });
});
