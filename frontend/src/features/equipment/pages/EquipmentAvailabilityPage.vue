<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { eventStatusLabel, formatEventTime } from '../../events/presentation';
import { fetchEquipmentEvents, type EquipmentEventSummary } from '../api/equipment-availability';

type State = { status: 'idle' | 'loading' } | { status: 'ready'; items: EquipmentEventSummary[] }
  | { status: 'error'; message: string; retryable: boolean };
const route = useRoute();
const active = computed(() => route.path === '/equipment/availability' || route.path === '/equipment/availability/');
const state = ref<State>({ status: 'idle' });
let controller: AbortController | undefined;
async function load() {
  controller?.abort();
  state.value = { status: 'idle' };
  if (authSession.loading || authSession.user?.role !== 'TECHNICAL_SUPPORT_STAFF' || !active.value) return;
  const current = new AbortController(); controller = current;
  state.value = { status: 'loading' };
  try {
    const items = await fetchEquipmentEvents(current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    const denied = error instanceof ApiError && [403, 404].includes(error.status);
    state.value = { status: 'error', retryable: !denied,
      message: denied ? 'Equipment events are unavailable or you do not have permission to view them.'
        : error instanceof Error ? error.message : 'Equipment events could not be loaded. Please try again.' };
  }
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, active.value],
  () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For technical support</p>
    <h1>Equipment availability</h1>
    <p class="page-description">Check equipment quantities for approved and confirmed events. Venue confirmation is not required.</p>
  </section>
  <section class="panel equipment-list">
    <div class="list-heading"><h2>Events to check</h2><button class="button button-secondary" type="button"
      :disabled="state.status === 'loading'" @click="load">Refresh events</button></div>
    <p v-if="state.status === 'loading'" role="status">Loading equipment events…</p>
    <div v-else-if="state.status === 'error'" role="alert">
      <p>{{ state.message }}</p><button v-if="state.retryable" class="button button-secondary" type="button" @click="load">Try again</button>
    </div>
    <template v-else-if="state.status === 'ready'">
      <p v-if="!state.items.length" role="status">No approved or confirmed events are available to check.</p>
      <ul v-else>
        <li v-for="event in state.items" :key="event.id">
          <RouterLink :to="`/equipment/availability/${event.id}`">{{ event.name?.trim() || 'Untitled event' }}</RouterLink>
          <span>{{ eventStatusLabel(event.status) }}</span>
          <p>{{ formatEventTime(event.startsAt) }} – {{ formatEventTime(event.endsAt) }} · Singapore time</p>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.equipment-list { padding: 24px; }
.list-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.equipment-list ul { list-style: none; padding: 0; display: grid; gap: 12px; }
.equipment-list li { border: 1px solid var(--border); padding: 16px; border-radius: 8px; }
.equipment-list li a { color: var(--green); font-weight: 600; }
.equipment-list li span { float: right; font-size: 13px; }
.equipment-list p { margin-top: 10px; line-height: 1.6; }
</style>
