import { expect, test } from './browser-fixtures.js';

test('KAN-33 review queue shows a service error and retries successfully', async ({ page }) => {
  // Browser-response fixtures exercise the page; live authentication is a separate integration.
  let available = false;
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user: {
    id: '10000000-0000-4000-8000-000000000025',
    email: 'coordinator@example.test',
    displayName: 'Test coordinator',
    role: 'EVENT_COORDINATOR',
  } } }));
  await page.route('**/api/notifications/unread-count', (route) => route.fulfill({ json: { unreadCount: 0 } }));
  await page.route('**/api/events', (route) => route.fulfill({
    status: available ? 200 : 503,
    contentType: 'application/json',
    body: JSON.stringify(available ? { items: [] } : {
      error: { code: 'DATABASE_UNAVAILABLE', message: 'The review service is temporarily unavailable.' },
    }),
  }));
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Review queue', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Review queue', level: 1 })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('The review service is temporarily unavailable.');
  available = true;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No requests are awaiting review' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
