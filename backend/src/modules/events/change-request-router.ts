import { Router } from 'express';
import {
  decideChangeRequest, listChangeRequests, submitChangeRequest, withdrawChangeRequest,
} from './change-requests.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

const signInMessage = 'Sign in to work with change requests.';
const nestedIds = { id: 'INVALID_EVENT_REQUEST_ID', changeRequestId: 'INVALID_CHANGE_REQUEST_ID' };

/** KAN-15 change requests, nested under the event request like clarifications (design D3). */
export function createChangeRequestRouter(dependencies: WorkflowRouterDependencies) {
  const router = Router();

  router.get('/:id/change-requests', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'] },
    async (actor, request) => ({
      items: await listChangeRequests(dependencies, { eventRequestId: param(request, 'id'), actor }),
    }),
  ));

  router.post('/:id/change-requests', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_ORGANISER'], successStatus: 201 },
    (actor, request) => submitChangeRequest(dependencies, {
      eventRequestId: param(request, 'id'), actor, input: request.body,
    }),
  ));

  router.post('/:id/change-requests/:changeRequestId/decision', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_COORDINATOR'], uuidParams: nestedIds },
    (actor, request) => decideChangeRequest(dependencies, {
      eventRequestId: param(request, 'id'), changeRequestId: param(request, 'changeRequestId'),
      actor, input: request.body,
    }),
  ));

  router.post('/:id/change-requests/:changeRequestId/withdraw', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_ORGANISER'], uuidParams: nestedIds },
    (actor, request) => withdrawChangeRequest(dependencies, {
      eventRequestId: param(request, 'id'), changeRequestId: param(request, 'changeRequestId'),
      actor, input: request.body,
    }),
  ));

  return router;
}
