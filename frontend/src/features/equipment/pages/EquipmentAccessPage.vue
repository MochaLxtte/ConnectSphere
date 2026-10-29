<script setup lang="ts">
import { authSession } from '../../auth/session';
</script>

<template>
  <p v-if="authSession.loading" class="panel equipment-access" role="status">Checking your session…</p>
  <section v-else-if="!authSession.user" class="panel equipment-access">
    <h1>Sign in required</h1>
    <p>Sign in to use the equipment pages.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </section>
  <section v-else-if="authSession.user.role !== 'TECHNICAL_SUPPORT_STAFF'" class="panel equipment-access">
    <h1>Technical support access only</h1>
    <p>Only Technical Support Staff can use the equipment pages.</p>
    <RouterLink to="/" class="button button-primary">Go to overview</RouterLink>
  </section>
  <RouterView v-else :key="`${authSession.user.id}:${authSession.user.role}`" />
</template>

<style scoped>
.equipment-access { padding: 24px; }
.equipment-access p { margin: 12px 0 20px; }
</style>
