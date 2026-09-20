import { Router } from 'express';
import {
  assignCoordinator, listAssignments, listCoordinators, listUnassignedRequests,
} from './assignment.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

export type AssignmentRouterDependencies = WorkflowRouterDependencies;

const signInMessage = 'Sign in to manage coordinator assignments.';
const coordinatorOnly = ['EVENT_COORDINATOR'] as const;

/**
 * CF-05. Mount BEFORE the router that owns GET /api/events/:id, otherwise "unassigned" and
 * "coordinators" are read as event request IDs.
 */
export function createAssignmentRouter(dependencies: AssignmentRouterDependencies) {
  const router = Router();

  router.get('/unassigned', workflowRoute(
    dependencies, { signInMessage, roles: coordinatorOnly, uuidParams: {} },
    async (actor) => ({ items: await listUnassignedRequests(dependencies, actor) }),
  ));

  router.get('/coordinators', workflowRoute(
    dependencies, { signInMessage, roles: coordinatorOnly, uuidParams: {} },
    async (actor) => ({ items: await listCoordinators(dependencies, actor) }),
  ));

  router.put('/:id/coordinator', workflowRoute(
    dependencies, { signInMessage, roles: coordinatorOnly },
    (actor, request) => assignCoordinator(dependencies, {
      eventRequestId: param(request, 'id'), actor, input: request.body,
    }),
  ));

  router.get('/:id/assignments', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'] },
    async (actor, request) => ({
      items: await listAssignments(dependencies, { eventRequestId: param(request, 'id'), actor }),
    }),
  ));

  return router;
}
