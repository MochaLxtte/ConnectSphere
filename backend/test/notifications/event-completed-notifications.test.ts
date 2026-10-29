import { describe, expect, it } from 'vitest';
import { NOTIFICATION_TYPES, eventCompletedNotifications } from '../../src/modules/notifications/trigger-matrix.js';

const input = { eventId: 'e1', eventName: 'Career fair', organiserId: 'o1', coordinatorId: 'c1' };

describe('KAN-10-AC103 event completed notifications', () => {
  it('registers the type', () => { expect(NOTIFICATION_TYPES).toContain('EVENT_COMPLETED'); });
  it('tells the organiser and acknowledges the coordinator, once each, with one key per event', () => {
    const notices = eventCompletedNotifications(input);
    expect(notices.map(item => item.recipientId)).toEqual(['o1', 'c1']);
    expect(notices.every(item => item.type === 'EVENT_COMPLETED' && item.dedupeKey === 'EVENT_COMPLETED:e1' && item.eventRequestId === 'e1')).toBe(true);
    expect(notices[0]?.message).toBe('Your event request “Career fair” was marked completed. Registration is now closed.');
    expect(notices[1]?.message).toBe('You marked “Career fair” as completed. Its equipment reservations were released and registration is closed.');
  });
  it('names an untitled event safely', () => {
    const [organiser, coordinator] = eventCompletedNotifications({ ...input, eventName: '  ' });
    expect(organiser?.message).toContain('Your untitled event request was marked completed');
    expect(coordinator?.message).toContain('an untitled event request as completed');
  });
  it('sends one notice when the organiser is also the coordinator', () => {
    expect(eventCompletedNotifications({ ...input, coordinatorId: 'o1' })).toHaveLength(1);
  });
});
