import type { EventStatus } from './types.js';
import {
  iso, readEventRequest, requireRelation,
  type WorkflowActor, type WorkflowDependencies,
} from './workflow-support.js';

export interface StatusHistoryEntry {
  id: string;
  fromStatus: EventStatus | null;
  toStatus: EventStatus;
  changedById: string | null;
  changedByName: string | null;
  createdAt: string;
}

/** Read the request's recorded progress without exposing later lifecycle actions. */
export async function listStatusHistory(
  { pool }: WorkflowDependencies,
  { eventRequestId, actor }: { eventRequestId: string; actor: WorkflowActor },
): Promise<StatusHistoryEntry[]> {
  const event = await readEventRequest(pool, eventRequestId);
  requireRelation(actor, event, ['OWNER', 'ASSIGNED_COORDINATOR']);
  const found = await pool.query<Omit<StatusHistoryEntry, 'createdAt'> & { createdAt: Date }>(
    `SELECT h.id, h.from_status AS "fromStatus", h.to_status AS "toStatus",
            h.changed_by AS "changedById", u.display_name AS "changedByName",
            h.created_at AS "createdAt"
     FROM event_status_history h LEFT JOIN app_users u ON u.id = h.changed_by
     WHERE h.event_request_id = $1
     ORDER BY h.created_at ASC, h.id`,
    [event.id],
  );
  return found.rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
}
