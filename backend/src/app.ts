import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { HealthDatabase } from './db/pool.js';
import { createAuthRouter, type AuthRouterDependencies } from './modules/auth/router.js';
import { createReviewRouter, type ReviewRouterDependencies } from './modules/events/review-router.js';
import {
  createSubmittedRequestsRouter,
  type SubmittedRequestsRouterDependencies,
} from './modules/events/submitted-requests-router.js';
import { createAssignmentRouter } from './modules/events/assignment-router.js';
import { createClarificationRouter } from './modules/events/clarification-router.js';
import { createChangeRequestRouter } from './modules/events/change-request-router.js';
import { createStatusHistoryRouter } from './modules/events/status-history-router.js';
import { createVenueRouter } from './modules/venues/venue-router.js';
import {
  createVenueBookingsRouter, createVenueBookingSubmissionRouter,
} from './modules/venues/venue-bookings-router.js';
import type { WorkflowRouterDependencies } from './modules/events/workflow-http.js';
import { createVenueAvailabilityRouter } from './modules/venues/availability-router.js';
import { createNotificationRouter } from './modules/notifications/inbox-router.js';
import { createVenueBlockRouter } from './modules/venues/block-router.js';
import { createVenueCatalogueRouter } from './modules/venues/venue-catalogue-router.js';
import { createVenueSuitabilityRouter } from './modules/venues/suitability-router.js';
import { createEquipmentAvailabilityRouter } from './modules/equipment/availability-router.js';
import { createEquipmentReservationRouter } from './modules/equipment/reservation-router.js';

export interface AppDependencies {
  database: HealthDatabase;
  logger?: Pick<Console, 'error'>;
  reviews?: ReviewRouterDependencies;
  submittedRequests?: SubmittedRequestsRouterDependencies;
  auth?: AuthRouterDependencies;
  /** Verified identity and pool shared by the coordinator workflow and venue routes. */
  workspace?: WorkflowRouterDependencies;
}

const databaseUnavailable = {
  error: {
    code: 'DATABASE_UNAVAILABLE',
    message: 'Database is not ready. Run the migrations and check the database connection.',
  },
};

/** Construct the HTTP app without opening a socket or creating database connections. */
export function createApp({
  database, logger = console, reviews, submittedRequests, auth, workspace,
}: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok', service: 'connectsphere-api' });
  });

  app.get('/api/health/ready', async (_request, response) => {
    try {
      const result = await database.query(
        'SELECT key, value FROM scaffold_metadata WHERE key = $1',
        ['scaffold_version'],
      );
      const ready = result.rows.some((row) => row.key === 'scaffold_version' && row.value === '1');
      if (!ready) {
        response.status(503).json(databaseUnavailable);
        return;
      }
      response.status(200).json({ status: 'ok', database: 'connected' });
    } catch {
      response.status(503).json(databaseUnavailable);
    }
  });

  if (auth) app.use('/api/auth', createAuthRouter(auth));

  if (workspace) {
    // KAN-9: equipment context and advisory checks stay separate from general event access.
    app.use('/api/equipment/availability', createEquipmentAvailabilityRouter(workspace));
    app.use('/api/equipment/reservations', createEquipmentReservationRouter(workspace));
    // KAN-64: the signed-in user's own in-app inbox.
    app.use('/api/notifications', createNotificationRouter(workspace));
    app.use('/api/venue-bookings', createVenueBookingsRouter(workspace));
    // KAN-51: read-only venue calendar for the internal planning roles.
    app.use('/api/venues', createVenueAvailabilityRouter(workspace));
    // Mounted before the shared detail route so /unassigned and /coordinators are not read as IDs.
    app.use('/api/events', createAssignmentRouter(workspace));
    app.use('/api/events', createClarificationRouter(workspace));
    // KAN-15: reviewed change requests for approved or confirmed events.
    app.use('/api/events', createChangeRequestRouter(workspace));
    app.use('/api/events', createStatusHistoryRouter(workspace));
    app.use('/api/events', createVenueSuitabilityRouter(workspace));
    // KAN-53: coordinator venue booking submission, nested under the event request.
    app.use('/api/events', createVenueBookingSubmissionRouter(workspace));
    app.use('/api/venues', createVenueRouter(workspace));
    // KAN-55: Venue Staff manage operational-unavailability blocks per venue.
    app.use('/api/venues', createVenueBlockRouter(workspace));
    // KAN-50: Venue Staff view and update the venue catalogue under /api/venues/catalogue.
    app.use('/api/venues', createVenueCatalogueRouter(workspace));
  }

  // Queue/detail reads require verified identity and explicit visibility/decision policies.
  if (submittedRequests) app.use('/api/events', createSubmittedRequestsRouter(submittedRequests));
  // The runtime supplies verified identity and the same assignment policy for review writes.
  if (reviews) app.use('/api/events', createReviewRouter(reviews));

  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
    });
  });

  const handleError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const type =
      typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined;
    if (type === 'entity.parse.failed') {
      response.status(400).json({
        error: { code: 'INVALID_JSON', message: 'The request body must contain valid JSON.' },
      });
      return;
    }
    if (type === 'entity.too.large') {
      response.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body exceeds the 100kb limit.' },
      });
      return;
    }

    logger.error('Unexpected API error.');
    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
  };
  app.use(handleError);
  return app;
}
