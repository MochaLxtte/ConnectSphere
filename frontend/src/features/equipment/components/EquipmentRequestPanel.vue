<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { fetchEventRequestDetail } from '../../events/api/event-requests';
import { fetchAllEquipmentAvailability, type EquipmentAvailabilityItem } from '../api/equipment';
import {
  cancelEquipmentRequest, createEquipmentRequest, fetchEventEquipmentRequests, updateEquipmentRequest,
  type EquipmentRequest,
} from '../api/equipment-requests';
import {
  availabilityLabel, equipmentErrorMessage, equipmentStatusLabel, formatPeriod, fromSingaporeInput,
  isSessionExpired, toSingaporeInput,
} from '../presentation';
import '../equipment.css';

const props = defineProps<{
  eventRequestId: string;
  /** Event request status; equipment can be requested while APPROVED or CONFIRMED. */
  status: string;
  viewerRole: string;
  /** Whether an organiser viewer owns the event. Defaults to true because only owners can open it. */
  isOwner?: boolean;
  /** Optional event period. When omitted the panel reads it from the shared event detail. */
  startsAt?: string | null;
  endsAt?: string | null;
}>();
const emit = defineEmits<{ changed: [] }>();

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'ready'; items: EquipmentRequest[] };
type Draft = { equipmentTypeId: string; quantity: number | string; startsAt: string; endsAt: string; notes: string };

const id = useId();
const state = ref<LoadState>({ status: 'loading' });
const notice = ref('');
const actionError = ref('');
const saving = ref(false);
// 'new' while adding, a request ID while editing, otherwise closed.
const formFor = ref<string | null>(null);
const draft = ref<Draft>({ equipmentTypeId: '', quantity: 1, startsAt: '', endsAt: '', notes: '' });
const formError = ref('');
const cancellingId = ref<string | null>(null);
const eventPeriod = ref<{ startsAt: string; endsAt: string } | null>(null);
const availability = ref<
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: EquipmentAvailabilityItem[] }
>({ status: 'idle' });
let controller: AbortController | undefined;
let availabilityController: AbortController | undefined;

const visible = computed(() =>
  ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF'].includes(props.viewerRole));
const eventEligible = computed(() => props.status === 'APPROVED' || props.status === 'CONFIRMED');
const canRequest = computed(() => eventEligible.value && (
  (props.viewerRole === 'EVENT_ORGANISER' && props.isOwner !== false) || props.viewerRole === 'EVENT_COORDINATOR'));
const selectedAvailability = computed(() => availability.value.status === 'ready'
  ? availability.value.items.find((item) => item.equipmentTypeId === draft.value.equipmentTypeId) : undefined);
const editingRequest = computed(() => state.value.status === 'ready'
  ? state.value.items.find((item) => item.id === formFor.value) : undefined);

function canManage(item: EquipmentRequest): boolean {
  return item.requestedBy === authSession.user?.id;
}

function showSignIn() {
  controller?.abort();
  availabilityController?.abort();
  formFor.value = null;
  state.value = { status: 'error', signIn: true, retryable: false, message: 'Sign in to view equipment requests.' };
}

function handleExpired(error: unknown): boolean {
  if (!isSessionExpired(error)) return false;
  clearLocalSession();
  showSignIn();
  return true;
}

async function load() {
  controller?.abort();
  if (!visible.value) return;
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  formFor.value = null;
  cancellingId.value = null;
  actionError.value = '';
  try {
    const items = await fetchEventEquipmentRequests(props.eventRequestId, current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted || handleExpired(error)) return;
    const unavailable = error instanceof ApiError && [400, 403, 404].includes(error.status);
    state.value = {
      status: 'error', signIn: false, retryable: !unavailable,
      message: unavailable ? 'Equipment requests for this event are unavailable to you.'
        : 'The equipment requests could not be loaded. Please try again.',
    };
  }
}

async function resolveEventPeriod(signal: AbortSignal): Promise<{ startsAt: string; endsAt: string } | null> {
  if (props.startsAt && props.endsAt) return { startsAt: props.startsAt, endsAt: props.endsAt };
  if (eventPeriod.value) return eventPeriod.value;
  const detail = await fetchEventRequestDetail(props.eventRequestId, signal);
  eventPeriod.value = detail.startsAt && detail.endsAt ? { startsAt: detail.startsAt, endsAt: detail.endsAt } : null;
  return eventPeriod.value;
}

/** Availability follows the period in the form, so the picker shows what is free at that time. */
async function loadAvailability() {
  availabilityController?.abort();
  const startsAt = fromSingaporeInput(draft.value.startsAt);
  const endsAt = fromSingaporeInput(draft.value.endsAt);
  if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) {
    availability.value = { status: 'idle' };
    return;
  }
  const current = new AbortController();
  availabilityController = current;
  availability.value = { status: 'loading' };
  try {
    const items = await fetchAllEquipmentAvailability(startsAt, endsAt, current.signal);
    if (!current.signal.aborted) availability.value = { status: 'ready', items };
  } catch (error) {
    if (current.signal.aborted || handleExpired(error)) return;
    availability.value = { status: 'error', message: 'Availability could not be checked. Please try again.' };
  }
}

async function openAddForm() {
  formError.value = '';
  notice.value = '';
  draft.value = { equipmentTypeId: '', quantity: 1, startsAt: '', endsAt: '', notes: '' };
  formFor.value = 'new';
  availabilityController?.abort();
  const current = new AbortController();
  availabilityController = current;
  availability.value = { status: 'loading' };
  try {
    const period = await resolveEventPeriod(current.signal);
    if (current.signal.aborted) return;
    draft.value.startsAt = toSingaporeInput(period?.startsAt);
    draft.value.endsAt = toSingaporeInput(period?.endsAt);
  } catch (error) {
    if (current.signal.aborted || handleExpired(error)) return;
  }
  await loadAvailability();
}

function openEditForm(item: EquipmentRequest) {
  formError.value = '';
  notice.value = '';
  cancellingId.value = null;
  draft.value = {
    equipmentTypeId: item.equipmentTypeId, quantity: item.quantity,
    startsAt: toSingaporeInput(item.startsAt), endsAt: toSingaporeInput(item.endsAt), notes: item.notes ?? '',
  };
  formFor.value = item.id;
  void loadAvailability();
}

function closeForm() {
  availabilityController?.abort();
  formFor.value = null;
  formError.value = '';
}

async function save() {
  if (saving.value || !formFor.value) return;
  formError.value = '';
  const quantity = Number(draft.value.quantity);
  const startsAt = fromSingaporeInput(draft.value.startsAt);
  const endsAt = fromSingaporeInput(draft.value.endsAt);
  if (formFor.value === 'new' && !draft.value.equipmentTypeId) return void (formError.value = 'Choose the equipment you need.');
  if (!Number.isInteger(quantity) || quantity < 1) return void (formError.value = 'Enter a whole quantity of 1 or more.');
  if (!startsAt || !endsAt) return void (formError.value = 'Enter when the equipment is needed from and until.');
  if (Date.parse(endsAt) <= Date.parse(startsAt)) return void (formError.value = 'The end must be later than the start.');

  saving.value = true;
  const notes = draft.value.notes.trim() || null;
  try {
    if (formFor.value === 'new') {
      await createEquipmentRequest({
        eventRequestId: props.eventRequestId, equipmentTypeId: draft.value.equipmentTypeId,
        quantity, startsAt, endsAt, notes,
      });
      notice.value = 'Equipment request sent to technical support.';
    } else {
      await updateEquipmentRequest(formFor.value, { quantity, startsAt, endsAt, notes });
      notice.value = 'Equipment request updated.';
    }
    emit('changed');
    await load();
  } catch (error) {
    if (handleExpired(error)) return;
    formError.value = equipmentErrorMessage(error, 'The equipment request could not be saved. Please try again.');
  } finally {
    saving.value = false;
  }
}

async function confirmCancel(item: EquipmentRequest) {
  if (saving.value) return;
  saving.value = true;
  actionError.value = '';
  notice.value = '';
  try {
    await cancelEquipmentRequest(item.id);
    notice.value = `Cancelled the request for ${item.quantity} × ${item.equipmentName}.`;
    emit('changed');
    await load();
  } catch (error) {
    if (handleExpired(error)) return;
    const message = equipmentErrorMessage(error, 'The equipment request could not be cancelled. Please try again.');
    await load();
    actionError.value = message;
  } finally {
    saving.value = false;
  }
}

watch(() => [props.eventRequestId, props.viewerRole] as const, () => {
  eventPeriod.value = null;
  notice.value = '';
  void load();
}, { immediate: true });
watch(() => authSession.user?.id, (userId) => {
  if (!userId) showSignIn();
  else void load();
}, { flush: 'sync' });
onBeforeUnmount(() => {
  controller?.abort();
  availabilityController?.abort();
});
</script>

<template>
  <section v-if="visible" class="panel eq-panel" :aria-labelledby="`${id}-title`">
    <header class="eq-header">
      <div>
        <h2 :id="`${id}-title`">Equipment</h2>
        <p>Technical support reserves requested equipment. Times are in Singapore time.</p>
      </div>
      <button
        v-if="canRequest && state.status === 'ready' && formFor !== 'new'"
        type="button" class="button button-primary" @click="openAddForm"
      >Request equipment</button>
    </header>

    <p v-if="notice" class="eq-success panel-notice" role="status">{{ notice }}</p>
    <p v-if="actionError" class="eq-error panel-notice" role="alert">{{ actionError }}</p>

    <p v-if="state.status === 'loading'" role="status">Loading equipment requests…</p>

    <div v-else-if="state.status === 'error'" class="eq-state" role="alert">
      <p>{{ state.message }}</p>
      <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
      <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
    </div>

    <template v-else>
      <form
        v-if="formFor" class="eq-form request-form" novalidate :aria-busy="saving"
        :aria-label="formFor === 'new' ? 'Request equipment' : 'Edit equipment request'" @submit.prevent="save"
      >
        <label v-if="formFor === 'new'" class="eq-field">Equipment type
          <select v-model="draft.equipmentTypeId" name="equipmentTypeId" required :disabled="availability.status !== 'ready'">
            <option value="" disabled>
              {{ availability.status === 'loading' ? 'Checking availability…'
                : availability.status === 'ready' ? 'Choose equipment' : 'Set the period to see equipment' }}
            </option>
            <template v-if="availability.status === 'ready'">
              <option v-for="option in availability.items" :key="option.equipmentTypeId" :value="option.equipmentTypeId">
                {{ option.name }} ({{ availabilityLabel(option.available, option.totalQuantity) }})
              </option>
            </template>
          </select>
        </label>
        <p v-else-if="editingRequest" class="request-form-title">Editing {{ editingRequest.equipmentName }}</p>

        <div class="eq-form-grid">
          <label class="eq-field">Quantity
            <input v-model="draft.quantity" type="number" name="quantity" min="1" step="1" inputmode="numeric" required />
          </label>
          <label class="eq-field">Needed from
            <input v-model="draft.startsAt" type="datetime-local" name="startsAt" required @change="loadAvailability" />
          </label>
          <label class="eq-field">Needed until
            <input v-model="draft.endsAt" type="datetime-local" name="endsAt" required @change="loadAvailability" />
          </label>
        </div>
        <p v-if="availability.status === 'error'" class="eq-error" role="alert">{{ availability.message }}</p>
        <p v-else-if="selectedAvailability" class="eq-hint" role="status">
          {{ availabilityLabel(selectedAvailability.available, selectedAvailability.totalQuantity) }} for this period.
          <template v-if="Number(draft.quantity) > selectedAvailability.available">
            You can still send the request, but technical support may not be able to reserve it all.
          </template>
        </p>
        <p v-else-if="formFor === 'new'" class="eq-hint">The period defaults to the event's start and end.</p>

        <label class="eq-field">Notes <span class="eq-optional">(optional)</span>
          <textarea v-model="draft.notes" name="notes" rows="3" maxlength="2000" />
        </label>
        <p v-if="formError" class="eq-error" role="alert">{{ formError }}</p>
        <div class="eq-actions">
          <button type="submit" class="button button-primary" :disabled="saving">
            {{ saving ? 'Saving…' : formFor === 'new' ? 'Send request' : 'Save changes' }}
          </button>
          <button type="button" class="button button-secondary" :disabled="saving" @click="closeForm">Close</button>
        </div>
      </form>

      <p v-if="state.items.length === 0 && !formFor" class="eq-muted">
        {{ canRequest ? 'No equipment has been requested for this event yet.'
          : eventEligible ? 'No equipment has been requested for this event.'
          : 'Equipment can be requested once the event request is approved.' }}
      </p>

      <ul v-if="state.items.length > 0" class="eq-list" aria-label="Equipment requests for this event">
        <li v-for="item in state.items" :key="item.id" class="eq-item">
          <div class="eq-item-head">
            <h3>{{ item.quantity }} × {{ item.equipmentName }}</h3>
            <span class="eq-pill" :class="`eq-pill--${item.status.toLowerCase()}`">{{ equipmentStatusLabel(item.status) }}</span>
          </div>
          <p class="eq-item-meta"><span>{{ formatPeriod(item.startsAt, item.endsAt) }}</span></p>
          <p v-if="item.notes" class="eq-item-body">{{ item.notes }}</p>
          <p v-if="item.decisionReason" class="eq-item-body">Reason: {{ item.decisionReason }}</p>

          <div v-if="canManage(item) && cancellingId === item.id" class="eq-actions" role="group" :aria-label="`Cancel ${item.equipmentName} request`">
            <span class="eq-muted">{{ item.status === 'RESERVED' ? 'This releases the reservation.' : 'Cancel this request?' }}</span>
            <button type="button" class="button button-primary button-reject" :disabled="saving" @click="confirmCancel(item)">
              {{ saving ? 'Cancelling…' : 'Confirm cancel' }}
            </button>
            <button type="button" class="button button-secondary" :disabled="saving" @click="cancellingId = null">Keep</button>
          </div>
          <div v-else-if="canManage(item) && (item.status === 'REQUESTED' || item.status === 'RESERVED')" class="eq-actions">
            <button
              v-if="item.status === 'REQUESTED'" type="button" class="button button-secondary"
              :aria-label="`Edit ${item.equipmentName} request`" @click="openEditForm(item)"
            >Edit</button>
            <button
              type="button" class="button button-danger"
              :aria-label="`Cancel ${item.equipmentName} request`" @click="cancellingId = item.id"
            >Cancel</button>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.panel-notice { margin-bottom: 16px; }
.request-form { margin-bottom: 20px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: #fbfcf9; }
.request-form-title { font-size: 14px; font-weight: 650; }
</style>
