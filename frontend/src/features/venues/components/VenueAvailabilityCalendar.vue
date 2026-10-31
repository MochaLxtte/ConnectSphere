<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { clearLocalSession } from '../../auth/session.js';
import { fetchVenueAvailability, type VenueAvailability } from '../api/availability';
import {
  addDays, formatOpeningHours, formatWeek, parseDateKey, singaporeDateKey, startOfWeek, weekWindow,
} from '../availability';
import VenueWeekTimeline from './VenueWeekTimeline.vue';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retryable: boolean }
  | { status: 'ready'; venues: VenueAvailability[] };

const route = useRoute();
const router = useRouter();
const id = useId();
const today = singaporeDateKey(Date.now());
const currentWeek = startOfWeek(today);
// A shared link or reload reopens the same week and venue.
const weekStart = ref(startOfWeek(parseDateKey(route.query.week) ?? today));
const requestedVenueId = ref(typeof route.query.venue === 'string' ? route.query.venue : '');
const jumpDate = ref('');
const state = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

const venues = computed(() => (state.value.status === 'ready' ? state.value.venues : []));
const selectedVenue = computed(() =>
  venues.value.find((venue) => venue.id === requestedVenueId.value) ?? venues.value[0] ?? null);
const chosenVenueId = computed({
  get: () => selectedVenue.value?.id ?? '',
  set: (venueId: string) => {
    requestedVenueId.value = venueId;
    rememberSelection();
  },
});

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  // Drop the previous week so its periods cannot be mistaken for the one being loaded.
  state.value = { status: 'loading' };
  try {
    const { from, to } = weekWindow(weekStart.value);
    const result = await fetchVenueAvailability(from, to, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', venues: result.items };
  } catch (error) {
    if (current.signal.aborted) return;
    // The page replaces this calendar with its sign-in prompt once the session is cleared.
    if (error instanceof ApiError && error.status === 401) clearLocalSession();
    const forbidden = error instanceof ApiError && error.status === 403;
    state.value = {
      status: 'error', retryable: !forbidden,
      message: forbidden
        ? 'Venue availability is for event coordinators, venue staff and technical support staff.'
        : error instanceof Error ? error.message : 'Venue availability could not be loaded. Please try again.',
    };
  }
}

function rememberSelection() {
  const venue = selectedVenue.value?.id ?? (requestedVenueId.value || undefined);
  void router.replace({ query: { ...route.query, week: weekStart.value, venue } });
}

function showWeek(start: string) {
  weekStart.value = start;
  rememberSelection();
  void load();
}

function jumpToDate() {
  const day = parseDateKey(jumpDate.value);
  if (day) showWeek(startOfWeek(day));
}

// Vue Router reuses this calendar for links and history entries with different query values.
watch(() => [route.query.week, route.query.venue] as const, ([week, venue]) => {
  const nextWeek = startOfWeek(parseDateKey(week) ?? today);
  const weekChanged = nextWeek !== weekStart.value;
  weekStart.value = nextWeek;
  requestedVenueId.value = typeof venue === 'string' ? venue : '';
  if (weekChanged) void load();
});

onMounted(load);
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="panel calendar-toolbar" aria-label="Choose a week">
    <div class="week-navigation">
      <button type="button" class="button button-secondary" :disabled="state.status === 'loading'"
        @click="showWeek(addDays(weekStart, -7))">Previous week</button>
      <button type="button" class="button button-secondary" :disabled="state.status === 'loading' || weekStart === currentWeek"
        @click="showWeek(currentWeek)">This week</button>
      <button type="button" class="button button-secondary" :disabled="state.status === 'loading'"
        @click="showWeek(addDays(weekStart, 7))">Next week</button>
    </div>
    <div class="toolbar-end">
      <label :for="`${id}-date`" class="jump-label">Go to date</label>
      <input :id="`${id}-date`" v-model="jumpDate" type="date" max="9999-12-31" class="jump-input" @change="jumpToDate" />
      <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load">
        <AppIcon name="refresh" :size="16" />Refresh
      </button>
    </div>
    <p class="week-label">
      Week of <strong>{{ formatWeek(weekStart) }}</strong> · Singapore time
    </p>
  </section>

  <section class="panel calendar-panel" :aria-labelledby="`${id}-venue`">
    <p v-if="state.status === 'loading'" :id="`${id}-venue`" role="status">Loading venue availability…</p>

    <div v-else-if="state.status === 'error'" class="calendar-error" role="alert">
      <p :id="`${id}-venue`">{{ state.message }}</p>
      <button v-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
    </div>

    <div v-else-if="!selectedVenue" class="feature-placeholder">
      <div class="empty-illustration"><AppIcon name="availability" :size="38" /></div>
      <h2 :id="`${id}-venue`">No venues in the catalogue yet</h2>
      <p>Active venues and their availability will appear here once they are added to the catalogue.</p>
    </div>

    <template v-else>
      <header class="venue-header">
        <div class="venue-picker">
          <label :for="`${id}-select`">Venue</label>
          <select :id="`${id}-select`" v-model="chosenVenueId">
            <option v-for="venue in venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option>
          </select>
        </div>
        <div class="venue-summary">
          <h2 :id="`${id}-venue`">{{ selectedVenue.name }}</h2>
          <p class="venue-meta">
            {{ selectedVenue.location?.trim() || 'Location not listed' }} · Up to {{ selectedVenue.capacity }} people ·
            {{ formatOpeningHours(selectedVenue) }}
          </p>
        </div>
      </header>
      <VenueWeekTimeline :venue="selectedVenue" :week-start="weekStart" :today="today" />
    </template>
  </section>
</template>

<style scoped>
.calendar-toolbar {
  padding: 18px 24px; margin-bottom: 20px; display: flex; flex-wrap: wrap; align-items: center;
  justify-content: space-between; gap: 12px 16px;
}
.week-navigation, .toolbar-end { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.calendar-toolbar button:disabled { cursor: not-allowed; }
.jump-label { font-size: 12px; font-weight: 600; color: #52614e; }
.jump-input, .venue-picker select {
  padding: 7px 10px; border: 1px solid #87958c; border-radius: 6px; font: inherit; font-size: 13px;
  color: inherit; background: #fff;
}
.jump-input:focus-visible, .venue-picker select:focus-visible { outline: 3px solid #90a950; outline-offset: 3px; }
.week-label { flex-basis: 100%; color: #59685e; font-size: 13px; }
.week-label strong { color: #293a33; font-weight: 650; }
.calendar-panel { padding: 24px; min-width: 0; }
.calendar-error .button { margin-top: 12px; }
.venue-header { display: grid; gap: 20px; }
.venue-summary { min-width: 0; }
.venue-summary h2 { font-size: 19px; line-height: 1.5; overflow-wrap: anywhere; }
.venue-meta { color: #59685e; font-size: 13px; line-height: 1.6; margin-top: 4px; }
.venue-picker { display: grid; gap: 6px; width: min(100%, 320px); }
.venue-picker label { font-size: 12px; font-weight: 600; color: #52614e; }
@media (max-width: 600px) {
  .calendar-toolbar, .calendar-panel { padding: 20px; }
  .venue-picker { width: 100%; }
}
</style>
