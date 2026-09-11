import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ReviewQueuePage from './ReviewQueuePage.vue';

function renderQueue() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: ReviewQueuePage }],
  });
  return render(ReviewQueuePage, { global: { plugins: [router] } });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe('KAN-33 review queue page', () => {
  it('lists reviewable requests once loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            { id: 'a', name: 'Career fair', status: 'SUBMITTED',
              createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z' },
            { id: 'b', name: null, status: 'UNDER_REVIEW',
              createdAt: '2026-09-08T00:00:00Z', updatedAt: '2026-09-08T00:00:00Z' },
          ],
        }),
      ),
    );
    renderQueue();

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(await screen.findByRole('link', { name: /Career fair/ })).toHaveAttribute(
      'href', '/reviews/a',
    );
    expect(screen.getByRole('link', { name: /Untitled event request/ })).toHaveAttribute(
      'href', '/reviews/b',
    );
  });

  it('shows an empty state rather than an error when nothing is reviewable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })));
    renderQueue();
    expect(await screen.findByText('No requests are awaiting review')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a retryable error when the queue cannot be loaded', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view submitted event requests.' } }, 401),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    renderQueue();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign in to view submitted event requests.',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No requests are awaiting review')).toBeInTheDocument();
  });
});
