<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import {
  assignCoordinator, fetchCoordinators, fetchUnassignedRequests,
  type CoordinatorOption, type UnassignedRequest,
} from '../../events/api/assignments';
import { eventStatusLabel, formatEventTime } from '../../events/presentation';

type LoadState = { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: UnassignedRequest[]; coordinators: CoordinatorOption[] };
const state = ref<LoadState>({ status: 'loading' });
const selection = reactive<Record<string, string>>({});
const busyId = ref<string | null>(null);
const rowError = ref<{ id: string; message: string } | null>(null);
const saved = ref<{ id: string; name: string; coordinatorName: string } | null>(null);
const notice = ref('');
const refreshRequired = ref(false);
let controller: AbortController | undefined;
let writeController: AbortController | undefined;
let version = 0;

function invalidate() {
  version += 1;
  controller?.abort();
  writeController?.abort();
  busyId.value = null;
}
async function load(message = '') {
  invalidate();
  state.value = { status: 'loading' };
  saved.value = null;
  rowError.value = null;
  notice.value = message;
  refreshRequired.value = false;
  for (const key of Object.keys(selection)) delete selection[key];
  if (authSession.loading || authSession.user?.role !== 'EVENT_COORDINATOR_LEAD') return;
  const current = new AbortController();
  controller = current;
  try {
    const [items, coordinators] = await Promise.all([
      fetchUnassignedRequests(current.signal), fetchCoordinators(current.signal),
    ]);
    if (current.signal.aborted) return;
    for (const item of items) selection[item.id] = '';
    state.value = { status: 'ready', items, coordinators };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    state.value = { status: 'error', message: error instanceof Error ? error.message : 'Unassigned requests could not be loaded. Please try again.' };
  }
}
async function assign(item: UnassignedRequest) {
  if (state.value.status !== 'ready' || busyId.value || refreshRequired.value || authSession.loading || authSession.user?.role !== 'EVENT_COORDINATOR_LEAD') return;
  const coordinatorId = selection[item.id];
  const coordinator = state.value.coordinators.find((option) => option.id === coordinatorId);
  if (!coordinator) return;
  const currentVersion = version;
  const current = new AbortController();
  writeController = current;
  busyId.value = item.id;
  rowError.value = null;
  saved.value = null;
  notice.value = '';
  try {
    await assignCoordinator(item.id, { coordinatorId: coordinator.id }, current.signal);
    if (current.signal.aborted || currentVersion !== version) return;
    saved.value = { id: item.id, name: item.name ?? 'Untitled event request', coordinatorName: coordinator.displayName };
    state.value = { ...state.value, items: state.value.items.filter((other) => other.id !== item.id) };
  } catch (error) {
    if (current.signal.aborted || currentVersion !== version) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    if (error instanceof ApiError && [404, 409].includes(error.status)) {
      const message = error.code === 'ASSIGNMENT_HISTORY_CONFLICT'
        ? `${error.message} The assignment queue has been refreshed; open the allocation to inspect its history.`
        : 'This request has changed or was assigned by another Lead. The assignment queue has been refreshed.';
      await load(message);
      return;
    }
    rowError.value = { id: item.id, message: error instanceof Error ? error.message : 'The assignment could not be saved. Refresh before trying again.' };
    if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.code === 'INVALID_RESPONSE') {
      refreshRequired.value = true;
      rowError.value.message = 'We could not confirm whether the assignment was saved. Refresh the queue before trying again.';
    }
  } finally {
    if (!current.signal.aborted && currentVersion === version) busyId.value = null;
  }
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role], () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(invalidate);
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For coordinator Leads</p>
    <h1>Assignment queue</h1>
    <p class="page-description">Assign submitted requests to an available event coordinator. Assignment does not approve or reject the event.</p>
  </section>

  <section class="panel unassigned-panel" aria-labelledby="unassigned-title">
    <div class="queue-toolbar"><RouterLink to="/lead/oversight" class="text-link">View all active events</RouterLink><button type="button" class="button button-secondary" :disabled="state.status === 'loading' || busyId !== null" @click="load()">Refresh</button></div>
    <p v-if="notice" role="status">{{ notice }}</p>
    <h2 id="unassigned-title" class="sr-only">Event requests without a coordinator</h2>

    <p v-if="saved" class="assignment-saved" role="status">
      “{{ saved.name }}” is now assigned to {{ saved.coordinatorName }}.
      <RouterLink :to="`/lead/oversight/${saved.id}`" class="text-link">Open allocation</RouterLink>
    </p>

    <p v-if="state.status === 'loading'" role="status">Loading unassigned requests…</p>

    <div v-else-if="state.status === 'error'" role="alert">
      <p>{{ state.message }}</p>
      <button type="button" class="button button-secondary" @click="load()">Try again</button>
    </div>

    <div v-else-if="state.items.length === 0" class="feature-placeholder">
      <div class="empty-illustration"><AppIcon name="review" :size="38" /></div>
      <h2>No requests are awaiting assignment</h2>
      <p>Newly submitted event requests without a coordinator will appear here.</p>
    </div>

    <template v-else>
    <p v-if="state.coordinators.length === 0" role="status">No event coordinators are currently available. Refresh after availability has been updated.</p>
    <ul class="unassigned-list">
      <li v-for="item in state.items" :key="item.id" class="unassigned-item">
        <div class="unassigned-summary">
          <RouterLink :to="`/lead/oversight/${item.id}`" class="unassigned-name">{{ item.name ?? 'Untitled event request' }}</RouterLink>
          <span class="unassigned-meta">
            {{ eventStatusLabel(item.status) }} · {{ item.organiserName }} · {{ formatEventTime(item.startsAt) }}
            <template v-if="item.expectedAttendance !== null"> · {{ item.expectedAttendance }} expected</template>
          </span>
        </div>
        <form class="unassigned-actions" :aria-busy="busyId === item.id" @submit.prevent="assign(item)">
          <label class="sr-only" :for="`assign-${item.id}`">Coordinator for {{ item.name ?? 'untitled event request' }}</label>
          <select :id="`assign-${item.id}`" v-model="selection[item.id]" :disabled="busyId !== null || refreshRequired">
            <option value="" disabled>Choose a coordinator</option>
            <option v-for="option in state.coordinators" :key="option.id" :value="option.id">
              {{ option.displayName }}
            </option>
          </select>
          <button type="submit" class="button button-primary" :disabled="busyId !== null || refreshRequired || !selection[item.id]">
            {{ busyId === item.id ? 'Assigning…' : 'Assign' }}
          </button>
        </form>
        <p v-if="rowError?.id === item.id" class="unassigned-error" role="alert">{{ rowError.message }}</p>
      </li>
    </ul>
    </template>
  </section>
</template>

<style scoped>
/* The global stylesheet has no .sr-only rule yet, so the page carries its own. */
.sr-only {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap; border: 0;
}
.queue-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; }
.unassigned-panel { padding: 24px; }
.unassigned-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.unassigned-item {
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 14px 16px;
  border: 1px solid var(--border); border-radius: 8px;
}
.unassigned-summary { flex: 1 1 260px; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.unassigned-name { font-weight: 600; overflow-wrap: anywhere; }
.unassigned-meta { font-size: 13px; color: #59685e; }
.unassigned-actions { display: flex; align-items: center; gap: 8px; }
.unassigned-actions select {
  padding: 9px 10px; border: 1px solid #87958c; border-radius: 6px; font: inherit; font-size: 14px;
  color: inherit; background: #fff; max-width: 220px;
}
.unassigned-actions select:focus-visible, .unassigned-actions button:focus-visible { outline: 3px solid #90a950; outline-offset: 3px; }
.unassigned-actions .button { font-size: 14px; padding: 10px 16px; }
.unassigned-actions button:disabled { cursor: not-allowed; opacity: 0.65; }
.unassigned-error { flex-basis: 100%; color: #8a332b; font-size: 14px; }
.assignment-saved {
  border-left: 3px solid var(--green); background: #f0f5ee; padding: 12px 16px; border-radius: 4px;
  font-size: 14px; line-height: 1.6; margin-bottom: 16px;
}
</style>
