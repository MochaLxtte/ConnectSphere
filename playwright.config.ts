import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Keep resource use predictable on developer laptops and CI; retries must not hide flakes.
  workers: 2,
  retries: 0,
  failOnFlakyTests: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node --import tsx tests/browser/start-api.ts',
      url: 'http://127.0.0.1:4311/api/health/ready',
      reuseExistingServer: false,
    },
    {
      command: 'node --import tsx tests/browser/start-web.ts',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
  ],
});
