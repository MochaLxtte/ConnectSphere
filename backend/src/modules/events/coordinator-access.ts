import type { AuthenticatedUser } from '../auth/types.js';
import type { EventRecord } from './types.js';

/** Sprint 1 assignment policy; callers separately enforce draft visibility and decision status. */
export function isAssignedCoordinator(
  actor: Pick<AuthenticatedUser, 'id' | 'role'>,
  request: Pick<EventRecord, 'coordinatorId'>,
): boolean {
  // Both IDs refer to app_users, not to the external Supabase identity.
  return actor.role === 'EVENT_COORDINATOR' && request.coordinatorId === actor.id;
}
