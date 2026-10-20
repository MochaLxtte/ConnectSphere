<script setup lang="ts">
import { authSession } from '../../auth/session.js';
import NotificationInbox from '../components/NotificationInbox.vue';
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Your account</p>
    <h1>Notifications</h1>
    <p class="page-description">Updates about your event requests, coordinator assignments and venue bookings.</p>
  </section>

  <p v-if="authSession.loading" class="panel access-panel" role="status">Checking your session…</p>

  <div v-else-if="!authSession.user" class="panel access-panel" role="alert">
    <p>Sign in to view your notifications.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>

  <!-- Unmount the previous account's inbox and its pending reads whenever the verified account changes. -->
  <NotificationInbox v-else :key="authSession.user.id" />
</template>

<style scoped>
.access-panel { padding: 24px; font-size: 14px; line-height: 1.6; }
.access-panel .button { margin-top: 12px; font-size: 14px; padding: 11px 16px; }
</style>
