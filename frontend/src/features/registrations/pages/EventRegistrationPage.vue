<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { formatEventTime } from '../../events/presentation';
import { fetchDiscoverableEvent, type PublicEvent } from '../api/registrations';
import RegistrationControls from '../components/RegistrationControls.vue';
import { availabilityBadge, placesLabel, venueLabel } from '../presentation';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'ready'; event: PublicEvent };

const route = useRoute();
const eventId = computed(() => String(route.params.id ?? ''));
const state = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

function showSignIn() {
  controller?.abort();
  state.value = { status: 'error', signIn: true, retryable: false, message: 'Sign in to view this event.' };
}

async function load(quiet = false) {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  if (!quiet || state.value.status !== 'ready') state.value = { status: 'loading' };
  try {
    const event = await fetchDiscoverableEvent(eventId.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', event };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      showSignIn();
      return;
    }
    const unavailable = error instanceof ApiError && [400, 403, 404].includes(error.status);
    state.value = {
      status: 'error', signIn: false, retryable: !unavailable,
      message: unavailable ? 'This event is unavailable or is not open for registration.'
        : error instanceof Error ? error.message : 'The event could not be loaded. Please try again.',
    };
  }
}

onMounted(() => load());
watch(eventId, () => void load(), { flush: 'sync' });
// Signing out or changing account must not leave the previous user's registration status visible.
watch(() => [authSession.user?.id, authSession.user?.role], () => {
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For attendees</p>
    <h1>Event registration</h1>
    <p class="page-description">Check the details and manage your place at this event.</p>
  </section>

  <div class="detail-toolbar">
    <RouterLink to="/browse" class="back-link">Back to events</RouterLink>
    <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load()">Refresh</button>
  </div>

  <p v-if="state.status === 'loading'" class="panel detail-panel" role="status">Loading the event…</p>
  <div v-else-if="state.status === 'error'" class="panel detail-panel detail-error" role="alert">
    <p>{{ state.message }}</p>
    <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
    <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load()">Try again</button>
  </div>

  <div v-else class="detail-grid">
    <section class="panel detail-panel" aria-labelledby="event-heading">
      <h2 id="event-heading">{{ state.event.name?.trim() || 'Untitled event' }}</h2>
      <p class="time-note">All dates and times are in Singapore time.</p>
      <dl class="event-fields">
        <dt>Purpose</dt><dd>{{ state.event.purpose?.trim() || 'Not provided' }}</dd>
        <dt>Description</dt><dd>{{ state.event.description?.trim() || 'Not provided' }}</dd>
        <dt>Starts</dt><dd><time v-if="state.event.startsAt" :datetime="state.event.startsAt">{{ formatEventTime(state.event.startsAt) }}</time><span v-else>To be confirmed</span></dd>
        <dt>Ends</dt><dd><time v-if="state.event.endsAt" :datetime="state.event.endsAt">{{ formatEventTime(state.event.endsAt) }}</time><span v-else>To be confirmed</span></dd>
        <dt>Venue</dt><dd>{{ venueLabel(state.event.venue) }}</dd>
      </dl>
    </section>

    <section class="panel detail-panel" aria-labelledby="registration-heading">
      <div class="registration-heading-row">
        <h2 id="registration-heading">Registration</h2>
        <span class="availability" :class="`availability--${availabilityBadge(state.event).tone}`">
          {{ availabilityBadge(state.event).label }}
        </span>
      </div>
      <dl class="registration-fields">
        <dt>Places</dt><dd>{{ placesLabel(state.event) }}</dd>
        <template v-if="state.event.registrationOpensAt">
          <dt>Opens</dt><dd><time :datetime="state.event.registrationOpensAt">{{ formatEventTime(state.event.registrationOpensAt) }}</time></dd>
        </template>
        <template v-if="state.event.registrationClosesAt">
          <dt>Closes</dt><dd><time :datetime="state.event.registrationClosesAt">{{ formatEventTime(state.event.registrationClosesAt) }}</time></dd>
        </template>
      </dl>
      <RegistrationControls :event="state.event" class="detail-controls" @changed="load(true)" />
    </section>
  </div>
</template>

<style scoped>
.detail-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.back-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.detail-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); align-items: start; gap: 20px; }
.detail-panel { padding: 24px; min-width: 0; overflow-wrap: anywhere; line-height: 1.6; }
.detail-panel h2 { font-size: 19px; line-height: 1.5; }
.time-note { color: #59685e; font-size: 12px; margin-top: 8px; }
dl { margin: 24px 0 0; font-size: 14px; }
dt { color: #59685e; }
dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.event-fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2.4fr); gap: 16px 20px; }
.registration-heading-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.registration-fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr); gap: 12px 16px; }
.detail-controls { margin-top: 24px; }
.detail-error .button { margin-top: 12px; }
.availability { border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 600; line-height: 1.5; background: #f2f3ed; color: #52614e; }
.availability--open { background: #edf5e9; color: #365d2e; }
.availability--full { background: #fbeeed; color: #853e37; }
.availability--pending { background: #fff3df; color: #805518; }
@media (max-width: 1000px) {
  .detail-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .detail-panel { padding: 20px; }
  .event-fields { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .event-fields dt:not(:first-child) { margin-top: 12px; }
}
</style>
