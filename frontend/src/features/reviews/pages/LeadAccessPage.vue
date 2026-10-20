<script setup lang="ts">
import { authSession } from '../../auth/session';
</script>

<template>
  <p v-if="authSession.loading" class="panel lead-access" role="status">Checking your session…</p>
  <section v-else-if="!authSession.user" class="panel lead-access">
    <h1>Sign in required</h1>
    <p>Sign in to access coordinator allocation.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </section>
  <section v-else-if="authSession.user.role !== 'EVENT_COORDINATOR_LEAD'" class="panel lead-access">
    <h1>Lead access only</h1>
    <p>Only Event Coordinator Leads can allocate requests and view event oversight.</p>
    <RouterLink to="/" class="button button-primary">Go to overview</RouterLink>
  </section>
  <RouterView v-else :key="`${authSession.user.id}:${authSession.user.role}`" />
</template>

<style scoped>
.lead-access { padding: 24px; }
.lead-access p { margin: 12px 0 20px; }
</style>
