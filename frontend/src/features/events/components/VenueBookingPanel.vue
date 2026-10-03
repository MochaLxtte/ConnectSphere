<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import {
  fetchVenueBookings, submitVenueBooking, venueBookingStatusLabel, type VenueBooking,
} from '../../venues/api/venue-bookings';
import { emptyFilters, searchVenues, type VenueResult } from '../../venues/api/venues';
import { formatEventTime, fromSingaporeInputValue } from '../presentation';
import { usePanelAction, usePanelList, type WorkflowPanelProps } from './use-workflow-panel';

/** KAN-53: the coordinator assigned to this event requests a venue; Venue Staff decide separately (KAN-8). */
const props = defineProps<WorkflowPanelProps>();
const emit = defineEmits<{ changed: [] }>();

const id = useId();
const { items: bookings, loading, loadError, load } = usePanelList(() => props.eventRequestId, fetchVenueBookings);
const { busy, actionError, savedMessage, run } = usePanelAction(async () => {
  emit('changed');
  await load();
});

const venues = ref<VenueResult[]>([]);
const venuesError = ref<string | null>(null);
const venueId = ref('');
const startsAt = ref('');
const endsAt = ref('');
const layout = ref('');
const notes = ref('');

const isCoordinator = computed(() => props.viewerRole === 'EVENT_COORDINATOR');
// Mirrors booking-service.ts's TERMINAL_EVENT_STATUSES; eligible event states beyond this are still open (S2-T11/T12).
const canRequest = computed(() => isCoordinator.value
  && !['REJECTED', 'CANCELLED', 'COMPLETED'].includes(props.status));

const timeError = computed(() => {
  if (!startsAt.value && !endsAt.value) return '';
  if (!startsAt.value || !endsAt.value) return 'Enter both a start and an end time.';
  const from = fromSingaporeInputValue(startsAt.value);
  const to = fromSingaporeInputValue(endsAt.value);
  if (!from || !to) return 'Enter a valid date and time.';
  return Date.parse(to) > Date.parse(from) ? '' : 'The end time must be after the start time.';
});

function tagClass(status: VenueBooking['status']): string {
  if (status === 'APPROVED') return 'tag-positive';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'tag-negative';
  return 'tag-waiting';
}

// The active venue catalogue; suitability matching (KAN-52) is a separate, not-yet-built story.
watch(canRequest, async (allowed) => {
  if (!allowed || venues.value.length > 0) return;
  try {
    venues.value = await searchVenues(emptyFilters());
    venuesError.value = null;
  } catch {
    venuesError.value = 'The venue catalogue could not be loaded. Refresh the page to try again.';
  }
}, { immediate: true });

async function submit() {
  if (!canRequest.value || !venueId.value || timeError.value || !startsAt.value || !endsAt.value) return;
  const from = fromSingaporeInputValue(startsAt.value);
  const to = fromSingaporeInputValue(endsAt.value);
  if (!from || !to) return;
  const name = venues.value.find((venue) => venue.id === venueId.value)?.name ?? 'The venue';
  const saved = await run(
    () => submitVenueBooking(props.eventRequestId, {
      venueId: venueId.value, startsAt: from, endsAt: to,
      layout: layout.value.trim() || null, notes: notes.value.trim() || null,
    }),
    `A venue booking request for ${name} was submitted for review.`,
  );
  if (saved) {
    venueId.value = '';
    startsAt.value = '';
    endsAt.value = '';
    layout.value = '';
    notes.value = '';
  }
}
</script>

<template>
  <section class="panel workflow-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">Venue</p>
      <h2 :id="`${id}-title`">Venue booking requests</h2>
      <p class="panel-description">
        {{ isCoordinator
          ? 'Request a venue for this event. Venue Staff review and decide on each request separately.'
          : 'Venue booking requests submitted by the coordinator appear here.' }}
      </p>
    </header>

    <p v-if="savedMessage" class="panel-saved" role="status">{{ savedMessage }}</p>
    <p v-if="actionError" class="panel-error" role="alert">{{ actionError }}</p>

    <p v-if="loading" role="status">Loading venue booking requests…</p>
    <div v-else-if="loadError" role="alert">
      <p class="panel-error">{{ loadError }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <template v-else>
      <p v-if="bookings.length === 0" class="panel-notice">No venue has been requested for this event yet.</p>
      <ul v-else class="panel-list">
        <li v-for="item in bookings" :key="item.id">
          <div class="item-heading">
            <span class="item-label">{{ item.venueName }}</span>
            <span class="tag" :class="tagClass(item.status)">{{ venueBookingStatusLabel(item.status) }}</span>
          </div>
          <p class="panel-meta">{{ formatEventTime(item.startsAt) }} to {{ formatEventTime(item.endsAt) }}</p>
          <p v-if="item.layout">Layout: {{ item.layout }}</p>
          <p v-if="item.notes">Notes: {{ item.notes }}</p>
          <p v-if="item.decisionReason">Decision note: {{ item.decisionReason }}</p>
        </li>
      </ul>

      <form v-if="canRequest" :aria-busy="busy" @submit.prevent="submit">
        <p v-if="venuesError" class="panel-error" role="alert">{{ venuesError }}</p>
        <label :for="`${id}-venue`">Venue</label>
        <select :id="`${id}-venue`" v-model="venueId" :disabled="busy">
          <option value="" disabled>Choose a venue</option>
          <option v-for="venue in venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option>
        </select>

        <div class="field-grid">
          <div>
            <label :for="`${id}-starts`">Starts (Singapore time)</label>
            <input :id="`${id}-starts`" v-model="startsAt" type="datetime-local" :disabled="busy" />
          </div>
          <div>
            <label :for="`${id}-ends`">Ends (Singapore time)</label>
            <input :id="`${id}-ends`" v-model="endsAt" type="datetime-local" :disabled="busy" />
          </div>
        </div>
        <p v-if="timeError" class="panel-error" role="alert">{{ timeError }}</p>

        <label :for="`${id}-layout`">Room layout <span class="optional">(optional)</span></label>
        <input :id="`${id}-layout`" v-model="layout" type="text" maxlength="100" :disabled="busy" />

        <label :for="`${id}-notes`">Notes for Venue Staff <span class="optional">(optional)</span></label>
        <textarea :id="`${id}-notes`" v-model="notes" rows="3" maxlength="2000" :disabled="busy" />

        <div class="panel-actions">
          <button type="submit" class="button button-primary"
            :disabled="busy || !venueId || !!timeError || !startsAt || !endsAt">
            {{ busy ? 'Submitting…' : 'Request this venue' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<style src="./workflow-panel.css"></style>
