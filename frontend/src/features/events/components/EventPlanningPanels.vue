<script setup lang="ts">
import { computed } from 'vue';
import AssignmentPanel from './AssignmentPanel.vue';
import ClarificationPanel from './ClarificationPanel.vue';
import StatusHistoryPanel from './StatusHistoryPanel.vue';
import VenueBookingPanel from './VenueBookingPanel.vue';
import EquipmentRequestPanel from './EquipmentRequestPanel.vue';
import EventCancellationPanel from './EventCancellationPanel.vue';

/** Workflow panels shared by the organiser and coordinator pages for a submitted request. */
const props = defineProps<{
  eventRequestId: string;
  currentCoordinatorId: string | null;
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
    <AssignmentPanel v-bind="shared" :current-coordinator-id="currentCoordinatorId" @changed="emit('changed')" />
    <ClarificationPanel v-bind="shared" @changed="emit('changed')" />
    <VenueBookingPanel v-if="viewerRole === 'EVENT_COORDINATOR'" v-bind="shared" @changed="emit('changed')" />
    <EquipmentRequestPanel v-if="viewerRole === 'EVENT_COORDINATOR'" v-bind="shared" @changed="emit('changed')" />
    <StatusHistoryPanel :event-request-id="eventRequestId" :status="status" />
    <EventCancellationPanel :event-request-id="eventRequestId" :status="status" @changed="emit('changed')" />
  </div>
</template>

<style scoped>
.planning-panels { display: grid; gap: 1.5rem; margin-top: 1.5rem; }
</style>
