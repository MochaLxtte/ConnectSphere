<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import {
  cancelVenueArrangement, fetchVenueBookings, LIVE_ARRANGEMENT_STATUSES, needsRecovery, submitVenueBooking,
  venueBookingStatusLabel, type VenueBooking,
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
// KAN-82-AC4: single arrangements are managed once the event's venue planning is approved.
const canManage = computed(() => isCoordinator.value && !accessDenied.value
  && ['APPROVED', 'CONFIRMED'].includes(props.status));
/** KAN-82: the arrangement whose cancellation is being confirmed, and the reason typed for it. */
const cancelTarget = ref<VenueBooking | null>(null);
const cancelReason = ref('');
/** Set when the list may be out of date (a stale conflict or an unconfirmed result), until it reloads. */
const needsRefresh = ref(false);
let contextVersion = 0;
let listController: AbortController | undefined;
let venuesController: AbortController | undefined;
let submitController: AbortController | undefined;
let cancelController: AbortController | undefined;

function resetForm() {
  venueId.value = ''; startsAt.value = ''; endsAt.value = ''; layout.value = ''; notes.value = '';
  replacesBookingId.value = '';
}

const isLive = (item: VenueBooking) => LIVE_ARRANGEMENT_STATUSES.includes(item.status);
const byId = (bookingId: string | null) => bookings.value.find((item) => item.id === bookingId);
/** KAN-82-AC8: the replacements of a booking that are listed for this event. */
const replacements = (item: VenueBooking) =>
  (item.replacedByBookingIds ?? []).map((replacementId) => byId(replacementId)).filter((found) => !!found);
/** KAN-82-AC6: a coordinator-cancelled arrangement without a live replacement can be replaced again. */
const awaitsReplacement = (item: VenueBooking) => item.status === 'CANCELLED' && item.cancelledBy !== null
  && !replacements(item).some(isLive);

/** KAN-81-AC7 recovery bookings, and KAN-82-AC5 cancelled arrangements awaiting a replacement. */
const replaceable = computed(() => bookings.value.filter((item) =>
  (item.status === 'APPROVED' && needsRecovery(item)) || (canManage.value && awaitsReplacement(item))));

const arrangementLabel = (item: VenueBooking) =>
  `${item.venueName}, ${formatEventTime(item.startsAt)} to ${formatEventTime(item.endsAt)}`;

function abortPending() {
  listController?.abort(); venuesController?.abort(); submitController?.abort(); cancelController?.abort();
}

function loseAccess(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 401) { clearLocalSession(); return true; }
  if (error.status !== 403 && !(error.status === 404 && error.code !== 'VENUE_NOT_FOUND')) return false;
  abortPending();
  accessDenied.value = true;
  bookings.value = []; venues.value = []; resetForm();
  cancelTarget.value = null; cancelReason.value = '';
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
    needsRefresh.value = false;
    // A confirmation must name the arrangement as it is now; drop it if it is gone or no longer live.
    const target = cancelTarget.value && items.find((item) => item.id === cancelTarget.value!.id);
    cancelTarget.value = target && isLive(target) ? target : null;
    // Likewise a replacement source that is gone or no longer replaceable, so no stale link is sent.
    if (replacesBookingId.value && !replaceable.value.some((item) => item.id === replacesBookingId.value)) {
      replacesBookingId.value = '';
    }
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
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED') return 'tag-negative';
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

function startCancel(item: VenueBooking) {
  if (busy.value || needsRefresh.value) return;
  cancelTarget.value = item; cancelReason.value = ''; actionError.value = null; savedMessage.value = null;
}

function stopCancel() {
  if (busy.value) return;
  cancelTarget.value = null; cancelReason.value = '';
}

/** KAN-82-AC5: start a replacement request linked to a cancelled arrangement. */
function startReplacement(item: VenueBooking) {
  if (busy.value) return;
  replacesBookingId.value = item.id;
  savedMessage.value = `Request a replacement for ${arrangementLabel(item)} below. It starts pending until Venue Staff decide.`;
}

/**
 * KAN-82-AC4/AC10/AC12: cancel exactly the confirmed arrangement. Only that row is updated from the
 * response; a stale conflict or an unconfirmed result asks for a refresh instead of guessing.
 */
async function confirmCancel() {
  const target = cancelTarget.value;
  const reason = cancelReason.value.trim();
  // After a conflict or an unconfirmed result, only a refresh may re-enable cancellation.
  if (!target || !reason || busy.value || needsRefresh.value || !canManage.value) return;
  const current = new AbortController();
  cancelController = current;
  const version = contextVersion;
  busy.value = true; actionError.value = null; savedMessage.value = null;
  try {
    const cancelled = await cancelVenueArrangement(target.id, reason, current.signal);
    if (current.signal.aborted || version !== contextVersion) return;
    bookings.value = bookings.value.map((item) => (item.id === cancelled.id ? cancelled : item));
    cancelTarget.value = null; cancelReason.value = '';
    savedMessage.value = `${arrangementLabel(cancelled)} was cancelled and its venue period released. `
      + 'Other arrangements are unchanged. To change it, request a replacement; a replacement is not guaranteed.';
    emit('changed');
  } catch (error) {
    if (current.signal.aborted || version !== contextVersion || loseAccess(error)) return;
    needsRefresh.value = true;
    actionError.value = !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.code === 'INVALID_RESPONSE'
      ? 'We could not confirm whether the arrangement was cancelled. Refresh booking requests to see its current state before trying again.'
      : `${error.message} Refresh booking requests to see the current state.`;
  } finally {
    if (!current.signal.aborted && version === contextVersion) busy.value = false;
  }
}

watch(() => [props.eventRequestId, props.status, props.viewerRole, authSession.loading,
  authSession.user?.id, authSession.user?.role], () => {
  contextVersion++; abortPending(); resetForm();
  cancelTarget.value = null; cancelReason.value = ''; needsRefresh.value = false;
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
          <!-- KAN-82-AC8: cancellation and replacement links are shown both ways, per arrangement. -->
          <p v-if="item.replacesBookingId && byId(item.replacesBookingId)?.status === 'CANCELLED' && !needsRecovery(byId(item.replacesBookingId)!)"
            class="panel-meta">Replaces the cancelled arrangement {{ arrangementLabel(byId(item.replacesBookingId)!) }}.</p>
          <p v-else-if="item.replacesBookingId" class="panel-meta">Replacement for an outage-affected booking.</p>
          <p v-for="replacement in replacements(item)" :key="replacement.id" class="panel-meta">Replaced by {{ arrangementLabel(replacement) }} ({{ venueBookingStatusLabel(replacement.status) }}).</p>
          <!-- KAN-83-AC11: the hold deadline, its expiry and any cancellation are visible to the coordinator. -->
          <p v-if="item.status === 'HELD'" class="hold-note">Held until {{ formatEventTime(item.holdExpiresAt) }} (Singapore time). Venue staff must approve it before then, or it is released. The deadline is confirmed by the server, not this page.</p>
          <p v-else-if="item.status === 'EXPIRED'" class="hold-note">The hold expired at {{ formatEventTime(item.holdExpiresAt) }} and the venue period was released. Submit a new request to try again.</p>
          <p v-if="item.cancellationReason">Cancellation reason: {{ item.cancellationReason }}</p>
          <p v-if="awaitsReplacement(item) && canManage" class="panel-meta">Cancelled; not replaced. This arrangement no longer reserves the venue.</p>

          <div v-if="canManage && cancelTarget?.id !== item.id" class="panel-actions">
            <button v-if="isLive(item)" type="button" class="button button-secondary"
              :disabled="busy || loading || needsRefresh" @click="startCancel(item)">Cancel arrangement</button>
            <button v-if="awaitsReplacement(item)" type="button" class="button button-secondary"
              :disabled="busy || loading || replacesBookingId === item.id" @click="startReplacement(item)">Request replacement</button>
          </div>

          <!-- KAN-82-AC4/AC12: confirm the exact event, venue and period before cancelling. -->
          <form v-if="canManage && cancelTarget?.id === item.id" class="cancel-confirm" :aria-busy="busy"
            :aria-label="`Cancel ${item.venueName}`" @submit.prevent="confirmCancel">
            <p><strong>Cancel {{ venueBookingStatusLabel(item.status).toLowerCase() }} arrangement:</strong>
              {{ item.eventName ?? 'Untitled event' }} at {{ arrangementLabel(item) }}.</p>
            <p class="panel-hint">Cancelling releases this venue period straight away. Other arrangements stay as they are. To change it, request a replacement afterwards; it needs a new Venue Staff decision and is not guaranteed.</p>
            <label :for="`${id}-cancel-reason`">Reason for cancelling</label>
            <textarea :id="`${id}-cancel-reason`" v-model="cancelReason" rows="2" maxlength="2000" :disabled="busy" />
            <div class="panel-actions">
              <button type="submit" class="button button-primary" :disabled="busy || needsRefresh || !cancelReason.trim()">
                {{ busy ? 'Cancelling…' : 'Confirm cancellation' }}
              </button>
              <button type="button" class="button button-secondary" :disabled="busy" @click="stopCancel">Keep arrangement</button>
            </div>
          </form>
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
              {{ item.venueName }}, {{ formatEventTime(item.startsAt) }} to {{ formatEventTime(item.endsAt) }}{{ item.status === 'CANCELLED' ? ' (cancelled)' : '' }}
            </option>
          </select>
          <p v-if="byId(replacesBookingId)?.status === 'CANCELLED'" class="panel-hint">The cancelled arrangement stays cancelled. This new request must fit the expected attendance and the venue's opening hours, and starts pending until Venue Staff decide.</p>
          <p v-else class="panel-hint">A replacement must fit the expected attendance and the venue's opening hours. Once Venue Staff approve it, the affected booking is cancelled and its recovery is resolved.</p>
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
.hold-note { color: #7a5212; }
.cancel-confirm { border-left: 3px solid #853e37; padding-left: 0.75rem; margin-top: 0.5rem; }
</style>
