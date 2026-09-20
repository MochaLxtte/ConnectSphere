import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import type { UserRole } from '../auth/types.js';
import { NotificationQueryError, parseNotificationListQuery } from './list-input.js';
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationNotFoundError,
} from './notifications-service.js';

export interface NotificationsRouterDependencies {
  pool: Pick<Pool, 'query' | 'connect'>;
  /**
   * Must verify the session and resolve the trusted app_users identity/role.
   * Return null for absent/invalid credentials; throw for verification service failures.
   */
  authenticate(request: Request): Promise<{ id: string; role: UserRole } | null>;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** CF-20 in-app notifications. Every route acts only on the verified caller's own rows. */
export function createNotificationsRouter(dependencies: NotificationsRouterDependencies) {
  const router = Router();

  const handle = (handler: (recipientId: string, request: Request, response: Response) => Promise<void>) =>
    async (request: Request, response: Response, next: (error: unknown) => void) => {
      response.set('Cache-Control', 'no-store');
      try {
        const actor = await dependencies.authenticate(request);
        if (!actor) {
          response.status(401).json({
            error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view your notifications.' },
          });
          return;
        }
        await handler(actor.id, request, response);
      } catch (error) {
        if (error instanceof NotificationQueryError) {
          response.status(400).json({ error: { code: error.code, message: error.message } });
          return;
        }
        if (error instanceof NotificationNotFoundError) {
          response.status(404).json({ error: { code: error.code, message: error.message } });
          return;
        }
        next(error);
      }
    };

  router.get('/', handle(async (recipientId, request, response) => {
    const input = parseNotificationListQuery(request.query);
    response.status(200).json(await listNotifications(dependencies, recipientId, input));
  }));

  router.get('/unread-count', handle(async (recipientId, _request, response) => {
    response.status(200).json({ unreadCount: await countUnreadNotifications(dependencies, recipientId) });
  }));

  router.post('/read-all', handle(async (recipientId, _request, response) => {
    response.status(200).json(await markAllNotificationsRead(dependencies, recipientId));
  }));

  router.post('/:id/read', handle(async (recipientId, request, response) => {
    const id = String(request.params.id);
    if (!uuid.test(id)) {
      response.status(400).json({
        error: { code: 'INVALID_NOTIFICATION_ID', message: 'The notification ID must be a UUID.' },
      });
      return;
    }
    response.status(200).json(await markNotificationRead(dependencies, recipientId, id));
  }));

  return router;
}
