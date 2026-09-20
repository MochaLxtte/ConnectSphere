<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import '../venues.css';
import { authSession } from '../../auth/session.js';
import {
  blockVenue, fetchVenue, fetchVenueAvailability, unblockVenue, type Venue, type VenueAvailability,
} from '../api/venues';
import {
  buildWeekAgenda, DAY_MS, describeActionFailure, describeLoadFailure, formatDay, formatOperatingHours,
  singaporeInputToIso, singaporeWeekStart, type LoadFailure,
} from '../presentation';

type VenueState =
  | { status: 'loading' }
  | ({ status: 'error' } & LoadFailure)
  | { status: 'ready'; venue: Venue };
type CalendarState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; availability: VenueAvailability };

const route = useRoute();
const venueId = computed(() => String(route.params.id ?? ''));
const isStaff = computed(() => authSession.user?.role === 'VENUE_STAFF');
const venueState = ref<VenueState>({ status: 'loading' });
const calendar = ref<CalendarState>({ status: 'loading' });
const weekOffset = ref(0);
const weekStart = computed(() => singaporeWeekStart(Date.now(), weekOffset.value));
const weekLabel = computed(() => `${formatDay(weekStart.value)} to ${formatDay(weekStart.value + 6 * DAY_MS)}`);
const agenda = computed(() => (calendar.value.status === 'ready'
  ? buildWeekAgenda(weekStart.value, calendar.value.availability.busy) : []));

const block = reactive({ startsAt: '', endsAt: '', reason: '' });
const blockError = ref('');
const blockNotice = ref('');
const saving = ref(false);
let venueController: AbortController | undefined;
let calendarController: AbortController | undefined;

async function loadCalendar() {
  calendarController?.abort();
  const current = new AbortController();
  calendarController = current;
  calendar.value = { status: 'loading' };
  try {
    const from = new Date(weekStart.value).toISOString();
    const to = new Date(weekStart.value + 7 * DAY_MS).toISOString();
    const availability = await fetchVenueAvailability(venueId.value, from, to, current.signal);
    if (!current.signal.aborted) calendar.value = { status: 'ready', availability };
  } catch (error) {
    if (!current.signal.aborted) {
      calendar.value = { status: 'error', message: describeLoadFailure(error, 'the availability calendar').message };
    }
  }
}

async function load() {
  venueController?.abort();
  calendarController?.abort();
  const current = new AbortController();
  venueController = current;
  venueState.value = { status: 'loading' };
  try {
    const venue = await fetchVenue(venueId.value, current.signal);
    if (current.signal.aborted) return;
    venueState.value = { status: 'ready', venue };
    void loadCalendar();
  } catch (error) {
    if (!current.signal.aborted) venueState.value = { status: 'error', ...describeLoadFailure(error, 'this venue') };
  }
}

function changeWeek(step: number) {
  weekOffset.value = step === 0 ? 0 : weekOffset.value + step;
  void loadCalendar();
}

async function submitBlock() {
  blockError.value = '';
  blockNotice.value = '';
  const startsAt = singaporeInputToIso(block.startsAt);
  const endsAt = singaporeInputToIso(block.endsAt);
  if (!startsAt || !endsAt) { blockError.value = 'Enter when the blocked period starts and ends.'; return; }
  if (endsAt <= startsAt) { blockError.value = 'The end must be later than the start.'; return; }
  saving.value = true;
  try {
    await blockVenue(venueId.value, { startsAt, endsAt, reason: block.reason.trim() || null });
    Object.assign(block, { startsAt: '', endsAt: '', reason: '' });
    blockNotice.value = 'The period has been blocked.';
    await loadCalendar();
  } catch (error) {
    blockError.value = describeActionFailure(error, 'The period could not be blocked. Please try again.');
  } finally {
    saving.value = false;
  }
}

async function removeBlock(blockId: string) {
  blockError.value = '';
  blockNotice.value = '';
  saving.value = true;
  try {
    await unblockVenue(venueId.value, blockId);
    blockNotice.value = 'The blocked period has been removed.';
    await loadCalendar();
  } catch (error) {
    blockError.value = describeActionFailure(error, 'The blocked period could not be removed. Please try again.');
  } finally {
    saving.value = false;
  }
}

watch([venueId, () => authSession.user?.id], () => { weekOffset.value = 0; void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => { venueController?.abort(); calendarController?.abort(); });
</script>

<template>
  <div class="venues-ui">
    <section class="page-heading">
      <p class="eyebrow">Venues</p>
      <h1>{{ venueState.status === 'ready' ? venueState.venue.name : 'Venue' }}</h1>
      <p class="page-description">Venue details and availability. All times are in Singapore time.</p>
    </section>

    <div class="venues-toolbar">
      <RouterLink to="/venues" class="venues-link">Back to venue catalogue</RouterLink>
      <div v-if="venueState.status === 'ready' && isStaff" class="venues-toolbar-actions">
        <RouterLink :to="`/venues/${venueState.venue.id}/edit`" class="button button-secondary">Edit venue</RouterLink>
      </div>
    </div>

    <p v-if="venueState.status === 'loading'" class="panel venues-panel" role="status">Loading the venue…</p>
    <div v-else-if="venueState.status === 'error'" class="panel venues-panel venues-state" role="alert">
      <p>{{ venueState.message }}</p>
      <RouterLink v-if="venueState.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else-if="venueState.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
    </div>

    <div v-else class="venues-detail-grid">
      <section class="panel venues-panel" aria-labelledby="venue-about-title">
        <div class="venues-heading-row">
          <h2 id="venue-about-title">About this venue</h2>
          <span v-if="!venueState.venue.isActive" class="venues-badge venues-badge--warn">Inactive</span>
        </div>
        <p class="venues-gap venues-prose" v-if="venueState.venue.description">{{ venueState.venue.description }}</p>
        <dl class="venues-facts venues-gap">
          <dt>Location</dt><dd>{{ venueState.venue.location || 'Not provided' }}</dd>
          <dt>Capacity</dt><dd>{{ venueState.venue.capacity }} people</dd>
          <dt>Operating hours</dt><dd>{{ formatOperatingHours(venueState.venue.opensAt, venueState.venue.closesAt) }}</dd>
          <dt>Step-free access</dt><dd>{{ venueState.venue.wheelchairAccessible ? 'Wheelchair accessible' : 'Not listed' }}</dd>
          <dt>Layouts</dt><dd>{{ venueState.venue.layouts.join(', ') || 'Not listed' }}</dd>
          <dt>Facilities</dt><dd>{{ venueState.venue.facilities.join(', ') || 'Not listed' }}</dd>
          <dt>Accessibility</dt><dd>{{ venueState.venue.accessibilityFeatures.join(', ') || 'Not listed' }}</dd>
        </dl>
      </section>

      <section class="panel venues-panel" aria-labelledby="venue-calendar-title">
        <h2 id="venue-calendar-title">Availability</h2>
        <p class="venues-muted">Week of {{ weekLabel }}. Approved bookings and blocked periods are shown as busy.</p>
        <div class="venues-week-nav" role="group" aria-label="Change week">
          <button type="button" class="button button-secondary" :disabled="calendar.status === 'loading'" @click="changeWeek(-1)">Previous week</button>
          <button type="button" class="button button-secondary" :disabled="calendar.status === 'loading' || weekOffset === 0" @click="changeWeek(0)">This week</button>
          <button type="button" class="button button-secondary" :disabled="calendar.status === 'loading'" @click="changeWeek(1)">Next week</button>
        </div>

        <p class="venues-gap" v-if="calendar.status === 'loading'" role="status">Loading availability…</p>
        <div v-else-if="calendar.status === 'error'" class="venues-state venues-gap" role="alert">
          <p>{{ calendar.message }}</p>
          <button type="button" class="button button-secondary" @click="loadCalendar">Try again</button>
        </div>
        <ol v-else class="venues-agenda">
          <li v-for="day in agenda" :key="day.start" class="venues-agenda-day">
            <h3>{{ day.label }}</h3>
            <p v-if="day.slots.length === 0" class="venues-muted">
              No bookings or blocks. {{ formatOperatingHours(calendar.availability.operatingHours.opensAt, calendar.availability.operatingHours.closesAt) }}.
            </p>
            <ul v-else class="venues-slots">
              <li v-for="slot in day.slots" :key="slot.key" class="venues-slot">
                <span class="venues-slot-time">{{ slot.label }}</span>
                <span class="venues-badge" :class="slot.kind === 'BLOCKED' ? 'venues-badge--blocked' : 'venues-badge--pending'">
                  {{ slot.kind === 'BLOCKED' ? 'Blocked' : 'Booked' }}
                </span>
                <span v-if="slot.detail">{{ slot.detail }}</span>
                <button
                  v-if="isStaff && slot.blockId" type="button" class="button button-danger-quiet" :disabled="saving"
                  :aria-label="`Remove block ${slot.label} on ${day.label}`" @click="removeBlock(slot.blockId)"
                >Remove block</button>
              </li>
            </ul>
          </li>
        </ol>

        <form v-if="isStaff" class="venues-form venues-gap-lg" aria-labelledby="venue-block-title" @submit.prevent="submitBlock">
          <h3 id="venue-block-title">Block a period</h3>
          <p class="venues-muted">Use for maintenance or closures. A period with an approved booking cannot be blocked.</p>
          <div class="venues-form-grid">
            <div class="venues-field">
              <label for="block-start">Starts</label>
              <input id="block-start" v-model="block.startsAt" type="datetime-local" required />
            </div>
            <div class="venues-field">
              <label for="block-end">Ends</label>
              <input id="block-end" v-model="block.endsAt" type="datetime-local" required />
            </div>
            <div class="venues-field">
              <label for="block-reason">Reason (optional)</label>
              <input id="block-reason" v-model="block.reason" type="text" maxlength="500" />
            </div>
          </div>
          <div class="venues-form-actions">
            <button type="submit" class="button button-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Block period' }}</button>
          </div>
        </form>
        <p v-if="blockError" class="venues-error venues-gap" role="alert">{{ blockError }}</p>
        <p v-else-if="blockNotice" class="venues-success venues-gap" role="status">{{ blockNotice }}</p>
      </section>
    </div>
  </div>
</template>
