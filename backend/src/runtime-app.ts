import type { Request } from 'express';
import type { Pool } from 'pg';
import { createApp } from './app.js';
import {
  authenticateRequest, defaultSupabaseSessionAuth, type SupabaseSessionAuth,
} from './modules/auth/router.js';
import { isAssignedCoordinator } from './modules/events/coordinator-access.js';

interface RuntimeAppDependencies {
  pool: Pool;
  supabaseAuth?: SupabaseSessionAuth;
  isProduction?: boolean;
}

/** Compose the running server's routes without opening a socket, so integration tests use the same wiring. */
export function createRuntimeApp({
  pool, supabaseAuth = defaultSupabaseSessionAuth, isProduction = false,
}: RuntimeAppDependencies) {
  const events = {
    pool,
    authenticate: (request: Request) => authenticateRequest(pool, supabaseAuth, request),
    canViewRequest: isAssignedCoordinator,
    canReviewRequest: isAssignedCoordinator,
  };

  return createApp({
    database: pool,
    auth: { database: pool, supabaseAuth, isProduction },
    submittedRequests: events,
    reviews: events,
    workspace: { pool, authenticate: events.authenticate },
  });
}
