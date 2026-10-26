import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { cancelEquipmentLine, getEventEquipmentPlan, listEquipmentRequests, listEquipmentTypes, replaceReservedEquipmentLine, reviewEquipmentRequest, saveEquipmentRequest } from './equipment-service.js';

export function createEquipmentRouter(dependencies: WorkflowRouterDependencies) {
  const router = Router();
  router.get('/events/:id/equipment-requests', workflowRoute(dependencies, {
    signInMessage: 'Sign in to view event equipment requests.', roles: ['EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF'],
    uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' },
  }, async (actor, request) => ({ plan: await getEventEquipmentPlan(dependencies.pool,
    { eventId: param(request, 'id'), actor }) })));
  router.get('/equipment-types', workflowRoute(dependencies, {
    signInMessage: 'Sign in to view equipment types.', roles: ['EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF'], uuidParams: {},
  }, async () => ({ items: await listEquipmentTypes(dependencies.pool) })));
  router.post('/events/:id/equipment-requests', workflowRoute(dependencies, {
    signInMessage: 'Sign in to request equipment.', roles: ['EVENT_COORDINATOR'],
    uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' }, successStatus: 201,
  }, async (actor, request) => ({ request: await saveEquipmentRequest(dependencies.pool,
    { eventId: param(request, 'id'), actor, input: request.body }) })));
  router.get('/equipment-requests', workflowRoute(dependencies, {
    signInMessage: 'Sign in to view equipment requests.',
    roles: ['EVENT_COORDINATOR', 'TECHNICAL_SUPPORT_STAFF'], uuidParams: {},
  }, async (actor, request) => {
    const eventId = typeof request.query.eventId === 'string' ? request.query.eventId : undefined;
    return { items: await listEquipmentRequests(dependencies.pool, { actor, ...(eventId ? { eventId } : {}) }) };
  }));
  router.post('/equipment-requests/:id/review', workflowRoute(dependencies, {
    signInMessage: 'Sign in to review equipment requests.', roles: ['TECHNICAL_SUPPORT_STAFF'],
    uuidParams: { id: 'INVALID_EQUIPMENT_REQUEST_ID' },
  }, async (actor, request) => ({ request: await reviewEquipmentRequest(dependencies.pool,
    { lineId: param(request, 'id'), actor, input: request.body }) })));
  router.post('/equipment-requests/:id/replace', workflowRoute(dependencies, {
    signInMessage: 'Sign in to replace a reserved equipment line.', roles: ['EVENT_COORDINATOR'],
    uuidParams: { id: 'INVALID_EQUIPMENT_REQUEST_ID' }, successStatus: 201,
  }, async (actor, request) => ({ replacement: await replaceReservedEquipmentLine(dependencies.pool,
    { lineId: param(request, 'id'), actor, input: request.body }) })));
  router.post('/equipment-requests/:id/cancel', workflowRoute(dependencies, {
    signInMessage: 'Sign in to cancel an equipment request.', roles: ['EVENT_COORDINATOR'],
    uuidParams: { id: 'INVALID_EQUIPMENT_REQUEST_ID' },
  }, async (actor, request) => ({ request: await cancelEquipmentLine(dependencies.pool,
    { lineId: param(request, 'id'), actor, input: request.body }) })));
  return router;
}
