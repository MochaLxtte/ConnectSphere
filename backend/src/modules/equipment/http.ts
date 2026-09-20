import type { NextFunction, Request, Response } from 'express';
import {
  EquipmentConflictError, EquipmentForbiddenError, EquipmentInputError, EquipmentNotFoundError,
} from './errors.js';
import type { EquipmentActor, EquipmentDependencies } from './types.js';

type Handler = (actor: EquipmentActor, request: Request, response: Response) => Promise<void>;

/** Authenticate first, never cache, and translate module errors into the shared error envelope. */
export function authenticated(dependencies: EquipmentDependencies, signInMessage: string, handler: Handler) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    response.set('Cache-Control', 'no-store');
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor) {
        response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: signInMessage } });
        return;
      }
      await handler(actor, request, response);
    } catch (error) {
      const status = error instanceof EquipmentInputError ? 400
        : error instanceof EquipmentForbiddenError ? 403
        : error instanceof EquipmentNotFoundError ? 404
        : error instanceof EquipmentConflictError ? 409 : null;
      if (status === null) {
        next(error);
        return;
      }
      const known = error as EquipmentInputError | EquipmentForbiddenError | EquipmentNotFoundError | EquipmentConflictError;
      const details = known instanceof EquipmentConflictError ? known.details : {};
      response.status(status).json({ error: { ...details, code: known.code, message: known.message } });
    }
  };
}
