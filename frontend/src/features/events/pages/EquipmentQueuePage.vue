<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError, getJson } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { reviewEquipmentLine, type EquipmentLine } from '../api/arrangements';

const items = ref<EquipmentLine[]>([]);
const reasons = ref<Record<string, string>>({});
const loading = ref(false);
const error = ref('');
const message = ref('');
const busyId = ref('');
const ready = ref(false);
const stale = ref(false);
let reader: AbortController | undefined;
let writer: AbortController | undefined;
const authorised = computed(() => !authSession.loading && authSession.user?.role === 'TECHNICAL_SUPPORT_STAFF');
const canAct = computed(() => authorised.value && ready.value && !loading.value && !busyId.value && !stale.value);
function reset() {
  reader?.abort(); writer?.abort(); items.value = []; reasons.value = {};
  loading.value = false; error.value = ''; message.value = ''; busyId.value = ''; ready.value = false; stale.value = false;
}
async function load() {
  if (!authorised.value) return;
  reader?.abort(); const current = new AbortController(); reader = current;
  loading.value = true; ready.value = false; error.value = ''; stale.value = false; items.value = []; reasons.value = {};
  try {
    const result = await getJson<{ items: EquipmentLine[] }>('/api/equipment-requests', current.signal);
    if (current.signal.aborted) return;
    items.value = result.items; ready.value = true;
  } catch (caught) {
    if (current.signal.aborted) return;
    if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return; }
    error.value = caught instanceof ApiError ? caught.message : 'Equipment requests could not be loaded.';
  } finally { if (!current.signal.aborted) loading.value = false; }
}
async function decide(line: EquipmentLine, decision: 'RESERVED' | 'REJECTED') {
  if (!canAct.value || line.status !== 'REQUESTED' || line.eventStatus !== 'APPROVED' || !line.revision ||
    (decision === 'REJECTED' && !reasons.value[line.id]?.trim())) return;
  const current = new AbortController(); writer = current;
  busyId.value = line.id; error.value = ''; message.value = '';
  try {
    await reviewEquipmentLine(line.id, decision, line.revision, reasons.value[line.id]?.trim(), current.signal);
    if (current.signal.aborted) return;
    await load();
    if (current.signal.aborted) return;
    message.value = decision === 'RESERVED' ? 'The full equipment line was reserved.' : 'The request was rejected.';
  } catch (caught) {
    if (current.signal.aborted) return;
    if (caught instanceof ApiError && caught.status === 401) { clearLocalSession(); return; }
    if (caught instanceof ApiError && [403, 404].includes(caught.status)) { items.value = []; reasons.value = {}; ready.value = false; }
    stale.value = !(caught instanceof ApiError && [400, 422].includes(caught.status));
    error.value = caught instanceof ApiError ? caught.message : 'The equipment request could not be updated.';
  } finally { if (!current.signal.aborted) busyId.value = ''; }
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role],
  () => { reset(); void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(reset);
</script>

<template>
  <section class="page-heading"><p class="eyebrow">Technical Support</p><h1>Equipment requests</h1>
    <p class="page-description">Review requested types, quantities, periods and technical requirements.</p></section>
  <p v-if="authSession.loading" role="status">Checking your session…</p>
  <p v-else-if="!authorised" role="alert">Sign in as Technical Support to review equipment requests.</p>
  <template v-else>
    <div class="queue-toolbar"><button class="button button-secondary" type="button" :disabled="loading || !!busyId" @click="load">Refresh</button></div>
    <p v-if="loading" role="status">Loading equipment requests…</p>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="stale">Refresh the queue and check the saved outcome before trying again.</p>
    <section v-for="line in items" :key="line.id" class="panel request-card">
      <h2>{{ line.eventName || 'Untitled event' }}</h2>
      <dl><dt>Equipment</dt><dd>{{ line.equipmentType }}</dd><dt>Quantity</dt><dd>{{ line.quantity }}</dd>
        <dt>Period</dt><dd>{{ new Date(line.startsAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) }} – {{ new Date(line.endsAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) }}</dd>
        <dt>Technical requirements</dt><dd>{{ line.technicalRequirements ?? line.notes ?? 'None supplied' }}</dd>
        <dt>Status</dt><dd>{{ line.status }}</dd><template v-if="line.decisionReason"><dt>Outcome reason</dt><dd>{{ line.decisionReason }}</dd></template></dl>
      <a :href="'/equipment/availability/' + encodeURIComponent(line.eventRequestId)">Check availability and manage reservations</a>
      <div v-if="line.status === 'REQUESTED' && line.eventStatus === 'APPROVED'" class="decision-actions">
        <label :for="'reason-' + line.id">Rejection reason</label><input :id="'reason-' + line.id" v-model="reasons[line.id]" maxlength="2000" :disabled="!canAct" />
        <button class="button button-primary" type="button" :disabled="!canAct" @click="decide(line, 'RESERVED')">Reserve full line</button>
        <button class="button button-secondary" type="button" :disabled="!canAct || !reasons[line.id]?.trim()" @click="decide(line, 'REJECTED')">Reject request</button>
      </div>
    </section>
    <p v-if="ready && !loading && !error && items.length === 0" class="panel empty-state">No equipment requests are waiting.</p>
  </template>
</template>

<style scoped>
.queue-toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.request-card { margin-bottom: 16px; padding: 22px; }
dl { display: grid; grid-template-columns: 180px 1fr; gap: 10px 16px; }
dt { color: #59685e; } dd { margin: 0; }
.decision-actions { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; margin-top: 20px; }
label { font-size: 14px; }
input { flex: 1 1 240px; padding: 10px; border: 1px solid var(--border); border-radius: 8px; font: inherit; }
.empty-state { padding: 20px; }
@media (max-width: 600px) { dl { grid-template-columns: 1fr; gap: 5px; } dd { margin-bottom: 7px; } }
</style>
