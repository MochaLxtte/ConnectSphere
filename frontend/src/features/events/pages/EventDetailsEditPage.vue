<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import {
  fetchEventRequestDetail, updateEventDetails, SubmissionIncompleteError, SubmissionInvalidError,
  type EventDraftInput, type EventRequestDetail,
} from '../api/event-requests';
import { eventStatusLabel, fromSingaporeInputValue, toSingaporeInputValue } from '../presentation';

/** KAN-66: post-submission edits. The server decides which fields this viewer may change. */
type FieldName = keyof EventDraftInput;
type FieldKind = 'text' | 'textarea' | 'datetime' | 'count' | 'choice';

const fieldConfig: Record<FieldName, { label: string; kind: FieldKind; required?: boolean; registration?: boolean }> = {
  name: { label: 'Event name', kind: 'text', required: true },
  description: { label: 'Description', kind: 'textarea' },
  purpose: { label: 'Purpose', kind: 'textarea', required: true },
  startsAt: { label: 'Starts', kind: 'datetime', required: true },
  endsAt: { label: 'Ends', kind: 'datetime', required: true },
  expectedAttendance: { label: 'Expected attendance', kind: 'count', required: true },
  venueRequirements: { label: 'Venue requirements', kind: 'textarea', required: true },
  accessibilityNeeds: { label: 'Accessibility needs', kind: 'textarea' },
  equipmentRequirements: { label: 'Equipment requirements', kind: 'textarea' },
  registrationRequired: { label: 'Registration required', kind: 'choice' },
  registrationCapacity: { label: 'Registration capacity', kind: 'count', registration: true },
  registrationOpensAt: { label: 'Registration opens', kind: 'datetime', registration: true },
  registrationClosesAt: { label: 'Registration closes', kind: 'datetime', registration: true },
};
const fieldOrder = Object.keys(fieldConfig) as FieldName[];

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'not-editable'; request: EventRequestDetail }
  | { status: 'ready'; request: EventRequestDetail };

const route = useRoute();
const router = useRouter();
const uid = useId();
const requestId = computed(() => String(route.params.id ?? ''));
const state = ref<LoadState>({ status: 'loading' });
const form = reactive<Record<FieldName, string | boolean | null>>(
  Object.fromEntries(fieldOrder.map((field) => [field, ''])) as Record<FieldName, string>,
);
const errors = reactive<Partial<Record<FieldName, string>>>({});
const formError = ref('');
/** KAN-66-AC103: another save happened first; reloading discards this page's unsaved edits. */
const stale = ref(false);
const saving = ref(false);
let controller: AbortController | undefined;

const request = computed(() => state.value.status === 'ready' ? state.value.request : null);
const editable = computed(() => new Set((request.value?.actions.editableFields ?? []) as FieldName[]));
const planning = computed(() => request.value?.actions.editMode === 'PLANNING');
const visibleFields = computed(() => fieldOrder.filter((field) => editable.value.has(field) &&
  (!fieldConfig[field].registration || form.registrationRequired === true)));
const backLink = computed(() => authSession.user?.role === 'EVENT_COORDINATOR'
  ? `/reviews/${requestId.value}` : `/events/${requestId.value}`);

function toForm(field: FieldName, value: unknown): string | boolean | null {
  const { kind } = fieldConfig[field];
  if (kind === 'choice') return typeof value === 'boolean' ? value : null;
  if (kind === 'datetime') return toSingaporeInputValue(typeof value === 'string' ? value : null);
  return value === null || value === undefined ? '' : String(value);
}

function fromForm(field: FieldName): unknown {
  const value = form[field];
  const { kind, registration } = fieldConfig[field];
  // Registration settings only apply while registration is required.
  if (registration && form.registrationRequired !== true) return null;
  if (kind === 'choice') return value;
  const text = typeof value === 'string' ? value.trim() : '';
  if (kind === 'datetime') return text ? fromSingaporeInputValue(text) : null;
  if (kind === 'count') return text === '' ? null : Number(text);
  return text || null;
}

function reset(source: EventRequestDetail) {
  for (const field of fieldOrder) form[field] = toForm(field, source[field as keyof EventRequestDetail]);
  for (const field of fieldOrder) delete errors[field];
  formError.value = '';
  stale.value = false;
}

const changes = computed<Partial<EventDraftInput>>(() => {
  const source = request.value;
  if (!source) return {};
  const result: Partial<Record<FieldName, unknown>> = {};
  for (const field of fieldOrder) {
    if (!editable.value.has(field)) continue;
    const stored = source[field as keyof EventRequestDetail] ?? null;
    // Turning registration off clears its saved settings even though their inputs are hidden.
    const cleared = fieldConfig[field].registration && form.registrationRequired !== true && stored !== null;
    if (cleared || form[field] !== toForm(field, stored)) result[field] = fromForm(field);
  }
  return result as Partial<EventDraftInput>;
});
const dirty = computed(() => Object.keys(changes.value).length > 0);

function validate(): boolean {
  for (const field of fieldOrder) delete errors[field];
  for (const field of visibleFields.value) {
    const { kind, required, label } = fieldConfig[field];
    const value = form[field];
    if (kind === 'count' && typeof value === 'string' && value.trim() !== '' &&
        !(Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 2_147_483_647)) {
      errors[field] = 'Enter a whole number of 0 or more.';
    } else if (required && (value === null || (typeof value === 'string' && value.trim() === ''))) {
      errors[field] = `${label} is required for a submitted request.`;
    }
  }
  if (Object.keys(errors).length === 0) return true;
  formError.value = 'Check the highlighted details, then try again.';
  void focusFirstError();
  return false;
}

async function focusFirstError() {
  await nextTick();
  const first = fieldOrder.find((field) => errors[field]);
  if (first) document.getElementById(`${uid}-${first}`)?.focus();
}

/** Text, date and count inputs hold strings; only the registration choice holds a boolean. */
function textValue(field: FieldName): string {
  const value = form[field];
  return typeof value === 'string' ? value : '';
}

function setText(field: FieldName, event: Event) {
  form[field] = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
}

function showSignIn() {
  controller?.abort();
  state.value = { status: 'error', signIn: true, retryable: false, message: 'Sign in to edit this event request.' };
}

async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.value = { status: 'loading' };
  try {
    const loaded = await fetchEventRequestDetail(requestId.value, current.signal);
    if (current.signal.aborted) return;
    if (loaded.actions.canEditDetails === true && loaded.revision !== undefined) {
      reset(loaded);
      state.value = { status: 'ready', request: loaded };
    } else {
      state.value = { status: 'not-editable', request: loaded };
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
        ? 'This event request is unavailable or you do not have permission to edit it.'
        : 'This event request could not be loaded. Please try again.',
    };
  }
}

function showFailure(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    clearLocalSession();
    showSignIn();
    return;
  }
  if (error instanceof SubmissionIncompleteError || error instanceof SubmissionInvalidError) {
    for (const field of error.missingFields) {
      if (field in fieldConfig) errors[field as FieldName] = 'A submitted request must keep this detail.';
    }
    if (error instanceof SubmissionInvalidError) {
      for (const [field, message] of Object.entries(error.fieldErrors)) {
        if (field in fieldConfig) errors[field as FieldName] = message;
      }
    }
    formError.value = 'Your changes were not saved. Fix the highlighted details, then try again.';
    void focusFirstError();
    return;
  }
  if (error instanceof ApiError && error.code === 'EVENT_REVISION_CONFLICT') {
    stale.value = true;
    formError.value = 'Someone saved a newer version of this request after you opened it, so your changes were not saved. ' +
      'Reload to see the latest details, then make your changes again.';
    return;
  }
  if (error instanceof ApiError && error.code === 'SIGNIFICANT_CHANGE_REQUIRED') {
    formError.value = 'Changes to dates, attendance, venue, equipment or registration need a reviewed change request.';
    return;
  }
  if (error instanceof ApiError && [403, 404, 409].includes(error.status ?? 0)) {
    stale.value = true;
    formError.value = 'This request can no longer be edited by you here. Reload to see its current state.';
    return;
  }
  formError.value = 'Your changes could not be saved. Check your connection, then try again.';
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
    await updateEventDetails(source.id, changes.value, source.revision!, current.signal);
    if (!current.signal.aborted) await router.push(backLink.value);
  } catch (error) {
    if (!current.signal.aborted) showFailure(error);
  } finally {
    if (controller === current) saving.value = false;
  }
}

function warnBeforeLeaving(event: BeforeUnloadEvent) {
  if (dirty.value && !stale.value) event.preventDefault();
}

watch(requestId, () => { void load(); }, { immediate: true });
watch(() => [authSession.user?.id, authSession.user?.role], () => {
  if (!authSession.user) showSignIn();
  else void load();
}, { flush: 'sync' });
watch(() => ({ ...form }), (now, before) => {
  for (const field of fieldOrder) if (now[field] !== before[field]) delete errors[field];
});
onMounted(() => window.addEventListener('beforeunload', warnBeforeLeaving));
onBeforeUnmount(() => {
  controller?.abort();
  window.removeEventListener('beforeunload', warnBeforeLeaving);
});
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Planning</p>
    <h1>Edit event details</h1>
    <p class="page-description">
      Update the details of this event request. All dates and times are in Singapore time.
    </p>
  </section>

  <div class="detail-toolbar">
    <RouterLink :to="backLink" class="back-link">Back to the event request</RouterLink>
    <button type="button" class="button button-secondary" :disabled="state.status === 'loading' || saving" @click="load">
      Reload
    </button>
  </div>

  <p v-if="state.status === 'loading'" class="panel edit-panel" role="status">Loading the event request…</p>

  <div v-else-if="state.status === 'error'" class="panel edit-panel" role="alert">
    <p>{{ state.message }}</p>
    <RouterLink v-if="state.signIn" to="/login" class="button button-primary">Sign in</RouterLink>
    <button v-else-if="state.retryable" type="button" class="button button-secondary" @click="load">Try again</button>
  </div>

  <div v-else-if="state.status === 'not-editable'" class="panel edit-panel" role="alert">
    <p>
      You cannot edit this {{ eventStatusLabel(state.request.status).toLowerCase() }} request here.
      <template v-if="state.request.status === 'DRAFT'">Drafts are edited from the draft page.</template>
    </p>
    <RouterLink v-if="state.request.actions.canEditDraft" :to="`/events/${state.request.id}/edit`" class="button button-secondary">
      Edit draft
    </RouterLink>
    <RouterLink v-else :to="backLink" class="button button-secondary">View request</RouterLink>
  </div>

  <form v-else class="panel edit-panel" :aria-busy="saving" novalidate @submit.prevent="save">
    <h2 class="request-title">{{ state.request.name ?? 'Untitled event request' }}</h2>
    <p class="request-meta">Status: {{ eventStatusLabel(state.request.status) }}</p>

    <p v-if="planning" class="edit-note" role="note">
      Once an event is approved, only its name and description can be edited directly.
      Changes to the purpose, dates, attendance, venue, equipment, accessibility or registration
      need a reviewed change request so that existing arrangements are reconsidered.
    </p>
    <p v-else class="edit-note" role="note">
      Your request stays with its coordinator and keeps its status. Required details cannot be removed.
      The coordinator sees your changes when they next open the request.
    </p>

    <fieldset :disabled="saving || stale" class="edit-fields">
      <legend class="visually-hidden">Event details</legend>
      <div v-for="field in visibleFields" :key="field" class="form-field">
        <template v-if="fieldConfig[field].kind === 'choice'">
          <p :id="`${uid}-${field}-label`" class="group-label">Do attendees need to register?</p>
          <div class="choice-row" role="radiogroup" :aria-labelledby="`${uid}-${field}-label`">
            <label class="choice"><input :id="`${uid}-${field}`" v-model="form[field]" type="radio" :value="true" /> Registration required</label>
            <label class="choice"><input v-model="form[field]" type="radio" :value="false" /> No registration</label>
          </div>
        </template>
        <template v-else>
          <label :for="`${uid}-${field}`">
            {{ fieldConfig[field].label }}
            <span v-if="fieldConfig[field].required" class="required-mark">required</span>
          </label>
          <textarea v-if="fieldConfig[field].kind === 'textarea'" :id="`${uid}-${field}`"
            :value="textValue(field)" rows="3"
            @input="setText(field, $event)"
            :aria-invalid="errors[field] ? 'true' : undefined"
            :aria-describedby="errors[field] ? `${uid}-${field}-error` : undefined" />
          <input v-else :id="`${uid}-${field}`" :value="textValue(field)"
            @input="setText(field, $event)"
            :type="fieldConfig[field].kind === 'datetime' ? 'datetime-local' : fieldConfig[field].kind === 'count' ? 'number' : 'text'"
            :min="fieldConfig[field].kind === 'count' ? 0 : undefined"
            :maxlength="field === 'name' ? 200 : undefined"
            :aria-invalid="errors[field] ? 'true' : undefined"
            :aria-describedby="errors[field] ? `${uid}-${field}-error` : undefined" />
        </template>
        <p v-if="errors[field]" :id="`${uid}-${field}-error`" class="field-error">{{ errors[field] }}</p>
      </div>
    </fieldset>

    <div v-if="formError" class="form-error" role="alert">
      <p>{{ formError }}</p>
      <button v-if="stale" type="button" class="button button-secondary" @click="load">Reload latest details</button>
    </div>

    <footer class="form-actions">
      <button type="submit" class="button button-primary" :disabled="saving || stale || !dirty">
        {{ saving ? 'Saving…' : 'Save changes' }}
      </button>
      <RouterLink :to="backLink" class="button button-secondary">Cancel</RouterLink>
      <p class="form-status" role="status">{{ saving ? 'Saving your changes…' : dirty ? 'You have unsaved changes.' : '' }}</p>
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
