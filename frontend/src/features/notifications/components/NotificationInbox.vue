<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { formatEventTime } from '../../events/presentation';
import {
  fetchNotifications, markAllNotificationsRead, markNotificationRead, type NotificationItem,
} from '../api/notifications';
import { refreshUnreadCount } from '../state';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: NotificationItem[] };

const state = ref<LoadState>({ status: 'loading' });
const busyId = ref<string | null>(null);
const markingAll = ref(false);
const failure = ref('');
const confirmation = ref('');
let controller: AbortController | undefined;
// List refreshes may replace their own request, but writes belong to this mounted account.
const lifetime = new AbortController();
const ownerId = authSession.user?.id;
const isCurrentAccount = () => !lifetime.signal.aborted && !authSession.loading
  && authSession.user?.id === ownerId;

const items = computed(() => (state.value.status === 'ready' ? state.value.items : []));
const unreadTotal = computed(() => items.value.filter((item) => !item.read).length);

function handleFailure(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 401) {
    // The parent view replaces this page with its sign-in prompt once the session is cleared.
    clearLocalSession();
    return '';
  }
  if (error instanceof ApiError && error.status === 404) {
    return 'That notification is no longer available. The list has been refreshed.';
  }
  return error instanceof Error ? error.message : fallback;
}

async function load(quiet = false) {
  if (!isCurrentAccount()) return;
  controller?.abort();
  const current = new AbortController();
  controller = current;
  // Drop earlier results while reloading so they cannot be mistaken for the new ones.
  if (!quiet) state.value = { status: 'loading' };
  try {
    const loaded = await fetchNotifications(current.signal);
    if (current.signal.aborted || !isCurrentAccount()) return;
    state.value = { status: 'ready', items: loaded };
    void refreshUnreadCount(current.signal);
  } catch (error) {
    if (current.signal.aborted || !isCurrentAccount()) return;
    state.value = {
      status: 'error', message: handleFailure(error, 'Your notifications could not be loaded. Please try again.')
        || 'Sign in to view your notifications.',
    };
  }
}

async function markRead(item: NotificationItem) {
  if (!isCurrentAccount() || busyId.value || markingAll.value || item.read) return;
  busyId.value = item.id;
  failure.value = '';
  confirmation.value = '';
  const current = controller;
  try {
    const updated = await markNotificationRead(item.id, lifetime.signal);
    if (!isCurrentAccount() || current?.signal.aborted || state.value.status !== 'ready') return;
    state.value = { status: 'ready', items: state.value.items.map((other) => (other.id === updated.id ? updated : other)) };
    void refreshUnreadCount(lifetime.signal);
  } catch (error) {
    if (!isCurrentAccount() || current?.signal.aborted) return;
    failure.value = handleFailure(error, 'The notification could not be marked as read. Please try again.');
    if (error instanceof ApiError && error.status === 404) await load(true);
  } finally {
    busyId.value = null;
  }
}

async function markAllRead() {
  if (!isCurrentAccount() || busyId.value || markingAll.value || unreadTotal.value === 0) return;
  markingAll.value = true;
  failure.value = '';
  confirmation.value = '';
  try {
    const updated = await markAllNotificationsRead(lifetime.signal);
    if (!isCurrentAccount()) return;
    confirmation.value = updated === 1 ? '1 notification marked as read.' : `${updated} notifications marked as read.`;
    await load(true);
  } catch (error) {
    if (!isCurrentAccount()) return;
    failure.value = handleFailure(error, 'The notifications could not be marked as read. Please try again.');
  } finally {
    markingAll.value = false;
  }
}

function linkLabel(item: NotificationItem): string {
  return item.booking ? 'Open booking' : 'Open event request';
}

onMounted(() => { void load(); });
onBeforeUnmount(() => {
  lifetime.abort();
  controller?.abort();
});
</script>

<template>
  <section class="panel inbox-panel" aria-labelledby="inbox-title">
    <header class="inbox-header">
      <div>
        <h2 id="inbox-title">Your notifications</h2>
        <p class="inbox-summary" role="status">
          <template v-if="state.status === 'ready'">
            {{ unreadTotal === 0 ? 'No unread notifications' : unreadTotal === 1 ? '1 unread notification' : `${unreadTotal} unread notifications` }}
            · Singapore time
          </template>
          <template v-else>&nbsp;</template>
        </p>
      </div>
      <div class="inbox-actions">
        <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load()">
          <AppIcon name="refresh" :size="16" />Refresh
        </button>
        <button type="button" class="button button-secondary"
          :disabled="state.status !== 'ready' || unreadTotal === 0 || markingAll || busyId !== null" @click="markAllRead">
          {{ markingAll ? 'Marking…' : 'Mark all as read' }}
        </button>
      </div>
    </header>

    <p v-if="confirmation" class="inbox-confirmation" role="status">{{ confirmation }}</p>
    <p v-if="failure" class="inbox-error" role="alert">{{ failure }}</p>

    <p v-if="state.status === 'loading'" role="status">Loading your notifications…</p>

    <div v-else-if="state.status === 'error'" class="inbox-error" role="alert">
      <p>{{ state.message }}</p>
      <button type="button" class="button button-secondary" @click="load()">Try again</button>
    </div>

    <div v-else-if="items.length === 0" class="feature-placeholder">
      <div class="empty-illustration"><AppIcon name="bell" :size="38" /></div>
      <h2>No notifications yet</h2>
      <p>Updates about your event requests, assignments and venue bookings will appear here.</p>
    </div>

    <ul v-else class="inbox-list" aria-label="Notifications">
      <li v-for="item in items" :key="item.id" class="inbox-item" :class="{ 'inbox-item--unread': !item.read }">
        <div class="inbox-item-heading">
          <h3>{{ item.title }}</h3>
          <span v-if="!item.read" class="inbox-tag">Unread</span>
          <time :datetime="item.createdAt">{{ formatEventTime(item.createdAt, 'Time unavailable') }}</time>
        </div>
        <p class="inbox-message">{{ item.message }}</p>
        <p v-if="item.event?.name" class="inbox-context">Event request: {{ item.event.name }}</p>
        <div class="inbox-item-actions">
          <RouterLink v-if="item.link" :to="item.link" class="inbox-link">{{ linkLabel(item) }}</RouterLink>
          <button v-if="!item.read" type="button" class="button button-secondary"
            :disabled="busyId !== null || markingAll" :aria-label="`Mark as read: ${item.title}`" @click="markRead(item)">
            {{ busyId === item.id ? 'Marking…' : 'Mark as read' }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.inbox-panel { padding: 24px; min-width: 0; }
.inbox-header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px 16px; margin-bottom: 20px; }
.inbox-header h2 { font-size: 19px; line-height: 1.5; }
.inbox-summary { color: #59685e; font-size: 13px; margin-top: 4px; min-height: 1.4em; }
.inbox-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.inbox-panel .button { font-size: 13px; padding: 9px 12px; }
.inbox-panel button:disabled { cursor: not-allowed; }
.inbox-confirmation {
  border-left: 3px solid var(--green); background: #f0f5ee; padding: 10px 14px; border-radius: 4px;
  font-size: 14px; margin-bottom: 16px;
}
.inbox-error { color: #8a332b; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
div.inbox-error .button { margin-top: 10px; }
.inbox-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.inbox-item { border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.inbox-item--unread { border-color: #b4c6a3; background: #fcfdf9; border-left: 4px solid var(--green); }
.inbox-item-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.inbox-item-heading h3 { font-size: 15px; font-weight: 650; letter-spacing: -0.2px; }
.inbox-item-heading time { margin-left: auto; color: #59685e; font-size: 12px; }
.inbox-tag { border-radius: 20px; padding: 2px 9px; background: #eaf0e1; color: #354c31; font-size: 11px; font-weight: 650; }
.inbox-message { font-size: 14px; line-height: 1.6; margin-top: 8px; overflow-wrap: anywhere; white-space: pre-wrap; }
.inbox-context { color: #59685e; font-size: 12px; margin-top: 6px; overflow-wrap: anywhere; }
.inbox-item-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-top: 12px; }
.inbox-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 600px) {
  .inbox-panel { padding: 20px; }
  .inbox-item-heading time { margin-left: 0; flex-basis: 100%; }
}
</style>
