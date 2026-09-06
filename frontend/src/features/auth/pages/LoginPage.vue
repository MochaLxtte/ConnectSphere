<script setup lang="ts">
import FeaturePlaceholder from '../../../components/FeaturePlaceholder.vue';
</script>

<template>
  <FeaturePlaceholder
    eyebrow="Your account"
    title="Welcome to ConnectSphere"
    description="Access event planning and coordination in one shared workspace."
    icon="user"
    empty-title="Sign-in will start here"
    empty-description="This space is reserved for account access. Authentication and role permissions will be added during development."
    :capabilities="['Sign in', 'Organiser access', 'Coordinator access']"
  />
</template>
