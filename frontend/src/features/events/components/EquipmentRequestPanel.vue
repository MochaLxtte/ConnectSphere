<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { cancelEquipmentLine, fetchEquipmentPlan, fetchEquipmentTypes, replaceEquipmentLine, saveEquipmentLines,
  type EquipmentLine, type EquipmentLineInput, type EquipmentPlan, type EquipmentType } from '../api/arrangements';

const props = defineProps<{ eventRequestId: string; status: string; revision?: number }>();
const emit = defineEmits<{ changed: []; refresh: [] }>();
const plan = ref<EquipmentPlan | null>(null);
const types = ref<EquipmentType[]>([]);
const selectedType = ref('');
const quantity = ref(1);
const technicalRequirements = ref('');
const notRequired = ref(false);
const replacementId = ref('');
const replacementConfirmed = ref(false);
const cancelId = ref('');
const cancelReason = ref('');
const loading = ref(false);
const busy = ref(false);
const stale = ref(false);
const error = ref('');
const savedMessage = ref('');
let reader: AbortController | undefined;
let writer: AbortController | undefined;
const canRead = computed(() => !authSession.loading && !!props.eventRequestId &&
  ['EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF'].includes(authSession.user?.role ?? '') &&
  ['APPROVED', 'CONFIRMED'].includes(props.status));
// KAN-84 Option A: a confirmed event reopens while its safety review requests technical changes.
const canEdit = computed(() => canRead.value && authSession.user?.role === 'EVENT_COORDINATOR' &&
  ((props.status === 'APPROVED' && plan.value?.eventStatus === 'APPROVED')
    || (props.status === 'CONFIRMED' && plan.value?.eventStatus === 'CONFIRMED' && plan.value?.technicalRemediation === true)));
const canAct = computed(() => canEdit.value && !!plan.value?.revision && !loading.value && !busy.value && !stale.value);
const lines = computed(() => plan.value?.items ?? []);
const active = computed(() => lines.value.filter(line => line.status !== 'CANCELLED'));
const requested = computed(() => lines.value.filter(line => line.status === 'REQUESTED'));
const formatTime = (value: string) => new Date(value).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });

function clearForm() {
  selectedType.value = ''; quantity.value = 1; technicalRequirements.value = '';
  replacementId.value = ''; replacementConfirmed.value = false;
  cancelId.value = ''; cancelReason.value = '';
}
function reset() {
  reader?.abort(); writer?.abort(); plan.value = null; types.value = [];
  clearForm(); notRequired.value = false; loading.value = false; busy.value = false;
  stale.value = false; error.value = ''; savedMessage.value = '';
}
async function load() {
  if (!canRead.value) return;
  reader?.abort();
  const current = new AbortController(); reader = current;
  plan.value = null; clearForm(); loading.value = true; error.value = ''; stale.value = false;
  try {
    const [fresh, catalogue] = await Promise.all([
      fetchEquipmentPlan(props.eventRequestId, current.signal), fetchEquipmentTypes(current.signal),
    ]);
    if (current.signal.aborted) return;
    plan.value = fresh; notRequired.value = fresh.status === 'NOT_REQUIRED'; types.value = catalogue;
  } catch (caught) {
    if (current.signal.aborted) return;
    if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return; }
    error.value = caught instanceof ApiError ? caught.message : 'Equipment requests could not be loaded.';
  } finally { if (!current.signal.aborted) loading.value = false; }
}
function reload() {
  if (!canRead.value || loading.value || busy.value) return;
  // Explicit reconciliation also refreshes dependent readiness, without claiming a write.
  // Initial reads do not emit this event, so parent summary refreshes cannot loop.
  emit('refresh');
  void load();
}
watch(selectedType, value => {
  const existing = requested.value.find(line => line.equipmentTypeId === value);
  quantity.value = existing?.quantity ?? 1;
  technicalRequirements.value = existing?.technicalRequirements ?? existing?.notes ?? '';
}, { flush: 'sync' });

function lineInput(): EquipmentLineInput | null {
  if (!plan.value?.eventStartsAt || !plan.value.eventEndsAt || !selectedType.value ||
    !Number.isInteger(quantity.value) || quantity.value < 1) {
    error.value = 'Choose equipment, a whole positive quantity and an event with a valid period.'; return null;
  }
  return { equipmentTypeId: selectedType.value, quantity: quantity.value,
    startsAt: plan.value.eventStartsAt, endsAt: plan.value.eventEndsAt,
    technicalRequirements: technicalRequirements.value.trim() || null };
}
async function mutate(action: (signal: AbortSignal) => Promise<unknown>, message: string) {
  if (!canAct.value) return;
  const current = new AbortController(); writer = current;
  busy.value = true; error.value = ''; savedMessage.value = '';
  try {
    await action(current.signal);
    if (current.signal.aborted) return;
    // Sibling readiness must stop using its old snapshot as soon as the write succeeds,
    // even if this panel's follow-up read is delayed or fails.
    emit('changed');
    if (current.signal.aborted) return;
    await load();
    if (current.signal.aborted) return;
    savedMessage.value = message;
  } catch (caught) {
    if (current.signal.aborted) return;
    if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return; }
    if (caught instanceof ApiError && [403, 404].includes(caught.status)) { plan.value = null; clearForm(); }
    // A conflict or lost response must be reconciled before another intentional write.
    stale.value = !(caught instanceof ApiError && [400, 422].includes(caught.status));
    error.value = caught instanceof ApiError ? caught.message : 'The equipment request could not be updated.';
    if (stale.value) emit('refresh');
  } finally { if (!current.signal.aborted) busy.value = false; }
}
async function save() {
  if (!canAct.value || !plan.value) return;
  const revision = plan.value.revision;
  if (replacementId.value) {
    if (!replacementConfirmed.value) return;
    const replacement = lineInput(); if (!replacement) return;
    const id = replacementId.value;
    await mutate(signal => replaceEquipmentLine(id, replacement, revision, signal),
      'The old reservation was released and a new equipment request was saved for review.');
    return;
  }
  const payload: EquipmentLineInput[] = notRequired.value ? [] : requested.value.map(line => ({
    equipmentTypeId: line.equipmentTypeId, quantity: line.quantity, startsAt: line.startsAt,
    endsAt: line.endsAt, technicalRequirements: line.technicalRequirements ?? line.notes ?? null,
  }));
  if (!notRequired.value) {
    const revised = lineInput(); if (!revised) return;
    const index = payload.findIndex(line => line.equipmentTypeId === revised.equipmentTypeId);
    if (index >= 0) payload[index] = revised; else payload.push(revised);
  }
  const none = notRequired.value;
  await mutate(signal => saveEquipmentLines(props.eventRequestId, payload, none, revision, signal),
    none ? 'Equipment marked Not Required.' : 'Equipment request saved.');
}
function startReplacement(line: EquipmentLine) {
  if (!canAct.value) return;
  clearForm(); replacementId.value = line.id; notRequired.value = false;
  selectedType.value = line.equipmentTypeId; quantity.value = line.quantity;
  technicalRequirements.value = line.technicalRequirements ?? line.notes ?? '';
}
async function cancelLine() {
  if (!canAct.value || !plan.value || !cancelReason.value.trim()) return;
  const line = lines.value.find(item => item.id === cancelId.value);
  if (!line || !['REQUESTED', 'REJECTED'].includes(line.status)) return;
  const reason = cancelReason.value.trim();
  await mutate(signal => cancelEquipmentLine(line.id, reason, line.revision, signal), 'Equipment line cancelled.');
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, props.eventRequestId, props.status, props.revision],
  () => { reset(); void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(reset);
</script>

<template>
  <section v-if="canRead" class="panel arrangement-panel" aria-labelledby="equipment-heading">
    <h2 id="equipment-heading">Equipment arrangements</h2>
    <button class="button button-secondary" type="button" :disabled="loading || busy" @click="reload">Reload equipment</button>
    <p v-if="loading" role="status">Loading equipment requests…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="stale">Reload equipment before trying again. Check the saved outcome before repeating an action.</p>
    <p v-if="savedMessage" role="status">{{ savedMessage }}</p>
    <template v-if="plan && !loading">
      <p v-if="active.length === 0">{{ plan.status === 'NOT_REQUIRED' ? 'No equipment is required for this event.' : 'No active equipment request lines have been saved.' }}</p>
      <ul v-if="lines.length" class="equipment-lines">
        <li v-for="line in lines" :key="line.id">
          <strong>{{ line.equipmentType }}</strong> — {{ line.quantity }} · {{ formatTime(line.startsAt) }} to {{ formatTime(line.endsAt) }}
          <span v-if="line.technicalRequirements ?? line.notes"> · {{ line.technicalRequirements ?? line.notes }}</span>
          <span class="line-status"> — {{ line.status }}<template v-if="line.status !== 'CANCELLED' && line.decisionReason">: {{ line.decisionReason }}</template></span>
          <template v-if="line.status === 'CANCELLED'">
            <span class="line-history">Release reason: {{ line.releaseReason || 'Not recorded' }}</span>
            <span v-if="line.decisionReason" class="line-history">Previous review reason: {{ line.decisionReason }}</span>
          </template>
          <button v-if="canEdit && ['REQUESTED', 'REJECTED'].includes(line.status)" type="button" class="text-button" :disabled="!canAct" @click="cancelId = line.id; cancelReason = ''">Cancel line</button>
          <button v-if="canEdit && line.status === 'RESERVED'" type="button" class="text-button" :disabled="!canAct" @click="startReplacement(line)">Replace reserved line</button>
        </li>
      </ul>
      <form v-if="canEdit && cancelId" @submit.prevent="cancelLine">
        <fieldset :disabled="!canAct">
          <legend>Cancel equipment line</legend>
          <label>Cancellation reason<textarea v-model="cancelReason" required maxlength="2000" /></label>
          <button class="button button-secondary" type="submit" :disabled="!cancelReason.trim()">Confirm line cancellation</button>
          <button type="button" @click="cancelId = ''; cancelReason = ''">Keep line</button>
        </fieldset>
      </form>
      <form v-if="canEdit" @submit.prevent="save">
        <fieldset :disabled="!canAct">
          <legend>{{ replacementId ? 'Replace reserved equipment' : 'Request equipment' }}</legend>
          <label v-if="!replacementId" class="check-row"><input v-model="notRequired" type="checkbox" :disabled="active.length > 0" /> No equipment is required</label>
          <template v-if="!notRequired">
            <label>Equipment type<select v-model="selectedType" required><option value="" disabled>Select equipment</option><option v-for="type in types" :key="type.id" :value="type.id">{{ type.name }}</option></select></label>
            <label>Quantity<input v-model.number="quantity" type="number" min="1" step="1" required /></label>
            <p v-if="plan.eventStartsAt && plan.eventEndsAt">Event period (Singapore time): {{ formatTime(plan.eventStartsAt) }} – {{ formatTime(plan.eventEndsAt) }}</p>
            <p v-else role="alert">The event needs a valid start and end time before equipment can be requested.</p>
            <label>Technical requirements<textarea v-model="technicalRequirements" maxlength="2000" /></label>
          </template>
          <template v-if="replacementId">
            <label class="check-row"><input v-model="replacementConfirmed" type="checkbox" /> Release the existing reservation and send this replacement for a new availability review.</label>
            <button type="button" @click="clearForm">Keep existing reservation</button>
          </template>
          <button class="button button-primary" type="submit" :disabled="!canAct || (replacementId !== '' && !replacementConfirmed)">{{ busy ? 'Saving…' : replacementId ? 'Confirm replacement' : 'Save equipment request' }}</button>
        </fieldset>
      </form>
    </template>
  </section>
</template>

<style scoped>
.arrangement-panel { padding: 22px; display: grid; gap: 14px; }
form, fieldset { display: grid; gap: 12px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
legend { margin-bottom: 10px; font-weight: 600; }
label { display: grid; gap: 6px; font-size: 14px; }
input, select, textarea { border: 1px solid var(--border); border-radius: 8px; padding: 10px; font: inherit; }
textarea { min-height: 70px; }
.check-row { display: flex; align-items: center; gap: 8px; }
.equipment-lines { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
.line-status { color: #59685e; }
.line-history { display: block; margin-top: 4px; color: #59685e; }
.text-button { margin-left: 8px; border: 0; background: none; color: var(--green); text-decoration: underline; cursor: pointer; }
</style>
