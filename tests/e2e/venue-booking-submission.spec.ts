import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';
import type { VenueBooking } from '../../backend/src/modules/venues/booking-service.js';

const eventId = '53000000-0000-4000-8000-000000000001';
const venueId = '53000000-0000-4000-8000-000000000002';
const bookingId = '53000000-0000-4000-8000-000000000003';
const coordinatorId = '53000000-0000-4000-8000-000000000004';
const staffId = '53000000-0000-4000-8000-000000000005';
const organiserId = '53000000-0000-4000-8000-000000000006';
type Role = 'EVENT_COORDINATOR' | 'VENUE_STAFF' | 'EVENT_ORGANISER';
const event = {
  id: eventId, organiserId, coordinatorId, status: 'APPROVED', name: 'Community workshop',
  purpose: 'Welcome neighbours', description: 'A community gathering.',
  startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z', expectedAttendance: 60,
  venueRequirements: 'Projector and Theatre seating', accessibilityNeeds: 'Step-free access',
  equipmentRequirements: null, registrationRequired: false,
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', review: null,
  actions: { canEditDraft: false, canMakeInitialDecision: false },
};
const venue = {
  id: venueId, name: 'Harbour Hall', capacity: 80, description: null, location: 'Level 1',
  layouts: ['Theatre'], facilities: ['Projector'], accessibilityFeatures: ['Step-free access'],
  wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00', updatedAt: '2026-10-01T00:00:00.000Z',
};

async function fixtures(page: Page, options: {
  conflict?: 'VENUE_BOOKING_CONFLICT' | 'VENUE_UNAVAILABLE'; lostResponse?: boolean; role?: Role;
} = {}) {
  let role: Role = options.role ?? 'EVENT_COORDINATOR';
  let booking: VenueBooking | undefined;
  const submissions: Record<string, unknown>[] = [];
  const decisions: Record<string, unknown>[] = [];
  const unexpected: string[] = [];
  const error = (code: string, message: string) => ({ error: { code, message } });
  // All authenticated API responses here are fixtures. Real PostgreSQL tests separately
  // establish persistence, authorization, submission conflicts and concurrent decisions.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    if (method === 'GET' && path === '/api/auth/me') {
      const id = role === 'EVENT_COORDINATOR' ? coordinatorId : role === 'VENUE_STAFF' ? staffId : organiserId;
      await route.fulfill({ json: { user: { id, role, email: `${id}@example.test`, displayName: `Test ${role}` } } });
    } else if (method === 'GET' && path === `/api/events/${eventId}` && role !== 'VENUE_STAFF') {
      await route.fulfill({ json: event });
    } else if (method === 'GET' && path === '/api/venues/search-venues' && role === 'EVENT_COORDINATOR' && !url.search) {
      await route.fulfill({ json: { items: [venue] } });
    } else if (method === 'GET' && path === '/api/venue-bookings' && role !== 'EVENT_ORGANISER'
      && (!url.search || url.search === `?eventRequestId=${eventId}`)) {
      await route.fulfill({ json: { items: booking && (role === 'EVENT_COORDINATOR' || booking.status === 'PENDING') ? [booking] : [] } });
    } else if (method === 'GET' && path === `/api/venue-bookings/${bookingId}` && role !== 'EVENT_ORGANISER' && booking) {
      await route.fulfill({ json: { booking } });
    } else if (method === 'POST' && path === `/api/events/${eventId}/venue-bookings` && role === 'EVENT_COORDINATOR') {
      const input = request.postDataJSON() as { venueId: string; startsAt: string; endsAt: string; layout: string | null; notes: string | null };
      submissions.push(input);
      if (options.conflict) {
        await route.fulfill({ status: 409, json: error(options.conflict, options.conflict === 'VENUE_UNAVAILABLE'
          ? 'The venue is blocked during this period.' : 'The venue already has an approved booking during this period.') });
        return;
      }
      booking = {
        id: bookingId, eventRequestId: eventId, eventName: event.name, eventStatus: 'APPROVED',
        venueId: input.venueId, venueName: venue.name, status: 'PENDING', startsAt: input.startsAt, endsAt: input.endsAt,
        layout: input.layout, notes: input.notes, decidedBy: null, decidedAt: null, decisionReason: null,
        createdAt: '2026-10-05T00:00:00.000Z', updatedAt: '2026-10-05T00:00:00.000Z',
        eventStartsAt: event.startsAt, eventEndsAt: event.endsAt, purpose: event.purpose, description: event.description,
        expectedAttendance: event.expectedAttendance, venueRequirements: event.venueRequirements, accessibilityNeeds: event.accessibilityNeeds,
        recovery: [], replacesBookingId: null, replacedByBookingIds: [],
        holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
        cancelledBy: null, cancelledAt: null, cancellationReason: null,
      };
      await route.fulfill(options.lostResponse
        ? { status: 500, json: error('INTERNAL_ERROR', 'The response was lost.') }
        : { status: 201, json: { booking } });
    } else if (method === 'POST' && path === `/api/venue-bookings/${bookingId}/decision` && role === 'VENUE_STAFF' && booking) {
      const input = request.postDataJSON() as { decision: 'APPROVED' | 'REJECTED'; reason: string | null };
      decisions.push(input);
      Object.assign(booking, { status: input.decision, decisionReason: input.reason, decidedBy: staffId,
        decidedAt: '2026-10-05T01:00:00.000Z', updatedAt: '2026-10-05T01:00:00.000Z' });
      await route.fulfill({ json: { booking } });
    } else if (!(await fulfilWorkspaceRead(route, request, role === 'EVENT_COORDINATOR' ? { coordinatorBookingEventId: eventId } : {}))) {
      unexpected.push(`${method} ${path}${url.search}`);
      await route.fulfill({ status: 501, json: error('UNEXPECTED_TEST_REQUEST', 'No fixture configured.') });
    }
  });
  return { submissions, decisions, unexpected, get booking() { return booking; },
    asRole(next: Role) { role = next; } };
}

async function fillSubmission(page: Page) {
  const panel = page.getByRole('region', { name: 'Venue booking requests', exact: true });
  await panel.getByRole('combobox', { name: 'Venue', exact: true }).selectOption(venueId);
  await panel.getByLabel('Starts (Singapore time)', { exact: true }).fill('2026-12-01T10:00');
  await panel.getByLabel('Ends (Singapore time)', { exact: true }).fill('2026-12-01T14:00');
  await panel.getByRole('textbox', { name: 'Room layout (optional)', exact: true }).fill('Theatre');
  await panel.getByRole('textbox', { name: 'Notes for Venue Staff (optional)', exact: true }).fill('Projector required');
  await panel.getByRole('button', { name: 'Request this venue', exact: true }).click();
  return panel;
}

test('KAN-53 running API requires login for venue booking submission', async ({ request }) => {
  const response = await request.post(`/api/events/${eventId}/venue-bookings`, { data: {} });
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
});

for (const decision of ['APPROVED', 'REJECTED'] as const) {
  test(`KAN-53 submitted booking reaches venue staff and its ${decision.toLowerCase()} outcome returns to the coordinator`, async ({ page }, testInfo) => {
    const fixture = await fixtures(page);
    await page.goto(`/reviews/${eventId}`);
    const panel = await fillSubmission(page);
    await expect(panel.getByText('Pending', { exact: true })).toBeVisible();
    await expect(panel.getByText('A venue booking request for Harbour Hall was submitted for review.', { exact: true })).toBeVisible();
    expect(fixture.submissions).toEqual([{
      venueId, startsAt: event.startsAt, endsAt: event.endsAt, layout: 'Theatre', notes: 'Projector required',
    }]);
    expect(fixture.booking?.status).toBe('PENDING');
    fixture.asRole('VENUE_STAFF');
    await page.goto('/venue-bookings');
    await page.getByRole('link', { name: 'Community workshop · Harbour Hall', exact: true }).click();
    await expect(page.getByText('Projector and Theatre seating', { exact: true })).toBeVisible();
    await page.getByRole('radio', { name: decision === 'APPROVED' ? 'Approve booking' : 'Reject booking', exact: true }).check();
    const reason = decision === 'REJECTED' ? 'The requested room layout is unavailable.' : 'Venue reserved for the requested period.';
    await page.getByRole('textbox', { name: 'Reason or information (optional)', exact: true }).fill(reason);
    await page.getByRole('button', { name: 'Record decision', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Booking decision', exact: true })).toContainText(reason);
    fixture.asRole('EVENT_COORDINATOR');
    await page.goto(`/reviews/${eventId}`);
    const outcome = decision === 'APPROVED' ? 'Approved' : 'Rejected';
    await expect(panel.getByText(outcome, { exact: true })).toBeVisible();
    await expect(panel.getByText(`Decision note: ${reason}`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(panel.getByText(outcome, { exact: true })).toBeVisible();
    expect(fixture.decisions).toEqual([{ decision, reason }]);
    expect(fixture.booking?.eventStatus).toBe('APPROVED');
    expect(fixture.unexpected).toEqual([]);
    if (decision === 'APPROVED') {
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('submitted-booking-approved-outcome.png'), fullPage: true });
    }
  });
}

for (const conflict of ['VENUE_BOOKING_CONFLICT', 'VENUE_UNAVAILABLE'] as const) {
  test(`KAN-53 ${conflict} keeps the entered request and displays useful feedback`, async ({ page }) => {
    const fixture = await fixtures(page, { conflict });
    await page.goto(`/reviews/${eventId}`);
    const panel = await fillSubmission(page);
    await expect(panel.getByRole('alert')).toContainText(conflict === 'VENUE_UNAVAILABLE'
      ? 'blocked during this period' : 'already has an approved booking');
    await expect(panel.getByRole('combobox', { name: 'Venue', exact: true })).toHaveValue(venueId);
    await expect(panel.getByText('No venue has been requested for this event yet.', { exact: true })).toBeVisible();
    expect(fixture.booking).toBeUndefined();
    expect(fixture.submissions).toHaveLength(1);
    expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-53 uncertain submission refreshes a saved pending request without another write', async ({ page }) => {
  const fixture = await fixtures(page, { lostResponse: true });
  await page.goto(`/reviews/${eventId}`);
  const panel = await fillSubmission(page);
  await expect(panel.getByRole('alert')).toContainText('could not confirm whether the booking request was saved');
  await expect(panel.getByRole('button', { name: 'Request this venue', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Refresh booking requests', exact: true }).click();
  await expect(panel.getByText('Pending', { exact: true })).toBeVisible();
  await expect(panel.getByRole('combobox', { name: 'Venue', exact: true })).toHaveValue('');
  expect(fixture.submissions).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-53 organiser detail does not mount the private booking panel or request its APIs', async ({ page }) => {
  const fixture = await fixtures(page, { role: 'EVENT_ORGANISER' });
  await page.goto(`/events/${eventId}`);
  await expect(page.getByRole('heading', { name: 'Community workshop', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Venue booking requests', exact: true })).toHaveCount(0);
  expect(fixture.submissions).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});
