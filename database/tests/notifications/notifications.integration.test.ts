import { randomUUID } from 'node:crypto';
import express from 'express';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { notify } from '../../../backend/src/modules/notifications/notify.js';
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../backend/src/modules/notifications/notifications-service.js';
import { createNotificationsRouter } from '../../../backend/src/modules/notifications/router.js';
import { migrate } from '../../migrate.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: testUrl });
const scopedUrl = new URL(testUrl);
scopedUrl.searchParams.set('options', `-c search_path=${schema}`);
scopedUrl.searchParams.set('application_name', schema);
const pool = new pg.Pool({
  connectionString: scopedUrl.toString(), max: 4,
  connectionTimeoutMillis: 5_000, statement_timeout: 5_000,
});
const dependencies = { pool };
const eventRequestId = randomUUID();

async function createUser(): Promise<string> {
  const id = randomUUID();
  await pool.query(
    "INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, 'User', 'ATTENDEE')",
    [id, `${id}@example.test`],
  );
  return id;
}

/** Insert with an explicit time so ordering and same-timestamp tie-breaks are deterministic. */
async function insertNotification(recipientId: string, title: string, createdAt: string, read = false) {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO notifications (recipient_id, type, title, message, created_at, read_at)
     VALUES ($1, 'TEST', $2, 'Message', $3, $4) RETURNING id`,
    [recipientId, title, createdAt, read ? createdAt : null],
  );
  return result.rows[0]!.id;
}

beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await migrate(scopedUrl.toString());
  const organiserId = await createUser();
  await pool.query("INSERT INTO event_requests (id, organiser_id, status) VALUES ($1, $2, 'APPROVED')", [eventRequestId, organiserId]);
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

describe('CF-20 notification persistence', () => {
  it('stores notify() output and returns it to the recipient only', async () => {
    const recipient = await createUser();
    const other = await createUser();
    await notify(pool, [
      { recipientId: recipient, eventRequestId, type: 'REGISTRATION_CONFIRMED', title: 'Confirmed', message: 'You are in.' },
      { recipientId: recipient, eventRequestId, type: 'REGISTRATION_CONFIRMED', title: 'Duplicate', message: 'Ignored.' },
      { recipientId: other, type: 'GENERAL', title: 'For someone else', message: 'Private.' },
    ]);

    const page = await listNotifications(dependencies, recipient, { unreadOnly: false, limit: 30, before: null });
    expect(page).toEqual({
      items: [{
        id: expect.any(String), type: 'REGISTRATION_CONFIRMED', title: 'Confirmed', message: 'You are in.',
        eventRequestId, readAt: null, createdAt: expect.any(String),
      }],
      unreadCount: 1, nextCursor: null,
    });
    const others = await listNotifications(dependencies, other, { unreadOnly: false, limit: 30, before: null });
    expect(others.items.map((item) => [item.title, item.eventRequestId])).toEqual([['For someone else', null]]);
  });

  it('rolls notifications back with the caller\'s transaction', async () => {
    const recipient = await createUser();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await notify(client, { recipientId: recipient, type: 'GENERAL', title: 'Rolled back', message: 'Never saved.' });
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    expect(await countUnreadNotifications(dependencies, recipient)).toBe(0);
  });

  it('pages newest first without skipping rows that share a timestamp', async () => {
    const recipient = await createUser();
    const sameInstant = '2026-09-19T04:00:00.123456Z';
    // Microsecond-apart rows collapse to the same JavaScript millisecond.
    await insertNotification(recipient, 'oldest', '2026-09-19T03:00:00Z');
    await insertNotification(recipient, 'micro-1', '2026-09-19T04:00:00.123455Z', true);
    const tied = [
      await insertNotification(recipient, 'tied', sameInstant),
      await insertNotification(recipient, 'tied', sameInstant),
      await insertNotification(recipient, 'tied', sameInstant),
    ];
    await insertNotification(recipient, 'micro-2', '2026-09-19T04:00:00.123457Z');
    await insertNotification(recipient, 'newest', '2026-09-19T05:00:00Z', true);
    await insertNotification(await createUser(), 'foreign', '2026-09-19T04:30:00Z');

    const seen: Array<{ id: string; title: string }> = [];
    let before: string | null = null;
    let pages = 0;
    do {
      const app = express();
      app.use('/api/notifications', createNotificationsRouter({
        pool, authenticate: async () => ({ id: recipient, role: 'ATTENDEE' }),
      }));
      const response = await request(app).get(`/api/notifications?limit=2${before ? `&before=${before}` : ''}`);
      expect(response.status).toBe(200);
      expect(response.body.unreadCount).toBe(5);
      expect(response.body.items.length).toBeLessThanOrEqual(2);
      seen.push(...response.body.items);
      before = response.body.nextCursor as string | null;
      pages += 1;
    } while (before && pages < 10);

    expect(pages).toBe(4);
    expect(seen.map((item) => item.title)).toEqual(['newest', 'micro-2', 'tied', 'tied', 'tied', 'micro-1', 'oldest']);
    expect(seen.slice(2, 5).map((item) => item.id)).toEqual([...tied].sort().reverse());
    expect(new Set(seen.map((item) => item.id)).size).toBe(7);

    const unread = await listNotifications(dependencies, recipient, { unreadOnly: true, limit: 100, before: null });
    expect(unread.items.map((item) => item.title)).toEqual(['micro-2', 'tied', 'tied', 'tied', 'oldest']);
    expect(unread.nextCursor).toBeNull();
    const exact = await listNotifications(dependencies, recipient, { unreadOnly: false, limit: 7, before: null });
    expect(exact.items).toHaveLength(7);
    expect(exact.nextCursor).toBeNull();
  });

  it('marks one notification read idempotently and masks other recipients', async () => {
    const recipient = await createUser();
    const intruder = await createUser();
    const id = await insertNotification(recipient, 'Unread', '2026-09-19T04:00:00Z');
    await insertNotification(recipient, 'Also unread', '2026-09-19T04:01:00Z');

    await expect(markNotificationRead(dependencies, intruder, id)).rejects.toMatchObject({ code: 'NOTIFICATION_NOT_FOUND' });
    await expect(markNotificationRead(dependencies, recipient, randomUUID()))
      .rejects.toMatchObject({ code: 'NOTIFICATION_NOT_FOUND' });
    expect(await countUnreadNotifications(dependencies, recipient)).toBe(2);

    const first = await markNotificationRead(dependencies, recipient, id);
    expect(first.unreadCount).toBe(1);
    expect(first.notification).toMatchObject({ id, title: 'Unread', readAt: expect.any(String) });
    const second = await markNotificationRead(dependencies, recipient, id);
    expect(second.notification.readAt).toBe(first.notification.readAt);
    expect(second.unreadCount).toBe(1);
  });

  it('marks all of the caller\'s notifications read and nobody else\'s', async () => {
    const recipient = await createUser();
    const other = await createUser();
    await insertNotification(recipient, 'a', '2026-09-19T04:00:00Z');
    await insertNotification(recipient, 'b', '2026-09-19T04:01:00Z');
    const alreadyRead = await insertNotification(recipient, 'c', '2026-09-19T04:02:00Z', true);
    await insertNotification(other, 'theirs', '2026-09-19T04:00:00Z');

    expect(await markAllNotificationsRead(dependencies, recipient)).toEqual({ updated: 2, unreadCount: 0 });
    expect(await markAllNotificationsRead(dependencies, recipient)).toEqual({ updated: 0, unreadCount: 0 });
    expect(await countUnreadNotifications(dependencies, other)).toBe(1);
    const kept = await pool.query('SELECT read_at FROM notifications WHERE id = $1', [alreadyRead]);
    expect(kept.rows[0].read_at.toISOString()).toBe('2026-09-19T04:02:00.000Z');
  });
});
