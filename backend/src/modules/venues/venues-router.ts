import { Router, type Request, type Response } from 'express';
import { VenueRuleError } from './errors.js';
import { authenticated, sendError } from './http.js';
import { uuidPattern, type VenueActor, type VenuesRouterDependencies } from './types.js';
import {
  parseAvailabilityRange, parseUnavailabilityInput, parseVenueCreateInput, parseVenueFilters,
  parseVenueUpdateInput,
} from './venue-input.js';
import {
  createUnavailability, createVenue, deleteUnavailability, getVenue, getVenueAvailability,
  getVenueSuitability, listVenues, updateVenue,
} from './venue-service.js';

const signIn = 'Sign in to view venues.';

function requireStaff(actor: VenueActor): void {
  if (actor.role !== 'VENUE_STAFF') {
    throw new VenueRuleError('FORBIDDEN', 'VENUE_FORBIDDEN', 'Only venue staff can manage venues.');
  }
}

/** Returns the validated :id, or answers 400 and returns null. */
function venueId(request: Request, response: Response): string | null {
  const id = String(request.params.id ?? '');
  if (uuidPattern.test(id)) return id;
  sendError(response, 400, 'INVALID_VENUE_ID', 'The venue ID must be a UUID.');
  return null;
}

/** CF-08 to CF-11. Mount at /api/venues with real authentication. */
export function createVenuesRouter(dependencies: VenuesRouterDependencies) {
  const router = Router();
  const { pool } = dependencies;

  router.get('/', authenticated(dependencies, signIn, async (actor, request, response) => {
    const items = await listVenues(pool, actor, parseVenueFilters(request.query));
    response.status(200).json({ items });
  }));

  router.post('/', authenticated(dependencies, signIn, async (actor, request, response) => {
    requireStaff(actor);
    response.status(201).json(await createVenue(pool, parseVenueCreateInput(request.body)));
  }));

  router.get('/:id', authenticated(dependencies, signIn, async (actor, request, response) => {
    const id = venueId(request, response);
    if (id) response.status(200).json(await getVenue(pool, actor, id));
  }));

  router.patch('/:id', authenticated(dependencies, signIn, async (actor, request, response) => {
    requireStaff(actor);
    const id = venueId(request, response);
    if (!id) return;
    response.status(200).json(await updateVenue(pool, actor, id, parseVenueUpdateInput(request.body)));
  }));

  router.get('/:id/availability', authenticated(dependencies, signIn, async (actor, request, response) => {
    const id = venueId(request, response);
    if (!id) return;
    const range = parseAvailabilityRange(request.query);
    response.status(200).json(await getVenueAvailability(pool, actor, id, range));
  }));

  router.get('/:id/suitability', authenticated(dependencies, signIn, async (actor, request, response) => {
    if (actor.role !== 'EVENT_ORGANISER' && actor.role !== 'EVENT_COORDINATOR') {
      throw new VenueRuleError(
        'FORBIDDEN', 'VENUE_FORBIDDEN', 'Only event organisers and coordinators can check suitability.',
      );
    }
    const id = venueId(request, response);
    if (!id) return;
    const eventRequestId = request.query.eventRequestId;
    if (typeof eventRequestId !== 'string' || !uuidPattern.test(eventRequestId)) {
      sendError(response, 400, 'INVALID_EVENT_REQUEST_ID', 'eventRequestId must be a UUID.');
      return;
    }
    response.status(200).json(await getVenueSuitability(pool, actor, id, eventRequestId));
  }));

  router.post('/:id/unavailability', authenticated(dependencies, signIn, async (actor, request, response) => {
    requireStaff(actor);
    const id = venueId(request, response);
    if (!id) return;
    const input = parseUnavailabilityInput(request.body);
    response.status(201).json(await createUnavailability(pool, actor, id, input));
  }));

  router.delete('/:id/unavailability/:blockId', authenticated(dependencies, signIn, async (actor, request, response) => {
    requireStaff(actor);
    const id = venueId(request, response);
    if (!id) return;
    const blockId = String(request.params.blockId ?? '');
    if (!uuidPattern.test(blockId)) {
      sendError(response, 400, 'INVALID_VENUE_UNAVAILABILITY_ID', 'The blocked period ID must be a UUID.');
      return;
    }
    await deleteUnavailability(pool, id, blockId);
    response.status(200).json({ deleted: true, id: blockId });
  }));

  return router;
}
