import { getJson, postJson } from '../../../lib/api-client';

/** KAN-64: one in-app notification, as the API authorises it for the signed-in user. */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  /** Present only while the user may still open the event. */
  event: { id: string; name: string | null } | null;
  booking: { id: string } | null;
  /** An application path whose page authorises the user again, or null. */
  link: string | null;
}

export async function fetchNotifications(signal?: AbortSignal): Promise<NotificationItem[]> {
  return (await getJson<{ items: NotificationItem[] }>('/api/notifications', signal)).items;
}

export async function fetchUnreadCount(signal?: AbortSignal): Promise<number> {
  return (await getJson<{ unreadCount: number }>('/api/notifications/unread-count', signal)).unreadCount;
}

export async function markNotificationRead(id: string, signal?: AbortSignal): Promise<NotificationItem> {
  return (await postJson<{ notification: NotificationItem }>(
    `/api/notifications/${encodeURIComponent(id)}/read`, {}, signal)).notification;
}

/** Returns how many notifications changed. */
export async function markAllNotificationsRead(signal?: AbortSignal): Promise<number> {
  return (await postJson<{ updated: number }>('/api/notifications/read-all', {}, signal)).updated;
}
