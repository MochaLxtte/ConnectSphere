import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { HealthDatabase } from './db/pool.js';
import { createReviewRouter, type ReviewRouterDependencies } from './modules/events/review-router.js';

export interface AppDependencies {
  database: HealthDatabase;
  logger?: Pick<Console, 'error'>;
  reviews?: ReviewRouterDependencies;
}

const databaseUnavailable = {
  error: {
    code: 'DATABASE_UNAVAILABLE',
    message: 'Database is not ready. Run the migrations and check the database connection.',
  },
};

/** Construct the HTTP app without opening a socket or creating database connections. */
export function createApp({ database, logger = console, reviews }: AppDependencies) {
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

  // Keep review writes unavailable until KAN-25 supplies verified identity and a review policy.
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
