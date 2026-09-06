<script setup lang="ts">
import FeaturePlaceholder from '../../../components/FeaturePlaceholder.vue';
</script>

<template>
  <FeaturePlaceholder
    eyebrow="For organisers"
    title="Event requests"
    description="Manage your organisation’s event requests and follow their progress."
    icon="calendar"
    empty-title="Your event requests will appear here"
    empty-description="Your drafts, submitted requests, and updates will live here once event request management is implemented."
    :capabilities="['Manage drafts', 'Edit requests', 'Track status']"
  />
</template>
