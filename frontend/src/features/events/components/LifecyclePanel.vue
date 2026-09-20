<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { cancelEvent, completeEvent, confirmEvent, fetchStatusHistory } from '../api/lifecycle';
import { eventStatusLabel, formatEventTime } from '../presentation';
import { usePanelAction, usePanelList, type WorkflowPanelProps } from './use-workflow-panel';

const props = defineProps<WorkflowPanelProps>();
const emit = defineEmits<{ changed: [] }>();

const id = useId();
const { items: history, loading, loadError, load } = usePanelList(() => props.eventRequestId, fetchStatusHistory);
const { busy, actionError, savedMessage, run, reset } = usePanelAction(async () => {
  emit('changed');
  await load();
});

const cancelling = ref(false);
const reason = ref('');

const isCoordinator = computed(() => props.viewerRole === 'EVENT_COORDINATOR');
const canConfirm = computed(() => isCoordinator.value && props.status === 'APPROVED');
const canComplete = computed(() => isCoordinator.value && props.status === 'CONFIRMED');
const canCancel = computed(() => (isCoordinator.value || props.isOwner === true)
  && !['DRAFT', 'REJECTED', 'CANCELLED', 'COMPLETED'].includes(props.status));

function confirm() {
  return run(() => confirmEvent(props.eventRequestId), 'The event is confirmed.');
}

function complete() {
  return run(() => completeEvent(props.eventRequestId), 'The event was marked as completed.');
}

function openCancel() {
  reset();
  cancelling.value = true;
}

async function cancel() {
  const text = reason.value.trim();
  if (!text) return;
  const saved = await run(
    () => cancelEvent(props.eventRequestId, text),
    'The event was cancelled. Its venue bookings and equipment requests were released.',
  );
  if (saved) {
    cancelling.value = false;
    reason.value = '';
  }
}
</script>

<template>
  <section class="panel workflow-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">Lifecycle</p>
      <h2 :id="`${id}-title`">Event status</h2>
      <p class="panel-description">Current status: <strong>{{ eventStatusLabel(status) }}</strong></p>
    </header>

    <p v-if="savedMessage" class="panel-saved" role="status">{{ savedMessage }}</p>
    <p v-if="actionError" class="panel-error" role="alert">{{ actionError }}</p>

    <div v-if="(canConfirm || canComplete || canCancel) && !cancelling" class="panel-actions">
      <button v-if="canConfirm" type="button" class="button button-primary" :disabled="busy" @click="confirm">
        {{ busy ? 'Saving…' : 'Confirm event' }}
      </button>
      <button v-if="canComplete" type="button" class="button button-primary" :disabled="busy" @click="complete">
        {{ busy ? 'Saving…' : 'Mark as completed' }}
      </button>
      <button v-if="canCancel" type="button" class="button button-secondary" :disabled="busy" @click="openCancel">
        Cancel event…
      </button>
    </div>
    <p v-if="canConfirm && !cancelling" class="panel-hint">
      Confirming needs an approved venue booking and no equipment request still awaiting a decision.
    </p>
    <p v-if="canComplete && !cancelling" class="panel-hint">An event can be completed after its end time.</p>

    <form v-if="cancelling" :aria-busy="busy" @submit.prevent="cancel">
      <label :for="`${id}-reason`">Reason for cancelling</label>
      <textarea :id="`${id}-reason`" v-model="reason" rows="3" maxlength="2000" :disabled="busy" />
      <p class="panel-hint">
        Cancelling cannot be undone. Venue bookings and equipment requests are released and registered
        attendees are notified.
      </p>
      <div class="panel-actions">
        <button type="submit" class="button button-danger" :disabled="busy || !reason.trim()">
          {{ busy ? 'Cancelling…' : 'Cancel this event' }}
        </button>
        <button type="button" class="button button-secondary" :disabled="busy" @click="cancelling = false">
          Keep event
        </button>
      </div>
    </form>

    <h3 :id="`${id}-history`">Status history</h3>
    <p v-if="loading" role="status">Loading status history…</p>
    <div v-else-if="loadError" role="alert">
      <p class="panel-error">{{ loadError }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <p v-else-if="history.length === 0" class="panel-notice">No status changes have been recorded.</p>
    <ol v-else class="timeline" :aria-labelledby="`${id}-history`">
      <li v-for="entry in history" :key="entry.id">
        <span class="item-label">{{ eventStatusLabel(entry.toStatus) }}</span>
        <span v-if="entry.fromStatus" class="panel-meta"> from {{ eventStatusLabel(entry.fromStatus) }}</span>
        <br />
        <span class="panel-meta">
          {{ formatEventTime(entry.createdAt) }}<template v-if="entry.changedByName"> · {{ entry.changedByName }}</template>
        </span>
      </li>
    </ol>
  </section>
</template>

<style src="./workflow-panel.css"></style>
