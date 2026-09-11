import { Router, type Request } from 'express';
import {
  getReviewableRequestDetail,
  listReviewableRequests,
  SubmittedRequestNotFoundError,
  type QueueActor,
  type SubmittedRequestQueryDependencies,
} from './submitted-requests.js';

export interface SubmittedRequestsRouterDependencies extends SubmittedRequestQueryDependencies {
  /**
   * KAN-25 must verify the session and resolve the trusted app_users identity/role.
   * Return null for absent/invalid credentials; throw for verification service failures.
   * Never construct this identity from an unverified token, request body or role header.
   */
  authenticate(request: Request): Promise<QueueActor | null>;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailableRequest = {
  error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
};

/**
 * Mount only with real authentication and an explicit coordinator-visibility policy.
 *
 * GET /:id is also a proposed route for KAN-34 (organiser's own draft) and KAN-16
 * (organiser-facing status) in docs/architecture/api-contract.md. This handler only acts
 * for a verified EVENT_COORDINATOR and calls next() for any other actor, so another
 * router mounted after this one can still handle the same path for its own actor. See the
 * "GET /api/events/:id owner collision" note in docs/requirements/assumptions-and-questions.md.
 */
export function createSubmittedRequestsRouter(dependencies: SubmittedRequestsRouterDependencies) {
  const router = Router();

  router.get('/', async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor) {
        response.status(401).json({
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view submitted event requests.' },
        });
        return;
      }
      if (actor.role !== 'EVENT_COORDINATOR') {
        response.status(403).json({
          error: { code: 'VIEW_FORBIDDEN', message: 'Only event coordinators can view the review queue.' },
        });
        return;
      }

      const items = await listReviewableRequests(dependencies, actor);
      response.status(200).json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor) {
        response.status(401).json({
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view this event request.' },
        });
        return;
      }
      // Not our actor: defer to a handler for KAN-34/KAN-16 mounted after this router.
      if (actor.role !== 'EVENT_COORDINATOR') {
        next();
        return;
      }

      response.set('Cache-Control', 'no-store');
      if (!uuid.test(request.params.id)) {
        response.status(400).json({
          error: { code: 'INVALID_EVENT_REQUEST_ID', message: 'The event request ID must be a UUID.' },
        });
        return;
      }

      const detail = await getReviewableRequestDetail(dependencies, actor as QueueActor, request.params.id);
      response.status(200).json(detail);
    } catch (error) {
      if (error instanceof SubmittedRequestNotFoundError) {
        response.set('Cache-Control', 'no-store');
        response.status(404).json(unavailableRequest);
        return;
      }
      next(error);
    }
  });

  return router;
}
