import { Router } from 'express';
import {
  assignCoordinator, getLeadEventDetail, listAssignments, listCoordinators,
  listLeadOversight, listUnassignedRequests,
} from './assignment.js';
import { param, workflowRoute, type WorkflowRouterDependencies } from './workflow-http.js';

export type AssignmentRouterDependencies = WorkflowRouterDependencies;

const signInMessage = 'Sign in to manage coordinator assignments.';
const leadOnly = ['EVENT_COORDINATOR_LEAD'] as const;

/**
 * CF-05 / KAN-79. Mount BEFORE GET /api/events/:id so literal allocation paths
 * are never read as event request IDs. Lead reads do not widen the shared detail policy.
 */
export function createAssignmentRouter(dependencies: AssignmentRouterDependencies) {
  const router = Router();

  router.get('/unassigned', workflowRoute(
    dependencies, { signInMessage, roles: leadOnly, uuidParams: {} },
    async (actor) => ({ items: await listUnassignedRequests(dependencies, actor) }),
  ));

  router.get('/coordinators', workflowRoute(
    dependencies, { signInMessage, roles: leadOnly, uuidParams: {} },
    async (actor) => ({ items: await listCoordinators(dependencies, actor) }),
  ));

  router.get('/oversight', workflowRoute(
    dependencies, { signInMessage, roles: leadOnly, uuidParams: {} },
    async (actor) => ({ items: await listLeadOversight(dependencies, actor) }),
  ));

  router.get('/oversight/:id', workflowRoute(
    dependencies, { signInMessage, roles: leadOnly },
    (actor, request) => getLeadEventDetail(dependencies, {
      eventRequestId: param(request, 'id'), actor,
    }),
  ));

  router.put('/:id/coordinator', workflowRoute(
    dependencies, { signInMessage, roles: leadOnly },
    (actor, request) => assignCoordinator(dependencies, {
      eventRequestId: param(request, 'id'), actor, input: request.body,
    }),
  ));

  router.get('/:id/assignments', workflowRoute(
    dependencies, { signInMessage, roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD'] },
    async (actor, request) => ({
      items: await listAssignments(dependencies, { eventRequestId: param(request, 'id'), actor }),
    }),
  ));

  return router;
}
