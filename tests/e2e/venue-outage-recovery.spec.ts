import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';

const staff = {
  id: '10000000-0000-4000-8000-000000000081', email: 'venue_staff@example.test',
  displayName: 'Test venue staff', role: 'VENUE_STAFF' as const,
};
const venue = { id: '30000000-0000-4000-8000-000000000081', name: 'Harbour Hall' };
const affected = {
  impactId: '50000000-0000-4000-8000-000000000081', status: 'RECOVERY_REQUIRED', bookingId: 'booking-81',
  eventRequestId: 'event-81', eventName: 'Career fair',
  bookingStartsAt: '2026-12-01T03:00:00.000Z', bookingEndsAt: '2026-12-01T04:00:00.000Z',
};

/** Browser behaviour only: every API call is answered here, and an unexpected one is recorded. */
async function outageFixtures(page: Page) {
  const blocks: Record<string, unknown>[] = [];
  const recovery: Record<string, unknown>[] = [];
  const created: unknown[] = [];
  const unexpectedRequests: string[] = [];
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (method === 'GET' && url.pathname === '/api/auth/me') {
      await route.fulfill({ json: { user: staff } });
    } else if (method === 'GET' && url.pathname === '/api/health') {
      await route.fulfill({ json: { status: 'ok', service: 'connectsphere-api' } });
    } else if (method === 'GET' && url.pathname === '/api/health/ready') {
      await route.fulfill({ json: { status: 'ok', database: 'connected' } });
    } else if (method === 'GET' && url.pathname === '/api/venues/availability') {
      await route.fulfill({ json: { from: '', to: '', items: [{
        ...venue, location: null, capacity: 200, opensAt: null, closesAt: null, unavailable: [],
      }] } });
    } else if (method === 'GET' && url.pathname === '/api/venues/recovery') {
      await route.fulfill({ json: { items: recovery } });
    } else if (method === 'GET' && url.pathname === `/api/venues/${venue.id}/unavailability`) {
      await route.fulfill({ json: { items: blocks } });
    } else if (method === 'POST' && url.pathname === `/api/venues/${venue.id}/unavailability`) {
      const body = request.postDataJSON() as { startsAt: string; endsAt: string; reason: string };
      created.push(body);
      const block = {
        id: '40000000-0000-4000-8000-000000000081', venueId: venue.id, venueName: venue.name, ...body,
        createdBy: staff.id, createdAt: '2026-10-21T00:00:00.000Z', affected: [affected],
      };
      blocks.push(block);
      recovery.push({
        ...affected, blockId: block.id, venueId: venue.id, venueName: venue.name,
        outageStartsAt: body.startsAt, outageEndsAt: body.endsAt, outageReason: body.reason,
      });
      await route.fulfill({ status: 201, json: { block } });
    } else if (!(await fulfilWorkspaceRead(route, request))) {
      unexpectedRequests.push(`${method} ${url.pathname}${url.search}`);
      await route.fulfill({ status: 501, json: {
        error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'No response fixture was configured.' },
      } });
    }
  });
  return { created, unexpectedRequests };
}

test('KAN-81 venue staff save an outage over an approved booking and see it needs recovery', async ({ page }) => {
  const fixture = await outageFixtures(page);
  await page.goto('/venue-blocks');
  await expect(page.getByText('No bookings currently need recovery.')).toBeVisible();

  await page.getByRole('combobox', { name: 'Venue' }).selectOption(venue.id);
  await expect(page.getByText('No blocks are recorded for this venue yet.')).toBeVisible();
  await page.getByLabel('Starts (Singapore time)').fill('2026-12-01T10:00');
  await page.getByLabel('Ends (Singapore time)').fill('2026-12-01T14:00');
  await page.getByLabel('Reason').fill('Burst pipe');
  await page.getByRole('button', { name: 'Save block' }).click();

  await expect(page.getByText('The venue block was saved. It affects 1 approved booking, now marked as needing recovery.'))
    .toBeVisible();
  expect(fixture.created).toEqual([{
    startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z', reason: 'Burst pipe',
  }]);
  const affectedList = page.getByRole('list', { name: 'Bookings affected by this block' });
  await expect(affectedList.getByText(/Career fair/)).toBeVisible();
  await expect(affectedList.getByText('Recovery required')).toBeVisible();
  const recoveryPanel = page.getByRole('region', { name: 'Bookings needing recovery' });
  await expect(recoveryPanel.getByText('Career fair — Harbour Hall')).toBeVisible();
  await expect(recoveryPanel.getByText(/Burst pipe/)).toBeVisible();
  expect(fixture.unexpectedRequests).toEqual([]);
});
