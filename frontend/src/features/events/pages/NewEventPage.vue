<script setup lang="ts">
import FeaturePlaceholder from '../../../components/FeaturePlaceholder.vue';
</script>

<template>
  <FeaturePlaceholder
    eyebrow="For organisers"
    title="New event request"
    description="Prepare the details your coordinator needs to review an event."
    icon="plus"
    empty-title="Event request form"
    empty-description="The request form will collect the event details and support saving a draft before submission. The form is not available yet."
    :capabilities="['Event details', 'Save a draft', 'Submit for review']"
  />
</template>
