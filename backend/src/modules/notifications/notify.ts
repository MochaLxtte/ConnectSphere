import type { PoolClient } from 'pg';

/** One notification for one recipient. Recipients are `app_users.id`, never a Supabase identity. */
export interface NotificationInput {
  recipientId: string;
  eventRequestId: string;
  venueBookingId?: string | null;
  equipmentRequestId?: string | null;
  /** Stable machine-readable kind, for example `REVIEW_APPROVED`. */
  type: string;
  title: string;
  message: string;
  /** Identifies this outcome for this recipient, so a retry cannot create a second notification. */
  dedupeKey: string;
}

/**
 * KAN-64-AC207: write notifications inside the caller's transaction, so they exist only if the
 * action they describe commits and vanish if it rolls back. A repeated outcome (same recipient and
 * `dedupeKey`) is ignored by the unique index rather than raising an error.
 * Returns how many rows were actually inserted.
 */
export async function recordNotifications(
  client: Pick<PoolClient, 'query'>,
  notifications: readonly NotificationInput[],
): Promise<number> {
  if (notifications.length === 0) return 0;
  const equipment = notifications.some(item => item.equipmentRequestId != null);
  const fieldCount = equipment ? 8 : 7;
  const values: unknown[] = [];
  const rows = notifications.map((item, index) => {
    values.push(item.recipientId, item.eventRequestId, item.venueBookingId ?? null,
      item.type, item.title, item.message, item.dedupeKey);
    if (equipment) values.push(item.equipmentRequestId ?? null);
    const first = index * fieldCount;
    return `(${Array.from({ length: fieldCount }, (_, field) => `$${first + field + 1}`).join(', ')})`;
  });
  const result = await client.query(
    `INSERT INTO notifications
       (recipient_id, event_request_id, venue_booking_id, type, title, message, dedupe_key${equipment ? ', equipment_request_id' : ''})
     VALUES ${rows.join(', ')}
     ON CONFLICT (recipient_id, dedupe_key) DO NOTHING`,
    values,
  );
  return result.rowCount ?? 0;
}
