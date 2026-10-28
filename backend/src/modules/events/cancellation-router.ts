import { Router } from 'express';
import { cancelEvent } from './cancellation.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

export function createCancellationRouter(dependencies: WorkflowRouterDependencies) {
  const router = Router();
  router.post('/:id/cancel', workflowRoute(dependencies, {
    signInMessage: 'Sign in to cancel this event.',
    roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'],
    uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' },
  }, async (actor, request) => ({ cancellation: await cancelEvent(dependencies.pool,
    { eventRequestId: param(request, 'id'), actor, input: request.body }) })));
  router.get('/:id/cancellation', workflowRoute(dependencies, {
    signInMessage: 'Sign in to view this event outcome.', roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'],
    uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' },
  }, async (actor, request) => {
    const found = await dependencies.pool.query(`SELECT c.event_request_id AS "eventRequestId",
      c.cancelled_by AS "cancelledBy", c.cancelled_at AS "cancelledAt", c.reason,
      c.affected_venue_bookings AS "affectedVenueBookings",
      c.affected_equipment_requests AS "affectedEquipmentRequests",
      c.affected_registrations AS "affectedRegistrations", e.organiser_id AS "organiserId",
      e.coordinator_id AS "coordinatorId" FROM event_cancellations c
      JOIN event_requests e ON e.id = c.event_request_id WHERE c.event_request_id = $1`, [param(request, 'id')]);
    const row = found.rows[0] as (Record<string, unknown> & { organiserId: string; coordinatorId: string | null }) | undefined;
    if (!row || !(actor.role === 'EVENT_ORGANISER' && row.organiserId === actor.id)
        && !(actor.role === 'EVENT_COORDINATOR' && row.coordinatorId === actor.id)) {
      return { cancellation: null };
    }
    const { organiserId: _organiserId, coordinatorId: _coordinatorId, ...cancellation } = row;
    return { cancellation };
  }));
  return router;
}
