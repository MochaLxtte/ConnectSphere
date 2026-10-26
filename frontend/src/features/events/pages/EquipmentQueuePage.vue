<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, getJson } from '../../../lib/api-client';
import { reviewEquipmentLine, type EquipmentLine } from '../api/arrangements';

const items = ref<EquipmentLine[]>([]);
const reasons = ref<Record<string, string>>({});
const loading = ref(false);
const error = ref('');
const message = ref('');
const busyId = ref('');
async function load() {
  loading.value = true; error.value = '';
  try { items.value = (await getJson<{ items: EquipmentLine[] }>('/api/equipment-requests')).items; }
  catch (caught) { error.value = caught instanceof ApiError ? caught.message : 'Equipment requests could not be loaded.'; }
  finally { loading.value = false; }
}
async function decide(line: EquipmentLine, decision: 'RESERVED' | 'REJECTED') {
  if (decision === 'REJECTED' && !reasons.value[line.id]?.trim()) return;
  busyId.value = line.id; error.value = ''; message.value = '';
  try {
    await reviewEquipmentLine(line.id, decision, reasons.value[line.id]?.trim());
    message.value = decision === 'RESERVED' ? 'The full equipment line was reserved.' : 'The request was rejected.';
    await load();
  } catch (caught) { error.value = caught instanceof ApiError ? caught.message : 'The equipment request could not be updated.'; }
  finally { busyId.value = ''; }
}
onMounted(() => { void load(); });
</script>

<template>
  <section class="page-heading"><p class="eyebrow">Technical Support</p><h1>Equipment requests</h1>
    <p class="page-description">Review requested types, quantities, periods and technical requirements.</p></section>
  <div class="queue-toolbar"><button class="button button-secondary" type="button" :disabled="loading" @click="load">Refresh</button></div>
  <p v-if="loading" role="status">Loading equipment requests…</p>
  <p v-if="message" role="status">{{ message }}</p>
  <p v-if="error" role="alert">{{ error }}</p>
  <section v-for="line in items" :key="line.id" class="panel request-card">
    <h2>{{ line.eventName || 'Untitled event' }}</h2>
    <dl><dt>Equipment</dt><dd>{{ line.equipmentType }}</dd><dt>Quantity</dt><dd>{{ line.quantity }}</dd>
      <dt>Period</dt><dd>{{ new Date(line.startsAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) }} – {{ new Date(line.endsAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) }}</dd>
      <dt>Technical requirements</dt><dd>{{ line.technicalRequirements || 'None supplied' }}</dd>
      <dt>Status</dt><dd>{{ line.status }}</dd><template v-if="line.decisionReason"><dt>Outcome reason</dt><dd>{{ line.decisionReason }}</dd></template></dl>
    <div v-if="line.status === 'REQUESTED'" class="decision-actions">
      <label>Rejection reason<input v-model="reasons[line.id]" maxlength="2000" /></label>
      <button class="button button-primary" type="button" :disabled="busyId === line.id" @click="decide(line, 'RESERVED')">Reserve full line</button>
      <button class="button button-secondary" type="button" :disabled="busyId === line.id || !reasons[line.id]?.trim()" @click="decide(line, 'REJECTED')">Reject request</button>
    </div>
  </section>
  <p v-if="!loading && !error && items.length === 0" class="panel empty-state">No equipment requests are waiting.</p>
</template>

<style scoped>
.queue-toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.request-card { margin-bottom: 16px; padding: 22px; }
dl { display: grid; grid-template-columns: 180px 1fr; gap: 10px 16px; }
dt { color: #59685e; } dd { margin: 0; }
.decision-actions { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; margin-top: 20px; }
label { display: grid; flex: 1 1 240px; gap: 6px; font-size: 14px; }
input { padding: 10px; border: 1px solid var(--border); border-radius: 8px; font: inherit; }
.empty-state { padding: 20px; }
@media (max-width: 600px) { dl { grid-template-columns: 1fr; gap: 5px; } dd { margin-bottom: 7px; } }
</style>
