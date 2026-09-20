<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import '../venues.css';
import { authSession } from '../../auth/session.js';
import { fetchVenues, type Venue, type VenueFilters } from '../api/venues';
import {
  describeLoadFailure, formatOperatingHours, singaporeInputToIso, splitTags, type LoadFailure,
} from '../presentation';

type LoadState =
  | { status: 'loading' }
  | ({ status: 'error' } & LoadFailure)
  | { status: 'ready'; venues: Venue[] };

const state = ref<LoadState>({ status: 'loading' });
const form = reactive({
  q: '', minCapacity: '', layout: '', facilities: '', accessibilityFeatures: '',
  wheelchairAccessible: false, availableFrom: '', availableTo: '',
});
const filterError = ref('');
const applied = ref<VenueFilters>({});
const isStaff = computed(() => authSession.user?.role === 'VENUE_STAFF');
const filtered = computed(() => Object.keys(applied.value).length > 0);
let controller: AbortController | undefined;

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const venues = await fetchVenues(applied.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', venues };
  } catch (error) {
    if (!current.signal.aborted) state.value = { status: 'error', ...describeLoadFailure(error, 'venues') };
  }
}

function search() {
  filterError.value = '';
  const filters: VenueFilters = {};
  if (form.q.trim()) filters.q = form.q.trim();
  if (String(form.minCapacity).trim()) {
    const capacity = Number(form.minCapacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      filterError.value = 'Minimum capacity must be a whole number of at least 1.';
      return;
    }
    filters.minCapacity = capacity;
  }
  if (form.layout.trim()) filters.layout = form.layout.trim();
  if (splitTags(form.facilities).length) filters.facilities = splitTags(form.facilities);
  if (splitTags(form.accessibilityFeatures).length) {
    filters.accessibilityFeatures = splitTags(form.accessibilityFeatures);
  }
  if (form.wheelchairAccessible) filters.wheelchairAccessible = true;
  if (form.availableFrom || form.availableTo) {
    const from = singaporeInputToIso(form.availableFrom);
    const to = singaporeInputToIso(form.availableTo);
    if (!from || !to) {
      filterError.value = 'Enter both a start and an end to search by availability.';
      return;
    }
    if (to <= from) {
      filterError.value = 'The availability end must be later than the start.';
      return;
    }
    filters.availableFrom = from;
    filters.availableTo = to;
  }
  applied.value = filters;
  void load();
}

function clearFilters() {
  Object.assign(form, {
    q: '', minCapacity: '', layout: '', facilities: '', accessibilityFeatures: '',
    wheelchairAccessible: false, availableFrom: '', availableTo: '',
  });
  filterError.value = '';
  applied.value = {};
  void load();
}

watch(() => authSession.user?.id, () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <div class="venues-ui">
    <section class="page-heading">
      <p class="eyebrow">Venues</p>
      <h1>Venue catalogue</h1>
      <p class="page-description">Find a space by capacity, facilities, accessibility and availability.</p>
    </section>

    <div v-if="isStaff" class="venues-toolbar">
      <p class="venues-muted">You manage this catalogue. Inactive venues are visible only to venue staff.</p>
      <div class="venues-toolbar-actions">
        <RouterLink to="/venue-bookings" class="button button-secondary">Booking requests</RouterLink>
        <RouterLink to="/venues/new" class="button button-primary">Add venue</RouterLink>
      </div>
    </div>

    <form class="panel venues-panel venues-form" aria-labelledby="venue-filter-title" @submit.prevent="search">
      <h2 id="venue-filter-title">Search and filter</h2>
      <div class="venues-form-grid">
        <div class="venues-field">
          <label for="venue-q">Name, location or description</label>
          <input id="venue-q" v-model="form.q" type="search" maxlength="100" autocomplete="off" />
        </div>
        <div class="venues-field">
          <label for="venue-capacity">Minimum capacity</label>
          <input id="venue-capacity" v-model="form.minCapacity" type="number" min="1" step="1" inputmode="numeric" />
        </div>
        <div class="venues-field">
          <label for="venue-layout">Layout</label>
          <input id="venue-layout" v-model="form.layout" type="text" maxlength="80" placeholder="e.g. Theatre" />
        </div>
        <div class="venues-field">
          <label for="venue-facilities">Required facilities</label>
          <input id="venue-facilities" v-model="form.facilities" type="text" aria-describedby="venue-facilities-hint" placeholder="e.g. Projector, Stage" />
          <p id="venue-facilities-hint" class="venues-hint">Separate with commas. Venues must have all of them, spelt as listed.</p>
        </div>
        <div class="venues-field">
          <label for="venue-accessibility">Accessibility features</label>
          <input id="venue-accessibility" v-model="form.accessibilityFeatures" type="text" placeholder="e.g. Hearing loop" />
        </div>
        <div class="venues-field">
          <span class="venues-label">Step-free access</span>
          <label class="venues-check"><input v-model="form.wheelchairAccessible" type="checkbox" /> Wheelchair accessible only</label>
        </div>
        <div class="venues-field">
          <label for="venue-from">Available from</label>
          <input id="venue-from" v-model="form.availableFrom" type="datetime-local" aria-describedby="venue-time-hint" />
        </div>
        <div class="venues-field">
          <label for="venue-to">Available until</label>
          <input id="venue-to" v-model="form.availableTo" type="datetime-local" aria-describedby="venue-time-hint" />
          <p id="venue-time-hint" class="venues-hint">Singapore time. Excludes venues with an approved booking or blocked period.</p>
        </div>
      </div>
      <p v-if="filterError" class="venues-error" role="alert">{{ filterError }}</p>
      <div class="venues-form-actions">
        <button type="submit" class="button button-primary" :disabled="state.status === 'loading'">Search venues</button>
        <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="clearFilters">Clear filters</button>
      </div>
    </form>

    <section class="venues-results" aria-labelledby="venue-results-title">
      <h2 id="venue-results-title" class="sr-only">Venues</h2>
      <p v-if="state.status === 'loading'" class="panel venues-panel" role="status">Loading venues…</p>

      <div v-else-if="state.status === 'error'" class="panel venues-panel venues-state" role="alert">
        <p>{{ state.message }}</p>
        <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
        <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
      </div>

      <div v-else-if="state.venues.length === 0" class="panel venues-empty">
        <h2>{{ filtered ? 'No venues match these filters' : 'No venues have been added yet' }}</h2>
        <p class="venues-muted">
          {{ filtered ? 'Try removing a filter or widening the availability period.' : 'Venues added by venue staff will appear here.' }}
        </p>
      </div>

      <template v-else>
        <p class="venues-muted" role="status">{{ state.venues.length }} {{ state.venues.length === 1 ? 'venue' : 'venues' }} found</p>
        <ul class="venues-cards">
          <li v-for="venue in state.venues" :key="venue.id" class="panel venues-card">
            <div class="venues-heading-row">
              <h3>{{ venue.name }}</h3>
              <span v-if="!venue.isActive" class="venues-badge venues-badge--warn">Inactive</span>
            </div>
            <p v-if="venue.location" class="venues-muted">{{ venue.location }}</p>
            <dl class="venues-facts">
              <dt>Capacity</dt><dd>{{ venue.capacity }}</dd>
              <dt>Hours</dt><dd>{{ formatOperatingHours(venue.opensAt, venue.closesAt) }}</dd>
              <dt>Step-free</dt><dd>{{ venue.wheelchairAccessible ? 'Wheelchair accessible' : 'Not listed' }}</dd>
              <template v-if="venue.layouts.length"><dt>Layouts</dt><dd>{{ venue.layouts.join(', ') }}</dd></template>
            </dl>
            <ul v-if="venue.facilities.length" class="venues-tags" :aria-label="`Facilities at ${venue.name}`">
              <li v-for="facility in venue.facilities" :key="facility">{{ facility }}</li>
            </ul>
            <div class="venues-card-actions">
              <RouterLink :to="`/venues/${venue.id}`" class="venues-link" :aria-label="`View ${venue.name} details and availability`">Details and availability</RouterLink>
              <RouterLink v-if="isStaff" :to="`/venues/${venue.id}/edit`" class="venues-link" :aria-label="`Manage ${venue.name}`">Manage</RouterLink>
            </div>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>
