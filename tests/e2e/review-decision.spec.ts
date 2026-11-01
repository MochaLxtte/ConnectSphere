import { expect, test } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

const requestId = '10000000-0000-4000-8000-000000000036';
const coordinatorId = '10000000-0000-4000-8000-000000000025';
const detail = {
  id: requestId,
  organiserId: '10000000-0000-4000-8000-000000000031',
  coordinatorId,
  status: 'SUBMITTED',
  name: 'Community workshop',
  purpose: 'Bring neighbours together',
  description: 'An introductory community workshop.',
  startsAt: '2026-10-01T01:00:00.000Z',
  endsAt: '2026-10-01T03:00:00.000Z',
  expectedAttendance: 25,
  venueRequirements: 'One seminar room',
  accessibilityNeeds: null,
  equipmentRequirements: null,
  registrationRequired: false,
  createdAt: '2026-09-15T01:00:00.000Z',
  updatedAt: '2026-09-15T01:00:00.000Z',
};
const user = {
  id: coordinatorId,
  email: 'coordinator@example.test',
  displayName: 'Test coordinator',
  role: 'EVENT_COORDINATOR',
};

test('KAN-67 review shortcuts are visibly linked, keyboard accessible and fit mobile', async ({ page }, testInfo) => {
  const unexpected: string[] = [];
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path === '/api/auth/me') {
      await route.fulfill({ json: { user } });
    } else if (request.method() === 'GET' && path === `/api/events/${requestId}`) {
      await route.fulfill({ json: { ...detail, status: 'APPROVED', review: null,
        actions: { canEditDraft: false, canEditDetails: true, canMakeInitialDecision: false } } });
    } else if (request.method() === 'GET' && path === `/api/events/${requestId}/registrations`) {
      await route.fulfill({ json: { eventId: requestId, eventName: detail.name, activeCount: 0, items: [] } });
    } else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: requestId }))) {
      unexpected.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 501, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: path } } });
    }
  });
  await page.goto(`/reviews/${requestId}`);
  const summary = page.getByRole('region', { name: detail.name, exact: true });
  const labels = ['Edit name or description', 'Check venue suitability', 'View registrations',
    'Check venue availability for this week', 'View venue booking requests and decisions'];
  for (const label of labels) {
    const link = summary.getByRole('link', { name: label, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveCSS('text-decoration-line', 'underline');
  }
  await summary.getByRole('link', { name: labels[0], exact: true }).focus();
  for (const label of labels.slice(1)) {
    await page.keyboard.press('Tab');
    const link = summary.getByRole('link', { name: label, exact: true });
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS('outline-style', 'solid');
  }
  await summary.screenshot({ path: testInfo.outputPath('review-links-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await summary.screenshot({ path: testInfo.outputPath('review-links-mobile.png') });
  const registrations = summary.getByRole('link', { name: 'View registrations', exact: true });
  await registrations.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/events/${requestId}/registrations$`));
  await expect(page.getByRole('heading', { name: 'Event registrations', exact: true })).toBeVisible();
  expect(unexpected).toEqual([]);
});

const decisions = [
  { decision: 'APPROVED', choice: 'Approve request', button: 'Record approval', outcome: 'Request approved' },
  { decision: 'REJECTED', choice: 'Reject request', button: 'Record rejection', outcome: 'Request rejected' },
] as const;
const scenarios = ['SUBMITTED', 'UNDER_REVIEW'].flatMap((initialStatus) =>
  decisions.map((decision) => ({ ...decision, initialStatus })));

for (const scenario of scenarios) {
  test(`KAN-36 ${scenario.initialStatus} to ${scenario.decision.toLowerCase()} outcome and reason survive a browser reload`, async ({ page }, testInfo) => {
    // All API responses are fixtures. This checks browser wiring, not live login or database persistence.
    const reason = scenario.decision === 'APPROVED'
      ? 'Suitable venue and programme.'
      : 'The proposed venue is unsuitable.';
    const savedReview = {
      reviewId: '10000000-0000-4000-8000-000000000037',
      eventRequestId: requestId,
      reviewedBy: coordinatorId,
      decision: scenario.decision,
      reason,
    };
    let saved = false;
    let detailReads = 0;
    const submissions: unknown[] = [];
    const unexpectedRequests: string[] = [];

    await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'GET' && path === '/api/auth/me') {
        await route.fulfill({ json: { user } });
      } else if (request.method() === 'GET' && path === `/api/events/${requestId}`) {
        detailReads += 1;
        await route.fulfill({ json: {
          ...detail,
          status: saved ? scenario.decision : scenario.initialStatus,
          review: saved ? { ...savedReview, createdAt: '2026-09-15T02:00:00.000Z' } : null,
          actions: { canEditDraft: false, canMakeInitialDecision: !saved },
        } });
      } else if (request.method() === 'POST' && path === `/api/events/${requestId}/reviews`) {
        submissions.push(request.postDataJSON());
        saved = true;
        await route.fulfill({ status: 201, json: savedReview });
      } else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: requestId }))) {
        // Fail closed: an unexpected request must never reach the configured database.
        unexpectedRequests.push(`${request.method()} ${path}`);
        await route.fulfill({ status: 501, json: {
          error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
        } });
      }
    });

    await page.goto(`/reviews/${requestId}`);
    await expect(page.getByRole('heading', { name: detail.name, exact: true })).toBeVisible();
    await expect(page.getByText(scenario.initialStatus, { exact: true })).toBeVisible();
    await page.getByRole('radio', { name: new RegExp(scenario.choice) }).check();
    await page.getByRole('textbox', { name: /^Reason \((optional|required)\)$/ }).fill(`  ${reason}  `);
    await page.getByRole('button', { name: scenario.button, exact: true }).click();

    await expect.poll(() => detailReads).toBe(2);
    await expect(page.getByText(scenario.decision, { exact: true })).toBeVisible();
    const outcome = page.getByRole('region', { name: 'Review outcome', exact: true }).getByRole('status');
    await expect(outcome).toContainText(scenario.outcome);
    await expect(outcome).toContainText(reason);
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Record / })).toHaveCount(0);
    expect(submissions).toEqual([{ decision: scenario.decision, reason }]);

    await page.reload();
    await expect.poll(() => detailReads).toBe(3);
    await expect(outcome).toContainText(scenario.outcome);
    await expect(outcome).toContainText(reason);
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Record / })).toHaveCount(0);
    expect(submissions).toHaveLength(1);
    expect(unexpectedRequests).toEqual([]);
    if (scenario.decision === 'REJECTED') {
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath('review-outcome.png'), fullPage: true });
  });
}

test('KAN-36 a submitted request without the decision action has no decision controls', async ({ page }) => {
  const unexpectedRequests: string[] = [];
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path === '/api/auth/me') {
      await route.fulfill({ json: { user } });
    } else if (request.method() === 'GET' && path === `/api/events/${requestId}`) {
      await route.fulfill({ json: {
        ...detail,
        review: null,
        actions: { canEditDraft: false, canMakeInitialDecision: false },
      } });
    } else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: requestId }))) {
      unexpectedRequests.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 501, json: {
        error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
      } });
    }
  });

  await page.goto(`/reviews/${requestId}`);
  await expect(page.getByRole('heading', { name: detail.name, exact: true })).toBeVisible();
  await expect(page.getByText('SUBMITTED', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Record / })).toHaveCount(0);
  expect(unexpectedRequests).toEqual([]);
});

test('KAN-60 a blank rejection reason is blocked in the browser; the corrected reason survives a reload', async ({ page }) => {
  // All API responses are fixtures. This checks browser validation and wiring, not live login or persistence.
  const reason = 'The proposed venue cannot hold 25 people.';
  const savedReview = {
    reviewId: '10000000-0000-4000-8000-000000000060',
    eventRequestId: requestId,
    reviewedBy: coordinatorId,
    decision: 'REJECTED',
    reason,
  };
  let saved = false;
  const submissions: unknown[] = [];
  const unexpectedRequests: string[] = [];

  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path === '/api/auth/me') {
      await route.fulfill({ json: { user } });
    } else if (request.method() === 'GET' && path === `/api/events/${requestId}`) {
      await route.fulfill({ json: {
        ...detail,
        status: saved ? 'REJECTED' : 'SUBMITTED',
        review: saved ? { ...savedReview, createdAt: '2026-10-21T02:00:00.000Z' } : null,
        actions: { canEditDraft: false, canMakeInitialDecision: !saved },
      } });
    } else if (request.method() === 'POST' && path === `/api/events/${requestId}/reviews`) {
      submissions.push(request.postDataJSON());
      saved = true;
      await route.fulfill({ status: 201, json: savedReview });
    } else if (!(await fulfilWorkspaceRead(route, request, { coordinatorBookingEventId: requestId }))) {
      unexpectedRequests.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 501, json: {
        error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
      } });
    }
  });

  await page.goto(`/reviews/${requestId}`);
  await page.getByRole('radio', { name: /Reject request/ }).check();
  const reasonBox = page.getByRole('textbox', { name: 'Reason (required)' });
  await reasonBox.fill('   ');
  await page.getByRole('button', { name: 'Record rejection', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText('Enter a reason to reject this event request.');
  await expect(reasonBox).toHaveAttribute('aria-invalid', 'true');
  await expect(reasonBox).toBeFocused();
  expect(submissions).toEqual([]);

  await reasonBox.fill(`  ${reason}  `);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Record rejection', exact: true }).click();
  const outcome = page.getByRole('region', { name: 'Review outcome', exact: true }).getByRole('status');
  await expect(outcome).toContainText('Request rejected');
  expect(submissions).toEqual([{ decision: 'REJECTED', reason }]);

  await page.reload();
  await expect(outcome).toContainText(reason);
  expect(submissions).toHaveLength(1);
  expect(unexpectedRequests).toEqual([]);
});
