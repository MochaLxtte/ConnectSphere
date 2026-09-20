import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import type { UserRole } from '../auth/types.js';
import { RegistrationStateError } from './registration-eligibility.js';
import {
  getDiscoverableEvent,
  listAttendees,
  listDiscoverableEvents,
  listMyRegistrations,
  registerForEvent,
  RegistrationEventNotFoundError,
  RegistrationForbiddenError,
  withdrawFromEvent,
  type RegistrationActor,
} from './registration-service.js';

export interface RegistrationsRouterDependencies {
  pool: Pick<Pool, 'query' | 'connect'>;
  /**
   * Must verify the session and resolve the trusted app_users identity/role.
   * Return null for absent/invalid credentials; throw for verification service failures.
   */
  authenticate(request: Request): Promise<{ id: string; role: UserRole } | null>;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailableEvent = { error: { code: 'EVENT_NOT_FOUND', message: 'The event was not found.' } };

/** CF-18 attendee registration. Mount at /api/registrations with real authentication. */
export function createRegistrationsRouter(dependencies: RegistrationsRouterDependencies) {
  const router = Router();

  type Handler = (actor: RegistrationActor, request: Request, response: Response) => Promise<void>;

  /** Shared boundary: no-store, verified identity, UUID validation and error mapping. */
  const handle = (options: { attendeeOnly?: boolean; eventId?: boolean }, handler: Handler) =>
    async (request: Request, response: Response, next: (error: unknown) => void) => {
      response.set('Cache-Control', 'no-store');
      try {
        const actor = await dependencies.authenticate(request);
        if (!actor) {
          response.status(401).json({
            error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to use event registration.' },
          });
          return;
        }
        if (options.attendeeOnly && actor.role !== 'ATTENDEE') {
          response.status(403).json({
            error: {
              code: 'REGISTRATION_FORBIDDEN',
              message: 'Only attendees can register for or withdraw from events.',
            },
          });
          return;
        }
        if (options.eventId && !uuid.test(String(request.params.id))) {
          response.status(400).json({
            error: { code: 'INVALID_EVENT_ID', message: 'The event ID must be a UUID.' },
          });
          return;
        }
        await handler({ id: actor.id, role: actor.role }, request, response);
      } catch (error) {
        // Missing, non-discoverable and unrelated events are indistinguishable to the caller.
        if (error instanceof RegistrationEventNotFoundError) {
          response.status(404).json(unavailableEvent);
          return;
        }
        if (error instanceof RegistrationForbiddenError) {
          response.status(403).json({ error: { code: error.code, message: error.message } });
          return;
        }
        if (error instanceof RegistrationStateError) {
          response.status(409).json({
            error: { code: error.code, message: error.message, ...(error.reason ? { reason: error.reason } : {}) },
          });
          return;
        }
        next(error);
      }
    };

  router.get('/events', handle({}, async (actor, _request, response) => {
    response.status(200).json({ items: await listDiscoverableEvents(dependencies, actor) });
  }));

  router.get('/mine', handle({}, async (actor, _request, response) => {
    response.status(200).json({ items: await listMyRegistrations(dependencies, actor) });
  }));

  router.get('/events/:id', handle({ eventId: true }, async (actor, request, response) => {
    response.status(200).json(await getDiscoverableEvent(dependencies, actor, String(request.params.id)));
  }));

  router.post('/events/:id/register', handle({ attendeeOnly: true, eventId: true }, async (actor, request, response) => {
    response.status(201).json(await registerForEvent(dependencies, actor, String(request.params.id)));
  }));

  router.post('/events/:id/withdraw', handle({ attendeeOnly: true, eventId: true }, async (actor, request, response) => {
    response.status(200).json(await withdrawFromEvent(dependencies, actor, String(request.params.id)));
  }));

  router.get('/events/:id/attendees', handle({ eventId: true }, async (actor, request, response) => {
    // Other roles receive the same 404 as an unrelated organiser or coordinator.
    response.status(200).json(await listAttendees(dependencies, actor, String(request.params.id)));
  }));

  return router;
}
