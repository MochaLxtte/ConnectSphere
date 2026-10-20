import { describe, expect, it, vi } from 'vitest';
import { recordNotifications, type NotificationInput } from '../../src/modules/notifications/notify.js';

const base: NotificationInput = {
  recipientId: '10000000-0000-4000-8000-000000000001', eventRequestId: '20000000-0000-4000-8000-000000000001',
  type: 'REVIEW_APPROVED', title: 'Approved', message: 'Your request was approved.', dedupeKey: 'REVIEW_APPROVED:r1',
};

describe('KAN-64-AC207 notification writer', () => {
  it('does nothing for an empty list', async () => {
    const client = { query: vi.fn() };
    expect(await recordNotifications(client, [])).toBe(0);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('writes every row in one parameterised statement that ignores a repeated outcome', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rowCount: 2 }) };
    const second = { ...base, recipientId: '10000000-0000-4000-8000-000000000002', venueBookingId: '30000000-0000-4000-8000-000000000001' };
    expect(await recordNotifications(client, [base, second])).toBe(2);

    expect(client.query).toHaveBeenCalledOnce();
    const [sql, values] = client.query.mock.calls[0]!;
    expect(sql).toContain('INSERT INTO notifications');
    expect(sql).toContain('ON CONFLICT (recipient_id, dedupe_key) DO NOTHING');
    expect(sql).toContain('($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)');
    expect(sql).not.toContain(base.recipientId);
    expect(values).toEqual([
      base.recipientId, base.eventRequestId, null, 'REVIEW_APPROVED', 'Approved', 'Your request was approved.', 'REVIEW_APPROVED:r1',
      second.recipientId, base.eventRequestId, second.venueBookingId, 'REVIEW_APPROVED', 'Approved', 'Your request was approved.', 'REVIEW_APPROVED:r1',
    ]);
  });

  it('reports only the rows actually inserted, so a repeat counts as zero', async () => {
    expect(await recordNotifications({ query: vi.fn().mockResolvedValue({ rowCount: 0 }) }, [base])).toBe(0);
    expect(await recordNotifications({ query: vi.fn().mockResolvedValue({ rowCount: null }) }, [base])).toBe(0);
  });

  it('propagates a database failure so the surrounding transaction rolls back', async () => {
    const client = { query: vi.fn().mockRejectedValue(new Error('insert failed')) };
    await expect(recordNotifications(client, [base])).rejects.toThrow('insert failed');
  });
});
