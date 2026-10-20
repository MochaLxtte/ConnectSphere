import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser } from '../auth/session.js';
import { notificationCount, refreshUnreadCount, resetUnreadCount } from './state';

vi.mock('../auth/session.js', async () => {
  const { reactive } = await import('vue');
  return { authSession: reactive({ user: null, loading: false }) };
});

const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (id: string): SignedInUser =>
  ({ id, role: 'EVENT_ORGANISER', email: `${id}@example.test`, displayName: id });
const json = (unreadCount: number) => new Response(JSON.stringify({ unreadCount }), { status: 200 });

function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((fulfil) => { resolve = fulfil; });
  return { promise, resolve };
}

beforeEach(() => {
  session.user = user('user-1');
  session.loading = false;
  resetUnreadCount();
});

describe('KAN-64-AC204/AC206 unread-count request ownership', () => {
  it('keeps the latest same-account result when independent callers finish out of order', async () => {
    const first = deferred();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(json(2)));
    const oldRead = refreshUnreadCount();
    await refreshUnreadCount();
    expect(notificationCount.unread).toBe(2);
    first.resolve(json(9));
    await oldRead;
    expect(notificationCount.unread).toBe(2);
  });

  it('does not publish a pending count into a replacement account', async () => {
    const first = deferred();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(first.promise));
    const oldRead = refreshUnreadCount();
    session.user = user('user-2');
    first.resolve(json(9));
    await oldRead;
    expect(notificationCount.unread).toBe(0);
  });

  it('invalidates a pending response when the count is reset', async () => {
    const first = deferred();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(first.promise));
    const oldRead = refreshUnreadCount();
    resetUnreadCount();
    first.resolve(json(9));
    await oldRead;
    expect(notificationCount.unread).toBe(0);
  });
});
