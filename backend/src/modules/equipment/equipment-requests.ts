import type { Pool, PoolClient } from 'pg';
import { notify, type NotificationInput } from '../notifications/notify.js';
import { availableQuantity, computeReservedPeak, readReservedIntervals } from './availability.js';
import {
  EquipmentConflictError, EquipmentForbiddenError, EquipmentInputError, EquipmentNotFoundError,
} from './errors.js';
import type {
  EquipmentDecisionInput, EquipmentRequestCreateInput, EquipmentRequestFilter,
  EquipmentRequestUpdateInput,
} from './request-input.js';
import { isDatabaseError, withTransaction } from './transaction.js';
import type {
  EquipmentActor, EquipmentRequestQueueItem, EquipmentRequestRecord, EquipmentRequestStatus,
} from './types.js';

type Queryable = Pick<Pool | PoolClient, 'query'>;
type Database = Pick<Pool, 'query' | 'connect'>;

interface RequestRow {
  id: string;
  eventRequestId: string;
  equipmentTypeId: string;
  equipmentName: string;
  equipmentCategory: string | null;
  requestedBy: string;
  quantity: number;
  status: EquipmentRequestStatus;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  decidedBy: string | null;
  decidedAt: Date | null;
  decisionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EventAccessRow {
  organiserId: string;
  coordinatorId: string | null;
  eventStatus: string;
}

const requestColumns = `
  r.id, r.event_request_id AS "eventRequestId", r.equipment_type_id AS "equipmentTypeId",
  t.name AS "equipmentName", t.category AS "equipmentCategory", r.requested_by AS "requestedBy",
  r.quantity, r.status, r.starts_at AS "startsAt", r.ends_at AS "endsAt", r.notes,
  r.decided_by AS "decidedBy", r.decided_at AS "decidedAt", r.decision_reason AS "decisionReason",
  r.created_at AS "createdAt", r.updated_at AS "updatedAt"
`;
const requestSource = `
  equipment_requests r
  JOIN equipment_types t ON t.id = r.equipment_type_id
  JOIN event_requests e ON e.id = r.event_request_id
`;
const eventColumns = `
  e.organiser_id AS "organiserId", e.coordinator_id AS "coordinatorId", e.status AS "eventStatus"
`;

function toRecord(row: RequestRow): EquipmentRequestRecord {
  return {
    id: row.id,
    eventRequestId: row.eventRequestId,
    equipmentTypeId: row.equipmentTypeId,
    equipmentName: row.equipmentName,
    equipmentCategory: row.equipmentCategory,
    requestedBy: row.requestedBy,
    quantity: row.quantity,
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    notes: row.notes,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decisionReason: row.decisionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Q-02 (provisional): the owning organiser or the currently assigned coordinator. */
export function isEventPlanner(actor: EquipmentActor, event: Pick<EventAccessRow, 'organiserId' | 'coordinatorId'>): boolean {
  return (actor.role === 'EVENT_ORGANISER' && event.organiserId === actor.id) ||
    (actor.role === 'EVENT_COORDINATOR' && event.coordinatorId === actor.id);
}

function assertPlannerRole(actor: EquipmentActor): void {
  if (actor.role !== 'EVENT_ORGANISER' && actor.role !== 'EVENT_COORDINATOR') {
    throw new EquipmentForbiddenError(
      'EQUIPMENT_REQUEST_FORBIDDEN',
      'Only event organisers and assigned coordinators can manage equipment requests.',
    );
  }
}

function assertWithinPool(quantity: number, totalQuantity: number): void {
  if (quantity > totalQuantity) {
    throw new EquipmentConflictError(
      'EQUIPMENT_QUANTITY_EXCEEDS_POOL',
      `Only ${totalQuantity} of this equipment exist in total.`,
      { totalQuantity },
    );
  }
}

async function readRecord(client: Queryable, id: string): Promise<EquipmentRequestRecord> {
  const result = await client.query<RequestRow>(
    `SELECT ${requestColumns} FROM ${requestSource} WHERE r.id = $1`, [id],
  );
  const row = result.rows[0];
  if (!row) throw new Error('The equipment request could not be read back.');
  return toRecord(row);
}

/** CF-15: request pooled equipment for an approved or confirmed event. */
export async function createEquipmentRequest(
  pool: Database, actor: EquipmentActor, input: EquipmentRequestCreateInput,
): Promise<EquipmentRequestRecord> {
  assertPlannerRole(actor);
  return withTransaction(pool, async (client) => {
    // Hold the event row so its status and schedule cannot change underneath the request.
    const events = await client.query<EventAccessRow & {
      name: string | null; startsAt: Date | null; endsAt: Date | null;
    }>(`
      SELECT ${eventColumns}, e.name, e.starts_at AS "startsAt", e.ends_at AS "endsAt"
      FROM event_requests e WHERE e.id = $1 FOR UPDATE
    `, [input.eventRequestId]);
    const event = events.rows[0];
    if (!event || !isEventPlanner(actor, event)) throw new EquipmentNotFoundError('EVENT_REQUEST_NOT_FOUND');
    if (event.eventStatus !== 'APPROVED' && event.eventStatus !== 'CONFIRMED') {
      throw new EquipmentConflictError(
        'EVENT_NOT_ELIGIBLE_FOR_EQUIPMENT',
        'Equipment can be requested only for approved or confirmed events.',
      );
    }

    const types = await client.query<{ name: string; totalQuantity: number; isActive: boolean }>(`
      SELECT name, total_quantity AS "totalQuantity", is_active AS "isActive"
      FROM equipment_types WHERE id = $1
    `, [input.equipmentTypeId]);
    const type = types.rows[0];
    if (!type) throw new EquipmentNotFoundError('EQUIPMENT_NOT_FOUND');
    if (!type.isActive) {
      throw new EquipmentConflictError('EQUIPMENT_TYPE_INACTIVE', 'This equipment type is no longer offered.');
    }

    const startsAt = input.startsAt ?? event.startsAt;
    const endsAt = input.endsAt ?? event.endsAt;
    if (!startsAt || !endsAt) {
      throw new EquipmentConflictError(
        'EVENT_SCHEDULE_REQUIRED',
        'The event has no schedule yet, so startsAt and endsAt must be supplied.',
      );
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new EquipmentInputError('INVALID_EQUIPMENT_REQUEST_INPUT', 'endsAt must be later than startsAt.');
    }
    assertWithinPool(input.quantity, type.totalQuantity);

    const inserted = await client.query<{ id: string }>(`
      INSERT INTO equipment_requests
        (event_request_id, equipment_type_id, requested_by, quantity, starts_at, ends_at, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [input.eventRequestId, input.equipmentTypeId, actor.id, input.quantity, startsAt, endsAt, input.notes]);
    const saved = inserted.rows[0];
    if (!saved) throw new Error('The equipment request could not be recorded.');

    const staff = await client.query<{ id: string }>(
      "SELECT id FROM app_users WHERE role = 'TECHNICAL_SUPPORT_STAFF' AND id <> $1", [actor.id],
    );
    await notify(client, staff.rows.map((member): NotificationInput => ({
      recipientId: member.id,
      eventRequestId: input.eventRequestId,
      type: 'EQUIPMENT_REQUEST_CREATED',
      title: 'New equipment request',
      message: `${input.quantity} × ${type.name} requested for ${event.name?.trim() || 'an event'}.`,
    })));
    return readRecord(client, saved.id);
  });
}

type LockedRequest = RequestRow & EventAccessRow & { totalQuantity: number; eventName: string | null };

/** Lock the request row only; the joined type and event rows stay readable by others. */
async function lockRequest(client: PoolClient, id: string): Promise<LockedRequest | undefined> {
  const result = await client.query<LockedRequest>(`
    SELECT ${requestColumns}, ${eventColumns}, e.name AS "eventName", t.total_quantity AS "totalQuantity"
    FROM ${requestSource} WHERE r.id = $1 FOR UPDATE OF r
  `, [id]);
  return result.rows[0];
}

/** Unrelated callers get the same 404 as a missing request; related non-requesters get 403. */
function assertRequester(actor: EquipmentActor, request: LockedRequest | undefined): asserts request {
  if (!request || (request.requestedBy !== actor.id && !isEventPlanner(actor, request))) {
    throw new EquipmentNotFoundError('EQUIPMENT_REQUEST_NOT_FOUND');
  }
  if (request.requestedBy !== actor.id) {
    throw new EquipmentForbiddenError(
      'EQUIPMENT_REQUEST_FORBIDDEN', 'Only the person who made this equipment request can change it.',
    );
  }
}

/** CF-15: the requester may adjust quantity, period or notes until Technical Support decides. */
export async function updateEquipmentRequest(
  pool: Database, actor: EquipmentActor, id: string, input: EquipmentRequestUpdateInput,
): Promise<EquipmentRequestRecord> {
  return withTransaction(pool, async (client) => {
    const request = await lockRequest(client, id);
    assertRequester(actor, request);
    if (request.status !== 'REQUESTED') {
      throw new EquipmentConflictError(
        'EQUIPMENT_REQUEST_NOT_PENDING', 'Only equipment requests awaiting a decision can be edited.',
      );
    }
    const startsAt = input.startsAt ?? request.startsAt;
    const endsAt = input.endsAt ?? request.endsAt;
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new EquipmentInputError('INVALID_EQUIPMENT_REQUEST_INPUT', 'endsAt must be later than startsAt.');
    }
    const quantity = input.quantity ?? request.quantity;
    assertWithinPool(quantity, request.totalQuantity);
    const notes = input.notes === undefined ? request.notes : input.notes;

    await client.query(`
      UPDATE equipment_requests
      SET quantity = $2, starts_at = $3, ends_at = $4, notes = $5, updated_at = now()
      WHERE id = $1
    `, [id, quantity, startsAt, endsAt, notes]);
    return readRecord(client, id);
  });
}

/** CF-15: cancelling a RESERVED request returns its quantity to the pool. */
export async function cancelEquipmentRequest(
  pool: Database, actor: EquipmentActor, id: string,
): Promise<EquipmentRequestRecord> {
  return withTransaction(pool, async (client) => {
    const request = await lockRequest(client, id);
    assertRequester(actor, request);
    if (request.status !== 'REQUESTED' && request.status !== 'RESERVED') {
      throw new EquipmentConflictError(
        'EQUIPMENT_REQUEST_NOT_CANCELLABLE', 'This equipment request has already been rejected or cancelled.',
      );
    }
    await client.query(
      "UPDATE equipment_requests SET status = 'CANCELLED', updated_at = now() WHERE id = $1", [id],
    );
    if (request.status === 'RESERVED' && request.decidedBy && request.decidedBy !== actor.id) {
      await notify(client, {
        recipientId: request.decidedBy,
        eventRequestId: request.eventRequestId,
        type: 'EQUIPMENT_REQUEST_CANCELLED',
        title: 'Equipment reservation cancelled',
        message: `${request.quantity} × ${request.equipmentName} for ${request.eventName?.trim() || 'an event'} was released.`,
      });
    }
    return readRecord(client, id);
  });
}

export type EquipmentRequestListing =
  | { scope: 'event'; items: EquipmentRequestRecord[] }
  | { scope: 'queue'; items: EquipmentRequestQueueItem[] };

/**
 * Organisers and assigned coordinators list one event's requests. Technical Support lists the
 * decision queue (REQUESTED unless another status or an event is chosen) with live availability.
 */
export async function listEquipmentRequests(
  database: Queryable, actor: EquipmentActor, filter: EquipmentRequestFilter,
): Promise<EquipmentRequestListing> {
  if (actor.role === 'TECHNICAL_SUPPORT_STAFF') {
    const status = filter.status ?? (filter.eventRequestId ? null : 'REQUESTED');
    const result = await database.query<RequestRow & {
      eventName: string | null; organiserName: string; requesterName: string; totalQuantity: number;
    }>(`
      SELECT ${requestColumns}, e.name AS "eventName", o.display_name AS "organiserName",
        u.display_name AS "requesterName", t.total_quantity AS "totalQuantity"
      FROM ${requestSource}
      JOIN app_users o ON o.id = e.organiser_id
      JOIN app_users u ON u.id = r.requested_by
      WHERE ($1::text IS NULL OR r.status = $1) AND ($2::uuid IS NULL OR r.event_request_id = $2)
      ORDER BY r.starts_at, r.created_at, r.id
    `, [status, filter.eventRequestId]);
    if (result.rows.length === 0) return { scope: 'queue', items: [] };

    const window = {
      from: new Date(Math.min(...result.rows.map((row) => row.startsAt.getTime()))),
      to: new Date(Math.max(...result.rows.map((row) => row.endsAt.getTime()))),
    };
    const reserved = await readReservedIntervals(
      database, [...new Set(result.rows.map((row) => row.equipmentTypeId))], window,
    );
    return {
      scope: 'queue',
      items: result.rows.map((row) => {
        const others = (reserved.get(row.equipmentTypeId) ?? []).filter((other) => other.id !== row.id);
        const reservedPeak = computeReservedPeak(others, row.startsAt, row.endsAt);
        return {
          ...toRecord(row),
          eventName: row.eventName,
          organiserName: row.organiserName,
          requesterName: row.requesterName,
          totalQuantity: row.totalQuantity,
          reservedPeak,
          available: availableQuantity(row.totalQuantity, reservedPeak),
        };
      }),
    };
  }

  assertPlannerRole(actor);
  if (!filter.eventRequestId) {
    throw new EquipmentInputError('INVALID_EQUIPMENT_REQUEST_FILTER', 'eventRequestId is required.');
  }
  const events = await database.query<EventAccessRow>(
    `SELECT ${eventColumns} FROM event_requests e WHERE e.id = $1`, [filter.eventRequestId],
  );
  const event = events.rows[0];
  if (!event || !isEventPlanner(actor, event)) throw new EquipmentNotFoundError('EVENT_REQUEST_NOT_FOUND');
  const result = await database.query<RequestRow>(`
    SELECT ${requestColumns} FROM ${requestSource}
    WHERE r.event_request_id = $1 AND ($2::text IS NULL OR r.status = $2)
    ORDER BY r.created_at, r.id
  `, [filter.eventRequestId, filter.status]);
  return { scope: 'event', items: result.rows.map(toRecord) };
}

/** The database guard and this figure both use the simultaneous peak (migration 006). */
async function readAvailableAfterRefusal(database: Queryable, request: LockedRequest): Promise<number> {
  const window = { from: request.startsAt, to: request.endsAt };
  const types = await database.query<{ totalQuantity: number }>(
    'SELECT total_quantity AS "totalQuantity" FROM equipment_types WHERE id = $1', [request.equipmentTypeId],
  );
  const total = types.rows[0]?.totalQuantity ?? 0;
  const rows = ((await readReservedIntervals(database, [request.equipmentTypeId], window, request.id))
    .get(request.equipmentTypeId)) ?? [];
  return availableQuantity(total, computeReservedPeak(rows, window.from, window.to));
}

/** CF-17: Technical Support reserves or rejects a REQUESTED row; the trigger guards the pool. */
export async function decideEquipmentRequest(
  pool: Database, actor: EquipmentActor, id: string, input: EquipmentDecisionInput,
): Promise<EquipmentRequestRecord> {
  if (actor.role !== 'TECHNICAL_SUPPORT_STAFF') {
    throw new EquipmentForbiddenError(
      'EQUIPMENT_REQUEST_FORBIDDEN', 'Only technical support staff can decide equipment requests.',
    );
  }
  let locked: LockedRequest | undefined;
  try {
    return await withTransaction(pool, async (client) => {
      // Competing decisions wait here, then see the winner's committed status.
      locked = await lockRequest(client, id);
      const request = locked;
      if (!request) throw new EquipmentNotFoundError('EQUIPMENT_REQUEST_NOT_FOUND');
      if (request.status !== 'REQUESTED') {
        throw new EquipmentConflictError(
          'EQUIPMENT_REQUEST_NOT_PENDING', 'This equipment request has already been decided or cancelled.',
        );
      }
      if (input.decision === 'RESERVED' &&
          request.eventStatus !== 'APPROVED' && request.eventStatus !== 'CONFIRMED') {
        throw new EquipmentConflictError(
          'EVENT_NOT_ELIGIBLE_FOR_EQUIPMENT',
          'Equipment can be reserved only for approved or confirmed events.',
        );
      }

      await client.query(`
        UPDATE equipment_requests
        SET status = $2, decided_by = $3, decided_at = now(), decision_reason = $4, updated_at = now()
        WHERE id = $1
      `, [id, input.decision, actor.id, input.reason]);

      const reservedNow = input.decision === 'RESERVED';
      const eventName = request.eventName?.trim() || 'your event';
      const recipients = [...new Set([request.requestedBy, request.organiserId])]
        .filter((recipientId) => recipientId !== actor.id);
      await notify(client, recipients.map((recipientId): NotificationInput => ({
        recipientId,
        eventRequestId: request.eventRequestId,
        type: reservedNow ? 'EQUIPMENT_REQUEST_RESERVED' : 'EQUIPMENT_REQUEST_REJECTED',
        title: reservedNow ? 'Equipment reserved' : 'Equipment request rejected',
        message: reservedNow
          ? `${request.quantity} × ${request.equipmentName} reserved for ${eventName}.`
          : `${request.quantity} × ${request.equipmentName} for ${eventName} was rejected: ${input.reason ?? 'no reason given'}`,
      })));
      return readRecord(client, id);
    });
  } catch (error) {
    if (locked && isDatabaseError(error, '23P01', 'equipment_requests_within_pool')) {
      const available = await readAvailableAfterRefusal(pool, locked);
      throw new EquipmentConflictError(
        'EQUIPMENT_UNAVAILABLE',
        `Not enough equipment is free in this period: ${available} available, ${locked.quantity} requested.`,
        { available },
      );
    }
    throw error;
  }
}
