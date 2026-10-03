<script setup lang="ts">
import { computed } from 'vue';
import { authSession } from '../../auth/session.js';
import { canViewVenueAvailability } from '../access';
import VenueAvailabilityCalendar from '../components/VenueAvailabilityCalendar.vue';

const allowed = computed(() => canViewVenueAvailability(authSession.user?.role));
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">Venue planning</p>
    <h1>Venue availability</h1>
    <p class="page-description">
      See when each venue is available, booked or blocked, so you can identify when it may be requested.
    </p>
  </section>

  <p v-if="authSession.loading" class="panel access-panel" role="status">Checking your session…</p>

  <div v-else-if="!authSession.user" class="panel access-panel" role="alert">
    <p>Sign in to view venue availability.</p>
    <RouterLink to="/login" class="button button-primary">Sign in</RouterLink>
  </div>

  <div v-else-if="!allowed" class="panel access-panel" role="alert">
    <p>Venue availability is for event coordinators, venue staff and technical support staff.</p>
    <RouterLink v-if="authSession.user.role === 'EVENT_ORGANISER'" to="/events" class="button button-primary">
      Go to your event requests
    </RouterLink>
    <RouterLink v-else to="/" class="button button-primary">Go to overview</RouterLink>
  </div>

  <!-- Unmount the previous account's calendar and its pending read whenever the verified account changes. -->
  <VenueAvailabilityCalendar v-else :key="`${authSession.user.id}:${authSession.user.role}`" />
</template>

<style scoped>
.access-panel { padding: 24px; font-size: 14px; line-height: 1.6; }
.access-panel .button { margin-top: 12px; font-size: 14px; padding: 11px 16px; }
</style>
