import type { Pool, PoolClient } from 'pg';
import type { EventStatus } from '../events/types.js';
import { toIso } from './transaction.js';
import type { Interval, VenueActor } from './types.js';

export interface EventForVenue {
  id: string;
  organiserId: string;
  coordinatorId: string | null;
  status: EventStatus;
  name: string | null;
  startsAt: string | null;
  endsAt: string | null;
  expectedAttendance: number | null;
  accessibilityNeeds: string | null;
}

/** Owner organiser or currently assigned coordinator; role alone never grants access. */
export function canArrangeVenueFor(
  actor: VenueActor, event: Pick<EventForVenue, 'organiserId' | 'coordinatorId'>,
): boolean {
  return (actor.role === 'EVENT_ORGANISER' && event.organiserId === actor.id)
    || (actor.role === 'EVENT_COORDINATOR' && event.coordinatorId === actor.id);
}

interface EventRow extends Omit<EventForVenue, 'startsAt' | 'endsAt'> {
  startsAt: Date | null;
  endsAt: Date | null;
}

/** Returns null for a missing event and for one the actor may not arrange, so callers mask both as 404. */
export async function loadArrangeableEvent(
  database: Pick<Pool | PoolClient, 'query'>,
  actor: VenueActor,
  eventRequestId: string,
  lock = false,
): Promise<EventForVenue | null> {
  const result = await database.query<EventRow>(`
    SELECT id, organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status, name,
      starts_at AS "startsAt", ends_at AS "endsAt",
      expected_attendance AS "expectedAttendance", accessibility_needs AS "accessibilityNeeds"
    FROM event_requests WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}
  `, [eventRequestId]);
  const row = result.rows[0];
  if (!row || !canArrangeVenueFor(actor, row)) return null;
  return { ...row, startsAt: toIso(row.startsAt), endsAt: toIso(row.endsAt) };
}

export type BusyKind = 'BOOKING' | 'BLOCKED';

/** Approved bookings and blocked periods overlapping the half-open interval. */
export async function loadBusyIntervals(
  database: Pick<Pool | PoolClient, 'query'>,
  venueId: string,
  interval: Interval,
  excludeBookingId: string | null = null,
): Promise<Array<Interval & { kind: BusyKind }>> {
  const result = await database.query<{ kind: BusyKind; startsAt: Date; endsAt: Date }>(`
    SELECT 'BOOKING' AS kind, starts_at AS "startsAt", ends_at AS "endsAt" FROM venue_bookings
    WHERE venue_id = $1 AND status = 'APPROVED' AND starts_at < $3 AND ends_at > $2
      AND ($4::uuid IS NULL OR id <> $4::uuid)
    UNION ALL
    SELECT 'BLOCKED' AS kind, starts_at AS "startsAt", ends_at AS "endsAt" FROM venue_unavailability
    WHERE venue_id = $1 AND starts_at < $3 AND ends_at > $2
    ORDER BY "startsAt", "endsAt"
  `, [venueId, interval.startsAt, interval.endsAt, excludeBookingId]);
  return result.rows.map((row) => ({
    kind: row.kind, startsAt: toIso(row.startsAt), endsAt: toIso(row.endsAt),
  }));
}
