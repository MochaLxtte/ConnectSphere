<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session';
import { formatEventTime } from '../../events/presentation';
import {
  fetchAttendeeEvents, fetchOwnRegistrations, registrationStatusLabel,
  type AttendeeEventSummary, type OwnRegistrationSummary,
} from '../api/attendee-events';

type State = { status: 'idle' | 'loading' } | { status: 'ready'; events: AttendeeEventSummary[]; mine: OwnRegistrationSummary[] }
  | { status: 'error'; message: string; retryable: boolean };
const state = ref<State>({ status: 'idle' });
let controller: AbortController | undefined;
const isAttendee = computed(() => !authSession.loading && authSession.user?.role === 'ATTENDEE');

async function load() {
  controller?.abort();
  state.value = { status: 'idle' };
  if (!isAttendee.value) return;
  const current = new AbortController(); controller = current;
  state.value = { status: 'loading' };
  try {
    const [events, mine] = await Promise.all([fetchAttendeeEvents(current.signal), fetchOwnRegistrations(current.signal)]);
    if (!current.signal.aborted) state.value = { status: 'ready', events, mine };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    const denied = error instanceof ApiError && [403, 404].includes(error.status);
    state.value = { status: 'error', retryable: !denied,
      message: denied ? 'Events are unavailable or you do not have permission to view them.'
        : error instanceof Error ? error.message : 'Events could not be loaded. Please try again.' };
  }
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role], () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For attendees</p>
    <h1>Events</h1>
    <p class="page-description">Confirmed events that take registrations, and your own registrations. Your account is all we need to register you.</p>
  </section>

  <section class="panel attendee-panel" aria-labelledby="open-events-title">
    <div class="list-heading"><h2 id="open-events-title">Open for registration</h2>
      <button class="button button-secondary" type="button" :disabled="state.status === 'loading'" @click="load">Refresh</button></div>
    <p v-if="state.status === 'loading'" role="status">Loading events…</p>
    <div v-else-if="state.status === 'error'" role="alert">
      <p>{{ state.message }}</p>
      <button v-if="state.retryable" class="button button-secondary" type="button" @click="load">Try again</button>
    </div>
    <template v-else-if="state.status === 'ready'">
      <p v-if="!state.events.length" role="status">No events are open for registration right now.</p>
      <ul v-else class="event-list" aria-label="Events open for registration">
        <li v-for="event in state.events" :key="event.id">
          <RouterLink :to="`/attend/${event.id}`">{{ event.name?.trim() || 'Untitled event' }}</RouterLink>
          <span class="state" :class="{ 'is-open': event.availability.canRegister }">
            {{ event.ownStatus === 'REGISTERED' ? 'You are registered' : event.availability.canRegister ? 'Registration open' : event.availability.message }}
          </span>
          <p>{{ formatEventTime(event.startsAt) }} – {{ formatEventTime(event.endsAt) }} · Singapore time</p>
          <p v-if="event.registration.placesRemaining !== null">{{ event.registration.placesRemaining }} {{ event.registration.placesRemaining === 1 ? 'place' : 'places' }} left</p>
        </li>
      </ul>
    </template>
  </section>

  <section v-if="state.status === 'ready'" class="panel attendee-panel" aria-labelledby="my-registrations-title">
    <h2 id="my-registrations-title">My registrations</h2>
    <p v-if="!state.mine.length" role="status">You have not registered for any event yet.</p>
    <ul v-else class="event-list" aria-label="My registrations">
      <li v-for="item in state.mine" :key="item.id">
        <RouterLink :to="`/attend/${item.event.id}`">{{ item.event.name?.trim() || 'Untitled event' }}</RouterLink>
        <span class="state" :class="{ 'is-open': item.status === 'REGISTERED' }">{{ registrationStatusLabel[item.status] }}</span>
        <p>{{ formatEventTime(item.event.startsAt) }} – {{ formatEventTime(item.event.endsAt) }} · Singapore time</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.attendee-panel { padding: 24px; margin-bottom: 20px; }
.list-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.event-list { list-style: none; padding: 0; display: grid; gap: 12px; }
.event-list li { border: 1px solid var(--border); padding: 16px; border-radius: 8px; min-width: 0; }
.event-list a { color: var(--green); font-weight: 600; overflow-wrap: anywhere; }
.event-list .state { float: right; font-size: 13px; max-width: 55%; text-align: right; }
.event-list .state.is-open { color: var(--green); font-weight: 600; }
.event-list p { margin-top: 10px; line-height: 1.6; clear: both; }
@media (max-width: 480px) { .attendee-panel { padding: 16px; } .event-list .state { float: none; max-width: none; text-align: left; display: block; margin-top: 6px; } }
</style>
