<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { formatEventTime } from '../../events/presentation';
import {
  fetchEquipmentStock, fetchEquipmentStockDetail, stockStatusLabel, updateEquipmentStock,
  type EquipmentStockChange, type EquipmentStockDetail, type EquipmentStockItem,
} from '../api/equipment-stock';

const MAX_QUANTITY = 1_000_000;
const MAX_REASON = 500;
type ListState = { status: 'idle' | 'loading' } | { status: 'ready'; items: EquipmentStockItem[] }
  | { status: 'error'; message: string; retryable: boolean };
type DetailState = { status: 'idle' | 'loading' } | { status: 'ready'; detail: EquipmentStockDetail }
  | { status: 'error'; message: string };

const list = ref<ListState>({ status: 'idle' });
const selectedId = ref<string | null>(null);
const detail = ref<DetailState>({ status: 'idle' });
const form = reactive({ total: '', damaged: '', maintenance: '', reason: '' });
const saving = ref(false);
const feedback = ref<{ kind: 'success' | 'error'; message: string; reload?: boolean } | null>(null);
let listController: AbortController | undefined;
let detailController: AbortController | undefined;
let saveController: AbortController | undefined;

const selected = computed(() => detail.value.status === 'ready' ? detail.value.detail : null);
const isTechnician = computed(() => !authSession.loading && authSession.user?.role === 'TECHNICAL_SUPPORT_STAFF');

function whole(value: string): number | null {
  return /^\d{1,7}$/.test(value.trim()) && Number(value) <= MAX_QUANTITY ? Number(value) : null;
}
const total = computed(() => whole(form.total));
const damaged = computed(() => whole(form.damaged));
const maintenance = computed(() => whole(form.maintenance));
const errors = computed(() => {
  const found: Record<string, string> = {};
  const range = `Enter a whole number from 0 to ${MAX_QUANTITY.toLocaleString('en-SG')}.`;
  if (total.value === null) found.total = range;
  if (damaged.value === null) found.damaged = range;
  if (maintenance.value === null) found.maintenance = range;
  if (!found.total && !found.damaged && !found.maintenance
    && damaged.value! + maintenance.value! > total.value!) {
    found.sum = 'Damaged plus maintenance cannot be more than the total quantity.';
  }
  const reason = form.reason.trim();
  if (!reason) found.reason = 'Enter the reason for this change.';
  else if (reason.length > MAX_REASON) found.reason = `Keep the reason to ${MAX_REASON} characters or fewer.`;
  return found;
});
const usable = computed(() => errors.value.total || errors.value.damaged || errors.value.maintenance || errors.value.sum
  ? null : total.value! - damaged.value! - maintenance.value!);
const unchanged = computed(() => !selected.value || (total.value === selected.value.item.totalQuantity
  && damaged.value === selected.value.item.damagedQuantity && maintenance.value === selected.value.item.maintenanceQuantity));
const canSave = computed(() => !saving.value && !!selected.value && !Object.keys(errors.value).length && !unchanged.value);

function describeError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function loadList() {
  listController?.abort();
  list.value = { status: 'idle' };
  if (!isTechnician.value) return;
  const current = new AbortController(); listController = current;
  list.value = { status: 'loading' };
  try {
    const items = await fetchEquipmentStock(current.signal);
    if (!current.signal.aborted) list.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    const denied = error instanceof ApiError && [403, 404].includes(error.status);
    list.value = { status: 'error', retryable: !denied,
      message: denied ? 'Equipment stock is unavailable or you do not have permission to view it.'
        : describeError(error, 'Equipment stock could not be loaded. Please try again.') };
  }
}

function fillForm(item: EquipmentStockItem) {
  form.total = String(item.totalQuantity);
  form.damaged = String(item.damagedQuantity);
  form.maintenance = String(item.maintenanceQuantity);
  form.reason = '';
}

async function open(id: string, keepFeedback = false) {
  detailController?.abort();
  saveController?.abort();
  saving.value = false;
  selectedId.value = id;
  if (!keepFeedback) feedback.value = null;
  detail.value = { status: 'loading' };
  const current = new AbortController(); detailController = current;
  try {
    const loaded = await fetchEquipmentStockDetail(id, current.signal);
    if (current.signal.aborted) return;
    detail.value = { status: 'ready', detail: loaded };
    fillForm(loaded.item);
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    detail.value = { status: 'error', message: describeError(error, 'This equipment type could not be loaded.') };
  }
}

function close() {
  detailController?.abort(); saveController?.abort();
  saving.value = false; selectedId.value = null; detail.value = { status: 'idle' }; feedback.value = null;
}

async function reload() {
  const id = selectedId.value;
  await loadList();
  if (id) await open(id, true);
}

async function save() {
  const current = selected.value;
  if (!current || !canSave.value) return;
  const id = current.item.id;
  const controller = new AbortController(); saveController = controller;
  saving.value = true; feedback.value = null;
  try {
    const result = await updateEquipmentStock(id, {
      expectedRevision: current.item.revision, totalQuantity: total.value!, damagedQuantity: damaged.value!,
      maintenanceQuantity: maintenance.value!, reason: form.reason.trim(),
    }, controller.signal);
    if (controller.signal.aborted || selectedId.value !== id) return;
    detail.value = { status: 'ready', detail: result };
    fillForm(result.item);
    if (list.value.status === 'ready') {
      list.value = { status: 'ready', items: list.value.items.map(item => item.id === id ? result.item : item) };
    }
    feedback.value = { kind: 'success', message: !result.changed
      ? 'No change was needed: the stock already matches these quantities.'
      : `Stock saved.${result.notifiedEvents ? ` Shortfall notices were sent for ${result.notifiedEvents} affected ${result.notifiedEvents === 1 ? 'event' : 'events'}.` : ''}` };
  } catch (error) {
    if (controller.signal.aborted || selectedId.value !== id) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    const stale = error instanceof ApiError && error.code === 'EQUIPMENT_STOCK_REVISION_CONFLICT';
    feedback.value = { kind: 'error', reload: stale,
      message: describeError(error, 'The stock change could not be saved. Check your connection and try again.') };
  } finally {
    if (saveController === controller) { saving.value = false; saveController = undefined; }
  }
}

function changeSummary(change: EquipmentStockChange): string {
  const parts: string[] = [];
  const pairs: [string, number, number][] = [
    ['Total', change.previous.totalQuantity, change.next.totalQuantity],
    ['Damaged', change.previous.damagedQuantity, change.next.damagedQuantity],
    ['Maintenance', change.previous.maintenanceQuantity, change.next.maintenanceQuantity],
  ];
  for (const [label, before, after] of pairs) if (before !== after) parts.push(`${label} ${before} → ${after}`);
  return parts.join(', ');
}

watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role],
  () => { close(); void loadList(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => { listController?.abort(); detailController?.abort(); saveController?.abort(); });
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For technical support</p>
    <h1>Equipment stock</h1>
    <p class="page-description">See which equipment is usable and record units that are damaged or under maintenance. Reservations are never cancelled by a change here; any that stock can no longer cover are listed so they can be resolved.</p>
  </section>

  <section class="panel stock-list-panel" aria-labelledby="stock-list-title">
    <div class="list-heading">
      <h2 id="stock-list-title">Equipment types</h2>
      <button class="button button-secondary" type="button" :disabled="list.status === 'loading'" @click="reload">Refresh stock</button>
    </div>
    <p v-if="list.status === 'loading'" role="status">Loading equipment stock…</p>
    <div v-else-if="list.status === 'error'" role="alert">
      <p>{{ list.message }}</p>
      <button v-if="list.retryable" class="button button-secondary" type="button" @click="loadList">Try again</button>
    </div>
    <template v-else-if="list.status === 'ready'">
      <p v-if="!list.items.length" role="status">No equipment types have been set up yet.</p>
      <ul v-else class="stock-list">
        <li v-for="item in list.items" :key="item.id" :class="{ 'is-selected': item.id === selectedId }">
          <div class="stock-name">
            <h3>{{ item.name }}</h3>
            <span class="stock-status" :class="`status-${item.status.toLowerCase()}`">{{ stockStatusLabel[item.status] }}</span>
          </div>
          <p v-if="item.category || !item.isActive" class="stock-meta">{{ item.category }}<template v-if="!item.isActive"> · Not in the active catalogue</template></p>
          <dl class="stock-quantities">
            <div><dt>Total</dt><dd>{{ item.totalQuantity }}</dd></div>
            <div><dt>Damaged</dt><dd>{{ item.damagedQuantity }}</dd></div>
            <div><dt>Maintenance</dt><dd>{{ item.maintenanceQuantity }}</dd></div>
            <div><dt>Usable</dt><dd>{{ item.operationalQuantity }}</dd></div>
          </dl>
          <p v-if="item.shortfallEventCount" class="stock-warning" role="status">
            {{ item.shortfallEventCount }} {{ item.shortfallEventCount === 1 ? 'event has' : 'events have' }} more reserved than is usable.
          </p>
          <button class="button button-secondary" type="button" :aria-label="`Update stock for ${item.name}`" @click="open(item.id)">Update stock</button>
        </li>
      </ul>
    </template>
  </section>

  <section v-if="selectedId" class="panel stock-editor" aria-labelledby="stock-editor-title">
    <p v-if="detail.status === 'loading'" role="status">Loading this equipment type…</p>
    <div v-else-if="detail.status === 'error'" role="alert">
      <p>{{ detail.message }}</p>
      <button class="button button-secondary" type="button" @click="open(selectedId)">Try again</button>
      <button class="button button-secondary" type="button" @click="close">Close</button>
    </div>
    <template v-else-if="selected">
      <div class="list-heading">
        <h2 id="stock-editor-title">Update {{ selected.item.name }}</h2>
        <button class="button button-secondary" type="button" @click="close">Close</button>
      </div>
      <p class="stock-meta">Based on revision {{ selected.item.revision }}. If someone else changes this stock first, you will be asked to reload before saving.</p>
      <form class="stock-form" novalidate @submit.prevent="save">
        <div class="form-field">
          <label for="stock-total">Total quantity</label>
          <input id="stock-total" v-model="form.total" inputmode="numeric" autocomplete="off" :aria-invalid="!!errors.total" aria-describedby="stock-total-error" />
          <p v-if="errors.total" id="stock-total-error" class="field-error">{{ errors.total }}</p>
        </div>
        <div class="form-field">
          <label for="stock-damaged">Damaged</label>
          <input id="stock-damaged" v-model="form.damaged" inputmode="numeric" autocomplete="off" :aria-invalid="!!errors.damaged" aria-describedby="stock-damaged-error" />
          <p v-if="errors.damaged" id="stock-damaged-error" class="field-error">{{ errors.damaged }}</p>
        </div>
        <div class="form-field">
          <label for="stock-maintenance">Under maintenance</label>
          <input id="stock-maintenance" v-model="form.maintenance" inputmode="numeric" autocomplete="off" :aria-invalid="!!errors.maintenance" aria-describedby="stock-maintenance-error" />
          <p v-if="errors.maintenance" id="stock-maintenance-error" class="field-error">{{ errors.maintenance }}</p>
        </div>
        <p v-if="errors.sum" class="field-error" role="alert">{{ errors.sum }}</p>
        <p class="stock-usable" role="status">Usable after this change: <strong>{{ usable === null ? '—' : usable }}</strong></p>
        <div class="form-field">
          <label for="stock-reason">Reason for the change</label>
          <textarea id="stock-reason" v-model="form.reason" rows="3" :maxlength="MAX_REASON + 50" :aria-invalid="!!errors.reason" aria-describedby="stock-reason-error" />
          <p v-if="errors.reason && form.reason" id="stock-reason-error" class="field-error">{{ errors.reason }}</p>
        </div>
        <p v-if="unchanged" class="stock-meta">Change at least one quantity to save.</p>
        <div class="form-actions">
          <button class="button button-primary" type="submit" :disabled="!canSave">{{ saving ? 'Saving…' : 'Save stock change' }}</button>
        </div>
      </form>
      <div v-if="feedback" :role="feedback.kind === 'error' ? 'alert' : 'status'" :class="`stock-feedback is-${feedback.kind}`">
        <p>{{ feedback.message }}</p>
        <button v-if="feedback.reload" class="button button-secondary" type="button" @click="reload">Reload stock</button>
      </div>

      <h3>Reservations not fully covered</h3>
      <p v-if="!selected.shortfalls.length" class="stock-meta">Every reservation of this equipment is covered by the usable stock.</p>
      <ul v-else class="shortfall-list" aria-label="Reservations not fully covered">
        <li v-for="gap in selected.shortfalls" :key="gap.eventId">
          <strong>{{ gap.eventName?.trim() || 'Untitled event' }}</strong>
          <span>{{ gap.shortfallQuantity }} short</span>
          <p>{{ formatEventTime(gap.startsAt) }} – {{ formatEventTime(gap.endsAt) }} · Singapore time. {{ gap.reservedQuantity }} reserved; at most {{ gap.peakReservedQuantity }} reserved at once against {{ gap.operationalQuantity }} usable.</p>
        </li>
      </ul>

      <h3>Recent changes</h3>
      <p v-if="!selected.history.length" class="stock-meta">No change has been recorded for this equipment type.</p>
      <ol v-else class="history-list" aria-label="Recent stock changes">
        <li v-for="change in selected.history" :key="change.id">
          <strong>{{ changeSummary(change) || 'No quantity change' }}</strong>
          <p>{{ change.reason }}</p>
          <p class="stock-meta">Revision {{ change.revision }} · {{ change.changedByName ?? 'A Technical Support Staff member' }} · {{ formatEventTime(change.changedAt) }} · Singapore time</p>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.stock-list-panel, .stock-editor { padding: 24px; margin-bottom: 20px; }
.list-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.stock-list, .shortfall-list, .history-list { list-style: none; padding: 0; display: grid; gap: 12px; }
.history-list { padding-left: 0; }
.stock-list li, .shortfall-list li, .history-list li { border: 1px solid var(--border); padding: 16px; border-radius: 8px; min-width: 0; }
.stock-list li.is-selected { border-color: var(--green); }
.stock-name { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.stock-name h3 { font-size: 17px; overflow-wrap: anywhere; }
.stock-status { font-size: 13px; font-weight: 600; }
.status-partly_unavailable { color: #8a5a00; }
.status-unavailable { color: #a32a2a; }
.stock-meta { margin: 6px 0; font-size: 14px; color: var(--muted, #5b6b62); }
.stock-quantities { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 12px 0; }
.stock-quantities div { min-width: 0; }
.stock-quantities dt { font-size: 12px; color: var(--muted, #5b6b62); }
.stock-quantities dd { font-size: 20px; font-weight: 600; margin: 0; }
.stock-warning { color: #a32a2a; font-weight: 600; margin: 8px 0; }
.stock-form { display: grid; gap: 14px; max-width: 520px; margin: 16px 0; }
.stock-form input, .stock-form textarea { width: 100%; box-sizing: border-box; }
.stock-usable { margin: 0; }
.stock-feedback { border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
.stock-feedback.is-success { background: #eef6ef; }
.stock-feedback.is-error { background: #fbeeee; }
.shortfall-list li span { float: right; font-weight: 600; color: #a32a2a; }
.shortfall-list p, .history-list p { margin: 6px 0 0; line-height: 1.5; overflow-wrap: anywhere; }
@media (max-width: 480px) {
  .stock-list-panel, .stock-editor { padding: 16px; }
  .stock-quantities { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
