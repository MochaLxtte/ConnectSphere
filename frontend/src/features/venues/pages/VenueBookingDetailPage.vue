<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { eventStatusLabel, formatEventTime, fromSingaporeInputValue } from '../../events/presentation';
import { singaporeDateKey } from '../availability';
import {
  cancelVenueHold, decideVenueBooking, fetchVenueBooking, placeVenueHold, venueBookingStatusLabel,
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
// KAN-83: a pending request or a live hold can be decided; approving a hold completes it.
const decidable = computed(() => state.value.status === 'ready'
  && (state.value.booking.status === 'PENDING' || state.value.booking.status === 'HELD'));
const holdDeadline = ref('');
const cancelReason = ref('');
const holdDeadlineIso = computed(() => fromSingaporeInputValue(holdDeadline.value));
// Local checks only explain obvious mistakes; the server decides with its own clock (KAN-83-AC12).
const holdError = computed(() => {
  // Browsers clear an incomplete datetime-local value, so a non-null ISO value is all that can arrive.
  if (!holdDeadlineIso.value || state.value.status !== 'ready') return '';
  return Date.parse(holdDeadlineIso.value) > Date.parse(state.value.booking.startsAt)
    ? 'The hold deadline must be no later than the start of the booked period.' : '';
});
const canHold = computed(() => state.value.status === 'ready' && staff.value
  && state.value.booking.status === 'PENDING' && state.value.booking.eventStatus === 'APPROVED'
  && holdDeadlineIso.value !== null && !holdError.value && !saving.value && !needsRefresh.value);
const cancelReasonError = computed(() => cancelReason.value.trim().length > 2000
  ? 'Use at most 2,000 characters for the reason.' : '');
const canCancelHold = computed(() => state.value.status === 'ready' && staff.value
  && state.value.booking.status === 'HELD' && cancelReason.value.trim().length > 0
  && !cancelReasonError.value && !saving.value && !needsRefresh.value);
const canSubmit = computed(() => state.value.status === 'ready' && staff.value
  && decidable.value && decision.value !== null
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

/**
 * One write at a time. A conflict reloads the saved booking; an uncertain outcome never retries
 * automatically and asks for a refresh instead (KAN-83-AC12).
 */
async function write(
  action: (signal: AbortSignal) => Promise<VenueBooking>, saved: (booking: VenueBooking) => string, noun = 'decision',
) {
  const version = viewVersion;
  const current = new AbortController();
  writeController = current;
  saving.value = true;
  feedback.value = null;
  try {
    const booking = await action(current.signal);
    if (current.signal.aborted || version !== viewVersion) return;
    state.value = { status: 'ready', booking };
    feedback.value = { kind: 'saved', message: saved(booking) };
    decision.value = null;
    reason.value = '';
    holdDeadline.value = '';
    cancelReason.value = '';
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
      // Read the competing saved change or changed eligibility; never retry the write automatically.
      await load();
    } else if (error instanceof ApiError && error.status === 400) {
      feedback.value = { kind: 'error', message: error.message };
    } else {
      needsRefresh.value = true;
      feedback.value = { kind: 'error',
        message: `We could not confirm whether your ${noun} was recorded. Refresh the booking before trying again.` };
    }
  } finally {
    if (version === viewVersion) saving.value = false;
  }
}

async function submit() {
  if (!canSubmit.value || !decision.value) return;
  const chosen = decision.value;
  await write((signal) => decideVenueBooking(bookingId.value, chosen, reason.value, signal),
    (booking) => booking.status === 'APPROVED' ? 'Venue booking approved.' : 'Venue booking rejected.');
}

async function placeHold() {
  if (!canHold.value || !holdDeadlineIso.value) return;
  const expiresAt = holdDeadlineIso.value;
  await write((signal) => placeVenueHold(bookingId.value, expiresAt, signal),
    (booking) => `Venue held until ${formatEventTime(booking.holdExpiresAt)}. Approve it before then, or it is released.`,
    'hold');
}

async function cancelHold() {
  if (!canCancelHold.value) return;
  const why = cancelReason.value;
  await write((signal) => cancelVenueHold(bookingId.value, why, signal), () => 'Venue hold cancelled and released.',
    'hold cancellation');
}

function refresh() {
  if (saving.value) return;
  feedback.value = null;
  decision.value = null;
  reason.value = '';
  holdDeadline.value = '';
  cancelReason.value = '';
  void load();
}

function resetView() {
  viewVersion += 1;
  readController?.abort();
  writeController?.abort();
  state.value = { status: 'idle' };
  decision.value = null;
  reason.value = '';
  holdDeadline.value = '';
  cancelReason.value = '';
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
            <div v-if="state.booking.holdExpiresAt"><dt>Earlier hold deadline</dt><dd>{{ formatEventTime(state.booking.holdExpiresAt) }}</dd></div>
          </dl>
          <p class="booking-caption">{{ state.booking.status === 'APPROVED' ? 'This booking reserves the venue for the requested period.' : 'This booking does not reserve the venue.' }}</p>
        </template>
        <template v-else-if="state.booking.status === 'EXPIRED'">
          <p class="booking-outcome expired">Hold expired</p>
          <dl>
            <div><dt>Hold deadline</dt><dd>{{ formatEventTime(state.booking.holdExpiresAt) }}</dd></div>
            <div v-if="state.booking.expiredAt"><dt>Released on</dt><dd>{{ formatEventTime(state.booking.expiredAt) }}</dd></div>
          </dl>
          <p class="booking-caption">The hold reached its deadline without approval, so the venue period was released. It cannot be approved or renewed; the coordinator can submit a new request.</p>
        </template>
        <template v-else-if="state.booking.status === 'CANCELLED'">
          <p class="booking-caption">This booking has been cancelled and is not awaiting a decision.</p>
          <dl v-if="state.booking.cancellationReason">
            <div><dt>Cancellation reason</dt><dd>{{ state.booking.cancellationReason }}</dd></div>
            <div><dt>Cancelled on</dt><dd>{{ formatEventTime(state.booking.cancelledAt) }}</dd></div>
          </dl>
        </template>
        <template v-else>
          <section v-if="state.booking.status === 'HELD'" class="hold-summary" aria-labelledby="hold-title">
            <h3 id="hold-title">Temporary hold</h3>
            <p class="booking-outcome held">Held until {{ formatEventTime(state.booking.holdExpiresAt) }}</p>
            <dl>
              <div><dt>Hold placed</dt><dd>{{ formatEventTime(state.booking.heldAt) }}</dd></div>
            </dl>
            <p class="booking-caption">The venue period is reserved until this deadline. It becomes a confirmed booking only if venue staff approve it before then; otherwise it is released automatically. The server checks the deadline when a change is saved, so refresh before acting near the deadline.</p>
          </section>
          <p v-if="!staff" class="booking-caption">Venue staff have not recorded an approval or rejection yet.</p>
          <p v-else-if="needsRefresh" class="booking-caption">Refresh the booking to check its current status before making another decision.</p>
          <template v-else>
            <form @submit.prevent="submit">
              <p class="booking-caption">{{ state.booking.status === 'HELD' ? 'Approval converts the hold into the confirmed booking for this period.' : 'Approval reserves the venue for this period.' }} It does not change the event's status.</p>
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

            <form v-if="state.booking.status === 'PENDING' && state.booking.eventStatus === 'APPROVED'" class="hold-form" aria-labelledby="place-hold-title" @submit.prevent="placeHold">
              <h3 id="place-hold-title">Place a temporary hold</h3>
              <p class="booking-caption">A hold reserves this period until the deadline while the booking is finalised. If it is not approved by then, it is released automatically.</p>
              <fieldset :disabled="saving" class="decision-fields">
                <label for="hold-deadline" class="reason-label">Hold deadline (Singapore time)</label>
                <input id="hold-deadline" v-model="holdDeadline" type="datetime-local" required aria-describedby="hold-deadline-help hold-deadline-error" />
                <p id="hold-deadline-help" class="booking-caption">Must be in the future and no later than the booking start ({{ formatEventTime(state.booking.startsAt) }}).</p>
                <p v-if="holdError" id="hold-deadline-error" role="alert" class="booking-error">{{ holdError }}</p>
              </fieldset>
              <button type="submit" class="button button-secondary" :disabled="!canHold">{{ saving ? 'Saving…' : 'Place hold' }}</button>
            </form>

            <form v-if="state.booking.status === 'HELD'" class="hold-form" aria-labelledby="cancel-hold-title" @submit.prevent="cancelHold">
              <h3 id="cancel-hold-title">Cancel hold</h3>
              <fieldset :disabled="saving" class="decision-fields">
                <label for="cancel-hold-reason" class="reason-label">Reason for cancelling (required)</label>
                <textarea id="cancel-hold-reason" v-model="cancelReason" rows="3" maxlength="2000" aria-describedby="cancel-hold-help cancel-hold-error" />
                <p id="cancel-hold-help" class="booking-caption">Releases only this hold. The coordinator is notified with this reason.</p>
                <p v-if="cancelReasonError" id="cancel-hold-error" role="alert" class="booking-error">{{ cancelReasonError }}</p>
              </fieldset>
              <button type="submit" class="button button-secondary" :disabled="!canCancelHold">{{ saving ? 'Saving…' : 'Cancel hold' }}</button>
            </form>
          </template>
        </template>
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
.booking-outcome.held { background: #fdf3e1; color: #7a5212; }
.booking-outcome.expired { background: #f2f3ed; color: #52614e; }
.hold-summary { margin-top: 24px; }
.hold-summary h3, .hold-form h3 { font-size: 16px; }
.hold-form { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border); }
.decision-fields input[type='datetime-local'] { box-sizing: border-box; width: 100%; max-width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 10px; font: inherit; }
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
</style>
