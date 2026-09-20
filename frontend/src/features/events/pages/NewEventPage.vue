<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import EventRequestForm from '../components/EventRequestForm.vue';

const router = useRouter();
const sessionExpired = ref(false);
// A different account must never inherit the previous organiser's unsaved form or draft ID.
const formKey = ref(0);

watch(() => [authSession.user?.id, authSession.user?.role], () => {
  formKey.value += 1;
  if (authSession.user) sessionExpired.value = false;
}, { flush: 'sync' });
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">For organisers</p>
    <h1>New event request</h1>
    <p class="page-description">Prepare the details your coordinator needs to review an event.</p>
  </section>

  <div class="form-toolbar">
    <RouterLink to="/events" class="back-link">Back to event requests</RouterLink>
  </div>

  <p v-if="authSession.loading" class="panel form-message" role="status">Checking your session…</p>
  <div v-else-if="sessionExpired || !authSession.user" class="panel form-message" role="alert">
    <p>{{ sessionExpired ? 'Your session has expired. Sign in again to continue your event request.'
      : 'Sign in to create an event request.' }}</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>
  <p v-else-if="authSession.user.role !== 'EVENT_ORGANISER'" class="panel form-message" role="alert">
    This page is for event organisers.
  </p>
  <EventRequestForm
    v-else
    :key="formKey"
    @submitted="(id) => router.push(`/events/${id}`)"
    @session-expired="sessionExpired = true"
  />
</template>

<style scoped>
.form-toolbar { margin-bottom: 20px; }
.back-link { color: var(--green); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.form-message { padding: 24px; font-size: 14px; line-height: 1.6; max-width: 860px; }
.form-message .button { margin-top: 12px; font-size: 14px; padding: 11px 16px; }
</style>
