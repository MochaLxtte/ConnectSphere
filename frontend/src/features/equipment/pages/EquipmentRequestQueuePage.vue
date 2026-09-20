<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import {
  decideEquipmentRequest, fetchEquipmentRequestQueue,
  type EquipmentRequestQueueItem, type EquipmentRequestStatus,
} from '../api/equipment-requests';
import {
  availabilityLabel, equipmentErrorMessage, equipmentStatusLabel, formatEquipmentTime, formatPeriod,
  isSessionExpired,
} from '../presentation';
import '../equipment.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'ready'; items: EquipmentRequestQueueItem[] };

const statuses: EquipmentRequestStatus[] = ['REQUESTED', 'RESERVED', 'REJECTED', 'CANCELLED'];
const state = ref<LoadState>({ status: 'loading' });
const filter = ref<EquipmentRequestStatus>('REQUESTED');
const rejectingId = ref<string | null>(null);
const reason = ref('');
const reasonError = ref('');
const savingId = ref<string | null>(null);
const notice = ref<{ kind: 'success' | 'error'; message: string } | null>(null);
let controller: AbortController | undefined;

function showSignIn() {
  controller?.abort();
  state.value = { status: 'error', signIn: true, retryable: false, message: 'Sign in to view equipment requests.' };
}

async function load(keepNotice = false) {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  rejectingId.value = null;
  if (!keepNotice) notice.value = null;
  try {
    const items = await fetchEquipmentRequestQueue(filter.value, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted) return;
    if (isSessionExpired(error)) {
      clearLocalSession();
      showSignIn();
      return;
    }
    const forbidden = error instanceof ApiError && error.status === 403;
    state.value = {
      status: 'error', signIn: false, retryable: !forbidden,
      message: forbidden ? 'This page is for technical support staff.'
        : equipmentErrorMessage(error, 'The equipment requests could not be loaded. Please try again.'),
    };
  }
}

function startRejecting(id: string) {
  rejectingId.value = id;
  reason.value = '';
  reasonError.value = '';
}

async function decide(item: EquipmentRequestQueueItem, decision: 'RESERVED' | 'REJECTED') {
  if (savingId.value) return;
  if (decision === 'REJECTED' && !reason.value.trim()) {
    reasonError.value = 'Enter a reason so the organiser knows what to change.';
    return;
  }
  savingId.value = item.id;
  notice.value = null;
  try {
    await decideEquipmentRequest(item.id, decision === 'REJECTED'
      ? { decision, reason: reason.value.trim() } : { decision });
    notice.value = {
      kind: 'success',
      message: decision === 'RESERVED'
        ? `Reserved ${item.quantity} × ${item.equipmentName} for ${item.eventName?.trim() || 'the event'}.`
        : `Rejected the request for ${item.quantity} × ${item.equipmentName}.`,
    };
    await load(true);
  } catch (error) {
    if (isSessionExpired(error)) {
      clearLocalSession();
      showSignIn();
      return;
    }
    notice.value = {
      kind: 'error',
      message: equipmentErrorMessage(error, 'The decision could not be recorded. Please try again.'),
    };
    // Availability or the request's state changed underneath this page, so show the latest rows.
    if (error instanceof ApiError && error.status === 409) await load(true);
  } finally {
    savingId.value = null;
  }
}

onMounted(() => load());
watch(() => [authSession.user?.id, authSession.user?.role], () => {
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For technical support</p>
    <h1>Equipment requests</h1>
    <p class="page-description">Reserve equipment for approved events, or reject a request with a reason.</p>
  </section>

  <section class="panel eq-panel" aria-labelledby="equipment-queue-title">
    <header class="eq-header">
      <div>
        <h2 id="equipment-queue-title">{{ equipmentStatusLabel(filter) }}</h2>
        <p>Earliest period first · Singapore time</p>
      </div>
      <div class="eq-actions">
        <label class="eq-field queue-filter">Show
          <select v-model="filter" name="status" @change="load()">
            <option v-for="status in statuses" :key="status" :value="status">{{ equipmentStatusLabel(status) }}</option>
          </select>
        </label>
        <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load()">
          Refresh
        </button>
      </div>
    </header>

    <p v-if="notice" :class="notice.kind === 'error' ? 'eq-error' : 'eq-success'" class="queue-notice"
      :role="notice.kind === 'error' ? 'alert' : 'status'">{{ notice.message }}</p>

    <p v-if="state.status === 'loading'" role="status">Loading equipment requests…</p>

    <div v-else-if="state.status === 'error'" class="eq-state" role="alert">
      <p>{{ state.message }}</p>
      <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load()">Try again</button>
    </div>

    <div v-else-if="state.items.length === 0" class="feature-placeholder queue-empty">
      <div class="empty-illustration"><AppIcon name="check" :size="38" /></div>
      <h2>{{ filter === 'REQUESTED' ? 'No requests are awaiting a decision' : 'Nothing to show' }}</h2>
      <p>Equipment requests from organisers and coordinators will appear here.</p>
    </div>

    <ul v-else class="eq-list" aria-label="Equipment requests">
      <li v-for="item in state.items" :key="item.id" class="eq-item">
        <div class="eq-item-head">
          <h3>{{ item.quantity }} × {{ item.equipmentName }}</h3>
          <span
            v-if="item.status === 'REQUESTED'" class="eq-pill"
            :class="item.available >= item.quantity ? 'eq-pill--ok' : 'eq-pill--short'"
          >{{ availabilityLabel(item.available, item.totalQuantity) }}</span>
          <span v-else class="eq-pill" :class="`eq-pill--${item.status.toLowerCase()}`">{{ equipmentStatusLabel(item.status) }}</span>
        </div>
        <p class="eq-item-meta">
          <span>{{ item.eventName?.trim() || 'Untitled event' }}</span>
          <span>Organiser: {{ item.organiserName }}</span>
          <span v-if="item.requesterName !== item.organiserName">Requested by {{ item.requesterName }}</span>
        </p>
        <p class="eq-item-meta"><span>{{ formatPeriod(item.startsAt, item.endsAt) }}</span></p>
        <p v-if="item.notes" class="eq-item-body">{{ item.notes }}</p>
        <p v-if="item.status === 'REQUESTED' && item.available < item.quantity" class="eq-error">
          Only {{ item.available }} free in this period, so this request cannot be reserved as it stands.
        </p>
        <p v-if="item.decisionReason" class="eq-item-body">Reason: {{ item.decisionReason }}</p>
        <p v-if="item.decidedAt" class="eq-item-meta"><span>Decided {{ formatEquipmentTime(item.decidedAt) }}</span></p>

        <template v-if="item.status === 'REQUESTED'">
          <form v-if="rejectingId === item.id" class="eq-form" novalidate @submit.prevent="decide(item, 'REJECTED')">
            <label class="eq-field">Reason for rejecting
              <textarea
                v-model="reason" name="reason" rows="3" maxlength="2000" required
                :aria-invalid="reasonError ? 'true' : undefined"
              />
            </label>
            <p v-if="reasonError" class="eq-error" role="alert">{{ reasonError }}</p>
            <div class="eq-actions">
              <button type="submit" class="button button-primary button-reject" :disabled="savingId !== null">
                {{ savingId === item.id ? 'Rejecting…' : 'Confirm rejection' }}
              </button>
              <button type="button" class="button button-secondary" :disabled="savingId !== null" @click="rejectingId = null">
                Keep request
              </button>
            </div>
          </form>
          <div v-else class="eq-actions">
            <button
              type="button" class="button button-primary" :disabled="savingId !== null"
              :aria-label="`Reserve ${item.quantity} ${item.equipmentName}`" @click="decide(item, 'RESERVED')"
            >{{ savingId === item.id ? 'Reserving…' : 'Reserve' }}</button>
            <button
              type="button" class="button button-danger" :disabled="savingId !== null"
              :aria-label="`Reject ${item.quantity} ${item.equipmentName}`" @click="startRejecting(item.id)"
            >Reject</button>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.queue-filter { grid-template-columns: auto minmax(150px, 1fr); align-items: center; gap: 8px; }
.queue-notice { margin-bottom: 16px; }
.queue-empty { min-height: 0; padding-bottom: 24px; }
</style>
