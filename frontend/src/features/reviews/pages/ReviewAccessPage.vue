<script setup lang="ts">
import { authSession } from '../../auth/session.js';
</script>

<template>
  <p v-if="authSession.loading" class="panel access-panel" role="status">Checking your session…</p>

  <section v-else-if="!authSession.user" class="panel access-panel">
    <h1>Sign in required</h1>
    <p>Sign in to access event reviews.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </section>

  <section v-else-if="authSession.user.role !== 'EVENT_COORDINATOR'" class="panel access-panel">
    <h1>Coordinator access only</h1>
    <p>This page is for event coordinators.</p>
    <RouterLink v-if="authSession.user.role === 'EVENT_ORGANISER'" to="/events" class="button button-primary">
      Go to your event requests
    </RouterLink>
    <RouterLink v-else to="/" class="button button-primary">Go to overview</RouterLink>
  </section>

  <!-- Unmount the old page and its pending work whenever the verified account changes. -->
  <RouterView v-else :key="authSession.user.id" />
</template>

<style scoped>
.access-panel { padding: 24px; }
.access-panel h1 { font-size: 24px; }
.access-panel p { margin: 12px 0 20px; }
</style>
