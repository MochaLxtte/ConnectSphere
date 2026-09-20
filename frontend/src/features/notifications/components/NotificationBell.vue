<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { fetchUnreadCount } from '../api/notifications';
import { setUnreadNotificationCount, unreadNotificationCount } from '../unread-count';

const POLL_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | undefined;
let controller: AbortController | undefined;

const badge = computed(() => (unreadNotificationCount.value > 99 ? '99+' : String(unreadNotificationCount.value)));
const label = computed(() => {
  const count = unreadNotificationCount.value;
  return count === 0 ? 'Notifications, none unread' : `Notifications, ${count} unread`;
});

async function refresh() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  try {
    const count = await fetchUnreadCount(current.signal);
    if (!current.signal.aborted) setUnreadNotificationCount(count);
  } catch (error) {
    if (current.signal.aborted) return;
    // An expired session ends polling through the session watcher; other failures keep the last count.
    if (error instanceof ApiError && error.status === 401) clearLocalSession();
  }
}

function stop() {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  controller?.abort();
}

/** Poll only while someone is signed in and the tab is visible. */
function sync() {
  stop();
  if (!authSession.user) {
    setUnreadNotificationCount(0);
    return;
  }
  if (document.visibilityState !== 'visible') return;
  void refresh();
  timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
}

onMounted(() => {
  document.addEventListener('visibilitychange', sync);
  sync();
});
watch(() => authSession.user?.id, sync, { flush: 'sync' });
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', sync);
  stop();
});
</script>

<template>
  <RouterLink v-if="authSession.user" to="/notifications" class="notification-bell" :aria-label="label">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z M10 20a2 2 0 0 0 4 0" />
    </svg>
    <span v-if="unreadNotificationCount > 0" class="notification-badge" aria-hidden="true">{{ badge }}</span>
  </RouterLink>
</template>

<style scoped>
.notification-bell {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 50%; color: var(--green); flex-shrink: 0;
}
.notification-bell:hover, .notification-bell.router-link-active { background: #edf1e6; }
.notification-badge {
  position: absolute; top: 2px; right: 0; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; border: 2px solid #fff; background: #954537; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 14px; text-align: center;
}
</style>
