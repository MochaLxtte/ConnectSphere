<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { eventStatusLabel, formatEventTime } from '../../events/presentation';
import { assessEquipmentAvailability, fetchEquipmentContext,
  type EquipmentAvailabilityAssessment, type EquipmentAvailabilityContext } from '../api/equipment-availability';
import { equipmentInputTime, equipmentWhatIfInput, type EquipmentInputRow } from '../availability-form';
import EquipmentReservationPanel from './EquipmentReservationPanel.vue';

type State = { status: 'idle' | 'loading' } | { status: 'ready'; context: EquipmentAvailabilityContext }
  | { status: 'error'; message: string; retryable: boolean };
const route = useRoute();
const eventId = computed(() => route.matched.some((record) => record.path === '/equipment/availability/:id')
  && typeof route.params.id === 'string' ? route.params.id : '');
const state = ref<State>({ status: 'idle' });
const mode = ref<'saved' | 'what-if'>('saved');
const startsAt = ref(''), endsAt = ref('');
const rows = ref<EquipmentInputRow[]>([]);
const submitted = ref(false);
const assessing = ref(false);
const reservationPending = ref(false), sourceNeedsRefresh = ref(false);
const assessment = ref<EquipmentAvailabilityAssessment | null>(null);
const errorMessage = ref<string | null>(null), notice = ref<string | null>(null);
let readController: AbortController | undefined;
let checkController: AbortController | undefined;
const form = computed(() => equipmentWhatIfInput(startsAt.value, endsAt.value, rows.value,
  state.value.status === 'ready' ? state.value.context.equipmentTypes : [],
  state.value.status === 'ready' ? state.value.context.requirementsVersion : ''));
const canCheck = computed(() => !assessing.value && !reservationPending.value && !sourceNeedsRefresh.value && state.value.status === 'ready'
  && state.value.context.equipmentTypes.length > 0
  && (mode.value === 'what-if' || state.value.context.savedRequests.length > 0));
const fulfillable = computed(() => assessment.value?.outcome === 'FULFILLABLE' && assessment.value.items.length > 0
  && assessment.value.items.every((item) => item.isActive && item.availableQuantity >= item.requestedQuantity
    && item.requestedQuantity > 0 && item.shortfallQuantity === 0));

function discardAssessment() {
  checkController?.abort();
  assessment.value = null; errorMessage.value = null; assessing.value = false;
}
function showReadError(error: unknown) {
  const denied = error instanceof ApiError && [403, 404].includes(error.status);
  state.value = { status: 'error', retryable: !denied,
    message: denied ? 'This event is unavailable or you do not have permission to check its equipment.'
      : error instanceof Error ? error.message : 'Equipment information could not be loaded. Please try again.' };
}
async function load(message: string | null = null) {
  readController?.abort(); discardAssessment();
  reservationPending.value = false; sourceNeedsRefresh.value = false;
  state.value = { status: 'idle' }; submitted.value = false;
  rows.value = []; startsAt.value = ''; endsAt.value = ''; notice.value = message;
  if (authSession.loading || authSession.user?.role !== 'TECHNICAL_SUPPORT_STAFF' || !eventId.value) return;
  const current = new AbortController(); readController = current;
  state.value = { status: 'loading' };
  try {
    const context = await fetchEquipmentContext(eventId.value, current.signal);
    if (current.signal.aborted) return;
    state.value = { status: 'ready', context };
    mode.value = context.savedRequests.length ? 'saved' : 'what-if';
    startsAt.value = equipmentInputTime(context.event.startsAt); endsAt.value = equipmentInputTime(context.event.endsAt);
    rows.value = [{ equipmentTypeId: '', quantity: '' }];
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    showReadError(error);
  }
}
function invalidateReservationSource() {
  reservationPending.value = true; sourceNeedsRefresh.value = true; discardAssessment();
}
async function refreshAfterReservation() {
  reservationPending.value = false;
  readController?.abort(); discardAssessment();
  if (authSession.loading || authSession.user?.role !== 'TECHNICAL_SUPPORT_STAFF' || !eventId.value) return;
  const current = new AbortController(); readController = current;
  try {
    const context = await fetchEquipmentContext(eventId.value, current.signal);
    if (current.signal.aborted) return;
    state.value = { status: 'ready', context }; sourceNeedsRefresh.value = false;
    mode.value = context.savedRequests.length ? 'saved' : 'what-if';
    rows.value = [{ equipmentTypeId: '', quantity: '' }]; submitted.value = false;
    startsAt.value = equipmentInputTime(context.event.startsAt); endsAt.value = equipmentInputTime(context.event.endsAt);
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    if (error instanceof ApiError && [403, 404].includes(error.status)) showReadError(error);
    else notice.value = 'The reservation action finished, but availability information could not be refreshed. Refresh equipment information before checking again.';
  }
}
async function check() {
  if (!canCheck.value || state.value.status !== 'ready' || !eventId.value
    || authSession.loading || authSession.user?.role !== 'TECHNICAL_SUPPORT_STAFF') return;
  discardAssessment(); notice.value = null; submitted.value = true;
  const input = mode.value === 'saved'
    ? { mode: 'saved' as const, requirementsVersion: state.value.context.requirementsVersion } : form.value.input;
  if (!input) return;
  const current = new AbortController(); checkController = current; assessing.value = true;
  try {
    const result = await assessEquipmentAvailability(eventId.value, input, current.signal);
    if (current.signal.aborted) return;
    if (!result.items.length) {
      errorMessage.value = 'No equipment items were assessed. Refresh the information and try again.';
    } else assessment.value = result;
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    if (error instanceof ApiError && error.status === 409 && error.code === 'EQUIPMENT_CONTEXT_CHANGED') {
      await load('The event or saved equipment requests changed. Review the refreshed information and check again. Unsaved inputs have been cleared.');
    } else if (error instanceof ApiError && [403, 404].includes(error.status)) {
      discardAssessment(); showReadError(error);
    } else errorMessage.value = error instanceof Error ? error.message : 'The availability check failed. Please try again.';
  } finally { if (!current.signal.aborted) assessing.value = false; }
}
function equipmentName(id: string) {
  return state.value.status === 'ready' ? state.value.context.equipmentTypes.find((item) => item.id === id)?.name ?? 'Unavailable equipment type' : '';
}
watch([mode, startsAt, endsAt, rows], discardAssessment, { deep: true, flush: 'sync' });
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, eventId.value],
  () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => { readController?.abort(); checkController?.abort(); });
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For technical support</p>
    <h1>Check equipment availability</h1>
    <p class="page-description">Compare equipment requirements with operational stock and overlapping reservations.</p>
  </section>
  <nav class="equipment-toolbar" aria-label="Equipment navigation">
    <RouterLink to="/equipment/availability">Back to equipment events</RouterLink>
    <button class="button button-secondary" type="button" :disabled="state.status === 'loading'" @click="load()">Refresh equipment information</button>
  </nav>
  <p v-if="notice" class="panel equipment-panel" role="alert">{{ notice }}</p>
  <p v-if="state.status === 'loading'" role="status">Loading event and equipment information…</p>
  <div v-else-if="state.status === 'error'" class="panel equipment-panel" role="alert">
    <p>{{ state.message }}</p><button v-if="state.retryable" class="button button-secondary" type="button" @click="load()">Try again</button>
  </div>
  <template v-else-if="state.status === 'ready'">
    <section class="panel equipment-panel" aria-labelledby="equipment-event-title">
      <h2 id="equipment-event-title">{{ state.context.event.name?.trim() || 'Untitled event' }}</h2>
      <p>{{ eventStatusLabel(state.context.event.status) }} · Event times in Singapore time</p>
      <dl>
        <div><dt>Event starts</dt><dd>{{ formatEventTime(state.context.event.startsAt) }}</dd></div>
        <div><dt>Event ends</dt><dd>{{ formatEventTime(state.context.event.endsAt) }}</dd></div>
        <div><dt>Equipment requirements</dt><dd>{{ state.context.event.equipmentRequirements || 'Not provided' }}</dd></div>
      </dl>
      <p class="hint">Free-text requirements are shown for reference. They are not automatically converted into quantities. Equipment checks are independent of venue confirmation.</p>
    </section>
    <section class="panel equipment-panel" aria-labelledby="saved-equipment-title">
      <h2 id="saved-equipment-title">Saved equipment requests</h2>
      <p v-if="!state.context.savedRequests.length">No saved equipment requests. Use an unsaved what-if check below.</p>
      <ul v-else class="saved-list">
        <li v-for="item in state.context.savedRequests" :key="item.id">
          <strong>{{ equipmentName(item.equipmentTypeId) }}</strong> · Quantity {{ item.quantity }} · {{ item.status }}
          <p>{{ formatEventTime(item.startsAt) }} – {{ formatEventTime(item.endsAt) }} · Singapore time</p>
          <p v-if="item.notes">{{ item.notes }}</p>
        </li>
      </ul>
    </section>
    <EquipmentReservationPanel :event-id="eventId" @invalidate="invalidateReservationSource" @settled="refreshAfterReservation" />
    <form class="panel equipment-panel" novalidate @submit.prevent="check">
      <h2>Choose what to check</h2>
      <fieldset class="mode-options"><legend>Check mode</legend>
        <label><input v-model="mode" type="radio" value="saved" :disabled="!state.context.savedRequests.length" /> Saved equipment requests</label>
        <label><input v-model="mode" type="radio" value="what-if" /> Unsaved what-if check</label>
      </fieldset>
      <p v-if="!state.context.equipmentTypes.length" role="status">No equipment types are available. Refresh after the catalogue is updated.</p>
      <template v-else-if="mode === 'what-if'">
        <p class="hint">This is a hypothetical check. It does not save requirements, change the event window or reserve equipment. The window starts with the event's current times. All existing reservations still count.</p>
        <p id="equipment-time-help" class="hint">Singapore time: enter YYYY-MM-DDTHH:mm, for example 2026-11-01T10:00. Seconds and up to six fractional digits are also supported.</p>
        <div class="time-fields">
          <div><label class="field-label" for="equipment-starts">Check starts (Singapore time)</label>
            <input id="equipment-starts" v-model="startsAt" type="text" placeholder="2026-11-01T10:00" :aria-invalid="submitted && !!form.errors.startsAt" aria-describedby="equipment-time-help equipment-start-error" />
            <p id="equipment-start-error" class="field-error">{{ submitted ? form.errors.startsAt : '' }}</p></div>
          <div><label class="field-label" for="equipment-ends">Check ends (Singapore time)</label>
            <input id="equipment-ends" v-model="endsAt" type="text" placeholder="2026-11-01T12:00" :aria-invalid="submitted && !!form.errors.endsAt" aria-describedby="equipment-time-help equipment-end-error" />
            <p id="equipment-end-error" class="field-error">{{ submitted ? form.errors.endsAt : '' }}</p></div>
        </div>
        <fieldset v-for="(item, index) in rows" :key="index" class="item-row">
          <legend>Equipment item {{ index + 1 }}</legend>
          <div><label class="field-label" :for="`equipment-type-${index}`">Equipment type {{ index + 1 }}</label>
            <select :id="`equipment-type-${index}`" v-model="item.equipmentTypeId" :aria-invalid="submitted && !!form.errors.rows[index]?.equipmentTypeId" :aria-describedby="`equipment-type-error-${index}`">
              <option value="" disabled>Select equipment</option>
              <option v-for="type in state.context.equipmentTypes" :key="type.id" :value="type.id">{{ type.name }}{{ type.isActive ? '' : ' (inactive)' }}</option>
            </select><p :id="`equipment-type-error-${index}`" class="field-error">{{ submitted ? form.errors.rows[index]?.equipmentTypeId : '' }}</p></div>
          <div><label class="field-label" :for="`equipment-quantity-${index}`">Quantity {{ index + 1 }}</label>
            <input :id="`equipment-quantity-${index}`" v-model="item.quantity" type="text" inputmode="numeric" :aria-invalid="submitted && !!form.errors.rows[index]?.quantity" :aria-describedby="`equipment-quantity-error-${index}`" />
            <p :id="`equipment-quantity-error-${index}`" class="field-error">{{ submitted ? form.errors.rows[index]?.quantity : '' }}</p></div>
          <button class="button button-secondary" type="button" :aria-label="`Remove equipment item ${index + 1}`" @click="rows.splice(index, 1)">Remove</button>
        </fieldset>
        <p v-if="submitted && form.errors.items" class="field-error" role="alert">{{ form.errors.items }}</p>
        <button class="button button-secondary" type="button" @click="rows.push({ equipmentTypeId: '', quantity: '' })">Add equipment item</button>
      </template>
      <p v-else class="hint">Checks the saved quantities and current event window. Existing reservations for these exact saved requests are not counted twice. Other reservations still count.</p>
      <p v-if="errorMessage" class="field-error" role="alert">{{ errorMessage }}</p>
      <div class="equipment-actions"><button class="button button-primary" type="submit" :disabled="!canCheck">{{ assessing ? 'Checking availability…' : assessment ? 'Recheck availability' : 'Check availability' }}</button></div>
      <p class="hint">Each check reads current stock. Damaged and maintenance quantities are excluded. Overlapping reservations use the peak simultaneous quantity; adjacent bookings do not overlap.</p>
    </form>
    <section v-if="assessment" class="panel equipment-panel" aria-label="Equipment assessment" aria-live="polite">
      <h2 :class="fulfillable ? 'outcome-fulfillable' : 'outcome-shortfall'">{{ fulfillable ? 'Fulfillable' : 'Shortfall / Unfulfillable' }}</h2>
      <p>{{ assessment.mode === 'saved' ? 'Saved request assessment' : 'Unsaved what-if assessment' }} · Checked {{ formatEventTime(assessment.checkedAt) }} (Singapore time)</p>
      <p>Check window: {{ formatEventTime(assessment.startsAt) }} – {{ formatEventTime(assessment.endsAt) }} (Singapore time)</p>
      <div class="table-scroll"><table><caption>Availability by equipment type</caption>
        <thead><tr><th scope="col">Equipment</th><th scope="col">Requested</th><th scope="col">Total</th><th scope="col">Damaged</th><th scope="col">Maintenance</th><th scope="col">Operational</th><th scope="col">Peak reserved</th><th scope="col">Available</th><th scope="col">Shortfall</th><th scope="col">Result</th></tr></thead>
        <tbody><tr v-for="item in assessment.items" :key="item.equipmentTypeId" :class="item.shortfallQuantity > 0 ? 'shortfall-row' : ''">
          <th scope="row">{{ item.equipmentTypeName }}{{ item.isActive ? '' : ' (inactive)' }}</th><td>{{ item.requestedQuantity }}</td><td>{{ item.totalQuantity }}</td><td>{{ item.damagedQuantity }}</td><td>{{ item.maintenanceQuantity }}</td><td>{{ item.operationalQuantity }}</td><td>{{ item.peakReservedQuantity }}</td><td>{{ item.availableQuantity }}</td><td>{{ item.shortfallQuantity }}</td><td>{{ item.shortfallQuantity > 0 ? 'Shortfall' : 'Available' }}</td>
        </tr></tbody>
      </table></div>
      <p class="hint">Advisory only: this result applies to the stock and reservations checked at the time above. It does not reserve equipment or guarantee later availability. Recheck before reservation; the reservation process must check stock again.</p>
    </section>
  </template>
</template>

<style scoped>
.equipment-toolbar, .equipment-actions { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 20px 0; }
.equipment-toolbar a { color: var(--green); }
.equipment-panel { padding: 24px; margin-bottom: 20px; }
.equipment-panel h2 { font-size: 20px; }
.equipment-panel p { line-height: 1.6; margin-top: 10px; }
.hint { color: #59685e; font-size: 13px; }
dl { display: grid; gap: 12px; margin-top: 20px; }
dl > div { display: grid; grid-template-columns: minmax(120px, 1fr) 2fr; gap: 16px; }
dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.saved-list { padding-left: 20px; }
.saved-list li { margin-top: 16px; }
.field-label { display: block; margin: 12px 0 8px; font-size: 14px; font-weight: 600; }
.time-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
input:not([type='radio']), select { box-sizing: border-box; width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 10px; font: inherit; background: white; }
fieldset { min-width: 0; border: 1px solid var(--border); border-radius: 8px; margin: 20px 0; padding: 16px; }
.mode-options label { display: inline-flex; gap: 8px; margin-right: 24px; line-height: 2; }
.item-row { display: grid; grid-template-columns: 2fr 1fr auto; gap: 16px; align-items: start; }
.item-row > button { margin-top: 37px; }
.field-error, .outcome-shortfall { color: #853e37; }
.field-error { font-size: 14px; }
.outcome-fulfillable { color: #365d2e; }
.table-scroll { overflow-x: auto; margin-top: 20px; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
caption { text-align: left; font-weight: 600; margin-bottom: 12px; }
th, td { text-align: left; border-bottom: 1px solid var(--border); padding: 12px; }
.shortfall-row { background: #fbeeed; color: #853e37; }
@media (max-width: 700px) { .time-fields, .item-row { grid-template-columns: 1fr; } .item-row > button { margin-top: 0; } .equipment-toolbar { align-items: flex-start; flex-direction: column; } dl > div { grid-template-columns: 1fr; gap: 4px; } }
</style>
