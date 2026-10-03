import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { parseBookingFilter } from './booking-input.js';
import { decideVenueBooking, getVenueBooking, listVenueBookings } from './booking-service.js';

export function createVenueBookingsRouter(dependencies: WorkflowRouterDependencies): Router {
  const router = Router();
  const readOptions = {
    signInMessage: 'Sign in to view venue booking requests.',
    roles: ['VENUE_STAFF', 'EVENT_COORDINATOR'] as const,
  };
  router.get('/', workflowRoute(dependencies, { ...readOptions, uuidParams: {} }, async (actor, request) => {
    const eventRequestId = parseBookingFilter(request.query);
    return { items: await listVenueBookings(dependencies,
      { actor, ...(eventRequestId === undefined ? {} : { eventRequestId }) }) };
  }));
  router.get('/:id', workflowRoute(dependencies, {
    ...readOptions, uuidParams: { id: 'INVALID_VENUE_BOOKING_ID' },
  }, async (actor, request) => ({
    booking: await getVenueBooking(dependencies, { actor, bookingId: param(request, 'id') }),
  })));
  router.post('/:id/decision', workflowRoute(dependencies, {
    signInMessage: 'Sign in to decide a venue booking request.',
    roles: ['VENUE_STAFF'], uuidParams: { id: 'INVALID_VENUE_BOOKING_ID' },
  }, async (actor, request) => ({
    booking: await decideVenueBooking(dependencies,
      { actor, bookingId: param(request, 'id'), input: request.body }),
  })));
  return router;
}
