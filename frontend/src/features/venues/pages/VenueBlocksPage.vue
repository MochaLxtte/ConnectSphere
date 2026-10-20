<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { formatEventTime, fromSingaporeInputValue } from '../../events/presentation';
import { fetchVenueAvailability } from '../api/availability';
import {
  createVenueBlock, deleteVenueBlock, fetchRecoveryArrangements, fetchVenueBlocks,
  type RecoveryArrangement, type RecoveryStatus, type VenueBlock,
} from '../api/venue-blocks';

type VenueOption = { id: string; name: string };
type BlocksState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: VenueBlock[] };
type RecoveryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: RecoveryArrangement[] };

/**
 * KAN-55: Venue Staff record operational-unavailability blocks for one venue at a time.
 * KAN-81: a block may overlap approved bookings; those arrangements are listed as needing recovery.
 */
const isStaff = computed(() => !authSession.loading && authSession.user?.role === 'VENUE_STAFF');

const recoveryLabels: Record<RecoveryStatus, string> = {
  RECOVERY_REQUIRED: 'Recovery required', RESOLVED: 'Resolved', CLEARED: 'Cleared',
};
const bookingCount = (count: number) => `${count} approved booking${count === 1 ? '' : 's'}`;

/** KAN-81-AC12: a 4xx with a server message is a definite refusal; anything else may have been applied. */
const uncertain = (error: unknown) => !(error instanceof ApiError) || error.status === 0
  || error.status >= 500 || error.code === 'INVALID_RESPONSE';

const venues = ref<VenueOption[]>([]);
const venuesError = ref('');
const selectedVenueId = ref('');
const state = ref<BlocksState>({ status: 'idle' });
const startsAt = ref('');
const endsAt = ref('');
const reason = ref('');
const busy = ref(false);
const actionError = ref('');
const savedMessage = ref('');
const recovery = ref<RecoveryState>({ status: 'loading' });
let controller: AbortController | undefined;
let recoveryController: AbortController | undefined;

const timeError = computed(() => {
  if (!startsAt.value && !endsAt.value) return '';
  if (!startsAt.value || !endsAt.value) return 'Enter both a start and an end time.';
  const from = fromSingaporeInputValue(startsAt.value);
  const to = fromSingaporeInputValue(endsAt.value);
  if (!from || !to) return 'Enter a valid date and time.';
  return Date.parse(to) > Date.parse(from) ? '' : 'The end time must be after the start time.';
});

// Reuses the KAN-51 availability window (already Venue Staff accessible) just for venue id/name.
async function loadVenues() {
  venuesError.value = '';
  try {
    const now = new Date();
    const to = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const window = await fetchVenueAvailability(now.toISOString(), to.toISOString());
    venues.value = window.items.map((item) => ({ id: item.id, name: item.name }));
  } catch {
    venuesError.value = 'The venue catalogue could not be loaded. Refresh the page to try again.';
  }
}

async function loadBlocks() {
  controller?.abort();
  if (!selectedVenueId.value) {
    state.value = { status: 'idle' };
    return;
  }
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const items = await fetchVenueBlocks(selectedVenueId.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      return;
    }
    state.value = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Venue blocks could not be loaded. Please try again.',
    };
  }
}

/** KAN-81-AC6/AC12: every arrangement still needing recovery, across venues. */
async function loadRecovery() {
  recoveryController?.abort();
  const current = new AbortController();
  recoveryController = current;
  recovery.value = { status: 'loading' };
  try {
    const items = await fetchRecoveryArrangements('RECOVERY_REQUIRED', current.signal);
    if (!current.signal.aborted) recovery.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    recovery.value = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Recovery arrangements could not be loaded.',
    };
  }
}

/** After an uncertain or completed write, show current state rather than retrying the mutation. */
async function refreshAfterWrite() {
  await Promise.all([loadBlocks(), loadRecovery()]);
}

function writeFailed(error: unknown, action: 'saved' | 'removed'): boolean {
  if (error instanceof ApiError && error.status === 401) {
    clearLocalSession();
    return false;
  }
  actionError.value = uncertain(error)
    ? `We could not confirm whether the block was ${action}. The list below has been refreshed; check it before trying again.`
    : error instanceof Error ? error.message : `The block could not be ${action}.`;
  return true;
}

async function submit() {
  if (!selectedVenueId.value || timeError.value || !startsAt.value || !endsAt.value || !reason.value.trim() || busy.value) return;
  const from = fromSingaporeInputValue(startsAt.value);
  const to = fromSingaporeInputValue(endsAt.value);
  if (!from || !to) return;
  busy.value = true;
  actionError.value = '';
  savedMessage.value = '';
  try {
    const saved = await createVenueBlock(selectedVenueId.value, { startsAt: from, endsAt: to, reason: reason.value.trim() });
    savedMessage.value = saved.affected.length === 0
      ? 'The venue block was saved.'
      : `The venue block was saved. It affects ${bookingCount(saved.affected.length)}, now marked as needing recovery.`;
    startsAt.value = '';
    endsAt.value = '';
    reason.value = '';
    await refreshAfterWrite();
  } catch (error) {
    if (writeFailed(error, 'saved') && uncertain(error)) await refreshAfterWrite();
  } finally {
    busy.value = false;
  }
}

async function remove(blockId: string) {
  if (busy.value) return;
  busy.value = true;
  actionError.value = '';
  savedMessage.value = '';
  try {
    const cleared = await deleteVenueBlock(selectedVenueId.value, blockId);
    savedMessage.value = cleared.length === 0
      ? 'The venue block was removed.'
      : `The venue block was removed. Its recovery flag was cleared for ${bookingCount(cleared.length)}.`;
    await refreshAfterWrite();
  } catch (error) {
    if (writeFailed(error, 'removed') && uncertain(error)) await refreshAfterWrite();
  } finally {
    busy.value = false;
  }
}

watch(
  () => [authSession.loading, authSession.user?.id, authSession.user?.role],
  () => {
    if (authSession.loading) return;
    if (!isStaff.value) {
      recoveryController?.abort();
      venues.value = [];
      selectedVenueId.value = '';
      state.value = { status: 'idle' };
      recovery.value = { status: 'loading' };
      return;
    }
    void loadVenues();
    void loadRecovery();
  },
  { immediate: true, flush: 'sync' },
);
watch(selectedVenueId, () => {
  savedMessage.value = '';
  actionError.value = '';
  void loadBlocks();
});
onBeforeUnmount(() => {
  controller?.abort();
  recoveryController?.abort();
});
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For venue staff</p>
    <h1>Venue blocks</h1>
    <p class="page-description">
      Record a period when a venue is operationally unavailable, such as maintenance or renovation.
    </p>
  </section>

  <p v-if="authSession.loading" class="panel blocks-panel" role="status">Checking your session…</p>
  <div v-else-if="!authSession.user" class="panel blocks-panel" role="alert">
    <p>Sign in to manage venue blocks.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>
  <p v-else-if="!isStaff" class="panel blocks-panel" role="alert">Venue blocks are for venue staff.</p>

  <template v-else>
    <section class="panel blocks-panel" aria-labelledby="blocks-heading">
      <h2 id="blocks-heading">Select a venue</h2>
      <p v-if="venuesError" class="field-error" role="alert">{{ venuesError }}</p>
      <select v-model="selectedVenueId" aria-label="Venue">
        <option value="" disabled>Choose a venue</option>
        <option v-for="venue in venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option>
      </select>

      <template v-if="selectedVenueId">
        <p v-if="savedMessage" class="panel-saved" role="status">{{ savedMessage }}</p>
        <p v-if="actionError" class="field-error" role="alert">{{ actionError }}</p>

        <form class="block-form" :aria-busy="busy" @submit.prevent="submit">
          <div class="field-grid">
            <div class="field">
              <label for="block-starts">Starts (Singapore time)</label>
              <input id="block-starts" v-model="startsAt" type="datetime-local" :disabled="busy" />
            </div>
            <div class="field">
              <label for="block-ends">Ends (Singapore time)</label>
              <input id="block-ends" v-model="endsAt" type="datetime-local" :disabled="busy" />
            </div>
          </div>
          <p v-if="timeError" class="field-error" role="alert">{{ timeError }}</p>

          <div class="field">
            <label for="block-reason">Reason</label>
            <textarea id="block-reason" v-model="reason" rows="2" maxlength="2000" :disabled="busy"
              placeholder="e.g. Scheduled maintenance, renovation, safety restriction, internal activity" />
          </div>

          <button type="submit" class="button button-primary"
            :disabled="busy || !!timeError || !startsAt || !endsAt || !reason.trim()">
            {{ busy ? 'Saving…' : 'Save block' }}
          </button>
        </form>

        <h3>Recorded blocks</h3>
        <p v-if="state.status === 'loading'" role="status">Loading venue blocks…</p>
        <div v-else-if="state.status === 'error'" role="alert">
          <p class="field-error">{{ state.message }}</p>
          <button type="button" class="button button-secondary" @click="loadBlocks">Try again</button>
        </div>
        <p v-else-if="state.status === 'ready' && state.items.length === 0" class="block-notice">
          No blocks are recorded for this venue yet.
        </p>
        <ul v-else-if="state.status === 'ready'" class="block-list">
          <li v-for="item in state.items" :key="item.id">
            <p class="block-period">{{ formatEventTime(item.startsAt) }} – {{ formatEventTime(item.endsAt) }}</p>
            <p class="block-reason">{{ item.reason }}</p>
            <p v-if="item.affected.length === 0" class="block-notice">No approved bookings are affected.</p>
            <ul v-else class="affected-list" :aria-label="`Bookings affected by this block`">
              <li v-for="affected in item.affected" :key="affected.impactId">
                <span>{{ affected.eventName?.trim() || 'Untitled event' }} ·
                  {{ formatEventTime(affected.bookingStartsAt) }} – {{ formatEventTime(affected.bookingEndsAt) }}</span>
                <span class="recovery-status" :class="`recovery-status--${affected.status.toLowerCase()}`">
                  {{ recoveryLabels[affected.status] }}
                </span>
              </li>
            </ul>
            <button type="button" class="button button-secondary" :disabled="busy" @click="remove(item.id)">Remove</button>
          </li>
        </ul>
      </template>
    </section>

    <section class="panel blocks-panel recovery-panel" aria-labelledby="recovery-heading">
      <h2 id="recovery-heading">Bookings needing recovery</h2>
      <p class="block-notice">
        Approved bookings at any venue that overlap an operational block. Their events and bookings are kept;
        the assigned coordinator arranges a replacement.
      </p>
      <p v-if="recovery.status === 'loading'" role="status">Loading bookings needing recovery…</p>
      <div v-else-if="recovery.status === 'error'" role="alert">
        <p class="field-error">{{ recovery.message }}</p>
        <button type="button" class="button button-secondary" @click="loadRecovery">Try again</button>
      </div>
      <p v-else-if="recovery.items.length === 0" class="block-notice">No bookings currently need recovery.</p>
      <ul v-else class="block-list">
        <li v-for="item in recovery.items" :key="item.impactId">
          <p class="block-period">{{ item.eventName?.trim() || 'Untitled event' }} — {{ item.venueName }}</p>
          <p class="block-reason">
            Booked {{ formatEventTime(item.bookingStartsAt) }} – {{ formatEventTime(item.bookingEndsAt) }}.
            Blocked {{ formatEventTime(item.outageStartsAt) }} – {{ formatEventTime(item.outageEndsAt) }}: {{ item.outageReason }}
          </p>
          <span class="recovery-status recovery-status--recovery_required">{{ recoveryLabels[item.status] }}</span>
        </li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
.blocks-panel { padding: 24px; }
.blocks-panel h2 { font-size: 18px; }
.blocks-panel h3 { font-size: 15px; margin: 24px 0 10px; }
.blocks-panel select {
  display: block; width: 100%; max-width: 360px; margin-top: 10px; padding: 9px 10px;
  border: 1px solid var(--border); border-radius: 8px; background: #fff; font: inherit;
}
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
.field { display: grid; gap: 6px; min-width: 0; margin-top: 16px; }
.field label { font-size: 13px; font-weight: 600; }
.field input, .field textarea {
  width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit;
  border: 1px solid var(--border); border-radius: 8px; background: #fff;
}
.field textarea { resize: vertical; }
.field-error { color: #853e37; font-size: 13px; margin: 8px 0 0; }
.panel-saved {
  margin-top: 16px; border-left: 3px solid var(--green); background: #f0f5ee; padding: 12px 16px;
  border-radius: 4px; font-size: 14px; line-height: 1.6;
}
.block-form .button { margin-top: 20px; }
.block-notice { margin-top: 16px; font-size: 14px; color: #59685e; }
.block-list { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 12px; }
.block-list li { border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.block-period { font-weight: 600; font-size: 14px; }
.block-reason { font-size: 13px; color: #59685e; margin: 6px 0 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
.recovery-panel { margin-top: 24px; }
.affected-list { list-style: none; padding: 0; margin: 0 0 12px; display: grid; gap: 6px; font-size: 13px; }
.affected-list li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; overflow-wrap: anywhere; }
.recovery-status { display: inline-block; border-radius: 12px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
.recovery-status--recovery_required { background: #fbeee6; color: #853e37; }
.recovery-status--resolved { background: #edf5e9; color: #365d2e; }
.recovery-status--cleared { background: #eef0ee; color: #59685e; }
@media (max-width: 600px) {
  .blocks-panel { padding: 20px; }
  .field-grid { grid-template-columns: 1fr; }
}
</style>
