<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { fetchEventRequestDetail, type EventRequestDetail } from '../api/event-requests';
import EventRequestForm from '../components/EventRequestForm.vue';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'not-editable'; request: EventRequestDetail }
  | { status: 'ready'; request: EventRequestDetail };

const route = useRoute();
const router = useRouter();
const requestId = computed(() => String(route.params.id ?? ''));
const state = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

function showSignIn() {
  controller?.abort();
  state.value = {
    status: 'error', signIn: true, retryable: false,
    message: 'Sign in to edit this event request.',
  };
}

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  // Clear the previous draft before rechecking access, editability or switching accounts.
  state.value = { status: 'loading' };
  try {
    const request = await fetchEventRequestDetail(requestId.value, current.signal);
    if (current.signal.aborted) return;
    state.value = request.actions.canEditDraft
      ? { status: 'ready', request } : { status: 'not-editable', request };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      showSignIn();
      return;
    }
    const unavailable = error instanceof ApiError && [400, 403, 404].includes(error.status ?? 0);
    state.value = {
      status: 'error', signIn: false, retryable: !unavailable,
      message: unavailable
        ? 'This draft is unavailable or you do not have permission to edit it.'
        : 'This draft could not be loaded. Please try again.',
    };
  }
}

async function onSubmitted(eventRequestId: string) {
  await router.push(`/events/${eventRequestId}`);
}

watch(requestId, () => { void load(); }, { immediate: true });
watch(() => [authSession.user?.id, authSession.user?.role], () => {
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For organisers</p>
    <h1>Edit draft</h1>
    <p class="page-description">Update your event details, then save your changes.</p>
  </section>

  <div class="detail-toolbar">
    <RouterLink to="/events" class="back-link">Back to event requests</RouterLink>
    <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="load">
      Reload
    </button>
  </div>

  <p v-if="state.status === 'loading'" class="panel edit-panel" role="status">Loading your draft…</p>

  <div v-else-if="state.status === 'error'" class="panel edit-panel edit-error" role="alert">
    <p>{{ state.message }}</p>
    <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
    <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
  </div>

  <div v-else-if="state.status === 'not-editable'" class="panel edit-panel" role="alert">
    <p>This request is no longer a draft and can no longer be edited here.</p>
    <!-- KAN-66: a submitted request may still be edited, with submission rules, until approval. -->
    <RouterLink v-if="state.request.actions.canEditDetails" :to="`/events/${state.request.id}/details`"
      class="button button-primary">Edit submitted details</RouterLink>
    <RouterLink :to="`/events/${state.request.id}`" class="button button-secondary">View request</RouterLink>
  </div>

  <EventRequestForm
    v-else
    :request="state.request"
    @submitted="onSubmitted"
    @session-expired="showSignIn"
  />
</template>

<style scoped>
.detail-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.back-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.edit-panel { padding: 24px; min-width: 0; }
.edit-error .button, .edit-panel[role='alert'] .button { margin-top: 12px; }
@media (max-width: 600px) {
  .edit-panel { padding: 20px; }
}
</style>
