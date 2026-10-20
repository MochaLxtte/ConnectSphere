import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { HealthDatabase } from '../../src/db/pool.js';
import { USER_ROLES, type UserRole } from '../../src/modules/auth/types.js';
import type { WorkflowRouterDependencies } from '../../src/modules/events/workflow-http.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';
import {
  countUnreadNotifications, listNotifications, markAllNotificationsRead, markNotificationRead,
} from '../../src/modules/notifications/inbox.js';

vi.mock('../../src/modules/notifications/inbox.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/notifications/inbox.js')>();
  return {
    ...actual, listNotifications: vi.fn(), countUnreadNotifications: vi.fn(),
    markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn(),
  };
});

const id = '60000000-0000-4000-8000-000000000001';
const actorWith = (role: UserRole): WorkflowActor => ({ id: '10000000-0000-4000-8000-000000000001', role });
const routes = [
  ['get', '/api/notifications'], ['get', '/api/notifications/unread-count'],
  ['post', '/api/notifications/read-all'], ['post', `/api/notifications/${id}/read`],
] as const;

function setup(actor: WorkflowActor | null) {
  const workspace: WorkflowRouterDependencies = {
    pool: {
      query() { throw new Error('HTTP boundary tests must not query the database.'); },
      connect() { throw new Error('HTTP boundary tests must not open a connection.'); },
    } as unknown as WorkflowRouterDependencies['pool'],
    authenticate: vi.fn().mockResolvedValue(actor),
  };
  const logger = { error: vi.fn() };
  return {
    app: createApp({ database: { query: vi.fn<HealthDatabase['query']>() }, workspace, logger }), workspace, logger,
  };
}

beforeEach(() => { vi.resetAllMocks(); });

describe('KAN-64-AC204/AC206 notification HTTP boundary', () => {
  it.each(routes)('%s %s requires a verified session and ignores client-supplied identity', async (method, path) => {
    const { app } = setup(null);
    const response = await request(app)[method](path).set('X-User-Id', actorWith('EVENT_ORGANISER').id).send({});
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view your notifications.' } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(listNotifications).not.toHaveBeenCalled();
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it.each(USER_ROLES)('gives %s their own inbox, passing the verified actor to the service', async (role) => {
    const { app, workspace } = setup(actorWith(role));
    vi.mocked(listNotifications).mockResolvedValue([]);
    vi.mocked(countUnreadNotifications).mockResolvedValue(2);
    vi.mocked(markAllNotificationsRead).mockResolvedValue(5);

    const list = await request(app).get('/api/notifications');
    expect(list.status).toBe(200);
    expect(list.body).toEqual({ items: [] });
    expect(list.headers['cache-control']).toBe('no-store');
    expect((await request(app).get('/api/notifications/unread-count')).body).toEqual({ unreadCount: 2 });
    expect((await request(app).post('/api/notifications/read-all').send({})).body).toEqual({ updated: 5 });
    expect(listNotifications).toHaveBeenCalledExactlyOnceWith(workspace, actorWith(role));
  });

  it('marks one notification read for the caller and returns it', async () => {
    const { app, workspace } = setup(actorWith('VENUE_STAFF'));
    const notification = { id, read: true } as never;
    vi.mocked(markNotificationRead).mockResolvedValue(notification);
    const response = await request(app).post(`/api/notifications/${id}/read`).send({});
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ notification: { id, read: true } });
    expect(markNotificationRead).toHaveBeenCalledExactlyOnceWith(workspace, { notificationId: id, actor: actorWith('VENUE_STAFF') });
  });

  it('rejects a malformed notification id before reaching the service', async () => {
    const { app } = setup(actorWith('EVENT_ORGANISER'));
    const response = await request(app).post('/api/notifications/not-a-uuid/read').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_NOTIFICATION_ID');
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it('answers 404 for a notification the caller cannot see, exactly as for a missing one', async () => {
    const { app } = setup(actorWith('EVENT_COORDINATOR'));
    vi.mocked(markNotificationRead).mockRejectedValue(
      new WorkflowError('NOT_FOUND', 'NOTIFICATION_NOT_FOUND', 'The notification was not found.'));
    const response = await request(app).post(`/api/notifications/${id}/read`).send({});
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOTIFICATION_NOT_FOUND', message: 'The notification was not found.' } });
  });

  it('hands unexpected failures to the application error handler without details', async () => {
    const { app, logger } = setup(actorWith('EVENT_ORGANISER'));
    vi.mocked(listNotifications).mockRejectedValue(new Error('connection string postgres://secret'));
    const response = await request(app).get('/api/notifications');
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('secret');
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('is not mounted without the workspace dependencies', async () => {
    const app = createApp({ database: { query: vi.fn<HealthDatabase['query']>() }, logger: { error: vi.fn() } });
    expect((await request(app).get('/api/notifications')).status).toBe(404);
  });
});
