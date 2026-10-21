import { Router } from 'express';
import { param, workflowRoute, type WorkflowRouterDependencies } from '../events/workflow-http.js';
import {
  countUnreadNotifications, listNotifications, markAllNotificationsRead, markNotificationRead,
} from './inbox.js';

export type NotificationRouterDependencies = WorkflowRouterDependencies;

const signInMessage = 'Sign in to view your notifications.';

/**
 * KAN-64. Mount at /api/notifications. Every signed-in role has an inbox, so no role list is
 * given: authentication is enforced by workflowRoute, and every query is scoped to the verified
 * caller. There is no way to name another recipient.
 */
export function createNotificationRouter(dependencies: NotificationRouterDependencies) {
  const router = Router();

  router.get('/', workflowRoute(
    dependencies, { signInMessage, uuidParams: {} },
    async (actor) => ({ items: await listNotifications(dependencies, actor) }),
  ));

  router.get('/unread-count', workflowRoute(
    dependencies, { signInMessage, uuidParams: {} },
    async (actor) => ({ unreadCount: await countUnreadNotifications(dependencies, actor) }),
  ));

  router.post('/read-all', workflowRoute(
    dependencies, { signInMessage, uuidParams: {} },
    async (actor) => ({ updated: await markAllNotificationsRead(dependencies, actor) }),
  ));

  router.post('/:id/read', workflowRoute(
    dependencies, { signInMessage, uuidParams: { id: 'INVALID_NOTIFICATION_ID' } },
    async (actor, request) => ({
      notification: await markNotificationRead(dependencies, { notificationId: param(request, 'id'), actor }),
    }),
  ));

  return router;
}
