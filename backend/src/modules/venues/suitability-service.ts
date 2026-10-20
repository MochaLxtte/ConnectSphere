import { createHash } from 'node:crypto';
import {
  requestNotFound, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { parseVenueSuitabilityInput } from './suitability-input.js';
import {
  assessVenueSuitability, type SuitabilityAssessment, type SuitabilityEvent, type SuitabilityVenue,
} from './suitability-rules.js';

export interface SuitabilityContext {
  event: SuitabilityEvent;
  requirementsVersion: string;
  venues: SuitabilityVenue[];
}

type EventRow = Omit<SuitabilityEvent, 'startsAt' | 'endsAt'> & {
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

const eventColumns = `e.id, e.name, e.starts_at AS "startsAt", e.ends_at AS "endsAt",
  e.expected_attendance AS "expectedAttendance", e.venue_requirements AS "venueRequirements",
  e.accessibility_needs AS "accessibilityNeeds"`;
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
export function suitabilityRequirementsVersion(event: SuitabilityEvent): string {
  return createHash('sha256').update(JSON.stringify(event)).digest('hex');
}

/** One statement keeps the authorised event and active catalogue in the same read snapshot. */
export async function getVenueSuitabilityContext(
  { pool }: WorkflowDependencies, { actor, eventId }: { actor: WorkflowActor; eventId: string },
): Promise<SuitabilityContext> {
  requireCoordinator(actor);
  const found = await pool.query<EventRow & { venues: SuitabilityVenue[] }>(`SELECT ${eventColumns},
    (SELECT COALESCE(jsonb_agg(${venueJson} ORDER BY lower(v.name), v.id), '[]'::jsonb)
      FROM venues v WHERE v.is_active) AS venues
    FROM event_requests e WHERE e.id = $1 AND e.coordinator_id = $2 AND e.status <> 'DRAFT'`,
  [eventId, actor.id]);
  const row = found.rows[0];
  if (!row) throw requestNotFound();
  const event = eventFromRow(row);
  return { event, requirementsVersion: suitabilityRequirementsVersion(event), venues: row.venues };
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
  const found = await pool.query<EventRow & {
    venue: (SuitabilityVenue & { isActive: boolean }) | null; booked: boolean; blocked: boolean;
  }>(`SELECT ${eventColumns},
    CASE WHEN v.id IS NULL THEN NULL ELSE ${venueJson} || jsonb_build_object('isActive', v.is_active) END AS venue,
    EXISTS(SELECT 1 FROM venue_bookings b WHERE b.venue_id = v.id AND b.status = 'APPROVED'
      AND b.starts_at < e.ends_at AND b.ends_at > e.starts_at) AS booked,
    EXISTS(SELECT 1 FROM venue_unavailability u WHERE u.venue_id = v.id
      AND u.starts_at < e.ends_at AND u.ends_at > e.starts_at) AS blocked
    FROM event_requests e LEFT JOIN venues v ON v.id = $2
    WHERE e.id = $1 AND e.coordinator_id = $3 AND e.status <> 'DRAFT'`,
  [eventId, requirements.venueId, actor.id]);
  const row = found.rows[0];
  if (!row) throw requestNotFound();
  const event = eventFromRow(row);
  if (suitabilityRequirementsVersion(event) !== requirements.requirementsVersion) {
    throw new WorkflowError('CONFLICT', 'SUITABILITY_CONTEXT_CHANGED',
      'The event requirements have changed. Refresh them and confirm your interpretation again.');
  }
  if (!row.venue) throw new WorkflowError('NOT_FOUND', 'VENUE_NOT_FOUND', 'The venue was not found.');
  return assessVenueSuitability(event, row.venue, requirements,
    { booked: row.booked, blocked: row.blocked }, new Date().toISOString());
}
