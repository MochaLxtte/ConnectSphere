<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue';
import { ApiError } from '../../../lib/api-client';
import { clearLocalSession } from '../../auth/session.js';
import {
  createDraft, submitRequest, updateDraft, SubmissionIncompleteError, type EventDraftInput,
} from '../api/event-requests';

type FieldName = keyof EventDraftInput;

const props = defineProps<{
  /** The saved draft to edit. Leave unset to start a new request; fields the API omitted stay untouched. */
  request?: { id: string } & Partial<EventDraftInput>;
}>();
const emit = defineEmits<{
  saved: [eventRequestId: string];
  submitted: [eventRequestId: string];
  sessionExpired: [];
}>();

const fieldLabels: Record<FieldName, string> = {
  name: 'Event name',
  purpose: 'Purpose',
  description: 'Description',
  startsAt: 'Starts',
  endsAt: 'Ends',
  expectedAttendance: 'Expected attendance',
  venueRequirements: 'Venue requirements',
  accessibilityNeeds: 'Accessibility needs',
  equipmentRequirements: 'Equipment requirements',
  registrationRequired: 'Registration required',
  registrationCapacity: 'Registration capacity',
  registrationOpensAt: 'Registration opens',
  registrationClosesAt: 'Registration closes',
};
const fieldNames = Object.keys(fieldLabels) as FieldName[];
const dateFields: readonly FieldName[] = ['startsAt', 'endsAt', 'registrationOpensAt', 'registrationClosesAt'];
const singaporeOffsetMs = 8 * 60 * 60 * 1000;

/** Singapore has no daylight saving, so a fixed +08:00 offset converts both ways. */
function toSingaporeInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + singaporeOffsetMs).toISOString().slice(0, 16);
}

function fromSingaporeInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 16)}:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toCount(value: string | number): number | null | undefined {
  if (value === '') return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 && count <= 2_147_483_647 ? count : undefined;
}

const uid = useId();
const form = reactive({
  name: '', purpose: '', description: '', startsAt: '', endsAt: '',
  expectedAttendance: '' as string | number,
  venueRequirements: '', accessibilityNeeds: '', equipmentRequirements: '',
  registrationRequired: null as boolean | null,
  registrationCapacity: '' as string | number,
  registrationOpensAt: '', registrationClosesAt: '',
});
const requestId = ref<string | null>(null);
/** Last values confirmed by the API; `undefined` means the API did not report that field. */
const baseline = ref<Partial<EventDraftInput>>({});
const busy = ref<'saving' | 'submitting' | null>(null);
const errors = reactive<Partial<Record<FieldName, string>>>({});
const formError = ref('');
const notice = ref('');
/** Set once the server reports that this request can no longer be edited as a draft. */
const locked = ref(false);
let controller: AbortController | undefined;

function normalise(source: Partial<EventDraftInput>): Partial<EventDraftInput> {
  const result: Partial<Record<FieldName, unknown>> = {};
  for (const field of fieldNames) {
    const value = source[field];
    if (value === undefined) continue;
    result[field] = dateFields.includes(field) && typeof value === 'string'
      ? fromSingaporeInput(toSingaporeInput(value)) : value;
  }
  return result as Partial<EventDraftInput>;
}

function reset() {
  const source = props.request;
  requestId.value = source?.id ?? null;
  // A new request has nothing saved, so every entered value counts as a change.
  baseline.value = source ? normalise(source)
    : Object.fromEntries(fieldNames.map((field) => [field, null]));
  form.name = source?.name ?? '';
  form.purpose = source?.purpose ?? '';
  form.description = source?.description ?? '';
  form.startsAt = toSingaporeInput(source?.startsAt);
  form.endsAt = toSingaporeInput(source?.endsAt);
  form.expectedAttendance = source?.expectedAttendance ?? '';
  form.venueRequirements = source?.venueRequirements ?? '';
  form.accessibilityNeeds = source?.accessibilityNeeds ?? '';
  form.equipmentRequirements = source?.equipmentRequirements ?? '';
  form.registrationRequired = source?.registrationRequired ?? null;
  form.registrationCapacity = source?.registrationCapacity ?? '';
  form.registrationOpensAt = toSingaporeInput(source?.registrationOpensAt);
  form.registrationClosesAt = toSingaporeInput(source?.registrationClosesAt);
  for (const field of fieldNames) delete errors[field];
  formError.value = '';
  notice.value = '';
  locked.value = false;
}

const payload = computed<EventDraftInput>(() => {
  const registration = form.registrationRequired === true;
  return {
    name: form.name.trim() || null,
    purpose: form.purpose.trim() || null,
    description: form.description.trim() || null,
    startsAt: fromSingaporeInput(form.startsAt),
    endsAt: fromSingaporeInput(form.endsAt),
    expectedAttendance: toCount(form.expectedAttendance) ?? null,
    venueRequirements: form.venueRequirements.trim() || null,
    accessibilityNeeds: form.accessibilityNeeds.trim() || null,
    equipmentRequirements: form.equipmentRequirements.trim() || null,
    registrationRequired: form.registrationRequired,
    // Registration settings only apply while registration is required.
    registrationCapacity: registration ? toCount(form.registrationCapacity) ?? null : null,
    registrationOpensAt: registration ? fromSingaporeInput(form.registrationOpensAt) : null,
    registrationClosesAt: registration ? fromSingaporeInput(form.registrationClosesAt) : null,
  };
});

const changes = computed<Partial<EventDraftInput>>(() => {
  const result: Partial<Record<FieldName, unknown>> = {};
  for (const field of fieldNames) {
    const saved = baseline.value[field];
    const current = payload.value[field];
    // Never clear a saved value the API did not show us.
    if (saved === undefined ? current !== null : saved !== current) result[field] = current;
  }
  return result as Partial<EventDraftInput>;
});
const dirty = computed(() => Object.keys(changes.value).length > 0 ||
  toCount(form.expectedAttendance) === undefined || toCount(form.registrationCapacity) === undefined);
const canAct = computed(() => !busy.value && !locked.value);
const statusText = computed(() => {
  if (busy.value === 'saving') return 'Saving your draft…';
  if (busy.value === 'submitting') return 'Submitting your request…';
  if (dirty.value) return 'You have unsaved changes.';
  return notice.value;
});

function describedBy(field: FieldName, hint = false): string | undefined {
  return [hint ? `${uid}-${field}-hint` : '', errors[field] ? `${uid}-${field}-error` : '']
    .filter(Boolean).join(' ') || undefined;
}

async function focusFirstError() {
  await nextTick();
  const first = fieldNames.find((field) => errors[field]);
  if (first) document.getElementById(`${uid}-${first}`)?.focus();
}

function validate(): boolean {
  for (const field of fieldNames) delete errors[field];
  formError.value = '';
  if (toCount(form.expectedAttendance) === undefined) {
    errors.expectedAttendance = 'Enter a whole number of 0 or more.';
  }
  const { startsAt, endsAt, registrationOpensAt, registrationClosesAt } = payload.value;
  if (startsAt && endsAt && endsAt <= startsAt) errors.endsAt = 'The end must be after the start.';
  if (form.registrationRequired === true) {
    if (toCount(form.registrationCapacity) === undefined) {
      errors.registrationCapacity = 'Enter a whole number of 0 or more, or leave it blank for no limit.';
    }
    if (registrationOpensAt && registrationClosesAt && registrationClosesAt <= registrationOpensAt) {
      errors.registrationClosesAt = 'Registration must close after it opens.';
    }
  }
  if (fieldNames.every((field) => !errors[field])) return true;
  formError.value = 'Check the highlighted details, then try again.';
  void focusFirstError();
  return false;
}

/** Create the draft on the first save, then send only what changed. */
async function persist(signal: AbortSignal): Promise<string> {
  const pending = changes.value;
  if (requestId.value && Object.keys(pending).length === 0) return requestId.value;
  const saved = requestId.value
    ? await updateDraft(requestId.value, pending, signal)
    : await createDraft(pending, signal);
  requestId.value = saved.id;
  baseline.value = { ...baseline.value, ...normalise(pending), ...normalise(saved) };
  return saved.id;
}

function showFailure(error: unknown, draftSaved: boolean) {
  if (error instanceof ApiError && error.status === 401) {
    clearLocalSession();
    emit('sessionExpired');
    return;
  }
  if (error instanceof SubmissionIncompleteError) {
    for (const field of error.missingFields) {
      if (field in fieldLabels) errors[field as FieldName] = 'Complete this before submitting.';
    }
    const missing = error.missingFields.map((field) => fieldLabels[field as FieldName] ?? field);
    formError.value = `Your draft is saved. Complete these details before submitting: ${missing.join(', ')}.`;
    void focusFirstError();
    return;
  }
  if (error instanceof ApiError && error.status === 409 &&
      ['NO_AVAILABLE_COORDINATOR', 'DRAFT_ALREADY_ASSIGNED'].includes(error.code)) {
    formError.value = error.message;
  } else if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
    locked.value = true;
    formError.value = 'This request is no longer an editable draft, so your changes were not saved.';
  } else if (error instanceof ApiError && error.status === 403) {
    formError.value = 'Only event organisers can create and edit event requests.';
  } else if (error instanceof ApiError && error.status === 400) {
    formError.value = 'Some details were not accepted. Check them, then try again.';
  } else if (draftSaved) {
    formError.value = 'Your draft is saved, but we could not confirm that it was submitted. Please try again.';
  } else {
    formError.value = 'Your draft could not be saved. Check your connection, then try again.';
  }
}

async function run(action: 'saving' | 'submitting') {
  if (!canAct.value || !validate()) return;
  controller?.abort();
  const current = new AbortController();
  controller = current;
  busy.value = action;
  notice.value = '';
  let draftSaved = false;
  try {
    const id = await persist(current.signal);
    draftSaved = true;
    if (action === 'submitting') {
      await submitRequest(id, current.signal);
      if (!current.signal.aborted) emit('submitted', id);
    } else if (!current.signal.aborted) {
      notice.value = 'Draft saved.';
      emit('saved', id);
    }
  } catch (error) {
    if (!current.signal.aborted) showFailure(error, draftSaved);
  } finally {
    if (controller === current) busy.value = null;
  }
}

function warnBeforeLeaving(event: BeforeUnloadEvent) {
  if (dirty.value && !locked.value) event.preventDefault();
}

watch(() => props.request, reset, { immediate: true });
// Editing a field withdraws its earlier message; the next save or submit checks it again.
watch(() => ({ ...form }), (now, before) => {
  for (const field of fieldNames) if (now[field] !== before[field]) delete errors[field];
});
onMounted(() => window.addEventListener('beforeunload', warnBeforeLeaving));
onBeforeUnmount(() => {
  controller?.abort();
  window.removeEventListener('beforeunload', warnBeforeLeaving);
});
</script>

<template>
  <form class="panel request-form" :aria-busy="busy !== null" novalidate @submit.prevent="run('submitting')">
    <p class="form-note">
      Save a draft at any time. Fields marked <span class="required-mark">required</span> must be
      completed before you submit. All dates and times are in Singapore time.
    </p>

    <fieldset :disabled="!canAct" class="form-section">
      <legend>Event details</legend>
      <div class="form-field">
        <label :for="`${uid}-name`">Event name <span class="required-mark">required</span></label>
        <input :id="`${uid}-name`" v-model="form.name" type="text" maxlength="200" autocomplete="off"
          :aria-invalid="errors.name ? 'true' : undefined" :aria-describedby="describedBy('name')" />
        <p v-if="errors.name" :id="`${uid}-name-error`" class="field-error">{{ errors.name }}</p>
      </div>
      <div class="form-field">
        <label :for="`${uid}-purpose`">Purpose <span class="required-mark">required</span></label>
        <textarea :id="`${uid}-purpose`" v-model="form.purpose" rows="3"
          :aria-invalid="errors.purpose ? 'true' : undefined" :aria-describedby="describedBy('purpose', true)" />
        <p :id="`${uid}-purpose-hint`" class="field-hint">What the event is for and who it serves.</p>
        <p v-if="errors.purpose" :id="`${uid}-purpose-error`" class="field-error">{{ errors.purpose }}</p>
      </div>
      <div class="form-field">
        <label :for="`${uid}-description`">Description <span class="optional-mark">(optional)</span></label>
        <textarea :id="`${uid}-description`" v-model="form.description" rows="4"
          :aria-invalid="errors.description ? 'true' : undefined" :aria-describedby="describedBy('description')" />
        <p v-if="errors.description" :id="`${uid}-description-error`" class="field-error">{{ errors.description }}</p>
      </div>
    </fieldset>

    <fieldset :disabled="!canAct" class="form-section">
      <legend>Schedule and attendance</legend>
      <div class="form-row">
        <div class="form-field">
          <label :for="`${uid}-startsAt`">Starts <span class="required-mark">required</span></label>
          <input :id="`${uid}-startsAt`" v-model="form.startsAt" type="datetime-local" max="9999-12-31T23:59"
            :aria-invalid="errors.startsAt ? 'true' : undefined" :aria-describedby="describedBy('startsAt')" />
          <p v-if="errors.startsAt" :id="`${uid}-startsAt-error`" class="field-error">{{ errors.startsAt }}</p>
        </div>
        <div class="form-field">
          <label :for="`${uid}-endsAt`">Ends <span class="required-mark">required</span></label>
          <input :id="`${uid}-endsAt`" v-model="form.endsAt" type="datetime-local" max="9999-12-31T23:59"
            :aria-invalid="errors.endsAt ? 'true' : undefined" :aria-describedby="describedBy('endsAt')" />
          <p v-if="errors.endsAt" :id="`${uid}-endsAt-error`" class="field-error">{{ errors.endsAt }}</p>
        </div>
      </div>
      <div class="form-field form-field--short">
        <label :for="`${uid}-expectedAttendance`">Expected attendance <span class="required-mark">required</span></label>
        <input :id="`${uid}-expectedAttendance`" v-model="form.expectedAttendance" type="number" min="0" step="1" inputmode="numeric"
          :aria-invalid="errors.expectedAttendance ? 'true' : undefined" :aria-describedby="describedBy('expectedAttendance')" />
        <p v-if="errors.expectedAttendance" :id="`${uid}-expectedAttendance-error`" class="field-error">{{ errors.expectedAttendance }}</p>
      </div>
    </fieldset>

    <fieldset :disabled="!canAct" class="form-section">
      <legend>Requirements</legend>
      <div class="form-field">
        <label :for="`${uid}-venueRequirements`">Venue requirements <span class="required-mark">required</span></label>
        <textarea :id="`${uid}-venueRequirements`" v-model="form.venueRequirements" rows="3"
          :aria-invalid="errors.venueRequirements ? 'true' : undefined" :aria-describedby="describedBy('venueRequirements', true)" />
        <p :id="`${uid}-venueRequirements-hint`" class="field-hint">For example the size, layout or facilities you need.</p>
        <p v-if="errors.venueRequirements" :id="`${uid}-venueRequirements-error`" class="field-error">{{ errors.venueRequirements }}</p>
      </div>
      <div class="form-field">
        <label :for="`${uid}-accessibilityNeeds`">Accessibility needs <span class="optional-mark">(optional)</span></label>
        <textarea :id="`${uid}-accessibilityNeeds`" v-model="form.accessibilityNeeds" rows="3"
          :aria-invalid="errors.accessibilityNeeds ? 'true' : undefined" :aria-describedby="describedBy('accessibilityNeeds')" />
        <p v-if="errors.accessibilityNeeds" :id="`${uid}-accessibilityNeeds-error`" class="field-error">{{ errors.accessibilityNeeds }}</p>
      </div>
      <div class="form-field">
        <label :for="`${uid}-equipmentRequirements`">Equipment requirements <span class="optional-mark">(optional)</span></label>
        <textarea :id="`${uid}-equipmentRequirements`" v-model="form.equipmentRequirements" rows="3"
          :aria-invalid="errors.equipmentRequirements ? 'true' : undefined" :aria-describedby="describedBy('equipmentRequirements')" />
        <p v-if="errors.equipmentRequirements" :id="`${uid}-equipmentRequirements-error`" class="field-error">{{ errors.equipmentRequirements }}</p>
      </div>
    </fieldset>

    <fieldset :disabled="!canAct" class="form-section">
      <legend>Registration</legend>
      <div class="form-field" role="radiogroup" :aria-labelledby="`${uid}-registration-label`"
        :aria-describedby="describedBy('registrationRequired')">
        <p :id="`${uid}-registration-label`" class="group-label">Do attendees need to register? <span class="optional-mark">(optional)</span></p>
        <div class="choice-row">
          <label class="choice" :class="{ selected: form.registrationRequired === true }">
            <input :id="`${uid}-registrationRequired`" v-model="form.registrationRequired" type="radio" :name="`${uid}-registration`" :value="true" />
            Registration required
          </label>
          <label class="choice" :class="{ selected: form.registrationRequired === false }">
            <input v-model="form.registrationRequired" type="radio" :name="`${uid}-registration`" :value="false" />
            No registration
          </label>
        </div>
        <p v-if="errors.registrationRequired" :id="`${uid}-registrationRequired-error`" class="field-error">{{ errors.registrationRequired }}</p>
      </div>
      <template v-if="form.registrationRequired === true">
        <div class="form-field form-field--short">
          <label :for="`${uid}-registrationCapacity`">Registration capacity <span class="optional-mark">(optional)</span></label>
          <input :id="`${uid}-registrationCapacity`" v-model="form.registrationCapacity" type="number" min="0" step="1" inputmode="numeric"
            :aria-invalid="errors.registrationCapacity ? 'true' : undefined" :aria-describedby="describedBy('registrationCapacity', true)" />
          <p :id="`${uid}-registrationCapacity-hint`" class="field-hint">Leave blank if there is no limit.</p>
          <p v-if="errors.registrationCapacity" :id="`${uid}-registrationCapacity-error`" class="field-error">{{ errors.registrationCapacity }}</p>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label :for="`${uid}-registrationOpensAt`">Registration opens <span class="optional-mark">(optional)</span></label>
            <input :id="`${uid}-registrationOpensAt`" v-model="form.registrationOpensAt" type="datetime-local" max="9999-12-31T23:59"
              :aria-invalid="errors.registrationOpensAt ? 'true' : undefined" :aria-describedby="describedBy('registrationOpensAt')" />
            <p v-if="errors.registrationOpensAt" :id="`${uid}-registrationOpensAt-error`" class="field-error">{{ errors.registrationOpensAt }}</p>
          </div>
          <div class="form-field">
            <label :for="`${uid}-registrationClosesAt`">Registration closes <span class="optional-mark">(optional)</span></label>
            <input :id="`${uid}-registrationClosesAt`" v-model="form.registrationClosesAt" type="datetime-local" max="9999-12-31T23:59"
              :aria-invalid="errors.registrationClosesAt ? 'true' : undefined" :aria-describedby="describedBy('registrationClosesAt')" />
            <p v-if="errors.registrationClosesAt" :id="`${uid}-registrationClosesAt-error`" class="field-error">{{ errors.registrationClosesAt }}</p>
          </div>
        </div>
      </template>
    </fieldset>

    <div v-if="formError" class="form-error" role="alert">
      <p>{{ formError }}</p>
      <RouterLink v-if="locked && requestId" :to="`/events/${requestId}`" class="button button-secondary">View this request</RouterLink>
    </div>

    <footer class="form-actions">
      <button type="button" class="button button-secondary" :disabled="!canAct || !dirty" @click="run('saving')">
        {{ busy === 'saving' ? 'Saving…' : 'Save draft' }}
      </button>
      <button type="submit" class="button button-primary" :disabled="!canAct || (!requestId && !dirty)">
        {{ busy === 'submitting' ? 'Submitting…' : 'Submit for review' }}
      </button>
      <p class="form-status" role="status">{{ statusText }}</p>
    </footer>
  </form>
</template>

<style scoped>
.request-form { padding: 24px; color: #293a33; max-width: 860px; }
.form-note { color: #59685e; font-size: 14px; line-height: 1.6; }
.form-section { border: 0; border-top: 1px solid var(--border); padding: 24px 0 0; margin: 24px 0 0; min-width: 0; }
.form-section legend { padding: 0 12px 0 0; font-size: 17px; font-weight: 650; }
.form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.form-field { margin-top: 18px; min-width: 0; }
.form-section > .form-field:first-of-type { margin-top: 8px; }
.form-field--short { max-width: 240px; }
.form-field label, .group-label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
.required-mark { color: #7a4a1e; font-size: 12px; font-weight: 600; }
.optional-mark { color: #59685e; font-weight: 400; }
.form-field input:not([type='radio']), textarea {
  display: block; width: 100%; padding: 10px 12px; border: 1px solid #87958c; border-radius: 6px;
  background: #fff; font: inherit; font-size: 14px; color: inherit;
}
textarea { resize: vertical; min-height: 84px; line-height: 1.5; }
input:focus-visible, textarea:focus-visible { outline: 3px solid #90a950; outline-offset: 3px; }
[aria-invalid='true'] { border-color: #a5392f !important; }
.field-hint { color: #59685e; font-size: 13px; line-height: 1.5; margin-top: 6px; }
.field-error, .form-error { color: #8a332b; font-size: 14px; line-height: 1.6; }
.field-error { margin-top: 6px; font-size: 13px; }
.choice-row { display: flex; flex-wrap: wrap; gap: 12px; }
.form-field .choice {
  display: flex; align-items: center; gap: 10px; margin: 0; border: 1px solid var(--border);
  border-radius: 8px; padding: 12px 16px; font-weight: 500; cursor: pointer;
}
.choice input { margin: 0; accent-color: var(--green); }
.choice.selected { border-color: var(--green); background: #f0f5ee; }
.form-section:disabled { opacity: 0.7; }
.form-section:disabled .choice { cursor: not-allowed; }
.form-error { margin-top: 24px; background: #fbeeed; border-radius: 8px; padding: 14px 16px; }
.form-error .button { margin-top: 10px; }
.form-actions {
  display: flex; align-items: center; flex-wrap: wrap; gap: 12px 16px;
  border-top: 1px solid var(--border); margin-top: 24px; padding-top: 24px;
}
.request-form .button { font-size: 14px; padding: 11px 16px; }
.request-form button:disabled { cursor: not-allowed; opacity: 0.6; }
.form-status { color: #59685e; font-size: 13px; line-height: 1.6; min-height: 1em; }
@media (max-width: 600px) {
  .request-form { padding: 20px; }
  .form-row { grid-template-columns: minmax(0, 1fr); }
  .form-field--short { max-width: none; }
  .form-actions { align-items: stretch; flex-direction: column; }
}
</style>
