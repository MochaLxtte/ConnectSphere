<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../../../lib/api-client';
import { authSession, clearLocalSession } from '../../auth/session.js';
import { formatEventTime } from '../../events/presentation';
import { venueBookingStatusLabel } from '../api/venue-bookings';
import {
  assessVenueSuitability, fetchVenueSuitabilityContext,
  type VenueSuitabilityAssessment, type VenueSuitabilityCheck, type VenueSuitabilityContext,
} from '../api/venue-suitability';

type State = { status: 'idle' | 'loading' }
  | { status: 'ready'; context: VenueSuitabilityContext }
  | { status: 'error'; message: string; retryable: boolean };

const route = useRoute();
// A route can change before this page unmounts, including to another page with an id.
const eventId = computed(() => route.matched.some((record) => record.path === '/reviews/:id/venue-suitability')
  && typeof route.params.id === 'string' ? route.params.id : '');
const arrangementMode = computed(() => route.query.bookingId !== undefined);
const bookingId = computed(() => typeof route.query.bookingId === 'string' ? route.query.bookingId.toLowerCase() : '');
const allowed = computed(() => authSession.user?.role === 'EVENT_COORDINATOR');
const state = ref<State>({ status: 'idle' });
const venueId = ref('');
const facilities = ref('');
const accessibility = ref('');
const layout = ref('');
const wheelchairRequired = ref(false);
const unresolvedRequirements = ref('');
const requirementsConfirmed = ref(false);
const assessing = ref(false);
const assessment = ref<VenueSuitabilityAssessment | null>(null);
const assessmentError = ref<string | null>(null);
const notice = ref<string | null>(null);
let readController: AbortController | undefined;
let assessmentController: AbortController | undefined;

const selectedVenue = computed(() => state.value.status === 'ready'
  ? state.value.context.venues.find((venue) => venue.id === venueId.value) : undefined);
function listValues(value: string): string[] {
  const values = new Map<string, string>();
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !values.has(trimmed.toLowerCase())) values.set(trimmed.toLowerCase(), trimmed);
  }
  return [...values.values()];
}
function listError(value: string, label: string): string {
  const values = listValues(value);
  if (values.length > 30) return `Enter at most 30 different ${label}, one per line.`;
  if (values.some((item) => item.length > 100)) return `Each ${label === 'facilities' ? 'facility' : 'accessibility feature'} must be at most 100 characters.`;
  return '';
}
const validationError = computed(() => listError(facilities.value, 'facilities')
  || listError(accessibility.value, 'accessibility features')
  || (!arrangementMode.value && layout.value.trim().length > 100 ? 'The required layout must be at most 100 characters.' : '')
  || (unresolvedRequirements.value.trim().length > 2000 ? 'Use at most 2,000 characters for unresolved requirements.' : ''));
const canAssess = computed(() => state.value.status === 'ready' && allowed.value && !!eventId.value
  && !!selectedVenue.value && requirementsConfirmed.value && !validationError.value && !assessing.value);
const checkLabels: Record<VenueSuitabilityCheck['key'], string> = {
  venueActive: 'Venue active', capacity: 'Capacity', facilities: 'Required facilities',
  accessibility: 'Accessibility', layout: 'Room layout', availability: 'Availability', requirements: 'Requirement interpretation',
};
const outcomeLabels: Record<VenueSuitabilityAssessment['outcome'], string> = {
  SUITABLE: 'Suitable', UNSUITABLE: 'Unsuitable', NEEDS_REVIEW: 'Needs review',
};
const checkStatusLabels: Record<VenueSuitabilityCheck['status'], string> = {
  PASS: 'Pass', FAIL: 'Does not meet requirement', UNKNOWN: 'Needs review',
};

function discardAssessment() {
  assessmentController?.abort();
  assessment.value = null;
  assessmentError.value = null;
  assessing.value = false;
}

function resetInterpretation() {
  discardAssessment();
  venueId.value = '';
  facilities.value = '';
  accessibility.value = '';
  layout.value = '';
  wheelchairRequired.value = false;
  unresolvedRequirements.value = '';
  requirementsConfirmed.value = false;
}

function showReadError(error: unknown) {
  const denied = error instanceof ApiError && [403, 404].includes(error.status);
  state.value = {
    status: 'error', retryable: !denied,
    message: denied ? arrangementMode.value
      ? 'This saved arrangement is unavailable or you do not have permission to assess it.'
      : 'This event request is unavailable or you do not have permission to assess its venues.'
      : error instanceof Error ? error.message : 'The event and venue information could not be loaded. Please try again.',
  };
}

async function loadContext(message: string | null = null) {
  readController?.abort();
  resetInterpretation();
  notice.value = message;
  state.value = { status: 'idle' };
  if (authSession.loading || !allowed.value || !eventId.value) return;
  if (arrangementMode.value && !bookingId.value) {
    state.value = { status: 'error', retryable: false, message: 'Choose a saved arrangement from the event request to check its suitability.' };
    return;
  }
  const current = new AbortController();
  readController = current;
  state.value = { status: 'loading' };
  try {
    const context = await fetchVenueSuitabilityContext(eventId.value, current.signal, bookingId.value || undefined);
    if (current.signal.aborted) return;
    if (arrangementMode.value && (!context.arrangement || context.arrangement.id !== bookingId.value
      || !context.venues.some((venue) => venue.id === context.arrangement!.venueId))) {
      throw new Error('The saved arrangement could not be loaded. Refresh to check its current details.');
    }
    state.value = { status: 'ready', context };
    if (context.arrangement) {
      venueId.value = context.arrangement.venueId;
      layout.value = context.arrangement.layout ?? '';
    }
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    showReadError(error);
  }
}

async function assess() {
  if (!canAssess.value || state.value.status !== 'ready') return;
  discardAssessment();
  notice.value = null;
  const current = new AbortController();
  assessmentController = current;
  assessing.value = true;
  try {
    const result = await assessVenueSuitability(eventId.value, {
      ...(bookingId.value ? { bookingId: bookingId.value } : {}),
      venueId: venueId.value, requirementsVersion: state.value.context.requirementsVersion,
      facilities: listValues(facilities.value), accessibility: listValues(accessibility.value),
      layout: layout.value.trim() || null, wheelchairRequired: wheelchairRequired.value,
      requirementsConfirmed: requirementsConfirmed.value,
      unresolvedRequirements: unresolvedRequirements.value.trim() || null,
    }, current.signal);
    if (!current.signal.aborted) assessment.value = result;
  } catch (error) {
    if (current.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { clearLocalSession(); return; }
    if (error instanceof ApiError && error.status === 409 && error.code === 'SUITABILITY_CONTEXT_CHANGED') {
      await loadContext(arrangementMode.value
        ? 'The saved arrangement or event requirements have changed. Review the refreshed information, enter your interpretation again and confirm it before checking.'
        : 'The event requirements have changed. Review the refreshed information, enter your interpretation again and confirm it before checking.');
    } else if (error instanceof ApiError && [403, 404].includes(error.status)) {
      resetInterpretation();
      showReadError(error);
    } else {
      assessmentError.value = error instanceof Error ? error.message : 'The suitability check could not be completed. Please try again.';
    }
  } finally {
    if (!current.signal.aborted) assessing.value = false;
  }
}

// Changing the selected venue or interpretation invalidates the prior conclusion and confirmation.
watch(() => [venueId.value, facilities.value, accessibility.value, layout.value,
  wheelchairRequired.value, unresolvedRequirements.value], () => {
  requirementsConfirmed.value = false;
  discardAssessment();
}, { flush: 'sync' });
watch(requirementsConfirmed, discardAssessment, { flush: 'sync' });
watch(() => [authSession.loading, authSession.user?.id, authSession.user?.role, eventId.value, route.query.bookingId],
  () => { void loadContext(); }, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => { readController?.abort(); assessmentController?.abort(); });
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Venue planning</p>
    <h1>Check venue suitability</h1>
    <p class="page-description">{{ arrangementMode ? 'Check a saved arrangement against the event requirements using its own venue, period and layout.' : "Compare a venue with your event's requirements before deciding where to request a booking." }}</p>
  </section>

  <p v-if="authSession.loading" class="panel suitability-panel" role="status">Checking your session…</p>
  <div v-else-if="!authSession.user" class="panel suitability-panel" role="alert">
    <p>Sign in to check venue suitability.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>
  <p v-else-if="!allowed" class="panel suitability-panel" role="alert">Venue suitability is for the event's assigned coordinator.</p>

  <template v-else>
    <nav class="suitability-toolbar" aria-label="Suitability navigation">
      <RouterLink :to="`/reviews/${eventId}`">Back to event request</RouterLink>
      <button type="button" class="button button-secondary" :disabled="state.status === 'loading'" @click="loadContext()">Refresh event and venues</button>
    </nav>
    <p v-if="notice" class="panel suitability-notice" role="alert">{{ notice }}</p>
    <p v-if="state.status === 'loading'" role="status">Loading event requirements and venues…</p>
    <div v-else-if="state.status === 'error'" class="panel suitability-panel" role="alert">
      <p>{{ state.message }}</p>
      <button v-if="state.retryable" type="button" class="button button-secondary" @click="loadContext()">Try again</button>
    </div>

    <template v-else-if="state.status === 'ready'">
      <section v-if="state.context.arrangement" class="panel suitability-panel saved-arrangement" aria-labelledby="suitability-arrangement-title">
        <h2 id="suitability-arrangement-title">Saved arrangement</h2>
        <p class="suitability-hint">This check uses the saved venue, period and layout below. Review the notes alongside the parent event requirements when interpreting facilities and accessibility. All times are Singapore time.</p>
        <dl>
          <div><dt>Venue</dt><dd>{{ selectedVenue?.name }}</dd></div>
          <div><dt>Arrangement starts</dt><dd>{{ formatEventTime(state.context.arrangement.startsAt) }}</dd></div>
          <div><dt>Arrangement ends</dt><dd>{{ formatEventTime(state.context.arrangement.endsAt) }}</dd></div>
          <div><dt>Saved layout</dt><dd>{{ state.context.arrangement.layout ?? 'No particular layout saved' }}</dd></div>
          <div><dt>Saved notes</dt><dd>{{ state.context.arrangement.notes ?? 'No notes saved' }}</dd></div>
          <div><dt>Status</dt><dd>{{ venueBookingStatusLabel(state.context.arrangement.status) }}</dd></div>
        </dl>
      </section>
      <div class="source-grid">
        <section class="panel suitability-panel" aria-labelledby="suitability-event-title">
          <h2 id="suitability-event-title">{{ state.context.event.name?.trim() || 'Untitled event request' }}</h2>
          <p class="suitability-hint">{{ arrangementMode ? 'Parent event requirements and reference dates · Singapore time. Availability is checked for the saved arrangement period above.' : 'Current event information · Singapore time' }}</p>
          <dl>
            <div><dt>Starts</dt><dd>{{ formatEventTime(state.context.event.startsAt) }}</dd></div>
            <div><dt>Ends</dt><dd>{{ formatEventTime(state.context.event.endsAt) }}</dd></div>
            <div><dt>Expected attendance</dt><dd>{{ state.context.event.expectedAttendance ?? 'Not provided' }}</dd></div>
            <div><dt>Venue requirements</dt><dd>{{ state.context.event.venueRequirements ?? 'Not provided' }}</dd></div>
            <div><dt>Accessibility needs</dt><dd>{{ state.context.event.accessibilityNeeds ?? 'Not provided' }}</dd></div>
          </dl>
        </section>

        <section class="panel suitability-panel" aria-labelledby="suitability-venue-title">
          <h2 id="suitability-venue-title">{{ arrangementMode ? 'Saved venue capabilities' : 'Choose a venue' }}</h2>
          <p class="suitability-hint">Catalogue details from the last refresh. Each assessment checks the latest venue information; use Refresh event and venues to update the details shown here.</p>
          <p v-if="state.context.venues.length === 0" class="suitability-hint" role="status">No active venues are available to assess. Refresh after the venue catalogue is updated.</p>
          <template v-else>
            <label class="field-label" for="suitability-venue">Venue to assess</label>
            <select id="suitability-venue" v-model="venueId" :disabled="arrangementMode">
              <option value="" disabled>Select a venue</option>
              <option v-for="venue in state.context.venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option>
            </select>
            <dl v-if="selectedVenue">
              <div><dt>Capacity</dt><dd>{{ selectedVenue.capacity }}</dd></div>
              <div><dt>Facilities offered</dt><dd>{{ selectedVenue.facilities.join(', ') || 'None listed' }}</dd></div>
              <div><dt>Accessibility features</dt><dd>{{ selectedVenue.accessibilityFeatures.join(', ') || 'None listed' }}</dd></div>
              <div><dt>Wheelchair accessible</dt><dd>{{ selectedVenue.wheelchairAccessible ? 'Yes' : 'No' }}</dd></div>
              <div><dt>Room layouts</dt><dd>{{ selectedVenue.layouts.join(', ') || 'None listed' }}</dd></div>
              <div><dt>Daily opening hours</dt><dd>{{ selectedVenue.opensAt ?? 'No opening limit' }} – {{ selectedVenue.closesAt ?? 'No closing limit' }}</dd></div>
            </dl>
          </template>
        </section>
      </div>

      <form v-if="selectedVenue" class="panel suitability-panel interpretation-form" aria-label="Interpret event requirements" @submit.prevent="assess">
        <h2>Interpret the event requirements</h2>
        <p class="suitability-hint">Use the event information{{ arrangementMode ? ' and saved arrangement notes' : '' }} above to describe what is required. Enter one facility or accessibility feature per line, including anything the selected venue does not offer.</p>
        <div class="interpretation-grid">
          <div>
            <label class="field-label" for="suitability-facilities">Required facilities</label>
            <textarea id="suitability-facilities" v-model="facilities" rows="4" aria-describedby="suitability-list-help" />
          </div>
          <div>
            <label class="field-label" for="suitability-accessibility">Required accessibility features</label>
            <textarea id="suitability-accessibility" v-model="accessibility" rows="4" aria-describedby="suitability-list-help" />
          </div>
        </div>
        <p id="suitability-list-help" class="suitability-hint">Up to 30 different entries in each list, at most 100 characters each. Blank means none required once you confirm below.</p>
        <label class="field-label" for="suitability-layout">{{ arrangementMode ? 'Saved room layout' : 'Required room layout' }}</label>
        <input id="suitability-layout" v-model="layout" :readonly="arrangementMode" :list="arrangementMode ? undefined : 'suitability-layouts'" :maxlength="arrangementMode ? undefined : 100" :placeholder="arrangementMode ? 'No particular layout saved' : 'Leave blank if no particular layout is required'" />
        <datalist v-if="!arrangementMode" id="suitability-layouts"><option v-for="value in selectedVenue.layouts" :key="value" :value="value" /></datalist>
        <label class="checkbox-label"><input v-model="wheelchairRequired" type="checkbox" /> Wheelchair access is required</label>
        <label class="field-label" for="suitability-unresolved">Requirements that still need clarification</label>
        <textarea id="suitability-unresolved" v-model="unresolvedRequirements" rows="3" maxlength="2000" aria-describedby="suitability-unresolved-help" />
        <p id="suitability-unresolved-help" class="suitability-hint">Record anything that cannot yet be assessed. An unresolved requirement prevents a Suitable result. Up to 2,000 characters.</p>
        <label class="checkbox-label confirmation-label">
          <input v-model="requirementsConfirmed" type="checkbox" />
          I have reviewed the event requirements{{ arrangementMode ? ' and saved arrangement notes' : '' }}. These entries cover the requirements I can assess; blank fields and an unchecked wheelchair requirement mean none is required, and anything unresolved is recorded above.
        </label>
        <p v-if="validationError" class="suitability-error" role="alert">{{ validationError }}</p>
        <p v-if="assessmentError" class="suitability-error" role="alert">{{ assessmentError }}</p>
        <div class="suitability-actions">
          <button type="submit" class="button button-primary" :disabled="!canAssess">{{ assessing ? 'Checking suitability…' : assessment ? 'Recheck suitability' : 'Check suitability' }}</button>
          <p class="suitability-hint">Each check reads current event, venue, booking and blocked-period information. It does not reserve a venue or change the event request.</p>
        </div>
      </form>

      <section v-if="assessment" class="panel suitability-panel assessment-result" aria-label="Suitability assessment" aria-live="polite">
        <p class="eyebrow">Assessment result</p>
        <h2 id="suitability-result-title" :class="`outcome-${assessment.outcome.toLowerCase()}`">{{ outcomeLabels[assessment.outcome] }}</h2>
        <p class="suitability-hint">{{ assessment.venueName }} · Checked {{ formatEventTime(assessment.checkedAt) }} (Singapore time)</p>
        <p v-if="assessment.occupiedStartsAt && assessment.occupiedEndsAt">Occupied time (including setup/turnaround): {{ formatEventTime(assessment.occupiedStartsAt) }} – {{ formatEventTime(assessment.occupiedEndsAt) }}</p>
        <ul class="assessment-checks" aria-label="Suitability checks">
          <li v-for="check in assessment.checks" :key="check.key">
            <div class="check-heading"><h3>{{ checkLabels[check.key] }}</h3><span :class="`check-${check.status.toLowerCase()}`">{{ checkStatusLabels[check.status] }}</span></div>
            <p>{{ check.message }}</p>
          </li>
        </ul>
        <p class="suitability-hint">This assessment applies to the information checked at the time above. Recheck before requesting a booking if the event, venue or availability may have changed.</p>
      </section>
    </template>
  </template>
</template>

<style scoped>
.suitability-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
.suitability-toolbar a { color: var(--green); text-underline-offset: 3px; }
.source-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.saved-arrangement { margin-bottom: 24px; }
.suitability-panel { padding: 24px; min-width: 0; }
.suitability-panel h2 { font-size: 20px; overflow-wrap: anywhere; }
.suitability-hint { color: #59685e; font-size: 13px; line-height: 1.6; margin-top: 10px; }
.suitability-panel dl { display: grid; gap: 16px; margin-top: 24px; }
.suitability-panel dl > div { display: grid; grid-template-columns: minmax(100px, 0.8fr) minmax(0, 1fr); gap: 12px; }
.suitability-panel dt { font-size: 13px; color: #59685e; }
.suitability-panel dd { font-size: 14px; margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.field-label { display: block; font-size: 14px; font-weight: 600; margin: 20px 0 8px; }
.suitability-panel select, .suitability-panel textarea, .suitability-panel input:not([type='checkbox']) { box-sizing: border-box; width: 100%; max-width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 10px; font: inherit; background: white; }
.suitability-panel textarea { resize: vertical; }
.interpretation-form, .assessment-result { margin-top: 24px; }
.interpretation-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.checkbox-label { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; line-height: 1.6; margin-top: 20px; }
.checkbox-label input { flex-shrink: 0; margin-top: 4px; }
.confirmation-label { background: #f5f6f1; border-radius: 8px; padding: 16px; }
.suitability-actions { display: flex; align-items: center; gap: 24px; margin-top: 24px; }
.suitability-actions .button { flex-shrink: 0; }
.suitability-actions .suitability-hint { margin-top: 0; }
.suitability-error { color: #853e37; font-size: 14px; line-height: 1.6; margin-top: 16px; }
.suitability-notice { padding: 16px 24px; margin-bottom: 24px; line-height: 1.6; }
.assessment-result .eyebrow { margin-bottom: 10px; }
.assessment-checks { list-style: none; padding: 0; margin: 24px 0; display: grid; gap: 12px; }
.assessment-checks li { border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.check-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.check-heading h3 { font-size: 15px; }
.check-heading span { font-size: 12px; font-weight: 600; border-radius: 18px; padding: 5px 10px; }
.assessment-checks li p { font-size: 14px; line-height: 1.6; margin-top: 8px; white-space: pre-wrap; overflow-wrap: anywhere; }
.outcome-suitable { color: #365d2e; }
.outcome-unsuitable { color: #853e37; }
.outcome-needs_review { color: #805518; }
.check-pass { color: #365d2e; background: #edf5e9; }
.check-fail { color: #853e37; background: #fbeeed; }
.check-unknown { color: #805518; background: #fff3df; }
.suitability-panel > .button { margin-top: 12px; }
@media (max-width: 850px) { .source-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) {
  .suitability-panel { padding: 20px; }
  .suitability-toolbar, .suitability-actions, .check-heading { align-items: flex-start; flex-direction: column; }
  .interpretation-grid { grid-template-columns: 1fr; gap: 0; }
  .suitability-panel dl > div { grid-template-columns: 1fr; gap: 4px; }
}
</style>
