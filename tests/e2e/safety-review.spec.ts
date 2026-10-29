import type { Page, Request, Route } from '@playwright/test';
import { expect, test } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

// Browser-boundary checks with substituted API responses; the server rules, staleness, locking
// and notifications are covered by database/tests/safety/safety-reviews.integration.test.ts.
const organiser = { id: '10000000-0000-4000-8000-000000000084', email: 'organiser@example.test', displayName: 'Test organiser', role: 'EVENT_ORGANISER' };
const coordinator = { id: '20000000-0000-4000-8000-000000000084', email: 'coordinator@example.test', displayName: 'Casey Coordinator', role: 'EVENT_COORDINATOR' };
const officer = { id: '40000000-0000-4000-8000-000000000084', email: 'safety@example.test', displayName: 'Sam Safety', role: 'SAFETY_OFFICER' };
const eventId = '30000000-0000-4000-8000-000000000084';
const reviewId = '50000000-0000-4000-8000-000000000084';
const fingerprint = 'c'.repeat(32);

const event = {
  id: eventId, organiserId: organiser.id, coordinatorId: coordinator.id, status: 'CONFIRMED',
  name: 'Graduation dinner', purpose: 'Celebration', description: 'Annual dinner',
  startsAt: '2035-01-01T10:00:00.000Z', endsAt: '2035-01-01T14:00:00.000Z', expectedAttendance: 120,
  venueRequirements: 'Ballroom', accessibilityNeeds: null, equipmentRequirements: 'Speakers',
  registrationRequired: false, registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null,
  revision: 2, createdAt: '2034-10-01T00:00:00Z', updatedAt: '2034-10-02T00:00:00Z',
  review: { reviewId: 'r1', eventRequestId: eventId, reviewedBy: coordinator.id, decision: 'APPROVED', reason: null, createdAt: '2034-10-03T00:00:00Z' },
  actions: { canEditDraft: false, canMakeInitialDecision: false, canEditDetails: false, editMode: null, editableFields: [] },
};
const round = (status: string, extra: Record<string, unknown> = {}) => ({ id: reviewId, round: 1, status,
  emergencyAccess: 'East exits', equipmentPlacement: null, crowdMovement: 'One-way to the foyer', submittedByName: 'Casey Coordinator',
  submittedAt: '2034-12-01T02:00:00.000Z', decidedByName: null, decidedAt: null, decisionNotes: null, requestedAreas: null,
  missingNotes: ['equipmentPlacement'], ...extra });
const safety = (overrides: Record<string, unknown>) => ({ eventRequestId: eventId, eventStatus: 'CONFIRMED', outcome: 'NONE',
  readiness: { ready: true, checks: [] }, pendingStale: false, rounds: [], unresolvedAreas: [], preparation: null, canSubmit: false, canStartPreparation: false, ...overrides });
const apiRoute = (url: URL) => url.pathname.startsWith('/api/');

async function stubApi(page: Page, user: object, handle: (path: string, request: Request, route: Route) => Promise<boolean>) {
  await page.route(apiRoute, async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path === '/api/auth/me') await route.fulfill({ json: { user } });
    else if (await handle(path, request, route)) return;
    else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: eventId }))) {
      await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'Unexpected request' } } });
    }
  });
}

test('KAN-84-AC2/AC3 coordinator submits safety notes and sees the round awaiting the officer after reload', async ({ page }) => {
  let submitted = false;
  const writes: unknown[] = [];
  await stubApi(page, coordinator, async (path, request, route) => {
    if (path === `/api/events/${eventId}`) await route.fulfill({ json: event });
    else if (path === `/api/events/${eventId}/safety`) {
      await route.fulfill({ json: submitted ? safety({ outcome: 'PENDING', rounds: [round('PENDING')] }) : safety({ canSubmit: true }) });
    } else if (path === `/api/events/${eventId}/safety-reviews` && request.method() === 'POST') {
      writes.push(request.postDataJSON()); submitted = true;
      await route.fulfill({ status: 201, json: { eventRequestId: eventId, review: round('PENDING') } });
    } else return false;
    return true;
  });
  await page.goto(`/reviews/${eventId}`);
  const panel = page.getByRole('region', { name: 'Safety review' });
  await panel.getByLabel('Emergency access').fill('East exits');
  await panel.getByLabel('Crowd movement').fill('One-way to the foyer');
  await expect(panel).toContainText('missing: Equipment placement');
  await panel.getByRole('button', { name: 'Submit for safety review' }).click();
  await expect(panel.getByText('Round 1 was sent to the Safety Officer.')).toBeVisible();
  expect(writes).toEqual([{ emergencyAccess: 'East exits', equipmentPlacement: '', crowdMovement: 'One-way to the foyer' }]);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Safety review' }).getByTestId('safety-outcome')).toHaveText('Awaiting Safety Officer');
});

test('KAN-84-AC1/AC4/AC6 Safety Officer opens the queue, sees missing information and requests technical changes', async ({ page }, testInfo) => {
  let decided = false;
  const decisions: unknown[] = [];
  const detail = () => ({ review: { ...round(decided ? 'CHANGES_REQUESTED' : 'PENDING', decided ? { decidedByName: 'Sam Safety',
      decidedAt: '2034-12-02T02:00:00.000Z', decisionNotes: 'Move speakers away from exits.', requestedAreas: ['TECHNICAL'] } : {}), fingerprint },
    stale: false, canDecide: !decided,
    event: { id: eventId, name: 'Graduation dinner', status: 'CONFIRMED', startsAt: event.startsAt, endsAt: event.endsAt, expectedAttendance: 120,
      venueRequirements: 'Ballroom', accessibilityNeeds: null, equipmentRequirements: 'Speakers', equipmentPlanStatus: 'REQUIRED' },
    venues: [{ bookingId: 'b1', name: 'Grand Hall', location: 'Level 1', capacity: 150, layouts: ['Banquet'], accessibilityFeatures: ['Ramp'],
      wheelchairAccessible: true, bookedLayout: 'Banquet', status: 'APPROVED', needsRecovery: false,
      opensAt: '09:00:00', closesAt: '23:00:00', setupMinutes: 15, turnaroundMinutes: 20 }],
    equipment: [{ id: 'q1', name: 'Speaker', quantity: 2, status: 'RESERVED' }], readiness: { ready: true, checks: [] }, rounds: [] });
  await stubApi(page, officer, async (path, request, route) => {
    if (path === '/api/safety-reviews') await route.fulfill({ json: { items: decided ? [] : [{ id: reviewId, round: 1, eventId,
      eventName: 'Graduation dinner', startsAt: event.startsAt, submittedAt: '2034-12-01T02:00:00.000Z', stale: false }] } });
    else if (path === `/api/safety-reviews/${reviewId}`) await route.fulfill({ json: detail() });
    else if (path === `/api/safety-reviews/${reviewId}/decision`) {
      decisions.push(request.postDataJSON()); decided = true;
      await route.fulfill({ json: { changed: true, review: detail().review } });
    } else return false;
    return true;
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Safety reviews' }).click();
  await page.getByRole('link', { name: /Graduation dinner · round 1/ }).click();
  await expect(page.getByText('Missing — not provided by the coordinator')).toBeVisible();
  await expect(page.getByText(/Advisory venue suitability is not a safety approval/)).toBeVisible();
  await page.getByLabel('Request changes').check();
  await page.getByLabel('Technical').check();
  await page.getByLabel(/Notes/).fill('Move speakers away from exits.');
  await page.getByRole('button', { name: 'Save decision' }).click();
  await expect(page.getByText('Decision saved: Changes requested.')).toBeVisible();
  await expect(page.getByText(/Decided by Sam Safety/)).toBeVisible();
  expect(decisions).toEqual([{ decision: 'CHANGES_REQUESTED', notes: 'Move speakers away from exits.', areas: ['TECHNICAL'], fingerprint }]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('officer-mobile.png'), fullPage: true });
});

test('KAN-84-AC8/AC9 preparation starts on current approval and the organiser sees it blocked after a change', async ({ page }) => {
  let started = false;
  await stubApi(page, coordinator, async (path, request, route) => {
    if (path === `/api/events/${eventId}`) await route.fulfill({ json: event });
    else if (path === `/api/events/${eventId}/safety`) {
      await route.fulfill({ json: safety({ outcome: 'APPROVED', rounds: [round('APPROVED')], canStartPreparation: !started,
        preparation: started ? { startedAt: '2034-12-03T02:00:00.000Z', startedByName: 'Casey Coordinator', blocked: false } : null }) });
    } else if (path === `/api/events/${eventId}/preparation/start` && request.method() === 'POST') {
      started = true; await route.fulfill({ json: { eventRequestId: eventId, changed: true } });
    } else return false;
    return true;
  });
  await page.goto(`/reviews/${eventId}`);
  const panel = page.getByRole('region', { name: 'Safety review' });
  await panel.getByRole('button', { name: 'Start preparation' }).click();
  await expect(panel.getByTestId('preparation-status')).toContainText('Preparation started by Casey Coordinator');

  // Switch the API persona without removing shared isolation (including the remote-font stub).
  await page.unroute(apiRoute);
  await stubApi(page, organiser, async (path, _request, route) => {
    if (path === `/api/events/${eventId}`) await route.fulfill({ json: event });
    else if (path === `/api/events/${eventId}/safety`) {
      await route.fulfill({ json: safety({ outcome: 'STALE', rounds: [round('APPROVED')],
        preparation: { startedAt: '2034-12-03T02:00:00.000Z', startedByName: 'Casey Coordinator', blocked: true } }) });
    } else return false;
    return true;
  });
  await page.goto(`/events/${eventId}`);
  const organiserPanel = page.getByRole('region', { name: 'Safety review' });
  await expect(organiserPanel.getByTestId('safety-outcome')).toHaveText('Approval out of date');
  await expect(organiserPanel.getByTestId('preparation-status')).toContainText('Preparation blocked');
  await expect(organiserPanel.getByRole('button')).toHaveCount(0);
});
