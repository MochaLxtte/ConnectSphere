import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { getEquipmentReservationContext, changeEquipmentReservation } from './reservation-service.js';

export function createEquipmentReservationRouter(dependencies: WorkflowRouterDependencies): Router {
  const router = Router();
  const options = {
    roles: ['TECHNICAL_SUPPORT_STAFF'] as const,
    signInMessage: 'Sign in as Technical Support Staff to manage equipment reservations.',
  };
  router.get('/events/:id', workflowRoute(dependencies, options, (actor, request) =>
    getEquipmentReservationContext(dependencies, { actor, eventId: param(request, 'id') })));
  for (const action of ['reserve', 'cancel'] as const) {
    router.post(`/events/:id/requests/:requestId/${action}`, workflowRoute(dependencies, {
      ...options, uuidParams: { id: 'INVALID_EVENT_REQUEST_ID', requestId: 'INVALID_EQUIPMENT_REQUEST_ID' },
    }, (actor, request) => changeEquipmentReservation(dependencies, {
      actor, eventId: param(request, 'id'), requestId: param(request, 'requestId'), action, input: request.body,
    })));
  }
  return router;
}
