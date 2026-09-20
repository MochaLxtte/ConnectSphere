import type { NextFunction, Request, Response } from 'express';
import { BookingInputError } from './booking-input.js';
import { VenueRuleError } from './errors.js';
import type { VenueActor, VenuesRouterDependencies } from './types.js';
import { VenueInputError } from './venue-input.js';

const statusByKind = { INVALID: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409 } as const;

export function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({ error: { code, message } });
}

type Handler = (actor: VenueActor, request: Request, response: Response) => Promise<void>;

/**
 * Shared boundary for every venue route: no-store, verified identity first, then the handler.
 * Known input and rule errors become the JSON error envelope; anything else reaches the app's
 * generic 500 handler without leaking details.
 */
export function authenticated(
  dependencies: Pick<VenuesRouterDependencies, 'authenticate'>, signInMessage: string, handler: Handler,
) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    response.set('Cache-Control', 'no-store');
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor) {
        sendError(response, 401, 'AUTHENTICATION_REQUIRED', signInMessage);
        return;
      }
      await handler(actor, request, response);
    } catch (error) {
      if (error instanceof VenueInputError || error instanceof BookingInputError) {
        sendError(response, 400, error.code, error.message);
        return;
      }
      if (error instanceof VenueRuleError) {
        response.status(statusByKind[error.kind]).json({
          error: { ...error.details, code: error.code, message: error.message },
        });
        return;
      }
      next(error);
    }
  };
}
