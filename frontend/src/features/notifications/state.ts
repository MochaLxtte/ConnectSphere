import { reactive, readonly } from 'vue';
import { authSession } from '../auth/session.js';
import { fetchUnreadCount } from './api/notifications';

/** The unread count shown by the top-bar bell, shared with the inbox page so both stay in step. */
const state = reactive({ unread: 0 });
export const notificationCount = readonly(state);
let requestVersion = 0;

export function setUnreadCount(count: number): void {
  state.unread = Math.max(0, count);
}

/** Forget the previous account's count, for example after sign-out. */
export function resetUnreadCount(): void {
  requestVersion += 1;
  state.unread = 0;
}

/** Best effort: a failed read keeps the last known count rather than showing an error in the header. */
export async function refreshUnreadCount(signal?: AbortSignal): Promise<void> {
  const ownerId = authSession.user?.id;
  if (!ownerId || authSession.loading || signal?.aborted) return;
  // The bell and inbox issue independent reads. Only the newest one may publish its answer.
  const version = ++requestVersion;
  try {
    const count = await fetchUnreadCount(signal);
    if (!signal?.aborted && version === requestVersion && !authSession.loading
      && authSession.user?.id === ownerId) setUnreadCount(count);
  } catch {
    /* The inbox page reports load failures; the bell stays quiet. */
  }
}
