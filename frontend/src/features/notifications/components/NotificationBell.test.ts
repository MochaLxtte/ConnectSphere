import { render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession, type SignedInUser } from '../../auth/session.js';
import { notificationCount, resetUnreadCount, setUnreadCount } from '../state';
import NotificationBell from './NotificationBell.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (id = 'user-1'): SignedInUser => ({ id, role: 'EVENT_ORGANISER', email: `${id}@example.test`, displayName: id });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

async function mount() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  });
  await router.push('/events');
  await router.isReady();
  return { router, ...render(NotificationBell, { global: { plugins: [router] } }) };
}

beforeEach(() => {
  session.user = user();
  session.loading = false;
  resetUnreadCount();
});
afterEach(() => { vi.useRealTimers(); });

describe('KAN-64-AC204 notification bell', () => {
  it('links to the inbox and shows no badge when nothing is unread', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ unreadCount: 0 })));
    await mount();
    const link = screen.getByRole('link', { name: 'Notifications' });
    expect(link).toHaveAttribute('href', '/notifications');
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/notifications/unread-count', expect.anything()));
    expect(link).toHaveTextContent('');
  });

  it('shows the unread count in a badge and in the accessible name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ unreadCount: 3 })));
    await mount();
    const link = await screen.findByRole('link', { name: 'Notifications, 3 unread' });
    expect(link).toHaveTextContent('3');
  });

  it('caps a large count at 99+', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ unreadCount: 250 })));
    await mount();
    expect(await screen.findByRole('link', { name: 'Notifications, 250 unread' })).toHaveTextContent('99+');
  });

  it('follows the shared count when the inbox page changes it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ unreadCount: 2 })));
    await mount();
    await screen.findByRole('link', { name: 'Notifications, 2 unread' });
    setUnreadCount(1);
    expect(await screen.findByRole('link', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
    setUnreadCount(0);
    expect(await screen.findByRole('link', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('refreshes when the user navigates', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ unreadCount: 1 })).mockResolvedValueOnce(json({ unreadCount: 4 }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await mount();
    await screen.findByRole('link', { name: 'Notifications, 1 unread' });
    await router.push('/reviews');
    expect(await screen.findByRole('link', { name: 'Notifications, 4 unread' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never shows the previous account\'s count to the next account', async () => {
    let release!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ unreadCount: 5 }))
      .mockReturnValueOnce(new Promise<Response>((resolve) => { release = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    await screen.findByRole('link', { name: 'Notifications, 5 unread' });

    session.user = user('user-2');
    await waitFor(() => expect(notificationCount.unread).toBe(0));
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
    release(json({ unreadCount: 2 }));
    expect(await screen.findByRole('link', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
  });

  it('aborts a superseded read so a late answer cannot overwrite a newer one', async () => {
    const first: { resolve?: (response: Response) => void } = {};
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { first.resolve = resolve; }))
      .mockResolvedValueOnce(json({ unreadCount: 6 }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await mount();
    const signal = (fetchMock.mock.calls[0]![1] as RequestInit).signal!;
    await router.push('/reviews');
    expect(await screen.findByRole('link', { name: 'Notifications, 6 unread' })).toBeInTheDocument();
    expect(signal.aborted).toBe(true);
    first.resolve?.(json({ unreadCount: 99 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole('link', { name: 'Notifications, 6 unread' })).toBeInTheDocument();
  });

  it('stays quiet and keeps the last count when a read fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ unreadCount: 2 }))
      .mockRejectedValueOnce(new TypeError('network down'));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await mount();
    await screen.findByRole('link', { name: 'Notifications, 2 unread' });
    await router.push('/reviews');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole('link', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refreshes every minute while the tab is visible, and not while it is hidden', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const fetchMock = vi.fn().mockResolvedValue(json({ unreadCount: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('visible');
    const view = await mount();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    visibility.mockReturnValue('hidden');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    visibility.mockReturnValue('visible');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    view.unmount();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    visibility.mockRestore();
  });

  it('does not poll when nobody is signed in', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    session.user = null;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    await vi.advanceTimersByTimeAsync(180_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
