import { occupyingBookingSql } from './occupancy.js';
import {
  iso, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import { intervalWithinVenueHours } from './suitability-rules.js';

/**
 * Coordinator venue search over the venue catalogue, bookings and operational blocks.
 *
 * Rules:
 * - only Event Coordinators may search (the route also enforces this; checked again here);
 * - only active venues are searched, always read live from the database;
 * - a venue must satisfy EVERY applied filter; filters left empty are ignored;
 * - attendance and capacity are both minimum-capacity requirements: venues.capacity must be at
 *   least the larger of the two;
 * - layout: the chosen layout must be in venues.layouts;
 * - facilities / accessibility: the venue must have ALL selected values (array containment);
 * - wheelchair accessible: venues.wheelchair_accessible must be true;
 * - date/time: the event occupies the venue continuously from start to end, so BOTH must hold:
 *   1. opening hours (see isOpenForRange): the whole interval must be within daily Singapore
 *      opening hours; overnight/multi-day events need a venue with no closed period;
 *   2. no APPROVED booking or operational block overlaps the event (half-open: adjacency is fine).
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
  /** KAN-77: venue setup and turnaround minutes; KAN-78 applies them to occupancy. */
  setupMinutes: number;
  turnaroundMinutes: number;
  occupiedStartsAt?: string | null;
  occupiedEndsAt?: string | null;
  updatedAt: string;
}

export interface VenueFilterOptions {
  layouts: string[];
  facilities: string[];
  accessibility: string[];
}

/**
 * APPROVED bookings and, since KAN-83, live holds make a venue unavailable (occupancy.ts). This
 * matches the venue_bookings_conflict trigger, so PENDING requests can overlap and do not hold
 * the venue.
 */
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

/**
 * Whether a venue's opening hours can host an event running continuously from startsAt to endsAt.
 * Shares KAN-52's whole-interval check, including exclusive midnight ends and second precision.
 * Missing bounds mean midnight/day-end; an unrestricted or explicit 24-hour venue is always open.
 * Invalid hours or event timing do not produce a match.
 */
export function isOpenForRange(
  hours: { opensAt: string | null; closesAt: string | null },
  startsAt: string,
  endsAt: string,
): boolean {
  return intervalWithinVenueHours(startsAt, endsAt, hours.opensAt, hours.closesAt) === true;
}

const SEARCH_SQL = `
  SELECT v.setup_minutes AS "setupMinutes", v.turnaround_minutes AS "turnaroundMinutes",
         venue_occupied_start($7::timestamptz, v.setup_minutes) AS "occupiedStartsAt",
         venue_occupied_end($8::timestamptz, v.turnaround_minutes) AS "occupiedEndsAt", v.id, v.name, v.description, v.location, v.capacity,
         v.layouts, v.facilities, v.accessibility_features AS "accessibilityFeatures",
         v.wheelchair_accessible AS "wheelchairAccessible",
         to_char(v.opens_at, 'HH24:MI') AS "opensAt",
         to_char(v.closes_at, 'HH24:MI') AS "closesAt",
         v.opens_at::text AS "openingStartsAt", v.closes_at::text AS "openingEndsAt",
         v.setup_minutes AS "setupMinutes", v.turnaround_minutes AS "turnaroundMinutes",
         v.updated_at AS "updatedAt"
  FROM venues v
  WHERE v.is_active
    AND v.capacity >= $1::int
    AND ($2::text IS NULL
         OR position(lower($2::text) in lower(concat_ws(' ', v.name, v.location))) > 0)
    AND ($3::text IS NULL OR $3::text = ANY(v.layouts))
    AND v.facilities @> $4::text[]
    AND v.accessibility_features @> $5::text[]
    AND (NOT $6::boolean OR v.wheelchair_accessible)
    AND ($7::timestamptz IS NULL OR NOT EXISTS (
          SELECT 1 FROM venue_booking_intervals b
          WHERE b.venue_id = v.id
            AND ${occupyingBookingSql('b')}
            AND b.occupied_starts_at < venue_occupied_end($8::timestamptz, v.turnaround_minutes)
            AND b.occupied_ends_at > venue_occupied_start($7::timestamptz, v.setup_minutes)))
    AND ($7::timestamptz IS NULL OR NOT EXISTS (
          SELECT 1 FROM venue_unavailability u
          WHERE u.venue_id = v.id
            AND u.starts_at < venue_occupied_end($8::timestamptz, v.turnaround_minutes)
            AND u.ends_at > venue_occupied_start($7::timestamptz, v.setup_minutes)))
    AND ($7::timestamptz IS NULL OR venue_interval_within_hours(
      venue_occupied_start($7::timestamptz, v.setup_minutes),
      venue_occupied_end($8::timestamptz, v.turnaround_minutes), v.opens_at, v.closes_at))
  ORDER BY lower(v.name), v.id`;

type VenueRow = Omit<VenueResult, 'updatedAt'> & {
  updatedAt: Date;
  openingStartsAt: string | null;
  openingEndsAt: string | null;
};

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
  let venues = found.rows;

  const { startsAt, endsAt } = filters;
  if (startsAt !== null && endsAt !== null) {
    venues = venues.filter((venue) => isOpenForRange({
      opensAt: venue.openingStartsAt, closesAt: venue.openingEndsAt,
    }, iso(venue.occupiedStartsAt ?? startsAt), iso(venue.occupiedEndsAt ?? endsAt)));
  }
  return venues.map(({ openingStartsAt: _opens, openingEndsAt: _closes, ...row }) => ({
    ...row, updatedAt: iso(row.updatedAt),
    ...(row.occupiedStartsAt ? { occupiedStartsAt: iso(row.occupiedStartsAt), occupiedEndsAt: iso(row.occupiedEndsAt!) } : {}),
  }));
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
       FROM venues v, unnest(v.${column}) AS item
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
