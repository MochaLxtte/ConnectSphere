<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { assignCoordinator, reassignCoordinator, fetchAssignments, fetchCoordinators, type AssignmentRecord, type CoordinatorOption } from '../api/assignments';
import { formatEventTime } from '../presentation';
import type { WorkflowPanelProps } from './use-workflow-panel';

const props = defineProps<WorkflowPanelProps & {
  currentCoordinatorId: string | null;
  canAssignCoordinator?: boolean;
  canReassignCoordinator?: boolean;
  assignmentVersion?: string | null;
  refreshAssignmentContext?: () => Promise<void>;
}>();
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
const initialContext = computed(() => lead.value && props.canAssignCoordinator === true
  && active.value && props.currentCoordinatorId === null && current.value === null
);
const reassignmentContext = computed(() => lead.value && active.value && props.canReassignCoordinator === true
  && props.currentCoordinatorId !== null && !!props.assignmentVersion
  && current.value?.id === props.assignmentVersion && current.value.coordinatorId === props.currentCoordinatorId
  && assignments.value.filter((item) => item.unassignedAt === null).length === 1);
const canAssign = computed(() => initialContext.value && !loading.value && !loadError.value && !refreshRequired.value);
const canReassign = computed(() => reassignmentContext.value && !loading.value && !loadError.value && !refreshRequired.value);
const mismatchedContext = computed(() => lead.value && active.value && props.canReassignCoordinator === true
  && !loading.value && !loadError.value && !reassignmentContext.value);
const choices = computed(() => coordinators.value.filter((item) => !canReassign.value || item.id !== props.currentCoordinatorId));
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
    if (initialContext.value || reassignmentContext.value) {
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
  const currentVersion = version;
  selected.value = '';
  await refreshContext();
  if (currentVersion !== version) return;
  await load();
  if (!loading.value && !loadError.value && authSession.user?.role === props.viewerRole
    && (!props.canReassignCoordinator || reassignmentContext.value)) refreshRequired.value = false;
}
async function refreshContext() {
  if (props.refreshAssignmentContext) await props.refreshAssignmentContext();
  else emit('changed');
  await nextTick();
}
async function submit() {
  if ((!canAssign.value && !canReassign.value) || busy.value) return;
  const handover = canReassign.value;
  const reason = note.value.trim();
  if (handover && (!reason || reason.length > 2000)) return;
  const coordinator = choices.value.find((item) => item.id === selected.value);
  if (!coordinator) return;
  const previousName = current.value?.coordinatorName;
  const currentVersion = version;
  const controller = new AbortController();
  writeController = controller;
  busy.value = true;
  actionError.value = null;
  savedMessage.value = null;
  try {
    const result = handover
      ? await reassignCoordinator(props.eventRequestId, { coordinatorId: coordinator.id, reason,
        expectedAssignmentVersion: props.assignmentVersion! }, controller.signal)
      : await assignCoordinator(props.eventRequestId, { coordinatorId: coordinator.id, note: reason || null }, controller.signal);
    if (controller.signal.aborted || currentVersion !== version) return;
    selected.value = '';
    note.value = '';
    savedMessage.value = handover ? ('changed' in result && result.changed === false
      ? `${coordinator.displayName} is already the current coordinator. No assignment was changed.`
      : `Reassigned from ${previousName} to ${coordinator.displayName}. Reason: ${reason}`)
      : `${coordinator.displayName} is now the coordinator for this request.`;
    refreshRequired.value = handover;
    await refreshContext();
    if (controller.signal.aborted || currentVersion !== version) return;
    await load();
    if (!controller.signal.aborted && currentVersion === version && !loadError.value
      && (!handover || reassignmentContext.value)) refreshRequired.value = false;
  } catch (error) {
    if (controller.signal.aborted || currentVersion !== version) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    actionError.value = errorMessage(error, 'The assignment could not be saved. Refresh before trying again.');
    if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.code === 'INVALID_RESPONSE') {
      refreshRequired.value = true;
      actionError.value = 'We could not confirm whether the assignment was saved. Refresh the assignment before trying again.';
    }
    if (error instanceof ApiError && [403, 404, 409].includes(error.status)) {
      selected.value = '';
      refreshRequired.value = true;
      await refreshAssignment();
    } else if (error instanceof ApiError && error.code === 'INVALID_COORDINATOR') {
      selected.value = '';
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
    <button v-if="refreshRequired || mismatchedContext" type="button" class="button button-secondary" :disabled="loading || busy" @click="refreshAssignment">Refresh assignment</button>
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

      <p v-if="mismatchedContext" class="panel-error" role="alert">The current assignment has changed or its history is unavailable. Refresh the assignment before reassigning.</p>
      <form v-if="canAssign || canReassign" :aria-busy="busy" @submit.prevent="submit">
        <p v-if="coordinatorsError" class="panel-error" role="alert">{{ coordinatorsError }}</p>
        <p v-else-if="choices.length === 0" role="status">{{ canReassign ? 'No other event coordinators are currently available.' : 'No event coordinators are currently available.' }}</p>
        <button v-if="coordinatorsError || choices.length === 0" type="button" class="button button-secondary" @click="load">Refresh assignment</button>
        <label :for="`${id}-coordinator`">{{ canReassign ? 'Reassign to' : 'Assign to' }}</label>
        <select :id="`${id}-coordinator`" v-model="selected" :disabled="busy">
          <option value="" disabled>Choose a coordinator</option>
          <option v-for="option in choices" :key="option.id" :value="option.id">
            {{ option.displayName }} ({{ option.email }})
          </option>
        </select>
        <label :for="`${id}-note`">{{ canReassign ? 'Reason for reassignment' : 'Note' }} <span v-if="!canReassign" class="optional">(optional)</span></label>
        <textarea :id="`${id}-note`" v-model="note" rows="2" maxlength="2000" :required="canReassign" :disabled="busy" />
        <div class="panel-actions">
          <button type="submit" class="button button-primary" :disabled="busy || !selected || (canReassign && (!note.trim() || note.trim().length > 2000))">
            {{ busy ? 'Saving…' : canReassign ? 'Reassign coordinator' : 'Assign coordinator' }}
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
