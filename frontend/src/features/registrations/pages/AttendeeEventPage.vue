<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { formatEventTime } from '../../events/presentation';
import { fetchAttendeeEvent, registerForEvent, registrationStatusLabel, type AttendeeEventDetail } from '../api/attendee-events';

type State = { status: 'idle' | 'loading' } | { status: 'ready'; detail: AttendeeEventDetail }
  | { status: 'error'; message: string; retryable: boolean };
const route = useRoute();
const eventId = computed(() => String(route.params.id ?? ''));
const state = ref<State>({ status: 'idle' });
const busy = ref(false);
const feedback = ref<{ kind: 'success' | 'error'; message: string } | null>(null);
let reader: AbortController | undefined;
let writer: AbortController | undefined;
const isAttendee = computed(() => !authSession.loading && authSession.user?.role === 'ATTENDEE');
const detail = computed(() => state.value.status === 'ready' ? state.value.detail : null);

async function load(keepFeedback = false) {
  reader?.abort();
  if (!keepFeedback) feedback.value = null;
  state.value = { status: 'idle' };
  if (!isAttendee.value || !eventId.value) return;
  const current = new AbortController(); reader = current;
  state.value = { status: 'loading' };
  try {
    const loaded = await fetchAttendeeEvent(eventId.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', detail: loaded };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    const gone = error instanceof ApiError && [400, 403, 404].includes(error.status);
    state.value = { status: 'error', retryable: !gone,
      message: gone ? 'This event is unavailable.' : error instanceof Error ? error.message : 'The event could not be loaded. Please try again.' };
  }
}

async function register() {
  const current = detail.value;
  if (!current?.availability.canRegister || busy.value) return;
  const id = eventId.value;
  const controller = new AbortController(); writer = controller;
  busy.value = true; feedback.value = null;
  try {
    const result = await registerForEvent(id, controller.signal);
    if (controller.signal.aborted || eventId.value !== id) return;
    state.value = { status: 'ready', detail: result };
    feedback.value = { kind: 'success', message: 'You are registered. We have saved your place.' };
  } catch (error) {
    if (controller.signal.aborted || eventId.value !== id) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    feedback.value = { kind: 'error', message: error instanceof Error ? error.message : 'We could not register you. Check your connection and try again.' };
    // A refusal means the page was out of date (full, closed, already registered): show the current state.
    if (error instanceof ApiError && [404, 409].includes(error.status)) await load(true);
  } finally {
    if (writer === controller) { busy.value = false; writer = undefined; }
  }
}

watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, eventId.value],
  () => { writer?.abort(); busy.value = false; void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => { reader?.abort(); writer?.abort(); });
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For attendees</p>
    <h1>{{ detail?.event.name?.trim() || 'Event' }}</h1>
    <RouterLink to="/attend" class="back-link">Back to events</RouterLink>
  </section>

  <p v-if="state.status === 'loading'" class="panel attendee-event" role="status">Loading the event…</p>
  <div v-else-if="state.status === 'error'" class="panel attendee-event" role="alert">
    <p>{{ state.message }}</p>
    <button v-if="state.retryable" class="button button-secondary" type="button" @click="load()">Try again</button>
  </div>

  <template v-else-if="detail">
    <section class="panel attendee-event" aria-labelledby="about-title">
      <h2 id="about-title">About this event</h2>
      <p v-if="detail.event.purpose"><strong>Purpose:</strong> {{ detail.event.purpose }}</p>
      <p v-if="detail.event.description">{{ detail.event.description }}</p>
      <p><strong>When:</strong> {{ formatEventTime(detail.event.startsAt) }} – {{ formatEventTime(detail.event.endsAt) }} · Singapore time</p>
      <div v-if="detail.event.venues.length"><strong>Where:</strong>
        <ul class="plain"><li v-for="venue in detail.event.venues" :key="`${venue.name}-${venue.startsAt}`">{{ venue.name }}<template v-if="venue.location"> · {{ venue.location }}</template></li></ul>
      </div>
      <p v-else><strong>Where:</strong> The venue has not been confirmed yet.</p>
      <p v-if="detail.event.accessibilityNeeds"><strong>Accessibility:</strong> {{ detail.event.accessibilityNeeds }}</p>
    </section>

    <section class="panel attendee-event" aria-labelledby="registration-title">
      <h2 id="registration-title">Registration</h2>
      <ul class="plain" aria-label="Registration conditions">
        <li v-if="detail.event.registration.opensAt">Opens {{ formatEventTime(detail.event.registration.opensAt) }}</li>
        <li v-if="detail.event.registration.closesAt">Closes {{ formatEventTime(detail.event.registration.closesAt) }}</li>
        <li v-if="detail.event.registration.capacity === null">There is no limit on places.</li>
        <li v-else>{{ detail.event.registration.placesRemaining }} of {{ detail.event.registration.capacity }} places left</li>
        <li>Registration closes when the event starts. No extra personal details are needed: your signed-in account is used.</li>
      </ul>
      <p v-if="detail.registration" class="own-status" role="status">
        Your registration: <strong>{{ registrationStatusLabel[detail.registration.status] }}</strong>
        <template v-if="detail.registration.status === 'REGISTERED'"> since {{ formatEventTime(detail.registration.registeredAt) }} (Singapore time)</template>
      </p>
      <p v-if="!detail.availability.canRegister && detail.availability.reason !== 'ALREADY_REGISTERED'" class="unavailable" role="status">{{ detail.availability.message }}</p>
      <div v-if="feedback" :role="feedback.kind === 'error' ? 'alert' : 'status'" :class="`feedback is-${feedback.kind}`"><p>{{ feedback.message }}</p></div>
      <button v-if="detail.availability.canRegister" class="button button-primary" type="button" :disabled="busy" @click="register">
        {{ busy ? 'Registering…' : 'Register for this event' }}
      </button>
    </section>
  </template>
</template>

<style scoped>
.attendee-event { padding: 24px; margin-bottom: 20px; display: grid; gap: 12px; }
.back-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.plain { list-style: none; padding: 0; margin: 6px 0 0; display: grid; gap: 6px; }
.own-status { margin: 0; }
.unavailable { margin: 0; font-weight: 600; }
.feedback { border-radius: 8px; padding: 12px 16px; }
.feedback.is-success { background: #eef6ef; }
.feedback.is-error { background: #fbeeee; }
.feedback p { margin: 0; }
@media (max-width: 480px) { .attendee-event { padding: 16px; } }
</style>
