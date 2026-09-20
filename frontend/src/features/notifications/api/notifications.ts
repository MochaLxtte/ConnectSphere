import { getJson, postJson } from '../../../lib/api-client';

/** CF-20: an in-app notification addressed to the signed-in user. */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  eventRequestId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  unreadCount: number;
  /** Opaque; pass back as `before` to load older notifications. */
  nextCursor: string | null;
}

export interface NotificationQuery {
  unreadOnly?: boolean;
  limit?: number;
  before?: string | null;
}

export function fetchNotifications(query: NotificationQuery = {}, signal?: AbortSignal): Promise<NotificationPage> {
  const parameters = new URLSearchParams();
  if (query.unreadOnly) parameters.set('unread', 'true');
  if (query.limit) parameters.set('limit', String(query.limit));
  if (query.before) parameters.set('before', query.before);
  const search = parameters.toString();
  return getJson<NotificationPage>(`/api/notifications${search ? `?${search}` : ''}`, signal);
}

export async function fetchUnreadCount(signal?: AbortSignal): Promise<number> {
  return (await getJson<{ unreadCount: number }>('/api/notifications/unread-count', signal)).unreadCount;
}

export function markNotificationRead(
  id: string, signal?: AbortSignal,
): Promise<{ notification: NotificationItem; unreadCount: number }> {
  return postJson(`/api/notifications/${encodeURIComponent(id)}/read`, {}, signal);
}

export function markAllNotificationsRead(signal?: AbortSignal): Promise<{ updated: number; unreadCount: number }> {
  return postJson('/api/notifications/read-all', {}, signal);
}
