import type { Pool, PoolClient } from 'pg';

export interface NotificationInput {
  /** app_users.id of the recipient, never the Supabase Auth UUID. */
  recipientId: string;
  eventRequestId?: string | null;
  /** Stable machine-readable kind, for example VENUE_BOOKING_APPROVED. */
  type: string;
  title: string;
  message: string;
}

/**
 * Record in-app notifications. Pass the caller's transaction client so a notification is
 * saved only when the action it describes commits. Recipients are de-duplicated and the
 * acting user can be excluded by leaving them out of the list.
 */
export async function notify(
  database: Pick<Pool | PoolClient, 'query'>,
  notifications: NotificationInput | readonly NotificationInput[],
): Promise<void> {
  const items = Array.isArray(notifications) ? notifications : [notifications as NotificationInput];
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.recipientId}:${item.type}:${item.eventRequestId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await database.query(
      `INSERT INTO notifications (recipient_id, event_request_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [item.recipientId, item.eventRequestId ?? null, item.type, item.title, item.message],
    );
  }
}
