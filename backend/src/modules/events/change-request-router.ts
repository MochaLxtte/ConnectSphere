import { Router } from 'express';
import {
  createChangeRequest, decideChangeRequest, listChangeRequests, withdrawChangeRequest,
} from './change-requests.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

export type ChangeRequestRouterDependencies = WorkflowRouterDependencies;

const signInMessage = 'Sign in to work with event change requests.';
const uuidParams = { id: 'INVALID_EVENT_REQUEST_ID', changeId: 'INVALID_CHANGE_REQUEST_ID' };

/** CF-19 event change requests. */
export function createChangeRequestRouter(dependencies: ChangeRequestRouterDependencies) {
  const router = Router();

  router.get('/:id/change-requests', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'] },
    async (actor, request) => ({
      items: await listChangeRequests(dependencies, { eventRequestId: param(request, 'id'), actor }),
    }),
  ));

  router.post('/:id/change-requests', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_ORGANISER'], successStatus: 201 },
    (actor, request) => createChangeRequest(dependencies, {
      eventRequestId: param(request, 'id'), actor, input: request.body,
    }),
  ));

  router.post('/:id/change-requests/:changeId/withdraw', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_ORGANISER'], uuidParams },
    (actor, request) => withdrawChangeRequest(dependencies, {
      eventRequestId: param(request, 'id'), changeRequestId: param(request, 'changeId'), actor,
    }),
  ));

  router.post('/:id/change-requests/:changeId/decision', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_COORDINATOR'], uuidParams },
    (actor, request) => decideChangeRequest(dependencies, {
      eventRequestId: param(request, 'id'), changeRequestId: param(request, 'changeId'),
      actor, input: request.body,
    }),
  ));

  return router;
}
