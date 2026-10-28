import { describe, expect, it, vi } from 'vitest';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import {
  countUnreadNotifications, INBOX_LIMIT, listNotifications, markAllNotificationsRead, markNotificationRead,
} from '../../src/modules/notifications/inbox.js';

const organiser: WorkflowActor = { id: '10000000-0000-4000-8000-000000000001', role: 'EVENT_ORGANISER' };
const coordinator: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const staff: WorkflowActor = { id: '30000000-0000-4000-8000-000000000001', role: 'VENUE_STAFF' };
const eventId = '40000000-0000-4000-8000-000000000001';
const bookingId = '50000000-0000-4000-8000-000000000001';
const notificationId = '60000000-0000-4000-8000-000000000001';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: notificationId, type: 'REVIEW_APPROVED', title: 'Event request approved', message: 'Approved.',
  readAt: null, createdAt: new Date('2026-10-05T02:00:00Z'),
  eventId, eventName: 'Career fair', bookingId: null, canViewEvent: true, canViewBooking: false, ...overrides,
});
const database = (...replies: { rows?: unknown[]; rowCount?: number | undefined }[]) => {
  const query = vi.fn();
  for (const reply of replies) query.mockResolvedValueOnce({ rows: [], ...reply });
  return { dependencies: { pool: { query, connect: vi.fn() } } as never, query };
};

describe('KAN-64-AC204/AC206 inbox listing', () => {
  it('scopes the query to the verified caller and rechecks their current access', async () => {
    const { dependencies, query } = database({ rows: [] });
    expect(await listNotifications(dependencies, coordinator)).toEqual([]);
    const [sql, values] = query.mock.calls[0]!;
    expect(values).toEqual([coordinator.id, 'EVENT_COORDINATOR']);
    expect(sql).toContain('n.recipient_id = $1');
    expect(sql).toContain("e.coordinator_id = $1 AND e.status <> 'DRAFT'");
    expect(sql).toContain("n.type = 'COORDINATOR_REASSIGNED_AWAY'");
    expect(sql).toContain(`LIMIT ${INBOX_LIMIT}`);
    expect(sql).toContain('ORDER BY n.created_at DESC, n.id DESC');
    expect(sql).not.toContain(coordinator.id);
  });

  it('gives an organiser a read-state, the event and a link to their own request', async () => {
    const { dependencies } = database({ rows: [row(), row({ id: 'second', readAt: new Date('2026-10-06T03:00:00Z') })] });
    const items = await listNotifications(dependencies, organiser);
    expect(items[0]).toEqual({
      id: notificationId, type: 'REVIEW_APPROVED', title: 'Event request approved', message: 'Approved.',
      read: false, readAt: null, createdAt: '2026-10-05T02:00:00.000Z',
      event: { id: eventId, name: 'Career fair' }, booking: null, link: `/events/${eventId}`,
    });
    expect(items[1]).toMatchObject({ read: true, readAt: '2026-10-06T03:00:00.000Z' });
  });

  it('links a coordinator to the review page, and to the booking when the notice concerns one', async () => {
    const { dependencies } = database({ rows: [
      row(), row({ id: 'booking', type: 'VENUE_BOOKING_APPROVED', bookingId, canViewBooking: true }),
    ] });
    const [plain, booked] = await listNotifications(dependencies, coordinator);
    expect(plain!.link).toBe(`/reviews/${eventId}`);
    expect(booked).toMatchObject({ booking: { id: bookingId }, link: `/venue-bookings/${bookingId}` });
  });

  it('shows Venue Staff the booking but not an event they cannot open', async () => {
    const { dependencies } = database({ rows: [row({
      type: 'VENUE_BOOKING_REJECTED', bookingId, canViewBooking: true, canViewEvent: false, eventName: 'Career fair',
    })] });
    const [item] = await listNotifications(dependencies, staff);
    expect(item).toMatchObject({ event: null, booking: { id: bookingId }, link: `/venue-bookings/${bookingId}` });
    expect(JSON.stringify(item!.event)).not.toContain('Career fair');
  });

  it('keeps the minimal reassignment notice free of an event link or name', async () => {
    const { dependencies } = database({ rows: [row({
      type: 'COORDINATOR_REASSIGNED_AWAY', message: 'An event request you coordinated was reassigned.',
      canViewEvent: false, eventName: 'Career fair',
    })] });
    const [item] = await listNotifications(dependencies, coordinator);
    expect(item).toMatchObject({ event: null, booking: null, link: null });
    expect(JSON.stringify(item)).not.toContain('Career fair');
  });

  it('KAN-62 exposes only a generic attendee cancellation outcome without protected DTOs or internal reasons', async () => {
    const { dependencies } = database({ rows: [row({
      type: 'EVENT_CANCELLED', title: 'Confidential internal reason', message: 'Private organiser explanation',
      canViewEvent: false, canViewAttendeeCancellation: true,
    })] });
    const [item] = await listNotifications(dependencies, { id: organiser.id, role: 'ATTENDEE' });
    expect(item).toMatchObject({ title: 'Event cancelled',
      message: 'Career fair has been cancelled. Your registration is no longer active.',
      event: null, booking: null, link: null });
    expect(JSON.stringify(item)).not.toMatch(/Confidential|Private organiser/);
  });

  it('KAN-62 uses a generic fallback for an unnamed cancelled event', async () => {
    const { dependencies } = database({ rows: [row({ type: 'EVENT_CANCELLED',
      canViewEvent: false, canViewAttendeeCancellation: true, eventName: null })] });
    const [item] = await listNotifications(dependencies, { id: organiser.id, role: 'ATTENDEE' });
    expect(item?.message).toBe('The event has been cancelled. Your registration is no longer active.');
  });

  it('keeps equipment notices visible after cancellation but removes the planning link', async () => {
    const { dependencies } = database({ rows: [
      row({ canViewEvent: false, canViewEquipment: true, equipmentOpen: true }),
      row({ canViewEvent: false, canViewEquipment: true, equipmentOpen: false }),
    ] });
    const [open, closed] = await listNotifications(dependencies, { id: organiser.id, role: 'TECHNICAL_SUPPORT_STAFF' });
    expect(open?.link).toBe(`/equipment/availability/${eventId}`);
    expect(closed).toMatchObject({ link: null, event: null,
      message: 'Approved. This event is no longer open for equipment planning.' });
  });

  it('propagates a database failure', async () => {
    const query = vi.fn().mockRejectedValue(new Error('connection lost'));
    await expect(listNotifications({ pool: { query, connect: vi.fn() } } as never, organiser)).rejects.toThrow('connection lost');
  });
});

describe('KAN-64-AC204 unread count and read state', () => {
  it('counts only the caller\'s visible unread notifications', async () => {
    const { dependencies, query } = database({ rows: [{ count: 3 }] });
    expect(await countUnreadNotifications(dependencies, organiser)).toBe(3);
    const [sql, values] = query.mock.calls[0]!;
    expect(values).toEqual([organiser.id, 'EVENT_ORGANISER']);
    expect(sql).toContain('n.read_at IS NULL');
    expect(sql).toContain('n.recipient_id = $1');
  });

  it('reports zero when there is nothing to count', async () => {
    expect(await countUnreadNotifications(database({ rows: [] }).dependencies, organiser)).toBe(0);
  });

  it('marks a visible notification read and returns its new state', async () => {
    const { dependencies, query } = database(
      { rows: [{ id: notificationId }] }, { rowCount: 1 }, { rows: [row({ readAt: new Date('2026-10-07T01:00:00Z') })] },
    );
    const item = await markNotificationRead(dependencies, { notificationId, actor: organiser });
    expect(item).toMatchObject({ id: notificationId, read: true, readAt: '2026-10-07T01:00:00.000Z' });
    const [updateSql, updateValues] = query.mock.calls[1]!;
    expect(updateSql).toContain('UPDATE notifications SET read_at = now()');
    expect(updateSql).toContain('recipient_id = $2 AND read_at IS NULL');
    expect(updateValues).toEqual([notificationId, organiser.id]);
  });

  it('refuses an absent, foreign or no-longer-visible notification identically and writes nothing', async () => {
    const { dependencies, query } = database({ rows: [] });
    await expect(markNotificationRead(dependencies, { notificationId, actor: organiser }))
      .rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'NOTIFICATION_NOT_FOUND' });
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]![1]).toEqual([organiser.id, 'EVENT_ORGANISER', notificationId]);
  });

  it('refuses when the notification disappears between the check and the read-back', async () => {
    const { dependencies } = database({ rows: [{ id: notificationId }] }, { rowCount: 1 }, { rows: [] });
    await expect(markNotificationRead(dependencies, { notificationId, actor: organiser }))
      .rejects.toMatchObject({ code: 'NOTIFICATION_NOT_FOUND' });
  });

  it('marks only the caller\'s visible unread notifications and reports how many changed', async () => {
    const { dependencies, query } = database({ rowCount: 4 });
    expect(await markAllNotificationsRead(dependencies, coordinator)).toBe(4);
    const [sql, values] = query.mock.calls[0]!;
    expect(values).toEqual([coordinator.id, 'EVENT_COORDINATOR']);
    expect(sql).toContain('recipient_id = $1 AND read_at IS NULL');
    expect(sql).toContain('n.recipient_id = $1');
    expect(await markAllNotificationsRead(database({ rowCount: undefined }).dependencies, coordinator)).toBe(0);
  });
});
