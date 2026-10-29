<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { authSession, clearLocalSession } from '../auth/session.js';
import { ApiError } from '../../lib/api-client.js';
import { listMine, getRoster, withdraw, type OwnRegistration, type Roster } from './api.js';

const route = useRoute();
const eventId = computed(() => typeof route.params.id === 'string' ? route.params.id : '');
const manager = computed(() => !!eventId.value);
const selected = computed(() => typeof route.query.registration === 'string' ? route.query.registration : '');
const permitted = computed(() => !authSession.loading && !!authSession.user && (manager.value
  ? ['EVENT_ORGANISER', 'EVENT_COORDINATOR'].includes(authSession.user.role) : authSession.user.role === 'ATTENDEE'));
const own = ref<OwnRegistration[]>([]);
const roster = ref<Roster | null>(null);
const loading = ref(false);
const error = ref('');
const success = ref('');
const pending = ref<OwnRegistration | null>(null);
const saving = ref(false);
const dialog = ref<HTMLDialogElement | null>(null);
let controller: AbortController | null = null;
let generation = 0;
const status = (value: string) => ({ REGISTERED: 'Active', WITHDRAWN: 'Withdrawn', CANCELLED: 'Event cancelled' }[value] ?? value);
const time = (value: string | null) => value ? new Date(value).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) : '—';
function cancel() { pending.value = null; dialog.value?.close(); }
async function load() {
  const ticket = ++generation;
  controller?.abort(); controller = new AbortController();
  const signal = controller.signal;
  own.value = []; roster.value = null; error.value = ''; success.value = ''; saving.value = false; cancel();
  loading.value = permitted.value;
  if (!permitted.value) return;
  try {
    if (manager.value) {
      const result = await getRoster(eventId.value, signal);
      if (ticket === generation) roster.value = result;
    } else {
      const result = await listMine(signal);
      if (ticket === generation) own.value = result.items;
    }
  } catch (cause) {
    if (ticket !== generation || signal.aborted) return;
    if (cause instanceof ApiError && cause.status === 401) clearLocalSession();
    error.value = cause instanceof Error ? cause.message : 'Unable to load registrations.';
  } finally { if (ticket === generation) loading.value = false; }
}
async function confirm(row: OwnRegistration) {
  pending.value = row; await nextTick(); dialog.value?.showModal();
}
async function save() {
  if (!pending.value || saving.value) return;
  const ticket = generation, id = pending.value.id;
  saving.value = true; error.value = ''; success.value = '';
  try {
    await withdraw(id, controller?.signal);
    if (ticket !== generation) return;
    await load();
    if (ticket + 1 === generation && !error.value) success.value = 'Your registration is withdrawn.';
  } catch (cause) {
    if (ticket !== generation) return;
    cancel();
    // A network failure can follow a committed write: discard old data and require refresh.
    own.value = [];
    if (cause instanceof ApiError && cause.status === 401) clearLocalSession();
    error.value = `${cause instanceof Error ? cause.message : 'Unable to confirm withdrawal.'} Refresh to check the saved status before trying again.`;
  } finally { if (ticket === generation) saving.value = false; }
}
watch(() => [eventId.value, authSession.user?.id, authSession.user?.role, authSession.loading], () => { void load(); }, { immediate: true });
onBeforeUnmount(() => { ++generation; controller?.abort(); });
</script>

<template>
  <section class="panel registration-panel" aria-labelledby="registration-heading">
    <header class="registration-heading">
      <div><p class="eyebrow">Attendance</p><h1 id="registration-heading">{{ manager ? 'Event registrations' : 'My registrations' }}</h1></div>
      <button v-if="permitted" class="button button-secondary" :disabled="loading || saving" @click="load">Refresh</button>
    </header>
    <p v-if="authSession.loading || loading" role="status">Loading registrations…</p>
    <p v-else-if="!authSession.user">Sign in to view registrations. <RouterLink to="/login">Sign in</RouterLink></p>
    <p v-else-if="!permitted" role="alert">Your role cannot view this registration page.</p>
    <template v-else>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="success" role="status">{{ success }}</p>
      <template v-if="roster">
        <h2>{{ roster.eventName || 'Untitled event' }}</h2>
        <p class="registration-count">{{ roster.activeCount }} active {{ roster.activeCount === 1 ? 'registration' : 'registrations' }} · Withdrawn and event-cancelled places are not counted.</p>
        <p v-if="!roster.items.length" role="status">No registrations for this event.</p>
        <div v-else class="roster-scroll" role="region" aria-label="Attendee registrations" tabindex="0">
          <table><caption>Attendee status and timestamps · Singapore time</caption>
            <thead><tr><th scope="col">Attendee</th><th scope="col">Status</th><th scope="col">Registered</th><th scope="col">Withdrawn / cancelled</th></tr></thead>
            <tbody><tr v-for="row in roster.items" :key="row.email">
              <td data-label="Attendee"><span><strong>{{ row.displayName }}</strong><br>{{ row.email }}</span></td><td data-label="Status">{{ status(row.status) }}</td>
              <td data-label="Registered">{{ time(row.registeredAt) }}</td><td data-label="Withdrawn / cancelled">{{ time(row.withdrawnAt || row.cancelledAt) }}</td>
            </tr></tbody>
          </table>
        </div>
      </template>
      <template v-else-if="!manager && !error">
        <p v-if="!own.length" role="status">You have no registrations yet.</p>
        <p v-if="selected && !own.some(row => row.id === selected)" role="status">The linked registration is unavailable for this account.</p>
        <ul v-if="own.length" class="registration-list"><li v-for="row in own" :key="row.id" :class="{ selected: row.id === selected }">
          <div><p v-if="row.id === selected" class="registration-status">Linked registration</p><h2>{{ row.eventName || 'Untitled event' }}</h2><p>{{ time(row.startsAt) }} · Singapore time</p>
            <p v-if="row.endsAt">Ends {{ time(row.endsAt) }} (Singapore time)</p>
            <p v-if="row.purpose">Purpose: {{ row.purpose }}</p>
            <p class="registration-status">{{ status(row.status) }}</p>
            <p v-if="row.withdrawnAt">Withdrawn {{ time(row.withdrawnAt) }}</p>
            <p v-if="row.cancelledAt">Event cancelled {{ time(row.cancelledAt) }}</p></div>
          <button v-if="row.canWithdraw" class="button button-secondary" :disabled="saving" @click="confirm(row)">Withdraw registration</button>
          <p v-else-if="row.status === 'REGISTERED'">Withdrawal is available only before event start.</p>
        </li></ul>
      </template>
    </template>
    <dialog ref="dialog" aria-labelledby="withdraw-heading" aria-describedby="withdraw-warning" @cancel.prevent="cancel">
      <h2 id="withdraw-heading">Withdraw registration?</h2>
      <p>{{ pending?.eventName || 'This event' }}</p>
      <p id="withdraw-warning">Your place will be released. You may register again only if registration is still open and capacity is available. A place will not be saved for you.</p>
      <div class="registration-actions"><button class="button button-secondary" :disabled="saving" autofocus @click="cancel">Keep registration</button>
        <button class="button" :disabled="saving || !pending" @click="save">{{ saving ? 'Saving…' : 'Confirm withdrawal' }}</button></div>
    </dialog>
  </section>
</template>

<style scoped>
.registration-panel { padding: 28px; }
.registration-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
.eyebrow { color: var(--green); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
h1 { margin: 0; font-size: 26px; } h2 { font-size: 18px; margin: 0 0 8px; }
p { line-height: 1.6; } .registration-count { margin: 12px 0 24px; }
.registration-list { display: grid; gap: 16px; list-style: none; padding: 0; }
.registration-list li { border-top: 1px solid var(--border); padding-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.registration-list li.selected { border: 2px solid var(--green); border-radius: 8px; padding: 16px; }
.registration-status { font-weight: 600; } .roster-scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; text-align: left; } caption { text-align: left; padding: 12px 0; font-size: 13px; }
th, td { border-bottom: 1px solid var(--border); padding: 14px 12px; vertical-align: top; overflow-wrap: anywhere; }
dialog { border: 1px solid var(--border); border-radius: 12px; max-width: 480px; width: calc(100% - 48px); padding: 24px; }
dialog::backdrop { background: rgb(0 0 0 / .35); } .registration-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
@media (max-width: 600px) {
  .registration-panel { padding: 20px; } .registration-list li { align-items: start; flex-direction: column; gap: 12px; } h1 { font-size: 22px; }
  table, tbody, tr, td { display: block; } thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  caption { display: block; }
  tr { border-top: 1px solid var(--border); padding: 12px 0; }
  td { display: grid; grid-template-columns: minmax(100px, 40%) 1fr; gap: 10px; border: 0; padding: 5px 0; }
  td::before { content: attr(data-label); font-weight: 600; }
}
</style>
