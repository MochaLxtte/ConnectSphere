<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import type { ReviewDecision, ReviewFeedback, ReviewRequestSummary, ReviewSubmission } from '../types';

const props = defineProps<{
  request: ReviewRequestSummary;
  /** Backend write eligibility. Read access is established by the parent loading this request. */
  canMakeInitialDecision?: boolean;
  feedback?: ReviewFeedback | null;
}>();
const emit = defineEmits<{
  submit: [submission: ReviewSubmission];
  refresh: [eventRequestId: string];
}>();

const id = useId();
const decision = ref<ReviewDecision | null>(null);
const reason = ref('');
const submissionPending = ref(false);
const feedback = computed(() =>
  props.feedback?.eventRequestId === props.request.id ? props.feedback : null,
);
const saving = computed(() => submissionPending.value || feedback.value?.state === 'saving');
const errorCode = computed(() => feedback.value?.state === 'error' ? feedback.value.code : null);
const accessError = computed(() => ['AUTHENTICATION_REQUIRED', 'REVIEW_FORBIDDEN', 'EVENT_REQUEST_NOT_FOUND']
  .includes(errorCode.value ?? ''));
const recordedDecision = computed<ReviewDecision | null>(() => {
  if (feedback.value?.state === 'saved') return feedback.value.decision;
  if (props.request.review) return props.request.review.decision;
  return props.request.status === 'APPROVED' || props.request.status === 'REJECTED'
    ? props.request.status : null;
});
const needsRefresh = computed(() => errorCode.value !== null && errorCode.value !== 'INVALID_REVIEW_INPUT');
const awaitingInitialDecision = computed(() => ['SUBMITTED', 'UNDER_REVIEW'].includes(props.request.status));
const canSubmit = computed(() => props.canMakeInitialDecision === true && !recordedDecision.value &&
  awaitingInitialDecision.value && !needsRefresh.value && !saving.value);
const errorMessage = computed(() => {
  switch (errorCode.value) {
    case 'AUTHENTICATION_REQUIRED': return 'Sign in again to continue reviewing this request.';
    case 'REVIEW_FORBIDDEN':
    case 'EVENT_REQUEST_NOT_FOUND': return 'This request is unavailable or you no longer have permission to review it.';
    case 'REVIEW_ALREADY_DECIDED': return 'This request already has a decision. Refresh it to view the latest outcome.';
    case 'REQUEST_NOT_REVIEWABLE': return 'This request is no longer awaiting an initial decision. Refresh it to view the latest status.';
    case 'INVALID_REVIEW_INPUT': return 'Check your decision and reason, then try again.';
    default: return 'We could not confirm whether your decision was recorded. Refresh the request before trying again.';
  }
});

watch(() => props.request.id, () => {
  decision.value = null;
  reason.value = '';
  submissionPending.value = false;
}, { flush: 'sync' });
watch(() => [props.request.id, props.feedback] as const, ([requestId, value]) => {
  if (value?.eventRequestId === requestId) submissionPending.value = value.state === 'saving';
}, { immediate: true, flush: 'sync' });

function submitDecision() {
  if (!canSubmit.value || !decision.value) return;
  // Close the gap before the parent renders its saving state, preventing duplicate clicks.
  submissionPending.value = true;
  emit('submit', {
    eventRequestId: props.request.id,
    input: { decision: decision.value, reason: reason.value.trim() || null },
  });
}
</script>

<template>
  <section class="panel decision-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">Initial review</p>
      <h2 :id="`${id}-title`">{{ recordedDecision && !accessError ? 'Review outcome' : 'Record a decision' }}</h2>
      <p v-if="!recordedDecision && !accessError" class="decision-description">Approve this request to proceed to planning, or reject it.</p>
    </header>

    <p v-if="accessError" class="decision-notice" role="alert">
      {{ errorMessage }}
    </p>
    <div v-else-if="recordedDecision" class="decision-outcome" :class="{ 'rejected-outcome': recordedDecision === 'REJECTED' }" role="status">
      <strong>{{ recordedDecision === 'APPROVED' ? 'Request approved' : 'Request rejected' }}</strong>
      <p>The decision has been recorded. Another initial decision cannot be submitted.</p>
      <p v-if="request.review" class="recorded-reason">
        <span class="recorded-reason-label">Reason:</span> {{ request.review.reason ?? 'No reason provided.' }}
      </p>
    </div>
    <div v-else-if="needsRefresh" class="decision-feedback">
      <p class="decision-error" role="alert">{{ errorMessage }}</p>
      <button type="button" class="button button-secondary" @click="emit('refresh', request.id)">
        Refresh request
      </button>
    </div>
    <p v-else-if="!awaitingInitialDecision" class="decision-notice" role="status">
      {{ request.status === 'DRAFT'
        ? 'Draft requests cannot be approved or rejected.'
        : 'This request is not awaiting an initial review decision.' }}
    </p>
    <p v-else-if="canMakeInitialDecision !== true" class="decision-notice" role="status">
      You do not have permission to record an initial decision for this request.
    </p>
    <form v-else :aria-busy="saving" @submit.prevent="submitDecision">
      <fieldset :disabled="saving" class="decision-fields">
        <legend>Choose a decision</legend>
        <div class="decision-options">
          <label class="decision-option" :class="{ selected: decision === 'APPROVED' }">
            <input v-model="decision" type="radio" :name="`${id}-decision`" value="APPROVED" />
            <span><strong>Approve request</strong><span>Proceed to event planning</span></span>
          </label>
          <label class="decision-option reject-option" :class="{ selected: decision === 'REJECTED' }">
            <input v-model="decision" type="radio" :name="`${id}-decision`" value="REJECTED" />
            <span><strong>Reject request</strong><span>Do not progress this request</span></span>
          </label>
        </div>
        <label :for="`${id}-reason`" class="reason-label">Reason <span>(optional)</span></label>
        <textarea :id="`${id}-reason`" v-model="reason" rows="4" :aria-describedby="`${id}-reason-hint`" />
        <p :id="`${id}-reason-hint`" class="decision-hint">Add an explanation to accompany the decision.</p>
      </fieldset>
      <p v-if="errorCode && !saving" class="decision-error" role="alert">{{ errorMessage }}</p>
      <footer class="decision-actions">
        <button type="submit" class="button button-primary" :class="{ 'button-reject': decision === 'REJECTED' }" :disabled="!canSubmit || !decision">
          {{ saving ? 'Recording decision…' : decision === 'APPROVED' ? 'Record approval'
            : decision === 'REJECTED' ? 'Record rejection' : 'Record decision' }}
        </button>
        <p v-if="saving" role="status">Recording your decision. Please wait.</p>
        <p v-else>Your selection is saved when you record the decision.</p>
      </footer>
    </form>
  </section>
</template>

<style scoped>
.decision-panel { padding: 24px; color: #293a33; }
.decision-panel h2 { font-size: 22px; letter-spacing: -0.5px; }
.decision-description, .decision-hint, .decision-actions p {
  color: #59685e; font-size: 14px; line-height: 1.6;
}
.decision-description { margin-top: 8px; }
.decision-fields { border: 0; padding: 0; margin: 24px 0 0; min-width: 0; }
.decision-fields legend, .reason-label { font-size: 14px; font-weight: 600; }
.decision-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 12px 0 24px; }
.decision-option {
  display: flex; align-items: flex-start; gap: 10px; border: 1px solid var(--border);
  border-radius: 8px; padding: 16px; cursor: pointer;
}
.decision-option input { margin: 3px 0 0; accent-color: var(--green); }
.decision-option strong { display: block; font-size: 14px; }
.decision-option span span { display: block; color: #59685e; font-size: 13px; line-height: 1.5; margin-top: 5px; }
.decision-option.selected { border-color: var(--green); background: #f0f5ee; }
.reject-option.selected { border-color: #954537; background: #fcf1ee; }
.reject-option input { accent-color: #954537; }
.reason-label { display: block; margin-bottom: 8px; }
.reason-label span { font-weight: 400; color: #59685e; }
textarea { display: block; width: 100%; resize: vertical; min-height: 100px; padding: 12px; border: 1px solid #87958c; border-radius: 6px; font: inherit; font-size: 14px; color: inherit; }
textarea:focus-visible, input:focus-visible { outline: 3px solid #90a950; outline-offset: 3px; }
.decision-hint { margin-top: 6px; font-size: 13px; }
.decision-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; margin-top: 24px; }
.decision-panel .button { font-size: 14px; padding: 11px 16px; }
.decision-panel .button-reject { background: #954537; }
.decision-panel button:disabled { cursor: not-allowed; }
.decision-fields:disabled .decision-option { cursor: wait; opacity: 0.65; }
.decision-actions p { font-size: 13px; }
.decision-notice, .decision-outcome, .decision-feedback { margin-top: 24px; font-size: 14px; line-height: 1.6; }
.decision-notice { background: #f5f6f1; padding: 16px; border-radius: 8px; }
.decision-outcome { border-left: 3px solid var(--green); background: #f0f5ee; padding: 16px; border-radius: 4px; }
.decision-outcome strong { font-size: 16px; }
.decision-outcome p { margin-top: 4px; }
.recorded-reason { white-space: pre-wrap; overflow-wrap: anywhere; }
.recorded-reason-label { font-weight: 600; }
.rejected-outcome { border-left-color: #954537; background: #fcf1ee; }
.decision-error { color: #8a332b; font-size: 14px; line-height: 1.6; margin-top: 16px; }
.decision-feedback .decision-error { margin-top: 0; }
.decision-feedback .button { margin-top: 12px; }
@media (max-width: 520px) {
  .decision-panel { padding: 20px; }
  .decision-options { grid-template-columns: 1fr; }
  .decision-actions { align-items: stretch; flex-direction: column; gap: 10px; }
}
</style>
