<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { fetchCatalogueVenues, type CatalogueVenue } from '../api/venue-catalogue';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: CatalogueVenue[] };

/** KAN-50-AC1: Venue Staff view the venues recorded in the catalogue. */
const isStaff = computed(() => !authSession.loading && authSession.user?.role === 'VENUE_STAFF');
const state = ref<LoadState>({ status: 'idle' });
let controller: AbortController | undefined;

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const items = await fetchCatalogueVenues(current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      return;
    }
    state.value = {
      status: 'error',
      message: error instanceof Error ? error.message : 'The venue catalogue could not be loaded. Please try again.',
    };
  }
}

const list = (labels: string[]) => (labels.length ? labels.join(', ') : 'None recorded');

watch(
  () => [authSession.loading, authSession.user?.id, authSession.user?.role],
  () => {
    if (authSession.loading) return;
    if (!isStaff.value) {
      controller?.abort();
      state.value = { status: 'idle' };
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
    <h1>Venue catalogue</h1>
    <p class="page-description">
      Keep venue information accurate so coordinators can search and assess venues reliably.
    </p>
  </section>

  <p v-if="authSession.loading" class="panel catalogue-panel" role="status">Checking your session…</p>
  <div v-else-if="!authSession.user" class="panel catalogue-panel" role="alert">
    <p>Sign in to maintain the venue catalogue.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>
  <p v-else-if="!isStaff" class="panel catalogue-panel" role="alert">The venue catalogue is for venue staff.</p>

  <section v-else class="panel catalogue-panel" aria-labelledby="catalogue-heading">
    <h2 id="catalogue-heading">Venues</h2>
    <p v-if="state.status === 'loading'" role="status">Loading the venue catalogue…</p>
    <div v-else-if="state.status === 'error'" role="alert">
      <p class="field-error">{{ state.message }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <p v-else-if="state.status === 'ready' && state.items.length === 0" class="catalogue-notice">
      No venues are recorded in the catalogue yet.
    </p>
    <ul v-else-if="state.status === 'ready'" class="venue-list">
      <li v-for="venue in state.items" :key="venue.id">
        <div class="venue-summary">
          <h3>{{ venue.name }}</h3>
          <p>{{ venue.location ?? 'No location recorded' }} · Capacity {{ venue.capacity }}</p>
          <p class="venue-detail">Layouts: {{ list(venue.layouts) }}</p>
          <p class="venue-detail">Facilities: {{ list(venue.facilities) }}</p>
        </div>
        <RouterLink :to="`/venue-catalogue/${venue.id}`" class="button button-secondary"
          :aria-label="`Edit ${venue.name}`">Edit</RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.catalogue-panel { padding: 24px; }
.catalogue-panel h2 { font-size: 18px; }
.field-error { color: #853e37; font-size: 13px; margin: 8px 0; }
.catalogue-notice { margin-top: 16px; font-size: 14px; color: #59685e; }
.venue-list { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 12px; }
.venue-list li {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  border: 1px solid var(--border); border-radius: 8px; padding: 16px;
}
.venue-summary { min-width: 0; }
.venue-summary h3 { font-size: 15px; margin: 0 0 4px; }
.venue-summary p { font-size: 13px; color: #59685e; margin: 2px 0; overflow-wrap: anywhere; }
@media (max-width: 600px) {
  .catalogue-panel { padding: 20px; }
  .venue-list li { flex-direction: column; }
}
</style>
