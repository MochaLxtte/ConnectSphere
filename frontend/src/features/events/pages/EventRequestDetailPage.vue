<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { fetchEventRequestDetail, type EventRequestDetail } from '../api/event-requests';
import { eventStatusLabel, formatEventTime } from '../presentation';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'ready'; request: EventRequestDetail };

const route = useRoute();
const requestId = computed(() => String(route.params.id ?? ''));
const state = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

function showSignIn() {
  controller?.abort();
  state.value = {
    status: 'error', signIn: true, retryable: false,
    message: 'Sign in to view this event request.',
  };
}

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  // Clear the previous request before rechecking access or switching accounts.
  state.value = { status: 'loading' };
  try {
    const request = await fetchEventRequestDetail(requestId.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', request };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      showSignIn();
      return;
    }
    const unavailable = error instanceof ApiError && [400, 403, 404].includes(error.status ?? 0);
    state.value = {
      status: 'error', signIn: false, retryable: !unavailable,
      message: unavailable
        ? 'This event request is unavailable or you do not have permission to view it.'
        : 'This event request could not be loaded. Please try again.',
    };
  }
}

function missingReviewMessage(status: string): string {
  if (status === 'DRAFT') return 'This request is still a draft and has not been submitted for review.';
  if (status === 'APPROVED' || status === 'REJECTED') return 'Review details are unavailable.';
  return 'No approval or rejection has been recorded yet.';
}

watch(requestId, () => { void load(); }, { immediate: true });
watch(() => [authSession.user?.id, authSession.user?.role], () => {
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For organisers</p>
    <h1>Event request</h1>
    <p class="page-description">View your request and its latest review outcome.</p>
  </section>

  <div class="detail-toolbar">
    <RouterLink to="/events" class="back-link">Back to event requests</RouterLink>
    <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load">Refresh</button>
  </div>

  <p v-if="state.status === 'loading'" class="panel detail-panel" role="status">Loading the event request…</p>
  <div v-else-if="state.status === 'error'" class="panel detail-panel detail-error" role="alert">
    <p>{{ state.message }}</p>
    <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
    <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
  </div>

  <div v-else class="detail-grid">
    <section class="panel detail-panel" aria-labelledby="request-heading">
      <h2 id="request-heading">{{ state.request.name?.trim() || 'Untitled event request' }}</h2>
      <p class="time-note">All dates and times are in Singapore time.</p>
      <dl class="request-fields">
        <dt>Status</dt><dd class="status-value">{{ eventStatusLabel(state.request.status) }}</dd>
        <dt>Last updated</dt><dd><time :datetime="state.request.updatedAt">{{ formatEventTime(state.request.updatedAt) }}</time></dd>
        <dt>Purpose</dt><dd>{{ state.request.purpose?.trim() || 'Not provided' }}</dd>
        <dt>Description</dt><dd>{{ state.request.description?.trim() || 'Not provided' }}</dd>
        <dt>Starts</dt><dd><time v-if="state.request.startsAt" :datetime="state.request.startsAt">{{ formatEventTime(state.request.startsAt) }}</time><span v-else>Not provided</span></dd>
        <dt>Ends</dt><dd><time v-if="state.request.endsAt" :datetime="state.request.endsAt">{{ formatEventTime(state.request.endsAt) }}</time><span v-else>Not provided</span></dd>
        <dt>Expected attendance</dt><dd>{{ state.request.expectedAttendance ?? 'Not provided' }}</dd>
        <dt>Venue requirements</dt><dd>{{ state.request.venueRequirements?.trim() || 'Not provided' }}</dd>
        <dt>Accessibility needs</dt><dd>{{ state.request.accessibilityNeeds?.trim() || 'Not provided' }}</dd>
        <dt>Equipment requirements</dt><dd>{{ state.request.equipmentRequirements?.trim() || 'Not provided' }}</dd>
        <dt>Registration required</dt><dd>{{ state.request.registrationRequired == null ? 'Not provided' : state.request.registrationRequired ? 'Yes' : 'No' }}</dd>
      </dl>
    </section>

    <section class="panel detail-panel outcome-panel" aria-labelledby="review-outcome-heading">
      <h2 id="review-outcome-heading">Review outcome</h2>
      <dl v-if="state.request.review" class="outcome-fields">
        <dt>Outcome</dt><dd class="outcome-value" :class="`outcome-value--${state.request.review.decision.toLowerCase()}`">{{ eventStatusLabel(state.request.review.decision) }}</dd>
        <dt>Reason</dt><dd>{{ state.request.review.reason?.trim() || 'No reason provided.' }}</dd>
        <dt>Recorded on</dt><dd><time :datetime="state.request.review.createdAt">{{ formatEventTime(state.request.review.createdAt) }}</time></dd>
      </dl>
      <p v-else class="outcome-message">{{ missingReviewMessage(state.request.status) }}</p>
    </section>
  </div>
</template>

<style scoped>
.detail-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.back-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.detail-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); align-items: start; gap: 20px; }
.detail-panel { padding: 24px; min-width: 0; overflow-wrap: anywhere; line-height: 1.6; }
.detail-panel h2 { font-size: 19px; line-height: 1.5; }
.time-note { color: #59685e; font-size: 12px; margin-top: 8px; }
dl { margin: 24px 0 0; font-size: 14px; }
dt { color: #59685e; }
dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.request-fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr); gap: 16px 20px; }
.status-value { font-weight: 650; }
.outcome-fields dt:not(:first-child) { margin-top: 20px; }
.outcome-fields dd { margin-top: 6px; }
.outcome-value { display: inline-block; border-radius: 20px; padding: 6px 12px; font-weight: 650; }
.outcome-value--approved { background: #edf5e9; color: #365d2e; }
.outcome-value--rejected { background: #fbeeed; color: #853e37; }
.outcome-message { margin-top: 20px; font-size: 14px; }
.detail-error .button { margin-top: 12px; }
@media (max-width: 1000px) {
  .detail-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .detail-panel { padding: 20px; }
  .request-fields { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .request-fields dt:not(:first-child) { margin-top: 12px; }
}
</style>
