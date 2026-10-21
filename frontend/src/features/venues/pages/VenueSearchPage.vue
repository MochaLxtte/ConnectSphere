<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { formatEventTime } from '../../events/presentation';
import {
  emptyFilters, fetchVenueFilterOptions, hasActiveFilters, periodHasErrors, searchVenues, validatePeriod,
  type VenueFilterOptions, type VenueFilters, type VenueResult,
} from '../api/venues';

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'ready'; items: VenueResult[]; filtered: boolean };

const filters = reactive<VenueFilters>(emptyFilters());
const options = ref<VenueFilterOptions>({ layouts: [], facilities: [], accessibility: [] });
const optionsFailed = ref(false);
const state = ref<SearchState>({ status: 'idle' });
let controller: AbortController | undefined;
let optionsController: AbortController | undefined;

const isCoordinator = computed(
  () => !authSession.loading && authSession.user?.role === 'EVENT_COORDINATOR',
);

/**
 * A browser reports a half-typed or impossible date as an empty value, so remember when an input
 * holds text it could not read; otherwise the field would look "left blank" instead of "not a real date".
 */
const unreadable = reactive({ startsAt: false, endsAt: false });

function noteUnreadable(field: 'startsAt' | 'endsAt', event: Event) {
  unreadable[field] = (event.target as HTMLInputElement | null)?.validity?.badInput === true;
}

// KAN-12-AC14 / AC101: field-level feedback, and no search is sent while the period is invalid.
const periodErrors = computed(() => validatePeriod(filters.startsAt, filters.endsAt, unreadable));
const periodInvalid = computed(() => periodHasErrors(periodErrors.value));

function showSignIn() {
  controller?.abort();
  state.value = {
    status: 'error', signIn: true, retryable: false,
    message: 'Sign in to search venues.',
  };
}

async function search() {
  if (periodInvalid.value) return;
  // A newer search always wins: aborting the older one makes its late answer get ignored below (KAN-12-AC15).
  controller?.abort();
  const current = new AbortController();
  controller = current;
  // Search with a copy so edits made while the request runs don't change what "applied" means.
  const applied: VenueFilters = {
    ...filters, accessibility: [...filters.accessibility], facilities: [...filters.facilities],
  };
  // Drop earlier results so they can never be mistaken for the newly applied filters.
  state.value = { status: 'loading' };
  try {
    const items = await searchVenues(applied, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items, filtered: hasActiveFilters(applied) };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      showSignIn();
      return;
    }
    const forbidden = error instanceof ApiError && error.status === 403;
    state.value = {
      status: 'error', signIn: false, retryable: !forbidden,
      message: forbidden ? 'This page is for event coordinators.'
        : error instanceof Error ? error.message : 'Venues could not be loaded. Please try again.',
    };
  }
}

async function loadOptions() {
  optionsController?.abort();
  const current = new AbortController();
  optionsController = current;
  optionsFailed.value = false;
  try {
    const loaded = await fetchVenueFilterOptions(current.signal);
    if (!current.signal.aborted) options.value = loaded;
  } catch {
    // The other filters still work; only the layout, facility and accessibility lists are missing.
    if (!current.signal.aborted) optionsFailed.value = true;
  }
}

function clearFilters() {
  Object.assign(filters, emptyFilters());
  unreadable.startsAt = false;
  unreadable.endsAt = false;
  void search();
}

function hoursLabel(venue: VenueResult): string {
  if (venue.opensAt && venue.closesAt) return `${venue.opensAt} to ${venue.closesAt}`;
  if (venue.opensAt) return `From ${venue.opensAt}`;
  if (venue.closesAt) return `Until ${venue.closesAt}`;
  return 'Not listed';
}

// Wait for the session, then load for coordinators; reset if the account changes or signs out.
watch(
  () => [authSession.loading, authSession.user?.id, authSession.user?.role],
  () => {
    if (authSession.loading) return;
    if (!authSession.user) {
      showSignIn();
      return;
    }
    if (authSession.user.role !== 'EVENT_COORDINATOR') {
      controller?.abort();
      state.value = { status: 'idle' };
      return;
    }
    Object.assign(filters, emptyFilters());
    unreadable.startsAt = false;
    unreadable.endsAt = false;
    void loadOptions();
    void search();
  },
  { immediate: true, flush: 'sync' },
);
onBeforeUnmount(() => {
  controller?.abort();
  optionsController?.abort();
});
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For coordinators</p>
    <h1>Search venues</h1>
    <p class="page-description">
      Find venues that fit an event's requirements. Results come from the current venue catalogue.
    </p>
  </section>

  <p v-if="authSession.loading" role="status">Checking your access…</p>

  <div v-else-if="!authSession.user" class="panel venue-notice" role="alert">
    <p>Sign in to search venues.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>

  <p v-else-if="!isCoordinator" class="panel venue-notice" role="alert">
    This page is for event coordinators.
  </p>

  <template v-else>
    <form class="panel venue-filters" aria-label="Venue filters" @submit.prevent="search">
      <div class="filter-grid">
        <div class="field">
          <label for="venue-start">Event start (Singapore time)</label>
          <input
            id="venue-start" v-model="filters.startsAt" type="datetime-local"
            :aria-invalid="periodErrors.startsAt !== ''"
            :aria-describedby="periodErrors.startsAt ? 'venue-start-error' : undefined"
            @input="noteUnreadable('startsAt', $event)"
          />
          <p v-if="periodErrors.startsAt" id="venue-start-error" class="field-error" role="alert">{{ periodErrors.startsAt }}</p>
        </div>
        <div class="field">
          <label for="venue-end">Event end (Singapore time)</label>
          <input
            id="venue-end" v-model="filters.endsAt" type="datetime-local"
            :aria-invalid="periodErrors.endsAt !== ''"
            :aria-describedby="periodErrors.endsAt ? 'venue-end-error' : undefined"
            @input="noteUnreadable('endsAt', $event)"
          />
          <p v-if="periodErrors.endsAt" id="venue-end-error" class="field-error" role="alert">{{ periodErrors.endsAt }}</p>
        </div>
        <p class="field-hint wide">
          Venues with opening hours only match events that start and end on the same day within those hours.
          Venues with an approved booking in this period are excluded.
        </p>

        <div class="field">
          <label for="venue-attendance">Expected attendance</label>
          <input id="venue-attendance" v-model="filters.attendance" type="number" min="1" step="1" inputmode="numeric" />
        </div>
        <div class="field">
          <label for="venue-capacity">Minimum capacity</label>
          <input id="venue-capacity" v-model="filters.capacity" type="number" min="1" step="1" inputmode="numeric" />
        </div>

        <div class="field">
          <label for="venue-location">Location</label>
          <input id="venue-location" v-model="filters.location" type="text" maxlength="100" placeholder="Area, address or venue name" />
        </div>
        <div class="field">
          <label for="venue-layout">Room layout</label>
          <select id="venue-layout" v-model="filters.layout">
            <option value="">Any layout</option>
            <option v-for="layout in options.layouts" :key="layout" :value="layout">{{ layout }}</option>
          </select>
        </div>
      </div>

      <fieldset class="check-group">
        <legend>Accessibility</legend>
        <label class="check">
          <input v-model="filters.wheelchairAccessible" type="checkbox" />Wheelchair accessible
        </label>
        <label v-for="feature in options.accessibility" :key="feature" class="check">
          <input v-model="filters.accessibility" type="checkbox" :value="feature" />{{ feature }}
        </label>
      </fieldset>

      <fieldset v-if="options.facilities.length > 0" class="check-group">
        <legend>Required facilities</legend>
        <label v-for="facility in options.facilities" :key="facility" class="check">
          <input v-model="filters.facilities" type="checkbox" :value="facility" />{{ facility }}
        </label>
      </fieldset>

      <p v-if="optionsFailed" class="field-hint" role="status">
        The room layout, accessibility and facility lists could not be loaded, so you can't choose those filters
        right now. The other filters still work.
      </p>

      <div class="filter-actions">
        <button type="submit" class="button button-primary" :disabled="periodInvalid">
          <AppIcon name="review" :size="16" />Search venues
        </button>
        <button type="button" class="button button-secondary" @click="clearFilters">
          Clear filters
        </button>
      </div>
    </form>

    <section class="panel venue-results" aria-labelledby="venue-results-title">
      <header class="venue-results-header">
        <h2 id="venue-results-title">Matching venues</h2>
        <p v-if="state.status === 'ready'" role="status">
          {{ state.items.length }} {{ state.items.length === 1 ? 'venue' : 'venues' }} found
        </p>
      </header>

      <p v-if="state.status === 'loading' || state.status === 'idle'" role="status">Loading venues…</p>

      <div v-else-if="state.status === 'error'" class="venue-error" role="alert">
        <p>{{ state.message }}</p>
        <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
        <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="search">Try again</button>
      </div>

      <div v-else-if="state.items.length === 0" class="feature-placeholder" role="status">
        <div class="empty-illustration"><AppIcon name="review" :size="38" /></div>
        <template v-if="state.filtered">
          <h2>No venue matches these filters</h2>
          <p>
            No venue in the catalogue meets every filter you applied. Change or clear a filter to widen the search.
            This doesn't affect the event request. You decide how to proceed.
          </p>
          <button type="button" class="button button-secondary" @click="clearFilters">Clear filters</button>
        </template>
        <template v-else>
          <h2>No venues in the catalogue yet</h2>
          <p>Venues will appear here once they are added to the catalogue.</p>
        </template>
      </div>

      <ul v-else class="venue-list" aria-label="Matching venues">
        <li v-for="venue in state.items" :key="venue.id" class="venue-item">
          <div class="venue-heading">
            <h3>{{ venue.name }}</h3>
            <span class="venue-capacity">Up to {{ venue.capacity }} guests</span>
          </div>
          <p class="venue-address">{{ venue.location || 'Location not listed' }}</p>
          <p v-if="venue.description" class="venue-description">{{ venue.description }}</p>

          <dl class="venue-details">
            <div>
              <dt>Opening hours</dt>
              <dd>{{ hoursLabel(venue) }}</dd>
            </div>
            <div v-if="venue.layouts.length > 0">
              <dt>Room layouts</dt>
              <dd><span v-for="layout in venue.layouts" :key="layout" class="tag">{{ layout }}</span></dd>
            </div>
            <div v-if="venue.facilities.length > 0">
              <dt>Facilities</dt>
              <dd><span v-for="facility in venue.facilities" :key="facility" class="tag">{{ facility }}</span></dd>
            </div>
            <div v-if="venue.wheelchairAccessible || venue.accessibilityFeatures.length > 0">
              <dt>Accessibility</dt>
              <dd>
                <span v-if="venue.wheelchairAccessible" class="tag">Wheelchair accessible</span>
                <span v-for="feature in venue.accessibilityFeatures" :key="feature" class="tag">{{ feature }}</span>
              </dd>
            </div>
          </dl>
          <p class="venue-updated">
            Catalogue entry updated
            <time :datetime="venue.updatedAt">{{ formatEventTime(venue.updatedAt, 'at an unknown time') }}</time>
          </p>
        </li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
.venue-filters, .venue-results, .venue-notice { padding: 24px; }
.venue-filters { margin-bottom: 24px; display: grid; gap: 20px; }
.venue-notice .button { margin-top: 12px; }
.filter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.field { display: grid; gap: 6px; min-width: 0; }
.field label, .check-group legend { font-size: 13px; font-weight: 600; }
.field input, .field select {
  width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit;
  border: 1px solid var(--border); border-radius: 8px; background: #fff;
}
.field input[aria-invalid='true'] { border-color: #853e37; }
.field-error { color: #853e37; font-size: 13px; margin: 0; }
.field-hint { color: #59685e; font-size: 13px; margin: 0; }
.field-hint.wide { grid-column: 1 / -1; }
.check-group { border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px 16px; margin: 0; display: flex; flex-wrap: wrap; gap: 8px 20px; }
.check-group legend { padding: 0 6px; }
.check { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
.filter-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.venue-results-header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.venue-results-header h2 { font-size: 18px; }
.venue-results-header p { color: #59685e; font-size: 13px; margin: 0; }
.venue-error .button { margin-top: 12px; }
.venue-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.venue-item { border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.venue-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.venue-heading h3 { font-size: 16px; font-weight: 600; overflow-wrap: anywhere; }
.venue-capacity { font-size: 13px; font-weight: 600; color: #365d2e; }
.venue-address { color: #59685e; font-size: 13px; margin: 4px 0 8px; }
.venue-description { font-size: 14px; line-height: 1.6; margin: 0 0 12px; overflow-wrap: anywhere; }
.venue-details { display: grid; gap: 8px; margin: 0; }
.venue-details div { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; }
.venue-details dt { font-size: 12px; font-weight: 600; min-width: 96px; }
.venue-details dd { margin: 0; display: flex; flex-wrap: wrap; gap: 6px; font-size: 13px; }
.tag { border-radius: 20px; padding: 3px 10px; background: #f2f3ed; color: #52614e; font-size: 12px; }
.venue-updated { color: #59685e; font-size: 12px; margin: 12px 0 0; }
@media (max-width: 600px) {
  .venue-filters, .venue-results, .venue-notice { padding: 20px; }
  .filter-grid { grid-template-columns: 1fr; }
}
</style>