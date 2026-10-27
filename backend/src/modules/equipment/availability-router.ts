import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import {
  checkEquipmentAvailability, getEquipmentAvailabilityContext, listEquipmentAvailabilityEvents,
} from './availability-service.js';

export function createEquipmentAvailabilityRouter(dependencies: WorkflowRouterDependencies): Router {
  const router = Router();
  const options = {
    roles: ['TECHNICAL_SUPPORT_STAFF'] as const,
    signInMessage: 'Sign in as Technical Support Staff to check equipment availability.',
  };
  router.get('/events', workflowRoute(dependencies, { ...options, uuidParams: {} }, async actor => ({
    items: await listEquipmentAvailabilityEvents(dependencies, actor),
  })));
  router.get('/events/:id', workflowRoute(dependencies, options, (actor, request) =>
    getEquipmentAvailabilityContext(dependencies, { actor, eventId: param(request, 'id') })));
  router.post('/events/:id', workflowRoute(dependencies, options, async (actor, request) => ({
    assessment: await checkEquipmentAvailability(dependencies, {
      actor, eventId: param(request, 'id'), input: request.body,
    }),
  })));
  return router;
}
