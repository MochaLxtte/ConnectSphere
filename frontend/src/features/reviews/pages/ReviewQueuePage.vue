<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';
import { fetchReviewQueue } from '../api/submitted-requests';
import type { ReviewQueueItem } from '../types';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: ReviewQueueItem[] };

const state = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const items = await fetchReviewQueue(current.signal);
    if (!current.signal.aborted) state.value = { status: 'ready', items };
  } catch (error) {
    if (!current.signal.aborted) {
      state.value = {
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'The review queue could not be loaded. Please try again.',
      };
    }
  }
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
          <span class="queue-item-status">{{ item.status }}</span>
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
.queue-item-name { flex: 1; font-weight: 600; }
.queue-item-status { font-size: 13px; color: #59685e; text-transform: capitalize; }
</style>
