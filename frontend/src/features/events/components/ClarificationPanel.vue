<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue';
import {
  fetchClarifications, requestClarification, respondToClarification, startReview,
} from '../api/clarifications';
import { formatEventTime } from '../presentation';
import { usePanelAction, usePanelList, type WorkflowPanelProps } from './use-workflow-panel';

const props = defineProps<WorkflowPanelProps>();
const emit = defineEmits<{ changed: [] }>();

const id = useId();
const { items: clarifications, loading, loadError, load } = usePanelList(() => props.eventRequestId, fetchClarifications);
const { busy, actionError, savedMessage, run } = usePanelAction(async () => {
  emit('changed');
  await load();
});

const message = ref('');
const answers = reactive<Record<string, string>>({});

const isCoordinator = computed(() => props.viewerRole === 'EVENT_COORDINATOR');
const canAsk = computed(() => isCoordinator.value && ['SUBMITTED', 'UNDER_REVIEW'].includes(props.status));
const canStartReview = computed(() => isCoordinator.value && props.status === 'SUBMITTED');
const canAnswer = computed(() => props.isOwner === true && props.status === 'CLARIFICATION_REQUESTED');

async function ask() {
  const text = message.value.trim();
  if (!text) return;
  if (await run(() => requestClarification(props.eventRequestId, text), 'Your question was sent to the organiser.')) {
    message.value = '';
  }
}

async function answer(clarificationId: string) {
  const text = (answers[clarificationId] ?? '').trim();
  if (!text) return;
  if (await run(
    () => respondToClarification(props.eventRequestId, clarificationId, text),
    'Your answer was sent to the coordinator.',
  )) delete answers[clarificationId];
}

function beginReview() {
  return run(() => startReview(props.eventRequestId), 'The request is now under review.');
}
</script>

<template>
  <section class="panel workflow-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">Review</p>
      <h2 :id="`${id}-title`">Clarifications</h2>
      <p class="panel-description">
        {{ isCoordinator
          ? 'Ask the organiser for missing information before you decide.'
          : 'Questions from the coordinator reviewing your request appear here.' }}
      </p>
    </header>

    <p v-if="savedMessage" class="panel-saved" role="status">{{ savedMessage }}</p>
    <p v-if="actionError" class="panel-error" role="alert">{{ actionError }}</p>

    <p v-if="loading" role="status">Loading clarifications…</p>
    <div v-else-if="loadError" role="alert">
      <p class="panel-error">{{ loadError }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
    </div>
    <template v-else>
      <p v-if="clarifications.length === 0" class="panel-notice">No clarification has been requested.</p>
      <ul v-else class="panel-list">
        <li v-for="item in clarifications" :key="item.id">
          <div class="item-heading">
            <span class="item-label">{{ item.requestedByName }} asked</span>
            <span class="tag" :class="item.respondedAt ? 'tag-positive' : 'tag-waiting'">
              {{ item.respondedAt ? 'Answered' : 'Awaiting answer' }}
            </span>
          </div>
          <p>{{ item.message }}</p>
          <p class="panel-meta">{{ formatEventTime(item.createdAt) }}</p>
          <template v-if="item.respondedAt">
            <p><span class="item-label">Answer:</span> {{ item.response }}</p>
            <p class="panel-meta">{{ formatEventTime(item.respondedAt) }}</p>
          </template>
          <form v-else-if="canAnswer" :aria-busy="busy" @submit.prevent="answer(item.id)">
            <label :for="`${id}-answer-${item.id}`">Your answer</label>
            <textarea :id="`${id}-answer-${item.id}`" v-model="answers[item.id]" rows="3" maxlength="2000" :disabled="busy" />
            <div class="panel-actions">
              <button type="submit" class="button button-primary" :disabled="busy || !(answers[item.id] ?? '').trim()">
                {{ busy ? 'Sending…' : 'Send answer' }}
              </button>
            </div>
          </form>
        </li>
      </ul>

      <form v-if="canAsk" :aria-busy="busy" @submit.prevent="ask">
        <label :for="`${id}-message`">Question for the organiser</label>
        <textarea :id="`${id}-message`" v-model="message" rows="3" maxlength="2000" :disabled="busy" />
        <p class="panel-hint">The request returns to your queue once the organiser has answered.</p>
        <div class="panel-actions">
          <button type="submit" class="button button-primary" :disabled="busy || !message.trim()">
            {{ busy ? 'Sending…' : 'Request clarification' }}
          </button>
          <button v-if="canStartReview" type="button" class="button button-secondary" :disabled="busy" @click="beginReview">
            Mark as under review
          </button>
        </div>
      </form>
      <p v-else-if="isCoordinator && status === 'CLARIFICATION_REQUESTED'" class="panel-notice" role="status">
        Waiting for the organiser to answer.
      </p>
    </template>
  </section>
</template>

<style src="./workflow-panel.css"></style>
