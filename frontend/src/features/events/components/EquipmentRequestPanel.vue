<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession } from '../../auth/session.js';
import { cancelEquipmentLine, fetchEquipmentPlan, fetchEquipmentTypes, saveEquipmentLines, type EquipmentLine, type EquipmentLineInput, type EquipmentType } from '../api/arrangements';

const props = defineProps<{ eventRequestId: string; status: string }>();
const emit = defineEmits<{ changed: [] }>();
const types = ref<EquipmentType[]>([]);
const lines = ref<EquipmentLine[]>([]);
const selectedType = ref('');
const quantity = ref(1);
const startsAt = ref('');
const endsAt = ref('');
const technicalRequirements = ref('');
const notRequired = ref(false);
const planStatus = ref('REQUIRED');
const loading = ref(false);
const busy = ref(false);
const error = ref('');
const savedMessage = ref('');
const canEdit = computed(() => authSession.user?.role === 'EVENT_COORDINATOR' && props.status === 'APPROVED');
const active = computed(() => lines.value.filter((line) => line.status !== 'CANCELLED'));
const requested = computed(() => lines.value.filter((line) => line.status === 'REQUESTED'));

async function load() {
  if (!canEdit.value && authSession.user?.role !== 'TECHNICAL_SUPPORT_STAFF') return;
  loading.value = true; error.value = '';
  try {
    const [plan, catalogue] = await Promise.all([
      fetchEquipmentPlan(props.eventRequestId), fetchEquipmentTypes(),
    ]);
    lines.value = plan.items; planStatus.value = plan.status; notRequired.value = plan.status === 'NOT_REQUIRED'; types.value = catalogue;
  } catch (caught) { error.value = caught instanceof ApiError ? caught.message : 'Equipment requests could not be loaded.'; }
  finally { loading.value = false; }
}
function iso(value: string) { return new Date(`${value}:00+08:00`).toISOString(); }
async function save() {
  if (!canEdit.value || busy.value) return;
  busy.value = true; error.value = ''; savedMessage.value = '';
  try {
    const payload: EquipmentLineInput[] = notRequired.value ? [] : [...requested.value.map((line) => ({
      equipmentTypeId: line.equipmentTypeId, quantity: line.quantity, startsAt: line.startsAt,
      endsAt: line.endsAt, technicalRequirements: line.technicalRequirements,
    }))];
    if (!notRequired.value) {
      if (!selectedType.value || !startsAt.value || !endsAt.value || !Number.isInteger(quantity.value) || quantity.value < 1) {
        error.value = 'Choose equipment, quantity and a valid event period.'; return;
      }
      const revisedLine: EquipmentLineInput = { equipmentTypeId: selectedType.value, quantity: quantity.value,
        startsAt: iso(startsAt.value), endsAt: iso(endsAt.value), technicalRequirements: technicalRequirements.value.trim() || null };
      const existingIndex = payload.findIndex((line) => line.equipmentTypeId === selectedType.value);
      if (existingIndex >= 0) payload[existingIndex] = revisedLine;
      else payload.push(revisedLine);
    }
    const result = await saveEquipmentLines(props.eventRequestId, payload, notRequired.value);
    savedMessage.value = result.request.status === 'NOT_REQUIRED' ? 'Equipment marked Not Required.' : 'Equipment request saved.';
    selectedType.value = ''; quantity.value = 1; startsAt.value = ''; endsAt.value = ''; technicalRequirements.value = '';
    notRequired.value = false; await load(); emit('changed');
  } catch (caught) { error.value = caught instanceof ApiError ? caught.message : 'The equipment request could not be saved.'; }
  finally { busy.value = false; }
}
async function cancelLine(line: EquipmentLine) {
  try { await cancelEquipmentLine(line.id, 'Coordinator cancelled this requested equipment line.'); await load(); emit('changed'); }
  catch (caught) { error.value = caught instanceof ApiError ? caught.message : 'The equipment line could not be cancelled.'; }
}
onMounted(() => { void load(); });
</script>

<template>
  <section v-if="canEdit || authSession.user?.role === 'TECHNICAL_SUPPORT_STAFF'" class="panel arrangement-panel" aria-labelledby="equipment-heading">
    <h2 id="equipment-heading">Equipment arrangements</h2>
    <p v-if="loading" role="status">Loading equipment requests…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="savedMessage" role="status">{{ savedMessage }}</p>
    <p v-if="active.length === 0">{{ planStatus === 'NOT_REQUIRED' ? 'No equipment is required for this event.' : 'No equipment request lines have been saved.' }}</p>
    <ul v-else class="equipment-lines">
      <li v-for="line in lines" :key="line.id">
        <strong>{{ line.equipmentType }}</strong> — {{ line.quantity }} · {{ new Date(line.startsAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) }}
        <span> to {{ new Date(line.endsAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) }}</span>
        <span v-if="line.technicalRequirements"> · {{ line.technicalRequirements }}</span>
        <span class="line-status"> — {{ line.status }}<template v-if="line.decisionReason">: {{ line.decisionReason }}</template></span>
        <button v-if="canEdit && ['REQUESTED', 'REJECTED'].includes(line.status)" type="button" class="text-button" @click="cancelLine(line)">Cancel line</button>
      </li>
    </ul>
    <form v-if="canEdit" @submit.prevent="save">
      <label class="check-row"><input v-model="notRequired" type="checkbox" :disabled="active.length > 0" /> No equipment is required</label>
      <template v-if="!notRequired">
        <label>Equipment type<select v-model="selectedType" required><option value="" disabled>Select equipment</option><option v-for="type in types" :key="type.id" :value="type.id">{{ type.name }}</option></select></label>
        <label>Quantity<input v-model.number="quantity" type="number" min="1" step="1" required /></label>
        <label>Starts (Singapore time)<input v-model="startsAt" type="datetime-local" required /></label>
        <label>Ends (Singapore time)<input v-model="endsAt" type="datetime-local" required /></label>
        <label>Technical requirements<textarea v-model="technicalRequirements" maxlength="2000" /></label>
      </template>
      <button class="button button-primary" type="submit" :disabled="busy">{{ busy ? 'Saving…' : 'Save equipment request' }}</button>
    </form>
  </section>
</template>

<style scoped>
.arrangement-panel { padding: 22px; display: grid; gap: 14px; }
form { display: grid; gap: 12px; }
label { display: grid; gap: 6px; font-size: 14px; }
input, select, textarea { border: 1px solid var(--border); border-radius: 8px; padding: 10px; font: inherit; }
textarea { min-height: 70px; }
.check-row { display: flex; align-items: center; gap: 8px; }
.equipment-lines { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
.line-status { color: #59685e; }
.text-button { margin-left: 8px; border: 0; background: none; color: var(--green); text-decoration: underline; cursor: pointer; }
</style>
