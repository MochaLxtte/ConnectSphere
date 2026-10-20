import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { parseBookingFilter } from './booking-input.js';
import {
  cancelVenueHold, createVenueBooking, decideVenueBooking, getVenueBooking, listVenueBookings,
  placeVenueHold,
} from './booking-service.js';

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
  // KAN-83: explicit Venue Staff hold with a deadline, and cancellation with a reason.
  router.post('/:id/hold', workflowRoute(dependencies, {
    signInMessage: 'Sign in to place a venue hold.',
    roles: ['VENUE_STAFF'], uuidParams: { id: 'INVALID_VENUE_BOOKING_ID' },
  }, async (actor, request) => ({
    booking: await placeVenueHold(dependencies,
      { actor, bookingId: param(request, 'id'), input: request.body }),
  })));
  router.post('/:id/hold/cancel', workflowRoute(dependencies, {
    signInMessage: 'Sign in to cancel a venue hold.',
    roles: ['VENUE_STAFF'], uuidParams: { id: 'INVALID_VENUE_BOOKING_ID' },
  }, async (actor, request) => ({
    booking: await cancelVenueHold(dependencies,
      { actor, bookingId: param(request, 'id'), input: request.body }),
  })));
  return router;
}

/**
 * KAN-53 booking submission, nested under events so `:id` is the event request, e.g.
 *   app.use('/api/events', createVenueBookingSubmissionRouter(dependencies));
 * Kept separate from createVenueBookingsRouter so its `:id` param never means a booking ID.
 */
export function createVenueBookingSubmissionRouter(dependencies: WorkflowRouterDependencies): Router {
  const router = Router();
  router.post('/:id/venue-bookings', workflowRoute(dependencies, {
    signInMessage: 'Sign in to submit a venue booking request.',
    roles: ['EVENT_COORDINATOR'], uuidParams: { id: 'INVALID_EVENT_REQUEST_ID' }, successStatus: 201,
  }, async (actor, request) => ({
    booking: await createVenueBooking(dependencies,
      { actor, eventRequestId: param(request, 'id'), input: request.body }),
  })));
  return router;
}
