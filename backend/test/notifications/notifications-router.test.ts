import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationNotFoundError,
  type NotificationItem,
} from '../../src/modules/notifications/notifications-service.js';
import {
  createNotificationsRouter,
  type NotificationsRouterDependencies,
} from '../../src/modules/notifications/router.js';

vi.mock('../../src/modules/notifications/notifications-service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/notifications/notifications-service.js')>();
  return {
    ...actual,
    countUnreadNotifications: vi.fn(), listNotifications: vi.fn(),
    markAllNotificationsRead: vi.fn(), markNotificationRead: vi.fn(),
  };
});

const user = { id: '20000000-0000-4000-8000-000000000001', role: 'ATTENDEE' as const };
const notificationId = '30000000-0000-4000-8000-000000000001';
const services = {
  count: vi.mocked(countUnreadNotifications), list: vi.mocked(listNotifications),
  readAll: vi.mocked(markAllNotificationsRead), read: vi.mocked(markNotificationRead),
};
const item: NotificationItem = {
  id: notificationId, type: 'REGISTRATION_CONFIRMED', title: 'Registration confirmed',
  message: 'You are registered.', eventRequestId: null, readAt: null, createdAt: '2026-09-19T04:00:00.000Z',
};

function setup(actor: typeof user | null = user) {
  const logger = { error: vi.fn() };
  const dependencies = {
    pool: {
      query() { throw new Error('HTTP boundary tests must not query the database.'); },
      connect() { throw new Error('HTTP boundary tests must not open a database connection.'); },
    } as unknown as NotificationsRouterDependencies['pool'],
    authenticate: vi.fn<NotificationsRouterDependencies['authenticate']>().mockResolvedValue(actor),
  };
  const app = express();
  app.use(express.json());
  app.use('/api/notifications', createNotificationsRouter(dependencies));
  const handleError: ErrorRequestHandler = (_error, _request, response, _next) => {
    logger.error('Unexpected API error.');
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  };
  app.use(handleError);
  return { app, dependencies, logger };
}

beforeEach(() => { Object.values(services).forEach((service) => service.mockReset()); });

describe('CF-20 notifications HTTP boundary', () => {
  it.each([
    ['get', '/api/notifications'], ['get', '/api/notifications/unread-count'],
    ['post', `/api/notifications/${notificationId}/read`], ['post', '/api/notifications/read-all'],
  ] as const)('%s %s requires verified authentication and is never cached', async (method, path) => {
    const { app } = setup(null);
    const response = await request(app)[method](path).set('X-User-Id', user.id);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(response.headers['cache-control']).toBe('no-store');
    Object.values(services).forEach((service) => expect(service).not.toHaveBeenCalled());
  });

  it('lists the verified caller\'s notifications with default paging', async () => {
    const { app, dependencies } = setup();
    const page = { items: [item], unreadCount: 1, nextCursor: null };
    services.list.mockResolvedValue(page);
    const response = await request(app).get('/api/notifications').set('X-User-Id', 'someone-else');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(page);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(services.list).toHaveBeenCalledExactlyOnceWith(
      dependencies, user.id, { unreadOnly: false, limit: 30, before: null },
    );
  });

  it('passes the unread filter and limit to the service', async () => {
    const { app, dependencies } = setup();
    services.list.mockResolvedValue({ items: [], unreadCount: 0, nextCursor: null });
    const response = await request(app).get('/api/notifications?unread=true&limit=5');
    expect(response.status).toBe(200);
    expect(services.list).toHaveBeenCalledExactlyOnceWith(
      dependencies, user.id, { unreadOnly: true, limit: 5, before: null },
    );
  });

  it.each(['unread=maybe', 'limit=0', 'limit=101', 'limit=abc', 'before=garbage', 'recipientId=x&limit=1&limit=2'])(
    'rejects the invalid query %s before persistence', async (query) => {
      const { app } = setup();
      const response = await request(app).get(`/api/notifications?${query}`);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_NOTIFICATION_QUERY');
      expect(services.list).not.toHaveBeenCalled();
    },
  );

  it('returns the unread count', async () => {
    const { app, dependencies } = setup();
    services.count.mockResolvedValue(7);
    const response = await request(app).get('/api/notifications/unread-count');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unreadCount: 7 });
    expect(services.count).toHaveBeenCalledExactlyOnceWith(dependencies, user.id);
  });

  it('marks one notification read for the verified recipient', async () => {
    const { app, dependencies } = setup();
    const saved = { notification: { ...item, readAt: '2026-09-19T05:00:00.000Z' }, unreadCount: 0 };
    services.read.mockResolvedValue(saved);
    const response = await request(app).post(`/api/notifications/${notificationId}/read`)
      .send({ recipientId: 'someone-else' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(saved);
    expect(services.read).toHaveBeenCalledExactlyOnceWith(dependencies, user.id, notificationId);
  });

  it('masks another user\'s notification as missing', async () => {
    const { app } = setup();
    services.read.mockRejectedValue(new NotificationNotFoundError());
    const response = await request(app).post(`/api/notifications/${notificationId}/read`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOTIFICATION_NOT_FOUND', message: 'The notification was not found.' },
    });
  });

  it.each(['not-a-uuid', "' OR 1=1--"])('rejects the invalid notification ID %s', async (id) => {
    const { app } = setup();
    const response = await request(app).post(`/api/notifications/${encodeURIComponent(id)}/read`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_NOTIFICATION_ID');
    expect(services.read).not.toHaveBeenCalled();
  });

  it('marks everything read without treating read-all as a notification ID', async () => {
    const { app, dependencies } = setup();
    services.readAll.mockResolvedValue({ updated: 3, unreadCount: 0 });
    const response = await request(app).post('/api/notifications/read-all');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ updated: 3, unreadCount: 0 });
    expect(services.readAll).toHaveBeenCalledExactlyOnceWith(dependencies, user.id);
    expect(services.read).not.toHaveBeenCalled();
  });

  it('conceals unexpected failures', async () => {
    const { app, logger } = setup();
    services.list.mockRejectedValue(new Error('postgresql://private-user:private-password@private-host/db'));
    const response = await request(app).get('/api/notifications');
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
