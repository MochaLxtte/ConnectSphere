import { Router, type Request } from 'express';
import { getEquipmentAvailability, listEquipmentAvailability } from './availability.js';
import {
  isUuid, parseAvailabilityWindow, parseEquipmentListFilter, parseEquipmentTypeCreateInput,
  parseEquipmentTypeUpdateInput,
} from './equipment-input.js';
import {
  canManageEquipment, createEquipmentType, getEquipmentType, listEquipmentTypes, updateEquipmentType,
} from './equipment-types.js';
import { EquipmentForbiddenError, EquipmentInputError } from './errors.js';
import { authenticated } from './http.js';
import type { EquipmentActor, EquipmentDependencies } from './types.js';

function equipmentId(request: Request): string {
  const id = request.params.id;
  if (!isUuid(id)) throw new EquipmentInputError('INVALID_EQUIPMENT_ID', 'The equipment type ID must be a UUID.');
  return id;
}

function assertStaff(actor: EquipmentActor): void {
  if (!canManageEquipment(actor)) {
    throw new EquipmentForbiddenError(
      'EQUIPMENT_FORBIDDEN', 'Only technical support staff can manage equipment types.',
    );
  }
}

/** Mount at /api/equipment with verified authentication. CF-15 catalogue and CF-16 availability. */
export function createEquipmentRouter(dependencies: EquipmentDependencies) {
  const router = Router();
  const { pool } = dependencies;
  const signIn = 'Sign in to view equipment.';

  router.get('/', authenticated(dependencies, signIn, async (actor, request, response) => {
    const filter = parseEquipmentListFilter(request.query);
    response.status(200).json({ items: await listEquipmentTypes(pool, actor, filter) });
  }));

  // Registered before /:id so "availability" is never read as an equipment type ID.
  router.get('/availability', authenticated(dependencies, signIn, async (_actor, request, response) => {
    const window = parseAvailabilityWindow(request.query);
    response.status(200).json({
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      items: await listEquipmentAvailability(pool, window),
    });
  }));

  router.get('/:id', authenticated(dependencies, signIn, async (actor, request, response) => {
    response.status(200).json(await getEquipmentType(pool, actor, equipmentId(request)));
  }));

  router.get('/:id/availability', authenticated(dependencies, signIn, async (actor, request, response) => {
    const id = equipmentId(request);
    const window = parseAvailabilityWindow(request.query);
    response.status(200).json(await getEquipmentAvailability(
      pool, id, window, { includeInactive: canManageEquipment(actor) },
    ));
  }));

  router.post('/', authenticated(dependencies, 'Sign in to manage equipment.', async (actor, request, response) => {
    assertStaff(actor);
    const input = parseEquipmentTypeCreateInput(request.body);
    response.status(201).json(await createEquipmentType(pool, actor, input));
  }));

  router.patch('/:id', authenticated(dependencies, 'Sign in to manage equipment.', async (actor, request, response) => {
    assertStaff(actor);
    const id = equipmentId(request);
    const input = parseEquipmentTypeUpdateInput(request.body);
    response.status(200).json(await updateEquipmentType(pool, actor, id, input));
  }));

  return router;
}
