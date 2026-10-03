import { Router } from 'express';
import { workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { listVenueAvailability, parseAvailabilityWindow, VENUE_CALENDAR_ROLES } from './availability.js';

export type VenueAvailabilityRouterDependencies = WorkflowRouterDependencies;

const signInMessage = 'Sign in to view venue availability.';

/**
 * KAN-51. Mount at /api/venues. workflowRoute answers 401 without a verified session and 403 for
 * roles outside the calendar group before the window is parsed or any venue data is read.
 */
export function createVenueAvailabilityRouter(dependencies: VenueAvailabilityRouterDependencies) {
  const router = Router();

  router.get('/availability', workflowRoute(
    dependencies, { signInMessage, roles: VENUE_CALENDAR_ROLES, uuidParams: {} },
    async (actor, request) => {
      const window = parseAvailabilityWindow(request.query);
      return { ...window, items: await listVenueAvailability(dependencies, actor, window) };
    },
  ));

  return router;
}
