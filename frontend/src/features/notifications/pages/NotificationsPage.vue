<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { formatEventTime } from '../../events/presentation';
import {
  fetchNotifications, markAllNotificationsRead, markNotificationRead, type NotificationItem,
} from '../api/notifications';
import { setUnreadNotificationCount } from '../unread-count';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean }
  | { status: 'ready'; items: NotificationItem[]; unreadCount: number; nextCursor: string | null };

const state = ref<LoadState>({ status: 'loading' });
const unreadOnly = ref(false);
const loadingMore = ref(false);
const busy = ref<string | null>(null);
const actionError = ref<string | null>(null);
let controller: AbortController | undefined;

/** Attendees cannot open the organiser/coordinator request page, so they go to the public event page. */
function eventLink(eventRequestId: string): string {
  const id = encodeURIComponent(eventRequestId);
  return authSession.user?.role === 'ATTENDEE' ? `/browse/${id}` : `/events/${id}`;
}

function showSignIn() {
  controller?.abort();
  loadingMore.value = false;
  busy.value = null;
  actionError.value = null;
  setUnreadNotificationCount(0);
  state.value = { status: 'error', signIn: true, message: 'Sign in to view your notifications.' };
}

/** Returns a displayable message, or null when the session expired and sign-in is shown. */
function failureMessage(error: unknown, fallback: string): string | null {
  if (error instanceof ApiError && error.status === 401) {
    clearLocalSession();
    showSignIn();
    return null;
  }
  return error instanceof Error ? error.message : fallback;
}

function begin(): AbortController {
  controller?.abort();
  controller = new AbortController();
  return controller;
}

async function load() {
  const current = begin();
  loadingMore.value = false;
  busy.value = null;
  actionError.value = null;
  state.value = { status: 'loading' };
  try {
    const page = await fetchNotifications({ unreadOnly: unreadOnly.value }, current.signal);
    if (current.signal.aborted) return;
    setUnreadNotificationCount(page.unreadCount);
    state.value = { status: 'ready', ...page };
  } catch (error) {
    if (current.signal.aborted) return;
    const message = failureMessage(error, 'Your notifications could not be loaded. Please try again.');
    if (message) state.value = { status: 'error', signIn: false, message };
  }
}

async function loadMore() {
  if (state.value.status !== 'ready' || !state.value.nextCursor || loadingMore.value) return;
  const current = begin();
  loadingMore.value = true;
  actionError.value = null;
  try {
    const page = await fetchNotifications({ unreadOnly: unreadOnly.value, before: state.value.nextCursor }, current.signal);
    if (current.signal.aborted || state.value.status !== 'ready') return;
    const known = new Set(state.value.items.map((item) => item.id));
    setUnreadNotificationCount(page.unreadCount);
    state.value = {
      status: 'ready', unreadCount: page.unreadCount, nextCursor: page.nextCursor,
      items: [...state.value.items, ...page.items.filter((item) => !known.has(item.id))],
    };
  } catch (error) {
    if (current.signal.aborted) return;
    actionError.value = failureMessage(error, 'Older notifications could not be loaded. Please try again.');
  } finally {
    if (controller === current) loadingMore.value = false;
  }
}

async function markRead(item: NotificationItem) {
  if (busy.value || item.readAt) return;
  const current = begin();
  busy.value = item.id;
  actionError.value = null;
  try {
    const saved = await markNotificationRead(item.id, current.signal);
    if (current.signal.aborted || state.value.status !== 'ready') return;
    setUnreadNotificationCount(saved.unreadCount);
    state.value = {
      ...state.value, unreadCount: saved.unreadCount,
      // In the unread view a read notification leaves the list.
      items: unreadOnly.value
        ? state.value.items.filter((candidate) => candidate.id !== item.id)
        : state.value.items.map((candidate) => (candidate.id === item.id ? saved.notification : candidate)),
    };
  } catch (error) {
    if (current.signal.aborted) return;
    actionError.value = failureMessage(error, 'The notification could not be marked as read. Please try again.');
  } finally {
    if (controller === current) busy.value = null;
  }
}

async function markAllRead() {
  if (busy.value || state.value.status !== 'ready') return;
  const current = begin();
  busy.value = 'all';
  actionError.value = null;
  try {
    await markAllNotificationsRead(current.signal);
    if (current.signal.aborted) return;
    // Re-read so read times and paging come from the server.
    await load();
  } catch (error) {
    if (current.signal.aborted) return;
    actionError.value = failureMessage(error, 'Notifications could not be marked as read. Please try again.');
  } finally {
    if (controller === current || busy.value === 'all') busy.value = null;
  }
}

onMounted(load);
watch(unreadOnly, () => void load());
// Signing out or changing account must not leave the previous user's notifications visible.
watch(() => authSession.user?.id, () => {
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Your account</p>
    <h1>Notifications</h1>
    <p class="page-description">Updates about your events, bookings and registrations.</p>
  </section>

  <section class="panel notifications-panel" aria-labelledby="notifications-title">
    <header class="notifications-header">
      <div>
        <h2 id="notifications-title">Inbox</h2>
        <p v-if="state.status === 'ready'" role="status">
          {{ state.unreadCount === 0 ? 'All caught up' : `${state.unreadCount} unread` }} · Singapore time
        </p>
      </div>
      <div class="notifications-actions">
        <label class="unread-filter">
          <input v-model="unreadOnly" type="checkbox" :disabled="state.status === 'error' && state.signIn" />
          Unread only
        </label>
        <button
          type="button" class="button button-secondary"
          :disabled="state.status !== 'ready' || state.unreadCount === 0 || busy !== null" @click="markAllRead"
        >{{ busy === 'all' ? 'Marking…' : 'Mark all as read' }}</button>
        <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load">Refresh</button>
      </div>
    </header>

    <p v-if="actionError" class="notifications-action-error" role="alert">{{ actionError }}</p>

    <p v-if="state.status === 'loading'" role="status">Loading your notifications…</p>

    <div v-else-if="state.status === 'error'" class="notifications-error" role="alert">
      <p>{{ state.message }}</p>
      <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else type="button" class="button button-secondary" @click="load">Try again</button>
    </div>

    <div v-else-if="state.items.length === 0" class="feature-placeholder">
      <div class="empty-illustration"><AppIcon name="check" :size="38" /></div>
      <h2>{{ unreadOnly ? 'No unread notifications' : 'No notifications yet' }}</h2>
      <p>{{ unreadOnly ? 'You have read everything in your inbox.' : 'Updates about your events will appear here.' }}</p>
    </div>

    <template v-else>
      <ul class="notification-list" aria-label="Your notifications">
        <li v-for="item in state.items" :key="item.id" class="notification-item" :class="{ 'is-unread': !item.readAt }">
          <div class="notification-body">
            <h3>
              <span v-if="!item.readAt" class="unread-dot" aria-hidden="true"></span>
              <span v-if="!item.readAt" class="visually-hidden">Unread: </span>{{ item.title }}
            </h3>
            <p class="notification-message">{{ item.message }}</p>
            <p class="notification-meta">
              <time :datetime="item.createdAt">{{ formatEventTime(item.createdAt) }}</time>
              <template v-if="item.eventRequestId">
                 · <RouterLink :to="eventLink(item.eventRequestId)" :aria-label="`View event for ${item.title}`">View event</RouterLink>
              </template>
            </p>
          </div>
          <button
            v-if="!item.readAt" type="button" class="button button-secondary" :disabled="busy !== null"
            :aria-label="`Mark ${item.title} as read`" @click="markRead(item)"
          >{{ busy === item.id ? 'Marking…' : 'Mark as read' }}</button>
        </li>
      </ul>
      <div v-if="state.nextCursor" class="notifications-more">
        <button type="button" class="button button-secondary" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.notifications-panel { padding: 24px; }
.notifications-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.notifications-header h2 { font-size: 18px; }
.notifications-header p, .notification-meta { color: #59685e; font-size: 12px; line-height: 1.6; margin-top: 6px; }
.notifications-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 12px; }
.unread-filter { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
.unread-filter input { accent-color: var(--green); width: 16px; height: 16px; margin: 0; }
.unread-filter input:focus-visible { outline: 3px solid #90a950; outline-offset: 3px; }
.notifications-error .button { margin-top: 12px; }
.notifications-action-error { color: #853e37; font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
.notification-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.notification-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.notification-item.is-unread { background: #f7faf3; border-color: #cfdcc3; }
.notification-item .button { flex-shrink: 0; }
.notification-body { min-width: 0; }
.notification-body h3 { font-size: 15px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.notification-message { font-size: 14px; line-height: 1.6; margin-top: 4px; white-space: pre-wrap; overflow-wrap: anywhere; }
.notification-meta a { color: var(--green); text-decoration: underline; text-underline-offset: 3px; }
.unread-dot { display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; background: #954537; vertical-align: middle; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.notifications-more { display: flex; justify-content: center; margin-top: 20px; }
@media (max-width: 700px) {
  .notifications-panel { padding: 20px; }
  .notifications-header { flex-direction: column; align-items: flex-start; }
  .notifications-actions { justify-content: flex-start; }
  .notification-item { flex-direction: column; gap: 12px; }
}
</style>
