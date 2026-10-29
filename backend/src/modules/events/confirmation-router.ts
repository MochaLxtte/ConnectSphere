import { Router } from 'express';
import { confirmEvent, getEventConfirmation } from './confirmation.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

/** KAN-61: readiness checklist and final confirmation (distinct from KAN-36 initial approval). */
export function createConfirmationRouter(dependencies: WorkflowRouterDependencies) {
  const router = Router();
  router.get('/:id/confirmation', workflowRoute(dependencies, {
    signInMessage: 'Sign in to view event confirmation.', roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'],
    uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' },
  }, async (actor, request) => getEventConfirmation(dependencies.pool, { eventRequestId: param(request, 'id'), actor })));
  router.post('/:id/confirm', workflowRoute(dependencies, {
    signInMessage: 'Sign in to confirm this event.', roles: ['EVENT_COORDINATOR'],
    uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' },
  }, async (actor, request) => ({ confirmation: await confirmEvent(dependencies.pool,
    { eventRequestId: param(request, 'id'), actor, input: request.body }) })));
  return router;
}
