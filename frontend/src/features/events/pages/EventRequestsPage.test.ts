import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import EventRequestsPage from './EventRequestsPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as {
  user: { id: string; email: string; displayName: string; role: 'EVENT_ORGANISER' } | null;
  loading: boolean;
};

function organiser(id = 'organiser-1') {
  return { id, email: `${id}@example.com`, displayName: 'Test organiser', role: 'EVENT_ORGANISER' as const };
}

function request(id: string, name: string | null, status = 'SUBMITTED') {
  return {
    id, name, status,
    createdAt: '2026-09-15T01:00:00Z', updatedAt: '2026-09-17T17:30:00Z',
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((fulfil) => { resolve = fulfil; });
  return { promise, resolve };
}

async function resolveResponse(pending: ReturnType<typeof deferredResponse>, response: Response) {
  pending.resolve(response);
  // Allow response parsing and Vue updates to finish before checking stale responses.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function renderRequests() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: EventRequestsPage }],
  });
  await router.push('/events');
  await router.isReady();
  return render(EventRequestsPage, { global: { plugins: [router] } });
}

beforeEach(() => {
  session.user = organiser();
  session.loading = false;
});

describe('KAN-16 organiser event request list', () => {
  it('loads all statuses in API order and presents readable labels without decision controls', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    await renderRequests();

    expect(screen.getByRole('status')).toHaveTextContent('Loading your event requests…');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/events?scope=all');

    const statuses = [
      ['REJECTED', 'Rejected'], ['APPROVED', 'Approved'], ['DRAFT', 'Draft'],
      ['CLARIFICATION_REQUESTED', 'Clarification requested'],
      ['SUBMITTED', 'Submitted'], ['UNDER_REVIEW', 'Under review'],
    ];
    await resolveResponse(pending, jsonResponse({
      items: statuses.map(([status], index) => request(String(index), `Event ${index}`, status)),
    }));

    const list = await screen.findByRole('list', { name: 'Your event requests' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(6);
    statuses.forEach(([status, label], index) => {
      expect(rows[index]).toHaveTextContent(`Event ${index}`);
      expect(within(rows[index]!).getByText(label!)).toBeInTheDocument();
      // A draft links to its edit form; every other status links to the read-only detail view.
      const expectedHref = status === 'DRAFT' ? `/events/${index}/edit` : `/events/${index}`;
      expect(within(rows[index]!).getByRole('link', { name: `Event ${index}` }))
        .toHaveAttribute('href', expectedHref);
    });
    expect(within(list).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  });

  it('handles untitled requests and unknown statuses while showing Singapore update times', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [
      request('a', null, 'DRAFT'), request('b', '   ', 'FUTURE_STATUS'),
    ] })));
    await renderRequests();

    const list = await screen.findByRole('list', { name: 'Your event requests' });
    expect(within(list).getAllByText('Untitled event request')).toHaveLength(2);
    expect(within(list).getByText('Status unavailable')).toBeInTheDocument();
    const times = list.querySelectorAll('time');
    expect(times).toHaveLength(2);
    expect(times[0]).toHaveAttribute('datetime', '2026-09-17T17:30:00Z');
    expect(times[0]).toHaveTextContent(/18 Sept? 2026/);
    expect(times[0]).toHaveTextContent(/1:30\s*am/i);
  });

  it('shows a helpful empty state when the organiser has no requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })));
    await renderRequests();

    expect(await screen.findByRole('heading', { name: 'No event requests yet' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Your event requests' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['network', 'service'])('can retry a %s failure without showing stale data', async (failure) => {
    const fetchMock = vi.fn();
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new TypeError('Network failure'));
    else fetchMock.mockResolvedValueOnce(jsonResponse({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable.' },
    }, 503));
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [request('a', 'Career fair')] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderRequests();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Your event requests' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Career fair')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/events?scope=all', '/api/events?scope=all',
    ]);
  });

  it('refreshes the latest status and hides the previous list while the read is pending', async () => {
    const pending = deferredResponse();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [request('a', 'Career fair')] }))
      .mockReturnValueOnce(pending.promise));
    await renderRequests();
    await screen.findByText('Career fair');

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.queryByText('Career fair')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    await resolveResponse(pending, jsonResponse({ items: [request('a', 'Career fair', 'APPROVED')] }));
    const list = await screen.findByRole('list', { name: 'Your event requests' });
    expect(within(list).getByText('Approved')).toBeInTheDocument();
    expect(within(list).queryByText('Submitted')).not.toBeInTheDocument();
  });

  it('removes cached requests and offers sign-in when the session expires during refresh', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [request('a', 'Private event')] }))
      .mockResolvedValueOnce(jsonResponse({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' },
      }, 401)));
    await renderRequests();
    await screen.findByText('Private event');

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to view your event requests.');
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Private event')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Your event requests' })).not.toBeInTheDocument();
  });

  it.each([
    [403, 'FORBIDDEN'], [400, 'INVALID_EVENT_LIST_SCOPE'],
  ])('hides organiser data when refresh is denied with %s %s', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [request('a', 'Private event')] }))
      .mockResolvedValueOnce(jsonResponse({
        error: { code, message: 'Request forbidden.' },
      }, Number(status))));
    await renderRequests();
    await screen.findByText('Private event');

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This page is for event organisers.');
    expect(screen.queryByText('Private event')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Your event requests' })).not.toBeInTheDocument();
  });

  it('aborts a pending read when the page is unmounted', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockReturnValueOnce(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    const view = await renderRequests();
    const signal = (fetchMock.mock.calls[0]?.[1] as RequestInit).signal;
    expect(signal?.aborted).toBe(false);

    view.unmount();
    expect(signal?.aborted).toBe(true);
    await resolveResponse(pending, jsonResponse({ items: [request('a', 'Late event')] }));
    expect(screen.queryByText('Late event')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores an old account response after switching to a different organiser', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(jsonResponse({ items: [request('b', 'New account event')] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderRequests();
    const oldSignal = (fetchMock.mock.calls[0]?.[1] as RequestInit).signal;

    session.user = organiser('organiser-2');
    expect(await screen.findByText('New account event')).toBeInTheDocument();
    expect(oldSignal?.aborted).toBe(true);
    await resolveResponse(pending, jsonResponse({ items: [request('a', 'Previous account event')] }));
    expect(screen.getByText('New account event')).toBeInTheDocument();
    expect(screen.queryByText('Previous account event')).not.toBeInTheDocument();
  });

  it('clears the visible request list immediately when the organiser signs out', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [request('a', 'Private event')] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderRequests();
    await screen.findByText('Private event');

    session.user = null;
    await waitFor(() => expect(screen.queryByText('Private event')).not.toBeInTheDocument());
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to view your event requests.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
