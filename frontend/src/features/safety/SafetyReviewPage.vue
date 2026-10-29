<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../lib/api-client.js';
import { authSession, clearLocalSession } from '../auth/session.js';
import {
  areaLabels, decideSafetyReview, fetchSafetyReview, noteLabels, singaporeTime, statusLabels,
  type SafetyArea, type SafetyDecisionInput, type SafetyNoteField, type SafetyReviewDetail,
} from './api.js';

/** KAN-84-AC3/AC4/AC6/AC10/AC12: review the current arrangements and record one decision. */
const route = useRoute();
const reviewId = computed(() => typeof route.params.id === 'string' ? route.params.id.toLowerCase() : '');
const permitted = computed(() => !authSession.loading && authSession.user?.role === 'SAFETY_OFFICER');
const detail = ref<SafetyReviewDetail | null>(null);
const loading = ref(false);
const busy = ref(false);
const error = ref('');
const savedMessage = ref('');
const decision = ref<SafetyDecisionInput['decision'] | ''>('');
const notes = ref('');
const areas = ref<SafetyArea[]>([]);
const noteFields = Object.keys(noteLabels) as SafetyNoteField[];
let controller: AbortController | undefined;
let generation = 0;
let mounted = true;
type ReviewContext = { generation: number; reviewId: string; userId: string | undefined };
const context = (): ReviewContext => ({ generation, reviewId: reviewId.value, userId: authSession.user?.id });
const isCurrent = (request: ReviewContext) => mounted && request.generation === generation && permitted.value
  && request.reviewId === reviewId.value && request.userId === authSession.user?.id;
const needsNotes = computed(() => decision.value === 'REJECTED' || decision.value === 'CHANGES_REQUESTED');
const canSave = computed(() => permitted.value && !loading.value && !busy.value && detail.value?.canDecide
  && detail.value.review.id === reviewId.value && !!decision.value && (!needsNotes.value || !!notes.value.trim())
  && (decision.value !== 'CHANGES_REQUESTED' || areas.value.length > 0)
  && !(decision.value === 'APPROVED' && (detail.value?.stale || detail.value?.readiness?.ready === false)));
const list = (values: string[]) => values.length ? values.join(', ') : 'None recorded';

function clearReview() {
  detail.value = null; decision.value = ''; notes.value = ''; areas.value = [];
}
async function load(request: ReviewContext, keepMessage = false): Promise<boolean> {
  // After a write, keep its outcome or refusal visible while the saved state is re-read.
  controller?.abort(); if (!keepMessage) { error.value = ''; savedMessage.value = ''; }
  clearReview();
  const current = new AbortController(); controller = current;
  const ownsLoad = () => isCurrent(request) && controller === current && !current.signal.aborted;
  loading.value = true;
  try {
    const result = await fetchSafetyReview(request.reviewId, current.signal);
    if (!ownsLoad()) return false;
    detail.value = result;
    return true;
  } catch (caught) {
    if (!ownsLoad()) return false;
    if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return false; }
    error.value = caught instanceof Error ? caught.message : 'The safety review could not be loaded.';
    return false;
  } finally { if (ownsLoad()) loading.value = false; }
}
async function save() {
  if (!detail.value || !decision.value || !canSave.value) return;
  const request = context();
  busy.value = true; error.value = ''; savedMessage.value = '';
  let writeError = '';
  try {
    const result = await decideSafetyReview(request.reviewId, { decision: decision.value, notes: notes.value.trim() || undefined,
      areas: decision.value === 'CHANGES_REQUESTED' ? [...areas.value] : undefined, fingerprint: detail.value.review.fingerprint });
    if (!isCurrent(request)) return;
    savedMessage.value = result.changed ? `Decision saved: ${statusLabels[result.review.status]}.` : 'This decision was already saved.';
  } catch (caught) {
    if (!isCurrent(request)) return;
    if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return; }
    // A failed response may follow a committed write; the reload below shows the saved state.
    writeError = caught instanceof Error ? caught.message : 'The decision may not have been saved.';
    error.value = `${writeError} Checking the review's saved state…`;
  } finally {
    // A response belongs only to the route and reviewer that submitted it, including the reload.
    if (isCurrent(request)) {
      const reloaded = await load(request, true);
      if (isCurrent(request)) {
        if (writeError) error.value = reloaded ? `${writeError} The review has been reloaded.`
          : `${writeError} The review could not be reloaded. Reload this page before trying again.`;
        busy.value = false;
      }
    }
  }
}
watch(() => [reviewId.value, authSession.loading, authSession.user?.id, authSession.user?.role], () => {
  generation += 1; controller?.abort();
  clearReview(); busy.value = false; loading.value = false; error.value = ''; savedMessage.value = '';
  if (permitted.value && reviewId.value) void load(context());
}, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => { mounted = false; generation += 1; controller?.abort(); });
</script>

<template>
  <section class="panel safety-page" aria-labelledby="safety-review-heading">
    <RouterLink to="/safety-reviews" class="back-link">Back to safety reviews</RouterLink>
    <h1 id="safety-review-heading">{{ detail?.event.name || 'Safety review' }}</h1>
    <p v-if="authSession.loading || (loading && !detail)" role="status">Loading the safety review…</p>
    <p v-else-if="!authSession.user">Sign in to view this safety review. <RouterLink to="/login">Sign in</RouterLink></p>
    <p v-else-if="!permitted" role="alert">Only a Safety Officer can open safety reviews.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="savedMessage" role="status">{{ savedMessage }}</p>
    <template v-if="permitted && detail">
      <p><strong>Round {{ detail.review.round }}</strong> · {{ statusLabels[detail.review.status] }} · submitted by
        {{ detail.review.submittedByName ?? 'the coordinator' }} {{ singaporeTime(detail.review.submittedAt) }} (Singapore time)</p>
      <p v-if="detail.stale" class="warning" role="status">The arrangements changed after this round was submitted. It cannot be approved;
        reject it or request changes so the coordinator resubmits.</p>
      <p class="note">Advisory venue suitability is not a safety approval and is not shown here as one.</p>

      <h2>Event</h2>
      <dl class="facts">
        <div><dt>Expected attendance</dt><dd>{{ detail.event.expectedAttendance ?? 'Not recorded' }}</dd></div>
        <div><dt>Time</dt><dd>{{ detail.event.startsAt ? singaporeTime(detail.event.startsAt) : 'Not recorded' }} –
          {{ detail.event.endsAt ? singaporeTime(detail.event.endsAt) : 'Not recorded' }}</dd></div>
        <div><dt>Venue requirements</dt><dd>{{ detail.event.venueRequirements || 'Not recorded' }}</dd></div>
        <div><dt>Accessibility needs</dt><dd>{{ detail.event.accessibilityNeeds || 'Not recorded' }}</dd></div>
        <div><dt>Equipment requirements</dt><dd>{{ detail.event.equipmentPlanStatus === 'NOT_REQUIRED' ? 'Not required'
          : detail.event.equipmentRequirements || 'Not recorded' }}</dd></div>
      </dl>

      <h2>Safety information</h2>
      <dl class="facts">
        <div v-for="field in noteFields" :key="field"><dt>{{ noteLabels[field] }}</dt>
          <dd :class="{ missing: !detail.review[field] }">{{ detail.review[field] || 'Missing — not provided by the coordinator' }}</dd></div>
      </dl>

      <h2>Venues</h2>
      <p v-if="!detail.venues.length">No live venue arrangement.</p>
      <ul v-else class="cards">
        <li v-for="venue in detail.venues" :key="venue.bookingId">
          <strong>{{ venue.name }}</strong> · capacity {{ venue.capacity }} · {{ venue.status }}
          <span v-if="venue.needsRecovery" class="warning"> · needs outage recovery</span>
          <p>Booked layout: {{ venue.bookedLayout || 'Not recorded' }} · Available layouts: {{ list(venue.layouts) }}</p>
          <p>Accessibility: {{ list(venue.accessibilityFeatures) }}{{ venue.wheelchairAccessible ? ' · wheelchair accessible' : '' }}</p>
          <p>Operating hours (Singapore time): {{ venue.opensAt ?? 'No opening restriction' }} –
            {{ venue.closesAt ?? 'No closing restriction' }}.</p>
          <p>Setup buffer: {{ venue.setupMinutes }} minutes · Turnaround buffer: {{ venue.turnaroundMinutes }} minutes.</p>
        </li>
      </ul>

      <h2>Equipment</h2>
      <p v-if="!detail.equipment.length">No active equipment lines.</p>
      <ul v-else class="cards">
        <li v-for="line in detail.equipment" :key="line.id">{{ line.quantity }} × {{ line.name }} · {{ line.status }}</li>
      </ul>

      <ul v-if="detail.readiness && !detail.readiness.ready" class="cards" aria-label="Readiness problems">
        <li v-for="check in detail.readiness.checks.filter(item => !item.ready)" :key="check.key" class="warning">{{ check.message }}</li>
      </ul>

      <form v-if="detail.canDecide" class="decision" @submit.prevent="save">
        <fieldset :disabled="busy || loading">
          <legend>Decision</legend>
          <label><input v-model="decision" type="radio" value="APPROVED" :disabled="detail.stale || detail.readiness?.ready === false" /> Approve</label>
          <label><input v-model="decision" type="radio" value="CHANGES_REQUESTED" /> Request changes</label>
          <label><input v-model="decision" type="radio" value="REJECTED" /> Reject</label>
          <fieldset v-if="decision === 'CHANGES_REQUESTED'" class="areas">
            <legend>Planning areas to change</legend>
            <label v-for="area in (['VENUE', 'TECHNICAL'] as const)" :key="area"><input v-model="areas" type="checkbox" :value="area" /> {{ areaLabels[area] }}</label>
          </fieldset>
          <label>Notes{{ needsNotes ? ' (required)' : ' (optional)' }}<textarea v-model="notes" maxlength="2000" :required="needsNotes" /></label>
          <button class="button" type="submit" :disabled="!canSave">{{ busy ? 'Saving…' : 'Save decision' }}</button>
        </fieldset>
      </form>
      <p v-else-if="detail.review.decidedAt">Decided by {{ detail.review.decidedByName ?? 'a Safety Officer' }} {{ singaporeTime(detail.review.decidedAt) }}.
        <template v-if="detail.review.decisionNotes"> {{ detail.review.decisionNotes }}</template></p>

      <template v-if="detail.rounds.length">
        <h2>Earlier rounds</h2>
        <ul class="cards">
          <li v-for="round in detail.rounds" :key="round.id">Round {{ round.round }} · {{ statusLabels[round.status] }}
            <template v-if="round.decisionNotes"> · {{ round.decisionNotes }}</template></li>
        </ul>
      </template>
    </template>
  </section>
</template>

<style scoped>
.safety-page { padding: 28px; display: grid; gap: 14px; }
h1 { margin: 0; font-size: 26px; } h2 { font-size: 18px; margin: 12px 0 0; }
.facts { display: grid; gap: 8px; margin: 0; }
.facts div { display: grid; grid-template-columns: minmax(140px, 30%) 1fr; gap: 12px; }
dt { font-weight: 600; } dd { margin: 0; overflow-wrap: anywhere; }
.missing, .warning { color: #8a332b; }
.note { font-size: 14px; color: #59685e; }
.cards { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.cards li { border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
.cards p { margin: 4px 0 0; }
.decision, fieldset { display: grid; gap: 10px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
legend { font-weight: 600; }
label { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; }
label:has(textarea) { display: grid; }
textarea { min-height: 80px; border: 1px solid var(--border); border-radius: 8px; padding: 10px; font: inherit; }
@media (max-width: 600px) { .safety-page { padding: 20px; } h1 { font-size: 22px; } .facts div { grid-template-columns: 1fr; gap: 2px; } }
</style>
