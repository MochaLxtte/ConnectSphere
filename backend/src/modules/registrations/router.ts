import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import { getRegistrationRoster, listOwnRegistrations, withdrawRegistration } from './service.js';

export function createRegistrationRouter(deps: WorkflowRouterDependencies) {
  const router = Router();
  router.get('/registrations/mine', workflowRoute(deps, {
    signInMessage: 'Sign in to view your registrations.', roles: ['ATTENDEE'], uuidParams: {},
  }, actor => listOwnRegistrations(deps.pool, actor)));
  router.post('/registrations/:id/withdraw', workflowRoute(deps, {
    signInMessage: 'Sign in to withdraw your registration.', roles: ['ATTENDEE'], uuidParams: { id: 'INVALID_REGISTRATION_ID' },
  }, (actor, req) => withdrawRegistration(deps.pool, actor, param(req, 'id'), req.body)));
  router.get('/events/:id/registrations', workflowRoute(deps, {
    signInMessage: 'Sign in to view registrations.', roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'],
  }, (actor, req) => getRegistrationRoster(deps.pool, actor, param(req, 'id'))));
  return router;
}
