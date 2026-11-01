<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import {
  areaLabels, fetchEventSafety, noteLabels, singaporeTime, startPreparation, statusLabels, submitSafetyReview,
  type EventSafety, type SafetyNoteField,
} from '../../safety/api.js';

/** KAN-84: the coordinator submits rounds and starts preparation; the organiser sees the outcome. */
const props = defineProps<{ eventRequestId: string; status: string; revision?: number; refreshVersion?: number }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<EventSafety | null>(null);
const loading = ref(false);
const busy = ref(false);
const error = ref('');
const savedMessage = ref('');
const notes = reactive<Record<SafetyNoteField, string>>({ emergencyAccess: '', equipmentPlacement: '', crowdMovement: '' });
const fields = Object.keys(noteLabels) as SafetyNoteField[];
let reader: AbortController | undefined;
let writer: AbortController | undefined;
const isManager = computed(() => !authSession.loading && ['EVENT_ORGANISER', 'EVENT_COORDINATOR'].includes(authSession.user?.role ?? ''));
const visible = computed(() => isManager.value && ['APPROVED', 'CONFIRMED'].includes(props.status));
const missing = computed(() => fields.filter(field => !notes[field].trim()));

function reset() {
  reader?.abort(); writer?.abort(); state.value = null; loading.value = false; busy.value = false; error.value = '';
  for (const field of fields) notes[field] = '';
}
function failure(caught: unknown, fallback: string) {
  if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return; }
  if (caught instanceof ApiError && [403, 404].includes(caught.status)) state.value = null;
  error.value = caught instanceof ApiError ? caught.message : fallback;
}
async function load() {
  if (!visible.value) return;
  reader?.abort(); const current = new AbortController(); reader = current;
  state.value = null; loading.value = true;
  try {
    const result = await fetchEventSafety(props.eventRequestId, current.signal);
    if (!current.signal.aborted) state.value = result;
  } catch (caught) {
    if (!current.signal.aborted) failure(caught, 'Safety review details could not be loaded.');
  } finally { if (!current.signal.aborted) loading.value = false; }
}
async function write(action: (signal: AbortSignal) => Promise<string>, fallback: string) {
  if (busy.value || loading.value || !state.value) return;
  const current = new AbortController(); writer = current;
  busy.value = true; error.value = ''; savedMessage.value = '';
  try {
    const message = await action(current.signal);
    if (current.signal.aborted) return;
    savedMessage.value = message;
    emit('changed');
  } catch (caught) {
    if (current.signal.aborted) return;
    failure(caught, fallback);
  } finally {
    if (!current.signal.aborted) {
      busy.value = false;
      // KAN-84-AC12: always re-read, so a refused or uncertain write never shows stale state.
      await load();
    }
  }
}
const submit = () => write(async (signal) => {
  const { review } = await submitSafetyReview(props.eventRequestId, { ...notes }, signal);
  if (!signal.aborted) for (const field of fields) notes[field] = '';
  return `Round ${review.round} was sent to the Safety Officer.`;
}, 'The safety review may not have been submitted. Check the rounds below before trying again.');
const prepare = () => write(async (signal) => {
  const result = await startPreparation(props.eventRequestId, signal);
  return result.changed ? 'Event preparation has started.' : 'Event preparation had already started.';
}, 'Preparation may not have started. Check the status below before trying again.');

let viewer = '';
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, props.eventRequestId, props.status, props.revision],
  () => {
    // Keep a saved outcome when the host page refreshes the same event for the same viewer.
    const next = `${authSession.user?.id}|${authSession.user?.role}|${props.eventRequestId}`;
    const outcome = next === viewer ? savedMessage.value : '';
    viewer = next;
    reset(); savedMessage.value = outcome; void load();
  }, { immediate: true, flush: 'sync' });
watch(() => props.refreshVersion, () => {
  // The same event's arrangement changed: discard eligibility, not the coordinator's draft notes.
  writer?.abort(); busy.value = false; error.value = ''; savedMessage.value = ''; void load();
}, { flush: 'sync' });
onBeforeUnmount(reset);
</script>

<template>
  <section v-if="visible" class="panel workflow-panel arrangement-panel" aria-labelledby="safety-heading">
    <h2 id="safety-heading">Safety review</h2>
    <p v-if="loading && !state" role="status">Loading the safety review…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <button v-if="error && !loading && !busy" class="button button-secondary" type="button"
      @click="error = ''; load()">Reload safety review</button>
    <p v-if="savedMessage" role="status">{{ savedMessage }}</p>
    <template v-if="state">
      <p class="outcome"><span class="tag" :class="state.outcome === 'APPROVED' ? 'tag-positive'
        : ['REJECTED', 'STALE'].includes(state.outcome) ? 'tag-negative' : 'tag-waiting'"
        data-testid="safety-outcome">{{ statusLabels[state.outcome] }}</span></p>
      <p v-if="state.outcome === 'STALE'">The arrangements changed after safety approval. They need a new safety review before preparation.</p>
      <p v-if="state.pendingStale">The arrangements changed after this round was submitted; the Safety Officer cannot approve it as submitted.</p>
      <p v-if="state.unresolvedAreas?.length" role="status">Update the requested
        {{ state.unresolvedAreas.map(area => areaLabels[area]).join(' and ') }} arrangements before submitting a new safety review.
        Notes alone do not complete the requested changes.</p>
      <div v-if="state.preparation" data-testid="preparation-status">
        <p v-if="state.preparation.blocked" role="status"><strong>Preparation blocked</strong> until the event is confirmed, its arrangements are ready and its safety approval is current.</p>
        <p v-else><strong>Preparation started</strong> by {{ state.preparation.startedByName ?? 'the coordinator' }}
          <time :datetime="state.preparation.startedAt">{{ singaporeTime(state.preparation.startedAt) }}</time> (Singapore time)</p>
      </div>
      <ul v-if="state.readiness && !state.readiness.ready" class="checklist" aria-label="Safety review readiness">
        <li v-for="check in state.readiness.checks.filter(item => !item.ready)" :key="check.key">{{ check.message }}</li>
      </ul>
      <form v-if="state.canSubmit" class="safety-form" @submit.prevent="submit">
        <fieldset :disabled="busy">
          <legend>Safety information for the Safety Officer</legend>
          <label v-for="field in fields" :key="field">{{ noteLabels[field] }}
            <textarea v-model="notes[field]" maxlength="2000" /></label>
          <p v-if="missing.length">Missing information will be shown to the Safety Officer as missing: {{ missing.map(field => noteLabels[field]).join(', ') }}.</p>
          <button class="button" type="submit" :disabled="busy">{{ busy ? 'Submitting…' : 'Submit for safety review' }}</button>
        </fieldset>
      </form>
      <button v-if="state.canStartPreparation" class="button" type="button" :disabled="busy" @click="prepare">
        {{ busy ? 'Starting…' : state.preparation ? 'Resume preparation' : 'Start preparation' }}</button>
      <p v-else-if="state.eventStatus === 'APPROVED' && state.outcome === 'APPROVED'">Confirm the event before starting preparation.</p>
      <h3 v-if="state.rounds.length">Review rounds</h3>
      <ol v-if="state.rounds.length" class="rounds" reversed>
        <li v-for="round in state.rounds" :key="round.id" :data-testid="`safety-round-${round.round}`">
          <p><strong>Round {{ round.round }}</strong> · {{ statusLabels[round.status] }} · submitted {{ singaporeTime(round.submittedAt) }}</p>
          <p v-if="round.decidedAt">Decided by {{ round.decidedByName ?? 'a Safety Officer' }}, {{ singaporeTime(round.decidedAt) }}</p>
          <p v-if="round.requestedAreas">Changes needed: {{ round.requestedAreas.map(area => areaLabels[area]).join(' and ') }}</p>
          <p v-if="round.decisionNotes">{{ round.decisionNotes }}</p>
          <p v-if="round.missingNotes.length">Not provided: {{ round.missingNotes.map(field => noteLabels[field]).join(', ') }}</p>
        </li>
      </ol>
      <p v-else-if="state.outcome === 'NONE'">No safety review has been submitted yet.</p>
    </template>
  </section>
</template>

<style src="./workflow-panel.css"></style>
<style scoped>
.arrangement-panel { padding: 22px; display: grid; gap: 14px; }
form, fieldset { display: grid; gap: 12px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
legend { font-weight: 600; margin-bottom: 4px; }
label { display: grid; gap: 6px; font-size: 14px; }
textarea { min-height: 64px; border: 1px solid var(--border); border-radius: 8px; padding: 10px; font: inherit; }
.checklist, .rounds { margin: 0; padding-left: 20px; display: grid; gap: 10px; }
.rounds p { margin: 0; }
</style>
