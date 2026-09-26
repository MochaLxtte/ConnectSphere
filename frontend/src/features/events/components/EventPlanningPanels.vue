<script setup lang="ts">
import { computed } from 'vue';
import AssignmentPanel from './AssignmentPanel.vue';
import ClarificationPanel from './ClarificationPanel.vue';
import LifecyclePanel from './LifecyclePanel.vue';

/** Workflow panels shared by the organiser and coordinator pages for a submitted request. */
const props = defineProps<{
  eventRequestId: string;
  status: string;
  viewerRole: string;
  isOwner?: boolean;
}>();
const emit = defineEmits<{ changed: [] }>();

const shared = computed(() => ({
  eventRequestId: props.eventRequestId, status: props.status,
  viewerRole: props.viewerRole, isOwner: props.isOwner,
}));
</script>

<template>
  <div class="planning-panels">
    <AssignmentPanel v-bind="shared" @changed="emit('changed')" />
    <ClarificationPanel v-bind="shared" @changed="emit('changed')" />
    <LifecyclePanel v-bind="shared" @changed="emit('changed')" />
  </div>
</template>

<style scoped>
.planning-panels { display: grid; gap: 1.5rem; margin-top: 1.5rem; }
</style>
