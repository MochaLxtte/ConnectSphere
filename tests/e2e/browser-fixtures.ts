import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Optional remote typography must not hold page.goto's load event open.
    // Use the application's fallback fonts while keeping API fixtures and live checks intact.
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ contentType: 'text/css', body: '' }));
    await use(page);
  },
});
