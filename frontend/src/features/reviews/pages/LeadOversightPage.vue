<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { fetchLeadEvents, type LeadEventSummary } from '../../events/api/assignments';
import { eventStatusLabel, formatEventTime } from '../../events/presentation';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: LeadEventSummary[] };
const state = ref<State>({ status: 'loading' });
let controller: AbortController | undefined;
async function load() {
  controller?.abort();
  state.value = { status: 'loading' };
  if (authSession.loading || authSession.user?.role !== 'EVENT_COORDINATOR_LEAD') return;
  const current = new AbortController();
  controller = current;
  try {
    const items = await fetchLeadEvents(current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    state.value = { status: 'error', message: error instanceof Error ? error.message : 'Active events could not be loaded. Please try again.' };
  }
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role], () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For coordinator Leads</p>
    <h1>Event oversight</h1>
    <p class="page-description">View active submitted events and their current coordinator. Drafts and closed events are excluded.</p>
  </section>
  <section class="panel oversight-panel">
    <div class="oversight-toolbar">
      <RouterLink to="/lead" class="text-link">Back to assignment queue</RouterLink>
      <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load">Refresh</button>
    </div>
    <p v-if="state.status === 'loading'" role="status">Loading active events…</p>
    <div v-else-if="state.status === 'error'" role="alert">
      <p>{{ state.message }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <p v-else-if="state.items.length === 0">No active events.</p>
    <ul v-else class="oversight-list">
      <li v-for="item in state.items" :key="item.id">
        <RouterLink :to="`/lead/oversight/${item.id}`">{{ item.name ?? 'Untitled event request' }}</RouterLink>
        <p>{{ eventStatusLabel(item.status) }} · {{ item.organiserName }}</p>
        <p>Coordinator: <strong>{{ item.coordinatorName ?? 'Unassigned' }}</strong></p>
        <p>Starts: {{ formatEventTime(item.startsAt) }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.oversight-panel { padding: 24px; }
.oversight-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.oversight-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.oversight-list li { border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-wrap: anywhere; }
.oversight-list a { color: var(--green); font-weight: 600; }
.oversight-list p { margin-top: 6px; }
</style>
