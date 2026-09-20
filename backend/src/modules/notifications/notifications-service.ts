import type { Pool } from 'pg';
import { encodeNotificationCursor, type NotificationListInput } from './list-input.js';

export interface NotificationsDependencies {
  pool: Pick<Pool, 'query'>;
}

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
  nextCursor: string | null;
}

export class NotificationNotFoundError extends Error {
  readonly code = 'NOTIFICATION_NOT_FOUND';

  constructor() {
    super('The notification was not found.');
    this.name = 'NotificationNotFoundError';
  }
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  eventRequestId: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
  cursorCreatedAt?: string;
}

const columns = `id, type, title, message, event_request_id AS "eventRequestId",
  read_at AS "readAt", created_at AS "createdAt"`;

function toItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    eventRequestId: row.eventRequestId,
    readAt: row.readAt === null ? null : new Date(row.readAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/** Every query is scoped to the verified recipient; ids of other users' rows never match. */
export async function countUnreadNotifications(
  { pool }: NotificationsDependencies,
  recipientId: string,
): Promise<number> {
  const result = await pool.query<{ unread: number }>(
    'SELECT count(*)::int AS unread FROM notifications WHERE recipient_id = $1 AND read_at IS NULL',
    [recipientId],
  );
  return result.rows[0]?.unread ?? 0;
}

/** Newest first with keyset pagination on (created_at, id). */
export async function listNotifications(
  dependencies: NotificationsDependencies,
  recipientId: string,
  input: NotificationListInput,
): Promise<NotificationPage> {
  // One extra row tells whether another page exists without a second count query.
  const result = await dependencies.pool.query<NotificationRow>(`
    SELECT ${columns},
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursorCreatedAt"
    FROM notifications
    WHERE recipient_id = $1
      AND ($2::boolean IS FALSE OR read_at IS NULL)
      AND ($3::timestamptz IS NULL OR (created_at, id) < ($3::timestamptz, $4::uuid))
    ORDER BY created_at DESC, id DESC
    LIMIT $5
  `, [recipientId, input.unreadOnly, input.before?.createdAt ?? null, input.before?.id ?? null, input.limit + 1]);

  const rows = result.rows.slice(0, input.limit);
  const last = rows.at(-1);
  const hasMore = result.rows.length > input.limit;
  return {
    items: rows.map(toItem),
    unreadCount: await countUnreadNotifications(dependencies, recipientId),
    nextCursor: hasMore && last?.cursorCreatedAt
      ? encodeNotificationCursor({ createdAt: last.cursorCreatedAt, id: last.id })
      : null,
  };
}

/** Idempotent: a notification that is already read keeps its original read time. */
export async function markNotificationRead(
  dependencies: NotificationsDependencies,
  recipientId: string,
  notificationId: string,
): Promise<{ notification: NotificationItem; unreadCount: number }> {
  const result = await dependencies.pool.query<NotificationRow>(`
    UPDATE notifications SET read_at = COALESCE(read_at, now())
    WHERE id = $1 AND recipient_id = $2 RETURNING ${columns}
  `, [notificationId, recipientId]);
  const row = result.rows[0];
  // Another user's notification is indistinguishable from a missing one.
  if (!row) throw new NotificationNotFoundError();
  return { notification: toItem(row), unreadCount: await countUnreadNotifications(dependencies, recipientId) };
}

export async function markAllNotificationsRead(
  dependencies: NotificationsDependencies,
  recipientId: string,
): Promise<{ updated: number; unreadCount: number }> {
  const result = await dependencies.pool.query(
    'UPDATE notifications SET read_at = now() WHERE recipient_id = $1 AND read_at IS NULL',
    [recipientId],
  );
  return {
    updated: result.rowCount ?? 0,
    unreadCount: await countUnreadNotifications(dependencies, recipientId),
  };
}
