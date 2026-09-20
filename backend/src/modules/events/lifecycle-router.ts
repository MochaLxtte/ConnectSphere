import { Router } from 'express';
import { cancelEvent, completeEvent, confirmEvent, listStatusHistory } from './lifecycle.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

export type LifecycleRouterDependencies = WorkflowRouterDependencies;

const signInMessage = 'Sign in to manage this event.';
const participants = ['EVENT_ORGANISER', 'EVENT_COORDINATOR'] as const;

/** CF-06 confirm, cancel, complete and the status audit trail. */
export function createLifecycleRouter(dependencies: LifecycleRouterDependencies) {
  const router = Router();

  router.post('/:id/confirm', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_COORDINATOR'] },
    (actor, request) => confirmEvent(dependencies, { eventRequestId: param(request, 'id'), actor }),
  ));

  router.post('/:id/cancel', workflowRoute(
    dependencies, { signInMessage, roles: participants },
    (actor, request) => cancelEvent(dependencies, {
      eventRequestId: param(request, 'id'), actor, input: request.body,
    }),
  ));

  router.post('/:id/complete', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_COORDINATOR'] },
    (actor, request) => completeEvent(dependencies, { eventRequestId: param(request, 'id'), actor }),
  ));

  router.get('/:id/history', workflowRoute(
    dependencies, { signInMessage, roles: participants },
    async (actor, request) => ({
      items: await listStatusHistory(dependencies, { eventRequestId: param(request, 'id'), actor }),
    }),
  ));

  return router;
}
