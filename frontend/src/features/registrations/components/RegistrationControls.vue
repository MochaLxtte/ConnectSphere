<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { registerForEvent, withdrawFromEvent, type PublicEvent } from '../api/registrations';
import { closedReasonMessage } from '../presentation';

const props = defineProps<{ event: PublicEvent }>();
/** The parent re-reads the event so counts and status always come from the server. */
const emit = defineEmits<{ changed: [eventRequestId: string] }>();

const pending = ref<'register' | 'withdraw' | null>(null);
const confirmingWithdrawal = ref(false);
const feedback = ref<{ tone: 'success' | 'error'; message: string } | null>(null);
let controller: AbortController | undefined;

const isAttendee = computed(() => authSession.user?.role === 'ATTENDEE');
const registered = computed(() => props.event.myRegistrationStatus === 'REGISTERED');
const eventName = computed(() => props.event.name?.trim() || 'Untitled event');

watch(() => props.event.id, () => {
  controller?.abort();
  pending.value = null;
  confirmingWithdrawal.value = false;
  feedback.value = null;
}, { flush: 'sync' });
onBeforeUnmount(() => controller?.abort());

async function run(action: 'register' | 'withdraw') {
  if (pending.value) return;
  const eventId = props.event.id;
  const current = new AbortController();
  controller = current;
  pending.value = action;
  confirmingWithdrawal.value = false;
  feedback.value = null;
  try {
    if (action === 'register') await registerForEvent(eventId, current.signal);
    else await withdrawFromEvent(eventId, current.signal);
    if (current.signal.aborted) return;
    feedback.value = {
      tone: 'success',
      message: action === 'register' ? 'You are registered for this event.' : 'Your registration was withdrawn.',
    };
    emit('changed', eventId);
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      // The page watching the session replaces this view with a sign-in prompt.
      clearLocalSession();
      return;
    }
    feedback.value = {
      tone: 'error',
      message: error instanceof ApiError && error.status === 404
        ? 'This event is no longer available.'
        : error instanceof Error ? error.message : 'The request could not be completed. Please try again.',
    };
    // A conflict means the page is stale (full, closed or already changed elsewhere).
    if (error instanceof ApiError && (error.status === 409 || error.status === 404)) emit('changed', eventId);
  } finally {
    if (controller === current) pending.value = null;
  }
}
</script>

<template>
  <div class="registration-controls" :aria-busy="pending !== null">
    <template v-if="registered">
      <p class="registration-state registration-state--registered">You are registered</p>
      <p v-if="event.closedReason === 'EVENT_STARTED'" class="registration-note">
        This event has started, so you can no longer withdraw.
      </p>
      <template v-else-if="isAttendee">
        <div v-if="confirmingWithdrawal" class="registration-confirm" role="group" :aria-label="`Withdraw from ${eventName}?`">
          <p>Withdraw from this event? Your place will be released.</p>
          <button type="button" class="button button-danger" :disabled="pending !== null" @click="run('withdraw')">
            Confirm withdrawal
          </button>
          <button type="button" class="button button-secondary" @click="confirmingWithdrawal = false">Keep my place</button>
        </div>
        <button
          v-else type="button" class="button button-secondary" :disabled="pending !== null"
          :aria-label="`Withdraw from ${eventName}`" @click="confirmingWithdrawal = true"
        >
          {{ pending === 'withdraw' ? 'Withdrawing…' : 'Withdraw' }}
        </button>
      </template>
    </template>

    <template v-else-if="!event.isOpen">
      <p class="registration-note">{{ closedReasonMessage(event) }}</p>
    </template>

    <template v-else-if="isAttendee">
      <button
        type="button" class="button button-primary" :disabled="pending !== null"
        :aria-label="`Register for ${eventName}`" @click="run('register')"
      >
        {{ pending === 'register' ? 'Registering…' : event.myRegistrationStatus === 'WITHDRAWN' ? 'Register again' : 'Register' }}
      </button>
    </template>
    <p v-else class="registration-note">Only attendee accounts can register for events.</p>

    <p v-if="feedback" class="registration-feedback" :class="`registration-feedback--${feedback.tone}`"
      :role="feedback.tone === 'error' ? 'alert' : 'status'">
      {{ feedback.message }}
    </p>
  </div>
</template>

<style scoped>
.registration-controls { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; min-width: 0; }
.registration-controls .button { font-size: 14px; padding: 10px 16px; }
.button-danger { background: #954537; color: #fff; }
.registration-state { font-size: 13px; font-weight: 650; border-radius: 20px; padding: 6px 12px; }
.registration-state--registered { background: #edf5e9; color: #365d2e; }
.registration-note, .registration-confirm p { color: #59685e; font-size: 13px; line-height: 1.6; }
.registration-confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.registration-confirm p { flex-basis: 100%; }
.registration-feedback { font-size: 13px; line-height: 1.6; }
.registration-feedback--success { color: #365d2e; }
.registration-feedback--error { color: #853e37; }
</style>
