import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';
import type { VenueBooking } from '../../backend/src/modules/venues/booking-service.js';

type Role = 'EVENT_COORDINATOR' | 'VENUE_STAFF';
const bookingId = '83000000-0000-4000-8000-000000000001';
const eventId = '83000000-0000-4000-8000-000000000002';
const userId = '83000000-0000-4000-8000-000000000004';
const account = (role: Role) => ({ id: userId, email: `${role.toLowerCase()}@example.test`, displayName: `Test ${role}`, role });
const base: VenueBooking = {
  id: bookingId, eventRequestId: eventId, eventName: 'Volunteer fair', eventStatus: 'APPROVED',
  venueId: '83000000-0000-4000-8000-000000000003', venueName: 'Harbour Hall', status: 'PENDING',
  startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
  eventStartsAt: '2026-12-01T02:00:00.000Z', eventEndsAt: '2026-12-01T06:00:00.000Z',
  layout: null, notes: null, purpose: null, description: null, expectedAttendance: 80,
  venueRequirements: null, accessibilityNeeds: null, decidedBy: null, decidedAt: null, decisionReason: null,
  holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
  cancelledBy: null, cancelledAt: null, cancellationReason: null,
  recovery: [], replacesBookingId: null,
  createdAt: '2026-10-01T01:00:00.000Z', updatedAt: '2026-10-01T01:00:00.000Z',
};

/**
 * API responses are fixtures: this checks browser wiring for KAN-83. Hold rules, the database
 * clock, races and expiry are verified against PostgreSQL in venue-holds.integration.test.ts.
 */
async function holdFixtures(page: Page, role: Role, start: Partial<VenueBooking> = {}, options: { expireOnApprove?: boolean } = {}) {
  const booking: VenueBooking = { ...base, ...start };
  const writes: { path: string; body: unknown }[] = [];
  const unexpected: string[] = [];
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const error = (code: string, message: string) => ({ error: { code, message } });
    if (method === 'GET' && url.pathname === '/api/auth/me') {
      await route.fulfill({ json: { user: account(role) } });
    } else if (method === 'GET' && url.pathname === `/api/venue-bookings/${bookingId}`) {
      await route.fulfill({ json: { booking } });
    } else if (method === 'GET' && url.pathname === '/api/venue-bookings') {
      await route.fulfill({ json: { items: [booking] } });
    } else if (method === 'POST' && role === 'VENUE_STAFF' && url.pathname === `/api/venue-bookings/${bookingId}/hold`) {
      const body = request.postDataJSON() as { expiresAt: string };
      writes.push({ path: url.pathname, body });
      Object.assign(booking, { status: 'HELD', holdExpiresAt: body.expiresAt, heldBy: userId, heldAt: '2026-10-21T01:00:00.000Z' });
      await route.fulfill({ json: { booking } });
    } else if (method === 'POST' && role === 'VENUE_STAFF' && url.pathname === `/api/venue-bookings/${bookingId}/hold/cancel`) {
      const body = request.postDataJSON() as { reason: string };
      writes.push({ path: url.pathname, body });
      Object.assign(booking, { status: 'CANCELLED', cancelledBy: userId, cancelledAt: '2026-10-21T02:00:00.000Z',
        cancellationReason: body.reason });
      await route.fulfill({ json: { booking } });
    } else if (method === 'POST' && role === 'VENUE_STAFF' && url.pathname === `/api/venue-bookings/${bookingId}/decision`) {
      writes.push({ path: url.pathname, body: request.postDataJSON() });
      if (options.expireOnApprove) {
        Object.assign(booking, { status: 'EXPIRED', expiredAt: booking.holdExpiresAt });
        await route.fulfill({ status: 409, json: error('HOLD_EXPIRED',
          'This hold reached its deadline and the venue period was released. Ask the coordinator to submit a new request.') });
      } else {
        Object.assign(booking, { status: 'APPROVED', decidedBy: userId, decidedAt: '2026-10-21T03:00:00.000Z' });
        await route.fulfill({ json: { booking } });
      }
    } else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: eventId }))) {
      unexpected.push(`${method} ${url.pathname}${url.search}`);
      await route.fulfill({ status: 501, json: error('UNEXPECTED_TEST_REQUEST', 'No response fixture was configured.') });
    }
  });
  return { booking, writes, unexpected };
}

test('KAN-83 running backend requires login to place or cancel a hold', async ({ request }) => {
  for (const response of [
    await request.post(`/api/venue-bookings/${bookingId}/hold`, { data: { expiresAt: '2026-11-28T18:00:00+08:00' } }),
    await request.post(`/api/venue-bookings/${bookingId}/hold/cancel`, { data: { reason: 'x' } }),
  ]) {
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});

test('KAN-83 Venue Staff place a hold in Singapore time, see it survive a reload and approve it', async ({ page }) => {
  const fixture = await holdFixtures(page, 'VENUE_STAFF');
  await page.goto(`/venue-bookings/${bookingId}`);
  await page.getByLabel('Hold deadline (Singapore time)').fill('2026-11-28T18:00');
  await page.getByRole('button', { name: 'Place hold', exact: true }).click();
  await expect(page.getByText('Held until 28 Nov 2026, 6:00 pm', { exact: true })).toBeVisible();
  expect(fixture.writes).toEqual([{ path: `/api/venue-bookings/${bookingId}/hold`, body: { expiresAt: '2026-11-28T10:00:00.000Z' } }]);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Temporary hold' })).toBeVisible();
  await expect(page.getByText(/The server checks the deadline when a change is saved/)).toBeVisible();

  await page.getByRole('radio', { name: 'Approve booking' }).check();
  await page.getByRole('button', { name: 'Record decision' }).click();
  await expect(page.getByText('Venue booking approved.')).toBeVisible();
  await expect(page.getByText('Earlier hold deadline')).toBeVisible();
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-83 Venue Staff cancel a hold with a required reason', async ({ page }) => {
  const fixture = await holdFixtures(page, 'VENUE_STAFF', {
    status: 'HELD', holdExpiresAt: '2026-11-28T10:00:00.000Z', heldBy: userId, heldAt: '2026-10-21T01:00:00.000Z',
  });
  await page.goto(`/venue-bookings/${bookingId}`);
  const cancel = page.getByRole('button', { name: 'Cancel hold', exact: true });
  await expect(cancel).toBeDisabled();
  await page.getByLabel('Reason for cancelling (required)').fill('  Organiser withdrew  ');
  await cancel.click();
  await expect(page.getByText('Venue hold cancelled and released.')).toBeVisible();
  await expect(page.getByText('Organiser withdrew', { exact: true })).toBeVisible();
  expect(fixture.writes).toEqual([{ path: `/api/venue-bookings/${bookingId}/hold/cancel`, body: { reason: 'Organiser withdrew' } }]);
});

test('KAN-83 a late approval shows the expiry refusal and the released outcome, with no retry', async ({ page }) => {
  const fixture = await holdFixtures(page, 'VENUE_STAFF', {
    status: 'HELD', holdExpiresAt: '2026-10-21T01:00:00.000Z', heldBy: userId, heldAt: '2026-10-20T01:00:00.000Z',
  }, { expireOnApprove: true });
  await page.goto(`/venue-bookings/${bookingId}`);
  await page.getByRole('radio', { name: 'Approve booking' }).check();
  await page.getByRole('button', { name: 'Record decision' }).click();
  await expect(page.getByText(/This hold reached its deadline .* Review the current booking status/)).toBeVisible();
  await expect(page.getByText(/It cannot be approved or renewed/)).toBeVisible();
  expect(fixture.writes).toHaveLength(1);
});

test('KAN-83 the assigned coordinator sees the hold deadline on the booking without staff controls', async ({ page }) => {
  await holdFixtures(page, 'EVENT_COORDINATOR', {
    status: 'HELD', holdExpiresAt: '2026-11-28T10:00:00.000Z', heldBy: userId, heldAt: '2026-10-21T01:00:00.000Z',
  });
  await page.goto(`/venue-bookings/${bookingId}`);
  await expect(page.getByText('Held until 28 Nov 2026, 6:00 pm', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel hold' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Place hold' })).toHaveCount(0);
});
