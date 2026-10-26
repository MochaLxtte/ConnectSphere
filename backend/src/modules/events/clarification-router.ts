import { Router } from 'express';
import {
  listClarifications, requestClarification, respondToClarification, startReview,
} from './clarifications.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

export type ClarificationRouterDependencies = WorkflowRouterDependencies;

const signInMessage = 'Sign in to work with clarification requests.';

/** CF-04 / KAN-27 clarification requests, responses and the start-review transition. */
export function createClarificationRouter(dependencies: ClarificationRouterDependencies) {
  const router = Router();

  router.post('/:id/start-review', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_COORDINATOR'] },
    (actor, request) => startReview(dependencies, {
      eventRequestId: param(request, 'id'), actor, input: request.body,
    }),
  ));

  router.get('/:id/clarifications', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'] },
    async (actor, request) => ({
      items: await listClarifications(dependencies, { eventRequestId: param(request, 'id'), actor }),
    }),
  ));

  router.post('/:id/clarifications', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_COORDINATOR'], successStatus: 201 },
    (actor, request) => requestClarification(dependencies, {
      eventRequestId: param(request, 'id'), actor, input: request.body,
    }),
  ));

  router.post('/:id/clarifications/:clarificationId/response', workflowRoute(
    dependencies,
    {
      signInMessage, roles: ['EVENT_ORGANISER'],
      uuidParams: { id: 'INVALID_EVENT_REQUEST_ID', clarificationId: 'INVALID_CLARIFICATION_ID' },
    },
    (actor, request) => respondToClarification(dependencies, {
      eventRequestId: param(request, 'id'),
      clarificationId: param(request, 'clarificationId'),
      actor, input: request.body,
    }),
  ));

  return router;
}
