<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { ApiError } from '../../../lib/api-client';
import { clearLocalSession } from '../../auth/session.js';
import { eventStatusLabel } from '../../events/presentation';
import { fetchDecidedRequests, fetchReviewQueue } from '../api/submitted-requests';
import type { ReviewQueueItem } from '../types';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: ReviewQueueItem[] };

const state = ref<LoadState>({ status: 'loading' });
const decided = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

async function loadInto(
  target: Ref<LoadState>,
  fetcher: (signal: AbortSignal) => Promise<ReviewQueueItem[]>,
  fallbackMessage: string,
  signal: AbortSignal,
) {
  try {
    const items = await fetcher(signal);
    if (!signal.aborted) target.value = { status: 'ready', items };
  } catch (error) {
    if (signal.aborted) return;
    // The parent access page unmounts this queue when the session expires.
    if (error instanceof ApiError && error.status === 401) clearLocalSession();
    target.value = { status: 'error', message: error instanceof Error ? error.message : fallbackMessage };
  }
}

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  decided.value = { status: 'loading' };
  await Promise.all([
    loadInto(state, fetchReviewQueue, 'The review queue could not be loaded. Please try again.', current.signal),
    loadInto(decided, fetchDecidedRequests, 'Decided requests could not be loaded. Please try again.', current.signal),
  ]);
}

onMounted(load);
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For coordinators</p>
    <h1>Review queue</h1>
    <p class="page-description">Review submitted event requests and coordinate next steps.</p>
  </section>

  <section class="panel" aria-labelledby="queue-title">
    <h2 id="queue-title" class="sr-only">Submitted event requests awaiting review</h2>

    <p v-if="state.status === 'loading'" role="status">Loading the review queue…</p>

    <div v-else-if="state.status === 'error'" role="alert">
      <p>{{ state.message }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
    </div>

    <div v-else-if="state.items.length === 0" class="feature-placeholder">
      <div class="empty-illustration"><AppIcon name="review" :size="38" /></div>
      <h2>No requests are awaiting review</h2>
      <p>Submitted event requests you are authorised to review will appear here.</p>
    </div>

    <ul v-else class="queue-list">
      <li v-for="item in state.items" :key="item.id">
        <RouterLink :to="`/reviews/${item.id}`" class="queue-item">
          <span class="queue-item-name">{{ item.name ?? 'Untitled event request' }}</span>
          <span class="queue-item-status">{{ eventStatusLabel(item.status) }}</span>
          <AppIcon name="arrow" :size="16" />
        </RouterLink>
      </li>
    </ul>
  </section>

  <section class="panel decided-panel" aria-labelledby="decided-title">
    <h2 id="decided-title">Decided requests</h2>
    <p class="decided-description">
      Requests assigned to you that already have an approval or rejection stay here, so you can
      reopen them for follow-up.
    </p>

    <p v-if="decided.status === 'loading'">Loading decided requests…</p>

    <div v-else-if="decided.status === 'error'" role="alert">
      <p>{{ decided.message }}</p>
      <button type="button" class="button button-secondary" @click="load">Try again</button>
    </div>

    <p v-else-if="decided.items.length === 0" class="decided-empty">No decided requests yet.</p>

    <ul v-else class="queue-list" aria-label="Decided requests">
      <li v-for="item in decided.items" :key="item.id">
        <RouterLink :to="`/reviews/${item.id}`" class="queue-item">
          <span class="queue-item-name">{{ item.name ?? 'Untitled event request' }}</span>
          <span class="queue-item-status">{{ eventStatusLabel(item.status) }}</span>
          <AppIcon name="arrow" :size="16" />
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.queue-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.queue-item {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: inherit;
}
.queue-item-name { flex: 1; font-weight: 600; min-width: 0; overflow-wrap: anywhere; }
.queue-item-status { font-size: 13px; color: #59685e; }
.decided-panel { margin-top: 20px; }
.decided-panel h2 { font-size: 19px; }
.decided-description { color: #59685e; font-size: 14px; line-height: 1.6; margin: 6px 0 16px; }
.decided-empty { font-size: 14px; color: #59685e; }
</style>
