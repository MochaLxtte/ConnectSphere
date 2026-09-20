<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { eventStatusLabel, formatEventTime } from '../../events/presentation';
import { fetchMyRegistrations, withdrawFromEvent, type MyRegistration } from '../api/registrations';
import { registrationStatusLabel, venueLabel } from '../presentation';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean }
  | { status: 'ready'; items: MyRegistration[] };

const state = ref<LoadState>({ status: 'loading' });
const confirmingId = ref<string | null>(null);
const withdrawingId = ref<string | null>(null);
const feedback = ref<{ tone: 'success' | 'error'; message: string } | null>(null);
let controller: AbortController | undefined;
let actionController: AbortController | undefined;

const discoverable = (item: MyRegistration) => ['APPROVED', 'CONFIRMED'].includes(item.event.status);

function showSignIn() {
  controller?.abort();
  actionController?.abort();
  feedback.value = null;
  state.value = { status: 'error', signIn: true, message: 'Sign in to view your registrations.' };
}

function handleFailure(error: unknown, fallback: string): string | null {
  if (error instanceof ApiError && error.status === 401) {
    clearLocalSession();
    showSignIn();
    return null;
  }
  return error instanceof Error ? error.message : fallback;
}

async function load(quiet = false) {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  confirmingId.value = null;
  if (!quiet || state.value.status !== 'ready') {
    state.value = { status: 'loading' };
    feedback.value = null;
  }
  try {
    const items = await fetchMyRegistrations(current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    const message = handleFailure(error, 'Your registrations could not be loaded. Please try again.');
    if (message) state.value = { status: 'error', signIn: false, message };
  }
}

async function withdraw(item: MyRegistration) {
  if (withdrawingId.value) return;
  const current = new AbortController();
  actionController = current;
  withdrawingId.value = item.registrationId;
  confirmingId.value = null;
  feedback.value = null;
  try {
    await withdrawFromEvent(item.eventRequestId, current.signal);
    if (current.signal.aborted) return;
    feedback.value = { tone: 'success', message: `You withdrew from ${item.event.name?.trim() || 'the event'}.` };
    await load(true);
  } catch (error) {
    if (current.signal.aborted) return;
    const message = handleFailure(error, 'The withdrawal could not be completed. Please try again.');
    if (!message) return;
    feedback.value = { tone: 'error', message };
    // A conflict means this list is stale.
    if (error instanceof ApiError && (error.status === 409 || error.status === 404)) await load(true);
  } finally {
    if (actionController === current) withdrawingId.value = null;
  }
}

onMounted(() => load());
// Signing out or changing account must not leave the previous user's registrations visible.
watch(() => [authSession.user?.id, authSession.user?.role], () => {
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
onBeforeUnmount(() => {
  controller?.abort();
  actionController?.abort();
});
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For attendees</p>
    <h1>My registrations</h1>
    <p class="page-description">Review the events you have registered for.</p>
  </section>

  <section class="panel registrations-panel" aria-labelledby="registrations-title">
    <header class="registrations-header">
      <div>
        <h2 id="registrations-title">Your registrations</h2>
        <p>Most recent first · Singapore time</p>
      </div>
      <div class="registrations-actions">
        <RouterLink to="/browse" class="text-link">Browse events</RouterLink>
        <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load()">Refresh</button>
      </div>
    </header>

    <p v-if="feedback" class="registrations-feedback" :class="`registrations-feedback--${feedback.tone}`"
      :role="feedback.tone === 'error' ? 'alert' : 'status'">{{ feedback.message }}</p>

    <p v-if="state.status === 'loading'" role="status">Loading your registrations…</p>

    <div v-else-if="state.status === 'error'" class="registrations-error" role="alert">
      <p>{{ state.message }}</p>
      <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else type="button" class="button button-secondary" @click="load()">Try again</button>
    </div>

    <div v-else-if="state.items.length === 0" class="feature-placeholder">
      <div class="empty-illustration"><AppIcon name="calendar" :size="38" /></div>
      <h2>No registrations yet</h2>
      <p>Events you register for will appear here.</p>
      <RouterLink to="/browse" class="text-link">Browse events</RouterLink>
    </div>

    <ul v-else class="registration-list" aria-label="Your registrations">
      <li v-for="item in state.items" :key="item.registrationId" class="registration-item">
        <div class="registration-summary">
          <h3>
            <RouterLink v-if="discoverable(item)" :to="`/browse/${item.eventRequestId}`">{{ item.event.name?.trim() || 'Untitled event' }}</RouterLink>
            <span v-else>{{ item.event.name?.trim() || 'Untitled event' }}</span>
          </h3>
          <p class="registration-meta">
            <time v-if="item.event.startsAt" :datetime="item.event.startsAt">{{ formatEventTime(item.event.startsAt) }}</time>
            <span v-else>Start time to be confirmed</span>
            · {{ venueLabel(item.event.venue) }}
          </p>
          <p class="registration-meta">
            <template v-if="item.status === 'WITHDRAWN' && item.withdrawnAt">Withdrawn <time :datetime="item.withdrawnAt">{{ formatEventTime(item.withdrawnAt) }}</time></template>
            <template v-else>Registered <time :datetime="item.registeredAt">{{ formatEventTime(item.registeredAt) }}</time></template>
            <template v-if="!discoverable(item)"> · Event {{ eventStatusLabel(item.event.status).toLowerCase() }}</template>
          </p>
        </div>
        <div class="registration-side">
          <span class="registration-status" :class="`registration-status--${item.status.toLowerCase()}`">
            {{ registrationStatusLabel(item.status) }}
          </span>
          <template v-if="item.event.canWithdraw">
            <div v-if="confirmingId === item.registrationId" class="withdraw-confirm" role="group"
              :aria-label="`Withdraw from ${item.event.name?.trim() || 'Untitled event'}?`">
              <button type="button" class="button button-danger" :disabled="withdrawingId !== null" @click="withdraw(item)">Confirm withdrawal</button>
              <button type="button" class="button button-secondary" @click="confirmingId = null">Keep my place</button>
            </div>
            <button
              v-else type="button" class="button button-secondary" :disabled="withdrawingId !== null"
              :aria-label="`Withdraw from ${item.event.name?.trim() || 'Untitled event'}`"
              @click="confirmingId = item.registrationId"
            >{{ withdrawingId === item.registrationId ? 'Withdrawing…' : 'Withdraw' }}</button>
          </template>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.registrations-panel { padding: 24px; }
.registrations-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.registrations-header h2 { font-size: 18px; }
.registrations-header p, .registration-meta { color: #59685e; font-size: 12px; line-height: 1.6; margin-top: 6px; }
.registrations-actions { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.registrations-actions .text-link { font-size: 13px; }
.registrations-error .button { margin-top: 12px; }
.registrations-feedback { font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
.registrations-feedback--success { color: #365d2e; }
.registrations-feedback--error { color: #853e37; }
.registration-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.registration-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.registration-summary { min-width: 0; }
.registration-summary h3 { font-size: 15px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.registration-summary a { color: var(--green); text-decoration: underline; text-underline-offset: 3px; }
.registration-side { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; flex-shrink: 0; max-width: 100%; }
.registration-side .button { font-size: 13px; }
.button-danger { background: #954537; color: #fff; }
.withdraw-confirm { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.registration-status { border-radius: 20px; padding: 6px 12px; background: #f2f3ed; color: #52614e; font-size: 12px; font-weight: 600; line-height: 1.5; }
.registration-status--registered { background: #edf5e9; color: #365d2e; }
@media (max-width: 600px) {
  .registrations-panel { padding: 20px; }
  .registrations-header { flex-wrap: wrap; }
  .registration-item { flex-direction: column; align-items: flex-start; gap: 12px; }
  .registration-side { align-items: flex-start; }
  .withdraw-confirm { justify-content: flex-start; }
}
</style>
