import express, { type ErrorRequestHandler, type Router } from 'express';
import { vi } from 'vitest';
import type { EquipmentActor, EquipmentDependencies } from '../../src/modules/equipment/types.js';

/** Minimal host mirroring createApp's JSON parsing and generic 500, without editing app.ts. */
export function createTestApp(
  mountPath: string,
  createRouter: (dependencies: EquipmentDependencies) => Router,
  actor: EquipmentActor | null,
) {
  const logger = { error: vi.fn() };
  const dependencies = {
    pool: {
      query: vi.fn(() => { throw new Error('HTTP boundary tests must not query the database.'); }),
      connect: vi.fn(() => { throw new Error('HTTP boundary tests must not open a database connection.'); }),
    },
    authenticate: vi.fn<EquipmentDependencies['authenticate']>().mockResolvedValue(actor),
  };
  const app = express();
  app.use(express.json());
  app.use(mountPath, createRouter(dependencies as unknown as EquipmentDependencies));
  const handleError: ErrorRequestHandler = (_error, _request, response, _next) => {
    logger.error('Unexpected API error.');
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  };
  app.use(handleError);
  return { app, dependencies, logger };
}
