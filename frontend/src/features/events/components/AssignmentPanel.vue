<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import {
  assignCoordinator, fetchAssignments, fetchCoordinators, type CoordinatorOption,
} from '../api/assignments';
import { formatEventTime } from '../presentation';
import { usePanelAction, usePanelList, type WorkflowPanelProps } from './use-workflow-panel';

const props = defineProps<WorkflowPanelProps & { currentCoordinatorId: string | null }>();
const emit = defineEmits<{ changed: [] }>();

const id = useId();
const { items: assignments, loading, loadError, load } = usePanelList(() => props.eventRequestId, fetchAssignments);
const { busy, actionError, savedMessage, run } = usePanelAction(async () => {
  emit('changed');
  await load();
});

const coordinators = ref<CoordinatorOption[]>([]);
const coordinatorsError = ref<string | null>(null);
const selected = ref('');
const note = ref('');

const current = computed(() => assignments.value.find((item) => item.unassignedAt === null) ?? null);
const canAssign = computed(() => props.viewerRole === 'EVENT_COORDINATOR'
  && ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED'].includes(props.status)
  && props.currentCoordinatorId === null && current.value === null && !loading.value && !loadError.value);

watch(canAssign, async (allowed) => {
  if (!allowed || coordinators.value.length > 0) return;
  try {
    coordinators.value = await fetchCoordinators();
    coordinatorsError.value = null;
  } catch {
    coordinatorsError.value = 'The list of coordinators could not be loaded. Refresh the page to try again.';
  }
}, { immediate: true });

async function submit() {
  if (!canAssign.value || !selected.value) return;
  const name = coordinators.value.find((item) => item.id === selected.value)?.displayName ?? 'The coordinator';
  const saved = await run(
    () => assignCoordinator(props.eventRequestId, { coordinatorId: selected.value, note: note.value.trim() || null }),
    `${name} is now the coordinator for this request.`,
  );
  if (saved) {
    selected.value = '';
    note.value = '';
  }
}
</script>

<template>
  <section class="panel workflow-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">Coordinator</p>
      <h2 :id="`${id}-title`">Assignment</h2>
    </header>

    <p v-if="savedMessage" class="panel-saved" role="status">{{ savedMessage }}</p>
    <p v-if="loading" role="status">Loading the assignment…</p>
    <div v-else-if="loadError && savedMessage" />
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
        <label :for="`${id}-coordinator`">Assign to</label>
        <select :id="`${id}-coordinator`" v-model="selected" :disabled="busy">
          <option value="" disabled>Choose a coordinator</option>
          <option v-for="option in coordinators" :key="option.id" :value="option.id">
            {{ option.displayName }} ({{ option.email }})
          </option>
        </select>
        <label :for="`${id}-note`">Note <span class="optional">(optional)</span></label>
        <textarea :id="`${id}-note`" v-model="note" rows="2" maxlength="2000" :disabled="busy" />
        <p v-if="actionError" class="panel-error" role="alert">{{ actionError }}</p>
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
