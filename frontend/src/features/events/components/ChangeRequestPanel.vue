<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue';
import {
  createChangeRequest, decideChangeRequest, fetchChangeRequests, withdrawChangeRequest,
  type ChangeRequestStatus, type ProposedChanges,
} from '../api/change-requests';
import { formatEventTime } from '../presentation';
import { usePanelAction, usePanelList, type WorkflowPanelProps } from './use-workflow-panel';

const props = defineProps<WorkflowPanelProps>();
const emit = defineEmits<{ changed: [] }>();

const id = useId();
const { items: changeRequests, loading, loadError, load } = usePanelList(() => props.eventRequestId, fetchChangeRequests);
const { busy, actionError, savedMessage, run } = usePanelAction(async () => {
  emit('changed');
  await load();
});

const textFields = [
  ['name', 'Event name'], ['purpose', 'Purpose'], ['description', 'Description'],
  ['venueRequirements', 'Venue requirements'], ['accessibilityNeeds', 'Accessibility needs'],
  ['equipmentRequirements', 'Equipment requirements'],
] as const;
const fieldLabels: Record<keyof ProposedChanges, string> = {
  ...Object.fromEntries(textFields) as Record<(typeof textFields)[number][0], string>,
  startsAt: 'Starts', endsAt: 'Ends', expectedAttendance: 'Expected attendance',
  registrationRequired: 'Registration required',
};
const statusLabels: Record<ChangeRequestStatus, string> = {
  PENDING: 'Awaiting decision', APPROVED: 'Approved', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
};

const blankForm = () => ({
  name: '', purpose: '', description: '', venueRequirements: '', accessibilityNeeds: '',
  equipmentRequirements: '', startsAt: '', endsAt: '', expectedAttendance: '' as number | '',
  registrationRequired: '' as '' | 'true' | 'false', reason: '',
});
const form = reactive(blankForm());
const decisionReason = ref('');
const formError = ref<string | null>(null);

const changeable = computed(() => props.status === 'APPROVED' || props.status === 'CONFIRMED');
const pending = computed(() => changeRequests.value.find((item) => item.status === 'PENDING') ?? null);
const canPropose = computed(() => props.isOwner === true && changeable.value && !pending.value);
const canDecide = computed(() => props.viewerRole === 'EVENT_COORDINATOR');

function collectChanges(): ProposedChanges | null {
  const changes: ProposedChanges = {};
  for (const [field] of textFields) {
    if (form[field].trim()) changes[field] = form[field].trim();
  }
  for (const field of ['startsAt', 'endsAt'] as const) {
    if (!form[field]) continue;
    const date = new Date(form[field]);
    if (Number.isNaN(date.getTime())) {
      formError.value = 'Enter a valid date and time.';
      return null;
    }
    changes[field] = date.toISOString();
  }
  if (form.expectedAttendance !== '') {
    const attendance = Number(form.expectedAttendance);
    if (!Number.isInteger(attendance) || attendance < 0) {
      formError.value = 'Expected attendance must be a whole number of zero or more.';
      return null;
    }
    changes.expectedAttendance = attendance;
  }
  if (form.registrationRequired) changes.registrationRequired = form.registrationRequired === 'true';
  if (changes.startsAt && changes.endsAt && changes.endsAt <= changes.startsAt) {
    formError.value = 'The event must end after it starts.';
    return null;
  }
  if (Object.keys(changes).length === 0) {
    formError.value = 'Fill in at least one field you want to change.';
    return null;
  }
  return changes;
}

async function propose() {
  formError.value = null;
  if (!form.reason.trim()) {
    formError.value = 'Explain why the change is needed.';
    return;
  }
  const proposedChanges = collectChanges();
  if (!proposedChanges) return;
  const saved = await run(
    () => createChangeRequest(props.eventRequestId, { proposedChanges, reason: form.reason.trim() }),
    'Your change request was sent to the coordinator.',
  );
  if (saved) Object.assign(form, blankForm());
}

function withdraw(changeRequestId: string) {
  return run(() => withdrawChangeRequest(props.eventRequestId, changeRequestId), 'The change request was withdrawn.');
}

async function decide(changeRequestId: string, decision: 'APPROVED' | 'REJECTED') {
  const saved = await run(
    () => decideChangeRequest(props.eventRequestId, changeRequestId, {
      decision, reason: decisionReason.value.trim() || null,
    }),
    decision === 'APPROVED'
      ? 'The changes were approved and applied to the event.'
      : 'The change request was rejected.',
  );
  if (saved) decisionReason.value = '';
}

function displayValue(field: keyof ProposedChanges, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Cleared';
  if (field === 'startsAt' || field === 'endsAt') return formatEventTime(String(value));
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function changeEntries(changes: ProposedChanges) {
  return (Object.keys(changes) as (keyof ProposedChanges)[]).map((field) => ({
    field, label: fieldLabels[field] ?? field, value: displayValue(field, changes[field]),
  }));
}
</script>

<template>
  <section class="panel workflow-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">After approval</p>
      <h2 :id="`${id}-title`">Change requests</h2>
      <p class="panel-description">
        Changes to an approved event are reviewed by the coordinator. Changing the dates or expected
        attendance cancels existing venue bookings and equipment requests, which must be requested again.
      </p>
    </header>

    <p v-if="savedMessage" class="panel-saved" role="status">{{ savedMessage }}</p>
    <p v-if="actionError" class="panel-error" role="alert">{{ actionError }}</p>

    <p v-if="loading" role="status">Loading change requests…</p>
    <div v-else-if="loadError" role="alert">
      <p class="panel-error">{{ loadError }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <template v-else>
      <p v-if="changeRequests.length === 0" class="panel-notice">No changes have been requested.</p>
      <ul v-else class="panel-list">
        <li v-for="item in changeRequests" :key="item.id">
          <div class="item-heading">
            <span class="item-label">Requested by {{ item.requestedByName }}</span>
            <span
              class="tag"
              :class="{ 'tag-waiting': item.status === 'PENDING', 'tag-positive': item.status === 'APPROVED',
                        'tag-negative': item.status === 'REJECTED' }"
            >{{ statusLabels[item.status] }}</span>
          </div>
          <p class="panel-meta">{{ formatEventTime(item.createdAt) }}</p>
          <ul class="change-list" :aria-label="`Proposed changes from ${item.requestedByName}`">
            <li v-for="entry in changeEntries(item.proposedChanges)" :key="entry.field">
              <span class="item-label">{{ entry.label }}:</span> {{ entry.value }}
            </li>
          </ul>
          <p><span class="item-label">Reason:</span> {{ item.reason }}</p>
          <p v-if="item.decidedAt" class="panel-meta">
            {{ statusLabels[item.status] }} by {{ item.decidedByName ?? 'a coordinator' }} on
            {{ formatEventTime(item.decidedAt) }}<template v-if="item.decisionReason"> — {{ item.decisionReason }}</template>
          </p>

          <div v-if="item.status === 'PENDING' && isOwner" class="panel-actions">
            <button type="button" class="button button-secondary" :disabled="busy" @click="withdraw(item.id)">
              {{ busy ? 'Saving…' : 'Withdraw request' }}
            </button>
          </div>
          <form v-else-if="item.status === 'PENDING' && canDecide" :aria-busy="busy" @submit.prevent>
            <label :for="`${id}-decision-reason`">Decision reason <span class="optional">(optional)</span></label>
            <textarea :id="`${id}-decision-reason`" v-model="decisionReason" rows="2" maxlength="2000" :disabled="busy" />
            <div class="panel-actions">
              <button type="button" class="button button-primary" :disabled="busy || !changeable" @click="decide(item.id, 'APPROVED')">
                Approve and apply
              </button>
              <button type="button" class="button button-danger" :disabled="busy" @click="decide(item.id, 'REJECTED')">
                Reject changes
              </button>
            </div>
          </form>
        </li>
      </ul>

      <form v-if="canPropose" :aria-busy="busy" novalidate @submit.prevent="propose">
        <h3>Request a change</h3>
        <p class="panel-hint">Fill in only the fields you want to change; blank fields stay as they are.</p>
        <div class="field-grid">
          <div v-for="[field, label] in textFields" :key="field">
            <label :for="`${id}-${field}`">{{ label }}</label>
            <input :id="`${id}-${field}`" v-model="form[field]" type="text" :disabled="busy" />
          </div>
          <div>
            <label :for="`${id}-startsAt`">Starts</label>
            <input :id="`${id}-startsAt`" v-model="form.startsAt" type="datetime-local" :disabled="busy" />
          </div>
          <div>
            <label :for="`${id}-endsAt`">Ends</label>
            <input :id="`${id}-endsAt`" v-model="form.endsAt" type="datetime-local" :disabled="busy" />
          </div>
          <div>
            <label :for="`${id}-attendance`">Expected attendance</label>
            <input :id="`${id}-attendance`" v-model.number="form.expectedAttendance" type="number" min="0" step="1" :disabled="busy" />
          </div>
          <div>
            <label :for="`${id}-registration`">Registration required</label>
            <select :id="`${id}-registration`" v-model="form.registrationRequired" :disabled="busy">
              <option value="">No change</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        <label :for="`${id}-reason`">Why is this change needed?</label>
        <textarea :id="`${id}-reason`" v-model="form.reason" rows="3" maxlength="2000" :disabled="busy" />
        <p v-if="formError" class="panel-error" role="alert">{{ formError }}</p>
        <div class="panel-actions">
          <button type="submit" class="button button-primary" :disabled="busy">
            {{ busy ? 'Sending…' : 'Submit change request' }}
          </button>
        </div>
      </form>
      <p v-else-if="isOwner && pending" class="panel-notice" role="status">
        A change request is awaiting a decision. Withdraw it before proposing different changes.
      </p>
      <p v-else-if="isOwner && !changeable" class="panel-notice" role="status">
        Changes can be requested once the event is approved or confirmed.
      </p>
    </template>
  </section>
</template>

<style src="./workflow-panel.css"></style>
