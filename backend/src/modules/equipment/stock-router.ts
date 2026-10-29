import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { getEquipmentStock, listEquipmentStock, updateEquipmentStock } from './stock-service.js';

/** KAN-18. Mounted at /api/equipment/stock; every route is limited to Technical Support Staff. */
export function createEquipmentStockRouter(dependencies: WorkflowRouterDependencies): Router {
  const router = Router();
  const options = {
    roles: ['TECHNICAL_SUPPORT_STAFF'] as const,
    signInMessage: 'Sign in as Technical Support Staff to manage equipment stock.',
  };
  router.get('/', workflowRoute(dependencies, { ...options, uuidParams: {} }, async actor => ({
    items: await listEquipmentStock(dependencies, { actor }),
  })));
  router.get('/:id', workflowRoute(dependencies, { ...options, uuidParams: { id: 'INVALID_EQUIPMENT_TYPE_ID' } },
    (actor, request) => getEquipmentStock(dependencies, { actor, typeId: param(request, 'id') })));
  router.patch('/:id', workflowRoute(dependencies, { ...options, uuidParams: { id: 'INVALID_EQUIPMENT_TYPE_ID' } },
    (actor, request) => updateEquipmentStock(dependencies, { actor, typeId: param(request, 'id'), input: request.body })));
  return router;
}
