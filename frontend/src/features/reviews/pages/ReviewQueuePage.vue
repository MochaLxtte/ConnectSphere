<script setup lang="ts">
import FeaturePlaceholder from '../../../components/FeaturePlaceholder.vue';
</script>

<template>
  <FeaturePlaceholder
    eyebrow="For coordinators"
    title="Review queue"
    description="Review submitted event requests and coordinate next steps."
    icon="review"
    empty-title="Submitted requests will appear here"
    empty-description="Submitted event requests will be available here for review, clarification, and a recorded decision once this workflow is implemented."
    :capabilities="['Review requests', 'Ask for clarification', 'Record a decision']"
  />
</template>
