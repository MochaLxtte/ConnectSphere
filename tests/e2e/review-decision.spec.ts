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
      } else if (!(await fulfilWorkspaceRead(route, request))) {
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
    await page.getByRole('textbox', { name: /Reason/ }).fill(`  ${reason}  `);
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
    } else if (!(await fulfilWorkspaceRead(route, request))) {
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
