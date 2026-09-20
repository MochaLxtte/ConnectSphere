<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { fetchEventRequests, type EventRequestListItem } from '../api/event-requests';
import { eventStatusLabel, formatEventTime } from '../presentation';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'ready'; items: EventRequestListItem[] };

const state = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

function showSignIn() {
  controller?.abort();
  state.value = {
    status: 'error', signIn: true, retryable: false,
    message: 'Sign in to view your event requests.',
  };
}

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  // Remove earlier results while rechecking the session and the latest persisted status.
  state.value = { status: 'loading' };
  try {
    const items = await fetchEventRequests(current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      showSignIn();
      return;
    }
    const forbidden = error instanceof ApiError &&
      (error.status === 403 || error.code === 'INVALID_EVENT_LIST_SCOPE');
    state.value = {
      status: 'error', signIn: false, retryable: !forbidden,
      message: forbidden ? 'This page is for event organisers.'
          : error instanceof Error ? error.message : 'Your event requests could not be loaded. Please try again.',
    };
  }
}

onMounted(load);
// Signing out or changing account must not leave the previous organiser's results visible.
watch(() => [authSession.user?.id, authSession.user?.role], () => {
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For organisers</p>
    <h1>Event requests</h1>
    <p class="page-description">Track the progress of your event requests.</p>
  </section>

  <section class="panel requests-panel" aria-labelledby="requests-title">
    <header class="requests-header">
      <div>
        <h2 id="requests-title">Your requests</h2>
        <p>Most recently updated first · Singapore time</p>
      </div>
      <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load">
        Refresh
      </button>
    </header>

    <p v-if="state.status === 'loading'" role="status">Loading your event requests…</p>

    <div v-else-if="state.status === 'error'" class="requests-error" role="alert">
      <p>{{ state.message }}</p>
      <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
    </div>

    <div v-else-if="state.items.length === 0" class="feature-placeholder">
      <div class="empty-illustration"><AppIcon name="calendar" :size="38" /></div>
      <h2>No event requests yet</h2>
      <p>Your saved and submitted requests will appear here.</p>
    </div>

    <ul v-else class="request-list" aria-label="Your event requests">
      <li v-for="item in state.items" :key="item.id" class="request-item">
        <div class="request-summary">
          <h3>
            <RouterLink :to="item.status === 'DRAFT' ? `/events/${item.id}/edit` : `/events/${item.id}`">
              {{ item.name?.trim() || 'Untitled event request' }}
            </RouterLink>
          </h3>
          <p class="request-updated">Updated <time :datetime="item.updatedAt">{{ formatEventTime(item.updatedAt, 'Update time unavailable') }}</time></p>
        </div>
        <span class="request-status" :class="`request-status--${item.status.toLowerCase()}`">
          {{ eventStatusLabel(item.status) }}
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.requests-panel { padding: 24px; }
.requests-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.requests-header h2 { font-size: 18px; }
.requests-header p, .request-updated { color: #59685e; font-size: 12px; line-height: 1.6; margin-top: 6px; }
.requests-header .button { flex-shrink: 0; }
.requests-error .button { margin-top: 12px; }
.request-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.request-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.request-summary { min-width: 0; }
.request-summary h3 { font-size: 15px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.request-summary a { color: var(--green); text-decoration: underline; text-underline-offset: 3px; }
.request-status { flex-shrink: 0; max-width: 100%; border-radius: 20px; padding: 6px 12px; background: #f2f3ed; color: #52614e; font-size: 12px; font-weight: 600; line-height: 1.5; }
.request-status--submitted, .request-status--under_review { background: #edf2fa; color: #345579; }
.request-status--clarification_requested { background: #fff3df; color: #805518; }
.request-status--approved { background: #edf5e9; color: #365d2e; }
.request-status--rejected { background: #fbeeed; color: #853e37; }
@media (max-width: 600px) {
  .requests-panel { padding: 20px; }
  .requests-header { flex-wrap: wrap; }
  .request-item { flex-direction: column; align-items: flex-start; gap: 12px; }
}
</style>
