<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { fetchEventRequestDetail, type EventDraftInput, type EventRequestDetail } from '../api/event-requests';
import EventRequestForm from '../components/EventRequestForm.vue';

/** The registration settings are optional until the shared detail response includes them. */
type EditableRequest = EventRequestDetail & Partial<EventDraftInput>;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean; viewRequest: boolean }
  | { status: 'ready'; request: EditableRequest };

const route = useRoute();
const router = useRouter();
const requestId = computed(() => String(route.params.id ?? ''));
const state = ref<LoadState>({ status: 'loading' });
let controller: AbortController | undefined;

function showSignIn(message = 'Sign in to edit this event request.') {
  controller?.abort();
  state.value = { status: 'error', signIn: true, retryable: false, viewRequest: false, message };
}

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  // Clear the previous draft before rechecking access or switching accounts.
  state.value = { status: 'loading' };
  try {
    const request: EditableRequest = await fetchEventRequestDetail(requestId.value, current.signal);
    if (current.signal.aborted) return;
    state.value = request.actions.canEditDraft
      ? { status: 'ready', request }
      : {
          status: 'error', signIn: false, retryable: false, viewRequest: true,
          message: 'This event request is no longer a draft, so it cannot be edited.',
        };
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      showSignIn();
      return;
    }
    const unavailable = error instanceof ApiError && [400, 403, 404].includes(error.status ?? 0);
    state.value = {
      status: 'error', signIn: false, retryable: !unavailable, viewRequest: false,
      message: unavailable
        ? 'This event request is unavailable or you do not have permission to edit it.'
        : 'This event request could not be loaded. Please try again.',
    };
  }
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
    <h1>Edit draft request</h1>
    <p class="page-description">Update your draft, then submit it when it is ready for review.</p>
  </section>

  <div class="form-toolbar">
    <RouterLink :to="`/events/${requestId}`" class="back-link">Back to this request</RouterLink>
  </div>

  <p v-if="state.status === 'loading'" class="panel form-message" role="status">Loading your draft…</p>
  <div v-else-if="state.status === 'error'" class="panel form-message" role="alert">
    <p>{{ state.message }}</p>
    <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
    <RouterLink v-else-if="state.viewRequest" :to="`/events/${requestId}`" class="button button-secondary">View this request</RouterLink>
    <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
  </div>
  <EventRequestForm
    v-else
    :key="state.request.id"
    :request="state.request"
    @submitted="(id) => router.push(`/events/${id}`)"
    @session-expired="showSignIn('Your session has expired. Sign in again to continue editing this draft.')"
  />
</template>

<style scoped>
.form-toolbar { margin-bottom: 20px; }
.back-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.form-message { padding: 24px; font-size: 14px; line-height: 1.6; max-width: 860px; }
.form-message .button { margin-top: 12px; font-size: 14px; padding: 11px 16px; }
</style>
