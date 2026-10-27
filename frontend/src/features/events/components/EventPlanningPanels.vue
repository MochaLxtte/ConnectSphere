<script setup lang="ts">
import { computed } from 'vue';
import AssignmentPanel from './AssignmentPanel.vue';
import ChangeRequestPanel from './ChangeRequestPanel.vue';
import ClarificationPanel from './ClarificationPanel.vue';
import StatusHistoryPanel from './StatusHistoryPanel.vue';
import VenueBookingPanel from './VenueBookingPanel.vue';

/** Workflow panels shared by the organiser and coordinator pages for a submitted request. */
const props = defineProps<{
  eventRequestId: string;
  currentCoordinatorId: string | null;
  status: string;
  viewerRole: string;
  isOwner?: boolean;
  /** KAN-66: the displayed revision, so reviewer actions on stale details are refused. */
  revision?: number;
}>();
const emit = defineEmits<{ changed: [] }>();

const shared = computed(() => ({
  eventRequestId: props.eventRequestId, status: props.status,
  viewerRole: props.viewerRole, isOwner: props.isOwner,
}));
</script>

<template>
  <div class="planning-panels">
    <AssignmentPanel v-bind="shared" :current-coordinator-id="currentCoordinatorId" @changed="emit('changed')" />
    <ClarificationPanel v-bind="shared" :revision="revision" @changed="emit('changed')" />
    <!-- KAN-15: significant changes once approved; history stays visible after cancellation or completion. -->
    <ChangeRequestPanel v-if="['APPROVED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)" v-bind="shared" :revision="revision" @changed="emit('changed')" />
    <VenueBookingPanel v-if="viewerRole === 'EVENT_COORDINATOR'" v-bind="shared" @changed="emit('changed')" />
    <StatusHistoryPanel :event-request-id="eventRequestId" :status="status" />
  </div>
</template>

<style scoped>
.planning-panels { display: grid; gap: 1.5rem; margin-top: 1.5rem; }
</style>
