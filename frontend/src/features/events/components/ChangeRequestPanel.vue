<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useRoute } from 'vue-router';
import {
  decideChangeRequest, fetchChangeRequests, withdrawChangeRequest, type ChangeRequestRecord,
} from '../api/change-requests';
import { changeFieldConfig, changedFields, formatChangeValue } from '../change-request-fields';
import { formatEventTime } from '../presentation';
import { usePanelAction, usePanelList, type WorkflowPanelProps } from './use-workflow-panel';

/** KAN-15: change requests for an approved or confirmed event, for its owner and coordinator. */
const props = defineProps<WorkflowPanelProps>();
const emit = defineEmits<{ changed: [] }>();

const id = useId();
const route = useRoute();
const highlightedRequest = computed(() => typeof route?.query.change === 'string' ? route.query.change : null);
const { items: requests, loading, loadError, load } = usePanelList(() => props.eventRequestId, fetchChangeRequests);
const { busy, actionError, savedMessage, run } = usePanelAction(async () => {
  emit('changed');
  await load();
});
const rejectReason = ref('');

const isCoordinator = computed(() => props.viewerRole === 'EVENT_COORDINATOR');
const planning = computed(() => ['APPROVED', 'CONFIRMED'].includes(props.status));
const pending = computed(() => requests.value.find((item) => item.status === 'PENDING') ?? null);
const history = computed(() => requests.value.filter((item) => item.status !== 'PENDING'));
const canRequest = computed(() => props.isOwner === true && planning.value && !pending.value);
const canDecide = computed(() => isCoordinator.value && props.revision !== undefined);

const statusLabel: Record<ChangeRequestRecord['status'], string> = {
  PENDING: 'Awaiting review', APPROVED: 'Approved and applied', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
};
const statusTag: Record<ChangeRequestRecord['status'], string> = {
  PENDING: 'tag-waiting', APPROVED: 'tag-positive', REJECTED: 'tag-negative', WITHDRAWN: '',
};

function arrangementLabel(item: { kind: string; label: string; quantity: number | null; status: string }) {
  const what = item.kind === 'VENUE_BOOKING' ? `Venue booking at ${item.label}` : `${item.quantity ?? ''} × ${item.label}`.trim();
  return `${what} (${item.status.toLowerCase()})`;
}

function cancelledCount(item: ChangeRequestRecord) {
  const cancelled = item.cancelledArrangements;
  return cancelled ? cancelled.venueBookings.length + cancelled.equipmentRequests.length : 0;
}

function approve(item: ChangeRequestRecord) {
  return run(() => decideChangeRequest(props.eventRequestId, item.id, { decision: 'APPROVED' }, props.revision!),
    'The change was approved and applied to the event.');
}

async function reject(item: ChangeRequestRecord) {
  const reason = rejectReason.value.trim();
  if (!reason) return;
  if (await run(() => decideChangeRequest(props.eventRequestId, item.id, { decision: 'REJECTED', reason }, props.revision!),
    'The change was rejected. The organiser has been told why.')) rejectReason.value = '';
}

function withdraw(item: ChangeRequestRecord) {
  return run(() => withdrawChangeRequest(props.eventRequestId, item.id), 'Your change request was withdrawn.');
}
</script>

<template>
  <section class="panel workflow-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">Planning</p>
      <h2 :id="`${id}-title`">Change requests</h2>
      <p class="panel-description">
        {{ isCoordinator
          ? 'Review significant changes the organiser asks for, and the arrangements they would affect.'
          : 'Ask for significant changes to an approved event. The coordinator reviews them first.' }}
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
      <div v-if="pending" class="change-pending" :class="{ 'targeted-change': highlightedRequest === pending.id }" data-testid="pending-change-request">
        <p v-if="highlightedRequest === pending.id" role="status">This is the change request from your notification.</p>
        <div class="item-heading">
          <span class="item-label">Requested by {{ pending.requestedByName }}</span>
          <span class="tag tag-waiting">Awaiting review</span>
        </div>
        <p class="panel-meta">{{ formatEventTime(pending.createdAt) }}</p>

        <table class="change-table">
          <caption class="visually-hidden">Current and requested values</caption>
          <thead><tr><th scope="col">Detail</th><th scope="col">Current</th><th scope="col">Requested</th></tr></thead>
          <tbody>
            <tr v-for="field in changedFields(pending.proposed)" :key="field">
              <th scope="row">{{ changeFieldConfig[field].label }}</th>
              <td>{{ formatChangeValue(field, pending.current?.[field] ?? pending.previous[field]) }}</td>
              <td>{{ formatChangeValue(field, pending.proposed[field]) }}</td>
            </tr>
          </tbody>
        </table>

        <p v-if="pending.outdated" class="panel-error" role="alert">
          Some of these details changed after the change was requested, so it can no longer be approved.
        </p>

        <template v-if="isCoordinator && pending.impact">
          <h3>Effect on arrangements</h3>
          <p v-if="pending.impact.blockedReason" class="panel-error" role="alert">{{ pending.impact.blockedReason }}</p>
          <ul v-if="pending.impact.confirmed.length > 0" class="impact-list" aria-label="Confirmed arrangements affected">
            <li v-for="item in pending.impact.confirmed" :key="item.id">{{ arrangementLabel(item) }}</li>
          </ul>
          <template v-if="pending.impact.pending.length > 0">
            <p class="panel-hint">Approving cancels these pending arrangements so they can be requested again:</p>
            <ul class="impact-list" aria-label="Pending arrangements cancelled on approval">
              <li v-for="item in pending.impact.pending" :key="item.id">{{ arrangementLabel(item) }}</li>
            </ul>
          </template>
          <p v-if="pending.impact.canApprove && pending.impact.pending.length === 0" class="panel-hint">
            No existing arrangement is affected.
          </p>

          <div v-if="canDecide" class="panel-actions">
            <button type="button" class="button button-primary" :disabled="busy || !pending.impact.canApprove || pending.outdated"
              @click="approve(pending)">
              {{ busy ? 'Saving…' : 'Approve and apply' }}
            </button>
          </div>
          <form v-if="canDecide" :aria-busy="busy" @submit.prevent="reject(pending)">
            <label :for="`${id}-reason`">Reason for rejecting</label>
            <textarea :id="`${id}-reason`" v-model="rejectReason" rows="3" maxlength="2000" :disabled="busy" />
            <div class="panel-actions">
              <button type="submit" class="button button-danger" :disabled="busy || !rejectReason.trim()">Reject change</button>
            </div>
          </form>
        </template>

        <div v-else-if="isOwner" class="panel-actions">
          <p class="panel-hint">The event keeps its current details until the coordinator approves the change.</p>
          <button type="button" class="button button-secondary" :disabled="busy" @click="withdraw(pending)">
            Withdraw change request
          </button>
        </div>
      </div>

      <div v-if="canRequest" class="panel-actions">
        <RouterLink :to="`/events/${eventRequestId}/change-request`" class="button button-primary">Request a change</RouterLink>
      </div>
      <p v-else-if="!pending && isOwner && !planning && history.length === 0" class="panel-notice">
        This event can no longer be changed.
      </p>

      <h3 v-if="history.length > 0">Earlier change requests</h3>
      <p v-else-if="!pending" class="panel-notice">No change has been requested.</p>
      <ul v-if="history.length > 0" class="panel-list">
        <li v-for="item in history" :key="item.id" :class="{ 'targeted-change': highlightedRequest === item.id }">
          <p v-if="highlightedRequest === item.id" role="status">This is the change request from your notification.</p>
          <div class="item-heading">
            <span class="item-label">{{ changedFields(item.proposed).map((field) => changeFieldConfig[field].label).join(', ') }}</span>
            <span class="tag" :class="statusTag[item.status]">{{ statusLabel[item.status] }}</span>
          </div>
          <p class="panel-meta">
            Requested {{ formatEventTime(item.createdAt) }}<template v-if="item.decidedAt"> · decided {{ formatEventTime(item.decidedAt) }}
            <template v-if="item.decidedByName"> by {{ item.decidedByName }}</template></template>
          </p>
          <p v-if="item.decisionReason"><span class="item-label">Reason:</span> {{ item.decisionReason }}</p>
          <p v-if="cancelledCount(item) > 0" class="panel-meta">
            {{ cancelledCount(item) }} pending arrangement{{ cancelledCount(item) === 1 ? ' was' : 's were' }} cancelled for resubmission.
          </p>
        </li>
      </ul>
    </template>
  </section>
</template>

<style src="./workflow-panel.css"></style>
<style scoped>
.change-pending { margin-top: 20px; border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.targeted-change { outline: 2px solid var(--green); outline-offset: 4px; }
.change-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
.change-table th, .change-table td { text-align: left; padding: 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
.change-table thead th { font-size: 13px; color: #59685e; }
.impact-list { margin: 8px 0 0 20px; font-size: 14px; line-height: 1.6; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
