import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import {
  decideSafetyReview, getEventSafety, getSafetyReview, listSafetyQueue, startPreparation, submitSafetyReview,
} from './service.js';

const eventId = { id: 'INVALID_EVENT_REQUEST_ID' };
const reviewId = { id: 'INVALID_SAFETY_REVIEW_ID' };

/** KAN-84 / CR-6: safety review rounds and the preparation gate. Mounted under /api. */
export function createSafetyRouter(dependencies: WorkflowRouterDependencies) {
  const router = Router();
  const { pool } = dependencies;
  router.get('/events/:id/safety', workflowRoute(dependencies, {
    signInMessage: 'Sign in to view the safety review.', roles: ['EVENT_ORGANISER', 'EVENT_COORDINATOR'], uuidParams: eventId,
  }, (actor, request) => getEventSafety(pool, { eventRequestId: param(request, 'id'), actor })));
  router.post('/events/:id/safety-reviews', workflowRoute(dependencies, {
    signInMessage: 'Sign in to submit a safety review.', roles: ['EVENT_COORDINATOR'], uuidParams: eventId, successStatus: 201,
  }, (actor, request) => submitSafetyReview(pool, { eventRequestId: param(request, 'id'), actor, input: request.body })));
  router.post('/events/:id/preparation/start', workflowRoute(dependencies, {
    signInMessage: 'Sign in to start event preparation.', roles: ['EVENT_COORDINATOR'], uuidParams: eventId,
  }, (actor, request) => startPreparation(pool, { eventRequestId: param(request, 'id'), actor, input: request.body })));
  router.get('/safety-reviews', workflowRoute(dependencies, {
    signInMessage: 'Sign in to view safety reviews.', roles: ['SAFETY_OFFICER'], uuidParams: {},
  }, actor => listSafetyQueue(pool, actor)));
  router.get('/safety-reviews/:id', workflowRoute(dependencies, {
    signInMessage: 'Sign in to view this safety review.', roles: ['SAFETY_OFFICER'], uuidParams: reviewId,
  }, (actor, request) => getSafetyReview(pool, { reviewId: param(request, 'id'), actor })));
  router.post('/safety-reviews/:id/decision', workflowRoute(dependencies, {
    signInMessage: 'Sign in to decide this safety review.', roles: ['SAFETY_OFFICER'], uuidParams: reviewId,
  }, (actor, request) => decideSafetyReview(pool, { reviewId: param(request, 'id'), actor, input: request.body })));
  return router;
}
