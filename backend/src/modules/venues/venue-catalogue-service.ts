import {
  inActorTransaction, iso, WorkflowError, type WorkflowActor, type WorkflowDependencies,
} from '../events/workflow-support.js';
import {
  assertOperatingHoursOrdered, BUFFER_FIELDS, parseVenueCatalogueRequest, type VenueCatalogueUpdate,
} from './venue-catalogue-input.js';
import type { VenueResult } from './venue-search.js';

/** Same shape as a venue search result, so search, suitability and maintenance agree on a venue. */
export type CatalogueVenue = VenueResult;

type CatalogueRow = Omit<CatalogueVenue, 'updatedAt'> & { updatedAt: Date };

const catalogueSelect = `SELECT id, name, description, location, capacity, layouts, facilities,
  accessibility_features AS "accessibilityFeatures", wheelchair_accessible AS "wheelchairAccessible",
  to_char(opens_at, 'HH24:MI') AS "opensAt", to_char(closes_at, 'HH24:MI') AS "closesAt",
  setup_minutes AS "setupMinutes", turnaround_minutes AS "turnaroundMinutes",
  updated_at AS "updatedAt"
  FROM venues`;

/** Column names are fixed here, never taken from the request, so no input reaches the SQL text. */
const COLUMN_BY_FIELD: Record<keyof VenueCatalogueUpdate, string> = {
  location: 'location',
  capacity: 'capacity',
  facilities: 'facilities',
  accessibilityFeatures: 'accessibility_features',
  wheelchairAccessible: 'wheelchair_accessible',
  layouts: 'layouts',
  opensAt: 'opens_at',
  closesAt: 'closes_at',
  setupMinutes: 'setup_minutes',
  turnaroundMinutes: 'turnaround_minutes',
};

function requireVenueStaff(actor: WorkflowActor): void {
  if (actor.role !== 'VENUE_STAFF') {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', 'Only Venue Staff can maintain the venue catalogue.');
  }
}

const venueNotFound = () =>
  new WorkflowError('NOT_FOUND', 'VENUE_NOT_FOUND', 'The venue was not found in the active catalogue.');

function serialize(row: CatalogueRow): CatalogueVenue {
  return { ...row, updatedAt: iso(row.updatedAt) };
}

/** KAN-50-AC1: the active venues recorded in the catalogue, by name. */
export async function listCatalogueVenues(
  { pool }: WorkflowDependencies, { actor }: { actor: WorkflowActor },
): Promise<CatalogueVenue[]> {
  requireVenueStaff(actor);
  const found = await pool.query<CatalogueRow>(
    `${catalogueSelect} WHERE is_active ORDER BY lower(name) ASC, id ASC`,
  );
  return found.rows.map(serialize);
}

/** KAN-50-AC2/AC12: the venue's current recorded information. */
export async function getCatalogueVenue(
  { pool }: WorkflowDependencies, { actor, venueId }: { actor: WorkflowActor; venueId: string },
): Promise<CatalogueVenue> {
  requireVenueStaff(actor);
  const found = await pool.query<CatalogueRow>(`${catalogueSelect} WHERE id = $1 AND is_active`, [venueId]);
  if (!found.rows[0]) throw venueNotFound();
  return serialize(found.rows[0]);
}

/**
 * KAN-50-AC3-AC11, AC14: Venue Staff change the supplied attributes of one venue. The input is
 * validated before any query. The venue row is locked so concurrent edits are serialised and the
 * layouts, facilities and hours always stay on the venue they were saved for; a field that is not
 * supplied is never touched. Search and suitability read these columns live (AC13).
 *
 * KAN-77-AC5: a buffer field is only changed when its stored value still equals the value the
 * editor loaded, checked under the same lock; otherwise nothing is written (409). Other fields keep
 * KAN-50's rule, so a different-field edit made meanwhile is preserved, not refused.
 */
export async function updateCatalogueVenue(
  { pool }: WorkflowDependencies,
  { actor, venueId, input }: { actor: WorkflowActor; venueId: string; input: unknown },
): Promise<CatalogueVenue> {
  requireVenueStaff(actor);
  const { update, expected } = parseVenueCatalogueRequest(input);

  return inActorTransaction(pool, actor.id, async (client) => {
    const locked = await client.query<{
      isActive: boolean; opensAt: string | null; closesAt: string | null;
      setupMinutes: number; turnaroundMinutes: number;
    }>(
      `SELECT is_active AS "isActive", to_char(opens_at, 'HH24:MI') AS "opensAt",
         to_char(closes_at, 'HH24:MI') AS "closesAt", setup_minutes AS "setupMinutes",
         turnaround_minutes AS "turnaroundMinutes" FROM venues WHERE id = $1 FOR UPDATE`,
      [venueId],
    );
    const current = locked.rows[0];
    if (!current) throw venueNotFound();
    if (!current.isActive) throw new WorkflowError('CONFLICT', 'VENUE_INACTIVE', 'This venue is no longer active.');
    const stale = BUFFER_FIELDS.filter((field) => expected[field] !== undefined && expected[field] !== current[field]);
    if (stale.length > 0) {
      throw new WorkflowError('CONFLICT', 'VENUE_BUFFER_CONFLICT',
        `Another change was saved to ${stale.join(' and ')} after you loaded this venue. Reload and try again.`);
    }

    // One endpoint may be supplied alone, so the pair is checked against the stored value.
    assertOperatingHoursOrdered(
      update.opensAt !== undefined ? update.opensAt : current.opensAt,
      update.closesAt !== undefined ? update.closesAt : current.closesAt,
    );

    const fields = Object.keys(update) as (keyof VenueCatalogueUpdate)[];
    const assignments = fields.map((field, index) => `${COLUMN_BY_FIELD[field]} = $${index + 2}`);
    await client.query(
      `UPDATE venues SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1`,
      [venueId, ...fields.map((field) => update[field])],
    );

    const saved = await client.query<CatalogueRow>(`${catalogueSelect} WHERE id = $1`, [venueId]);
    return serialize(saved.rows[0]!);
  });
}
