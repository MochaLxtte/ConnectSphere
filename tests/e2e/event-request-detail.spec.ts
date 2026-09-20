import { expect, test, type Page } from '@playwright/test';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

const requestId = '10000000-0000-4000-8000-000000000016';
const coordinatorId = '10000000-0000-4000-8000-000000000025';
const user = {
  id: '10000000-0000-4000-8000-000000000031',
  email: 'organiser@example.test',
  displayName: 'Test organiser',
  role: 'EVENT_ORGANISER',
};
const requestDetail = {
  id: requestId,
  organiserId: user.id,
  coordinatorId,
  status: 'APPROVED',
  name: 'Community workshop',
  purpose: 'Bring neighbours together',
  description: 'An introductory community workshop.',
  startsAt: '2026-10-01T01:00:00.000Z',
  endsAt: '2026-10-01T03:00:00.000Z',
  expectedAttendance: 25,
  venueRequirements: 'One seminar room',
  accessibilityNeeds: 'Step-free access',
  equipmentRequirements: null,
  registrationRequired: false,
  createdAt: '2026-09-15T01:00:00.000Z',
  updatedAt: '2026-09-16T23:30:00.000Z',
  review: {
    reviewId: '10000000-0000-4000-8000-000000000037',
    eventRequestId: requestId,
    reviewedBy: coordinatorId,
    decision: 'APPROVED',
    reason: 'Suitable venue and programme.',
    createdAt: '2026-09-16T23:30:00.000Z',
  },
  // Even an unexpectedly enabled action must not add coordinator controls here.
  actions: { canEditDraft: true, canMakeInitialDecision: true },
};

async function fixtureDetail(page: Page, detail: typeof requestDetail, responseStatus = 200) {
  const unexpectedRequests: string[] = [];
  let detailReads = 0;
  // Browser fixtures verify rendering/navigation only, not hosted authentication
  // or persistence. Every unexpected API call is blocked, including all writes.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === '/api/auth/me') {
      await route.fulfill({ json: { user } });
    } else if (request.method() === 'GET' && url.pathname === '/api/events' && url.search === '?scope=all') {
      await route.fulfill({ json: { items: [detail] } });
    } else if (request.method() === 'GET' && url.pathname === `/api/events/${requestId}`) {
      detailReads += 1;
      await route.fulfill({
        status: responseStatus,
        json: responseStatus === 200 ? detail : {
          error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
        },
      });
    } else if (!(await fulfilWorkspaceRead(route, request))) {
      unexpectedRequests.push(`${request.method()} ${url.pathname}${url.search}`);
      await route.fulfill({ status: 501, json: {
        error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
      } });
    }
  });
  return { unexpectedRequests, getDetailReads: () => detailReads };
}

async function expectReadOnly(page: Page) {
  // The request details and review outcome stay read-only. Approved requests also show
  // planning panels below them, which have their own component tests.
  const main = (await page.locator('.detail-grid').count()) > 0
    ? page.locator('.detail-grid') : page.getByRole('main');
  await expect(main.getByRole('radio')).toHaveCount(0);
  await expect(main.getByRole('textbox')).toHaveCount(0);
  await expect(main.getByRole('button', { name: /approve|reject|record|submit|save|edit/i })).toHaveCount(0);
  await expect(main.getByRole('link', { name: /approve|reject|submit|save|edit/i })).toHaveCount(0);
}

for (const scenario of [
  { decision: 'APPROVED', label: 'Approved', reason: 'Suitable venue and programme.' },
  { decision: 'REJECTED', label: 'Rejected', reason: 'The proposed venue is unsuitable.' },
]) {
  test(`KAN-16 organiser opens ${scenario.decision.toLowerCase()} outcome from the list and reloads it`, async ({ page }, testInfo) => {
    const detail = {
      ...requestDetail,
      status: scenario.decision,
      review: { ...requestDetail.review, decision: scenario.decision, reason: scenario.reason },
    };
    const fixture = await fixtureDetail(page, detail);

    await page.goto('/events');
    await page.getByRole('list', { name: 'Your event requests' })
      .getByRole('link', { name: detail.name, exact: true }).click();
    await expect(page).toHaveURL(`/events/${requestId}`);
    await expect(page.getByRole('heading', { name: 'Event request', level: 1, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: detail.name, level: 2, exact: true })).toBeVisible();
    const outcome = page.getByRole('region', { name: 'Review outcome', exact: true });
    await expect(outcome.getByText(scenario.label, { exact: true })).toBeVisible();
    await expect(outcome.getByText(scenario.reason, { exact: true })).toBeVisible();
    await expect(outcome.locator('time')).toHaveAttribute('datetime', detail.review.createdAt);
    await expectReadOnly(page);

    const readsBeforeReload = fixture.getDetailReads();
    await page.reload();
    await expect.poll(fixture.getDetailReads).toBeGreaterThan(readsBeforeReload);
    await expect(outcome.getByText(scenario.label, { exact: true })).toBeVisible();
    await expect(outcome.getByText(scenario.reason, { exact: true })).toBeVisible();
    await expectReadOnly(page);
    if (scenario.decision === 'APPROVED') {
      await page.screenshot({ path: testInfo.outputPath('organiser-detail-desktop.png'), fullPage: true });
    }

    await page.getByRole('link', { name: 'Back to event requests', exact: true }).click();
    await expect(page).toHaveURL('/events');
    const list = page.getByRole('list', { name: 'Your event requests' });
    await expect(list.getByRole('link', { name: detail.name, exact: true })).toBeVisible();
    await expect(list.getByText(scenario.label, { exact: true })).toBeVisible();
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

test('KAN-16 mobile detail wraps long names and displays a multiline reason as text', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const reason = '<strong>Choose another venue.</strong>\nPlease provide step-free access.';
  const detail = {
    ...requestDetail,
    name: `Neighbourhood programme ${'LongUnbrokenEventName'.repeat(10)}`,
    status: 'REJECTED',
    review: { ...requestDetail.review, decision: 'REJECTED', reason },
  };
  const fixture = await fixtureDetail(page, detail);

  await page.goto(`/events/${requestId}`);
  await expect(page.getByRole('heading', { name: detail.name, level: 2, exact: true })).toBeVisible();
  const outcome = page.getByRole('region', { name: 'Review outcome', exact: true });
  const displayedReason = outcome.getByText(reason, { exact: true });
  await expect(displayedReason).toBeVisible();
  await expect(displayedReason).toHaveCSS('white-space', /pre-wrap|pre-line|break-spaces/);
  await expect(outcome.locator('strong')).toHaveCount(0);
  await expectReadOnly(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(fixture.unexpectedRequests).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('organiser-detail-mobile.png'), fullPage: true });
});

test('KAN-16 denied detail access shows a generic message without request data', async ({ page }) => {
  const fixture = await fixtureDetail(page, requestDetail, 404);

  await page.goto(`/events/${requestId}`);
  await expect(page.getByText('This event request is unavailable or you do not have permission to view it.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: requestDetail.name, exact: true })).toHaveCount(0);
  await expect(page.getByText(requestDetail.review.reason, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Review outcome', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to event requests', exact: true })).toBeVisible();
  await expectReadOnly(page);
  expect(fixture.unexpectedRequests).toEqual([]);
});
