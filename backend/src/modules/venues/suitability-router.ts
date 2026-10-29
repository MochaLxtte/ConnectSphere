import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { checkVenueSuitability, getVenueSuitabilityContext } from './suitability-service.js';
import { parseSuitabilityBookingId } from './suitability-input.js';

/** Mount under /api/events. POST assesses only; it never creates a booking or changes an event. */
export function createVenueSuitabilityRouter(dependencies: WorkflowRouterDependencies): Router {
  const router = Router();
  const options = {
    signInMessage: 'Sign in to check venue suitability.',
    roles: ['EVENT_COORDINATOR'] as const,
    uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' },
  };
  router.get('/:id/venue-suitability', workflowRoute(dependencies, options, (actor, request) => {
    const bookingId = parseSuitabilityBookingId(request.query.bookingId);
    return getVenueSuitabilityContext(dependencies, { actor, eventId: param(request, 'id'),
      ...(bookingId ? { bookingId } : {}) });
  }));
  router.post('/:id/venue-suitability', workflowRoute(dependencies, options, async (actor, request) => ({
    assessment: await checkVenueSuitability(dependencies, { actor, eventId: param(request, 'id'), input: request.body }),
  })));
  return router;
}
