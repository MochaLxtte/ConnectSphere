import { expect, test } from '@playwright/test';

test('KAN-25/KAN-36 running server requires login for event routes', async ({ request }) => {
  // Exercise normal server.ts startup through the Vite proxy, without response fixtures.
  const id = '10000000-0000-4000-8000-000000000099';
  const responses = await Promise.all([
    request.get('/api/events'),
    request.get(`/api/events/${id}`),
    request.patch(`/api/events/${id}`, { data: { name: 'Unauthenticated edit' } }),
    request.post(`/api/events/${id}/submit`),
    request.post(`/api/events/${id}/reviews`, { data: { decision: 'APPROVED' } }),
  ]);
  for (const response of responses) {
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('AUTHENTICATION_REQUIRED');
  }
});

test('SCF-E2E-01 browser reaches the API and migrated database through the Vite proxy', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('article', { name: 'API service', exact: true })).toContainText(
    'Connected',
  );
  await expect(page.getByRole('article', { name: 'Database', exact: true })).toContainText(
    'Connected',
  );
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(page.getByRole('article', { name: 'Database', exact: true })).toContainText(
    'Connected',
  );
});

test('SCF-E2E-02 planned pages are navigable and explicitly unfinished', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  for (const name of ['Event requests', 'New event request']) {
    await navigation.getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
    await expect(
      page.getByText('This is a scaffold. This feature is not implemented yet.'),
    ).toBeVisible();
  }
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to ConnectSphere' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
});

test('SCF-E2E-03 database failure is visible and the check can recover', async ({ page }) => {
  await page.route('**/api/health/ready', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is temporarily unavailable.' },
      }),
    }),
  );
  await page.goto('/');
  const database = page.getByRole('article', { name: 'Database', exact: true });
  await expect(database).toContainText('Needs attention');
  await expect(database).toContainText('Database is temporarily unavailable.');
  await page.unroute('**/api/health/ready');
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(database).toContainText('Connected');
});

test('SCF-E2E-04 narrow screen supports navigation without horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('article', { name: 'Database', exact: true })).toContainText(
    'Connected',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('mobile-overview.png'), fullPage: true });
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Review queue' })
    .click();
  await expect(page.getByRole('heading', { name: 'Review queue', level: 1 })).toBeVisible();
});
