import {
  iso, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';

/**
 * Coordinator venue search over the existing public.venues table (no other tables).
 *
 * Rules:
 * - only Event Coordinators may search (the route also enforces this; checked again here);
 * - only active venues are searched, always read live from the table;
 * - a venue must satisfy EVERY applied filter; filters left empty are ignored;
 * - attendance and capacity are both minimum-capacity requirements: venues.capacity must be at
 *   least the larger of the two;
 * - layout: the chosen layout must be in venues.layouts;
 * - facilities / accessibility: the venue must have ALL selected values (array containment);
 * - wheelchair accessible: venues.wheelchair_accessible must be true;
 * - date/time (both checks apply):
 *   1. the event's start and end time of day (Singapore time) must fall within the venue's
 *      opens_at / closes_at (a venue with no opening hours is not restricted);
 *   2. the venue must have no APPROVED venue_bookings row overlapping the event's time range.
 *      Overlap is half-open, so a booking ending exactly when the event starts does not conflict.
 * - an empty result is a normal answer, never an error, and changes no event request.
 */

export interface VenueSearchFilters {
  startsAt: string | null;
  endsAt: string | null;
  attendance: number | null;
  capacity: number | null;
  location: string | null;
  layout: string | null;
  wheelchairAccessible: boolean;
  accessibility: string[];
  facilities: string[];
}

export interface VenueResult {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  layouts: string[];
  facilities: string[];
  accessibilityFeatures: string[];
  wheelchairAccessible: boolean;
  opensAt: string | null;
  closesAt: string | null;
  updatedAt: string;
}

export interface VenueFilterOptions {
  layouts: string[];
  facilities: string[];
  accessibility: string[];
}

const VENUE_TIME_ZONE = 'Asia/Singapore';
/**
 * Only APPROVED bookings make a venue unavailable. This matches the database's
 * venue_bookings_conflict trigger, which only guards APPROVED rows, so PENDING requests
 * can overlap and do not hold the venue.
 */
const BLOCKING_BOOKING_STATUS = 'APPROVED';
const MAX_COUNT = 2_147_483_647;
const MAX_TEXT_LENGTH = 100;
const MAX_LIST_ITEMS = 30;

function invalid(message: string): WorkflowError {
  return new WorkflowError('INVALID_INPUT', 'INVALID_VENUE_SEARCH', message);
}

function requireCoordinator(actor: WorkflowActor): void {
  if (actor.role !== 'EVENT_COORDINATOR') {
    throw new WorkflowError('FORBIDDEN', 'VENUE_SEARCH_FORBIDDEN', 'Only event coordinators can search venues.');
  }
}

/** A single query value; empty strings count as "not supplied" so cleared filters just work. */
function text(query: Record<string, unknown>, key: string): string | null {
  const value = query[key];
  if (value === undefined) return null;
  if (typeof value !== 'string') throw invalid(`${key} must be a single value.`);
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) throw invalid(`${key} must be at most ${MAX_TEXT_LENGTH} characters.`);
  return trimmed === '' ? null : trimmed;
}

function count(query: Record<string, unknown>, key: string): number | null {
  const value = text(query, key);
  if (value === null) return null;
  const parsed = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_COUNT) {
    throw invalid(`${key} must be a whole number of at least 1.`);
  }
  return parsed;
}

function dateTime(query: Record<string, unknown>, key: string): string | null {
  const value = text(query, key);
  if (value === null) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw invalid(`${key} must be an ISO 8601 date-time.`);
  return new Date(parsed).toISOString();
}

function flag(query: Record<string, unknown>, key: string): boolean {
  const value = text(query, key);
  if (value === null || value === 'false') return false;
  if (value === 'true') return true;
  throw invalid(`${key} must be true or false.`);
}

/** Repeated parameters (?facilities=A&facilities=B); values may contain commas or spaces. */
function list(query: Record<string, unknown>, key: string): string[] {
  const value = query[key];
  if (value === undefined) return [];
  const items = (Array.isArray(value) ? value : [value]).map((entry) => {
    if (typeof entry !== 'string') throw invalid(`${key} must be a list of text values.`);
    return entry.trim();
  }).filter((entry) => entry !== '');
  const unique = [...new Set(items)];
  if (unique.length > MAX_LIST_ITEMS) throw invalid(`${key} has too many values.`);
  if (unique.some((entry) => entry.length > MAX_TEXT_LENGTH)) {
    throw invalid(`${key} values must be at most ${MAX_TEXT_LENGTH} characters.`);
  }
  return unique;
}

/** Validate the GET query string; throws INVALID_INPUT (400) for anything malformed. */
export function parseVenueSearchQuery(query: Record<string, unknown>): VenueSearchFilters {
  const startsAt = dateTime(query, 'startsAt');
  const endsAt = dateTime(query, 'endsAt');
  if ((startsAt === null) !== (endsAt === null)) {
    throw invalid('Provide both a start and an end time, or neither.');
  }
  if (startsAt !== null && endsAt !== null && Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw invalid('The end time must be after the start time.');
  }

  return {
    startsAt,
    endsAt,
    attendance: count(query, 'attendance'),
    capacity: count(query, 'capacity'),
    location: text(query, 'location'),
    layout: text(query, 'layout'),
    wheelchairAccessible: flag(query, 'wheelchairAccessible'),
    accessibility: list(query, 'accessibility'),
    facilities: list(query, 'facilities'),
  };
}

const SEARCH_SQL = `
  SELECT v.id, v.name, v.description, v.location, v.capacity,
         v.layouts, v.facilities, v.accessibility_features AS "accessibilityFeatures",
         v.wheelchair_accessible AS "wheelchairAccessible",
         to_char(v.opens_at, 'HH24:MI') AS "opensAt",
         to_char(v.closes_at, 'HH24:MI') AS "closesAt",
         v.updated_at AS "updatedAt"
  FROM public.venues v
  WHERE v.is_active
    AND v.capacity >= $1::int
    AND ($2::text IS NULL
         OR position(lower($2::text) in lower(concat_ws(' ', v.name, v.location))) > 0)
    AND ($3::text IS NULL OR $3::text = ANY(v.layouts))
    AND v.facilities @> $4::text[]
    AND v.accessibility_features @> $5::text[]
    AND (NOT $6::boolean OR v.wheelchair_accessible)
    AND ($7::timestamptz IS NULL OR (
          (v.opens_at IS NULL
            OR ($7::timestamptz AT TIME ZONE '${VENUE_TIME_ZONE}')::time >= v.opens_at)
      AND (v.closes_at IS NULL
            OR ($8::timestamptz AT TIME ZONE '${VENUE_TIME_ZONE}')::time <= v.closes_at)))
    AND ($7::timestamptz IS NULL OR NOT EXISTS (
          SELECT 1 FROM public.venue_bookings b
          WHERE b.venue_id = v.id
            AND b.status = '${BLOCKING_BOOKING_STATUS}'
            AND b.starts_at < $8::timestamptz
            AND b.ends_at > $7::timestamptz))
  ORDER BY lower(v.name), v.id`;

type VenueRow = Omit<VenueResult, 'updatedAt'> & { updatedAt: Date };

export async function searchVenues(
  { pool }: WorkflowDependencies,
  actor: WorkflowActor,
  filters: VenueSearchFilters,
): Promise<VenueResult[]> {
  requireCoordinator(actor);
  const minimumPeople = Math.max(filters.attendance ?? 0, filters.capacity ?? 0);
  const found = await pool.query<VenueRow>(SEARCH_SQL, [
    minimumPeople,
    filters.location,
    filters.layout,
    filters.facilities,
    filters.accessibility,
    filters.wheelchairAccessible,
    filters.startsAt,
    filters.endsAt,
  ]);
  return found.rows.map((row) => ({ ...row, updatedAt: iso(row.updatedAt) }));
}

/** The layouts, facilities and accessibility features that exist on active venues right now. */
export async function listVenueFilterOptions(
  { pool }: WorkflowDependencies,
  actor: WorkflowActor,
): Promise<VenueFilterOptions> {
  requireCoordinator(actor);
  const distinct = (column: 'layouts' | 'facilities' | 'accessibility_features') =>
    pool.query<{ value: string }>(
      `SELECT DISTINCT item AS value
       FROM public.venues v, unnest(v.${column}) AS item
       WHERE v.is_active AND trim(item) <> ''
       ORDER BY 1`,
    );
  const [layouts, facilities, accessibility] = await Promise.all([
    distinct('layouts'),
    distinct('facilities'),
    distinct('accessibility_features'),
  ]);
  return {
    layouts: layouts.rows.map((row) => row.value),
    facilities: facilities.rows.map((row) => row.value),
    accessibility: accessibility.rows.map((row) => row.value),
  };
}