import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { getAttendeeEvent, listAttendeeEvents, listOwnRegistrations, registerForEvent } from './registration-service.js';

/** KAN-14. Mounted at /api/attendee; every route is limited to signed-in attendees and scoped to the caller. */
export function createAttendeeRegistrationRouter(dependencies: WorkflowRouterDependencies): Router {
  const router = Router();
  const options = { roles: ['ATTENDEE'] as const, signInMessage: 'Sign in as an attendee to view and register for events.' };
  router.get('/events', workflowRoute(dependencies, { ...options, uuidParams: {} }, async actor => ({
    items: await listAttendeeEvents(dependencies, { actor }),
  })));
  router.get('/registrations', workflowRoute(dependencies, { ...options, uuidParams: {} }, async actor => ({
    items: await listOwnRegistrations(dependencies, { actor }),
  })));
  router.get('/events/:id', workflowRoute(dependencies, { ...options, uuidParams: { id: 'INVALID_EVENT_ID' } },
    (actor, request) => getAttendeeEvent(dependencies, { actor, eventId: param(request, 'id') })));
  router.post('/events/:id/register', workflowRoute(dependencies, { ...options, uuidParams: { id: 'INVALID_EVENT_ID' }, successStatus: 201 },
    (actor, request) => registerForEvent(dependencies, { actor, eventId: param(request, 'id'), input: request.body })));
  return router;
}
