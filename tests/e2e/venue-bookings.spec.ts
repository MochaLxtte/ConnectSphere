import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';
import type { VenueBooking } from '../../backend/src/modules/venues/booking-service.js';

type Role = 'EVENT_ORGANISER' | 'EVENT_COORDINATOR' | 'VENUE_STAFF' | 'TECHNICAL_SUPPORT_STAFF' | 'ATTENDEE';
const bookingId = '80000000-0000-4000-8000-000000000001';
const eventId = '80000000-0000-4000-8000-000000000002';
const venueId = '80000000-0000-4000-8000-000000000003';
const userId = '80000000-0000-4000-8000-000000000004';
const account = (role: Role) => ({
  id: userId, email: `${role.toLowerCase()}@example.test`,
  displayName: `Test ${role.toLowerCase().replaceAll('_', ' ')}`, role,
});
const makeBooking = (overrides: Partial<VenueBooking> = {}): VenueBooking => ({
  id: bookingId, eventRequestId: eventId, eventName: 'Community welcome day', eventStatus: 'APPROVED',
  venueId, venueName: 'Harbour Hall', status: 'PENDING',
  startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
  eventStartsAt: '2026-12-01T02:00:00.000Z', eventEndsAt: '2026-12-01T06:00:00.000Z',
  layout: 'Theatre', notes: 'Projector and microphones required.', purpose: 'Welcome new volunteers',
  description: 'Orientation and activities', expectedAttendance: 80,
  venueRequirements: 'A seated hall', accessibilityNeeds: 'Step-free access',
  decidedBy: null, decidedAt: null, decisionReason: null,
  holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
  cancelledBy: null, cancelledAt: null, cancellationReason: null,
  createdAt: '2026-10-01T01:00:00.000Z', updatedAt: '2026-10-01T01:00:00.000Z', ...overrides,
});

async function bookingFixtures(page: Page, role: Role | null, options: {
  bookings?: VenueBooking[]; inaccessible?: boolean; staleDecision?: boolean; lostResponse?: boolean;
} = {}) {
  const user = role ? account(role) : null;
  const bookings = (options.bookings ?? [makeBooking()]).map(booking => ({ ...booking }));
  const reads: string[] = [];
  const decisions: { decision: string; reason: string | null }[] = [];
  const unexpected: string[] = [];
  // Response fixtures exercise browser behaviour and intentionally never reach a hosted account.
  // Database permissions and persistence are exercised separately in integration tests.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const error = (code: string, message: string) => ({ error: { code, message } });
    if (method === 'GET' && url.pathname === '/api/auth/me') {
      await route.fulfill({ status: user ? 200 : 401,
        json: user ? { user } : error('AUTHENTICATION_REQUIRED', 'Sign in required.') });
    } else if (method === 'GET' && url.pathname === '/api/health') {
      await route.fulfill({ json: { status: 'ok', service: 'connectsphere-api' } });
    } else if (method === 'GET' && url.pathname === '/api/health/ready') {
      await route.fulfill({ json: { status: 'ok', database: 'connected' } });
    } else if (url.pathname.startsWith('/api/venue-bookings')) {
      // Unexpected private reads from a disallowed browser role fail closed instead of leaking fixtures.
      if (role !== 'VENUE_STAFF' && role !== 'EVENT_COORDINATOR') {
        unexpected.push(`${method} ${url.pathname}`);
        await route.fulfill({ status: 403, json: error('ACTION_FORBIDDEN', 'Not authorised.') });
        return;
      }
      const id = url.pathname.split('/')[3];
      const booking = bookings.find(item => item.id === id);
      if (method === 'GET' && url.pathname === '/api/venue-bookings') {
        reads.push(url.pathname);
        const filtered = options.inaccessible ? [] : bookings.filter(item =>
          (role !== 'VENUE_STAFF' || item.status === 'PENDING')
          && (!url.searchParams.has('eventRequestId') || item.eventRequestId === url.searchParams.get('eventRequestId')));
        await route.fulfill({ json: { items: filtered } });
      } else if (method === 'GET' && booking) {
        reads.push(url.pathname);
        await route.fulfill({ status: options.inaccessible ? 404 : 200,
          json: options.inaccessible ? error('VENUE_BOOKING_NOT_FOUND', 'The venue booking request was not found.') : { booking } });
      } else if (method === 'POST' && role === 'VENUE_STAFF' && booking
        && url.pathname === `/api/venue-bookings/${booking.id}/decision`) {
        const input = request.postDataJSON() as { decision: 'APPROVED' | 'REJECTED'; reason: string | null };
        decisions.push(input);
        if (options.staleDecision) {
          Object.assign(booking, { status: 'REJECTED', decidedBy: userId,
            decidedAt: '2026-10-04T02:00:00.000Z', decisionReason: 'Decided by another staff member.' });
          await route.fulfill({ status: 409,
            json: error('BOOKING_ALREADY_DECIDED', 'This booking is no longer pending a decision.') });
        } else {
          Object.assign(booking, { status: input.decision, decisionReason: input.reason,
            decidedBy: userId, decidedAt: '2026-10-04T02:00:00.000Z', updatedAt: '2026-10-04T02:00:00.000Z' });
          if (options.lostResponse) {
            await route.fulfill({ status: 500, json: error('INTERNAL_ERROR', 'An unexpected error occurred.') });
          } else {
            await route.fulfill({ json: { booking } });
          }
        }
      } else {
        unexpected.push(`${method} ${url.pathname}`);
        await route.fulfill({ status: 501, json: error('UNEXPECTED_TEST_REQUEST', 'No response fixture was configured.') });
      }
    } else if (!(await fulfilWorkspaceRead(route, request))) {
      unexpected.push(`${method} ${url.pathname}${url.search}`);
      await route.fulfill({ status: 501, json: error('UNEXPECTED_TEST_REQUEST', 'No response fixture was configured.') });
    }
  });
  return { reads, decisions, unexpected };
}

test('KAN-8 running backend requires login for booking list, detail and decision', async ({ request }) => {
  // No response fixtures: normal Vite proxy -> Express runtime routes, with no session cookie.
  for (const response of [
    await request.get('/api/venue-bookings'),
    await request.get(`/api/venue-bookings/${bookingId}`),
    await request.post(`/api/venue-bookings/${bookingId}/decision`, { data: { decision: 'APPROVED' } }),
  ]) {
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});

for (const scenario of [
  { decision: 'APPROVED' as const, label: 'Approve booking', outcome: 'Approved', reason: '' },
  { decision: 'REJECTED' as const, label: 'Reject booking', outcome: 'Rejected', reason: 'Capacity is insufficient.' },
]) {
  test(`KAN-8 staff ${scenario.decision.toLowerCase()} decision survives reload and leaves the pending queue`, async ({ page }, testInfo) => {
    const fixture = await bookingFixtures(page, 'VENUE_STAFF');
    await page.goto('/venue-bookings');
    await page.getByRole('link', { name: 'Community welcome day · Harbour Hall' }).click();
    await expect(page.getByRole('heading', { name: 'Community welcome day', exact: true })).toBeVisible();
    await expect(page.getByText('Step-free access', { exact: true })).toBeVisible();
    await expect(page.getByText('Projector and microphones required.', { exact: true })).toBeVisible();
    const calendarHref = await page.getByRole('link', { name: 'View venue availability', exact: true }).getAttribute('href');
    const calendarUrl = new URL(calendarHref!, 'http://127.0.0.1:5173');
    expect(calendarUrl.searchParams.get('venue')).toBe(venueId);
    expect(calendarUrl.searchParams.get('week')).toBe('2026-12-01');
    await expect(page.getByRole('button', { name: 'Record decision' })).toBeDisabled();
    await page.getByRole('radio', { name: scenario.label }).check();
    if (scenario.reason) await page.getByRole('textbox', { name: 'Reason or information (optional)' }).fill(`  ${scenario.reason}  `);
    await page.getByRole('button', { name: 'Record decision' }).click();
    const outcome = page.getByRole('region', { name: 'Booking decision', exact: true });
    await expect(outcome.getByText(scenario.outcome, { exact: true })).toBeVisible();
    await expect(outcome.getByText(scenario.reason || 'No reason provided.', { exact: true })).toBeVisible();
    if (scenario.decision === 'APPROVED') {
      await page.screenshot({ path: testInfo.outputPath('approved-venue-booking.png'), fullPage: true });
    }
    await expect(page.getByRole('button', { name: 'Record decision' })).toHaveCount(0);
    expect(fixture.decisions).toEqual([{ decision: scenario.decision, reason: scenario.reason || null }]);
    await page.reload();
    await expect(outcome.getByText(scenario.outcome, { exact: true })).toBeVisible();
    await expect(outcome.getByText(scenario.reason || 'No reason provided.', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Back to venue booking requests' }).click();
    await expect(page.getByRole('heading', { name: 'No pending or held venue requests' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Community welcome day · Harbour Hall' })).toHaveCount(0);
    expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-8 coordinator sees saved outcomes and rejection information without decision controls', async ({ page }) => {
  const fixture = await bookingFixtures(page, 'EVENT_COORDINATOR', { bookings: [
    makeBooking({ status: 'REJECTED', decidedBy: userId, decidedAt: '2026-10-04T02:00:00.000Z', decisionReason: 'Capacity is insufficient.' }),
    makeBooking({ id: '80000000-0000-4000-8000-000000000005', eventName: 'Approved gathering', status: 'APPROVED',
      decidedBy: userId, decidedAt: '2026-10-04T02:00:00.000Z' }),
  ] });
  await page.goto('/venue-bookings');
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await expect(page.getByText('Rejected', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Community welcome day · Harbour Hall' }).click();
  await expect(page.getByRole('region', { name: 'Booking decision', exact: true }))
    .toContainText('Capacity is insufficient.');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Record decision' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View event request', exact: true })).toHaveAttribute('href', `/reviews/${eventId}`);
  expect(fixture.decisions).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-8 coordinator receives unavailable view for another coordinator booking', async ({ page }) => {
  const fixture = await bookingFixtures(page, 'EVENT_COORDINATOR', { inaccessible: true });
  await page.goto(`/venue-bookings/${bookingId}`);
  await expect(page.getByRole('alert')).toContainText('This venue booking request is unavailable or you do not have permission to view it.');
  await expect(page.getByText('Community welcome day', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to venue booking requests' }).click();
  await expect(page.getByRole('heading', { name: 'No venue booking requests yet' })).toBeVisible();
  expect(fixture.decisions).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

for (const role of ['EVENT_ORGANISER', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE', null] as const) {
  test(`KAN-8 ${role ?? 'signed-out visitor'} cannot load private booking data or see navigation`, async ({ page }) => {
    const fixture = await bookingFixtures(page, role);
    for (const path of ['/venue-bookings', `/venue-bookings/${bookingId}`]) {
      await page.goto(path);
      await expect(page.getByRole('alert')).toContainText(role
        ? 'Venue booking requests are for venue staff and event coordinators.' : 'Sign in to view');
      await expect(page.getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'Venue bookings', exact: true })).toHaveCount(0);
      await expect(page.getByText('Community welcome day', { exact: true })).toHaveCount(0);
    }
    expect(fixture.reads).toEqual([]);
    expect(fixture.decisions).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-8 stale decision refreshes the saved competing outcome without retrying the write', async ({ page }) => {
  const fixture = await bookingFixtures(page, 'VENUE_STAFF', { staleDecision: true });
  await page.goto(`/venue-bookings/${bookingId}`);
  await page.getByRole('radio', { name: 'Approve booking' }).check();
  await page.getByRole('button', { name: 'Record decision' }).click();
  await expect(page.getByRole('alert')).toContainText('This booking is no longer pending a decision.');
  await expect(page.getByRole('region', { name: 'Booking decision', exact: true }))
    .toContainText('Decided by another staff member.');
  await expect(page.getByRole('button', { name: 'Record decision' })).toHaveCount(0);
  expect(fixture.reads.filter(path => path.endsWith(bookingId))).toHaveLength(2);
  expect(fixture.decisions).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-8 uncertain save requires refresh and does not submit the decision again', async ({ page }) => {
  const fixture = await bookingFixtures(page, 'VENUE_STAFF', { lostResponse: true });
  await page.goto(`/venue-bookings/${bookingId}`);
  await page.getByRole('radio', { name: 'Approve booking' }).check();
  await page.getByRole('button', { name: 'Record decision' }).click();
  await expect(page.getByRole('alert')).toContainText('We could not confirm whether your decision was recorded.');
  await expect(page.getByRole('button', { name: 'Record decision' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Refresh booking' }).click();
  await expect(page.getByRole('region', { name: 'Booking decision', exact: true })
    .getByText('Approved', { exact: true })).toBeVisible();
  expect(fixture.decisions).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-8 booking list and decision form fit a narrow screen without horizontal overflow', async ({ page }, testInfo) => {
  const fixture = await bookingFixtures(page, 'VENUE_STAFF', { bookings: [makeBooking({
    eventName: `Long event ${'a'.repeat(130)}`, venueName: `Long venue ${'b'.repeat(130)}`,
    notes: 'c'.repeat(300), venueRequirements: 'd'.repeat(300),
  })] });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/venue-bookings');
  await expect(page.getByRole('list', { name: 'Venue booking requests' }).getByRole('listitem')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('list', { name: 'Venue booking requests' }).getByRole('link').click();
  await expect(page.getByRole('radio', { name: 'Reject booking' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-venue-booking.png'), fullPage: true });
  expect(fixture.unexpected).toEqual([]);
});
