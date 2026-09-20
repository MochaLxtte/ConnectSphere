<script setup lang="ts">
import { computed } from 'vue';
import AssignmentPanel from './AssignmentPanel.vue';
import ClarificationPanel from './ClarificationPanel.vue';
import ChangeRequestPanel from './ChangeRequestPanel.vue';
import LifecyclePanel from './LifecyclePanel.vue';
import VenueBookingPanel from '../../venues/components/VenueBookingPanel.vue';
import EquipmentRequestPanel from '../../equipment/components/EquipmentRequestPanel.vue';
import AttendeeListPanel from '../../registrations/components/AttendeeListPanel.vue';

/** Workflow panels shared by the organiser and coordinator pages for a submitted request. */
const props = defineProps<{
  eventRequestId: string;
  status: string;
  viewerRole: string;
  isOwner?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}>();
const emit = defineEmits<{ changed: [] }>();

// Venue, equipment, change and attendee arrangements only exist once a request is approved.
const arrangeable = computed(() => ['APPROVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(props.status));
const shared = computed(() => ({
  eventRequestId: props.eventRequestId, status: props.status,
  viewerRole: props.viewerRole, isOwner: props.isOwner,
}));
</script>

<template>
  <div class="planning-panels">
    <AssignmentPanel v-bind="shared" @changed="emit('changed')" />
    <ClarificationPanel v-bind="shared" @changed="emit('changed')" />
    <template v-if="arrangeable">
      <VenueBookingPanel v-bind="shared" @changed="emit('changed')" />
      <EquipmentRequestPanel v-bind="shared" :starts-at="startsAt" :ends-at="endsAt" @changed="emit('changed')" />
      <ChangeRequestPanel v-bind="shared" @changed="emit('changed')" />
      <AttendeeListPanel v-bind="shared" />
    </template>
    <LifecyclePanel v-bind="shared" @changed="emit('changed')" />
  </div>
</template>

<style scoped>
.planning-panels { display: grid; gap: 1.5rem; margin-top: 1.5rem; }
</style>
