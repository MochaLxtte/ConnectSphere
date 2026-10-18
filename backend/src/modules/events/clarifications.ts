import {
  inActorTransaction, iso, isoOrNull, lockEventRequest, parseObjectBody,
  inEventReadTransaction, requiredText, requireRelation, setEventStatus, WorkflowError,
  type WorkflowActor, type WorkflowDependencies,
} from './workflow-support.js';

/**
 * CF-04 / KAN-27 clarifications (Q-04 provisional transitions):
 *   SUBMITTED -> UNDER_REVIEW                          assigned coordinator starts the review
 *   SUBMITTED | UNDER_REVIEW -> CLARIFICATION_REQUESTED assigned coordinator asks a question
 *   CLARIFICATION_REQUESTED -> SUBMITTED               owner has answered every open question
 * The request returns to SUBMITTED so the coordinator can review the organiser's answer.
 */
export interface ClarificationRecord {
  id: string;
  eventRequestId: string;
  requestedById: string;
  requestedByName: string;
  message: string;
  response: string | null;
  createdAt: string;
  respondedAt: string | null;
}

interface Command {
  eventRequestId: string;
  actor: WorkflowActor;
}

const coordinatorOnly = 'Only the assigned coordinator can perform this action.';

export async function startReview(
  { pool }: WorkflowDependencies,
  { eventRequestId, actor }: Command,
): Promise<{ eventRequestId: string; status: 'UNDER_REVIEW' }> {
  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['ASSIGNED_COORDINATOR'], coordinatorOnly);
    if (event.status !== 'SUBMITTED') {
      throw new WorkflowError('CONFLICT', 'REVIEW_NOT_STARTABLE', 'Only a submitted request can be moved to under review.');
    }
    await setEventStatus(client, event.id, 'UNDER_REVIEW');
    return { eventRequestId: event.id, status: 'UNDER_REVIEW' as const };
  });
}

export async function requestClarification(
  { pool }: WorkflowDependencies,
  command: Command & { input: unknown },
): Promise<{ clarificationId: string; eventRequestId: string; status: 'CLARIFICATION_REQUESTED' }> {
  const { eventRequestId, actor } = command;
  const message = requiredText(parseObjectBody(command.input, ['message']), 'message');

  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['ASSIGNED_COORDINATOR'], coordinatorOnly);
    if (event.status !== 'SUBMITTED' && event.status !== 'UNDER_REVIEW') {
      throw new WorkflowError('CONFLICT', 'CLARIFICATION_NOT_ALLOWED', 'Clarification can only be requested while the request awaits review.');
    }
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO event_clarifications (event_request_id, requested_by, message)
       VALUES ($1, $2, $3) RETURNING id`,
      [event.id, actor.id, message],
    );
    await setEventStatus(client, event.id, 'CLARIFICATION_REQUESTED');
    return {
      clarificationId: inserted.rows[0]!.id,
      eventRequestId: event.id,
      status: 'CLARIFICATION_REQUESTED' as const,
    };
  });
}

export async function respondToClarification(
  { pool }: WorkflowDependencies,
  command: Command & { clarificationId: string; input: unknown },
): Promise<{ clarificationId: string; eventRequestId: string; status: 'SUBMITTED' | 'CLARIFICATION_REQUESTED' }> {
  const { eventRequestId, clarificationId, actor } = command;
  const answer = requiredText(parseObjectBody(command.input, ['response']), 'response');

  return inActorTransaction(pool, actor.id, async (client) => {
    const event = await lockEventRequest(client, eventRequestId);
    requireRelation(actor, event, ['OWNER'], 'Only the organiser who owns this request can respond.');

    // The event row lock above serializes responses, so this row needs no lock of its own.
    const found = await client.query<{ respondedAt: Date | null }>(
      `SELECT responded_at AS "respondedAt" FROM event_clarifications
       WHERE id = $1 AND event_request_id = $2`,
      [clarificationId, event.id],
    );
    const clarification = found.rows[0];
    if (!clarification) {
      throw new WorkflowError('NOT_FOUND', 'CLARIFICATION_NOT_FOUND', 'The clarification request was not found.');
    }
    if (clarification.respondedAt !== null) {
      throw new WorkflowError('CONFLICT', 'CLARIFICATION_ALREADY_ANSWERED', 'This clarification has already been answered.');
    }
    if (event.status !== 'CLARIFICATION_REQUESTED') {
      throw new WorkflowError('CONFLICT', 'CLARIFICATION_NOT_AWAITED', 'This request is no longer awaiting clarification.');
    }

    await client.query(
      'UPDATE event_clarifications SET response = $1, responded_at = now() WHERE id = $2',
      [answer, clarificationId],
    );
    const open = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM event_clarifications
                      WHERE event_request_id = $1 AND responded_at IS NULL) AS exists`,
      [event.id],
    );
    const resubmitted = !open.rows[0]!.exists;
    if (resubmitted) await setEventStatus(client, event.id, 'SUBMITTED');
    else await client.query('UPDATE event_requests SET updated_at = now() WHERE id = $1', [event.id]);

    return {
      clarificationId,
      eventRequestId: event.id,
      status: resubmitted ? 'SUBMITTED' as const : 'CLARIFICATION_REQUESTED' as const,
    };
  });
}

export async function listClarifications(
  { pool }: WorkflowDependencies,
  { eventRequestId, actor }: Command,
): Promise<ClarificationRecord[]> {
  return inEventReadTransaction(pool, actor.id, eventRequestId, async (client, event) => {
    requireRelation(actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
    const found = await client.query<Omit<ClarificationRecord, 'createdAt' | 'respondedAt'> & {
      createdAt: Date; respondedAt: Date | null;
    }>(
      `SELECT c.id, c.event_request_id AS "eventRequestId", c.requested_by AS "requestedById",
              u.display_name AS "requestedByName", c.message, c.response,
              c.created_at AS "createdAt", c.responded_at AS "respondedAt"
       FROM event_clarifications c JOIN app_users u ON u.id = c.requested_by
       WHERE c.event_request_id = $1
       ORDER BY c.created_at ASC, c.id`,
      [event.id],
    );
    return found.rows.map((row) => ({
      ...row, createdAt: iso(row.createdAt), respondedAt: isoOrNull(row.respondedAt),
    }));
  });
}
