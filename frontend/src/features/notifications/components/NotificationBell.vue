<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from '../../../components/AppIcon.vue';
import { authSession } from '../../auth/session.js';
import { notificationCount, refreshUnreadCount, resetUnreadCount } from '../state';

/** KAN-64: top-bar entry to the inbox with an unread badge. Only mounted for a signed-in user. */
const REFRESH_MS = 60_000;
const route = useRoute();
const unread = computed(() => notificationCount.unread);
const label = computed(() => (unread.value > 0
  ? `Notifications, ${unread.value} unread` : 'Notifications'));
const badge = computed(() => (unread.value > 99 ? '99+' : String(unread.value)));
let controller: AbortController | undefined;
let timer: ReturnType<typeof setInterval> | undefined;

function refresh() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  void refreshUnreadCount(current.signal);
}

// A different account must never inherit the previous account's count.
watch(() => authSession.user?.id, (id) => {
  resetUnreadCount();
  if (id) refresh();
}, { immediate: true });
// Moving around the app is the natural moment to pick up something new.
watch(() => route.fullPath, () => { if (authSession.user) refresh(); });

onMounted(() => {
  timer = setInterval(() => {
    if (authSession.user && document.visibilityState !== 'hidden') refresh();
  }, REFRESH_MS);
});
onBeforeUnmount(() => {
  controller?.abort();
  if (timer) clearInterval(timer);
});
</script>

<template>
  <RouterLink to="/notifications" class="notification-link" :aria-label="label">
    <AppIcon name="bell" :size="18" />
    <span v-if="unread > 0" class="notification-badge" aria-hidden="true">{{ badge }}</span>
  </RouterLink>
</template>

<style scoped>
.notification-link {
  position: relative; display: inline-grid; place-items: center; width: 38px; height: 38px;
  border: 1px solid #dde4d7; border-radius: 6px; background: #fff; color: #5c6d54;
}
.notification-link:hover { background: #edf1e6; }
.notification-link.router-link-active { background: #eaf0e1; color: #354c31; }
@media (max-width: 400px) {
  .notification-link { width: 34px; height: 34px; }
}
.notification-badge {
  position: absolute; top: -7px; right: -7px; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: var(--green); color: #fff; font-size: 10px; font-weight: 650;
  line-height: 18px; text-align: center; border: 2px solid #fdfefb; box-sizing: content-box;
}
</style>
