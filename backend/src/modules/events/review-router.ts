import { Router, type Request } from 'express';
import {
  recordInitialReview,
  ReviewRequestNotFoundError,
  type ReviewActor,
  type ReviewPersistenceDependencies,
} from './review-decision.js';
import { ReviewEligibilityError } from './review-eligibility.js';
import { parseReviewInput, ReviewInputError } from './review-input.js';

export interface ReviewRouterDependencies extends ReviewPersistenceDependencies {
  /**
   * KAN-25 must verify the session and resolve the trusted app_users identity/role.
   * Return null for absent/invalid credentials; throw for verification service failures.
   * Never construct this identity from an unverified token, request body or role header.
   */
  authenticate(request: Request): Promise<ReviewActor | null>;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailableRequest = {
  error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
};

/** Mount only with real authentication and an explicit request-specific review policy. */
export function createReviewRouter(dependencies: ReviewRouterDependencies) {
  const router = Router();

  router.post('/:id/reviews', async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    try {
      const reviewer = await dependencies.authenticate(request);
      if (!reviewer) {
        response.status(401).json({
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to review an event request.' },
        });
        return;
      }
      if (reviewer.role !== 'EVENT_COORDINATOR') {
        response.status(403).json({
          error: { code: 'REVIEW_FORBIDDEN', message: 'Only event coordinators can review event requests.' },
        });
        return;
      }

      if (!uuid.test(request.params.id)) {
        response.status(400).json({
          error: { code: 'INVALID_EVENT_REQUEST_ID', message: 'The event request ID must be a UUID.' },
        });
        return;
      }
      const input = parseReviewInput(request.body);
      const saved = await recordInitialReview(dependencies, {
        eventRequestId: request.params.id,
        reviewer,
        input,
      });
      response.status(201).json(saved);
    } catch (error) {
      if (error instanceof ReviewInputError) {
        response.status(400).json({
          error: {
            code: 'INVALID_REVIEW_INPUT',
            message: error.message,
            ...(error.field ? { field: error.field } : {}),
          },
        });
        return;
      }
      // An unrelated coordinator must not learn whether this request exists or its current state.
      if (error instanceof ReviewRequestNotFoundError ||
          (error instanceof ReviewEligibilityError && error.code === 'REVIEW_FORBIDDEN')) {
        response.status(404).json(unavailableRequest);
        return;
      }
      if (error instanceof ReviewEligibilityError) {
        response.status(409).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  return router;
}
