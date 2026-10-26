import { describe, expect, it, vi } from 'vitest';
import { recordNotifications } from '../../src/modules/notifications/notify.js';
import { equipmentReservationNotifications } from '../../src/modules/notifications/trigger-matrix.js';
import { listNotifications } from '../../src/modules/notifications/inbox.js';

describe('KAN-26 transactional equipment notices and protected targets', () => {
  const input = { eventId: 'event', eventName: 'Workshop', coordinatorId: 'coordinator', technicalSupportId: 'staff',
    requestId: 'request', equipmentName: 'Projector', quantity: 2 };
  it('notifies the current coordinator and deciding staff once, with an equipment-specific dedupe key', async () => {
    const notices = equipmentReservationNotifications(input);
    expect(notices.map(row => row.recipientId)).toEqual(['coordinator', 'staff']);
    expect(notices.every(row => row.equipmentRequestId === input.requestId && row.dedupeKey === 'EQUIPMENT_RESERVED:request')).toBe(true);
    expect(equipmentReservationNotifications({ ...input, technicalSupportId: input.coordinatorId })).toHaveLength(1);
    const query = vi.fn().mockResolvedValue({ rowCount: 2 });
    await recordNotifications({ query }, notices);
    expect(query.mock.calls[0]![0]).toContain('equipment_request_id');
    expect(query.mock.calls[0]![1]).toEqual(expect.arrayContaining(['coordinator', 'staff', 'request']));
  });
  it('supports mixed notices without inventing an equipment target for a legacy notification', async () => {
    const [equipment] = equipmentReservationNotifications(input);
    const query = vi.fn().mockResolvedValue({ rowCount: 2 });
    await recordNotifications({ query }, [equipment!, { recipientId: 'owner', eventRequestId: 'event', type: 'REVIEW_APPROVED',
      title: 'Approved', message: 'Approved', dedupeKey: 'review' }]);
    expect(query.mock.calls[0]![1].at(-1)).toBeNull();
  });
  it('returns only an equipment link to Technical Support, without granting event-detail access', async () => {
    const base = { id: 'notice', type: 'EQUIPMENT_RESERVED', title: 'Reserved', message: 'Equipment reserved.',
      readAt: null, createdAt: '2026-10-26T10:00:00Z', eventId: 'event', eventName: 'Workshop', bookingId: null,
      canViewEvent: false, canViewBooking: false, canViewEquipment: true, equipmentOpen: true };
    const query = vi.fn().mockResolvedValue({ rows: [base, { ...base, id: 'closed', equipmentOpen: false }] });
    const items = await listNotifications({ pool: { query, connect: vi.fn() } } as never,
      { id: 'staff', role: 'TECHNICAL_SUPPORT_STAFF' });
    expect(items[0]).toMatchObject({ event: null, booking: null, link: '/equipment/availability/event' });
    expect(items[1]).toMatchObject({ event: null, link: null,
      message: 'Equipment reserved. This event is no longer open for equipment planning.' });
    const sql = query.mock.calls[0]![0];
    expect(sql).toContain('n.recipient_id = $1');
    expect(sql).toContain("r.id IS NOT NULL AND $2 = 'TECHNICAL_SUPPORT_STAFF'");
    expect(sql).toContain('r.event_request_id = e.id');
  });
});
