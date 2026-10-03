<script setup lang="ts">
import { useId, watch } from 'vue';
import { fetchStatusHistory } from '../api/status-history';
import { eventStatusLabel, formatEventTime } from '../presentation';
import { usePanelList } from './use-workflow-panel';

const props = defineProps<{ eventRequestId: string; status: string }>();
const id = useId();
const { items: history, loading, loadError, load } = usePanelList(() => props.eventRequestId, fetchStatusHistory);

// Review and clarification actions refresh the host request without remounting this panel.
watch(() => props.status, () => { void load(); });
</script>

<template>
  <section class="panel workflow-panel" :aria-labelledby="`${id}-title`">
    <header>
      <p class="eyebrow">Request progress</p>
      <h2 :id="`${id}-title`">Event status</h2>
      <p class="panel-description">Current status: <strong>{{ eventStatusLabel(status) }}</strong></p>
    </header>

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
