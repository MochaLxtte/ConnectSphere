import { Router } from 'express';
import { completeEvent, readEventCompletion } from './completion.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

/** KAN-10. Mounted at /api/events; completing is limited to Event Coordinators (the service checks assignment). */
export function createCompletionRouter(dependencies: WorkflowRouterDependencies) {
  const router = Router();
  router.post('/:id/complete', workflowRoute(dependencies, {
    signInMessage: 'Sign in to mark this event completed.', roles: ['EVENT_COORDINATOR'],
    uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' },
  }, async (actor, request) => ({ completion: await completeEvent(dependencies.pool,
    { eventRequestId: param(request, 'id'), actor }) })));
  router.get('/:id/completion', workflowRoute(dependencies, {
    signInMessage: 'Sign in to view this event outcome.', roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'],
    uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' },
  }, async (actor, request) => ({ completion: await readEventCompletion(dependencies.pool,
    { eventRequestId: param(request, 'id'), actor }) })));
  return router;
}
