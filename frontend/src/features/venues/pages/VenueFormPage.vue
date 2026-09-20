<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import '../venues.css';
import { ApiError } from '../../../lib/api-client';
import { authSession } from '../../auth/session.js';
import { createVenue, fetchVenue, updateVenue, type VenueInput } from '../api/venues';
import { describeActionFailure, describeLoadFailure, splitTags, type LoadFailure } from '../presentation';

type LoadState = { status: 'loading' } | ({ status: 'error' } & LoadFailure) | { status: 'ready' };

const route = useRoute();
const router = useRouter();
const venueId = computed(() => (route.params.id ? String(route.params.id) : null));
const isStaff = computed(() => authSession.user?.role === 'VENUE_STAFF');
const state = ref<LoadState>({ status: 'loading' });
const form = reactive({
  name: '', description: '', location: '', capacity: '', layouts: '', facilities: '',
  accessibilityFeatures: '', wheelchairAccessible: false, opensAt: '', closesAt: '', isActive: true,
});
const errors = reactive<{ name: string; capacity: string; hours: string; form: string }>({
  name: '', capacity: '', hours: '', form: '',
});
const saving = ref(false);
let controller: AbortController | undefined;

async function load() {
  controller?.abort();
  if (!venueId.value) { state.value = { status: 'ready' }; return; }
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const venue = await fetchVenue(venueId.value, current.signal);
    if (current.signal.aborted) return;
    Object.assign(form, {
      name: venue.name, description: venue.description ?? '', location: venue.location ?? '',
      capacity: String(venue.capacity), layouts: venue.layouts.join(', '), facilities: venue.facilities.join(', '),
      accessibilityFeatures: venue.accessibilityFeatures.join(', '),
      wheelchairAccessible: venue.wheelchairAccessible, opensAt: venue.opensAt ?? '', closesAt: venue.closesAt ?? '',
      isActive: venue.isActive,
    });
    state.value = { status: 'ready' };
  } catch (error) {
    if (!current.signal.aborted) state.value = { status: 'error', ...describeLoadFailure(error, 'this venue') };
  }
}

function validate(): VenueInput | null {
  Object.assign(errors, { name: '', capacity: '', hours: '', form: '' });
  const capacity = Number(form.capacity);
  if (!form.name.trim()) errors.name = 'Enter the venue name.';
  if (!String(form.capacity).trim() || !Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = 'Enter the capacity as a whole number of at least 1.';
  }
  if (form.opensAt && form.closesAt && form.closesAt <= form.opensAt) {
    errors.hours = 'The closing time must be later than the opening time.';
  }
  if (errors.name || errors.capacity || errors.hours) return null;
  return {
    name: form.name.trim(), description: form.description.trim() || null, location: form.location.trim() || null,
    capacity, layouts: splitTags(form.layouts), facilities: splitTags(form.facilities),
    accessibilityFeatures: splitTags(form.accessibilityFeatures), wheelchairAccessible: form.wheelchairAccessible,
    opensAt: form.opensAt || null, closesAt: form.closesAt || null, isActive: form.isActive,
  };
}

async function save() {
  const input = validate();
  if (!input) return;
  saving.value = true;
  try {
    const saved = venueId.value ? await updateVenue(venueId.value, input) : await createVenue(input);
    await router.push(`/venues/${saved.id}`);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'VENUE_NAME_TAKEN') errors.name = 'Another venue already uses this name.';
    else errors.form = describeActionFailure(error, 'The venue could not be saved. Please try again.');
  } finally {
    saving.value = false;
  }
}

watch([venueId, () => authSession.user?.id], () => { void load(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <div class="venues-ui">
    <section class="page-heading">
      <p class="eyebrow">For venue staff</p>
      <h1>{{ venueId ? 'Edit venue' : 'Add venue' }}</h1>
      <p class="page-description">Catalogue details are used for search, suitability checks and bookings.</p>
    </section>

    <div class="venues-toolbar">
      <RouterLink :to="venueId ? `/venues/${venueId}` : '/venues'" class="venues-link">
        {{ venueId ? 'Back to venue' : 'Back to venue catalogue' }}
      </RouterLink>
    </div>

    <p v-if="authSession.loading" class="panel venues-panel" role="status">Checking your session…</p>
    <div v-else-if="!authSession.user" class="panel venues-panel venues-state" role="alert">
      <p>Sign in as venue staff to manage venues.</p>
      <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
    </div>
    <p v-else-if="!isStaff" class="panel venues-panel" role="alert">Only venue staff can add or edit venues.</p>
    <p v-else-if="state.status === 'loading'" class="panel venues-panel" role="status">Loading the venue…</p>
    <div v-else-if="state.status === 'error'" class="panel venues-panel venues-state" role="alert">
      <p>{{ state.message }}</p>
      <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
    </div>

    <form v-else class="panel venues-panel venues-form" novalidate :aria-busy="saving" @submit.prevent="save">
      <div class="venues-form-grid">
        <div class="venues-field">
          <label for="venue-name">Name</label>
          <input id="venue-name" v-model="form.name" type="text" maxlength="200" required :aria-invalid="Boolean(errors.name)" :aria-describedby="errors.name ? 'venue-name-error' : undefined" />
          <p v-if="errors.name" id="venue-name-error" class="venues-error" role="alert">{{ errors.name }}</p>
        </div>
        <div class="venues-field">
          <label for="venue-location">Location</label>
          <input id="venue-location" v-model="form.location" type="text" maxlength="300" />
        </div>
        <div class="venues-field">
          <label for="venue-capacity-input">Capacity</label>
          <input id="venue-capacity-input" v-model="form.capacity" type="number" min="1" step="1" inputmode="numeric" required :aria-invalid="Boolean(errors.capacity)" :aria-describedby="errors.capacity ? 'venue-capacity-error' : undefined" />
          <p v-if="errors.capacity" id="venue-capacity-error" class="venues-error" role="alert">{{ errors.capacity }}</p>
        </div>
      </div>

      <div class="venues-field">
        <label for="venue-description">Description</label>
        <textarea id="venue-description" v-model="form.description" rows="3" maxlength="4000" />
      </div>

      <div class="venues-form-grid">
        <div class="venues-field">
          <label for="venue-layouts">Layouts</label>
          <input id="venue-layouts" v-model="form.layouts" type="text" aria-describedby="venue-tags-hint" placeholder="Theatre, Banquet" />
        </div>
        <div class="venues-field">
          <label for="venue-facilities-input">Facilities</label>
          <input id="venue-facilities-input" v-model="form.facilities" type="text" aria-describedby="venue-tags-hint" placeholder="Projector, Stage" />
        </div>
        <div class="venues-field">
          <label for="venue-accessibility-input">Accessibility features</label>
          <input id="venue-accessibility-input" v-model="form.accessibilityFeatures" type="text" aria-describedby="venue-tags-hint" placeholder="Hearing loop, Accessible toilet" />
        </div>
      </div>
      <p id="venue-tags-hint" class="venues-hint">Separate list items with commas.</p>

      <fieldset class="venues-fieldset">
        <legend>Operating hours (Singapore time)</legend>
        <div class="venues-form-grid">
          <div class="venues-field">
            <label for="venue-opens">Opens</label>
            <input id="venue-opens" v-model="form.opensAt" type="time" :aria-invalid="Boolean(errors.hours)" />
          </div>
          <div class="venues-field">
            <label for="venue-closes">Closes</label>
            <input id="venue-closes" v-model="form.closesAt" type="time" :aria-invalid="Boolean(errors.hours)" :aria-describedby="errors.hours ? 'venue-hours-error' : 'venue-hours-hint'" />
          </div>
        </div>
        <p v-if="errors.hours" id="venue-hours-error" class="venues-error" role="alert">{{ errors.hours }}</p>
        <p v-else id="venue-hours-hint" class="venues-hint">Leave both empty if the venue has no restriction.</p>
      </fieldset>

      <label class="venues-check"><input v-model="form.wheelchairAccessible" type="checkbox" /> Wheelchair accessible</label>
      <label class="venues-check"><input v-model="form.isActive" type="checkbox" /> Active and open for bookings</label>

      <p v-if="errors.form" class="venues-error" role="alert">{{ errors.form }}</p>
      <div class="venues-form-actions">
        <button type="submit" class="button button-primary" :disabled="saving">
          {{ saving ? 'Saving…' : venueId ? 'Save changes' : 'Create venue' }}
        </button>
        <RouterLink :to="venueId ? `/venues/${venueId}` : '/venues'" class="button button-secondary">Cancel</RouterLink>
      </div>
    </form>
  </div>
</template>
