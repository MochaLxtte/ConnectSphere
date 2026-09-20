<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { clearLocalSession } from '../../auth/session.js';
import { formatEventTime } from '../../events/presentation';
import { fetchAttendees, type AttendeeList } from '../api/registrations';
import { registrationStatusLabel } from '../presentation';

// Vue casts an absent boolean prop to false, so the documented default must be explicit.
const props = withDefaults(defineProps<{
  eventRequestId: string;
  /** Event request status; registrations only exist once a request has been approved. */
  status: string;
  viewerRole: string;
  /** Pass false when an organiser views a request they do not own. Defaults to true. */
  isOwner?: boolean;
}>(), { isOwner: true });

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retryable: boolean }
  | { status: 'ready'; list: AttendeeList };

const id = useId();
const state = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

// A UI hint only: the API independently restricts this list to the owner and assigned coordinator.
const visible = computed(() =>
  ['APPROVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(props.status)
  && ((props.viewerRole === 'EVENT_ORGANISER' && props.isOwner) || props.viewerRole === 'EVENT_COORDINATOR'));

async function load() {
  controller?.abort();
  if (!visible.value) return;
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const list = await fetchAttendees(props.eventRequestId, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', list };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      state.value = { status: 'error', retryable: false, message: 'Sign in again to view the attendee list.' };
      return;
    }
    const unavailable = error instanceof ApiError && [400, 403, 404].includes(error.status);
    state.value = {
      status: 'error', retryable: !unavailable,
      message: unavailable ? 'The attendee list is unavailable for this event.'
        : error instanceof Error ? error.message : 'The attendee list could not be loaded. Please try again.',
    };
  }
}

watch(() => [props.eventRequestId, props.status, props.viewerRole, props.isOwner], load, { immediate: true });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section v-if="visible" class="panel attendee-panel" :aria-labelledby="`${id}-title`">
    <header class="attendee-header">
      <div>
        <h2 :id="`${id}-title`">Attendees</h2>
        <p v-if="state.status === 'ready'" class="attendee-counts">
          {{ state.list.counts.registered }} registered
          <template v-if="state.list.counts.capacity !== null"> of {{ state.list.counts.capacity }} places · {{ state.list.counts.spotsLeft }} left</template>
          <template v-else> · no limit</template>
          <template v-if="state.list.counts.withdrawn > 0"> · {{ state.list.counts.withdrawn }} withdrawn</template>
        </p>
      </div>
      <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load">
        Refresh attendees
      </button>
    </header>

    <p v-if="state.status === 'loading'" role="status">Loading attendees…</p>
    <div v-else-if="state.status === 'error'" role="alert">
      <p>{{ state.message }}</p>
      <button v-if="state.retryable" type="button" class="button button-secondary attendee-retry" @click="load">Try again</button>
    </div>
    <p v-else-if="state.list.items.length === 0" class="attendee-empty">No one has registered for this event yet.</p>
    <div v-else class="attendee-table-wrap" tabindex="0" role="region" :aria-labelledby="`${id}-title`">
      <table class="attendee-table">
        <thead>
          <tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Status</th><th scope="col">Registered</th><th scope="col">Withdrawn</th></tr>
        </thead>
        <tbody>
          <tr v-for="attendee in state.list.items" :key="attendee.registrationId">
            <th scope="row">{{ attendee.displayName }}</th>
            <td><a :href="`mailto:${attendee.email}`">{{ attendee.email }}</a></td>
            <td>
              <span class="attendee-status" :class="`attendee-status--${attendee.status.toLowerCase()}`">
                {{ registrationStatusLabel(attendee.status) }}
              </span>
            </td>
            <td><time :datetime="attendee.registeredAt">{{ formatEventTime(attendee.registeredAt) }}</time></td>
            <td>
              <time v-if="attendee.withdrawnAt" :datetime="attendee.withdrawnAt">{{ formatEventTime(attendee.withdrawnAt) }}</time>
              <span v-else aria-label="Not withdrawn">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.attendee-panel { padding: 24px; min-width: 0; line-height: 1.6; font-size: 14px; }
.attendee-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.attendee-header h2 { font-size: 19px; line-height: 1.5; }
.attendee-header .button { flex-shrink: 0; }
.attendee-counts { color: #59685e; font-size: 12px; margin-top: 4px; }
.attendee-empty { color: #59685e; }
.attendee-retry { margin-top: 12px; }
.attendee-table-wrap { overflow-x: auto; }
.attendee-table-wrap:focus-visible { outline: 3px solid #90a950; outline-offset: 4px; }
.attendee-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.attendee-table th, .attendee-table td { text-align: left; padding: 10px 12px 10px 0; border-bottom: 1px solid var(--border); vertical-align: top; }
.attendee-table thead th { color: #59685e; font-size: 12px; font-weight: 500; white-space: nowrap; }
.attendee-table tbody th { font-weight: 600; overflow-wrap: anywhere; }
.attendee-table a { color: var(--green); text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; }
.attendee-status { border-radius: 20px; padding: 4px 10px; background: #f2f3ed; color: #52614e; font-size: 12px; font-weight: 600; white-space: nowrap; }
.attendee-status--registered { background: #edf5e9; color: #365d2e; }
@media (max-width: 600px) {
  .attendee-panel { padding: 20px; }
  .attendee-header { flex-wrap: wrap; }
}
</style>
