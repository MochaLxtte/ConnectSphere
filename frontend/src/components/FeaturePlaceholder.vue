<script setup lang="ts">
import AppIcon from './AppIcon.vue';

defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  icon: 'calendar' | 'plus' | 'review' | 'user';
  emptyTitle: string;
  emptyDescription: string;
  capabilities: string[];
}>();
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1>{{ title }}</h1>
    <p class="page-description">{{ description }}</p>
  </section>
  <section class="panel feature-placeholder" aria-labelledby="feature-title">
    <span class="stage-badge">Planned feature</span>
    <div class="empty-illustration"><AppIcon :name="icon" :size="38" /></div>
    <h2 id="feature-title">{{ emptyTitle }}</h2>
    <p>{{ emptyDescription }}</p>
    <div class="planned-capabilities">
      <span v-for="capability in capabilities" :key="capability"
        ><AppIcon name="plus" :size="14" />{{ capability }}</span
      >
    </div>
    <p class="placeholder-note">This is a scaffold. This feature is not implemented yet.</p>
    <RouterLink to="/" class="text-link"
      >Back to overview<AppIcon name="arrow" :size="16"
    /></RouterLink>
  </section>
</template>
