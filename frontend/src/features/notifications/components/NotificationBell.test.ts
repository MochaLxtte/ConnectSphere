import { screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { authSession } from '../../auth/session.js';
import { errorResponse, jsonResponse, renderAt, user } from '../../registrations/test-helpers';
import { setUnreadNotificationCount } from '../unread-count';
import NotificationBell from './NotificationBell.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: ReturnType<typeof user> | null; loading: boolean };
let visibility: DocumentVisibilityState = 'visible';

function setVisibility(value: DocumentVisibilityState) {
  visibility = value;
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Let the mocked fetch, JSON parsing and Vue updates settle under fake timers. */
async function settle() {
  await vi.advanceTimersByTimeAsync(0);
  await nextTick();
}

const count = (unreadCount: number) => () => Promise.resolve(jsonResponse({ unreadCount }));

beforeEach(() => {
  vi.useFakeTimers();
  visibility = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  session.user = user('ATTENDEE');
  setUnreadNotificationCount(0);
});

afterEach(() => { vi.useRealTimers(); });

describe('CF-20 notification bell', () => {
  it('shows the unread badge, links to the inbox and polls every 60 seconds', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(count(3)).mockImplementationOnce(count(120)).mockImplementation(count(0));
    vi.stubGlobal('fetch', fetchMock);
    await renderAt(NotificationBell, '/');
    await settle();

    const link = screen.getByRole('link', { name: 'Notifications, 3 unread' });
    expect(link).toHaveAttribute('href', '/notifications');
    expect(link).toHaveTextContent('3');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/notifications/unread-count');

    await vi.advanceTimersByTimeAsync(59_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('link', { name: 'Notifications, 120 unread' })).toHaveTextContent('99+');

    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(screen.getByRole('link', { name: 'Notifications, none unread' })).toHaveTextContent('');
  });

  it('renders nothing and never polls while signed out, then starts on sign-in and stops on sign-out', async () => {
    session.user = null;
    const fetchMock = vi.fn().mockImplementation(count(2));
    vi.stubGlobal('fetch', fetchMock);
    await renderAt(NotificationBell, '/');
    await vi.advanceTimersByTimeAsync(180_000);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    session.user = user('ATTENDEE');
    await settle();
    expect(screen.getByRole('link', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    session.user = null;
    await settle();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(180_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pauses while the tab is hidden and refreshes as soon as it is visible again', async () => {
    const fetchMock = vi.fn().mockImplementation(count(1));
    vi.stubGlobal('fetch', fetchMock);
    await renderAt(NotificationBell, '/');
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not start polling when mounted in a hidden tab', async () => {
    visibility = 'hidden';
    const fetchMock = vi.fn().mockImplementation(count(1));
    vi.stubGlobal('fetch', fetchMock);
    await renderAt(NotificationBell, '/');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops polling and aborts the pending read on unmount', async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const view = await renderAt(NotificationBell, '/');
    const signal = (fetchMock.mock.calls[0]?.[1] as RequestInit).signal;

    view.unmount();
    expect(signal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(300_000);
    setVisibility('visible');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the last count through a server failure and stops after the session expires', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(count(4))
      .mockImplementationOnce(() => Promise.resolve(errorResponse(503, 'SERVICE_UNAVAILABLE')))
      .mockImplementationOnce(() => Promise.resolve(errorResponse(401, 'AUTHENTICATION_REQUIRED')));
    vi.stubGlobal('fetch', fetchMock);
    await renderAt(NotificationBell, '/');
    await settle();

    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(screen.getByRole('link', { name: 'Notifications, 4 unread' })).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(session.user).toBeNull();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(180_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reflects a count changed elsewhere, such as the notifications page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(count(5)));
    await renderAt(NotificationBell, '/');
    await settle();
    setUnreadNotificationCount(2);
    await nextTick();
    expect(screen.getByRole('link', { name: 'Notifications, 2 unread' })).toHaveTextContent('2');
  });
});
