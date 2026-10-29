import type { PoolClient } from 'pg';

/**
 * KAN-84-AC6/AC7 (PR #78 review, Option A): a CONFIRMED event reopens equipment planning and
 * reservation only while its latest safety round requested TECHNICAL changes. Resubmitting the
 * round (status PENDING) closes the window again. `eventColumn` is the SQL expression for the event id.
 */
export const technicalRemediationSql = (eventColumn: string) => `EXISTS (SELECT 1 FROM safety_reviews s
  WHERE s.event_request_id = ${eventColumn} AND s.status = 'CHANGES_REQUESTED' AND 'TECHNICAL' = ANY(s.requested_areas)
    AND s.round = (SELECT max(x.round) FROM safety_reviews x WHERE x.event_request_id = ${eventColumn}))`;

/** Equipment writes are open on APPROVED events, and on CONFIRMED ones during technical remediation. */
export async function equipmentWritable(
  client: Pick<PoolClient, 'query'>, eventRequestId: string, status: string,
): Promise<boolean> {
  if (status === 'APPROVED') return true;
  if (status !== 'CONFIRMED') return false;
  const found = await client.query<{ open: boolean }>(`SELECT ${technicalRemediationSql('$1::uuid')} AS open`, [eventRequestId]);
  return found.rows[0]?.open === true;
}
