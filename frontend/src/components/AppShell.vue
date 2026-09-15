<script setup lang="ts">
import { onMounted } from 'vue';
import AppIcon from './AppIcon.vue';
import { authSession, restoreSession, roleLabel, signOut } from '../features/auth/session.js';

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
        <RouterLink to="/" exact-active-class="is-active" class="nav-link"
          ><AppIcon name="grid" />Overview</RouterLink
        >
        <p class="nav-label">For organisers</p>
        <RouterLink to="/events" exact-active-class="is-active" class="nav-link"
          ><AppIcon name="calendar" />Event requests</RouterLink
        >
        <RouterLink to="/events/new" exact-active-class="is-active" class="nav-link"
          ><AppIcon name="plus" />New event request</RouterLink
        >
        <p class="nav-label">For coordinators</p>
        <RouterLink to="/reviews" exact-active-class="is-active" class="nav-link"
          ><AppIcon name="review" />Review queue</RouterLink
        >
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
        <div v-if="authSession.user" class="account-summary">
          <span><strong>{{ authSession.user.displayName }}</strong><small>{{ roleLabel(authSession.user.role) }}</small></span>
          <button class="sign-out-button" type="button" @click="handleSignOut">Sign out</button>
        </div>
        <RouterLink v-else to="/login" class="sign-in-link"
          ><AppIcon name="user" :size="16" />Sign in<AppIcon name="arrow" :size="16"
        /></RouterLink>
      </header>
      <main id="main-content" class="main-content" tabindex="-1"><slot /></main>
      <footer class="main-footer">
        <span>ConnectSphere Event Services</span><span>Event planning workspace</span>
      </footer>
    </div>
  </div>
</template>
