<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { formatEventTime } from '../../events/presentation';
import { fetchVenueBookings, venueBookingStatusLabel, type VenueBooking } from '../api/venue-bookings';

type State = { status: 'idle' | 'loading' }
  | { status: 'ready'; items: VenueBooking[] }
  | { status: 'error'; message: string; retryable: boolean };

const route = useRoute();
const isListRoute = computed(() => route.matched.some((record) => record.path === '/venue-bookings'));
const eventRequestId = computed(() => typeof route.query.eventRequestId === 'string' ? route.query.eventRequestId : undefined);
const staff = computed(() => authSession.user?.role === 'VENUE_STAFF');
const allowed = computed(() => staff.value || authSession.user?.role === 'EVENT_COORDINATOR');
const state = ref<State>({ status: 'idle' });
let controller: AbortController | undefined;

async function load() {
  controller?.abort();
  state.value = { status: 'idle' };
  if (authSession.loading || !allowed.value || !isListRoute.value) return;
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const items = await fetchVenueBookings(eventRequestId.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      return;
    }
    const denied = error instanceof ApiError && [403, 404].includes(error.status);
    state.value = {
      status: 'error', retryable: !denied,
      message: denied ? 'These venue booking requests are unavailable or you do not have permission to view them.'
        : error instanceof Error ? error.message : 'Venue booking requests could not be loaded. Please try again.',
    };
  }
}

// Remove private results immediately whenever the account, role or event filter changes.
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, isListRoute.value, eventRequestId.value],
  () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Venue planning</p>
    <h1>Venue booking requests</h1>
    <p class="page-description">{{ staff ? 'Review pending requests and record the venue booking decision.'
      : 'View venue booking progress and decisions for your assigned events.' }}</p>
  </section>

  <p v-if="authSession.loading" class="panel bookings-panel" role="status">Checking your session…</p>
  <div v-else-if="!authSession.user" class="panel bookings-panel" role="alert">
    <p>Sign in to view venue booking requests.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>
  <p v-else-if="!allowed" class="panel bookings-panel" role="alert">
    Venue booking requests are for venue staff and event coordinators.
  </p>

  <section v-else class="panel bookings-panel" aria-labelledby="bookings-title">
    <header class="bookings-header">
      <div>
        <h2 id="bookings-title">{{ staff ? 'Pending requests and affected bookings' : 'Bookings for your assigned events' }}</h2>
        <p>All dates and times are in Singapore time.</p>
        <RouterLink v-if="eventRequestId" to="/venue-bookings">Show all venue booking requests</RouterLink>
      </div>
      <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load">Refresh</button>
    </header>
    <p v-if="state.status === 'loading'" role="status">Loading venue booking requests…</p>
    <div v-else-if="state.status === 'error'" role="alert">
      <p>{{ state.message }}</p>
      <button v-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <template v-else-if="state.status === 'ready'">
      <div v-if="state.items.length === 0" class="bookings-empty">
        <h3>{{ staff ? 'No pending requests, holds or affected bookings' : 'No venue booking requests yet' }}</h3>
        <p>{{ staff ? 'Pending requests, live holds and approved bookings with current warnings will appear here.' : 'Requests for your currently assigned events will appear here.' }}</p>
      </div>
      <ul v-else class="booking-list" aria-label="Venue booking requests">
        <li v-for="booking in state.items" :key="booking.id">
          <div class="booking-summary">
            <h3><RouterLink :to="`/venue-bookings/${booking.id}`">{{ booking.eventName?.trim() || 'Untitled event request' }} · {{ booking.venueName }}</RouterLink></h3>
            <p>{{ formatEventTime(booking.startsAt) }} – {{ formatEventTime(booking.endsAt) }}</p>
            <p v-if="booking.warnings?.length" role="status">Warning: {{ booking.warnings.join(', ') }}</p>
            <p v-if="booking.decisionReason" class="booking-reason">{{ booking.decisionReason }}</p>
            <p v-if="booking.status === 'HELD'" class="booking-hold">Held until {{ formatEventTime(booking.holdExpiresAt) }}</p>
            <p v-else-if="booking.status === 'EXPIRED'" class="booking-hold">Hold expired at {{ formatEventTime(booking.holdExpiresAt) }}</p>
          </div>
          <span class="booking-status" :class="`booking-status--${booking.status.toLowerCase()}`">{{ venueBookingStatusLabel(booking.status) }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.bookings-panel { padding: 24px; }
.bookings-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.bookings-header h2 { font-size: 18px; }
.bookings-header p, .booking-summary p, .bookings-empty p { font-size: 13px; line-height: 1.6; color: #59685e; margin-top: 6px; }
.bookings-panel a { color: var(--green); text-underline-offset: 3px; }
.bookings-panel .button { flex-shrink: 0; }
.bookings-panel > .button, [role='alert'] .button { margin-top: 12px; }
.booking-list { list-style: none; padding: 0; display: grid; gap: 12px; }
.booking-list li { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.booking-summary { min-width: 0; }
.booking-summary h3 { font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; }
.booking-reason { white-space: pre-wrap; overflow-wrap: anywhere; }
.booking-status { border-radius: 20px; padding: 6px 12px; background: #edf2fa; color: #345579; font-size: 12px; font-weight: 600; }
.booking-status--approved { background: #edf5e9; color: #365d2e; }
.booking-status--rejected { background: #fbeeed; color: #853e37; }
.booking-status--cancelled { background: #f2f3ed; color: #52614e; }
.booking-status--held { background: #fdf3e1; color: #7a5212; }
.booking-status--expired { background: #f2f3ed; color: #52614e; }
.booking-summary .booking-hold { color: #7a5212; }
.bookings-empty { padding: 24px 0; }
@media (max-width: 600px) {
  .bookings-panel { padding: 20px; }
  .bookings-header { flex-wrap: wrap; }
  .booking-list li { align-items: flex-start; flex-direction: column; }
}
</style>
