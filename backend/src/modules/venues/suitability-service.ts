import { effectiveBookingStatusSql, occupyingBookingSql } from './occupancy.js';
import { createHash } from 'node:crypto';
import type { VenueBookingStatus } from './booking-service.js';
import {
  requestNotFound, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { parseSuitabilityBookingId, parseVenueSuitabilityInput, requirementKey } from './suitability-input.js';
import {
  assessVenueSuitability, type SuitabilityAssessment, type SuitabilityEvent, type SuitabilityVenue,
} from './suitability-rules.js';

export interface SuitabilityContext {
  event: SuitabilityEvent;
  arrangement?: SuitabilityArrangement;
  requirementsVersion: string;
  venues: SuitabilityVenue[];
}

export interface SuitabilityArrangement {
  id: string;
  venueId: string;
  startsAt: string | null;
  endsAt: string | null;
  layout: string | null;
  notes: string | null;
  status: VenueBookingStatus;
}

type EventRow = Omit<SuitabilityEvent, 'startsAt' | 'endsAt'> & {
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  eventStatus: string;
};

type SourceRow = EventRow & {
  arrangement: SuitabilityArrangement | null;
  holdExpiresAt: Date | string | null;
};

const eventColumns = `e.id, e.name, e.starts_at AS "startsAt", e.ends_at AS "endsAt",
  e.expected_attendance AS "expectedAttendance", e.venue_requirements AS "venueRequirements",
  e.accessibility_needs AS "accessibilityNeeds", e.status AS "eventStatus"`;
const arrangementColumns = `CASE WHEN selected.id IS NULL THEN NULL ELSE jsonb_build_object(
  'id', selected.id, 'venueId', selected.venue_id, 'startsAt', selected.starts_at,
  'endsAt', selected.ends_at, 'layout', selected.layout, 'notes', selected.notes,
  'status', ${effectiveBookingStatusSql('selected')}) END AS arrangement,
  selected.hold_expires_at AS "holdExpiresAt"`;
const venueJson = `jsonb_build_object(
  'id', v.id, 'name', v.name, 'capacity', v.capacity, 'facilities', v.facilities,
  'accessibilityFeatures', v.accessibility_features, 'layouts', v.layouts,
  'wheelchairAccessible', v.wheelchair_accessible,
  'opensAt', v.opens_at::text, 'closesAt', v.closes_at::text,
  'setupMinutes', v.setup_minutes, 'turnaroundMinutes', v.turnaround_minutes)`;

function requireCoordinator(actor: WorkflowActor): void {
  if (actor.role !== 'EVENT_COORDINATOR') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN',
      'Only the assigned Event Coordinator can check venue suitability.');
  }
}

function nullableIso(value: Date | string | null): string | null {
  if (value === null) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function eventFromRow(row: EventRow): SuitabilityEvent {
  return {
    id: row.id, name: row.name, startsAt: nullableIso(row.startsAt), endsAt: nullableIso(row.endsAt),
    expectedAttendance: row.expectedAttendance, venueRequirements: row.venueRequirements,
    accessibilityNeeds: row.accessibilityNeeds,
  };
}

/** Dashboard edits do not necessarily update updated_at, so hash the actual source values. */
export function suitabilityRequirementsVersion(
  event: SuitabilityEvent, arrangement?: SuitabilityArrangement,
  state?: { eventStatus: string; holdExpiresAt: string | null },
): string {
  return createHash('sha256').update(JSON.stringify(arrangement ? { event, arrangement, state } : event)).digest('hex');
}

function contextChanged(): WorkflowError {
  return new WorkflowError('CONFLICT', 'SUITABILITY_CONTEXT_CHANGED',
    'The event requirements or selected arrangement have changed. Refresh them and confirm your interpretation again.');
}

function arrangementFromRow(row: SourceRow, bookingId: string | undefined): SuitabilityArrangement | undefined {
  if (!bookingId) return undefined;
  if (!row.arrangement) throw new WorkflowError('NOT_FOUND', 'VENUE_BOOKING_NOT_FOUND', 'The venue arrangement was not found.');
  if (['CANCELLED', 'REJECTED'].includes(row.arrangement.status)
    || ['CANCELLED', 'REJECTED', 'COMPLETED'].includes(row.eventStatus)) throw contextChanged();
  return { ...row.arrangement, startsAt: nullableIso(row.arrangement.startsAt), endsAt: nullableIso(row.arrangement.endsAt) };
}

function sourceVersion(row: SourceRow, event: SuitabilityEvent, arrangement: SuitabilityArrangement | undefined): string {
  return suitabilityRequirementsVersion(event, arrangement,
    { eventStatus: row.eventStatus, holdExpiresAt: nullableIso(row.holdExpiresAt) });
}

/** One statement keeps the authorised event and active catalogue in the same read snapshot. */
export async function getVenueSuitabilityContext(
  { pool }: WorkflowDependencies, { actor, eventId, bookingId: suppliedBookingId }:
    { actor: WorkflowActor; eventId: string; bookingId?: string },
): Promise<SuitabilityContext> {
  requireCoordinator(actor);
  const bookingId = parseSuitabilityBookingId(suppliedBookingId);
  const found = await pool.query<SourceRow & { venues: SuitabilityVenue[] }>(`SELECT ${eventColumns}, ${arrangementColumns},
    (SELECT COALESCE(jsonb_agg(${venueJson} ORDER BY lower(v.name), v.id), '[]'::jsonb)
      FROM venues v WHERE v.is_active OR v.id = selected.venue_id) AS venues
    FROM event_requests e
    LEFT JOIN venue_bookings selected ON selected.id = $3 AND selected.event_request_id = e.id
    WHERE e.id = $1 AND e.coordinator_id = $2 AND e.status <> 'DRAFT'`,
  [eventId, actor.id, bookingId ?? null]);
  const row = found.rows[0];
  if (!row) throw requestNotFound();
  const event = eventFromRow(row);
  const arrangement = arrangementFromRow(row, bookingId);
  return { event, ...(arrangement ? { arrangement } : {}),
    requirementsVersion: sourceVersion(row, event, arrangement), venues: row.venues };
}

/**
 * Read-only POST: recompute using current event/venue/conflict data in one SQL snapshot.
 * There are no row locks or writes: passing the check never reserves a venue.
 */
export async function checkVenueSuitability(
  { pool }: WorkflowDependencies,
  { actor, eventId, input }: { actor: WorkflowActor; eventId: string; input: unknown },
): Promise<SuitabilityAssessment> {
  requireCoordinator(actor);
  const requirements = parseVenueSuitabilityInput(input);
  const startsAt = 'CASE WHEN selected.id IS NULL THEN e.starts_at ELSE selected.starts_at END';
  const endsAt = 'CASE WHEN selected.id IS NULL THEN e.ends_at ELSE selected.ends_at END';
  const found = await pool.query<SourceRow & {
    venue: (SuitabilityVenue & { isActive: boolean }) | null; booked: boolean; blocked: boolean;
  }>(`SELECT ${eventColumns}, ${arrangementColumns},
    CASE WHEN v.id IS NULL THEN NULL ELSE ${venueJson} || jsonb_build_object('isActive', v.is_active) END AS venue,
    EXISTS(SELECT 1 FROM venue_booking_intervals b WHERE b.venue_id = v.id AND ${occupyingBookingSql('b')}
      AND b.id IS DISTINCT FROM selected.id
      AND b.occupied_starts_at < venue_occupied_end(${endsAt}, v.turnaround_minutes)
      AND b.occupied_ends_at > venue_occupied_start(${startsAt}, v.setup_minutes)) AS booked,
    EXISTS(SELECT 1 FROM venue_unavailability u WHERE u.venue_id = v.id
      AND u.starts_at < venue_occupied_end(${endsAt}, v.turnaround_minutes)
      AND u.ends_at > venue_occupied_start(${startsAt}, v.setup_minutes)) AS blocked
    FROM event_requests e
    LEFT JOIN venue_bookings selected ON selected.id = $4 AND selected.event_request_id = e.id
    LEFT JOIN venues v ON v.id = $2
    WHERE e.id = $1 AND e.coordinator_id = $3 AND e.status <> 'DRAFT'`,
  [eventId, requirements.venueId, actor.id, requirements.bookingId ?? null]);
  const row = found.rows[0];
  if (!row) throw requestNotFound();
  const event = eventFromRow(row);
  const arrangement = arrangementFromRow(row, requirements.bookingId);
  if (sourceVersion(row, event, arrangement) !== requirements.requirementsVersion
    || (arrangement && (arrangement.venueId !== requirements.venueId
      || requirementKey(arrangement.layout ?? '') !== requirementKey(requirements.layout ?? '')))) {
    throw contextChanged();
  }
  if (!row.venue) throw new WorkflowError('NOT_FOUND', 'VENUE_NOT_FOUND', 'The venue was not found.');
  const assessment = assessVenueSuitability(
    arrangement ? { ...event, startsAt: arrangement.startsAt, endsAt: arrangement.endsAt } : event,
    row.venue, arrangement ? { ...requirements, layout: arrangement.layout } : requirements,
    { booked: row.booked, blocked: row.blocked }, new Date().toISOString());
  return { ...assessment, ...(arrangement ? { bookingId: arrangement.id } : {}) };
}
