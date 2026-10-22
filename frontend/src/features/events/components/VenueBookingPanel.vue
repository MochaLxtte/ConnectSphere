<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import {
  fetchVenueBookings, needsRecovery, submitVenueBooking, venueBookingStatusLabel, type VenueBooking,
} from '../../venues/api/venue-bookings';
import { emptyFilters, searchVenues, type VenueResult } from '../../venues/api/venues';
import { formatEventTime, fromSingaporeInputValue } from '../presentation';
import type { WorkflowPanelProps } from './use-workflow-panel';

/** KAN-53: the coordinator assigned to this event requests a venue; Venue Staff decide separately (KAN-8). */
const props = defineProps<WorkflowPanelProps>();
const emit = defineEmits<{ changed: [] }>();

const id = useId();
const bookings = ref<VenueBooking[]>([]);
const loading = ref(false);
const loadError = ref<string | null>(null);
const busy = ref(false);
const actionError = ref<string | null>(null);
const savedMessage = ref<string | null>(null);
const uncertainSave = ref(false);
const accessDenied = ref(false);
const venues = ref<VenueResult[]>([]);
const venuesLoading = ref(false);
const venuesError = ref<string | null>(null);
const venueId = ref('');
const startsAt = ref('');
const endsAt = ref('');
const layout = ref('');
const notes = ref('');
const replacesBookingId = ref('');

const isCoordinator = computed(() => !authSession.loading && authSession.user?.role === 'EVENT_COORDINATOR'
  && props.viewerRole === 'EVENT_COORDINATOR' && !!props.eventRequestId && props.status !== 'DRAFT');
// Mirrors booking-service.ts's TERMINAL_EVENT_STATUSES; eligible event states beyond this are still open (S2-T11/T12).
const canRequest = computed(() => isCoordinator.value && !accessDenied.value
  && !['REJECTED', 'CANCELLED', 'COMPLETED'].includes(props.status));
let contextVersion = 0;
let listController: AbortController | undefined;
let venuesController: AbortController | undefined;
let submitController: AbortController | undefined;

function resetForm() {
  venueId.value = ''; startsAt.value = ''; endsAt.value = ''; layout.value = ''; notes.value = '';
  replacesBookingId.value = '';
}

/** KAN-81-AC7: approved bookings of this event that still need a replacement venue. */
const replaceable = computed(() => bookings.value.filter((item) => item.status === 'APPROVED' && needsRecovery(item)));

function abortPending() {
  listController?.abort(); venuesController?.abort(); submitController?.abort();
}

function loseAccess(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 401) { clearLocalSession(); return true; }
  if (error.status !== 403 && !(error.status === 404 && error.code !== 'VENUE_NOT_FOUND')) return false;
  abortPending();
  accessDenied.value = true;
  bookings.value = []; venues.value = []; resetForm();
  loading.value = false; busy.value = false; venuesLoading.value = false;
  savedMessage.value = null; actionError.value = null;
  loadError.value = 'This event request is unavailable or you no longer have access to its venue bookings.';
  return true;
}

async function load() {
  if (!isCoordinator.value || accessDenied.value) return;
  listController?.abort();
  const current = new AbortController();
  listController = current;
  loading.value = true; bookings.value = []; loadError.value = null;
  try {
    const items = await fetchVenueBookings(props.eventRequestId, current.signal);
    if (current.signal.aborted) return;
    bookings.value = items;
    if (uncertainSave.value) {
      uncertainSave.value = false; actionError.value = null; resetForm();
    }
  } catch (error) {
    if (current.signal.aborted || loseAccess(error)) return;
    loadError.value = error instanceof Error ? error.message : 'Venue booking requests could not be loaded. Please try again.';
  } finally {
    if (!current.signal.aborted) loading.value = false;
  }
}

// KAN-52 suitability is separate. This picker shows the active catalogue, not a guaranteed match.
async function loadVenues() {
  if (!canRequest.value) return;
  venuesController?.abort();
  const current = new AbortController();
  venuesController = current;
  venuesLoading.value = true; venuesError.value = null; venues.value = []; venueId.value = '';
  try {
    const items = await searchVenues(emptyFilters(), current.signal);
    if (!current.signal.aborted) venues.value = items;
  } catch (error) {
    if (current.signal.aborted || loseAccess(error)) return;
    venuesError.value = 'The venue catalogue could not be loaded. Try again.';
  } finally {
    if (!current.signal.aborted) venuesLoading.value = false;
  }
}

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

async function submit() {
  if (!canRequest.value || busy.value || loading.value || uncertainSave.value || !venueId.value
    || !venues.value.some(venue => venue.id === venueId.value) || timeError.value || !startsAt.value || !endsAt.value) return;
  const from = fromSingaporeInputValue(startsAt.value);
  const to = fromSingaporeInputValue(endsAt.value);
  if (!from || !to) return;
  const name = venues.value.find((venue) => venue.id === venueId.value)?.name ?? 'The venue';
  const current = new AbortController();
  submitController = current;
  const version = contextVersion;
  busy.value = true; actionError.value = null; savedMessage.value = null;
  try {
    await submitVenueBooking(props.eventRequestId, {
      venueId: venueId.value, startsAt: from, endsAt: to,
      layout: layout.value.trim() || null, notes: notes.value.trim() || null,
      ...(replacesBookingId.value ? { replacesBookingId: replacesBookingId.value } : {}),
    }, current.signal);
    if (current.signal.aborted || version !== contextVersion) return;
    resetForm();
    savedMessage.value = `A venue booking request for ${name} was submitted for review.`;
    emit('changed');
    if (!current.signal.aborted && version === contextVersion) await load();
  } catch (error) {
    if (current.signal.aborted || version !== contextVersion || loseAccess(error)) return;
    if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.code === 'INVALID_RESPONSE') {
      uncertainSave.value = true;
      actionError.value = 'We could not confirm whether the booking request was saved. Refresh booking requests and check the list before submitting again.';
    } else {
      actionError.value = error.message;
      // KAN-81-AC12: the original was resolved or its outage removed meanwhile; show current state.
      if (error.code === 'REPLACEMENT_NOT_NEEDED') { replacesBookingId.value = ''; void load(); }
    }
  } finally {
    if (!current.signal.aborted && version === contextVersion) busy.value = false;
  }
}

watch(() => [props.eventRequestId, props.status, props.viewerRole, authSession.loading,
  authSession.user?.id, authSession.user?.role], () => {
  contextVersion++; abortPending(); resetForm();
  bookings.value = []; venues.value = []; loading.value = false; busy.value = false; venuesLoading.value = false;
  accessDenied.value = false; uncertainSave.value = false;
  loadError.value = null; venuesError.value = null; actionError.value = null; savedMessage.value = null;
  if (isCoordinator.value) { void load(); void loadVenues(); }
}, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => { contextVersion++; abortPending(); });
</script>

<template>
  <section v-if="isCoordinator" class="panel workflow-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">Venue</p>
      <h2 :id="`${id}-title`">Venue booking requests</h2>
      <p class="panel-description">
        Request a venue for this event. Venue Staff review and decide on each request separately.
      </p>
    </header>

    <p v-if="savedMessage" class="panel-saved" role="status">{{ savedMessage }}</p>
    <p v-if="actionError" class="panel-error" role="alert">{{ actionError }}</p>
    <div v-if="!accessDenied" class="panel-actions">
      <button type="button" class="button button-secondary" :disabled="busy || loading" @click="load">Refresh booking requests</button>
    </div>

    <p v-if="loading" role="status">Loading venue booking requests…</p>
    <div v-else-if="loadError" role="alert">
      <p class="panel-error">{{ loadError }}</p>
      <button v-if="!accessDenied" type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <template v-else>
      <p v-if="bookings.length === 0" class="panel-notice">No venue has been requested for this event yet.</p>
      <ul v-else class="panel-list">
        <li v-for="item in bookings" :key="item.id">
          <div class="item-heading">
            <span class="item-label">{{ item.venueName }}</span>
            <span class="tag" :class="tagClass(item.status)">{{ venueBookingStatusLabel(item.status) }}</span>
            <span v-if="needsRecovery(item)" class="tag tag-recovery">Recovery required</span>
          </div>
          <p v-if="needsRecovery(item)" class="panel-error">The venue is unavailable for part of this booking. Open it from Venue bookings to see the outage and arrange a replacement venue.</p>
          <p class="panel-meta">{{ formatEventTime(item.startsAt) }} to {{ formatEventTime(item.endsAt) }}</p>
          <p v-if="item.layout">Layout: {{ item.layout }}</p>
          <p v-if="item.notes">Notes: {{ item.notes }}</p>
          <p v-if="item.occupiedStartsAt && item.occupiedEndsAt">Occupied (including setup/turnaround): {{ formatEventTime(item.occupiedStartsAt) }} to {{ formatEventTime(item.occupiedEndsAt) }}</p>
          <p v-if="item.warnings?.length" role="status">Warning: {{ item.warnings.join(', ') }}</p>
          <p v-if="item.decisionReason">Decision note: {{ item.decisionReason }}</p>
          <p v-if="item.replacesBookingId" class="panel-meta">Replacement for an outage-affected booking.</p>
        </li>
      </ul>

      <form v-if="canRequest" :aria-busy="busy" @submit.prevent="submit">
        <p class="panel-hint">Choose the booking period in Singapore time. Suitability checks use the event's timing; assess any different booking period separately. Submitting leaves the request pending and does not reserve the venue.</p>
        <p v-if="venuesLoading" role="status">Loading venues…</p>
        <div v-else-if="venuesError" role="alert">
          <p class="panel-error">{{ venuesError }}</p>
          <button type="button" class="button button-secondary" :disabled="busy" @click="loadVenues">Retry venue catalogue</button>
        </div>
        <p v-else-if="!venues.length" class="panel-notice">No active venues are available. Refresh the catalogue after a venue is added.</p>
        <button v-if="!venuesError" type="button" class="button button-secondary" :disabled="busy || venuesLoading" @click="loadVenues">Refresh venue catalogue</button>
        <label :for="`${id}-venue`">Venue</label>
        <select :id="`${id}-venue`" v-model="venueId" :disabled="busy || venuesLoading">
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

        <template v-if="replaceable.length > 0">
          <label :for="`${id}-replaces`">This request replaces <span class="optional">(optional)</span></label>
          <select :id="`${id}-replaces`" v-model="replacesBookingId" :disabled="busy">
            <option value="">Not a replacement</option>
            <option v-for="item in replaceable" :key="item.id" :value="item.id">
              {{ item.venueName }}, {{ formatEventTime(item.startsAt) }} to {{ formatEventTime(item.endsAt) }}
            </option>
          </select>
          <p class="panel-hint">A replacement must fit the expected attendance and the venue's opening hours. Once Venue Staff approve it, the affected booking is cancelled and its recovery is resolved.</p>
        </template>

        <div class="panel-actions">
          <button type="submit" class="button button-primary"
            :disabled="busy || uncertainSave || !venueId || !!timeError || !startsAt || !endsAt">
            {{ busy ? 'Submitting…' : 'Request this venue' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<style src="./workflow-panel.css"></style>
<style scoped>
.tag-recovery { background: #fbeee6; color: #853e37; }
</style>
