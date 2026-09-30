import { Router } from 'express';
import { listStatusHistory } from './status-history.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

/** Read-only event status history for the organiser and assigned coordinator. */
export function createStatusHistoryRouter(dependencies: WorkflowRouterDependencies) {
  const router = Router();
  router.get('/:id/history', workflowRoute(
    dependencies, {
      signInMessage: 'Sign in to view this event.',
      roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'],
    },
    async (actor, request) => ({
      items: await listStatusHistory(dependencies, { eventRequestId: param(request, 'id'), actor }),
    }),
  ));
  return router;
}
