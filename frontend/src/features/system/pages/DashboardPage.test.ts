import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import DashboardPage from './DashboardPage.vue';

function renderDashboard() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: DashboardPage }],
  });
  return render(DashboardPage, { global: { plugins: [router] } });
}

describe('dashboard connection checks', () => {
  it('shows API and database health independently and retries a failed connection', async () => {
    let databaseAvailable = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/health')
        return new Response(JSON.stringify({ status: 'ok', service: 'connectsphere-api' }));
      return databaseAvailable
        ? new Response(JSON.stringify({ status: 'ok', database: 'connected' }))
        : new Response(
            JSON.stringify({
              error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable.' },
            }),
            { status: 503 },
          );
    });
    vi.stubGlobal('fetch', fetchMock);
    renderDashboard();

    expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is unavailable.');
    expect(
      within(screen.getByRole('article', { name: 'API service' })).getByRole('status'),
    ).toHaveTextContent('Connected');
    expect(
      within(screen.getByRole('article', { name: 'Database' })).getByRole('status'),
    ).toHaveTextContent('Needs attention');

    databaseAvailable = true;
    await fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() =>
      expect(
        within(screen.getByRole('article', { name: 'Database' })).getByRole('status'),
      ).toHaveTextContent('Connected'),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
