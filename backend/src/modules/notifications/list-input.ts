export interface NotificationCursor {
  /** PostgreSQL timestamp text with microseconds, so keyset paging never skips same-millisecond rows. */
  createdAt: string;
  id: string;
}

export interface NotificationListInput {
  unreadOnly: boolean;
  limit: number;
  before: NotificationCursor | null;
}

export class NotificationQueryError extends Error {
  readonly code = 'INVALID_NOTIFICATION_QUERY';

  constructor(message: string) {
    super(message);
    this.name = 'NotificationQueryError';
  }
}

export const DEFAULT_NOTIFICATION_LIMIT = 30;
export const MAX_NOTIFICATION_LIMIT = 100;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

export function encodeNotificationCursor(cursor: NotificationCursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, 'utf8').toString('base64url');
}

function decodeCursor(value: string): NotificationCursor {
  const [createdAt, id, ...rest] = Buffer.from(value, 'base64url').toString('utf8').split('|');
  if (!createdAt || !id || rest.length > 0 || !timestamp.test(createdAt) || !uuid.test(id)
      || Number.isNaN(Date.parse(createdAt))) {
    throw new NotificationQueryError('before must be a cursor returned by a previous page.');
  }
  return { createdAt, id: id.toLowerCase() };
}

/** Parse the untrusted query string of GET /api/notifications. */
export function parseNotificationListQuery(query: Record<string, unknown>): NotificationListInput {
  const { unread, limit, before } = query;

  let unreadOnly = false;
  if (unread !== undefined) {
    if (unread !== 'true' && unread !== 'false') {
      throw new NotificationQueryError('unread must be true or false.');
    }
    unreadOnly = unread === 'true';
  }

  let parsedLimit = DEFAULT_NOTIFICATION_LIMIT;
  if (limit !== undefined) {
    if (typeof limit !== 'string' || !/^\d{1,3}$/.test(limit)) {
      throw new NotificationQueryError(`limit must be a whole number from 1 to ${MAX_NOTIFICATION_LIMIT}.`);
    }
    parsedLimit = Number(limit);
    if (parsedLimit < 1 || parsedLimit > MAX_NOTIFICATION_LIMIT) {
      throw new NotificationQueryError(`limit must be a whole number from 1 to ${MAX_NOTIFICATION_LIMIT}.`);
    }
  }

  let cursor: NotificationCursor | null = null;
  if (before !== undefined) {
    if (typeof before !== 'string' || before.length === 0 || before.length > 200) {
      throw new NotificationQueryError('before must be a cursor returned by a previous page.');
    }
    cursor = decodeCursor(before);
  }

  return { unreadOnly, limit: parsedLimit, before: cursor };
}
