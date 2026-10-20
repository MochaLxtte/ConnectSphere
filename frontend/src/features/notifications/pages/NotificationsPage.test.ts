import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { router as appRouter } from '../../../app/router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import { notificationCount, resetUnreadCount } from '../state';
import type { NotificationItem } from '../api/notifications';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'EVENT_ORGANISER', id = 'user-1'): SignedInUser =>
  ({ id, role, email: `${id}@example.test`, displayName: id });

const item = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n-1', type: 'REVIEW_APPROVED', title: 'Event request approved',
  message: 'Your event request “Career fair” was approved.', read: false, readAt: null,
  createdAt: '2026-10-05T02:30:00.000Z', event: { id: 'event-1', name: 'Career fair' }, booking: null,
  link: '/events/event-1', ...overrides,
});
const read = (overrides: Partial<NotificationItem> = {}) =>
  item({ read: true, readAt: '2026-10-06T01:00:00.000Z', ...overrides });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const apiError = (status: number, code: string, message = 'Failed.') => json({ error: { code, message } }, status);

/** Route-aware fetch: the list, the count, and per-call replies for the two writes. */
function stubApi(options: {
  items?: NotificationItem[] | (() => NotificationItem[]);
  unread?: () => number;
  markRead?: (id: string) => Response;
  markAll?: () => Response;
} = {}) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    calls.push(key);
    if (key === 'GET /api/notifications') {
      const items = typeof options.items === 'function' ? options.items() : options.items ?? [];
      return json({ items });
    }
    if (key === 'GET /api/notifications/unread-count') {
      return json({ unreadCount: options.unread?.() ?? (typeof options.items === 'function' ? options.items() : options.items ?? []).filter((n) => !n.read).length });
    }
    if (key === 'POST /api/notifications/read-all') return options.markAll?.() ?? json({ updated: 0 });
    const match = /^POST \/api\/notifications\/(.+)\/read$/.exec(key);
    if (match) return options.markRead?.(decodeURIComponent(match[1]!)) ?? json({ notification: read() });
    return apiError(404, 'NOT_FOUND', `No stub for ${key}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls, writes: () => calls.filter((call) => call.startsWith('POST')) };
}

function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((fulfil) => { resolve = fulfil; });
  return { promise, resolve };
}
async function settle(pending: ReturnType<typeof deferred>, response: Response) {
  pending.resolve(response);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function open() {
  // The application's own routes, so the page is reached exactly as users reach it.
  const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes });
  await router.push('/notifications');
  await router.isReady();
  render(RouterView, { global: { plugins: [router] } });
  return router;
}

beforeEach(() => {
  session.user = user();
  session.loading = false;
  resetUnreadCount();
});

describe('KAN-64-AC204/AC206 inbox page access', () => {
  it('waits for the session before reading any notification', async () => {
    session.loading = true;
    const { fetchMock } = stubApi({ items: [item()] });
    await open();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(fetchMock).not.toHaveBeenCalled();
    session.loading = false;
    expect(await screen.findByRole('list', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('offers sign-in to a signed-out visitor without reading notifications', async () => {
    session.user = null;
    const { fetchMock } = stubApi({ items: [item()] });
    await open();
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to view your notifications.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Career fair')).not.toBeInTheDocument();
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'gives %s their own inbox', async (role) => {
      session.user = user(role);
      const { calls } = stubApi({ items: [item()] });
      await open();
      expect(await screen.findByText('Event request approved')).toBeInTheDocument();
      expect(calls).toContain('GET /api/notifications');
    },
  );

  it('discards the previous account\'s pending read when the account changes', async () => {
    const old = deferred();
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input) === '/api/notifications') {
        return session.user?.id === 'user-1' ? old.promise : Promise.resolve(json({ items: [item({ title: 'New account notice' })] }));
      }
      return Promise.resolve(json({ unreadCount: 1 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    await open();
    const signal = (fetchMock.mock.calls[0]![1] as RequestInit).signal!;

    session.user = user('EVENT_ORGANISER', 'user-2');
    expect(await screen.findByText('New account notice')).toBeInTheDocument();
    expect(signal.aborted).toBe(true);
    await settle(old, json({ items: [item({ title: 'Previous account notice' })] }));
    expect(screen.getByText('New account notice')).toBeInTheDocument();
    expect(screen.queryByText('Previous account notice')).not.toBeInTheDocument();
  });

  it('returns to sign-in and hides the inbox when the session has expired', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in.')));
    await open();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument();
  });
});

describe('KAN-64-AC204/AC205 inbox content', () => {
  it('shows unread and read notifications distinguishably, with Singapore time, context and links', async () => {
    stubApi({ items: [
      item(),
      read({ id: 'n-2', type: 'VENUE_BOOKING_APPROVED', title: 'Venue booking approved', message: 'Venue staff approved the booking.',
        booking: { id: 'booking-1' }, link: '/venue-bookings/booking-1', event: null }),
      read({ id: 'n-3', type: 'COORDINATOR_REASSIGNED_AWAY', title: 'Event reassigned',
        message: 'An event request you coordinated was reassigned to another coordinator. You no longer have access to it.',
        event: null, link: null }),
    ] });
    await open();
    const rows = within(await screen.findByRole('list', { name: 'Notifications' })).getAllByRole('listitem');
    expect(rows).toHaveLength(3);

    expect(within(rows[0]!).getByText('Unread')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Your event request “Career fair” was approved.')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Event request: Career fair')).toBeInTheDocument();
    expect(within(rows[0]!).getByRole('link', { name: 'Open event request' })).toHaveAttribute('href', '/events/event-1');
    expect(within(rows[0]!).getByText(/5 Oct 2026/)).toHaveTextContent(/10:30/);
    expect(within(rows[0]!).getByRole('button', { name: 'Mark as read: Event request approved' })).toBeEnabled();

    expect(within(rows[1]!).queryByText('Unread')).not.toBeInTheDocument();
    expect(within(rows[1]!).getByRole('link', { name: 'Open booking' })).toHaveAttribute('href', '/venue-bookings/booking-1');
    expect(within(rows[1]!).queryByRole('button')).not.toBeInTheDocument();
    // The minimal notice offers no link and names no event.
    expect(within(rows[2]!).queryByRole('link')).not.toBeInTheDocument();
    expect(within(rows[2]!).queryByText(/Event request:/)).not.toBeInTheDocument();
    expect(screen.getByText(/1 unread notification/)).toBeInTheDocument();
  });

  it('shows an empty state without an error', async () => {
    stubApi({ items: [] });
    await open();
    expect(await screen.findByRole('heading', { name: 'No notifications yet' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    expect(screen.getByText(/No unread notifications/)).toBeInTheDocument();
  });

  it('reports a failed load without stale data and recovers on retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'))
      .mockResolvedValueOnce(json({ items: [item()] }))
      .mockResolvedValue(json({ unreadCount: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.queryByRole('list', { name: 'Notifications' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Event request approved')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refreshes on request and shows what arrived meanwhile', async () => {
    let current = [item()];
    stubApi({ items: () => current });
    await open();
    await screen.findByText('Event request approved');
    current = [item({ id: 'n-9', title: 'Clarification requested' }), ...current];
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Clarification requested')).toBeInTheDocument();
    expect(screen.getByText(/2 unread notifications/)).toBeInTheDocument();
  });

  it('keeps the shared unread count in step with the list it loaded', async () => {
    stubApi({ items: [item(), item({ id: 'n-2' })], unread: () => 7 });
    await open();
    await screen.findByText('Event request approved', { selector: 'h3' }).catch(() => undefined);
    await waitFor(() => expect(notificationCount.unread).toBe(7));
  });
});

describe('KAN-64-AC204 read state', () => {
  it.each([200, 401])('ignores a pending bulk-read %s response after the account changes', async (status) => {
    const pending = deferred();
    const { fetchMock, calls } = stubApi({
      items: () => [item({ title: session.user?.id === 'user-1' ? 'Previous account notice' : 'New account notice' })],
    });
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input, init) => String(input).endsWith('/read-all')
      ? pending.promise : original(input, init));
    await open();
    await screen.findByText('Previous account notice');
    await fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    const writeSignal = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/read-all'))![1]?.signal;

    session.user = user('EVENT_ORGANISER', 'user-2');
    await screen.findByText('New account notice');
    const loadsBeforeCompletion = calls.filter((call) => call === 'GET /api/notifications').length;
    await settle(pending, status === 200 ? json({ updated: 1 }) : apiError(401, 'AUTHENTICATION_REQUIRED'));

    expect(session.user?.id).toBe('user-2');
    expect(screen.getByText('New account notice')).toBeInTheDocument();
    expect(calls.filter((call) => call === 'GET /api/notifications')).toHaveLength(loadsBeforeCompletion);
    expect(screen.queryByText('1 notification marked as read.')).not.toBeInTheDocument();
    expect(writeSignal?.aborted).toBe(true);
  });

  it('discards an old account unread-count response started after marking one notification', async () => {
    const pendingCount = deferred();
    let countReads = 0;
    const { fetchMock } = stubApi({
      items: () => [item({ title: session.user?.id === 'user-1' ? 'Previous account notice' : 'New account notice' })],
    });
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input, init) => {
      if (String(input).endsWith('/unread-count')) {
        countReads += 1;
        if (countReads === 2) return pendingCount.promise;
        return Promise.resolve(json({ unreadCount: session.user?.id === 'user-1' ? 1 : 2 }));
      }
      return original(input, init);
    });
    await open();
    await waitFor(() => expect(notificationCount.unread).toBe(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Mark as read: Previous account notice' }));
    await waitFor(() => expect(countReads).toBe(2));

    session.user = user('EVENT_ORGANISER', 'user-2');
    await screen.findByText('New account notice');
    await waitFor(() => expect(notificationCount.unread).toBe(2));
    await settle(pendingCount, json({ unreadCount: 99 }));
    expect(notificationCount.unread).toBe(2);
  });

  it.each([200, 401])('ignores a pending bulk-read %s response after leaving the inbox', async (status) => {
    const pending = deferred();
    const { fetchMock, calls } = stubApi({ items: [item()] });
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input, init) => String(input).endsWith('/read-all')
      ? pending.promise : original(input, init));
    const router = await open();
    await screen.findByText('Event request approved');
    await fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));

    // Leave the route while keeping the same account, so the lifetime guard is required.
    await router.push('/missing-inbox-route');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument());
    const loadsBeforeCompletion = calls.filter((call) => call === 'GET /api/notifications').length;
    await settle(pending, status === 200 ? json({ updated: 1 }) : apiError(401, 'AUTHENTICATION_REQUIRED'));
    expect(session.user?.id).toBe('user-1');
    expect(calls.filter((call) => call === 'GET /api/notifications')).toHaveLength(loadsBeforeCompletion);
  });

  it('marks one notification read in place and refreshes the count', async () => {
    let unread = 2;
    const { writes } = stubApi({
      items: [item(), item({ id: 'n-2', title: 'Second notice' })],
      unread: () => unread,
      markRead: (id) => { unread = 1; return json({ notification: read({ id }) }); },
    });
    await open();
    await fireEvent.click(await screen.findByRole('button', { name: 'Mark as read: Event request approved' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark as read: Event request approved' })).not.toBeInTheDocument());
    expect(writes()).toEqual(['POST /api/notifications/n-1/read']);
    expect(screen.getByRole('button', { name: 'Mark as read: Second notice' })).toBeEnabled();
    expect(screen.getAllByText('Unread')).toHaveLength(1);
    await waitFor(() => expect(notificationCount.unread).toBe(1));
  });

  it('disables the controls while a write is pending so a notification is marked once', async () => {
    const pending = deferred();
    stubApi({ items: [item(), item({ id: 'n-2', title: 'Second notice' })] });
    const fetchMock = vi.mocked(fetch);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) =>
      (String(input).endsWith('/n-1/read') ? pending.promise : original(input, init)));
    await open();
    const first = await screen.findByRole('button', { name: 'Mark as read: Event request approved' });
    await fireEvent.click(first);

    expect(screen.getByRole('button', { name: 'Mark as read: Event request approved' })).toHaveTextContent('Marking…');
    expect(screen.getByRole('button', { name: 'Mark as read: Second notice' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    // A second click on the pending button is ignored.
    await fireEvent.click(screen.getByRole('button', { name: 'Mark as read: Event request approved' }));
    await settle(pending, json({ notification: read() }));
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/read'))).toHaveLength(1);
  });

  it('explains a failed write, keeps the notification unread and allows another try', async () => {
    stubApi({ items: [item()], markRead: () => apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.') });
    await open();
    await fireEvent.click(await screen.findByRole('button', { name: 'Mark as read: Event request approved' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as read: Event request approved' })).toBeEnabled();
  });

  it('refreshes the list when a notification is no longer available', async () => {
    let items = [item()];
    stubApi({ items: () => items, markRead: () => { items = []; return apiError(404, 'NOTIFICATION_NOT_FOUND', 'The notification was not found.'); } });
    await open();
    await fireEvent.click(await screen.findByRole('button', { name: 'Mark as read: Event request approved' }));
    expect(await screen.findByRole('heading', { name: 'No notifications yet' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('That notification is no longer available. The list has been refreshed.');
  });

  it('marks everything read, confirms how many changed and reloads', async () => {
    let items = [item(), item({ id: 'n-2', title: 'Second notice' })];
    const { writes } = stubApi({
      items: () => items,
      markAll: () => { items = items.map((entry) => ({ ...entry, read: true, readAt: '2026-10-06T01:00:00.000Z' })); return json({ updated: 2 }); },
    });
    await open();
    await screen.findByRole('list', { name: 'Notifications' });
    await fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(await screen.findByText('2 notifications marked as read.')).toBeInTheDocument();
    expect(writes()).toEqual(['POST /api/notifications/read-all']);
    await waitFor(() => expect(screen.queryByText('Unread')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
  });

  it('says so when one notification was marked, and reports a failure without losing the list', async () => {
    let fail = false;
    stubApi({
      items: () => [item()],
      markAll: () => (fail ? apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.') : json({ updated: 1 })),
    });
    await open();
    await screen.findByRole('list', { name: 'Notifications' });
    fail = true;
    await fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.getByText('Event request approved')).toBeInTheDocument();
    expect(screen.queryByText(/marked as read\./)).not.toBeInTheDocument();
    fail = false;
    await fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(await screen.findByText('1 notification marked as read.')).toBeInTheDocument();
  });
});
