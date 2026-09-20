import { Router, type Request } from 'express';
import { isUuid } from './equipment-input.js';
import {
  cancelEquipmentRequest, createEquipmentRequest, decideEquipmentRequest, listEquipmentRequests,
  updateEquipmentRequest,
} from './equipment-requests.js';
import { EquipmentForbiddenError, EquipmentInputError } from './errors.js';
import { authenticated } from './http.js';
import {
  parseEquipmentDecisionInput, parseEquipmentRequestCreateInput, parseEquipmentRequestFilter,
  parseEquipmentRequestUpdateInput,
} from './request-input.js';
import type { EquipmentActor, EquipmentDependencies } from './types.js';

function requestId(request: Request): string {
  const id = request.params.id;
  if (!isUuid(id)) {
    throw new EquipmentInputError('INVALID_EQUIPMENT_REQUEST_ID', 'The equipment request ID must be a UUID.');
  }
  return id;
}

/** Role gates run before IDs and bodies are inspected, so other roles learn nothing. */
function assertRole(actor: EquipmentActor, roles: readonly EquipmentActor['role'][], message: string): void {
  if (!roles.includes(actor.role)) throw new EquipmentForbiddenError('EQUIPMENT_REQUEST_FORBIDDEN', message);
}

const planners = ['EVENT_ORGANISER', 'EVENT_COORDINATOR'] as const;
const plannersOnly = 'Only event organisers and assigned coordinators can manage equipment requests.';

/** Mount at /api/equipment-requests with verified authentication. CF-15 requests, CF-17 decisions. */
export function createEquipmentRequestsRouter(dependencies: EquipmentDependencies) {
  const router = Router();
  const { pool } = dependencies;
  const signIn = 'Sign in to manage equipment requests.';

  router.get('/', authenticated(dependencies, 'Sign in to view equipment requests.', async (actor, request, response) => {
    assertRole(actor, [...planners, 'TECHNICAL_SUPPORT_STAFF'],
      'Your role cannot view equipment requests.');
    const filter = parseEquipmentRequestFilter(request.query);
    const listing = await listEquipmentRequests(pool, actor, filter);
    response.status(200).json({ items: listing.items });
  }));

  router.post('/', authenticated(dependencies, signIn, async (actor, request, response) => {
    assertRole(actor, planners, plannersOnly);
    const input = parseEquipmentRequestCreateInput(request.body);
    response.status(201).json(await createEquipmentRequest(pool, actor, input));
  }));

  router.patch('/:id', authenticated(dependencies, signIn, async (actor, request, response) => {
    assertRole(actor, planners, plannersOnly);
    const id = requestId(request);
    const input = parseEquipmentRequestUpdateInput(request.body);
    response.status(200).json(await updateEquipmentRequest(pool, actor, id, input));
  }));

  router.post('/:id/cancel', authenticated(dependencies, signIn, async (actor, request, response) => {
    assertRole(actor, planners, plannersOnly);
    response.status(200).json(await cancelEquipmentRequest(pool, actor, requestId(request)));
  }));

  router.post('/:id/decision', authenticated(dependencies, signIn, async (actor, request, response) => {
    assertRole(actor, ['TECHNICAL_SUPPORT_STAFF'], 'Only technical support staff can decide equipment requests.');
    const id = requestId(request);
    const input = parseEquipmentDecisionInput(request.body);
    response.status(200).json(await decideEquipmentRequest(pool, actor, id, input));
  }));

  return router;
}
