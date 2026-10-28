import type { Page, Request, Route } from '@playwright/test';
import { expect, test } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

// Browser-boundary checks with substituted API responses; the server rules and PostgreSQL
// behaviour are covered by database/tests/events/change-requests.integration.test.ts.
const organiser = { id: '10000000-0000-4000-8000-000000000015', email: 'organiser@example.test', displayName: 'Test organiser', role: 'EVENT_ORGANISER' };
const coordinator = { id: '20000000-0000-4000-8000-000000000015', email: 'coordinator@example.test', displayName: 'Test coordinator', role: 'EVENT_COORDINATOR' };
const eventId = '30000000-0000-4000-8000-000000000015';

const approvedEvent = {
  id: eventId, organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED',
  name: 'Career fair', purpose: 'Hiring', description: 'Annual fair',
  startsAt: '2026-12-01T01:00:00.000Z', endsAt: '2026-12-01T09:00:00.000Z', expectedAttendance: 200,
  venueRequirements: 'Hall A', accessibilityNeeds: null, equipmentRequirements: null,
  registrationRequired: false, registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null,
  revision: 4, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z',
  review: { reviewId: 'r1', eventRequestId: eventId, reviewedBy: coordinator.id, decision: 'APPROVED', reason: null, createdAt: '2026-10-03T00:00:00Z' },
  actions: { canEditDraft: false, canMakeInitialDecision: false, canEditDetails: false, editMode: null, editableFields: [] },
};

function pendingRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: '40000000-0000-4000-8000-000000000015', eventRequestId: eventId, status: 'PENDING',
    requestedById: organiser.id, requestedByName: 'Test organiser',
    proposed: { expectedAttendance: 260 }, previous: { expectedAttendance: 200 }, baseRevision: 4,
    decidedById: null, decidedByName: null, decidedAt: null, decisionReason: null, appliedRevision: null,
    cancelledArrangements: null, createdAt: '2026-10-27T02:00:00.000Z',
    current: { expectedAttendance: 200 }, outdated: false,
    impact: {
      affectedKinds: ['VENUE'], confirmed: [], activeRegistrations: 0, eventConfirmed: false, canApprove: true, blockedReason: null,
      pending: [{ kind: 'VENUE_BOOKING', id: 'b1', label: 'Hall A', status: 'PENDING', quantity: null }],
    },
    ...overrides,
  };
}

async function stubApi(
  page: Page, user: object,
  handle: (path: string, request: Request, route: Route) => Promise<boolean>,
) {
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path === '/api/auth/me') await route.fulfill({ json: { user } });
    else if (await handle(path, request, route)) return;
    else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: eventId }))) {
      await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'Unexpected request' } } });
    }
  });
}

test('KAN-15-AC1/AC2 organiser requests a change and sees it pending while the event is unchanged', async ({ page }) => {
  let items: unknown[] = [];
  const submissions: unknown[] = [];
  await stubApi(page, organiser, async (path, request, route) => {
    if (path === `/api/events/${eventId}`) await route.fulfill({ json: approvedEvent });
    else if (path === `/api/events/${eventId}/change-requests` && request.method() === 'GET') await route.fulfill({ json: { items } });
    else if (path === `/api/events/${eventId}/change-requests`) {
      submissions.push(request.postDataJSON());
      items = [pendingRequest()];
      await route.fulfill({ status: 201, json: items[0] });
    } else return false;
    return true;
  });

  await page.goto(`/events/${eventId}`);
  await page.getByRole('link', { name: 'Request a change' }).click();
  await expect(page.getByLabel(/^Expected attendance/)).toHaveValue('200');
  await expect(page.getByLabel(/Event name/)).toHaveCount(0);
  await page.getByLabel(/^Expected attendance/).fill('260');
  await page.getByRole('button', { name: 'Send change request' }).click();

  await expect(page).toHaveURL(`/events/${eventId}`);
  await expect(page.getByText('Awaiting review')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Withdraw change request' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Request a change' })).toHaveCount(0);
  expect(submissions).toEqual([{ changes: { expectedAttendance: 260 }, expectedRevision: 4 }]);
});

test('KAN-15-AC3/AC4/AC6 coordinator compares values, sees affected arrangements and approves', async ({ page }) => {
  let items: unknown[] = [pendingRequest()];
  const decisions: unknown[] = [];
  await stubApi(page, coordinator, async (path, request, route) => {
    if (path === `/api/events/${eventId}`) await route.fulfill({ json: approvedEvent });
    else if (path === `/api/events/${eventId}/change-requests`) await route.fulfill({ json: { items } });
    else if (path.endsWith('/decision')) {
      decisions.push(request.postDataJSON());
      items = [pendingRequest({ status: 'APPROVED', decidedByName: 'Test coordinator', decidedAt: '2026-10-27T03:00:00.000Z',
        appliedRevision: 5, cancelledArrangements: { venueBookings: ['b1'], equipmentRequests: [] },
        current: undefined, outdated: undefined, impact: undefined })];
      await route.fulfill({ json: items[0] });
    } else return false;
    return true;
  });

  await page.goto(`/reviews/${eventId}`);
  const row = page.getByRole('row', { name: /Expected attendance/ });
  await expect(row.getByRole('cell')).toHaveText(['200', '260']);
  await expect(page.getByRole('list', { name: 'Pending arrangements cancelled on approval' })).toContainText('Venue booking at Hall A');
  await page.getByRole('button', { name: 'Approve and apply' }).click();
  await expect(page.getByText('The change was approved and applied to the event.')).toBeVisible();
  await expect(page.getByText('1 pending arrangement was cancelled for resubmission.')).toBeVisible();
  expect(decisions).toEqual([{ decision: 'APPROVED', expectedRevision: 4 }]);
});

test('KAN-15-AC8/AC103 coordinator cannot approve a change that affects confirmed arrangements', async ({ page }) => {
  const blocked = pendingRequest({ impact: {
    affectedKinds: ['VENUE', 'EQUIPMENT', 'REGISTRATION'], pending: [], activeRegistrations: 0, eventConfirmed: false, canApprove: false,
    confirmed: [{ kind: 'VENUE_BOOKING', id: 'b2', label: 'Hall A', status: 'APPROVED', quantity: null }],
    blockedReason: 'This change cannot be approved because it affects confirmed venue or equipment arrangements. Cancel the event and submit a new request instead.',
  } });
  await stubApi(page, coordinator, async (path, _request, route) => {
    if (path === `/api/events/${eventId}`) await route.fulfill({ json: approvedEvent });
    else if (path === `/api/events/${eventId}/change-requests`) await route.fulfill({ json: { items: [blocked] } });
    else return false;
    return true;
  });

  await page.goto(`/reviews/${eventId}`);
  await expect(page.getByText(/affects confirmed venue or equipment arrangements/)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Confirmed arrangements affected' })).toContainText('Venue booking at Hall A (approved)');
  await expect(page.getByRole('button', { name: 'Approve and apply' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reject change' })).toBeDisabled();
  await page.getByLabel('Reason for rejecting').fill('Please cancel and resubmit.');
  await expect(page.getByRole('button', { name: 'Reject change' })).toBeEnabled();
});
