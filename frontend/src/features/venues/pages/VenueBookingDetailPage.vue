<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { eventStatusLabel, formatEventTime } from '../../events/presentation';
import { singaporeDateKey } from '../availability';
import {
  decideVenueBooking, fetchVenueBooking, needsRecovery, recoveryStatusLabel, venueBookingStatusLabel,
  type VenueBooking, type VenueBookingDecision,
} from '../api/venue-bookings';

type State = { status: 'idle' | 'loading' }
  | { status: 'ready'; booking: VenueBooking }
  | { status: 'error'; message: string; retryable: boolean };

const route = useRoute();
// A synchronous route watcher can run before this page unmounts. Other pages may
// also have an `id` parameter, so only read it while the booking-detail route matches.
const bookingId = computed(() => route.matched.some((record) => record.path === '/venue-bookings/:id')
  && typeof route.params.id === 'string' ? route.params.id : '');
const staff = computed(() => authSession.user?.role === 'VENUE_STAFF');
const allowed = computed(() => staff.value || authSession.user?.role === 'EVENT_COORDINATOR');
const state = ref<State>({ status: 'idle' });
const decision = ref<VenueBookingDecision | null>(null);
const reason = ref('');
const saving = ref(false);
const needsRefresh = ref(false);
const feedback = ref<{ kind: 'saved' | 'error'; message: string } | null>(null);
const reasonError = computed(() => reason.value.trim().length > 2000 ? 'Use at most 2,000 characters for the reason.' : '');
const canSubmit = computed(() => state.value.status === 'ready' && staff.value
  && state.value.booking.status === 'PENDING' && decision.value !== null
  && (decision.value !== 'APPROVED' || state.value.booking.eventStatus === 'APPROVED')
  && !saving.value && !needsRefresh.value && !reasonError.value);
let readController: AbortController | undefined;
let writeController: AbortController | undefined;
let viewVersion = 0;

async function load() {
  readController?.abort();
  state.value = { status: 'idle' };
  if (authSession.loading || !allowed.value || !bookingId.value) return;
  const current = new AbortController();
  readController = current;
  state.value = { status: 'loading' };
  try {
    const booking = await fetchVenueBooking(bookingId.value, current.signal);
    if (!current.signal.aborted) {
      state.value = { status: 'ready', booking };
      needsRefresh.value = false;
    }
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      return;
    }
    const denied = error instanceof ApiError && [403, 404].includes(error.status);
    state.value = {
      status: 'error', retryable: !denied,
      message: denied ? 'This venue booking request is unavailable or you do not have permission to view it.'
        : error instanceof Error ? error.message : 'The venue booking request could not be loaded. Please try again.',
    };
  }
}

async function submit() {
  if (!canSubmit.value || !decision.value) return;
  const version = viewVersion;
  const current = new AbortController();
  writeController = current;
  saving.value = true;
  feedback.value = null;
  try {
    const booking = await decideVenueBooking(bookingId.value, decision.value, reason.value, current.signal);
    if (current.signal.aborted || version !== viewVersion) return;
    state.value = { status: 'ready', booking };
    feedback.value = {
      kind: 'saved', message: booking.status === 'APPROVED' ? 'Venue booking approved.' : 'Venue booking rejected.',
    };
    decision.value = null;
    reason.value = '';
  } catch (error) {
    if (current.signal.aborted || version !== viewVersion) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      return;
    }
    if (error instanceof ApiError && [403, 404].includes(error.status)) {
      state.value = { status: 'error', retryable: false,
        message: 'This venue booking request is unavailable or you no longer have permission to review it.' };
      return;
    }
    if (error instanceof ApiError && error.status === 409) {
      feedback.value = { kind: 'error', message: `${error.message} Review the current booking status before trying again.` };
      decision.value = null;
      // Read the competing saved decision or changed eligibility; never retry the write automatically.
      await load();
    } else if (error instanceof ApiError && error.status === 400) {
      feedback.value = { kind: 'error', message: error.message };
    } else {
      needsRefresh.value = true;
      feedback.value = { kind: 'error',
        message: 'We could not confirm whether your decision was recorded. Refresh the booking before trying again.' };
    }
  } finally {
    if (version === viewVersion) saving.value = false;
  }
}

function refresh() {
  if (saving.value) return;
  feedback.value = null;
  decision.value = null;
  reason.value = '';
  void load();
}

function resetView() {
  viewVersion += 1;
  readController?.abort();
  writeController?.abort();
  state.value = { status: 'idle' };
  decision.value = null;
  reason.value = '';
  saving.value = false;
  needsRefresh.value = false;
  feedback.value = null;
}

watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, bookingId.value], () => {
  resetView();
  void load();
}, { immediate: true, flush: 'sync' });
onBeforeUnmount(resetView);
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Venue planning</p>
    <h1>Venue booking request</h1>
    <p class="page-description">View the requested venue, timing and booking outcome.</p>
  </section>

  <p v-if="authSession.loading" class="panel booking-panel" role="status">Checking your session…</p>
  <div v-else-if="!authSession.user" class="panel booking-panel" role="alert">
    <p>Sign in to view this venue booking request.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>
  <p v-else-if="!allowed" class="panel booking-panel" role="alert">
    Venue booking requests are for venue staff and event coordinators.
  </p>

  <template v-else>
    <nav class="booking-toolbar" aria-label="Venue booking navigation">
      <RouterLink to="/venue-bookings">Back to venue booking requests</RouterLink>
      <button type="button" class="button button-secondary" :disabled="saving || state.status === 'loading'" @click="refresh">Refresh booking</button>
    </nav>
    <p v-if="feedback" :role="feedback.kind === 'error' ? 'alert' : 'status'" class="panel booking-feedback" :class="{ 'booking-error': feedback.kind === 'error' }">{{ feedback.message }}</p>
    <p v-if="state.status === 'loading'" role="status">Loading venue booking request…</p>
    <div v-else-if="state.status === 'error'" class="panel booking-panel" role="alert">
      <p>{{ state.message }}</p>
      <button v-if="state.retryable" type="button" class="button button-secondary" @click="refresh">Try again</button>
    </div>

    <div v-else-if="state.status === 'ready'" class="booking-grid">
      <div>
        <section class="panel booking-panel" aria-labelledby="booking-title">
          <h2 id="booking-title">{{ state.booking.eventName?.trim() || 'Untitled event request' }}</h2>
          <p class="booking-caption">All dates and times are in Singapore time.</p>
          <dl>
            <div><dt>Venue</dt><dd>{{ state.booking.venueName }}</dd></div>
            <div><dt>Booking status</dt><dd>{{ venueBookingStatusLabel(state.booking.status) }}</dd></div>
            <div><dt>Booking starts</dt><dd>{{ formatEventTime(state.booking.startsAt) }}</dd></div>
            <div><dt>Booking ends</dt><dd>{{ formatEventTime(state.booking.endsAt) }}</dd></div>
            <div><dt>Requested layout</dt><dd>{{ state.booking.layout ?? 'Not provided' }}</dd></div>
            <div><dt>Booking notes</dt><dd>{{ state.booking.notes ?? 'Not provided' }}</dd></div>
          </dl>
          <RouterLink :to="{ path: '/venues/availability', query: { venue: state.booking.venueId, week: singaporeDateKey(state.booking.startsAt) } }" class="booking-link">View venue availability</RouterLink>
        </section>

        <section v-if="state.booking.recovery.length > 0" class="panel booking-panel recovery-panel" aria-labelledby="recovery-title">
          <h2 id="recovery-title">Venue unavailability</h2>
          <p v-if="needsRecovery(state.booking)" class="booking-error">
            {{ staff
              ? 'The venue is unavailable for part of this booking. The assigned coordinator has been notified to arrange a replacement venue.'
              : 'The venue is unavailable for part of this booking. The event and its other arrangements are unchanged; arrange a replacement venue for this period.' }}
          </p>
          <p v-else class="booking-caption">No outage currently requires recovery for this booking.</p>
          <ul class="recovery-list">
            <li v-for="item in state.booking.recovery" :key="item.impactId">
              <span class="recovery-status" :class="`recovery-status--${item.status.toLowerCase()}`">{{ recoveryStatusLabel(item.status) }}</span>
              <span>Unavailable {{ formatEventTime(item.outageStartsAt) }} to {{ formatEventTime(item.outageEndsAt) }}: {{ item.outageReason }}</span>
            </li>
          </ul>
        </section>

        <section class="panel booking-panel" aria-labelledby="event-requirements-title">
          <h2 id="event-requirements-title">Current event requirements</h2>
          <p class="booking-caption">The latest event information is shown below; the booking period is recorded above.</p>
          <dl>
            <div><dt>Event status</dt><dd>{{ eventStatusLabel(state.booking.eventStatus) }}</dd></div>
            <div><dt>Event starts</dt><dd>{{ formatEventTime(state.booking.eventStartsAt) }}</dd></div>
            <div><dt>Event ends</dt><dd>{{ formatEventTime(state.booking.eventEndsAt) }}</dd></div>
            <div><dt>Purpose</dt><dd>{{ state.booking.purpose ?? 'Not provided' }}</dd></div>
            <div><dt>Description</dt><dd>{{ state.booking.description ?? 'Not provided' }}</dd></div>
            <div><dt>Expected attendance</dt><dd>{{ state.booking.expectedAttendance ?? 'Not provided' }}</dd></div>
            <div><dt>Venue requirements</dt><dd>{{ state.booking.venueRequirements ?? 'Not provided' }}</dd></div>
            <div><dt>Accessibility needs</dt><dd>{{ state.booking.accessibilityNeeds ?? 'Not provided' }}</dd></div>
          </dl>
          <RouterLink v-if="!staff" :to="`/reviews/${state.booking.eventRequestId}`" class="booking-link">View event request</RouterLink>
        </section>
      </div>

      <section class="panel booking-panel outcome-panel" aria-labelledby="booking-outcome-title">
        <h2 id="booking-outcome-title">Booking decision</h2>
        <template v-if="state.booking.status === 'APPROVED' || state.booking.status === 'REJECTED'">
          <p class="booking-outcome" :class="{ rejected: state.booking.status === 'REJECTED' }">{{ venueBookingStatusLabel(state.booking.status) }}</p>
          <dl>
            <div><dt>Reason or information</dt><dd>{{ state.booking.decisionReason ?? 'No reason provided.' }}</dd></div>
            <div><dt>Recorded on</dt><dd>{{ formatEventTime(state.booking.decidedAt) }}</dd></div>
          </dl>
          <p class="booking-caption">{{ state.booking.status === 'APPROVED' ? 'This booking reserves the venue for the requested period.' : 'This booking does not reserve the venue.' }}</p>
        </template>
        <p v-else-if="state.booking.status === 'CANCELLED'" class="booking-caption">This booking has been cancelled and is not awaiting a decision.</p>
        <p v-else-if="!staff" class="booking-caption">Venue staff have not recorded an approval or rejection yet.</p>
        <p v-else-if="needsRefresh" class="booking-caption">Refresh the booking to check its current status before making another decision.</p>
        <form v-else @submit.prevent="submit">
          <p class="booking-caption">Approval reserves the venue for this period. It does not change the event's status.</p>
          <p v-if="state.booking.eventStatus !== 'APPROVED'" class="booking-error">The event is not approved, so this booking cannot be approved. You can still reject it.</p>
          <fieldset :disabled="saving" class="decision-fields">
            <legend>Choose a decision</legend>
            <label><input v-model="decision" type="radio" value="APPROVED" :disabled="state.booking.eventStatus !== 'APPROVED'" /> Approve booking</label>
            <label><input v-model="decision" type="radio" value="REJECTED" /> Reject booking</label>
            <label for="booking-reason" class="reason-label">Reason or information (optional)</label>
            <textarea id="booking-reason" v-model="reason" rows="4" maxlength="2000" aria-describedby="booking-reason-help booking-reason-error" />
            <p id="booking-reason-help" class="booking-caption">Up to 2,000 characters. The event coordinator can see this with the decision.</p>
            <p v-if="reasonError" id="booking-reason-error" role="alert" class="booking-error">{{ reasonError }}</p>
          </fieldset>
          <button type="submit" class="button button-primary" :disabled="!canSubmit">{{ saving ? 'Saving decision…' : 'Record decision' }}</button>
        </form>
      </section>
    </div>
  </template>
</template>

<style scoped>
.booking-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.booking-toolbar a, .booking-link { color: var(--green); text-underline-offset: 3px; }
.booking-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 24px; align-items: start; }
.booking-panel { padding: 24px; min-width: 0; }
.booking-panel + .booking-panel { margin-top: 24px; }
.booking-panel h2 { font-size: 20px; overflow-wrap: anywhere; }
.booking-caption { color: #59685e; line-height: 1.6; font-size: 13px; margin-top: 12px; }
.booking-panel dl { display: grid; gap: 16px; margin-top: 24px; }
.booking-panel dl > div { display: grid; grid-template-columns: minmax(100px, 0.8fr) minmax(0, 1fr); gap: 12px; }
.booking-panel dt { font-size: 13px; color: #59685e; }
.booking-panel dd { margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.booking-link { display: inline-block; margin-top: 24px; font-size: 14px; }
.booking-feedback { padding: 16px 24px; margin-bottom: 24px; }
.booking-error { color: #853e37; line-height: 1.6; font-size: 14px; margin-top: 12px; }
.booking-outcome { display: inline-block; background: #edf5e9; color: #365d2e; padding: 8px 14px; border-radius: 20px; margin-top: 24px; font-weight: 600; }
.booking-outcome.rejected { background: #fbeeed; color: #853e37; }
.decision-fields { border: 0; padding: 0; margin: 24px 0; min-width: 0; }
.decision-fields legend { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.decision-fields label { display: block; margin-bottom: 12px; font-size: 14px; }
.decision-fields input { margin-right: 6px; }
.decision-fields .reason-label { margin-top: 24px; }
.decision-fields textarea { box-sizing: border-box; width: 100%; max-width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 10px; font: inherit; resize: vertical; }
.booking-panel > .button { margin-top: 12px; }
@media (max-width: 850px) { .booking-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) {
  .booking-panel { padding: 20px; }
  .booking-toolbar { align-items: flex-start; flex-direction: column; }
  .booking-panel dl > div { grid-template-columns: 1fr; gap: 4px; }
}
.recovery-list { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 8px; font-size: 14px; }
.recovery-list li { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; overflow-wrap: anywhere; }
.recovery-status { border-radius: 12px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
.recovery-status--recovery_required { background: #fbeee6; color: #853e37; }
.recovery-status--resolved { background: #edf5e9; color: #365d2e; }
.recovery-status--cleared { background: #eef0ee; color: #59685e; }
</style>
