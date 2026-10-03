import { Router } from 'express';
import { workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { listVenueFilterOptions, parseVenueSearchQuery, searchVenues } from './venue-search.js';
 
export type VenueRouterDependencies = WorkflowRouterDependencies;
 
const signInMessage = 'Sign in to search venues.';
const coordinatorOnly = ['EVENT_COORDINATOR'] as const;
 
/**
 * Venue search for coordinators. Mount at /api/venues, e.g.
 *   app.use('/api/venues', createVenueRouter(workflowRouterDependencies));
 * workflowRoute rejects unauthenticated callers (401) and any non-coordinator role (403).
 */
export function createVenueRouter(dependencies: VenueRouterDependencies) {
  const router = Router();
 
  router.get('/filter-options', workflowRoute(
    dependencies, { signInMessage, roles: coordinatorOnly, uuidParams: {} },
    (actor) => listVenueFilterOptions(dependencies, actor),
  ));
 
  router.get('/search-venues', workflowRoute(
    dependencies, { signInMessage, roles: coordinatorOnly, uuidParams: {} },
    async (actor, request) => ({
      items: await searchVenues(dependencies, actor, parseVenueSearchQuery(request.query)),
    }),
  ));
 
  return router;
}