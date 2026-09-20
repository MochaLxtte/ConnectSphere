<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { formatEventTime } from '../../events/presentation';
import { fetchDiscoverableEvents, type PublicEvent } from '../api/registrations';
import RegistrationControls from '../components/RegistrationControls.vue';
import { availabilityBadge, placesLabel, venueLabel } from '../presentation';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean }
  | { status: 'ready'; items: PublicEvent[]; refreshing: boolean };

const state = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

function showSignIn() {
  controller?.abort();
  state.value = { status: 'error', signIn: true, message: 'Sign in to browse events.' };
}

/** A quiet reload keeps the list (and any action feedback) visible while counts are re-read. */
async function load(quiet = false) {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  if (quiet && state.value.status === 'ready') state.value = { ...state.value, refreshing: true };
  else state.value = { status: 'loading' };
  try {
    const items = await fetchDiscoverableEvents(current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items, refreshing: false };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      showSignIn();
      return;
    }
    state.value = {
      status: 'error', signIn: false,
      message: error instanceof Error ? error.message : 'Events could not be loaded. Please try again.',
    };
  }
}

onMounted(() => load());
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
    <h1>Browse events</h1>
    <p class="page-description">Find upcoming events and reserve your place.</p>
  </section>

  <section class="panel browse-panel" aria-labelledby="browse-title">
    <header class="browse-header">
      <div>
        <h2 id="browse-title">Events with registration</h2>
        <p>Soonest first · Singapore time</p>
      </div>
      <div class="browse-actions">
        <RouterLink to="/registrations" class="text-link">My registrations</RouterLink>
        <button
          type="button" class="button button-secondary"
          :disabled="state.status === 'loading' || (state.status === 'ready' && state.refreshing)" @click="load()"
        >Refresh</button>
      </div>
    </header>

    <p v-if="state.status === 'loading'" role="status">Loading events…</p>

    <div v-else-if="state.status === 'error'" class="browse-error" role="alert">
      <p>{{ state.message }}</p>
      <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else type="button" class="button button-secondary" @click="load()">Try again</button>
    </div>

    <div v-else-if="state.items.length === 0" class="feature-placeholder">
      <div class="empty-illustration"><AppIcon name="calendar" :size="38" /></div>
      <h2>No events are open for registration</h2>
      <p>Approved events that accept registrations will appear here.</p>
    </div>

    <ul v-else class="event-list" aria-label="Events with registration">
      <li v-for="item in state.items" :key="item.id" class="event-item">
        <div class="event-summary">
          <div class="event-title-row">
            <h3><RouterLink :to="`/browse/${item.id}`">{{ item.name?.trim() || 'Untitled event' }}</RouterLink></h3>
            <span class="availability" :class="`availability--${availabilityBadge(item).tone}`">
              {{ availabilityBadge(item).label }}
            </span>
          </div>
          <p v-if="item.purpose?.trim()" class="event-purpose">{{ item.purpose.trim() }}</p>
          <dl class="event-facts">
            <div><dt>Starts</dt><dd><time v-if="item.startsAt" :datetime="item.startsAt">{{ formatEventTime(item.startsAt) }}</time><span v-else>To be confirmed</span></dd></div>
            <div><dt>Venue</dt><dd>{{ venueLabel(item.venue) }}</dd></div>
            <div><dt>Places</dt><dd>{{ placesLabel(item) }}</dd></div>
          </dl>
        </div>
        <RegistrationControls :event="item" class="event-controls" @changed="load(true)" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.browse-panel { padding: 24px; }
.browse-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.browse-header h2 { font-size: 18px; }
.browse-header p { color: #59685e; font-size: 12px; line-height: 1.6; margin-top: 6px; }
.browse-actions { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.browse-actions .text-link { font-size: 13px; }
.browse-error .button { margin-top: 12px; }
.event-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.event-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.event-summary { min-width: 0; flex: 1; }
.event-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.event-title-row h3 { font-size: 15px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.event-title-row a { color: var(--green); text-decoration: underline; text-underline-offset: 3px; }
.event-purpose { color: #46554c; font-size: 13px; line-height: 1.6; margin-top: 6px; overflow-wrap: anywhere; }
.event-facts { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 12px 0 0; font-size: 13px; line-height: 1.5; }
.event-facts dt { color: #59685e; font-size: 12px; }
.event-facts dd { margin: 0; overflow-wrap: anywhere; }
.event-controls { flex: 0 0 220px; align-items: flex-end; text-align: right; }
.availability { flex-shrink: 0; border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 600; line-height: 1.5; background: #f2f3ed; color: #52614e; }
.availability--open { background: #edf5e9; color: #365d2e; }
.availability--full { background: #fbeeed; color: #853e37; }
.availability--pending { background: #fff3df; color: #805518; }
@media (max-width: 760px) {
  .browse-panel { padding: 20px; }
  .browse-header { flex-wrap: wrap; }
  .event-item { flex-direction: column; gap: 14px; }
  .event-controls { flex-basis: auto; align-items: flex-start; text-align: left; }
}
</style>
