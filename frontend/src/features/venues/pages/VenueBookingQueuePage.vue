<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import '../venues.css';
import { ApiError } from '../../../lib/api-client';
import { authSession } from '../../auth/session.js';
import {
  decideVenueBooking, fetchVenueBookingQueue, type VenueBookingQueueItem, type VenueBookingStatus,
} from '../api/venue-bookings';
import {
  bookingStatusLabel, describeActionFailure, describeLoadFailure, formatDateTime, formatInterval, type LoadFailure,
} from '../presentation';

type LoadState =
  | { status: 'loading' }
  | ({ status: 'error' } & LoadFailure)
  | { status: 'ready'; items: VenueBookingQueueItem[] };

const statuses: VenueBookingStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const status = ref<VenueBookingStatus>('PENDING');
const state = ref<LoadState>({ status: 'loading' });
const isStaff = computed(() => authSession.user?.role === 'VENUE_STAFF');
const reasons = reactive<Record<string, string>>({});
const itemErrors = reactive<Record<string, string>>({});
const savingId = ref<string | null>(null);
const notice = ref('');
let controller: AbortController | undefined;

async function load(keepNotice = false) {
  controller?.abort();
  if (!keepNotice) notice.value = '';
  if (!isStaff.value) return;
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const items = await fetchVenueBookingQueue(status.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (!current.signal.aborted) state.value = { status: 'error', ...describeLoadFailure(error, 'venue booking requests') };
  }
}

const failedChecks = (item: VenueBookingQueueItem) => item.suitability.checks.filter((check) => !check.passed);
const eventName = (item: { eventName: string | null }) => item.eventName?.trim() || 'Untitled event request';

async function decide(item: VenueBookingQueueItem, decision: 'APPROVED' | 'REJECTED') {
  itemErrors[item.id] = '';
  const reason = (reasons[item.id] ?? '').trim();
  if (decision === 'REJECTED' && !reason) {
    itemErrors[item.id] = 'Enter a reason so the requester knows why the booking was rejected.';
    return;
  }
  savingId.value = item.id;
  try {
    await decideVenueBooking(item.id, decision, reason);
    delete reasons[item.id];
    notice.value = `${decision === 'APPROVED' ? 'Approved' : 'Rejected'} the ${item.venueName} booking for ${eventName(item)}.`;
    await load(true);
  } catch (error) {
    const message = describeActionFailure(error, 'The decision could not be saved. Please try again.');
    if (error instanceof ApiError && error.status === 409) {
      // Another decision, booking or block changed the picture: show why, then refresh the queue.
      notice.value = '';
      await load();
      if (state.value.status === 'ready' && state.value.items.some((entry) => entry.id === item.id)) {
        itemErrors[item.id] = message;
      } else {
        notice.value = message;
      }
    } else {
      itemErrors[item.id] = message;
    }
  } finally {
    savingId.value = null;
  }
}

watch([status, () => authSession.user?.id, isStaff], () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <div class="venues-ui">
    <section class="page-heading">
      <p class="eyebrow">For venue staff</p>
      <h1>Venue booking requests</h1>
      <p class="page-description">Check suitability and conflicts, then approve or reject each request. Times are in Singapore time.</p>
    </section>

    <p v-if="authSession.loading" class="panel venues-panel" role="status">Checking your session…</p>
    <div v-else-if="!authSession.user" class="panel venues-panel venues-state" role="alert">
      <p>Sign in as venue staff to view venue booking requests.</p>
      <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
    </div>
    <p v-else-if="!isStaff" class="panel venues-panel" role="alert">Only venue staff can decide venue booking requests.</p>

    <template v-else>
      <div class="venues-toolbar">
        <div class="venues-field">
          <label for="queue-status">Show</label>
          <select id="queue-status" v-model="status">
            <option v-for="option in statuses" :key="option" :value="option">{{ bookingStatusLabel(option) }}</option>
          </select>
        </div>
        <div class="venues-toolbar-actions">
          <RouterLink to="/venues" class="button button-secondary">Venue catalogue</RouterLink>
          <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load()">Refresh</button>
        </div>
      </div>

      <p v-if="notice" class="venues-notice venues-notice--ok venues-gap-below" role="status">{{ notice }}</p>

      <p v-if="state.status === 'loading'" class="panel venues-panel" role="status">Loading venue booking requests…</p>
      <div v-else-if="state.status === 'error'" class="panel venues-panel venues-state" role="alert">
        <p>{{ state.message }}</p>
        <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
        <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load()">Try again</button>
      </div>
      <div v-else-if="state.items.length === 0" class="panel venues-empty">
        <h2>{{ status === 'PENDING' ? 'No booking requests are waiting for a decision' : 'No bookings with this status' }}</h2>
        <p class="venues-muted">New requests from organisers and coordinators will appear here.</p>
      </div>

      <ul v-else class="venues-queue">
        <li v-for="item in state.items" :key="item.id" class="panel venues-panel venues-queue-item">
          <div class="venues-heading-row">
            <h2>{{ eventName(item) }}</h2>
            <span class="venues-badge" :class="`venues-badge--${item.status.toLowerCase()}`">{{ bookingStatusLabel(item.status) }}</span>
          </div>
          <dl class="venues-facts">
            <dt>Venue</dt><dd><RouterLink :to="`/venues/${item.venueId}`" class="venues-link">{{ item.venueName }}</RouterLink></dd>
            <dt>Period</dt><dd>{{ formatInterval(item.startsAt, item.endsAt) }}</dd>
            <dt>Organiser</dt><dd>{{ item.organiserName }}</dd>
            <dt>Expected attendance</dt><dd>{{ item.expectedAttendance ?? 'Not provided' }}</dd>
            <template v-if="item.layout"><dt>Layout</dt><dd>{{ item.layout }}</dd></template>
            <template v-if="item.notes"><dt>Notes</dt><dd>{{ item.notes }}</dd></template>
            <template v-if="item.decidedAt"><dt>Decided</dt><dd>{{ formatDateTime(item.decidedAt) }}</dd></template>
            <template v-if="item.decisionReason"><dt>Reason</dt><dd>{{ item.decisionReason }}</dd></template>
          </dl>

          <template v-if="item.status === 'PENDING'">
            <div v-if="failedChecks(item).length" class="venues-notice">
              <strong>Suitability warnings</strong>
              <ul><li v-for="check in failedChecks(item)" :key="check.code">{{ check.message }}</li></ul>
            </div>
            <p v-else class="venues-notice venues-notice--ok">All suitability checks passed.</p>

            <div v-if="item.conflicts.length" class="venues-notice venues-notice--danger">
              <strong>Overlapping bookings for this venue</strong>
              <ul>
                <li v-for="conflict in item.conflicts" :key="conflict.bookingId">
                  {{ eventName(conflict) }} ({{ conflict.status === 'APPROVED' ? 'approved' : 'pending' }}):
                  {{ formatInterval(conflict.startsAt, conflict.endsAt) }}
                </li>
              </ul>
            </div>

            <div class="venues-field">
              <label :for="`reason-${item.id}`">Reason <span class="venues-hint">(required to reject)</span></label>
              <textarea :id="`reason-${item.id}`" v-model="reasons[item.id]" rows="2" maxlength="1000" :disabled="savingId !== null" />
            </div>
            <p v-if="itemErrors[item.id]" class="venues-error" role="alert">{{ itemErrors[item.id] }}</p>
            <div class="venues-form-actions">
              <button type="button" class="button button-primary" :disabled="savingId !== null" :aria-label="`Approve ${item.venueName} for ${eventName(item)}`" @click="decide(item, 'APPROVED')">
                {{ savingId === item.id ? 'Saving…' : 'Approve' }}
              </button>
              <button type="button" class="button button-danger" :disabled="savingId !== null" :aria-label="`Reject ${item.venueName} for ${eventName(item)}`" @click="decide(item, 'REJECTED')">Reject</button>
            </div>
          </template>
        </li>
      </ul>
    </template>
  </div>
</template>
