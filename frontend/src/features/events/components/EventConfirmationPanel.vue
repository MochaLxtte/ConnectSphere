<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { confirmEvent, fetchConfirmation, type EventConfirmation } from '../api/arrangements';

/** KAN-61: final confirmation, distinct from KAN-36 initial approval. */
const props = defineProps<{ eventRequestId: string; status: string; revision?: number; refreshVersion?: number }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<EventConfirmation | null>(null);
const loading = ref(false);
const busy = ref(false);
const acknowledged = ref(false);
const error = ref('');
const savedMessage = ref('');
let reader: AbortController | undefined;
let writer: AbortController | undefined;
const isManager = computed(() => !authSession.loading && ['EVENT_ORGANISER', 'EVENT_COORDINATOR'].includes(authSession.user?.role ?? ''));
const labels = { VENUE: 'Venue arrangements', EQUIPMENT: 'Equipment', CHANGE_REQUEST: 'Change requests' } as const;
const when = (value: string) => new Date(value).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });

function reset() {
  reader?.abort(); writer?.abort(); state.value = null; loading.value = false; busy.value = false;
  acknowledged.value = false; error.value = ''; savedMessage.value = '';
}
function failure(caught: unknown, fallback: string) {
  if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return; }
  if (caught instanceof ApiError && [403, 404].includes(caught.status)) state.value = null;
  error.value = caught instanceof ApiError ? caught.message : fallback;
}
async function load() {
  if (!isManager.value || !['APPROVED', 'CONFIRMED'].includes(props.status)) return;
  reader?.abort(); const current = new AbortController(); reader = current;
  // Never leave an actionable Ready checklist behind during reconciliation or a failed read.
  state.value = null; acknowledged.value = false; loading.value = true;
  try {
    const result = await fetchConfirmation(props.eventRequestId, current.signal);
    if (!current.signal.aborted) state.value = result;
  } catch (caught) {
    if (!current.signal.aborted) failure(caught, 'Confirmation details could not be loaded.');
  } finally { if (!current.signal.aborted) loading.value = false; }
}
async function submit() {
  if (!state.value?.canConfirm || !acknowledged.value || busy.value || loading.value) return;
  const current = new AbortController(); writer = current;
  busy.value = true; error.value = ''; savedMessage.value = '';
  try {
    const result = await confirmEvent(props.eventRequestId, current.signal);
    if (current.signal.aborted) return;
    savedMessage.value = result.confirmation.changed ? 'The event is confirmed.' : 'The event was already confirmed.';
    acknowledged.value = false;
    emit('changed');
  } catch (caught) {
    if (current.signal.aborted) return;
    failure(caught, 'The confirmation may not have been saved.');
  } finally {
    if (!current.signal.aborted) {
      busy.value = false;
      // Always re-read: a refused or uncertain write must not leave a stale checklist on screen.
      await load();
    }
  }
}
let viewer = '';
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, props.eventRequestId, props.status, props.revision],
  () => {
    // The host page refreshes the status after a confirmation; keep the outcome for the same viewer and event.
    const next = `${authSession.user?.id}|${authSession.user?.role}|${props.eventRequestId}`;
    const outcome = next === viewer ? savedMessage.value : '';
    viewer = next;
    reset(); savedMessage.value = outcome; void load();
  }, { immediate: true, flush: 'sync' });
watch(() => props.refreshVersion, () => { reset(); void load(); }, { flush: 'sync' });
onBeforeUnmount(reset);
</script>

<template>
  <section v-if="isManager && ['APPROVED', 'CONFIRMED'].includes(status)" class="panel workflow-panel arrangement-panel" aria-labelledby="confirmation-heading">
    <h2 id="confirmation-heading">Event confirmation</h2>
    <p v-if="loading && !state" role="status">Loading confirmation details…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <button v-if="error && !loading && !busy" class="button button-secondary" type="button"
      @click="error = ''; load()">Reload confirmation details</button>
    <p v-if="savedMessage" role="status">{{ savedMessage }}</p>
    <template v-if="state">
      <div v-if="state.confirmation && state.status === 'CONFIRMED'" class="confirmed" data-testid="confirmation-record">
        <p><strong>Confirmed</strong> by {{ state.confirmation.confirmedByName ?? 'an unknown user' }}</p>
        <time :datetime="state.confirmation.confirmedAt">{{ when(state.confirmation.confirmedAt) }} (Singapore time)</time>
      </div>
      <template v-else-if="state.readiness">
        <p>Confirming tells the organiser the event can proceed. It is separate from the initial approval.</p>
        <ul class="checklist" aria-label="Confirmation readiness">
          <li v-for="check in state.readiness.checks" :key="check.key" :class="check.ready ? 'is-ready' : 'is-blocked'">
            <span class="tag" :class="check.ready ? 'tag-positive' : 'tag-waiting'">{{ check.ready ? 'Ready' : 'Not ready' }}</span>
            <span><strong>{{ labels[check.key] }}:</strong> {{ check.message }}</span>
          </li>
        </ul>
        <p v-if="state.started">This event has already started, so it can no longer be confirmed.</p>
        <form v-if="state.canConfirm" @submit.prevent="submit">
          <fieldset :disabled="busy">
            <label class="confirm-row"><input v-model="acknowledged" type="checkbox" /> I have checked the arrangements and want to confirm this event.</label>
            <button class="button" type="submit" :disabled="busy || !acknowledged">{{ busy ? 'Confirming…' : 'Confirm event' }}</button>
          </fieldset>
        </form>
        <p v-else-if="!state.started && state.readiness.ready">Only the assigned coordinator can confirm this event.</p>
      </template>
    </template>
  </section>
</template>

<style src="./workflow-panel.css"></style>
<style scoped>
.arrangement-panel { padding: 22px; display: grid; gap: 14px; }
form, fieldset { display: grid; gap: 12px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
.checklist { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.checklist li { display: flex; gap: 10px; align-items: baseline; }
.confirm-row { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; }
.confirmed { display: grid; gap: 4px; }
</style>
