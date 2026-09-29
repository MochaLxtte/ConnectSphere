import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
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

type Responder = () => Response | Promise<Response>;

/** Answer the pending queue and the decided history independently, as the real API does. */
function routeFetch(queue: Responder, history: Responder = () => jsonResponse({ items: [] })) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
    String(input).includes('scope=history') ? history() : queue());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const item = (id: string, name: string | null, status: string) => ({
  id, name, status, createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
});

describe('KAN-33 review queue page', () => {
  it('lists reviewable requests once loaded', async () => {
    routeFetch(() => jsonResponse({
      items: [item('a', 'Career fair', 'SUBMITTED'), item('b', null, 'UNDER_REVIEW')],
    }));
    renderQueue();

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(await screen.findByRole('link', { name: /Career fair/ })).toHaveAttribute(
      'href', '/reviews/a',
    );
    expect(screen.getByRole('link', { name: /Untitled event request/ })).toHaveAttribute(
      'href', '/reviews/b',
    );
    expect(screen.getByRole('link', { name: /Untitled event request/ })).toHaveTextContent('Under review');
  });

  it('shows an empty state rather than an error when nothing is reviewable', async () => {
    routeFetch(() => jsonResponse({ items: [] }));
    renderQueue();
    expect(await screen.findByText('No requests are awaiting review')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a retryable error when the queue cannot be loaded', async () => {
    let queueCalls = 0;
    const fetchMock = routeFetch(() => (queueCalls++ === 0
      ? jsonResponse({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view submitted event requests.' } }, 401)
      : jsonResponse({ items: [] })));
    renderQueue();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign in to view submitted event requests.',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(queueCalls).toBe(2));
    expect(await screen.findByText('No requests are awaiting review')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('scope=history'))).toBe(true);
  });
});

describe('KAN-33 / KAN-56 decided requests (S1-DEF-02)', () => {
  it('keeps approved and rejected requests reachable after they leave the queue', async () => {
    const fetchMock = routeFetch(
      () => jsonResponse({ items: [item('p', 'Pending fair', 'SUBMITTED')] }),
      () => jsonResponse({ items: [item('a', 'Approved gala', 'APPROVED'), item('r', null, 'REJECTED')] }),
    );
    renderQueue();

    const decided = await screen.findByRole('list', { name: 'Decided requests' });
    const approved = within(decided).getByRole('link', { name: /Approved gala/ });
    expect(approved).toHaveAttribute('href', '/reviews/a');
    expect(approved).toHaveTextContent('Approved');
    const rejected = within(decided).getByRole('link', { name: /Untitled event request/ });
    expect(rejected).toHaveAttribute('href', '/reviews/r');
    expect(rejected).toHaveTextContent('Rejected');
    expect(within(decided).queryByRole('link', { name: /Pending fair/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/events?scope=history', expect.anything());
  });

  it('shows an empty decided state without hiding the pending queue', async () => {
    routeFetch(() => jsonResponse({ items: [item('p', 'Pending fair', 'SUBMITTED')] }));
    renderQueue();
    expect(await screen.findByText('No decided requests yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pending fair/ })).toBeInTheDocument();
  });

  it('reports a decided-list failure separately and retries it', async () => {
    let historyCalls = 0;
    routeFetch(
      () => jsonResponse({ items: [item('p', 'Pending fair', 'SUBMITTED')] }),
      () => (historyCalls++ === 0
        ? jsonResponse({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }, 500)
        : jsonResponse({ items: [item('a', 'Approved gala', 'APPROVED')] })),
    );
    renderQueue();

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.getByRole('link', { name: /Pending fair/ })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Approved gala/ })).toHaveAttribute('href', '/reviews/a');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
