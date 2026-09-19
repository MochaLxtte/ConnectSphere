<!-- frontend/src/features/events/pages/NewEventPage.vue -->
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { createEventRequest } from '../api/event-requests';
import { authSession } from '../../auth/session';

const router = useRouter();

const form = reactive({
  name: '',
  purpose: '',
  description: '',
  startsAt: '',
  endsAt: '',
  expectedAttendance: null as number | null,
  venueRequirements: '',
  accessibilityNeeds: '',
  equipmentRequirements: '',
  registrationRequired: false,
});

const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

const isOrganiser = authSession.user?.role === 'EVENT_ORGANISER';

async function handleSave(action: 'DRAFT' | 'SUBMIT') {
  if (!isOrganiser) {
    errorMessage.value = 'Only Event Organisers can create or save event requests.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const payload = {
      name: form.name || null,
      purpose: form.purpose || null,
      description: form.description || null,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      expectedAttendance: form.expectedAttendance !== null && form.expectedAttendance >= 0 
        ? Number(form.expectedAttendance) 
        : null,
      venueRequirements: form.venueRequirements || null,
      accessibilityNeeds: form.accessibilityNeeds || null,
      equipmentRequirements: form.equipmentRequirements || null,
      registrationRequired: form.registrationRequired,
    };

    const created = await createEventRequest(payload, action);
    void router.push(`/events/${created.id}`);
  } catch (err: any) {
    // Check err.message first for ConnectSphere's ApiError helper
    errorMessage.value = err?.message || err?.response?.data?.error?.message || 'Failed to save event request.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For organisers</p>
    <h1>Create Event Request</h1>
    <p class="page-description">Fill in details for ConnectSphere to assess and plan your event.</p>
  </section>

  <div v-if="!isOrganiser" class="panel detail-panel error-banner" role="alert">
    <p>You do not have permission to create event requests. Only Event Organisers are authorized.</p>
    <RouterLink to="/events" class="button button-secondary">Back to Event Requests</RouterLink>
  </div>

  <form v-else @submit.prevent class="panel form-panel">
    <div v-if="errorMessage" class="error-banner" role="alert">
      {{ errorMessage }}
    </div>

    <div class="form-group">
      <label for="event-name">Event Name</label>
      <input id="event-name" v-model="form.name" type="text" placeholder="e.g. Annual Developer Summit" />
    </div>

    <div class="form-group">
      <label for="event-purpose">Event Purpose</label>
      <input id="event-purpose" v-model="form.purpose" type="text" placeholder="Brief summary of event purpose" />
    </div>

    <div class="form-group">
      <label for="event-description">Description</label>
      <textarea id="event-description" v-model="form.description" rows="4" placeholder="Detailed event breakdown..."></textarea>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="starts-at">Proposed Start Time</label>
        <input id="starts-at" v-model="form.startsAt" type="datetime-local" />
      </div>

      <div class="form-group">
        <label for="ends-at">Proposed End Time</label>
        <input id="ends-at" v-model="form.endsAt" type="datetime-local" />
      </div>
    </div>

    <div class="form-group">
      <label for="expected-attendance">Expected Attendance</label>
      <input id="expected-attendance" v-model.number="form.expectedAttendance" type="number" min="0" placeholder="0" />
    </div>

    <div class="form-group">
      <label for="venue-requirements">Venue Requirements</label>
      <textarea id="venue-requirements" v-model="form.venueRequirements" rows="3" placeholder="Space size, seating layout..."></textarea>
    </div>

    <div class="form-group">
      <label for="accessibility-needs">Accessibility Needs</label>
      <textarea id="accessibility-needs" v-model="form.accessibilityNeeds" rows="2" placeholder="Wheelchair access, sign language interpreters..."></textarea>
    </div>

    <div class="form-group">
      <label for="equipment-requirements">Equipment Requirements</label>
      <textarea id="equipment-requirements" v-model="form.equipmentRequirements" rows="2" placeholder="Microphones, projectors, AV equipment..."></textarea>
    </div>

    <div class="form-group checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" v-model="form.registrationRequired" />
        <span>Registration required for attendees</span>
      </label>
    </div>

    <div class="form-actions">
      <button 
        type="button" 
        class="button button-secondary" 
        :disabled="isSubmitting" 
        @click="handleSave('DRAFT')"
      >
        Save Draft
      </button>

      <button 
        type="button" 
        class="button button-primary" 
        :disabled="isSubmitting" 
        @click="handleSave('SUBMIT')"
      >
        Submit Request
      </button>
    </div>
  </form>
</template>

<style scoped>
.form-panel { padding: 28px; max-width: 720px; display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 14px; font-weight: 600; color: #2e3831; }
.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="datetime-local"],
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #c8d3cb;
  border-radius: 6px;
  font-size: 14px;
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.checkbox-group { flex-direction: row; align-items: center; margin-top: 4px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }
.error-banner { padding: 12px; background-color: #fbeeed; color: #853e37; border-radius: 6px; font-size: 14px; }
@media (max-width: 600px) {
  .form-row { grid-template-columns: 1fr; }
}
</style>