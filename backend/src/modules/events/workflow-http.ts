import type { Request, RequestHandler } from 'express';
import type { Pool } from 'pg';
import type { UserRole } from '../auth/types.js';
import { UUID_PATTERN, WorkflowError, type WorkflowActor } from './workflow-support.js';

export interface WorkflowRouterDependencies {
  pool: Pick<Pool, 'query' | 'connect'>;
  /**
   * Must verify the session and resolve the trusted app_users identity/role. Return null for
   * absent/invalid credentials; never build this identity from request headers or the body.
   */
  authenticate(request: Request): Promise<{ id: string; role: UserRole } | null>;
}

interface RouteOptions {
  /** Shown with the 401 response. */
  signInMessage: string;
  /** Roles that may use the route at all; others get 403 before any data is read. */
  roles?: readonly UserRole[];
  /** Route parameters that must be UUIDs, mapped to their 400 error code. */
  uuidParams?: Readonly<Record<string, string>>;
  successStatus?: number;
}

const statusByKind = { INVALID_INPUT: 400, NOT_FOUND: 404, FORBIDDEN: 403, CONFLICT: 409 } as const;

/** Shared HTTP boundary: authentication, role gate, UUID validation and error mapping. */
export function workflowRoute(
  dependencies: WorkflowRouterDependencies,
  options: RouteOptions,
  action: (actor: WorkflowActor, request: Request) => Promise<unknown>,
): RequestHandler {
  return async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor) {
        response.status(401).json({
          error: { code: 'AUTHENTICATION_REQUIRED', message: options.signInMessage },
        });
        return;
      }
      if (options.roles && !options.roles.includes(actor.role)) {
        response.status(403).json({
          error: { code: 'ACTION_FORBIDDEN', message: 'Your role cannot perform this action.' },
        });
        return;
      }
      for (const [name, code] of Object.entries(options.uuidParams ?? { id: 'INVALID_EVENT_REQUEST_ID' })) {
        const value = request.params[name];
        if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
          response.status(400).json({ error: { code, message: `The ${name} parameter must be a UUID.` } });
          return;
        }
      }
      response.status(options.successStatus ?? 200).json(await action(actor, request));
    } catch (error) {
      if (error instanceof WorkflowError) {
        response.status(statusByKind[error.kind]).json({
          error: { code: error.code, message: error.message },
        });
        return;
      }
      next(error);
    }
  };
}

export function param(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== 'string') throw new Error(`Missing route parameter: ${name}.`);
  return value;
}
