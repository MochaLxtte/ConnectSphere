<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { fetchCatalogueVenue, updateCatalogueVenue, type CatalogueVenue } from '../api/venue-catalogue';
import {
  buildUpdate, MAX_BUFFER_MINUTES, toFormValues, validateForm, type CatalogueFormValues,
} from '../catalogue-form';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready' };

/** KAN-50-AC2-AC9, AC12: Venue Staff view one venue's information and save changes to it. */
const route = useRoute();
const venueId = computed(() => String(route.params.id));
const isStaff = computed(() => !authSession.loading && authSession.user?.role === 'VENUE_STAFF');

const state = ref<LoadState>({ status: 'idle' });
const venue = ref<CatalogueVenue | null>(null);
const form = reactive<CatalogueFormValues>({
  location: '', capacity: '', facilities: '', accessibilityFeatures: '',
  wheelchairAccessible: false, layouts: '', opensAt: '', closesAt: '',
  setupMinutes: '', turnaroundMinutes: '',
});
const busy = ref(false);
const actionError = ref('');
const savedMessage = ref('');
const bufferConflict = ref(false);
let controller: AbortController | undefined;

const errors = computed(() => validateForm(form));
const changes = computed(() => (venue.value ? buildUpdate(venue.value, form) : {}));
const hasChanges = computed(() => Object.keys(changes.value).length > 0);
const canSave = computed(() => !busy.value && hasChanges.value && Object.keys(errors.value).length === 0);

function show(saved: CatalogueVenue) {
  venue.value = saved;
  Object.assign(form, toFormValues(saved));
}

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  venue.value = null;
  actionError.value = '';
  savedMessage.value = '';
  bufferConflict.value = false;
  try {
    show(await fetchCatalogueVenue(venueId.value, current.signal));
    if (!current.signal.aborted) state.value = { status: 'ready' };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      return;
    }
    state.value = {
      status: 'error',
      message: error instanceof ApiError && error.code === 'VENUE_NOT_FOUND'
        ? 'This venue is not in the active catalogue.'
        : error instanceof Error ? error.message : 'The venue could not be loaded. Please try again.',
    };
  }
}

async function save() {
  if (!canSave.value || !venue.value) return;
  busy.value = true;
  actionError.value = '';
  savedMessage.value = '';
  bufferConflict.value = false;
  try {
    show(await updateCatalogueVenue(venue.value.id, changes.value));
    savedMessage.value = 'Venue information saved.';
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      return;
    }
    // KAN-77-AC5: nothing was saved; keep the typed values so they can be reapplied after a reload.
    bufferConflict.value = error instanceof ApiError && error.code === 'VENUE_BUFFER_CONFLICT';
    actionError.value = bufferConflict.value
      ? 'Someone else changed the setup or turnaround time after you opened this venue, so nothing was saved. Reload to see the current values, then make your change again.'
      : error instanceof Error ? error.message : 'The changes could not be saved.';
  } finally {
    busy.value = false;
  }
}

function discard() {
  if (!venue.value) return;
  Object.assign(form, toFormValues(venue.value));
  actionError.value = '';
  savedMessage.value = '';
}

watch(
  () => [authSession.loading, authSession.user?.id, authSession.user?.role, venueId.value],
  () => {
    if (authSession.loading) return;
    if (!isStaff.value) {
      controller?.abort();
      state.value = { status: 'idle' };
      venue.value = null;
      return;
    }
    void load();
  },
  { immediate: true, flush: 'sync' },
);
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For venue staff</p>
    <h1>{{ venue?.name ?? 'Edit venue' }}</h1>
    <p class="page-description">Update the information coordinators use to search for and assess this venue.</p>
  </section>

  <p v-if="authSession.loading" class="panel edit-panel" role="status">Checking your session…</p>
  <div v-else-if="!authSession.user" class="panel edit-panel" role="alert">
    <p>Sign in to maintain the venue catalogue.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>
  <p v-else-if="!isStaff" class="panel edit-panel" role="alert">The venue catalogue is for venue staff.</p>

  <template v-else>
    <p v-if="state.status === 'loading'" class="panel edit-panel" role="status">Loading the venue…</p>
    <div v-else-if="state.status === 'error'" class="panel edit-panel" role="alert">
      <p class="field-error">{{ state.message }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
      <RouterLink to="/venue-catalogue" class="button button-secondary">Back to the catalogue</RouterLink>
    </div>

    <form v-else-if="state.status === 'ready' && venue" class="panel edit-panel" :aria-busy="busy"
      novalidate @submit.prevent="save">
      <p v-if="venue.description" class="venue-description">{{ venue.description }}</p>
      <p v-if="savedMessage" class="panel-saved" role="status">{{ savedMessage }}</p>
      <p v-if="actionError" class="field-error" role="alert">{{ actionError }}</p>
      <button v-if="bufferConflict" type="button" class="button button-secondary" @click="load">
        Reload current values
      </button>

      <div class="field">
        <label for="venue-location">Location</label>
        <input id="venue-location" v-model="form.location" type="text" :disabled="busy"
          :aria-invalid="!!errors.location" aria-describedby="venue-location-error" />
        <p v-if="errors.location" id="venue-location-error" class="field-error" role="alert">{{ errors.location }}</p>
      </div>

      <div class="field">
        <label for="venue-capacity">Maximum capacity</label>
        <input id="venue-capacity" v-model="form.capacity" type="number" min="1" step="1" inputmode="numeric"
          :disabled="busy" :aria-invalid="!!errors.capacity" aria-describedby="venue-capacity-error" />
        <p v-if="errors.capacity" id="venue-capacity-error" class="field-error" role="alert">{{ errors.capacity }}</p>
      </div>

      <div class="field">
        <label for="venue-facilities">Facilities</label>
        <textarea id="venue-facilities" v-model="form.facilities" rows="4" :disabled="busy"
          :aria-invalid="!!errors.facilities" aria-describedby="venue-facilities-hint venue-facilities-error" />
        <p id="venue-facilities-hint" class="field-hint">One facility per line, for example Projector.</p>
        <p v-if="errors.facilities" id="venue-facilities-error" class="field-error" role="alert">{{ errors.facilities }}</p>
      </div>

      <div class="field">
        <label for="venue-accessibility">Accessibility features</label>
        <textarea id="venue-accessibility" v-model="form.accessibilityFeatures" rows="3" :disabled="busy"
          :aria-invalid="!!errors.accessibilityFeatures"
          aria-describedby="venue-accessibility-hint venue-accessibility-error" />
        <p id="venue-accessibility-hint" class="field-hint">One feature per line, for example Step-free entrance.</p>
        <p v-if="errors.accessibilityFeatures" id="venue-accessibility-error" class="field-error" role="alert">
          {{ errors.accessibilityFeatures }}
        </p>
        <label class="check">
          <input v-model="form.wheelchairAccessible" type="checkbox" :disabled="busy" />
          Wheelchair accessible
        </label>
      </div>

      <div class="field">
        <label for="venue-layouts">Supported room layouts</label>
        <textarea id="venue-layouts" v-model="form.layouts" rows="3" :disabled="busy"
          :aria-invalid="!!errors.layouts" aria-describedby="venue-layouts-hint venue-layouts-error" />
        <p id="venue-layouts-hint" class="field-hint">One layout per line. A venue can support more than one.</p>
        <p v-if="errors.layouts" id="venue-layouts-error" class="field-error" role="alert">{{ errors.layouts }}</p>
      </div>

      <fieldset class="field hours" :disabled="busy">
        <legend>Operating hours (Singapore time)</legend>
        <div class="field-grid">
          <div class="field">
            <label for="venue-opens">Opens</label>
            <input id="venue-opens" v-model="form.opensAt" type="time" />
          </div>
          <div class="field">
            <label for="venue-closes">Closes</label>
            <input id="venue-closes" v-model="form.closesAt" type="time" :aria-invalid="!!errors.closesAt"
              aria-describedby="venue-closes-error" />
          </div>
        </div>
        <p class="field-hint">Leave a time blank for no restriction at that end of the day.</p>
        <p v-if="errors.closesAt" id="venue-closes-error" class="field-error" role="alert">{{ errors.closesAt }}</p>
      </fieldset>

      <fieldset class="field" :disabled="busy">
        <legend>Setup and turnaround time</legend>
        <div class="field-grid">
          <div class="field">
            <label for="venue-setup">Setup before each booking (minutes)</label>
            <input id="venue-setup" v-model="form.setupMinutes" type="number" min="0" :max="MAX_BUFFER_MINUTES"
              step="1" inputmode="numeric" :aria-invalid="!!errors.setupMinutes" aria-describedby="venue-setup-error" />
            <p v-if="errors.setupMinutes" id="venue-setup-error" class="field-error" role="alert">{{ errors.setupMinutes }}</p>
          </div>
          <div class="field">
            <label for="venue-turnaround">Turnaround after each booking (minutes)</label>
            <input id="venue-turnaround" v-model="form.turnaroundMinutes" type="number" min="0" :max="MAX_BUFFER_MINUTES"
              step="1" inputmode="numeric" :aria-invalid="!!errors.turnaroundMinutes"
              aria-describedby="venue-turnaround-error" />
            <p v-if="errors.turnaroundMinutes" id="venue-turnaround-error" class="field-error" role="alert">
              {{ errors.turnaroundMinutes }}
            </p>
          </div>
        </div>
        <p class="field-hint">Use 0 for none. At most {{ MAX_BUFFER_MINUTES }} minutes (24 hours) each.</p>
      </fieldset>

      <div class="actions">
        <button type="submit" class="button button-primary" :disabled="!canSave">
          {{ busy ? 'Saving…' : 'Save changes' }}
        </button>
        <button type="button" class="button button-secondary" :disabled="busy || !hasChanges" @click="discard">
          Discard changes
        </button>
        <RouterLink to="/venue-catalogue" class="button button-secondary">Back to the catalogue</RouterLink>
      </div>
      <p v-if="!hasChanges && !savedMessage" class="field-hint">There are no changes to save.</p>
    </form>
  </template>
</template>

<style scoped>
.edit-panel { padding: 24px; display: grid; gap: 4px; }
.venue-description { font-size: 14px; color: #59685e; margin: 0 0 8px; overflow-wrap: anywhere; }
.field { display: grid; gap: 6px; min-width: 0; margin-top: 16px; border: 0; padding: 0; }
.field label, .field legend { font-size: 13px; font-weight: 600; padding: 0; }
.field input[type='text'], .field input[type='number'], .field input[type='time'], .field textarea {
  width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit;
  border: 1px solid var(--border); border-radius: 8px; background: #fff;
}
.field textarea { resize: vertical; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.field-hint { font-size: 12px; color: #59685e; margin: 0; }
.field-error { color: #853e37; font-size: 13px; margin: 0; }
.check { display: flex; align-items: center; gap: 8px; font-weight: 400 !important; margin-top: 6px; }
.panel-saved {
  margin: 8px 0 0; border-left: 3px solid var(--green); background: #f0f5ee; padding: 12px 16px;
  border-radius: 4px; font-size: 14px; line-height: 1.6;
}
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
@media (max-width: 600px) {
  .edit-panel { padding: 20px; }
  .field-grid { grid-template-columns: 1fr; }
}
</style>
