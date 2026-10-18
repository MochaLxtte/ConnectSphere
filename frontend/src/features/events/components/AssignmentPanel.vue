<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { assignCoordinator, fetchAssignments, fetchCoordinators, type AssignmentRecord, type CoordinatorOption } from '../api/assignments';
import { formatEventTime } from '../presentation';
import type { WorkflowPanelProps } from './use-workflow-panel';

const props = defineProps<WorkflowPanelProps & { currentCoordinatorId: string | null; canAssignCoordinator?: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const id = useId();
const assignments = ref<AssignmentRecord[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const coordinators = ref<CoordinatorOption[]>([]);
const coordinatorsError = ref<string | null>(null);
const selected = ref('');
const note = ref('');
const busy = ref(false);
const actionError = ref<string | null>(null);
const savedMessage = ref<string | null>(null);
const refreshRequired = ref(false);
let readController: AbortController | undefined;
let writeController: AbortController | undefined;
let version = 0;
const current = computed(() => assignments.value.find((item) => item.unassignedAt === null) ?? null);
const lead = computed(() => props.viewerRole === 'EVENT_COORDINATOR_LEAD'
  && !authSession.loading && authSession.user?.role === 'EVENT_COORDINATOR_LEAD');
const active = computed(() => ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED'].includes(props.status));
const canAssign = computed(() => lead.value && props.canAssignCoordinator === true
  && active.value && props.currentCoordinatorId === null && current.value === null
  && !loading.value && !loadError.value && !refreshRequired.value);
function invalidate() {
  version += 1;
  readController?.abort();
  writeController?.abort();
  busy.value = false;
}
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
async function load() {
  readController?.abort();
  const controller = new AbortController();
  readController = controller;
  loading.value = true;
  loadError.value = null;
  coordinators.value = [];
  coordinatorsError.value = null;
  if (authSession.loading || !authSession.user || authSession.user.role !== props.viewerRole) return;
  try {
    const records = await fetchAssignments(props.eventRequestId, controller.signal);
    if (controller.signal.aborted) return;
    assignments.value = records;
    if (lead.value && active.value && props.canAssignCoordinator === true && props.currentCoordinatorId === null && !current.value) {
      try {
        const options = await fetchCoordinators(controller.signal);
        if (!controller.signal.aborted) coordinators.value = options;
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
        coordinatorsError.value = 'The list of available coordinators could not be loaded. Refresh the assignment to try again.';
      }
    }
  } catch (error) {
    if (controller.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    assignments.value = [];
    loadError.value = errorMessage(error, 'The assignment could not be loaded. Please try again.');
  } finally {
    if (!controller.signal.aborted) loading.value = false;
  }
}
async function refreshAssignment() {
  emit('changed');
  await load();
  if (!loading.value && !loadError.value && authSession.user?.role === props.viewerRole) refreshRequired.value = false;
}
async function submit() {
  if (!canAssign.value || busy.value) return;
  const coordinator = coordinators.value.find((item) => item.id === selected.value);
  if (!coordinator) return;
  const currentVersion = version;
  const controller = new AbortController();
  writeController = controller;
  busy.value = true;
  actionError.value = null;
  savedMessage.value = null;
  try {
    await assignCoordinator(props.eventRequestId, { coordinatorId: coordinator.id, note: note.value.trim() || null }, controller.signal);
    if (controller.signal.aborted || currentVersion !== version) return;
    selected.value = '';
    note.value = '';
    savedMessage.value = `${coordinator.displayName} is now the coordinator for this request.`;
    emit('changed');
    await load();
  } catch (error) {
    if (controller.signal.aborted || currentVersion !== version) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    actionError.value = errorMessage(error, 'The assignment could not be saved. Refresh before trying again.');
    if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.code === 'INVALID_RESPONSE') {
      refreshRequired.value = true;
      actionError.value = 'We could not confirm whether the assignment was saved. Refresh the assignment before trying again.';
    }
    if (error instanceof ApiError && [404, 409].includes(error.status)) {
      selected.value = '';
      emit('changed');
      await load();
    }
  } finally {
    if (!controller.signal.aborted && currentVersion === version) busy.value = false;
  }
}
watch(() => [props.eventRequestId, props.viewerRole, authSession.loading, authSession.user?.id, authSession.user?.role], () => {
  invalidate();
  assignments.value = [];
  selected.value = '';
  note.value = '';
  actionError.value = null;
  savedMessage.value = null;
  refreshRequired.value = false;
  void load();
}, { immediate: true, flush: 'sync' });
onBeforeUnmount(invalidate);
</script>

<template>
  <section class="panel workflow-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">Coordinator</p>
      <h2 :id="`${id}-title`">Assignment</h2>
    </header>

    <p v-if="actionError" class="panel-error" role="alert">{{ actionError }}</p>
    <button v-if="refreshRequired" type="button" class="button button-secondary" :disabled="loading || busy" @click="refreshAssignment">Refresh assignment</button>
    <p v-if="savedMessage" class="panel-saved" role="status">{{ savedMessage }}</p>
    <p v-if="loading" role="status">Loading the assignment…</p>
    <div v-else-if="loadError" role="alert">
      <p class="panel-error">{{ loadError }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <template v-else>
      <p class="panel-description">
        <template v-if="current">
          <strong>{{ current.coordinatorName }}</strong> is coordinating this request
          <span class="panel-meta">(since {{ formatEventTime(current.assignedAt) }}).</span>
        </template>
        <template v-else-if="currentCoordinatorId === null">No coordinator has been assigned yet.</template>
        <template v-else>A coordinator is assigned to this request. Assignment history is unavailable.</template>
      </p>

      <form v-if="canAssign" :aria-busy="busy" @submit.prevent="submit">
        <p v-if="coordinatorsError" class="panel-error" role="alert">{{ coordinatorsError }}</p>
        <p v-else-if="coordinators.length === 0" role="status">No event coordinators are currently available.</p>
        <button v-if="coordinatorsError || coordinators.length === 0" type="button" class="button button-secondary" @click="load">Refresh assignment</button>
        <label :for="`${id}-coordinator`">Assign to</label>
        <select :id="`${id}-coordinator`" v-model="selected" :disabled="busy">
          <option value="" disabled>Choose a coordinator</option>
          <option v-for="option in coordinators" :key="option.id" :value="option.id">
            {{ option.displayName }} ({{ option.email }})
          </option>
        </select>
        <label :for="`${id}-note`">Note <span class="optional">(optional)</span></label>
        <textarea :id="`${id}-note`" v-model="note" rows="2" maxlength="2000" :disabled="busy" />
        <div class="panel-actions">
          <button type="submit" class="button button-primary" :disabled="busy || !selected">
            {{ busy ? 'Saving…' : 'Assign coordinator' }}
          </button>
        </div>
      </form>

      <template v-if="assignments.length > 0">
        <h3>Assignment history</h3>
        <ul class="panel-list">
          <li v-for="item in assignments" :key="item.id">
            <div class="item-heading">
              <span class="item-label">{{ item.coordinatorName }}</span>
              <span class="tag" :class="{ 'tag-positive': item.unassignedAt === null }">
                {{ item.unassignedAt === null ? 'Current' : 'Ended' }}
              </span>
            </div>
            <p class="panel-meta">
              <template v-if="item.assignmentMethod === 'AUTOMATIC'">Assigned automatically</template>
              <template v-else>Assigned by {{ item.assignedByName }}</template>
              on {{ formatEventTime(item.assignedAt) }}<template v-if="item.unassignedAt">,
              until {{ formatEventTime(item.unassignedAt) }}</template>
            </p>
            <p v-if="item.note">{{ item.note }}</p>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

<style src="./workflow-panel.css"></style>
