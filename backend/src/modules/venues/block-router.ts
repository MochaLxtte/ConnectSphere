import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { createVenueBlock, deleteVenueBlock, listVenueBlocks } from './block-service.js';

export type VenueBlockRouterDependencies = WorkflowRouterDependencies;

const signInMessage = 'Sign in to manage venue-unavailability blocks.';
const staffOnly = ['VENUE_STAFF'] as const;
const venueIdParam = { venueId: 'INVALID_VENUE_ID' };

/**
 * KAN-55. Mount at /api/venues, e.g. app.use('/api/venues', createVenueBlockRouter(dependencies)).
 * Every route is Venue Staff only; the service re-checks this for direct callers.
 */
export function createVenueBlockRouter(dependencies: VenueBlockRouterDependencies): Router {
  const router = Router();

  router.get('/:venueId/unavailability', workflowRoute(dependencies, {
    signInMessage, roles: staffOnly, uuidParams: venueIdParam,
  }, async (actor, request) => ({
    items: await listVenueBlocks(dependencies, { actor, venueId: param(request, 'venueId') }),
  })));

  router.post('/:venueId/unavailability', workflowRoute(dependencies, {
    signInMessage, roles: staffOnly, uuidParams: venueIdParam, successStatus: 201,
  }, async (actor, request) => ({
    block: await createVenueBlock(dependencies,
      { actor, venueId: param(request, 'venueId'), input: request.body }),
  })));

  router.delete('/:venueId/unavailability/:blockId', workflowRoute(dependencies, {
    signInMessage, roles: staffOnly,
    uuidParams: { ...venueIdParam, blockId: 'INVALID_VENUE_BLOCK_ID' },
  }, async (actor, request) => {
    const blockId = param(request, 'blockId');
    await deleteVenueBlock(dependencies, { actor, blockId });
    return { id: blockId };
  }));

  return router;
}
