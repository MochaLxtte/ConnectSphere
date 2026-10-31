<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { fetchEventRequestDetail, type EventRequestDetail } from '../api/event-requests';
import { submitChangeRequest, type ChangeValues, type SignificantField } from '../api/change-requests';
import { changeFieldConfig, changeFieldOrder } from '../change-request-fields';
import { eventStatusLabel, fromSingaporeInputValue, toSingaporeInputValue } from '../presentation';

/** KAN-15: the owner proposes significant changes; the event is unchanged until approval. */
type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'not-allowed'; request: EventRequestDetail }
  | { status: 'ready'; request: EventRequestDetail };

const route = useRoute();
const router = useRouter();
const uid = useId();
const requestId = computed(() => String(route.params.id ?? ''));
const backLink = computed(() => `/events/${requestId.value}`);
const state = ref<LoadState>({ status: 'loading' });
const form = reactive<Record<SignificantField, string | boolean | null>>(
  Object.fromEntries(changeFieldOrder.map((field) => [field, ''])) as Record<SignificantField, string>,
);
const errors = reactive<Partial<Record<SignificantField, string>>>({});
const formError = ref('');
const stale = ref(false);
const saving = ref(false);
let controller: AbortController | undefined;

const request = computed(() => state.value.status === 'ready' ? state.value.request : null);
const visibleFields = computed(() => changeFieldOrder.filter((field) =>
  !changeFieldConfig[field].registration || form.registrationRequired === true));

function toForm(field: SignificantField, value: unknown): string | boolean | null {
  const { kind } = changeFieldConfig[field];
  if (kind === 'choice') return typeof value === 'boolean' ? value : null;
  if (kind === 'datetime') return toSingaporeInputValue(typeof value === 'string' ? value : null);
  return value === null || value === undefined ? '' : String(value);
}

function fromForm(field: SignificantField): unknown {
  const value = form[field];
  const { kind, registration } = changeFieldConfig[field];
  if (registration && form.registrationRequired !== true) return null;
  if (kind === 'choice') return value;
  const text = typeof value === 'string' ? value.trim() : '';
  if (kind === 'datetime') return text ? fromSingaporeInputValue(text) : null;
  if (kind === 'count') return text === '' ? null : Number(text);
  return text || null;
}

const changes = computed<ChangeValues>(() => {
  const source = request.value;
  if (!source) return {};
  const result: ChangeValues = {};
  for (const field of changeFieldOrder) {
    const stored = source[field as keyof EventRequestDetail] ?? null;
    const cleared = changeFieldConfig[field].registration && form.registrationRequired !== true && stored !== null;
    if (cleared || form[field] !== toForm(field, stored)) result[field] = fromForm(field);
  }
  return result;
});
const dirty = computed(() => Object.keys(changes.value).length > 0);

function reset(source: EventRequestDetail) {
  for (const field of changeFieldOrder) form[field] = toForm(field, source[field as keyof EventRequestDetail]);
  for (const field of changeFieldOrder) delete errors[field];
  formError.value = '';
  stale.value = false;
}

function validate(): boolean {
  for (const field of changeFieldOrder) delete errors[field];
  for (const field of visibleFields.value) {
    const { kind, required, label } = changeFieldConfig[field];
    const value = form[field];
    if (kind === 'count' && typeof value === 'string' && value.trim() !== '' &&
        !(Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 2_147_483_647)) {
      errors[field] = 'Enter a whole number of 0 or more.';
    } else if (required && (value === null || (typeof value === 'string' && value.trim() === ''))) {
      errors[field] = `${label} is required.`;
    }
  }
  if (Object.keys(errors).length === 0) return true;
  formError.value = 'Check the highlighted details, then try again.';
  void nextTick(() => {
    const first = changeFieldOrder.find((field) => errors[field]);
    if (first) document.getElementById(`${uid}-${first}`)?.focus();
  });
  return false;
}

function textValue(field: SignificantField): string {
  const value = form[field];
  return typeof value === 'string' ? value : '';
}

function setText(field: SignificantField, event: Event) {
  form[field] = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
}

function showSignIn() {
  controller?.abort();
  state.value = { status: 'error', signIn: true, retryable: false, message: 'Sign in to request a change.' };
}

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const loaded = await fetchEventRequestDetail(requestId.value, current.signal);
    if (current.signal.aborted) return;
    const allowed = ['APPROVED', 'CONFIRMED'].includes(loaded.status) && loaded.revision !== undefined &&
      loaded.organiserId === authSession.user?.id;
    if (allowed) {
      reset(loaded);
      state.value = { status: 'ready', request: loaded };
    } else {
      state.value = { status: 'not-allowed', request: loaded };
    }
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
        ? 'This event is unavailable or you do not have permission to change it.'
        : 'This event could not be loaded. Please try again.',
    };
  }
}

function showFailure(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    clearLocalSession();
    showSignIn();
    return;
  }
  if (error instanceof ApiError && error.code === 'EVENT_REVISION_CONFLICT') {
    stale.value = true;
    formError.value = 'This event changed after you opened it, so your request was not sent. Reload to see the latest details.';
    return;
  }
  if (error instanceof ApiError && error.code === 'CHANGE_REQUEST_ALREADY_PENDING') {
    stale.value = true;
    formError.value = 'This event already has a change request awaiting review. Withdraw it from the event page first.';
    return;
  }
  if (error instanceof ApiError && error.status !== undefined && [400, 409].includes(error.status)) {
    formError.value = error.message;
    return;
  }
  formError.value = 'Your change request could not be sent. Check your connection, then try again.';
}

async function save() {
  const source = request.value;
  if (!source || saving.value || stale.value || !dirty.value || !validate()) return;
  controller?.abort();
  const current = new AbortController();
  controller = current;
  saving.value = true;
  formError.value = '';
  try {
    await submitChangeRequest(source.id, changes.value, source.revision!, current.signal);
    if (!current.signal.aborted) await router.push(backLink.value);
  } catch (error) {
    if (!current.signal.aborted) showFailure(error);
  } finally {
    if (controller === current) saving.value = false;
  }
}

watch(requestId, () => { void load(); }, { immediate: true });
watch(() => [authSession.user?.id, authSession.user?.role], () => {
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
watch(() => ({ ...form }), (now, before) => {
  for (const field of changeFieldOrder) if (now[field] !== before[field]) delete errors[field];
});
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Planning</p>
    <h1>Request a change</h1>
    <p class="page-description">
      Ask the coordinator to change significant details of your approved event. All dates and times are in Singapore time.
    </p>
  </section>

  <div class="detail-toolbar">
    <RouterLink :to="backLink" class="back-link">Back to the event</RouterLink>
  </div>

  <p v-if="state.status === 'loading'" class="panel edit-panel" role="status">Loading the event…</p>

  <div v-else-if="state.status === 'error'" class="panel edit-panel" role="alert">
    <p>{{ state.message }}</p>
    <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
    <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
  </div>

  <div v-else-if="state.status === 'not-allowed'" class="panel edit-panel" role="alert">
    <p>
      Change requests are only for the organiser of an approved or confirmed event. This event is
      {{ eventStatusLabel(state.request.status).toLowerCase() }}.
    </p>
    <RouterLink :to="backLink" class="button button-secondary">View event</RouterLink>
  </div>

  <form v-else class="panel edit-panel" :aria-busy="saving" novalidate @submit.prevent="save">
    <h2 class="request-title">{{ state.request.name ?? 'Untitled event' }}</h2>
    <p class="request-meta">Status: {{ eventStatusLabel(state.request.status) }}</p>
    <p class="edit-note" role="note">
      Change only what you need. Nothing changes until the coordinator approves. Changes that affect
      confirmed venue or equipment arrangements, a confirmed event or existing registrations cannot be
      approved in place; the event would need to be cancelled and requested again.
    </p>

    <fieldset :disabled="saving || stale" class="edit-fields">
      <legend class="visually-hidden">Event details</legend>
      <div v-for="field in visibleFields" :key="field" class="form-field">
        <template v-if="changeFieldConfig[field].kind === 'choice'">
          <p :id="`${uid}-${field}-label`" class="group-label">Do attendees need to register?</p>
          <div class="choice-row" role="radiogroup" :aria-labelledby="`${uid}-${field}-label`">
            <label class="choice"><input :id="`${uid}-${field}`" v-model="form[field]" type="radio" :value="true" /> Registration required</label>
            <label class="choice"><input v-model="form[field]" type="radio" :value="false" /> No registration</label>
          </div>
        </template>
        <template v-else>
          <label :for="`${uid}-${field}`">
            {{ changeFieldConfig[field].label }}
            <span v-if="changeFieldConfig[field].required" class="required-mark">required</span>
          </label>
          <textarea v-if="changeFieldConfig[field].kind === 'textarea'" :id="`${uid}-${field}`"
            :value="textValue(field)" rows="3" @input="setText(field, $event)"
            :aria-invalid="errors[field] ? 'true' : undefined"
            :aria-describedby="errors[field] ? `${uid}-${field}-error` : undefined" />
          <input v-else :id="`${uid}-${field}`" :value="textValue(field)" @input="setText(field, $event)"
            :type="changeFieldConfig[field].kind === 'datetime' ? 'datetime-local' : 'number'"
            :max="changeFieldConfig[field].kind === 'datetime' ? '9999-12-31T23:59' : undefined"
            :min="changeFieldConfig[field].kind === 'count' ? 0 : undefined"
            :aria-invalid="errors[field] ? 'true' : undefined"
            :aria-describedby="errors[field] ? `${uid}-${field}-error` : undefined" />
        </template>
        <p v-if="errors[field]" :id="`${uid}-${field}-error`" class="field-error">{{ errors[field] }}</p>
      </div>
    </fieldset>

    <div v-if="formError" class="form-error" role="alert">
      <p>{{ formError }}</p>
      <button v-if="stale" type="button" class="button button-secondary" @click="load">Reload</button>
    </div>

    <footer class="form-actions">
      <button type="submit" class="button button-primary" :disabled="saving || stale || !dirty">
        {{ saving ? 'Sending…' : 'Send change request' }}
      </button>
      <RouterLink :to="backLink" class="button button-secondary">Cancel</RouterLink>
      <p class="form-status" role="status">{{ dirty ? 'Only the details you changed are sent.' : '' }}</p>
    </footer>
  </form>
</template>

<style scoped>
.detail-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.back-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.edit-panel { padding: 24px; min-width: 0; max-width: 860px; color: #293a33; }
.edit-panel[role='alert'] .button { margin-top: 12px; }
.request-title { font-size: 20px; }
.request-meta, .edit-note { color: #59685e; font-size: 14px; line-height: 1.6; margin-top: 8px; }
.edit-note { background: #f0f5ee; border-radius: 8px; padding: 12px 16px; margin-top: 16px; }
.edit-fields { border: 0; padding: 0; margin: 8px 0 0; min-width: 0; }
.edit-fields:disabled { opacity: 0.7; }
.form-field { margin-top: 18px; min-width: 0; }
.form-field label, .group-label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
.required-mark { color: #7a4a1e; font-size: 12px; font-weight: 600; }
.form-field input:not([type='radio']), textarea {
  display: block; width: 100%; padding: 10px 12px; border: 1px solid #87958c; border-radius: 6px;
  background: #fff; font: inherit; font-size: 14px; color: inherit;
}
textarea { resize: vertical; min-height: 84px; line-height: 1.5; }
input:focus-visible, textarea:focus-visible { outline: 3px solid #90a950; outline-offset: 3px; }
[aria-invalid='true'] { border-color: #a5392f !important; }
.choice-row { display: flex; flex-wrap: wrap; gap: 12px; }
.form-field .choice { display: flex; align-items: center; gap: 10px; font-weight: 500; margin: 0; }
.field-error, .form-error { color: #8a332b; font-size: 14px; line-height: 1.6; }
.field-error { margin-top: 6px; font-size: 13px; }
.form-error { margin-top: 24px; background: #fbeeed; border-radius: 8px; padding: 14px 16px; }
.form-error .button { margin-top: 10px; }
.form-actions {
  display: flex; align-items: center; flex-wrap: wrap; gap: 12px 16px;
  border-top: 1px solid var(--border); margin-top: 24px; padding-top: 24px;
}
.edit-panel .button { font-size: 14px; padding: 11px 16px; }
.edit-panel button:disabled { cursor: not-allowed; opacity: 0.6; }
.form-status { color: #59685e; font-size: 13px; line-height: 1.6; min-height: 1em; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 600px) {
  .edit-panel { padding: 20px; }
  .form-actions { align-items: stretch; flex-direction: column; }
}
</style>
