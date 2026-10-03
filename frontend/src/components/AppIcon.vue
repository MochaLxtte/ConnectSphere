<script setup lang="ts">
withDefaults(
  defineProps<{
    name:
      | 'grid'
      | 'calendar'
      | 'plus'
      | 'review'
      | 'arrow'
      | 'check'
      | 'server'
      | 'database'
      | 'refresh'
      | 'user'
      | 'leaf'
      | 'availability';
    size?: number;
  }>(),
  { size: 20 },
);

const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2',
  plus: 'M12 5v14 M5 12h14',
  review: 'M9 4H5v17h14V4h-4 M9 2h6v5H9z M8 13l2 2 6-6 M8 18h8',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  check: 'M5 12l4 4L19 6',
  server: 'M4 3h16v7H4z M4 14h16v7H4z M7 6h.01 M7 17h.01 M15 6h2 M15 17h2',
  database: 'M4 6c0-4 16-4 16 0s-16 4-16 0 M4 6v12c0 4 16 4 16 0V6 M4 12c0 4 16 4 16 0',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 13 3 M18 18a8 8 0 0 1-13-3',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  leaf: 'M20 3C7 2 2 8 5 15s15 5 15-12z M5 21L16 9 M10 16v-5',
  availability: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M9 15.5l2 2 4-4',
} as const;
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
