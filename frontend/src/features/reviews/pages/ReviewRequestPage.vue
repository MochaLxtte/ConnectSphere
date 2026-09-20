<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ReviewDecisionPanel from '../components/ReviewDecisionPanel.vue';
import EventPlanningPanels from '../../events/components/EventPlanningPanels.vue';
import { fetchReviewRequestDetail, submitReview } from '../api/submitted-requests';
import type { ReviewFeedback, ReviewRequestDetail, ReviewSubmission } from '../types';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: string }
  | { status: 'ready'; detail: ReviewRequestDetail };

const route = useRoute();
const eventRequestId = computed(() => String(route.params.id));
const state = ref<LoadState>({ status: 'loading' });
const feedback = ref<ReviewFeedback | null>(null);
let controller: AbortController | undefined;
let viewVersion = 0;

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const detail = await fetchReviewRequestDetail(eventRequestId.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', detail };
  } catch (error) {
    if (current.signal.aborted) return;
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code) : 'REQUEST_FAILED';
    state.value = {
      status: 'error',
      code,
      message: error instanceof Error
        ? error.message
        : 'This event request could not be loaded. Please try again.',
    };
  }
}

/** After a panel saves, update the status without unmounting the panels. */
async function refreshQuietly() {
  const current = controller;
  try {
    const detail = await fetchReviewRequestDetail(eventRequestId.value, current?.signal);
    if (!current?.signal.aborted && state.value.status === 'ready') state.value = { status: 'ready', detail };
  } catch {
    // Handing a request to another coordinator removes access; show the unavailable message.
    if (!current?.signal.aborted) await load();
  }
}

async function handleSubmit(submission: ReviewSubmission) {
  if (state.value.status !== 'ready' || state.value.detail.id !== submission.eventRequestId ||
    state.value.detail.actions?.canMakeInitialDecision !== true || feedback.value?.state === 'saving') return;
  const currentView = viewVersion;
  feedback.value = { eventRequestId: submission.eventRequestId, state: 'saving' };
  try {
    const saved = await submitReview(submission);
    // A completed write must not replace the request opened after navigation.
    if (currentView !== viewVersion) return;
    feedback.value = { eventRequestId: submission.eventRequestId, state: 'saved', decision: saved.decision };
    await load();
  } catch (error) {
    if (currentView !== viewVersion) return;
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code) : 'REQUEST_FAILED';
    feedback.value = { eventRequestId: submission.eventRequestId, state: 'error', code };
  }
}

function handleRefresh() {
  feedback.value = null;
  void load();
}

watch(eventRequestId, () => {
  viewVersion += 1;
  feedback.value = null;
  void load();
}, { immediate: true });
onBeforeUnmount(() => {
  viewVersion += 1;
  controller?.abort();
});
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For coordinators</p>
    <h1>Event request review</h1>
    <p class="page-description">Review the organiser's submitted details and record an outcome.</p>
  </section>

  <p v-if="state.status === 'loading'" role="status">Loading the event request…</p>

  <div v-else-if="state.status === 'error'" class="panel" role="alert">
    <p v-if="feedback?.state === 'saved'">Your decision was recorded, but the latest request details could not be loaded.</p>
    <p>{{ state.code === 'EVENT_REQUEST_NOT_FOUND'
      ? 'This event request is unavailable or you do not have permission to review it.'
      : state.message }}</p>
    <button type="button" class="button button-secondary" @click="load">Try again</button>
  </div>

  <template v-else>
    <section class="panel event-detail" aria-labelledby="event-detail-title">
      <h2 id="event-detail-title">{{ state.detail.name ?? 'Untitled event request' }}</h2>
      <dl>
        <div><dt>Status</dt><dd>{{ state.detail.status }}</dd></div>
        <div><dt>Purpose</dt><dd>{{ state.detail.purpose ?? 'Not provided' }}</dd></div>
        <div><dt>Description</dt><dd>{{ state.detail.description ?? 'Not provided' }}</dd></div>
        <div><dt>Proposed start</dt><dd>{{ state.detail.startsAt ?? 'Not provided' }}</dd></div>
        <div><dt>Proposed end</dt><dd>{{ state.detail.endsAt ?? 'Not provided' }}</dd></div>
        <div><dt>Expected attendance</dt><dd>{{ state.detail.expectedAttendance ?? 'Not provided' }}</dd></div>
        <div><dt>Venue requirements</dt><dd>{{ state.detail.venueRequirements ?? 'Not provided' }}</dd></div>
        <div><dt>Accessibility needs</dt><dd>{{ state.detail.accessibilityNeeds ?? 'Not provided' }}</dd></div>
        <div><dt>Equipment requirements</dt><dd>{{ state.detail.equipmentRequirements ?? 'Not provided' }}</dd></div>
        <div>
          <dt>Registration required</dt>
          <dd>{{ state.detail.registrationRequired === null ? 'Not provided'
            : state.detail.registrationRequired ? 'Yes' : 'No' }}</dd>
        </div>
      </dl>
    </section>

    <ReviewDecisionPanel
      class="panel"
      :request="state.detail"
      :can-make-initial-decision="state.detail.actions?.canMakeInitialDecision === true"
      :feedback="feedback"
      @submit="handleSubmit"
      @refresh="handleRefresh"
    />

    <EventPlanningPanels
      :event-request-id="state.detail.id"
      :status="state.detail.status"
      viewer-role="EVENT_COORDINATOR"
      :is-owner="false"
      :starts-at="state.detail.startsAt"
      :ends-at="state.detail.endsAt"
      @changed="refreshQuietly"
    />
  </template>
</template>

<style scoped>
.event-detail { margin-bottom: 16px; padding: 24px; }
.event-detail dl { display: grid; grid-template-columns: 200px 1fr; row-gap: 12px; column-gap: 16px; margin-top: 16px; }
.event-detail dl > div { display: contents; }
.event-detail dt { font-weight: 600; font-size: 13px; color: #59685e; }
.event-detail dd { margin: 0; overflow-wrap: anywhere; min-width: 0; }
@media (max-width: 520px) {
  .event-detail { padding: 20px; }
  .event-detail dl { grid-template-columns: 1fr; gap: 16px; }
  .event-detail dl > div { display: block; }
  .event-detail dd { margin-top: 4px; }
}
</style>
