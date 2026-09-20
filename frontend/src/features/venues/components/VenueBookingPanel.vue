<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, useId, watch } from 'vue';
import '../venues.css';
import {
  cancelVenueBooking, fetchEventVenueBookings, requestVenueBooking, type VenueBooking, type VenueBookingRequest,
} from '../api/venue-bookings';
import { fetchVenues, fetchVenueSuitability, type Suitability, type SuitabilityCheck, type Venue } from '../api/venues';
import {
  bookingStatusLabel, describeActionFailure, describeLoadFailure, formatDateTime, formatInterval,
  singaporeInputToIso, type LoadFailure,
} from '../presentation';

const props = defineProps<{
  eventRequestId: string;
  /** The event request's status; venues can be requested once it is APPROVED or CONFIRMED. */
  status: string;
  viewerRole: string;
  isOwner?: boolean;
}>();
const emit = defineEmits<{ changed: [] }>();

type ListState =
  | { status: 'loading' }
  | ({ status: 'error' } & LoadFailure)
  | { status: 'ready'; bookings: VenueBooking[] };
type SuitabilityState =
  | { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }
  | { status: 'ready'; result: Suitability };

const id = useId();
// The owning organiser or a coordinator may arrange venues; the API rechecks ownership and assignment.
const canArrange = computed(() => props.viewerRole === 'EVENT_COORDINATOR'
  || (props.viewerRole === 'EVENT_ORGANISER' && props.isOwner !== false));
const canRequest = computed(() => canArrange.value && (props.status === 'APPROVED' || props.status === 'CONFIRMED'));

const list = ref<ListState>({ status: 'loading' });
const venues = ref<Venue[] | null>(null);
const venuesError = ref('');
const formOpen = ref(false);
const form = reactive({ venueId: '', layout: '', notes: '', customPeriod: false, startsAt: '', endsAt: '' });
const suitability = ref<SuitabilityState>({ status: 'idle' });
const formError = ref('');
const saving = ref(false);
const notice = ref('');
const warnings = ref<SuitabilityCheck[]>([]);
const confirmingCancel = ref<string | null>(null);
const cancelError = ref('');
const selectedVenue = computed(() => venues.value?.find((venue) => venue.id === form.venueId) ?? null);
let listController: AbortController | undefined;
let suitabilityController: AbortController | undefined;

async function load() {
  listController?.abort();
  if (!canArrange.value) return;
  const current = new AbortController();
  listController = current;
  list.value = { status: 'loading' };
  try {
    const bookings = await fetchEventVenueBookings(props.eventRequestId, current.signal);
    if (!current.signal.aborted) list.value = { status: 'ready', bookings };
  } catch (error) {
    if (!current.signal.aborted) list.value = { status: 'error', ...describeLoadFailure(error, 'venue bookings') };
  }
}

async function openForm() {
  formOpen.value = true;
  formError.value = '';
  if (venues.value) return;
  venuesError.value = '';
  try {
    venues.value = await fetchVenues();
  } catch (error) {
    venuesError.value = describeActionFailure(error, 'Venues could not be loaded. Please try again.');
  }
}

function closeForm() {
  formOpen.value = false;
  suitabilityController?.abort();
  Object.assign(form, { venueId: '', layout: '', notes: '', customPeriod: false, startsAt: '', endsAt: '' });
  suitability.value = { status: 'idle' };
  formError.value = '';
}

watch(() => form.venueId, async (venueId) => {
  suitabilityController?.abort();
  form.layout = '';
  if (!venueId) { suitability.value = { status: 'idle' }; return; }
  const current = new AbortController();
  suitabilityController = current;
  suitability.value = { status: 'loading' };
  try {
    const result = await fetchVenueSuitability(venueId, props.eventRequestId, current.signal);
    if (!current.signal.aborted) suitability.value = { status: 'ready', result };
  } catch (error) {
    if (!current.signal.aborted) {
      suitability.value = { status: 'error', message: describeActionFailure(error, 'Suitability could not be checked. You can still send the request.') };
    }
  }
});

async function submit() {
  formError.value = '';
  if (!form.venueId) { formError.value = 'Choose a venue.'; return; }
  const input: VenueBookingRequest = {
    eventRequestId: props.eventRequestId, venueId: form.venueId,
    layout: form.layout || null, notes: form.notes.trim() || null,
  };
  if (form.customPeriod) {
    const startsAt = singaporeInputToIso(form.startsAt);
    const endsAt = singaporeInputToIso(form.endsAt);
    if (!startsAt || !endsAt) { formError.value = 'Enter when the booking starts and ends.'; return; }
    if (endsAt <= startsAt) { formError.value = 'The booking end must be later than the start.'; return; }
    Object.assign(input, { startsAt, endsAt });
  }
  saving.value = true;
  try {
    const saved = await requestVenueBooking(input);
    warnings.value = saved.warnings;
    notice.value = `Your request for ${saved.venueName} was sent to venue staff.`;
    closeForm();
    emit('changed');
    await load();
  } catch (error) {
    formError.value = describeActionFailure(error, 'The booking request could not be sent. Please try again.');
  } finally {
    saving.value = false;
  }
}

async function cancel(booking: VenueBooking) {
  cancelError.value = '';
  saving.value = true;
  try {
    await cancelVenueBooking(booking.id);
    confirmingCancel.value = null;
    warnings.value = [];
    notice.value = `The ${booking.venueName} booking was cancelled.`;
    emit('changed');
    await load();
  } catch (error) {
    cancelError.value = describeActionFailure(error, 'The booking could not be cancelled. Please try again.');
  } finally {
    saving.value = false;
  }
}

watch(() => [props.eventRequestId, canArrange.value], () => {
  notice.value = '';
  warnings.value = [];
  closeForm();
  void load();
}, { immediate: true });
onBeforeUnmount(() => { listController?.abort(); suitabilityController?.abort(); });
</script>

<template>
  <section v-if="canArrange" class="panel venues-panel venues-ui" :aria-labelledby="`${id}-title`">
    <div class="venues-heading-row venues-spread">
      <h2 :id="`${id}-title`">Venue bookings</h2>
      <button v-if="canRequest && !formOpen" type="button" class="button button-primary" @click="openForm">Request a venue</button>
    </div>
    <p v-if="!canRequest" class="venues-muted">Venues can be requested once the event request is approved.</p>

    <div v-if="notice" class="venues-notice venues-notice--ok venues-gap" role="status">
      <p>{{ notice }}</p>
      <template v-if="warnings.length">
        <p>Venue staff will also see these suitability warnings:</p>
        <ul><li v-for="check in warnings" :key="check.code">{{ check.message }}</li></ul>
      </template>
    </div>

    <form v-if="formOpen" class="venues-form venues-gap" :aria-busy="saving" @submit.prevent="submit">
      <p v-if="venuesError" class="venues-error" role="alert">{{ venuesError }}</p>
      <p v-else-if="!venues" role="status">Loading venues…</p>
      <template v-else>
        <div class="venues-form-grid">
          <div class="venues-field">
            <label :for="`${id}-venue`">Venue</label>
            <select :id="`${id}-venue`" v-model="form.venueId" required>
              <option value="">Choose a venue</option>
              <option v-for="venue in venues" :key="venue.id" :value="venue.id">{{ venue.name }} (capacity {{ venue.capacity }})</option>
            </select>
          </div>
          <div v-if="selectedVenue?.layouts.length" class="venues-field">
            <label :for="`${id}-layout`">Layout (optional)</label>
            <select :id="`${id}-layout`" v-model="form.layout">
              <option value="">No preference</option>
              <option v-for="layout in selectedVenue.layouts" :key="layout" :value="layout">{{ layout }}</option>
            </select>
          </div>
        </div>

        <div aria-live="polite">
          <p v-if="suitability.status === 'loading'" class="venues-muted">Checking suitability…</p>
          <p v-else-if="suitability.status === 'error'" class="venues-error">{{ suitability.message }}</p>
          <div v-else-if="suitability.status === 'ready'" class="venues-notice" :class="{ 'venues-notice--ok': suitability.result.suitable }">
            <strong>{{ suitability.result.suitable ? 'This venue suits the event' : 'This venue may not suit the event' }}</strong>
            <p v-if="!suitability.result.suitable">You can still send the request; venue staff will see these warnings.</p>
            <ul class="venues-checks">
              <li v-for="check in suitability.result.checks" :key="check.code">
                <span class="venues-badge" :class="check.passed ? 'venues-badge--ok' : 'venues-badge--warn'">{{ check.passed ? 'OK' : 'Check' }}</span>
                <span>{{ check.message }}</span>
              </li>
            </ul>
          </div>
        </div>

        <label class="venues-check"><input v-model="form.customPeriod" type="checkbox" /> Book a different period from the event times (for example, setup time)</label>
        <div v-if="form.customPeriod" class="venues-form-grid">
          <div class="venues-field">
            <label :for="`${id}-start`">Booking starts</label>
            <input :id="`${id}-start`" v-model="form.startsAt" type="datetime-local" />
          </div>
          <div class="venues-field">
            <label :for="`${id}-end`">Booking ends</label>
            <input :id="`${id}-end`" v-model="form.endsAt" type="datetime-local" />
            <p class="venues-hint">Singapore time.</p>
          </div>
        </div>

        <div class="venues-field">
          <label :for="`${id}-notes`">Notes for venue staff (optional)</label>
          <textarea :id="`${id}-notes`" v-model="form.notes" rows="2" maxlength="2000" />
        </div>
      </template>

      <p v-if="formError" class="venues-error" role="alert">{{ formError }}</p>
      <div class="venues-form-actions">
        <button v-if="venues" type="submit" class="button button-primary" :disabled="saving">{{ saving ? 'Sending…' : 'Send booking request' }}</button>
        <button type="button" class="button button-secondary" :disabled="saving" @click="closeForm">Close</button>
      </div>
    </form>

    <p class="venues-gap" v-if="list.status === 'loading'" role="status">Loading venue bookings…</p>
    <div v-else-if="list.status === 'error'" class="venues-state venues-gap" role="alert">
      <p>{{ list.message }}</p>
      <RouterLink v-if="list.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else-if="list.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <p v-else-if="list.bookings.length === 0" class="venues-muted venues-gap">No venue has been requested for this event yet.</p>
    <ul v-else class="venues-booking-list">
      <li v-for="booking in list.bookings" :key="booking.id" class="venues-booking">
        <div class="venues-heading-row">
          <h3><RouterLink :to="`/venues/${booking.venueId}`" class="venues-link">{{ booking.venueName }}</RouterLink></h3>
          <span class="venues-badge" :class="`venues-badge--${booking.status.toLowerCase()}`">{{ bookingStatusLabel(booking.status) }}</span>
        </div>
        <p>{{ formatInterval(booking.startsAt, booking.endsAt) }}<template v-if="booking.layout"> · {{ booking.layout }} layout</template></p>
        <p v-if="booking.decisionReason" class="venues-muted">Reason: {{ booking.decisionReason }}</p>
        <p v-if="booking.decidedAt" class="venues-muted">Decided {{ formatDateTime(booking.decidedAt) }}</p>
        <div v-if="booking.status === 'PENDING' || booking.status === 'APPROVED'" class="venues-form-actions">
          <template v-if="confirmingCancel === booking.id">
            <span>Cancel this booking?</span>
            <button type="button" class="button button-danger" :disabled="saving" @click="cancel(booking)">{{ saving ? 'Cancelling…' : 'Yes, cancel booking' }}</button>
            <button type="button" class="button button-secondary" :disabled="saving" @click="confirmingCancel = null">Keep booking</button>
          </template>
          <button v-else type="button" class="button button-danger-quiet" :aria-label="`Cancel the ${booking.venueName} booking`" @click="confirmingCancel = booking.id; cancelError = ''">Cancel booking</button>
        </div>
        <p v-if="cancelError && confirmingCancel === booking.id" class="venues-error" role="alert">{{ cancelError }}</p>
      </li>
    </ul>
  </section>
</template>
