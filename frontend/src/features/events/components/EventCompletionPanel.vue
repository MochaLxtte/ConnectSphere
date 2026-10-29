<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { completeEvent, fetchCompletion, type EventCompletion } from '../api/arrangements';
import { formatEventTime } from '../presentation';

/**
 * KAN-10. The assigned coordinator marks a CONFIRMED event completed after it has ended; the organiser and the
 * coordinator can read the recorded outcome. The end time is shown as a hint: the server decides by its own clock.
 */
const props = defineProps<{ eventRequestId: string; status: string; endsAt: string | null; revision?: number }>();
const emit = defineEmits<{ changed: [] }>();
const saved = ref<EventCompletion | null>(null);
const confirmed = ref(false);
const busy = ref(false);
const loading = ref(false);
const error = ref('');
const currentStatus = ref(props.status);
let reader: AbortController | undefined;
let writer: AbortController | undefined;

const role = computed(() => (authSession.loading ? null : authSession.user?.role ?? null));
const isCoordinator = computed(() => role.value === 'EVENT_COORDINATOR');
const canRead = computed(() => role.value === 'EVENT_ORGANISER' || isCoordinator.value);
const canComplete = computed(() => isCoordinator.value && currentStatus.value === 'CONFIRMED' && !saved.value);
const visible = computed(() => canRead.value && (currentStatus.value === 'COMPLETED' || canComplete.value || !!saved.value));

function reset() {
  reader?.abort(); writer?.abort(); saved.value = null; confirmed.value = false; busy.value = false;
  loading.value = false; error.value = ''; currentStatus.value = props.status;
}
function failure(caught: unknown, fallback: string) {
  if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return; }
  error.value = caught instanceof ApiError ? caught.message : fallback;
}
async function load() {
  if (!canRead.value || currentStatus.value !== 'COMPLETED') return;
  reader?.abort(); const current = new AbortController(); reader = current;
  loading.value = true; error.value = '';
  try {
    const result = await fetchCompletion(props.eventRequestId, current.signal);
    if (!current.signal.aborted) saved.value = result.completion;
  } catch (caught) {
    if (!current.signal.aborted) failure(caught, 'The completion details could not be loaded.');
  } finally { if (!current.signal.aborted) loading.value = false; }
}
async function submit() {
  if (!canComplete.value || !confirmed.value || busy.value) return;
  const current = new AbortController(); writer = current;
  busy.value = true; error.value = '';
  try {
    const result = await completeEvent(props.eventRequestId, current.signal);
    if (current.signal.aborted) return;
    saved.value = result.completion; currentStatus.value = 'COMPLETED'; confirmed.value = false; emit('changed');
  } catch (caught) {
    if (current.signal.aborted) return;
    confirmed.value = false;
    failure(caught, 'The event could not be marked completed. Refresh the details and try again.');
    // A stale page (already completed, cancelled or reassigned) is brought up to date rather than retried blindly.
    if (caught instanceof ApiError && [404, 409].includes(caught.status)) emit('changed');
  } finally { if (!current.signal.aborted) busy.value = false; }
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, props.eventRequestId, props.status, props.revision],
  () => { reset(); void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(reset);
</script>

<template>
  <section v-if="visible" class="panel completion-panel" aria-labelledby="completion-heading">
    <h2 id="completion-heading">Event completion</h2>
    <p v-if="loading" role="status">Loading completion details…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <div v-if="saved" role="status">
      <p>This event was marked completed. Registration is closed and its equipment reservations were released.</p>
      <p><strong>Completed:</strong> {{ formatEventTime(saved.completedAt) }} · Singapore time<template v-if="saved.completedByName"> · by {{ saved.completedByName }}</template></p>
      <p v-if="isCoordinator"><strong>Equipment reservations released:</strong> {{ saved.releasedEquipmentRequests }}</p>
    </div>
    <p v-else-if="currentStatus === 'COMPLETED' && !loading && !error">This event is completed.</p>
    <form v-if="canComplete" @submit.prevent="submit">
      <p>
        Mark this event completed once it has ended.<template v-if="endsAt"> It ends at {{ formatEventTime(endsAt) }} (Singapore time).</template>
        The server checks the time when you confirm.
      </p>
      <fieldset :disabled="busy">
        <label class="confirm-row"><input v-model="confirmed" type="checkbox" /> I understand this closes registration and releases the event’s reserved equipment. It cannot be undone.</label>
        <button class="button button-primary" type="submit" :disabled="busy || !confirmed">{{ busy ? 'Completing…' : 'Mark event as completed' }}</button>
      </fieldset>
    </form>
  </section>
</template>

<style scoped>
.completion-panel { padding: 22px; display: grid; gap: 14px; }
form, fieldset { display: grid; gap: 12px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
.confirm-row { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; }
</style>
