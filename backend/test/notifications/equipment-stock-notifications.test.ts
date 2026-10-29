import { describe, expect, it } from 'vitest';
import { NOTIFICATION_TYPES, equipmentStockShortfallNotifications } from '../../src/modules/notifications/trigger-matrix.js';

const input = {
  changeId: 'change-1', equipmentName: 'Projector', operationalQuantity: 3,
  events: [
    { eventId: 'e1', eventName: 'Career fair', coordinatorId: 'c1', shortfallQuantity: 2 },
    { eventId: 'e2', eventName: null, coordinatorId: 'c2', shortfallQuantity: 1 },
  ],
};

describe('KAN-18-AC102 stock shortfall notifications', () => {
  it('registers the type', () => {
    expect(NOTIFICATION_TYPES).toContain('EQUIPMENT_STOCK_SHORTFALL');
  });
  it('writes one notice per affected event, addressed to that event\'s coordinator only', () => {
    const notices = equipmentStockShortfallNotifications(input);
    expect(notices.map(item => [item.recipientId, item.eventRequestId])).toEqual([['c1', 'e1'], ['c2', 'e2']]);
    expect(notices.every(item => item.type === 'EQUIPMENT_STOCK_SHORTFALL' && item.title === 'Equipment shortfall')).toBe(true);
  });
  it('states the gap, says the reservation is kept and names an untitled event safely', () => {
    const [first, second] = equipmentStockShortfallNotifications(input);
    expect(first?.message).toBe('Projector stock now has 3 usable units, so the reservation for “Career fair” is 2 short. Your reservation is kept. Review the equipment plan.');
    expect(second?.message).toContain('an untitled event request is 1 short');
    expect(equipmentStockShortfallNotifications({ ...input, operationalQuantity: 1, events: [input.events[0]!] })[0]?.message)
      .toContain('1 usable unit,');
  });
  it('uses a key unique to the change and the event so a repeat is ignored but a later change notifies again', () => {
    const keys = equipmentStockShortfallNotifications(input).map(item => item.dedupeKey);
    expect(keys).toEqual(['EQUIPMENT_STOCK_SHORTFALL:change-1:e1', 'EQUIPMENT_STOCK_SHORTFALL:change-1:e2']);
    expect(equipmentStockShortfallNotifications({ ...input, changeId: 'change-2' })[0]?.dedupeKey).not.toBe(keys[0]);
  });
  it('writes nothing when no event is affected', () => {
    expect(equipmentStockShortfallNotifications({ ...input, events: [] })).toEqual([]);
  });
});
