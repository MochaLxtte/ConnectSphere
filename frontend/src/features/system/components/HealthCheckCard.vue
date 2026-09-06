<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue';

defineProps<{
  title: string;
  description: string;
  icon: 'server' | 'database';
  state: { status: 'pending' | 'success' | 'error'; message: string };
}>();
</script>

<template>
  <article class="health-card" :aria-label="title">
    <div class="health-card-heading">
      <span class="health-icon"><AppIcon :name="icon" :size="22" /></span
      ><span class="status-pill" :class="`status-${state.status}`" role="status"
        ><span class="tiny-dot"></span
        >{{
          state.status === 'success'
            ? 'Connected'
            : state.status === 'pending'
              ? 'Checking'
              : 'Needs attention'
        }}</span
      >
    </div>
    <h3>{{ title }}</h3>
    <p class="health-description">{{ description }}</p>
    <p
      class="health-result"
      :class="{ 'health-error': state.status === 'error' }"
      :role="state.status === 'error' ? 'alert' : undefined"
    >
      {{ state.message }}
    </p>
  </article>
</template>
