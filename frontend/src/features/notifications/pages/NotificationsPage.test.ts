import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession } from '../../auth/session.js';
import { calls, errorResponse, jsonResponse, renderAt, user } from '../../registrations/test-helpers';
import type { NotificationItem } from '../api/notifications';
import { setUnreadNotificationCount, unreadNotificationCount } from '../unread-count';
import NotificationsPage from './NotificationsPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: ReturnType<typeof user> | null; loading: boolean };
const renderPage = () => renderAt(NotificationsPage, '/notifications');

function notification(id: string, overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id, type: 'TEST', title: `Title ${id}`, message: `Message ${id}`, eventRequestId: null,
    readAt: null, createdAt: '2026-09-17T17:30:00Z', ...overrides,
  };
}

const page = (items: NotificationItem[], unreadCount: number, nextCursor: string | null = null) =>
  jsonResponse({ items, unreadCount, nextCursor });

beforeEach(() => {
  session.user = user('EVENT_ORGANISER');
  setUnreadNotificationCount(0);
});

describe('CF-20 notifications page', () => {
  it('lists notifications with read state, times and role-aware event links', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page([
      notification('a', { eventRequestId: 'event-1' }),
      notification('b', { readAt: '2026-09-18T01:00:00Z' }),
    ], 1));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    const rows = within(await screen.findByRole('list', { name: 'Your notifications' })).getAllByRole('listitem');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/notifications');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole('heading')).toHaveTextContent('Unread: Title a');
    expect(rows[0]).toHaveTextContent('Message a');
    expect(rows[0]).toHaveTextContent(/18 Sept? 2026/);
    expect(within(rows[0]!).getByRole('link', { name: 'View event for Title a' })).toHaveAttribute('href', '/events/event-1');
    expect(within(rows[0]!).getByRole('button', { name: 'Mark Title a as read' })).toBeEnabled();
    expect(within(rows[1]!).getByRole('heading')).toHaveTextContent(/^Title b$/);
    expect(within(rows[1]!).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rows[1]!).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/1 unread/)).toBeInTheDocument();
    expect(unreadNotificationCount.value).toBe(1);
  });

  it('sends attendees to the public event page', async () => {
    session.user = user('ATTENDEE');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(page([notification('a', { eventRequestId: 'event-1' })], 1)));
    await renderPage();
    expect(await screen.findByRole('link', { name: 'View event for Title a' })).toHaveAttribute('href', '/browse/event-1');
  });

  it('marks one notification read and updates the shared unread count', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([notification('a'), notification('b')], 2))
      .mockResolvedValueOnce(jsonResponse({ notification: notification('a', { readAt: '2026-09-19T01:00:00Z' }), unreadCount: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Mark Title a as read' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark Title a as read' })).not.toBeInTheDocument());
    expect(screen.getByText('Title a')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Title b as read' })).toBeEnabled();
    expect(screen.getByText(/1 unread/)).toBeInTheDocument();
    expect(unreadNotificationCount.value).toBe(1);
    expect(calls(fetchMock)[1]).toBe('POST /api/notifications/a/read');
  });

  it('filters to unread and drops a notification from that view once read', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([notification('a'), notification('b', { readAt: '2026-09-18T01:00:00Z' })], 1))
      .mockResolvedValueOnce(page([notification('a')], 1))
      .mockResolvedValueOnce(jsonResponse({ notification: notification('a', { readAt: '2026-09-19T01:00:00Z' }), unreadCount: 0 }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();
    await screen.findByText('Title b');

    await fireEvent.click(screen.getByRole('checkbox', { name: 'Unread only' }));
    await waitFor(() => expect(screen.queryByText('Title b')).not.toBeInTheDocument());
    expect(calls(fetchMock)[1]).toBe('GET /api/notifications?unread=true');

    await fireEvent.click(await screen.findByRole('button', { name: 'Mark Title a as read' }));
    expect(await screen.findByRole('heading', { name: 'No unread notifications' })).toBeInTheDocument();
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });

  it('marks everything read and re-reads the inbox', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([notification('a'), notification('b')], 2))
      .mockResolvedValueOnce(jsonResponse({ updated: 2, unreadCount: 0 }))
      .mockResolvedValueOnce(page([
        notification('a', { readAt: '2026-09-19T01:00:00Z' }), notification('b', { readAt: '2026-09-19T01:00:00Z' }),
      ], 0));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await screen.findByText('Title a');
    await fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(screen.getByText(/All caught up/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /^Mark Title/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    expect(unreadNotificationCount.value).toBe(0);
    expect(calls(fetchMock)).toEqual(['GET /api/notifications', 'POST /api/notifications/read-all', 'GET /api/notifications']);
  });

  it('loads older notifications with the cursor and hides the button on the last page', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([notification('a'), notification('b')], 3, 'cursor-1'))
      .mockResolvedValueOnce(page([notification('b'), notification('c')], 3, null));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Title c')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    expect(calls(fetchMock)[1]).toBe('GET /api/notifications?before=cursor-1');
  });

  it('keeps the list when an action fails and reports the error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([notification('a')], 1))
      .mockResolvedValueOnce(errorResponse(503, 'SERVICE_UNAVAILABLE', 'Service unavailable.'));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Mark Title a as read' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable.');
    expect(screen.getByRole('button', { name: 'Mark Title a as read' })).toBeEnabled();
  });

  it('shows empty, retryable-error and session-expired states without stale data', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network failure'))
      .mockResolvedValueOnce(page([], 0))
      .mockResolvedValueOnce(page([notification('a', { title: 'Private update' })], 1))
      .mockResolvedValueOnce(errorResponse(401, 'AUTHENTICATION_REQUIRED'));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the API');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'No notifications yet' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByText('Private update');
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to view your notifications.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Private update')).not.toBeInTheDocument();
    expect(unreadNotificationCount.value).toBe(0);
  });

  it('clears notifications on sign-out and aborts on unmount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page([notification('a', { title: 'Private update' })], 1));
    vi.stubGlobal('fetch', fetchMock);
    const view = await renderPage();
    await screen.findByText('Private update');

    session.user = null;
    await waitFor(() => expect(screen.queryByText('Private update')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    view.unmount();
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal?.aborted).toBe(true);
  });
});
