import { reactive, readonly } from 'vue';
import { fetchUnreadCount } from './api/notifications';

/** The unread count shown by the top-bar bell, shared with the inbox page so both stay in step. */
const state = reactive({ unread: 0 });
export const notificationCount = readonly(state);

export function setUnreadCount(count: number): void {
  state.unread = Math.max(0, count);
}

/** Forget the previous account's count, for example after sign-out. */
export function resetUnreadCount(): void {
  state.unread = 0;
}

/** Best effort: a failed read keeps the last known count rather than showing an error in the header. */
export async function refreshUnreadCount(signal?: AbortSignal): Promise<void> {
  try {
    const count = await fetchUnreadCount(signal);
    if (!signal?.aborted) setUnreadCount(count);
  } catch {
    /* The inbox page reports load failures; the bell stays quiet. */
  }
}
