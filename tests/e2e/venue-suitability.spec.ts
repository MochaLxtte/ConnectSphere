import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';
import type { SuitabilityContext as VenueSuitabilityContext } from '../../backend/src/modules/venues/suitability-service.js';
import type { SuitabilityAssessment as VenueSuitabilityAssessment } from '../../backend/src/modules/venues/suitability-rules.js';
import type { VenueBooking } from '../../backend/src/modules/venues/booking-service.js';

const eventId = '52000000-0000-4000-8000-000000000001';
const venueId = '52000000-0000-4000-8000-000000000002';
const coordinatorId = '52000000-0000-4000-8000-000000000003';
const bookingId = '82000000-0000-4000-8000-000000000001';
const context = (): VenueSuitabilityContext => ({
  event: { id: eventId, name: 'Community workshop', startsAt: '2026-12-01T02:00:00.000Z',
    endsAt: '2026-12-01T06:00:00.000Z', expectedAttendance: 60,
    venueRequirements: 'A projector and Theatre seating', accessibilityNeeds: 'Step-free access' },
  requirementsVersion: 'a'.repeat(64),
  venues: [{ id: venueId, name: 'Harbour Hall', capacity: 80, facilities: ['Projector'],
    layouts: ['Theatre'], accessibilityFeatures: ['Step-free access'], wheelchairAccessible: true,
    opensAt: '08:00:00', closesAt: '22:00:00', setupMinutes: 0, turnaroundMinutes: 0 }],
});
const assessment = (outcome: VenueSuitabilityAssessment['outcome'] = 'SUITABLE'): VenueSuitabilityAssessment => ({
  eventId, eventName: 'Community workshop', venueId, venueName: 'Harbour Hall',
  checkedAt: '2026-10-04T12:00:00.000Z', outcome,
  checks: [
    { key: 'venueActive', status: 'PASS', message: 'The venue is active.' },
    { key: 'capacity', status: 'PASS', message: 'Expected attendance (60) fits the venue capacity (80).' },
    { key: 'facilities', status: 'PASS', message: 'All specified facilities are available.' },
    { key: 'accessibility', status: 'PASS', message: 'All specified accessibility requirements are met.' },
    { key: 'layout', status: 'PASS', message: 'The required layout is available.' },
    { key: 'availability', status: outcome === 'UNSUITABLE' ? 'FAIL' : 'PASS',
      message: outcome === 'UNSUITABLE' ? 'The venue is unavailable: an operational block overlaps the event period.'
        : 'The event period is within opening hours and has no overlapping approved booking or operational block.' },
    { key: 'requirements', status: outcome === 'NEEDS_REVIEW' ? 'UNKNOWN' : 'PASS',
      message: outcome === 'NEEDS_REVIEW' ? 'Some event requirements still need manual review.'
        : 'The coordinator confirmed the structured requirements and reported no unresolved requirements.' },
  ],
});

async function fixtures(page: Page, options: {
  role?: string | null; stale?: boolean; outcome?: VenueSuitabilityAssessment['outcome'];
  arrangement?: boolean;
} = {}) {
  const role = options.role === undefined ? 'EVENT_COORDINATOR' : options.role;
  const data = context();
  if (options.arrangement) {
    data.arrangement = { id: bookingId, venueId, startsAt: '2026-12-02T05:00:00.000Z',
      endsAt: '2026-12-02T07:00:00.000Z', layout: 'Banquet', notes: 'Portable stage for the evening session.', status: 'APPROVED' };
    data.venues[0]!.layouts.push('Banquet');
  }
  const submissions: Record<string, unknown>[] = [];
  const unexpected: string[] = [];
  let reads = 0;
  let nextOutcome = options.outcome ?? 'SUITABLE';
  // Browser fixtures check the real UI and routing. PostgreSQL integration tests separately
  // verify the calculation, assignment policy, authentication mapping and absence of writes.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const error = (code: string, message: string) => ({ error: { code, message } });
    if (method === 'GET' && path === '/api/auth/me') {
      await route.fulfill({ status: role ? 200 : 401, json: role ? { user: {
        id: coordinatorId, role, displayName: 'Test coordinator', email: 'coordinator@example.test',
      } } : error('AUTHENTICATION_REQUIRED', 'Sign in required.') });
    } else if (method === 'GET' && path === `/api/events/${eventId}` && role === 'EVENT_COORDINATOR') {
      await route.fulfill({ json: { ...data.event, status: 'APPROVED', coordinatorId,
        organiserId: '52000000-0000-4000-8000-000000000004', purpose: 'Welcome neighbours', description: null,
        equipmentRequirements: null, registrationRequired: false, createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z', review: null,
        actions: { canEditDraft: false, canMakeInitialDecision: false },
      } });
    } else if (options.arrangement && role === 'EVENT_COORDINATOR' && method === 'GET'
      && path === '/api/venue-bookings' && url.searchParams.get('eventRequestId') === eventId) {
      const booking: VenueBooking = {
        id: bookingId, eventRequestId: eventId, eventName: data.event.name, eventStatus: 'APPROVED',
        venueId, venueName: data.venues[0]!.name, status: 'APPROVED', startsAt: data.arrangement!.startsAt!, endsAt: data.arrangement!.endsAt!,
        layout: data.arrangement!.layout, notes: data.arrangement!.notes, eventStartsAt: data.event.startsAt, eventEndsAt: data.event.endsAt,
        purpose: null, description: null, expectedAttendance: data.event.expectedAttendance,
        venueRequirements: data.event.venueRequirements, accessibilityNeeds: data.event.accessibilityNeeds,
        decidedBy: null, decidedAt: null, decisionReason: null, holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
        cancelledBy: null, cancelledAt: null, cancellationReason: null, createdAt: '2026-10-01T01:00:00.000Z',
        updatedAt: '2026-10-01T01:00:00.000Z', recovery: [], replacesBookingId: null, replacedByBookingIds: [],
      };
      await route.fulfill({ json: { items: [booking] } });
    } else if (path === `/api/events/${eventId}/venue-suitability` && role === 'EVENT_COORDINATOR') {
      if (method === 'GET') {
        reads++;
        if (options.arrangement && url.searchParams.get('bookingId') !== bookingId) unexpected.push(`GET ${path}${url.search}`);
        await route.fulfill({ json: data });
      } else if (method === 'POST') {
        submissions.push(request.postDataJSON());
        if (options.stale && submissions.length === 1) {
          data.event.venueRequirements = 'A projector, Theatre seating and a stage';
          data.requirementsVersion = 'b'.repeat(64);
          await route.fulfill({ status: 409, json: error('SUITABILITY_CONTEXT_CHANGED', 'Requirements changed.') });
        } else {
          await route.fulfill({ json: { assessment: { ...assessment(nextOutcome), ...(options.arrangement ? { bookingId } : {}) } } });
        }
      } else {
        unexpected.push(`${method} ${path}`);
        await route.fulfill({ status: 501, json: error('UNEXPECTED_TEST_REQUEST', 'Unexpected method.') });
      }
    } else if (!(await fulfilWorkspaceRead(route, request,
      role === 'EVENT_COORDINATOR' ? { coordinatorBookingEventId: eventId } : {}))) {
      unexpected.push(`${method} ${path}`);
      await route.fulfill({ status: 501, json: error('UNEXPECTED_TEST_REQUEST', 'No fixture configured.') });
    }
  });
  return { data, submissions, unexpected, get reads() { return reads; },
    setOutcome(outcome: VenueSuitabilityAssessment['outcome']) { nextOutcome = outcome; } };
}

async function interpret(page: Page) {
  await page.getByRole('combobox', { name: 'Venue to assess', exact: true }).selectOption(venueId);
  await page.getByRole('textbox', { name: 'Required facilities', exact: true }).fill('Projector');
  await page.getByRole('textbox', { name: 'Required accessibility features', exact: true }).fill('Step-free access');
  await page.getByRole('combobox', { name: 'Required room layout', exact: true }).fill('Theatre');
  await page.getByRole('checkbox', { name: 'Wheelchair access is required', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Check suitability', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: /^I have reviewed the event requirements/ }).check();
}

test('KAN-52 running API requires login for context and assessment', async ({ request }) => {
  for (const response of [await request.get(`/api/events/${eventId}/venue-suitability`),
    await request.post(`/api/events/${eventId}/venue-suitability`, { data: {} })]) {
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});

test('KAN-52 review link opens event requirements and a recheck replaces the previous conclusion', async ({ page }, testInfo) => {
  const fixture = await fixtures(page);
  await page.goto(`/reviews/${eventId}`);
  await page.getByRole('link', { name: 'Check venue suitability', exact: true }).click();
  await expect(page.getByText('A projector and Theatre seating', { exact: true })).toBeVisible();
  await interpret(page);
  await page.getByRole('button', { name: 'Check suitability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Suitable', exact: true })).toBeVisible();
  expect(fixture.submissions).toEqual([{ venueId, requirementsVersion: 'a'.repeat(64), facilities: ['Projector'],
    accessibility: ['Step-free access'], layout: 'Theatre', wheelchairRequired: true,
    requirementsConfirmed: true, unresolvedRequirements: null }]);
  await page.screenshot({ path: testInfo.outputPath('venue-suitability-desktop.png'), fullPage: true });
  fixture.setOutcome('UNSUITABLE');
  await page.getByRole('button', { name: 'Recheck suitability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unsuitable', exact: true })).toBeVisible();
  await expect(page.getByText(/an operational block overlaps the event period/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suitable', exact: true })).toHaveCount(0);
  expect(fixture.submissions).toHaveLength(2);
  await page.getByRole('link', { name: 'Back to event request', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Community workshop', exact: true })).toBeVisible();
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-82 arrangement link checks the saved period and layout while keeping parent requirements and booking actions separate', async ({ page }) => {
  const fixture = await fixtures(page, { arrangement: true, outcome: 'NEEDS_REVIEW' });
  await page.goto(`/reviews/${eventId}`);
  await page.getByRole('link', { name: 'Check suitability', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/reviews/${eventId}/venue-suitability\\?bookingId=${bookingId}$`));
  const saved = page.getByRole('region', { name: 'Saved arrangement', exact: true });
  await expect(saved.getByText('2 Dec 2026, 1:00 pm', { exact: true })).toBeVisible();
  await expect(saved.getByText('2 Dec 2026, 3:00 pm', { exact: true })).toBeVisible();
  await expect(saved.getByText('Portable stage for the evening session.', { exact: true })).toBeVisible();
  await expect(page.getByText('1 Dec 2026, 10:00 am', { exact: true })).toBeVisible();
  await expect(page.getByText('A projector and Theatre seating', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Venue to assess', exact: true })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Saved room layout', exact: true })).toHaveValue('Banquet');
  await expect(page.getByRole('textbox', { name: 'Saved room layout', exact: true })).toHaveAttribute('readonly');
  await page.getByRole('textbox', { name: 'Required facilities', exact: true }).fill('Projector\nPortable stage');
  await page.getByRole('textbox', { name: 'Required accessibility features', exact: true }).fill('Step-free access');
  await page.getByRole('textbox', { name: 'Requirements that still need clarification', exact: true }).fill('Clarify parent Theatre requirement for this Banquet arrangement.');
  await expect(page.getByRole('button', { name: 'Check suitability', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: /^I have reviewed the event requirements and saved arrangement notes/ }).check();
  await page.getByRole('button', { name: 'Check suitability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Needs review', exact: true })).toBeVisible();
  expect(fixture.submissions).toEqual([{
    bookingId, venueId, requirementsVersion: fixture.data.requirementsVersion, facilities: ['Projector', 'Portable stage'],
    accessibility: ['Step-free access'], layout: 'Banquet', wheelchairRequired: false, requirementsConfirmed: true,
    unresolvedRequirements: 'Clarify parent Theatre requirement for this Banquet arrangement.',
  }]);
  await expect(page.getByText(/does not reserve a venue or change the event request/)).toBeVisible();
  await page.getByRole('link', { name: 'Back to event request', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel arrangement', exact: true })).toBeVisible();
  expect(fixture.reads).toBe(1);
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-52 changed event requirements clear the old interpretation and require confirmation again', async ({ page }) => {
  const fixture = await fixtures(page, { stale: true });
  await page.goto(`/reviews/${eventId}/venue-suitability`);
  await interpret(page);
  await page.getByRole('button', { name: 'Check suitability', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('The event requirements have changed.');
  await expect(page.getByText('A projector, Theatre seating and a stage', { exact: true })).toBeVisible();
  expect(fixture.reads).toBe(2);
  expect(fixture.submissions).toHaveLength(1);
  await page.getByRole('combobox', { name: 'Venue to assess', exact: true }).selectOption(venueId);
  await expect(page.getByRole('textbox', { name: 'Required facilities', exact: true })).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: /^I have reviewed/ })).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Check suitability', exact: true })).toBeDisabled();
  expect(fixture.unexpected).toEqual([]);
});

test('KAN-52 unresolved requirements show Needs review and editing clears the conclusion', async ({ page }) => {
  const fixture = await fixtures(page, { outcome: 'NEEDS_REVIEW' });
  await page.goto(`/reviews/${eventId}/venue-suitability`);
  await interpret(page);
  await page.getByRole('textbox', { name: 'Requirements that still need clarification', exact: true }).fill('Confirm stage dimensions.');
  await page.getByRole('checkbox', { name: /^I have reviewed/ }).check();
  await page.getByRole('button', { name: 'Check suitability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Needs review', exact: true })).toBeVisible();
  await expect(page.getByText('Some event requirements still need manual review.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Required facilities', exact: true }).fill('Projector\nStage');
  await expect(page.getByRole('heading', { name: 'Needs review', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check suitability', exact: true })).toBeDisabled();
  expect(fixture.submissions).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

for (const role of ['EVENT_ORGANISER', 'VENUE_STAFF', null]) {
  test(`KAN-52 ${role ?? 'signed-out visitor'} cannot open the assessment or read its data`, async ({ page }) => {
    const fixture = await fixtures(page, { role });
    await page.goto(`/reviews/${eventId}/venue-suitability`);
    await expect(page.getByRole('heading', { name: role ? 'Coordinator access only' : 'Sign in required', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Community workshop', exact: true })).toHaveCount(0);
    expect(fixture.reads).toBe(0);
    expect(fixture.submissions).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });
}

test('KAN-52 assessment works on a narrow screen without horizontal overflow', async ({ page }, testInfo) => {
  const fixture = await fixtures(page);
  fixture.data.event.venueRequirements = `Projector ${'a'.repeat(200)}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/reviews/${eventId}/venue-suitability`);
  await interpret(page);
  await page.getByRole('button', { name: 'Check suitability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Suitable', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('venue-suitability-mobile.png'), fullPage: true });
  expect(fixture.unexpected).toEqual([]);
});
