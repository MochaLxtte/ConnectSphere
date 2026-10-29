<script setup lang="ts">
import { computed } from 'vue';
import AssignmentPanel from './AssignmentPanel.vue';
import ChangeRequestPanel from './ChangeRequestPanel.vue';
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
    <!-- O-1 (28 October): an approved change request cancels pending bookings and advances the revision, so
         reload the booking list when the revision moves, as the equipment panel does. -->
    <VenueBookingPanel v-if="viewerRole === 'EVENT_COORDINATOR'" :key="`venue-${revision ?? 0}`" v-bind="shared" @changed="emit('changed')" />
    <EquipmentRequestPanel v-if="viewerRole === 'EVENT_COORDINATOR'" v-bind="shared" :revision="revision" @changed="emit('changed')" />
    <StatusHistoryPanel :event-request-id="eventRequestId" :status="status" />
    <EventCancellationPanel :event-request-id="eventRequestId" :status="status" :revision="revision" @changed="emit('changed')" />
  </div>
</template>

<style scoped>
.planning-panels { display: grid; gap: 1.5rem; margin-top: 1.5rem; }
</style>
