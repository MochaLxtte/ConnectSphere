import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../auth/types.js';
import { isAssignedCoordinator } from './coordinator-access.js';
import type { EventStatus } from './types.js';

/** Shared by initial assignment, clarification and status-history services. */
export type WorkflowActor = Pick<AuthenticatedUser, 'id' | 'role'>;

export interface WorkflowDependencies {
  pool: Pick<Pool, 'query' | 'connect'>;
}

/**
 * NOT_FOUND also covers actors unrelated to the request, so they learn nothing about it.
 * FORBIDDEN is for a related actor (owner or assigned coordinator) whose role may not act.
 */
export type WorkflowErrorKind = 'INVALID_INPUT' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT';

export class WorkflowError extends Error {
  constructor(
    public readonly kind: WorkflowErrorKind,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export const requestNotFound = () =>
  new WorkflowError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.');

export interface LockedEventRequest {
  id: string;
  organiserId: string;
  coordinatorId: string | null;
  status: EventStatus;
  /** Used in notification text (KAN-64); nullable because drafts may be unnamed. */
  name: string | null;
  /** KAN-66: increases on every update of the row (migration 014). */
  revision: number;
}

const eventColumns = `
  id, organiser_id AS "organiserId", coordinator_id AS "coordinatorId", status, name, revision
`;

/** Competing writers wait on this row lock, then inspect the latest committed state. */
export async function lockEventRequest(
  client: Pick<PoolClient, 'query'>,
  eventRequestId: string,
): Promise<LockedEventRequest> {
  const found = await client.query<LockedEventRequest>(
    `SELECT ${eventColumns} FROM event_requests WHERE id = $1 FOR UPDATE`,
    [eventRequestId],
  );
  const event = found.rows[0];
  if (!event) throw requestNotFound();
  return event;
}

export async function readEventRequest(
  database: Pick<Pool, 'query'>,
  eventRequestId: string,
): Promise<LockedEventRequest> {
  const found = await database.query<LockedEventRequest>(
    `SELECT ${eventColumns} FROM event_requests WHERE id = $1`,
    [eventRequestId],
  );
  const event = found.rows[0];
  if (!event) throw requestNotFound();
  return event;
}

/** KAN-65: keep authorisation and protected history reads on the same assignment.
 * A handover waits until the read finishes, or the reader sees the new assignee.
 */
export async function inEventReadTransaction<T>(
  pool: Pick<Pool, 'connect'>,
  actorId: string,
  eventRequestId: string,
  read: (client: PoolClient, event: LockedEventRequest) => Promise<T>,
): Promise<T> {
  return inActorTransaction(pool, actorId, async (client) => {
    const found = await client.query<LockedEventRequest>(
      `SELECT ${eventColumns} FROM event_requests WHERE id = $1 FOR SHARE`,
      [eventRequestId],
    );
    const event = found.rows[0];
    if (!event) throw requestNotFound();
    return read(client, event);
  });
}

export type EventRelation = 'OWNER' | 'ASSIGNED_COORDINATOR';

export function relationTo(
  actor: WorkflowActor,
  event: Pick<LockedEventRequest, 'organiserId' | 'coordinatorId'>,
): EventRelation | null {
  if (actor.role === 'EVENT_ORGANISER' && event.organiserId === actor.id) return 'OWNER';
  if (isAssignedCoordinator(actor, event)) return 'ASSIGNED_COORDINATOR';
  return null;
}

/**
 * Unrelated actors receive the same NOT_FOUND as a missing request. Coordinators never see
 * drafts, matching the Sprint 1 detail policy.
 */
export function requireRelation(
  actor: WorkflowActor,
  event: Pick<LockedEventRequest, 'organiserId' | 'coordinatorId' | 'status'>,
  allowed: readonly EventRelation[],
  forbiddenMessage = 'You are not authorised to perform this action on the event request.',
): EventRelation {
  const relation = relationTo(actor, event);
  if (!relation || (relation === 'ASSIGNED_COORDINATOR' && event.status === 'DRAFT')) {
    throw requestNotFound();
  }
  if (!allowed.includes(relation)) {
    throw new WorkflowError('FORBIDDEN', 'ACTION_FORBIDDEN', forbiddenMessage);
  }
  return relation;
}

/**
 * Run work in one READ COMMITTED transaction. app.actor_id is set first so the
 * event_status_history trigger attributes any status change to the acting user.
 */
export async function inActorTransaction<T>(
  pool: Pick<Pool, 'connect'>,
  actorId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query("SELECT set_config('app.actor_id', $1, true)", [actorId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Discard a connection whose transaction could not be cleaned up.
      releaseError = rollbackError instanceof Error ? rollbackError : new Error('Rollback failed.');
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

export async function setEventStatus(
  client: Pick<PoolClient, 'query'>,
  eventRequestId: string,
  status: EventStatus,
): Promise<void> {
  const updated = await client.query(
    'UPDATE event_requests SET status = $1, updated_at = now() WHERE id = $2',
    [status, eventRequestId],
  );
  if (updated.rowCount !== 1) throw new Error('The event request status could not be updated.');
}

export function parseObjectBody(input: unknown, allowedKeys: readonly string[]): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', 'The request body must be a JSON object.');
  }
  const body = input as Record<string, unknown>;
  const unknown = Object.keys(body).find((key) => !allowedKeys.includes(key));
  if (unknown) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', `Unsupported field: ${unknown}.`);
  }
  return body;
}

/** Shared limit for workflow explanations (reasons, notes, messages); KAN-60 reuses it for review reasons. */
export const MAX_TEXT_LENGTH = 2000;

export function requiredText(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', `${field} must be non-empty text.`);
  }
  if (value.trim().length > MAX_TEXT_LENGTH) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', `${field} must be at most ${MAX_TEXT_LENGTH} characters.`);
  }
  return value.trim();
}

export function optionalText(body: Record<string, unknown>, field: string): string | null {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', `${field} must be text or null.`);
  }
  if (value.trim().length > MAX_TEXT_LENGTH) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', `${field} must be at most ${MAX_TEXT_LENGTH} characters.`);
  }
  return value.trim() || null;
}

/**
 * KAN-66: an optional or required `expectedRevision` body field. Returns null when it is absent
 * and allowed to be. Clients send the revision they displayed (KAN-66-AC103, AC101).
 */
export function parseExpectedRevision(value: unknown, required: boolean): number | null {
  if (value === undefined && !required) return null;
  if (value === undefined) {
    throw new WorkflowError(
      'INVALID_INPUT', 'EXPECTED_REVISION_REQUIRED',
      'expectedRevision is required; reload the event request and try again.',
    );
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
    throw new WorkflowError('INVALID_INPUT', 'INVALID_INPUT', 'expectedRevision must be a positive whole number.');
  }
  return value;
}

/** Compare under the row lock, so a page showing older data cannot act on it (KAN-66-AC103). */
export function assertExpectedRevision(current: number, expected: number | null): void {
  if (expected !== null && expected !== current) {
    throw new WorkflowError(
      'CONFLICT', 'EVENT_REVISION_CONFLICT',
      'This event request changed after you opened it. Refresh to see the latest details.',
    );
  }
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const iso = (value: Date | string): string => new Date(value).toISOString();
export const isoOrNull = (value: Date | string | null): string | null =>
  value === null ? null : iso(value);
