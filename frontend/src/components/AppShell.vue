<script setup lang="ts">
import { computed, onMounted } from 'vue';
import AppIcon from './AppIcon.vue';
import { authSession, restoreSession, roleLabel, signOut } from '../features/auth/session.js';
import { canViewVenueAvailability } from '../features/venues/access.js';
import NotificationBell from '../features/notifications/components/NotificationBell.vue';

// Organiser entry points remain visible to visitors; staff links require a resolved session.
const role = computed(() => authSession.user?.role ?? null);
const showOrganiser = computed(() => role.value === null || role.value === 'EVENT_ORGANISER');
const showCoordinator = computed(() => !authSession.loading && role.value === 'EVENT_COORDINATOR');
const showLead = computed(() => !authSession.loading && role.value === 'EVENT_COORDINATOR_LEAD');
const showAttendee = computed(() => !authSession.loading && role.value === 'ATTENDEE');
const showEquipment = computed(() => !authSession.loading && role.value === 'TECHNICAL_SUPPORT_STAFF');
const showVenuePlanning = computed(() => !authSession.loading && canViewVenueAvailability(role.value));
const showVenueBookings = computed(() => !authSession.loading &&
  (role.value === 'EVENT_COORDINATOR' || role.value === 'VENUE_STAFF'));
const showVenueBlocks = computed(() => !authSession.loading && role.value === 'VENUE_STAFF');
const showVenueCatalogue = computed(() => !authSession.loading && role.value === 'VENUE_STAFF');
const showEquipmentRequests = computed(() => !authSession.loading && role.value === 'TECHNICAL_SUPPORT_STAFF');

onMounted(() => { void restoreSession().catch(() => undefined); });

async function handleSignOut(): Promise<void> {
  try { await signOut(); } catch { /* The active session remains visible so the user can retry. */ }
}
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <aside class="sidebar">
      <RouterLink to="/" class="brand" aria-label="ConnectSphere home">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span></span>
        <span>ConnectSphere<span class="brand-caption">Event Services</span></span>
      </RouterLink>

      <div class="workspace-tag">
        <span class="workspace-avatar">CS</span>
        <div>Event Services<span>Development workspace</span></div>
      </div>

      <nav aria-label="Main navigation" class="main-nav">
        <p class="nav-label">Workspace</p>
        <RouterLink v-if="!authSession.loading && role === 'ATTENDEE'" to="/registrations" class="nav-link"><AppIcon name="calendar" />My registrations</RouterLink>
        <RouterLink to="/" exact-active-class="is-active" class="nav-link"
          ><AppIcon name="grid" />Overview</RouterLink
        >
        <template v-if="showOrganiser">
          <p class="nav-label">For organisers</p>
          <RouterLink to="/events" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="calendar" />Event requests</RouterLink
          >
          <RouterLink to="/events/new" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="plus" />New event request</RouterLink
          >
        </template>
        <template v-if="showCoordinator">
          <p class="nav-label">For coordinators</p>
          <RouterLink to="/reviews" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="review" />Review queue</RouterLink
          >
          <RouterLink to="/venues" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="review" />Search Venues</RouterLink
          >
        </template>
        <template v-if="showEquipmentRequests">
          <p class="nav-label">Technical Support</p>
          <RouterLink to="/equipment-requests" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="review" />Equipment requests</RouterLink>
        </template>
        <template v-if="showLead">
          <p class="nav-label">For coordinator Leads</p>
          <RouterLink to="/lead" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="user" />Assignment queue</RouterLink>
          <RouterLink to="/lead/oversight" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="review" />Event oversight</RouterLink>
        </template>
        <template v-if="showAttendee">
          <p class="nav-label">For attendees</p>
          <RouterLink to="/attend" active-class="is-active" class="nav-link"
            ><AppIcon name="calendar" />Events</RouterLink>
        </template>
        <template v-if="showEquipment">
          <p class="nav-label">For technical support</p>
          <RouterLink to="/equipment/availability" active-class="is-active" class="nav-link"
            ><AppIcon name="grid" />Equipment availability</RouterLink>
          <RouterLink to="/equipment/stock" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="grid" />Equipment stock</RouterLink>
        </template>
        <template v-if="showVenuePlanning">
          <p class="nav-label">Venue planning</p>
          <RouterLink to="/venues/availability" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="availability" />Venue availability</RouterLink
          >
          <RouterLink v-if="showVenueBookings" to="/venue-bookings" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="review" />Venue bookings</RouterLink
          >
          <RouterLink v-if="showVenueBlocks" to="/venue-blocks" exact-active-class="is-active" class="nav-link"
            ><AppIcon name="availability" />Venue blocks</RouterLink
          >
          <RouterLink v-if="showVenueCatalogue" to="/venue-catalogue" active-class="is-active" class="nav-link"
            ><AppIcon name="grid" />Venue catalogue</RouterLink
          >
        </template>
      </nav>

      <div class="sidebar-note">
        <AppIcon name="leaf" />
        <p>Event planning workspace</p>
        <span>For organisers and coordinators.</span>
      </div>
      <div class="sidebar-footer">
        <span class="tiny-dot"></span>Development scaffold<span>v0.1</span>
      </div>
    </aside>

    <div class="main-column">
      <header class="topbar">
        <div class="breadcrumb">
          Workspace <span>/</span> <strong>{{ $route.meta.title || 'Overview' }}</strong>
        </div>
        <div class="topbar-actions">
          <NotificationBell v-if="authSession.user" />
          <div v-if="authSession.user" class="account-summary">
            <span><strong>{{ authSession.user.displayName }}</strong><small>{{ roleLabel(authSession.user.role) }}</small></span>
            <button class="sign-out-button" type="button" @click="handleSignOut">Sign out</button>
          </div>
          <RouterLink v-else to="/login" class="sign-in-link"
            ><AppIcon name="user" :size="16" />Sign in<AppIcon name="arrow" :size="16"
          /></RouterLink>
        </div>
      </header>
      <main id="main-content" class="main-content" tabindex="-1"><slot /></main>
      <footer class="main-footer">
        <span>ConnectSphere Event Services</span><span>Event planning workspace</span>
      </footer>
    </div>
  </div>
</template>
