import { describe, expect, it } from 'vitest';
import {
  encodeNotificationCursor,
  NotificationQueryError,
  parseNotificationListQuery,
} from '../../src/modules/notifications/list-input.js';

const cursor = { createdAt: '2026-09-19T04:00:00.123456Z', id: '30000000-0000-4000-8000-000000000001' };
const encode = (text: string) => Buffer.from(text, 'utf8').toString('base64url');

describe('CF-20 notification list query', () => {
  it('uses the defaults when no query is supplied', () => {
    expect(parseNotificationListQuery({})).toEqual({ unreadOnly: false, limit: 30, before: null });
  });

  it('parses the unread filter, limit bounds and a round-tripped cursor', () => {
    expect(parseNotificationListQuery({ unread: 'true', limit: '1', before: encodeNotificationCursor(cursor) }))
      .toEqual({ unreadOnly: true, limit: 1, before: cursor });
    expect(parseNotificationListQuery({ unread: 'false', limit: '100' }))
      .toEqual({ unreadOnly: false, limit: 100, before: null });
  });

  it.each([
    { unread: 'yes' }, { unread: '1' }, { unread: ['true', 'false'] },
    { limit: '0' }, { limit: '101' }, { limit: '-5' }, { limit: '1.5' }, { limit: 'ten' }, { limit: '' },
    { limit: ['1', '2'] }, { limit: '1000' },
    { before: '' }, { before: 'not-a-cursor' }, { before: ['a'] }, { before: 'x'.repeat(201) },
    { before: encode(`${cursor.createdAt}|not-a-uuid`) },
    { before: encode(`2026-09-19|${cursor.id}`) },
    { before: encode(`2026-99-19T04:00:00.123456Z|${cursor.id}`) },
    { before: encode(`${cursor.createdAt}|${cursor.id}|extra`) },
    { before: encode(`${cursor.createdAt}'; DROP TABLE notifications;--|${cursor.id}`) },
  ])('rejects %j', (query) => {
    expect(() => parseNotificationListQuery(query)).toThrow(NotificationQueryError);
  });
});
