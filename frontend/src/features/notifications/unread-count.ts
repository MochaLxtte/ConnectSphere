import { readonly, ref } from 'vue';

// Shared between the bell and the notifications page so marking items read updates the badge at once.
const count = ref(0);

export const unreadNotificationCount = readonly(count);

export function setUnreadNotificationCount(value: number): void {
  count.value = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
