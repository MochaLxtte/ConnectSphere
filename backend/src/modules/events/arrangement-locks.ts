import type { PoolClient } from 'pg';
import { WorkflowError } from './workflow-support.js';

type Reader = Pick<PoolClient, 'query'>;

/** KAN-62/KAN-15: follow venue writers' gate -> booking -> event order. */
export async function lockVenueBookingsBeforeEvent(client: Reader, eventRequestId: string): Promise<string[]> {
  const snapshot = await client.query<{ id: string; venueId: string }>(`SELECT id, venue_id AS "venueId"
    FROM venue_bookings WHERE event_request_id = $1 AND status IN ('PENDING', 'HELD', 'APPROVED')`,
  [eventRequestId]);
  const venueIds = [...new Set(snapshot.rows.map(row => row.venueId))].sort();
  const bookingIds = snapshot.rows.map(row => row.id).sort();
  if (bookingIds.length === 0) return [];
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended('connectsphere:venue:' || id::text, 0))
    FROM (SELECT unnest($1::uuid[]) AS id ORDER BY id) venues`, [venueIds]);
  const locked = await client.query<{ id: string }>(`SELECT id FROM venue_bookings
    WHERE event_request_id = $1 AND id = ANY($2::uuid[])
      AND status IN ('PENDING', 'HELD', 'APPROVED') ORDER BY id FOR UPDATE`, [eventRequestId, bookingIds]);
  return locked.rows.map(row => row.id);
}

/**
 * Call after locking the event. A booking created at another venue during the snapshot may not
 * be locked above. Refuse rather than acquire a new gate/booking after the event and invert the
 * shared order. Event-scoped booking writers cannot create another booking while this lock is held.
 */
export async function assertVenueBookingsLocked(
  client: Reader, eventRequestId: string, lockedBookingIds: readonly string[],
): Promise<void> {
  const current = await client.query<{ id: string }>(`SELECT id FROM venue_bookings
    WHERE event_request_id = $1 AND status IN ('PENDING', 'HELD', 'APPROVED')`, [eventRequestId]);
  const locked = new Set(lockedBookingIds);
  if (current.rows.some(row => !locked.has(row.id))) {
    throw new WorkflowError('CONFLICT', 'EVENT_ARRANGEMENTS_CHANGED',
      'This event gained a venue arrangement while the action was being prepared. Refresh and try again.');
  }
}
