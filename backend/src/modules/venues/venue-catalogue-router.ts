import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { getCatalogueVenue, listCatalogueVenues, updateCatalogueVenue } from './venue-catalogue-service.js';

export type VenueCatalogueRouterDependencies = WorkflowRouterDependencies;

const signInMessage = 'Sign in to maintain the venue catalogue.';
const staffOnly = ['VENUE_STAFF'] as const;
const venueIdParam = { venueId: 'INVALID_VENUE_ID' };

/**
 * KAN-50. Mount at /api/venues, e.g. app.use('/api/venues', createVenueCatalogueRouter(dependencies)).
 * Routes live under /catalogue so they cannot collide with /availability, /search-venues,
 * /filter-options or /:venueId/unavailability. Every route is Venue Staff only; the service
 * re-checks this for direct callers.
 */
export function createVenueCatalogueRouter(dependencies: VenueCatalogueRouterDependencies): Router {
  const router = Router();

  router.get('/catalogue', workflowRoute(dependencies, {
    signInMessage, roles: staffOnly, uuidParams: {},
  }, async (actor) => ({ items: await listCatalogueVenues(dependencies, { actor }) })));

  router.get('/catalogue/:venueId', workflowRoute(dependencies, {
    signInMessage, roles: staffOnly, uuidParams: venueIdParam,
  }, async (actor, request) => ({
    venue: await getCatalogueVenue(dependencies, { actor, venueId: param(request, 'venueId') }),
  })));

  router.patch('/catalogue/:venueId', workflowRoute(dependencies, {
    signInMessage, roles: staffOnly, uuidParams: venueIdParam,
  }, async (actor, request) => ({
    venue: await updateCatalogueVenue(dependencies,
      { actor, venueId: param(request, 'venueId'), input: request.body }),
  })));

  return router;
}
