<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, useId, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import {
  fetchEventRequestDetail, updateEventDraft,
  type EventDraftUpdate, type EventRequestDetail,
} from '../api/event-requests';
import { fromSingaporeInputValue, toSingaporeInputValue } from '../presentation';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; signIn: boolean; retryable: boolean }
  | { status: 'not-editable'; request: EventRequestDetail }
  | { status: 'ready'; request: EventRequestDetail };

interface DraftForm {
  name: string;
  purpose: string;
  description: string;
  startsAt: string;
  endsAt: string;
  expectedAttendance: string;
  venueRequirements: string;
  accessibilityNeeds: string;
  equipmentRequirements: string;
  registrationRequired: '' | 'true' | 'false';
}

const id = useId();
const route = useRoute();
const requestId = computed(() => String(route.params.id ?? ''));
const state = ref<LoadState>({ status: 'loading' });
const form = reactive<DraftForm>({
  name: '', purpose: '', description: '', startsAt: '', endsAt: '', expectedAttendance: '',
  venueRequirements: '', accessibilityNeeds: '', equipmentRequirements: '', registrationRequired: '',
});
const saving = ref(false);
const saved = ref(false);
const saveErrorMessage = ref<string | null>(null);
let controller: AbortController | undefined;

function populateForm(request: EventRequestDetail) {
  form.name = request.name ?? '';
  form.purpose = request.purpose ?? '';
  form.description = request.description ?? '';
  form.startsAt = toSingaporeInputValue(request.startsAt);
  form.endsAt = toSingaporeInputValue(request.endsAt);
  form.expectedAttendance = request.expectedAttendance == null ? '' : String(request.expectedAttendance);
  form.venueRequirements = request.venueRequirements ?? '';
  form.accessibilityNeeds = request.accessibilityNeeds ?? '';
  form.equipmentRequirements = request.equipmentRequirements ?? '';
  form.registrationRequired = request.registrationRequired == null ? '' : request.registrationRequired ? 'true' : 'false';
}

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
  saved.value = false;
  saveErrorMessage.value = null;
  // Clear the previous draft before rechecking access, editability or switching accounts.
  state.value = { status: 'loading' };
  try {
    const request = await fetchEventRequestDetail(requestId.value, current.signal);
    if (current.signal.aborted) return;
    populateForm(request);
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

function emptyToNull(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

function parseAttendance(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function saveErrorText(error: unknown): string {
  const code = error instanceof ApiError ? error.code : null;
  switch (code) {
    case 'INVALID_DRAFT_UPDATE': return 'Check the highlighted fields and try again.';
    case 'EVENT_REQUEST_NOT_FOUND': return 'This draft is unavailable or you do not have permission to edit it.';
    case 'DRAFT_NOT_EDITABLE':
      return 'This request is no longer a draft and can no longer be edited here. Reload to see its current status.';
    case 'DRAFT_EDIT_FORBIDDEN': return 'You are not authorised to edit this draft.';
    default: return 'Your changes could not be saved. Please try again.';
  }
}

async function save() {
  if (state.value.status !== 'ready' || saving.value) return;
  const current = state.value.request;
  saving.value = true;
  saved.value = false;
  saveErrorMessage.value = null;
  try {
    const input: EventDraftUpdate = {
      name: emptyToNull(form.name),
      purpose: emptyToNull(form.purpose),
      description: emptyToNull(form.description),
      startsAt: fromSingaporeInputValue(form.startsAt),
      endsAt: fromSingaporeInputValue(form.endsAt),
      expectedAttendance: parseAttendance(form.expectedAttendance),
      venueRequirements: emptyToNull(form.venueRequirements),
      accessibilityNeeds: emptyToNull(form.accessibilityNeeds),
      equipmentRequirements: emptyToNull(form.equipmentRequirements),
      registrationRequired: form.registrationRequired === '' ? null : form.registrationRequired === 'true',
    };
    const updated = await updateEventDraft(current.id, input);
    populateForm(updated);
    state.value = updated.actions.canEditDraft
      ? { status: 'ready', request: updated } : { status: 'not-editable', request: updated };
    saved.value = updated.actions.canEditDraft;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearLocalSession();
      showSignIn();
      return;
    }
    saveErrorMessage.value = saveErrorText(error);
  } finally {
    saving.value = false;
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
    <RouterLink :to="`/events/${state.request.id}`" class="button button-secondary">View request</RouterLink>
  </div>

  <form v-else class="panel edit-panel" :aria-busy="saving" @submit.prevent="save">
    <fieldset :disabled="saving" class="draft-fields">
      <legend>Event details</legend>

      <label :for="`${id}-name`">Event name
        <input :id="`${id}-name`" v-model="form.name" type="text" maxlength="200" />
      </label>
      <label :for="`${id}-purpose`">Purpose
        <textarea :id="`${id}-purpose`" v-model="form.purpose" rows="2" />
      </label>
      <label :for="`${id}-description`">Description
        <textarea :id="`${id}-description`" v-model="form.description" rows="3" />
      </label>
      <div class="field-row">
        <label :for="`${id}-starts`">Starts
          <input :id="`${id}-starts`" v-model="form.startsAt" type="datetime-local" />
        </label>
        <label :for="`${id}-ends`">Ends
          <input :id="`${id}-ends`" v-model="form.endsAt" type="datetime-local" />
        </label>
      </div>
      <p class="field-hint">Dates and times are in Singapore time.</p>
      <label :for="`${id}-attendance`">Expected attendance
        <input :id="`${id}-attendance`" v-model="form.expectedAttendance" type="number" min="0" step="1" />
      </label>
      <label :for="`${id}-venue`">Venue requirements
        <textarea :id="`${id}-venue`" v-model="form.venueRequirements" rows="2" />
      </label>
      <label :for="`${id}-accessibility`">Accessibility needs
        <textarea :id="`${id}-accessibility`" v-model="form.accessibilityNeeds" rows="2" />
      </label>
      <label :for="`${id}-equipment`">Equipment requirements
        <textarea :id="`${id}-equipment`" v-model="form.equipmentRequirements" rows="2" />
      </label>
      <label :for="`${id}-registration`">Registration required
        <select :id="`${id}-registration`" v-model="form.registrationRequired">
          <option value="">Not decided yet</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    </fieldset>

    <p v-if="saveErrorMessage" class="save-error" role="alert">{{ saveErrorMessage }}</p>
    <footer class="edit-actions">
      <button type="submit" class="button button-primary" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save draft' }}
      </button>
      <p v-if="saving" role="status">Saving your draft. Please wait.</p>
      <p v-else-if="saved" role="status">Draft saved.</p>
    </footer>
  </form>
</template>

<style scoped>
.detail-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.back-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.edit-panel { padding: 24px; min-width: 0; }
.edit-error .button, .edit-panel[role='alert'] .button { margin-top: 12px; }
.draft-fields { border: 0; padding: 0; margin: 0; min-width: 0; display: grid; gap: 17px; }
.draft-fields legend { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.draft-fields label { display: grid; gap: 7px; color: #52614e; font-size: 12px; font-weight: 600; }
.draft-fields input, .draft-fields textarea, .draft-fields select {
  width: 100%; border: 1px solid #dce3d6; border-radius: 6px; padding: 10px 11px;
  color: #293a33; background: #fff; font: inherit; font-size: 14px;
}
.draft-fields textarea { resize: vertical; min-height: 60px; }
.draft-fields input:focus-visible, .draft-fields textarea:focus-visible, .draft-fields select:focus-visible {
  outline: 3px solid #90a950; outline-offset: 2px;
}
.field-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px; }
.field-hint { margin-top: -8px; font-size: 12px; color: #59685e; }
.save-error { color: #8a332b; font-size: 14px; line-height: 1.6; margin-top: 20px; }
.edit-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; margin-top: 24px; }
.edit-actions p { color: #59685e; font-size: 13px; }
.draft-fields:disabled { opacity: 0.75; }
@media (max-width: 600px) {
  .edit-panel { padding: 20px; }
  .field-row { grid-template-columns: 1fr; }
}
</style>
