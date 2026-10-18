<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { fetchLeadEvent, type LeadEventDetail } from '../../events/api/assignments';
import AssignmentPanel from '../../events/components/AssignmentPanel.vue';
import { eventStatusLabel, formatEventTime } from '../../events/presentation';

const route = useRoute();
const requestId = computed(() => String(route.params.id ?? ''));
type State = { status: 'loading' } | { status: 'error'; message: string; retryable: boolean } | { status: 'ready'; detail: LeadEventDetail };
const state = ref<State>({ status: 'loading' });
let controller: AbortController | undefined;
async function load() {
  controller?.abort();
  state.value = { status: 'loading' };
  if (authSession.loading || authSession.user?.role !== 'EVENT_COORDINATOR_LEAD' || !requestId.value) return;
  const current = new AbortController();
  controller = current;
  try {
    const detail = await fetchLeadEvent(requestId.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', detail };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    const denied = error instanceof ApiError && [400, 403, 404].includes(error.status);
    state.value = { status: 'error', retryable: !denied, message: denied
      ? 'This event is unavailable or you do not have permission to oversee it.'
      : error instanceof Error ? error.message : 'The event could not be loaded. Please try again.' };
  }
}
// Reload the allocation without unmounting its saved receipt/history panel.
async function refreshAllocation() {
  const current = controller;
  try {
    const detail = await fetchLeadEvent(requestId.value, current?.signal);
    if (!current?.signal.aborted && state.value.status === 'ready') state.value = { status: 'ready', detail };
  } catch {
    if (!current?.signal.aborted) await load();
  }
}
watch(() => [requestId.value, authSession.loading, authSession.user?.id, authSession.user?.role], () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For coordinator Leads</p>
    <h1>Event allocation</h1>
    <p class="page-description">Review allocation details and the coordinator assignment history.</p>
  </section>
  <div class="allocation-toolbar">
    <RouterLink to="/lead/oversight" class="text-link">Back to event oversight</RouterLink>
    <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load">Refresh</button>
  </div>
  <p v-if="state.status === 'loading'" class="panel allocation-panel" role="status">Loading event allocation…</p>
  <section v-else-if="state.status === 'error'" class="panel allocation-panel" role="alert">
    <p>{{ state.message }}</p>
    <button v-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
  </section>
  <template v-else>
    <section class="panel allocation-panel">
      <h2>{{ state.detail.name ?? 'Untitled event request' }}</h2>
      <p>All dates and times are in Singapore time.</p>
      <dl>
        <dt>Status</dt><dd>{{ eventStatusLabel(state.detail.status) }}</dd>
        <dt>Organiser</dt><dd>{{ state.detail.organiserName }}</dd>
        <dt>Current coordinator</dt><dd>{{ state.detail.coordinatorName ?? 'Unassigned' }}</dd>
        <dt>Purpose</dt><dd>{{ state.detail.purpose ?? 'Not provided' }}</dd>
        <dt>Description</dt><dd>{{ state.detail.description ?? 'Not provided' }}</dd>
        <dt>Starts</dt><dd>{{ formatEventTime(state.detail.startsAt) }}</dd>
        <dt>Ends</dt><dd>{{ formatEventTime(state.detail.endsAt) }}</dd>
        <dt>Expected attendance</dt><dd>{{ state.detail.expectedAttendance ?? 'Not provided' }}</dd>
        <dt>Venue requirements</dt><dd>{{ state.detail.venueRequirements ?? 'Not provided' }}</dd>
        <dt>Accessibility needs</dt><dd>{{ state.detail.accessibilityNeeds ?? 'Not provided' }}</dd>
        <dt>Equipment requirements</dt><dd>{{ state.detail.equipmentRequirements ?? 'Not provided' }}</dd>
        <dt>Registration required</dt><dd>{{ state.detail.registrationRequired === null ? 'Not provided' : state.detail.registrationRequired ? 'Yes' : 'No' }}</dd>
      </dl>
    </section>
    <AssignmentPanel :key="state.detail.id" :event-request-id="state.detail.id"
      :current-coordinator-id="state.detail.coordinatorId" :status="state.detail.status"
      viewer-role="EVENT_COORDINATOR_LEAD" :can-assign-coordinator="state.detail.actions.canAssignCoordinator"
      :can-reassign-coordinator="state.detail.actions.canReassignCoordinator" :assignment-version="state.detail.assignmentVersion"
      :refresh-assignment-context="refreshAllocation" />
  </template>
</template>

<style scoped>
.allocation-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.allocation-panel { padding: 24px; margin-bottom: 20px; }
.allocation-panel dl { display: grid; grid-template-columns: minmax(150px, 1fr) 2fr; gap: 12px 20px; margin-top: 20px; }
.allocation-panel dt { font-weight: 600; }
.allocation-panel dd { margin: 0; overflow-wrap: anywhere; }
@media (max-width: 520px) { .allocation-panel dl { grid-template-columns: 1fr; } }
</style>
