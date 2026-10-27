<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { formatEventTime } from '../../events/presentation';
import { cancelEquipmentReservation, fetchEquipmentReservations, reserveEquipmentRequest,
  type EquipmentReservationContext, type EquipmentReservationRequest } from '../api/equipment-reservations';

const props = defineProps<{ eventId: string }>();
const emit = defineEmits<{ invalidate: []; settled: [] }>();
type State = { status: 'idle' | 'loading' } | { status: 'ready'; context: EquipmentReservationContext }
  | { status: 'error'; message: string; retryable: boolean };
const state = ref<State>({ status: 'idle' });
const pending = ref(false), selected = ref<{ item: EquipmentReservationRequest; action: 'reserve' | 'cancel' } | null>(null);
const reason = ref(''), reasonError = ref('');
const message = ref<string | null>(null);
let readController: AbortController | undefined;
let writeController: AbortController | undefined;
const authorised = computed(() => !authSession.loading && authSession.user?.role === 'TECHNICAL_SUPPORT_STAFF' && !!props.eventId);
const ready = computed(() => !pending.value && state.value.status === 'ready' && state.value.context.readiness.status === 'READY'
  && state.value.context.readiness.activeCount > 0
  && state.value.context.readiness.reservedCount === state.value.context.readiness.activeCount);
const readinessLabel = computed(() => {
  if (state.value.status !== 'ready') return '';
  if (ready.value) return 'Equipment ready';
  return { NO_REQUIREMENTS: 'No saved requirements', PENDING: 'Reservations pending', SHORTFALL: 'Equipment shortfall',
    INVALID_REQUIREMENTS: 'Requirements need attention', READY: 'Reservations pending' }[state.value.context.readiness.status];
});
function reset() {
  readController?.abort(); writeController?.abort();
  state.value = { status: 'idle' }; selected.value = null; pending.value = false;
  reason.value = ''; reasonError.value = ''; message.value = null;
}
function readError(error: unknown) {
  const denied = error instanceof ApiError && [403, 404].includes(error.status);
  state.value = { status: 'error', retryable: !denied,
    message: denied ? 'These reservations are unavailable or you do not have permission to view them.'
      : error instanceof Error ? error.message : 'Reservations could not be loaded. Try again.' };
}
async function load(notice: string | null = null) {
  readController?.abort(); selected.value = null; reason.value = ''; reasonError.value = '';
  message.value = notice;
  if (!authorised.value || pending.value) return;
  const current = new AbortController(); readController = current;
  state.value = { status: 'loading' };
  try {
    const context = await fetchEquipmentReservations(props.eventId, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', context };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    readError(error);
  }
}
function canAct(item: EquipmentReservationRequest, action: 'reserve' | 'cancel') {
  return authorised.value && !pending.value && state.value.status === 'ready'
    && state.value.context.event.status === 'APPROVED'
    && Number.isSafeInteger(item.quantity) && item.quantity > 0
    && (action === 'reserve' ? item.status === 'REQUESTED' && item.canReserve : item.status === 'RESERVED' && item.canCancel);
}
function choose(item: EquipmentReservationRequest, action: 'reserve' | 'cancel') {
  if (!canAct(item, action)) return;
  selected.value = { item, action }; reason.value = ''; reasonError.value = ''; message.value = null;
}
async function confirm() {
  if (!selected.value || state.value.status !== 'ready' || !canAct(selected.value.item, selected.value.action)) return;
  const { item, action } = selected.value;
  if (action === 'cancel' && (!reason.value.trim() || reason.value.trim().length > 2000)) {
    reasonError.value = 'Enter a cancellation reason between 1 and 2,000 characters.'; return;
  }
  const current = new AbortController(); writeController = current;
  const version = state.value.context.requirementsVersion;
  pending.value = true; message.value = null; emit('invalidate');
  try {
    const result = action === 'reserve'
      ? await reserveEquipmentRequest(props.eventId, item.id, version, current.signal)
      : await cancelEquipmentReservation(props.eventId, item.id, version, reason.value.trim(), current.signal);
    if (current.signal.aborted) return;
    state.value = { status: 'ready', context: result.context }; selected.value = null; reason.value = '';
    message.value = result.changed
      ? action === 'reserve' ? 'Equipment reservation saved. The assigned coordinator has been notified.'
        : 'Equipment reservation cancelled. Its history has been retained.'
      : 'This action was already recorded. The current reservation information is shown.';
  } catch (error) {
    if (current.signal.aborted) return;
    selected.value = null;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    if (error instanceof ApiError && [403, 404].includes(error.status)) readError(error);
    else {
      // A timed-out write may have committed. Drop all actionable data until a fresh read.
      pending.value = false;
      const detail = error instanceof Error ? error.message : 'The reservation action could not be confirmed.';
      await load(`${detail} Review the refreshed saved requests before trying again.`);
    }
  } finally {
    if (!current.signal.aborted) { pending.value = false; emit('settled'); }
  }
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, props.eventId], reset, { flush: 'sync' });
onBeforeUnmount(reset);
</script>

<template>
  <section v-if="authorised" class="panel reservation-panel" aria-labelledby="reservation-title">
    <h2 id="reservation-title">Equipment reservations</h2>
    <p>Reserve complete saved requests for an approved event. Venue confirmation is not required. Unsaved what-if checks never create reservations.</p>
    <button v-if="state.status === 'idle'" type="button" class="button button-secondary" @click="load()">Load saved reservations</button>
    <p v-if="state.status === 'loading'" role="status">Loading saved reservations…</p>
    <div v-if="state.status === 'error'" role="alert">
      <p>{{ state.message }}</p><button v-if="state.retryable" type="button" class="button button-secondary" @click="load()">Retry reservations</button>
    </div>
    <p v-if="message" role="status">{{ message }}</p>
    <template v-if="state.status === 'ready'">
      <div class="reservation-toolbar">
        <h3 :class="ready ? 'ready' : 'not-ready'">{{ pending ? 'Updating equipment reservations' : readinessLabel }}</h3>
        <button type="button" class="button button-secondary" :disabled="pending" @click="load()">Refresh reservations</button>
      </div>
      <p v-if="!pending">{{ state.context.readiness.message }}</p>
      <p v-if="!pending">{{ state.context.readiness.reservedCount }} of {{ state.context.readiness.activeCount }} active requests reserved.</p>
      <p class="hint">Readiness uses current operational stock and all overlapping reservations. A previous successful check or reservation is not a guarantee after stock changes.</p>
      <p v-if="state.context.event.status === 'CONFIRMED'">This event is confirmed. Reservations are read-only.</p>
      <p v-if="!state.context.requests.length">No saved equipment requests. Ask the assigned coordinator to save equipment requests before reserving. Unsaved what-if items cannot be reserved.</p>
      <ul v-else class="reservation-list">
        <li v-for="item in state.context.requests" :key="item.id" :aria-label="`${item.equipmentName} reservation ${item.id}`">
          <h3>{{ item.equipmentName }} · {{ item.quantity }} units</h3>
          <p>Status: {{ item.status }}</p>
          <p>{{ formatEventTime(item.startsAt) }} – {{ formatEventTime(item.endsAt) }} (Singapore time)</p>
          <p v-if="item.notes">{{ item.notes }}</p>
          <p v-if="item.decidedAt">Decision recorded {{ formatEventTime(item.decidedAt) }} (Singapore time)</p>
          <p v-if="item.decisionReason">Decision reason: {{ item.decisionReason }}</p>
          <p v-if="item.releasedAt">Released {{ formatEventTime(item.releasedAt) }} (Singapore time)</p>
          <p v-if="item.releaseReason">Release reason: {{ item.releaseReason }}</p>
          <p v-if="item.releaseCause">Release cause: {{ item.releaseCause === 'MANUAL_CANCELLATION' ? 'Manual cancellation' : item.releaseCause === 'EVENT_CANCELLED' ? 'Event cancelled' : 'Event completed' }}</p>
          <div class="reservation-actions">
            <button v-if="canAct(item, 'reserve')" type="button" class="button button-primary" :aria-label="`Reserve ${item.equipmentName} request ${item.id}`" @click="choose(item, 'reserve')">Reserve full request</button>
            <button v-if="canAct(item, 'cancel')" type="button" class="button button-secondary" :aria-label="`Cancel ${item.equipmentName} reservation ${item.id}`" @click="choose(item, 'cancel')">Cancel reservation</button>
          </div>
        </li>
      </ul>
      <form v-if="selected" class="confirmation" aria-label="Confirm equipment action" novalidate @submit.prevent="confirm">
        <h3>{{ selected.action === 'reserve' ? 'Confirm full reservation' : 'Confirm cancellation' }}</h3>
        <p>{{ selected.item.equipmentName }} · {{ selected.item.quantity }} units · {{ formatEventTime(selected.item.startsAt) }} – {{ formatEventTime(selected.item.endsAt) }} (Singapore time)</p>
        <p v-if="selected.action === 'reserve'">The full saved quantity will be reserved only if stock is still available when this action is saved.</p>
        <template v-else>
          <label for="reservation-cancel-reason">Cancellation reason</label>
          <textarea id="reservation-cancel-reason" v-model="reason" :disabled="pending" :aria-invalid="!!reasonError" aria-describedby="reservation-reason-error" />
          <p id="reservation-reason-error" class="not-ready" role="alert">{{ reasonError }}</p>
        </template>
        <div class="reservation-actions">
          <button type="submit" class="button button-primary" :disabled="pending">{{ pending ? 'Saving reservation action…' : selected.action === 'reserve' ? 'Confirm reservation' : 'Confirm cancellation' }}</button>
          <button type="button" class="button button-secondary" :disabled="pending" @click="selected = null">Keep current requests</button>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.reservation-panel { padding: 24px; margin-bottom: 20px; }
.reservation-panel h2 { font-size: 20px; }
.reservation-panel h3 { font-size: 16px; }
.reservation-panel p { line-height: 1.6; margin-top: 10px; overflow-wrap: anywhere; }
.reservation-toolbar, .reservation-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
.reservation-toolbar { justify-content: space-between; }
.reservation-list { list-style: none; padding: 0; }
.reservation-list > li, .confirmation { padding: 20px; border: 1px solid var(--border); border-radius: 8px; margin-top: 16px; }
.confirmation { background: #f7f9f5; }
.hint { color: #59685e; font-size: 13px; }
.ready { color: #365d2e; }
.not-ready { color: #853e37; }
label { display: block; margin: 16px 0 8px; font-weight: 600; }
textarea { width: 100%; min-height: 80px; box-sizing: border-box; border: 1px solid var(--border); border-radius: 6px; padding: 10px; font: inherit; }
@media (max-width: 600px) { .reservation-panel, .reservation-list > li, .confirmation { padding: 16px; } }
</style>
