import type { UserRole } from '../auth/types.js';
import {
  iso, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';

/**
 * KAN-51 venue availability calendar. The 21 September team decision fixes who may read it;
 * the rest are PROVISIONAL team rules (Q-06, Q-07 and S2-Q03 are open), recorded in the
 * 3 October decision log entry:
 * - only Event Coordinators, Venue Staff and Technical Support Staff may read the calendar;
 * - a confirmed booking is an APPROVED venue_bookings row. PENDING, REJECTED and CANCELLED rows
 *   do not hold the venue, matching the venue_bookings_conflict trigger in migration 004;
 * - every venue_unavailability row is a recorded period of operational unavailability;
 * - intervals are half-open [startsAt, endsAt), so a period ending exactly at `from` or starting
 *   exactly at `to` lies outside the window; periods are returned whole, not clipped;
 * - only active venues are listed, because a retired venue cannot be requested;
 * - a booking names its event only to that event's assigned coordinator, who can already open
 *   the request; every other reader sees an anonymous booking until S2-Q03 settles the labels.
 */
export const VENUE_CALENDAR_ROLES = [
  'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF',
] as const satisfies readonly UserRole[];

/** Bounds a single read; the calendar page asks for one week at a time. */
export const MAX_WINDOW_DAYS = 31;

export interface AvailabilityWindow {
  from: string;
  to: string;
}

export interface BookedPeriod {
  id: string;
  kind: 'BOOKING';
  startsAt: string;
  endsAt: string;
  /** Only for the event's currently assigned coordinator; null for every other reader. */
  event: { id: string; name: string | null } | null;
}

export interface BlockedPeriod {
  id: string;
  kind: 'BLOCKED';
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export type UnavailablePeriod = BookedPeriod | BlockedPeriod;

export interface VenueAvailability {
  id: string;
  name: string;
  location: string | null;
  capacity: number;
  /** Daily opening hours in Asia/Singapore as HH:MM; null means unrestricted. */
  opensAt: string | null;
  closesAt: string | null;
  /** KAN-77: setup and turnaround minutes; periods below stay event-only until KAN-78. */
  setupMinutes: number;
  turnaroundMinutes: number;
  /** Confirmed bookings and blocked periods overlapping the window, earliest first. */
  unavailable: UnavailablePeriod[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
// An explicit offset keeps the window independent of the server's own time zone.
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function invalidWindow(message: string): WorkflowError {
  return new WorkflowError('INVALID_INPUT', 'INVALID_AVAILABILITY_WINDOW', message);
}

function instant(query: Record<string, unknown>, key: 'from' | 'to'): number {
  const value = query[key];
  const match = typeof value === 'string' ? ISO_DATE_TIME.exec(value) : null;
  if (!match) throw invalidWindow(`${key} must be one ISO 8601 date-time with a time zone offset.`);
  const [year, month, day] = match.slice(1, 4).map(Number) as [number, number, number];
  // Date.parse rolls impossible dates such as 30 February forward instead of rejecting them.
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  const parsed = Date.parse(value as string);
  if (calendarDay.getUTCMonth() !== month - 1 || calendarDay.getUTCDate() !== day || Number.isNaN(parsed)) {
    throw invalidWindow(`${key} must be a valid date-time.`);
  }
  return parsed;
}

/** Validate the GET query string; throws INVALID_INPUT (400) for anything malformed. */
export function parseAvailabilityWindow(query: Record<string, unknown>): AvailabilityWindow {
  const from = instant(query, 'from');
  const to = instant(query, 'to');
  if (to <= from) throw invalidWindow('to must be after from.');
  if (to - from > MAX_WINDOW_DAYS * DAY_MS) {
    throw invalidWindow(`The window may span at most ${MAX_WINDOW_DAYS} days.`);
  }
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}

// One statement, so the venue list and every venue's periods come from the same snapshot.
const AVAILABILITY_SQL = `
  SELECT v.id, v.name, v.location, v.capacity,
         to_char(v.opens_at, 'HH24:MI') AS "opensAt",
         to_char(v.closes_at, 'HH24:MI') AS "closesAt",
         v.setup_minutes AS "setupMinutes", v.turnaround_minutes AS "turnaroundMinutes",
         COALESCE((
           SELECT json_agg(p ORDER BY p."startsAt", p.kind, p.id)
           FROM (
             SELECT b.id, 'BOOKING' AS kind, b.starts_at AS "startsAt", b.ends_at AS "endsAt",
                    NULL::text AS reason,
                    CASE WHEN $3::text = 'EVENT_COORDINATOR' AND e.coordinator_id = $4::uuid
                           AND e.status <> 'DRAFT'
                         THEN json_build_object('id', e.id, 'name', e.name) END AS event
             FROM venue_bookings b
             JOIN event_requests e ON e.id = b.event_request_id
             WHERE b.venue_id = v.id AND b.status = 'APPROVED'
               AND b.starts_at < $2::timestamptz AND b.ends_at > $1::timestamptz
             UNION ALL
             SELECT u.id, 'BLOCKED', u.starts_at, u.ends_at, u.reason, NULL::json
             FROM venue_unavailability u
             WHERE u.venue_id = v.id
               AND u.starts_at < $2::timestamptz AND u.ends_at > $1::timestamptz
           ) p
         ), '[]'::json) AS unavailable
  FROM venues v
  WHERE v.is_active
  ORDER BY lower(v.name), v.id`;

interface PeriodRow {
  id: string;
  kind: 'BOOKING' | 'BLOCKED';
  // json_agg renders timestamps in the session time zone; they are normalised below.
  startsAt: string;
  endsAt: string;
  reason: string | null;
  event: BookedPeriod['event'];
}

type VenueRow = Omit<VenueAvailability, 'unavailable'> & { unavailable: PeriodRow[] };

function requireCalendarRole(actor: WorkflowActor): void {
  if (!(VENUE_CALENDAR_ROLES as readonly UserRole[]).includes(actor.role)) {
    throw new WorkflowError(
      'FORBIDDEN', 'VENUE_AVAILABILITY_FORBIDDEN',
      'Only event coordinators, venue staff and technical support staff can view venue availability.',
    );
  }
}

function toPeriod(row: PeriodRow): UnavailablePeriod {
  const period = { id: row.id, startsAt: iso(row.startsAt), endsAt: iso(row.endsAt) };
  return row.kind === 'BOOKING'
    ? { ...period, kind: 'BOOKING', event: row.event }
    : { ...period, kind: 'BLOCKED', reason: row.reason };
}

/** Every active venue with the confirmed bookings and blocked periods overlapping the window. */
export async function listVenueAvailability(
  { pool }: WorkflowDependencies,
  actor: WorkflowActor,
  window: AvailabilityWindow,
): Promise<VenueAvailability[]> {
  requireCalendarRole(actor);
  const found = await pool.query<VenueRow>(AVAILABILITY_SQL, [window.from, window.to, actor.role, actor.id]);
  return found.rows.map(({ unavailable, ...venue }) => ({
    ...venue,
    unavailable: unavailable.map(toPeriod),
  }));
}
