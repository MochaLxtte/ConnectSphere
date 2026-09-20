import type { Pool, PoolClient } from 'pg';
import { databaseErrorInfo, eventNotFound, VenueRuleError, venueNotFound } from './errors.js';
import { loadArrangeableEvent, loadBusyIntervals } from './event-access.js';
import { assessVenueSuitability } from './suitability.js';
import { toIso, withTransaction } from './transaction.js';
import type { Interval, SuitabilityResult, VenueActor, VenueRecord } from './types.js';
import {
  assertOperatingHours, escapeLikePattern,
  type UnavailabilityInput, type VenueFields, type VenueFilters, type VenueUpdateInput,
} from './venue-input.js';

type Database = Pick<Pool | PoolClient, 'query'>;

interface VenueRow extends Omit<VenueRecord, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

const venueColumns = `
  v.id, v.name, v.description, v.location, v.capacity, v.layouts, v.facilities,
  v.accessibility_features AS "accessibilityFeatures",
  v.wheelchair_accessible AS "wheelchairAccessible",
  to_char(v.opens_at, 'HH24:MI') AS "opensAt", to_char(v.closes_at, 'HH24:MI') AS "closesAt",
  v.is_active AS "isActive", v.created_at AS "createdAt", v.updated_at AS "updatedAt"`;

function toVenue(row: VenueRow): VenueRecord {
  return { ...row, createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt) };
}

function nameTaken(error: unknown): boolean {
  const { code, constraint } = databaseErrorInfo(error);
  return code === '23505' && constraint === 'venues_name_unique';
}

const venueNameTaken = () =>
  new VenueRuleError('CONFLICT', 'VENUE_NAME_TAKEN', 'Another venue already uses this name.');

/** CF-08/CF-10: inactive venues are visible to VENUE_STAFF only. */
export async function listVenues(
  database: Database, actor: VenueActor, filters: VenueFilters,
): Promise<VenueRecord[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const add = (value: unknown) => { values.push(value); return `$${values.length}`; };

  if (actor.role !== 'VENUE_STAFF') conditions.push('v.is_active');
  if (filters.q !== null) {
    const pattern = add(`%${escapeLikePattern(filters.q)}%`);
    conditions.push(`(v.name ILIKE ${pattern} ESCAPE '\\'
      OR coalesce(v.location, '') ILIKE ${pattern} ESCAPE '\\'
      OR coalesce(v.description, '') ILIKE ${pattern} ESCAPE '\\')`);
  }
  if (filters.minCapacity !== null) conditions.push(`v.capacity >= ${add(filters.minCapacity)}`);
  if (filters.facilities.length) conditions.push(`v.facilities @> ${add(filters.facilities)}::text[]`);
  if (filters.accessibilityFeatures.length) {
    conditions.push(`v.accessibility_features @> ${add(filters.accessibilityFeatures)}::text[]`);
  }
  if (filters.wheelchairAccessible) conditions.push('v.wheelchair_accessible');
  if (filters.layout !== null) {
    conditions.push(`EXISTS (SELECT 1 FROM unnest(v.layouts) AS layout
      WHERE lower(layout) = lower(${add(filters.layout)}))`);
  }
  if (filters.available) {
    const from = add(filters.available.startsAt);
    const to = add(filters.available.endsAt);
    conditions.push(`NOT EXISTS (SELECT 1 FROM venue_bookings b WHERE b.venue_id = v.id
      AND b.status = 'APPROVED' AND b.starts_at < ${to}::timestamptz AND b.ends_at > ${from}::timestamptz)`);
    conditions.push(`NOT EXISTS (SELECT 1 FROM venue_unavailability u WHERE u.venue_id = v.id
      AND u.starts_at < ${to}::timestamptz AND u.ends_at > ${from}::timestamptz)`);
  }

  const result = await database.query<VenueRow>(`
    SELECT ${venueColumns} FROM venues v
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY lower(v.name), v.id
  `, values);
  return result.rows.map(toVenue);
}

/** A venue the actor may see; inactive venues are masked as missing for everyone but VENUE_STAFF. */
export async function getVenue(
  database: Database, actor: VenueActor, venueId: string, lock = false,
): Promise<VenueRecord> {
  const result = await database.query<VenueRow>(
    `SELECT ${venueColumns} FROM venues v WHERE v.id = $1 ${lock ? 'FOR UPDATE' : ''}`, [venueId],
  );
  const row = result.rows[0];
  if (!row || (!row.isActive && actor.role !== 'VENUE_STAFF')) throw venueNotFound();
  return toVenue(row);
}

export async function createVenue(database: Database, venue: VenueFields): Promise<VenueRecord> {
  try {
    const result = await database.query<VenueRow>(`
      INSERT INTO venues AS v (name, description, location, capacity, layouts, facilities,
        accessibility_features, wheelchair_accessible, opens_at, closes_at, is_active)
      VALUES ($1, $2, $3, $4, $5::text[], $6::text[], $7::text[], $8, $9::time, $10::time, $11)
      RETURNING ${venueColumns}
    `, [
      venue.name, venue.description, venue.location, venue.capacity, venue.layouts,
      venue.facilities, venue.accessibilityFeatures, venue.wheelchairAccessible,
      venue.opensAt, venue.closesAt, venue.isActive,
    ]);
    return toVenue(result.rows[0]!);
  } catch (error) {
    if (nameTaken(error)) throw venueNameTaken();
    throw error;
  }
}

/** Locks the venue so the merged operating hours are validated against the latest stored values. */
export async function updateVenue(
  pool: Pick<Pool, 'connect'>, actor: VenueActor, venueId: string, changes: VenueUpdateInput,
): Promise<VenueRecord> {
  try {
    return await withTransaction(pool, async (client) => {
      const current = await getVenue(client, actor, venueId, true);
      const merged = { ...current, ...changes };
      assertOperatingHours(merged.opensAt, merged.closesAt);
      const result = await client.query<VenueRow>(`
        UPDATE venues AS v SET name = $2, description = $3, location = $4, capacity = $5,
          layouts = $6::text[], facilities = $7::text[], accessibility_features = $8::text[],
          wheelchair_accessible = $9, opens_at = $10::time, closes_at = $11::time, is_active = $12,
          updated_at = now()
        WHERE v.id = $1 RETURNING ${venueColumns}
      `, [
        venueId, merged.name, merged.description, merged.location, merged.capacity, merged.layouts,
        merged.facilities, merged.accessibilityFeatures, merged.wheelchairAccessible,
        merged.opensAt, merged.closesAt, merged.isActive,
      ]);
      return toVenue(result.rows[0]!);
    });
  } catch (error) {
    if (nameTaken(error)) throw venueNameTaken();
    throw error;
  }
}

export interface BusyInterval extends Interval {
  kind: 'BOOKING' | 'BLOCKED';
  /** id, eventName and reason are present only for VENUE_STAFF and coordinators. */
  id?: string;
  eventName?: string | null;
  reason?: string | null;
}

export interface VenueAvailability {
  venueId: string;
  from: string;
  to: string;
  timezone: 'Asia/Singapore';
  operatingHours: { opensAt: string | null; closesAt: string | null };
  busy: BusyInterval[];
}

/** CF-09: organisers and attendees learn only that a period is busy, never whose event it is. */
export async function getVenueAvailability(
  database: Database, actor: VenueActor, venueId: string, range: { from: string; to: string },
): Promise<VenueAvailability> {
  const venue = await getVenue(database, actor, venueId);
  const result = await database.query<{
    kind: 'BOOKING' | 'BLOCKED'; id: string; startsAt: Date; endsAt: Date; label: string | null;
  }>(`
    SELECT 'BOOKING' AS kind, b.id, b.starts_at AS "startsAt", b.ends_at AS "endsAt", e.name AS label
    FROM venue_bookings b JOIN event_requests e ON e.id = b.event_request_id
    WHERE b.venue_id = $1 AND b.status = 'APPROVED' AND b.starts_at < $3 AND b.ends_at > $2
    UNION ALL
    SELECT 'BLOCKED' AS kind, u.id, u.starts_at AS "startsAt", u.ends_at AS "endsAt", u.reason AS label
    FROM venue_unavailability u
    WHERE u.venue_id = $1 AND u.starts_at < $3 AND u.ends_at > $2
    ORDER BY "startsAt", "endsAt", id
  `, [venueId, range.from, range.to]);

  const detailed = actor.role === 'VENUE_STAFF' || actor.role === 'EVENT_COORDINATOR';
  return {
    venueId: venue.id, from: range.from, to: range.to, timezone: 'Asia/Singapore',
    operatingHours: { opensAt: venue.opensAt, closesAt: venue.closesAt },
    busy: result.rows.map((row) => {
      const interval: BusyInterval = {
        kind: row.kind, startsAt: toIso(row.startsAt), endsAt: toIso(row.endsAt),
      };
      if (!detailed) return interval;
      return row.kind === 'BOOKING'
        ? { ...interval, id: row.id, eventName: row.label }
        : { ...interval, id: row.id, reason: row.label };
    }),
  };
}

export interface UnavailabilityRecord extends Interval {
  id: string;
  venueId: string;
  reason: string | null;
}

/**
 * CF-09: the venue row lock is the same one the approval trigger takes, so a block and a
 * competing approval for the same venue are serialised and one of them sees the other.
 */
export async function createUnavailability(
  pool: Pick<Pool, 'connect'>, actor: VenueActor, venueId: string, input: UnavailabilityInput,
): Promise<UnavailabilityRecord> {
  return withTransaction(pool, async (client) => {
    await getVenue(client, actor, venueId, true);
    const clashes = await client.query<{ startsAt: Date; endsAt: Date }>(`
      SELECT starts_at AS "startsAt", ends_at AS "endsAt" FROM venue_bookings
      WHERE venue_id = $1 AND status = 'APPROVED' AND starts_at < $3 AND ends_at > $2
      ORDER BY starts_at
    `, [venueId, input.startsAt, input.endsAt]);
    if (clashes.rows.length) {
      throw new VenueRuleError(
        'CONFLICT', 'VENUE_BLOCK_CONFLICT',
        'This period overlaps an approved booking. Resolve the booking before blocking the venue.',
        { conflicts: clashes.rows.map((row) => ({ startsAt: toIso(row.startsAt), endsAt: toIso(row.endsAt) })) },
      );
    }
    const inserted = await client.query<{ id: string }>(`
      INSERT INTO venue_unavailability (venue_id, starts_at, ends_at, reason, created_by)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [venueId, input.startsAt, input.endsAt, input.reason, actor.id]);
    return { id: inserted.rows[0]!.id, venueId, ...input };
  });
}

export async function deleteUnavailability(
  database: Database, venueId: string, blockId: string,
): Promise<void> {
  const deleted = await database.query(
    'DELETE FROM venue_unavailability WHERE id = $1 AND venue_id = $2', [blockId, venueId],
  );
  if (deleted.rowCount !== 1) {
    throw new VenueRuleError('NOT_FOUND', 'VENUE_UNAVAILABILITY_NOT_FOUND', 'The blocked period was not found.');
  }
}

export interface VenueSuitabilityResponse extends SuitabilityResult {
  venueId: string;
  eventRequestId: string;
}

/** CF-11: only the event's owner organiser or assigned coordinator may assess it against a venue. */
export async function getVenueSuitability(
  database: Database, actor: VenueActor, venueId: string, eventRequestId: string,
): Promise<VenueSuitabilityResponse> {
  const event = await loadArrangeableEvent(database, actor, eventRequestId);
  if (!event) throw eventNotFound();
  const venue = await getVenue(database, actor, venueId);
  const busy = event.startsAt && event.endsAt
    ? await loadBusyIntervals(database, venueId, { startsAt: event.startsAt, endsAt: event.endsAt })
    : [];
  return { venueId, eventRequestId, ...assessVenueSuitability({ ...venue, busy }, event) };
}
