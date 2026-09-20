import { describe, expect, it, vi } from 'vitest';
import { notify, type NotificationInput } from '../../src/modules/notifications/notify.js';

const recipientId = '20000000-0000-4000-8000-000000000001';
const otherRecipientId = '20000000-0000-4000-8000-000000000002';
const eventRequestId = '10000000-0000-4000-8000-000000000001';

function database() {
  return { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
}

function input(overrides: Partial<NotificationInput> = {}): NotificationInput {
  return {
    recipientId, eventRequestId, type: 'REGISTRATION_CONFIRMED',
    title: 'Registration confirmed', message: 'You are registered.', ...overrides,
  };
}

describe('CF-20 notify helper', () => {
  it('inserts a single notification with parameterised values', async () => {
    const db = database();
    await notify(db, input());
    expect(db.query).toHaveBeenCalledOnce();
    const [sql, values] = db.query.mock.calls[0]!;
    expect(sql).toMatch(/INSERT INTO notifications/);
    expect(sql).not.toContain(recipientId);
    expect(values).toEqual([
      recipientId, eventRequestId, 'REGISTRATION_CONFIRMED', 'Registration confirmed', 'You are registered.',
    ]);
  });

  it('stores NULL when no event is given, whether omitted or null', async () => {
    const db = database();
    const { eventRequestId: _omitted, ...withoutEvent } = input();
    await notify(db, withoutEvent);
    await notify(db, input({ eventRequestId: null }));
    expect(db.query.mock.calls.map(([, values]) => values[1])).toEqual([null, null]);
  });

  it('inserts every distinct notification of an array in order', async () => {
    const db = database();
    await notify(db, [
      input(),
      input({ recipientId: otherRecipientId }),
      input({ type: 'ATTENDEE_REGISTERED' }),
      input({ eventRequestId: '10000000-0000-4000-8000-000000000002' }),
    ]);
    expect(db.query.mock.calls.map(([, values]) => [values[0], values[1], values[2]])).toEqual([
      [recipientId, eventRequestId, 'REGISTRATION_CONFIRMED'],
      [otherRecipientId, eventRequestId, 'REGISTRATION_CONFIRMED'],
      [recipientId, eventRequestId, 'ATTENDEE_REGISTERED'],
      [recipientId, '10000000-0000-4000-8000-000000000002', 'REGISTRATION_CONFIRMED'],
    ]);
  });

  it('de-duplicates the same recipient, type and event, keeping the first copy', async () => {
    const db = database();
    await notify(db, [
      input({ title: 'First' }), input({ title: 'Duplicate' }),
      input({ eventRequestId: null, title: 'No event' }),
      input({ eventRequestId: null, title: 'No event duplicate' }),
    ]);
    expect(db.query.mock.calls.map(([, values]) => values[3])).toEqual(['First', 'No event']);
  });

  it('does nothing for an empty list', async () => {
    const db = database();
    await notify(db, []);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('propagates a database failure so the surrounding transaction rolls back', async () => {
    const db = { query: vi.fn().mockRejectedValue(new Error('insert failed')) };
    await expect(notify(db, [input(), input({ recipientId: otherRecipientId })])).rejects.toThrow('insert failed');
    expect(db.query).toHaveBeenCalledOnce();
  });
});
