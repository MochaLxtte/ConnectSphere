<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession } from '../../auth/session.js';
import { cancelEvent, fetchCancellation } from '../api/arrangements';

const props = defineProps<{ eventRequestId: string; status: string }>();
const emit = defineEmits<{ changed: [] }>();
const reason = ref('');
const confirmed = ref(false);
const saved = ref<{ status: string; cancelledAt: string; reason: string } | null>(null);
const busy = ref(false);
const error = ref('');
const isManager = computed(() => ['EVENT_ORGANISER', 'EVENT_COORDINATOR'].includes(authSession.user?.role ?? ''));
const canCancel = computed(() => isManager.value &&
  ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED'].includes(props.status));
async function load() {
  if (props.status !== 'CANCELLED' || !isManager.value) return;
  try { saved.value = (await fetchCancellation(props.eventRequestId)).cancellation; }
  catch (caught) { error.value = caught instanceof ApiError ? caught.message : 'Cancellation details could not be loaded.'; }
}
async function submit() {
  if (!canCancel.value || !confirmed.value || !reason.value.trim() || busy.value) return;
  busy.value = true; error.value = '';
  try {
    const result = await cancelEvent(props.eventRequestId, reason.value.trim());
    saved.value = result.cancellation; reason.value = ''; emit('changed');
  } catch (caught) { error.value = caught instanceof ApiError ? caught.message : 'The event could not be cancelled. Refresh and try again.'; }
  finally { busy.value = false; }
}
onMounted(() => { void load(); });
</script>

<template>
  <section class="panel arrangement-panel" aria-labelledby="cancellation-heading">
    <h2 id="cancellation-heading">Event cancellation</h2>
    <div v-if="saved" role="status">
      <p>This event was cancelled. The saved reason is visible to event managers.</p>
      <p><strong>Reason:</strong> {{ saved.reason }}</p>
      <time :datetime="saved.cancelledAt">{{ new Date(saved.cancelledAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) }}</time>
    </div>
    <form v-else-if="canCancel" @submit.prevent="submit">
      <label>Reason<textarea v-model="reason" required maxlength="2000" /></label>
      <label class="confirm-row"><input v-model="confirmed" type="checkbox" /> I understand this releases the event’s active arrangements and registrations.</label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button class="button button-secondary" type="submit" :disabled="busy || !confirmed || !reason.trim()">
        {{ busy ? 'Cancelling…' : 'Cancel event' }}
      </button>
    </form>
    <p v-else-if="props.status === 'CANCELLED' && error" role="alert">{{ error }}</p>
    <p v-else>Cancellation is unavailable in this event state.</p>
  </section>
</template>

<style scoped>
.arrangement-panel { padding: 22px; display: grid; gap: 14px; }
form { display: grid; gap: 12px; }
label { display: grid; gap: 6px; font-size: 14px; }
textarea { min-height: 80px; border: 1px solid var(--border); border-radius: 8px; padding: 10px; font: inherit; }
.confirm-row { display: flex; align-items: flex-start; gap: 8px; }
</style>
