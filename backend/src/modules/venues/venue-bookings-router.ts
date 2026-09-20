import { Router, type Request, type Response } from 'express';
import {
  parseBookingDecisionInput, parseBookingListQuery, parseBookingRequestInput,
} from './booking-input.js';
import {
  cancelVenueBooking, decideVenueBooking, listBookingQueue, listEventBookings, requestVenueBooking,
} from './booking-service.js';
import { VenueRuleError } from './errors.js';
import { authenticated, sendError } from './http.js';
import { uuidPattern, type VenueActor, type VenuesRouterDependencies } from './types.js';

const signIn = 'Sign in to manage venue bookings.';

const arranges = (actor: VenueActor) =>
  actor.role === 'EVENT_ORGANISER' || actor.role === 'EVENT_COORDINATOR';

function forbidden(message: string): VenueRuleError {
  return new VenueRuleError('FORBIDDEN', 'VENUE_BOOKING_FORBIDDEN', message);
}

function bookingId(request: Request, response: Response): string | null {
  const id = String(request.params.id ?? '');
  if (uuidPattern.test(id)) return id;
  sendError(response, 400, 'INVALID_VENUE_BOOKING_ID', 'The venue booking ID must be a UUID.');
  return null;
}

/** CF-12 to CF-14. Mount at /api/venue-bookings with real authentication. */
export function createVenueBookingsRouter(dependencies: VenuesRouterDependencies) {
  const router = Router();
  const { pool } = dependencies;

  router.get('/', authenticated(dependencies, signIn, async (actor, request, response) => {
    const staff = actor.role === 'VENUE_STAFF';
    if (!staff && !arranges(actor)) throw forbidden('Your role cannot view venue bookings.');
    const query = parseBookingListQuery(request.query, staff);
    const items = query.kind === 'QUEUE'
      ? await listBookingQueue(pool, query.status)
      : await listEventBookings(pool, actor, query.eventRequestId);
    response.status(200).json({ items });
  }));

  router.post('/', authenticated(dependencies, signIn, async (actor, request, response) => {
    if (!arranges(actor)) throw forbidden('Only event organisers and coordinators can request a venue.');
    const input = parseBookingRequestInput(request.body);
    response.status(201).json(await requestVenueBooking(pool, actor, input));
  }));

  router.post('/:id/cancel', authenticated(dependencies, signIn, async (actor, request, response) => {
    if (!arranges(actor)) throw forbidden('Only the requester can cancel a venue booking.');
    const id = bookingId(request, response);
    if (id) response.status(200).json(await cancelVenueBooking(pool, actor, id));
  }));

  router.post('/:id/decision', authenticated(dependencies, signIn, async (actor, request, response) => {
    if (actor.role !== 'VENUE_STAFF') throw forbidden('Only venue staff can decide venue bookings.');
    const id = bookingId(request, response);
    if (!id) return;
    const input = parseBookingDecisionInput(request.body);
    response.status(200).json(await decideVenueBooking(pool, actor, id, input));
  }));

  return router;
}
