<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { cancelEvent, fetchCancellation } from '../api/arrangements';
import { fetchEventRequestDetail } from '../api/event-requests';

const props = defineProps<{ eventRequestId: string; status: string; revision?: number }>();
const emit = defineEmits<{ changed: [] }>();
const reason = ref('');
const confirmed = ref(false);
const saved = ref<{ status: string; cancelledAt: string; reason: string } | null>(null);
const busy = ref(false);
const loading = ref(false);
const error = ref('');
const retryRequired = ref(false);
const accessDenied = ref(false);
const currentStatus = ref(props.status);
let reader: AbortController | undefined;
let writer: AbortController | undefined;
const isManager = computed(() => !authSession.loading && ['EVENT_ORGANISER', 'EVENT_COORDINATOR'].includes(authSession.user?.role ?? ''));
const canCancel = computed(() => isManager.value && !accessDenied.value && !saved.value &&
  ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED'].includes(currentStatus.value));
function reset() {
  reader?.abort(); writer?.abort(); reason.value = ''; confirmed.value = false; saved.value = null;
  busy.value = false; loading.value = false; error.value = ''; retryRequired.value = false;
  accessDenied.value = false; currentStatus.value = props.status;
}
function showFailure(caught: unknown, fallback: string) {
  if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return; }
  if (caught instanceof ApiError && [403, 404].includes(caught.status)) {
    saved.value = null; reason.value = ''; accessDenied.value = true;
  }
  error.value = caught instanceof ApiError ? caught.message : fallback;
}
async function load(refreshEvent = false) {
  if (!isManager.value || (!refreshEvent && currentStatus.value !== 'CANCELLED')) return;
  reader?.abort(); const current = new AbortController(); reader = current;
  loading.value = true; error.value = ''; saved.value = null; confirmed.value = false;
  try {
    if (refreshEvent) {
      const detail = await fetchEventRequestDetail(props.eventRequestId, current.signal);
      if (current.signal.aborted) return;
      currentStatus.value = detail.status;
    }
    if (currentStatus.value === 'CANCELLED') {
      const result = await fetchCancellation(props.eventRequestId, current.signal);
      if (current.signal.aborted) return;
      saved.value = result.cancellation;
    }
    retryRequired.value = false; accessDenied.value = false;
    if (refreshEvent) emit('changed');
  } catch (caught) {
    if (!current.signal.aborted) showFailure(caught, 'Cancellation details could not be loaded.');
  } finally { if (!current.signal.aborted) loading.value = false; }
}
async function submit() {
  if (!canCancel.value || !confirmed.value || !reason.value.trim() || busy.value || loading.value || retryRequired.value) return;
  const current = new AbortController(); writer = current;
  busy.value = true; error.value = '';
  try {
    const result = await cancelEvent(props.eventRequestId, reason.value.trim(), current.signal);
    if (current.signal.aborted) return;
    saved.value = result.cancellation; currentStatus.value = 'CANCELLED'; reason.value = ''; confirmed.value = false; emit('changed');
  } catch (caught) {
    if (current.signal.aborted) return;
    confirmed.value = false;
    retryRequired.value = !(caught instanceof ApiError && [400, 422].includes(caught.status));
    showFailure(caught, 'The event could not be cancelled. Refresh the details before trying again.');
  } finally { if (!current.signal.aborted) busy.value = false; }
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, props.eventRequestId, props.status, props.revision],
  () => { reset(); void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(reset);
</script>

<template>
  <section v-if="isManager" class="panel arrangement-panel" aria-labelledby="cancellation-heading">
    <h2 id="cancellation-heading">Event cancellation</h2>
    <p v-if="loading" role="status">Loading cancellation details…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <div v-if="saved && !loading" role="status">
      <p>This event was cancelled. The saved reason is visible to event managers.</p>
      <p><strong>Reason:</strong> {{ saved.reason }}</p>
      <time :datetime="saved.cancelledAt">{{ new Date(saved.cancelledAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) }}</time>
    </div>
    <template v-else-if="!loading">
      <template v-if="retryRequired || (currentStatus === 'CANCELLED' && error)">
        <p>Refresh the event details and check the saved outcome before confirming another cancellation.</p>
        <button class="button button-secondary" type="button" :disabled="busy" @click="load(true)">Refresh cancellation details</button>
      </template>
      <form v-if="canCancel" @submit.prevent="submit">
        <fieldset :disabled="busy || retryRequired">
          <label>Reason<textarea v-model="reason" required maxlength="2000" /></label>
          <label class="confirm-row"><input v-model="confirmed" type="checkbox" /> I understand this releases the event’s active arrangements and registrations.</label>
          <button class="button button-secondary" type="submit" :disabled="busy || retryRequired || !confirmed || !reason.trim()">
            {{ busy ? 'Cancelling…' : 'Cancel event' }}
          </button>
        </fieldset>
      </form>
      <p v-else-if="!error">{{ currentStatus === 'CANCELLED' ? 'This event is cancelled. No cancellation audit details were recorded.' : 'Cancellation is unavailable in this event state.' }}</p>
    </template>
  </section>
</template>

<style scoped>
.arrangement-panel { padding: 22px; display: grid; gap: 14px; }
form, fieldset { display: grid; gap: 12px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
label { display: grid; gap: 6px; font-size: 14px; }
textarea { min-height: 80px; border: 1px solid var(--border); border-radius: 8px; padding: 10px; font: inherit; }
.confirm-row { display: flex; align-items: flex-start; gap: 8px; }
</style>
