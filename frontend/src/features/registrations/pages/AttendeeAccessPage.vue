<script setup lang="ts">
import { authSession } from '../../auth/session';
</script>

<template>
  <p v-if="authSession.loading" class="attendee-access" role="status">Checking your session…</p>
  <section v-else-if="!authSession.user" class="panel attendee-access">
    <h1>Sign in required</h1>
    <p>Sign in to see events and register for them.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </section>
  <section v-else-if="authSession.user.role !== 'ATTENDEE'" class="panel attendee-access">
    <h1>Attendee access only</h1>
    <p>Only attendees can register for events here.</p>
    <RouterLink to="/" class="button button-primary">Go to overview</RouterLink>
  </section>
  <RouterView v-else :key="`${authSession.user.id}:${authSession.user.role}`" />
</template>

<style scoped>
.attendee-access { padding: 24px; }
.attendee-access p { margin: 12px 0 20px; }
</style>
