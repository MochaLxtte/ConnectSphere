import { Router, type Request } from 'express';
import type { Pool } from 'pg';
import {
  getEventRequestDetail, EventRequestNotFoundError, type EventRequestDetailDependencies,
} from './event-request-detail.js';
import {
  listOwnedDrafts,
  listOwnedRequests,
  listReviewableRequests,
  type QueueActor,
  type SubmittedRequestQueryDependencies,
} from './submitted-requests.js';
import { updateOwnedDraft, DraftRequestNotFoundError, type UpdateDraftDependencies } from './update-draft.js';
import { DraftEligibilityError } from './draft-eligibility.js';
import { DraftUpdateInputError, parseDraftUpdateInput } from './draft-update-input.js';
import { submitEventRequest, SubmitRequestNotFoundError, type SubmitRequestDependencies } from './submit-request.js';
import { SubmitEligibilityError } from './submit-eligibility.js';
import { SubmissionValidationError } from './submit-input.js';

export interface SubmittedRequestsRouterDependencies
  extends SubmittedRequestQueryDependencies, UpdateDraftDependencies, SubmitRequestDependencies {
  pool: Pick<Pool, 'query' | 'connect'>;
  canReviewRequest: EventRequestDetailDependencies['canReviewRequest'];
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

/** Role-scoped lists and one shared KAN-34/KAN-33/KAN-16 detail route, with explicit policies. */
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
      if (actor.role === 'EVENT_ORGANISER') {
        const scope = request.query.scope;
        if (scope !== undefined && scope !== 'drafts' && scope !== 'all') {
          response.status(400).json({
            error: { code: 'INVALID_EVENT_LIST_SCOPE', message: 'scope must be either drafts or all.' },
          });
          return;
        }
        const items = scope === 'all'
          ? await listOwnedRequests(dependencies, actor)
          : await listOwnedDrafts(dependencies, actor);
        response.status(200).json({ items });
        return;
      }
      if (actor.role !== 'EVENT_COORDINATOR') {
        response.status(403).json({
          error: { code: 'VIEW_FORBIDDEN', message: 'Only event coordinators can view the review queue.' },
        });
        return;
      }

      if (request.query.scope !== undefined) {
        response.status(400).json({
          error: { code: 'INVALID_EVENT_LIST_SCOPE', message: 'scope is only supported for organiser lists.' },
        });
        return;
      }
      const items = await listReviewableRequests(dependencies, actor);
      response.status(200).json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor) {
        response.status(401).json({
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to create an event request.' },
        });
        return;
      }

      if (actor.role !== 'EVENT_ORGANISER') {
        response.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only Event Organisers can create event requests.' },
        });
        return;
      }

      const body = (request.body && typeof request.body === 'object') ? request.body : {};
      const action = body.action === 'SUBMIT' ? 'SUBMITTED' : 'DRAFT';
      const rawInput = body.data && typeof body.data === 'object' ? { ...body.data } : { ...body };
      delete rawInput.action;

      const parsedFields = Object.keys(rawInput).length > 0 ? parseDraftUpdateInput(rawInput) : {};

      if (action === 'SUBMITTED') {
        const required = ['name', 'purpose', 'startsAt', 'endsAt', 'expectedAttendance', 'venueRequirements'] as const;
        for (const field of required) {
          if (!parsedFields[field]) {
            response.status(400).json({
              error: { code: 'INVALID_INPUT', message: `Field '${field}' is required for submission.` },
            });
            return;
          }
        }
      }

      const result = await dependencies.pool.query(
        `INSERT INTO event_requests (
          organiser_id,
          status,
          name,
          purpose,
          description,
          starts_at,
          ends_at,
          expected_attendance,
          venue_requirements,
          accessibility_needs,
          equipment_requirements,
          registration_required
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          id,
          organiser_id AS "organiserId",
          coordinator_id AS "coordinatorId",
          status,
          name,
          purpose,
          description,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          expected_attendance AS "expectedAttendance",
          venue_requirements AS "venueRequirements",
          accessibility_needs AS "accessibilityNeeds",
          equipment_requirements AS "equipmentRequirements",
          registration_required AS "registrationRequired",
          created_at AS "createdAt",
          updated_at AS "updatedAt"`,
        [
          actor.id,
          action,
          parsedFields.name ?? null,
          parsedFields.purpose ?? null,
          parsedFields.description ?? null,
          parsedFields.startsAt ?? null,
          parsedFields.endsAt ?? null,
          parsedFields.expectedAttendance ?? null,
          parsedFields.venueRequirements ?? null,
          parsedFields.accessibilityNeeds ?? null,
          parsedFields.equipmentRequirements ?? null,
          parsedFields.registrationRequired ?? null,
        ],
      );

      response.status(201).json({ request: result.rows[0] });
    } catch (error) {
      if (error instanceof DraftUpdateInputError) {
        response.status(400).json({ error: { code: 'INVALID_INPUT', message: error.message } });
        return;
      }
      next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor) {
        response.status(401).json({
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view this event request.' },
        });
        return;
      }
      if (actor.role !== 'EVENT_COORDINATOR' && actor.role !== 'EVENT_ORGANISER') {
        response.status(403).json({
          error: { code: 'VIEW_FORBIDDEN', message: 'This account cannot view event request details.' },
        });
        return;
      }

      if (!uuid.test(request.params.id)) {
        response.status(400).json({
          error: { code: 'INVALID_EVENT_REQUEST_ID', message: 'The event request ID must be a UUID.' },
        });
        return;
      }

      const detail = await getEventRequestDetail(dependencies, actor, request.params.id);
      response.status(200).json(detail);
    } catch (error) {
      if (error instanceof EventRequestNotFoundError) {
        response.status(404).json(unavailableRequest);
        return;
      }
      next(error);
    }
  });

  router.patch('/:id', async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor) {
        response.status(401).json({
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to edit an event request.' },
        });
        return;
      }
      if (actor.role !== 'EVENT_ORGANISER') {
        response.status(403).json({
          error: { code: 'DRAFT_EDIT_FORBIDDEN', message: 'Only event organisers can edit a draft event request.' },
        });
        return;
      }

      if (!uuid.test(request.params.id)) {
        response.status(400).json({
          error: { code: 'INVALID_EVENT_REQUEST_ID', message: 'The event request ID must be a UUID.' },
        });
        return;
      }
      const updated = await updateOwnedDraft(dependencies, {
        eventRequestId: request.params.id,
        actor,
        input: request.body,
      });
      response.status(200).json(updated);
    } catch (error) {
      if (error instanceof DraftUpdateInputError) {
        response.status(400).json({ error: { code: 'INVALID_DRAFT_UPDATE', message: error.message } });
        return;
      }
      // An unrelated organiser must not learn whether this request exists or its current state.
      if (error instanceof DraftRequestNotFoundError ||
          (error instanceof DraftEligibilityError && error.code === 'DRAFT_EDIT_FORBIDDEN')) {
        response.status(404).json(unavailableRequest);
        return;
      }
      if (error instanceof DraftEligibilityError) {
        response.status(409).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  router.post('/:id/submit', async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor) {
        response.status(401).json({
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to submit an event request.' },
        });
        return;
      }
      if (actor.role !== 'EVENT_ORGANISER') {
        response.status(403).json({
          error: { code: 'SUBMIT_FORBIDDEN', message: 'Only event organisers can submit a draft event request.' },
        });
        return;
      }

      if (!uuid.test(request.params.id)) {
        response.status(400).json({
          error: { code: 'INVALID_EVENT_REQUEST_ID', message: 'The event request ID must be a UUID.' },
        });
        return;
      }
      const submitted = await submitEventRequest(dependencies, {
        eventRequestId: request.params.id,
        actor,
      });
      response.status(200).json(submitted);
    } catch (error) {
      if (error instanceof SubmissionValidationError) {
        response.status(400).json({
          error: { code: 'SUBMISSION_INCOMPLETE', message: error.message, missingFields: error.missingFields },
        });
        return;
      }
      // An unrelated organiser must not learn whether this request exists or its current state.
      if (error instanceof SubmitRequestNotFoundError ||
          (error instanceof SubmitEligibilityError && error.code === 'SUBMIT_FORBIDDEN')) {
        response.status(404).json(unavailableRequest);
        return;
      }
      if (error instanceof SubmitEligibilityError) {
        response.status(409).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  return router;
}