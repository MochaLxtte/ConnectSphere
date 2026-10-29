<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../lib/api-client.js';
import { authSession, clearLocalSession } from '../auth/session.js';
import { fetchSafetyQueue, singaporeTime, type SafetyQueueItem } from './api.js';

/** KAN-84-AC1: the Safety Officer's queue of rounds awaiting a decision. */
const items = ref<SafetyQueueItem[]>([]);
const loading = ref(false);
const error = ref('');
let controller: AbortController | undefined;
const permitted = computed(() => !authSession.loading && authSession.user?.role === 'SAFETY_OFFICER');

async function load() {
  controller?.abort(); items.value = []; error.value = '';
  if (!permitted.value) return;
  const current = new AbortController(); controller = current;
  loading.value = true;
  try {
    const result = await fetchSafetyQueue(current.signal);
    if (!current.signal.aborted) items.value = result.items;
  } catch (caught) {
    if (current.signal.aborted) return;
    if (caught instanceof ApiError && caught.status === 401) clearLocalSession();
    error.value = caught instanceof Error ? caught.message : 'Safety reviews could not be loaded.';
  } finally { if (!current.signal.aborted) loading.value = false; }
}
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role], () => { void load(); }, { immediate: true });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="panel safety-page" aria-labelledby="safety-queue-heading">
    <header class="page-heading">
      <div><p class="eyebrow">Safety</p><h1 id="safety-queue-heading">Safety reviews</h1></div>
      <button v-if="permitted" class="button button-secondary" type="button" :disabled="loading" @click="load">Refresh</button>
    </header>
    <p v-if="authSession.loading || loading" role="status">Loading safety reviews…</p>
    <p v-else-if="!authSession.user">Sign in to view safety reviews. <RouterLink to="/login">Sign in</RouterLink></p>
    <p v-else-if="!permitted" role="alert">Only a Safety Officer can view the safety review queue.</p>
    <template v-else>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-else-if="!items.length" role="status">No safety reviews are waiting for a decision.</p>
      <ul v-else class="queue">
        <li v-for="item in items" :key="item.id">
          <RouterLink :to="`/safety-reviews/${item.id}`"><strong>{{ item.eventName || 'Untitled event' }}</strong> · round {{ item.round }}</RouterLink>
          <p>Submitted {{ singaporeTime(item.submittedAt) }}<template v-if="item.startsAt"> · event starts {{ singaporeTime(item.startsAt) }}</template> (Singapore time)</p>
          <p v-if="item.stale" class="stale">Arrangements changed since submission; this round cannot be approved.</p>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.safety-page { padding: 28px; display: grid; gap: 16px; }
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.eyebrow { color: var(--green); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 8px; }
h1 { margin: 0; font-size: 26px; }
.queue { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
.queue li { border-top: 1px solid var(--border); padding-top: 14px; }
.queue p { margin: 4px 0 0; }
.stale { color: #8a332b; }
@media (max-width: 600px) { .safety-page { padding: 20px; } h1 { font-size: 22px; } }
</style>
