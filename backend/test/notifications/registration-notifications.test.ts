import { describe, expect, it } from 'vitest';
import { NOTIFICATION_TYPES, registrationNotifications } from '../../src/modules/notifications/trigger-matrix.js';

const input = { eventId: 'e1', eventName: 'Career fair', attendeeId: 'a1', registrationId: 'r1', stamp: '1000', managerIds: ['o1', 'c1'], registered: 12, capacity: 40 };

describe('KAN-14-AC104 registration notifications', () => {
  it('registers both types', () => {
    expect(NOTIFICATION_TYPES).toEqual(expect.arrayContaining(['REGISTRATION_CONFIRMED', 'REGISTRATION_RECEIVED']));
  });
  it('acknowledges the attendee and tells the organiser and coordinator, once each', () => {
    const notices = registrationNotifications(input);
    expect(notices.map(item => [item.recipientId, item.type])).toEqual([
      ['a1', 'REGISTRATION_CONFIRMED'], ['o1', 'REGISTRATION_RECEIVED'], ['c1', 'REGISTRATION_RECEIVED']]);
    expect(notices[0]?.message).toBe('You are registered for “Career fair”.');
    expect(notices[1]?.message).toBe('A new attendee registered for “Career fair”: 12 of 40 places taken.');
  });
  it('never names the attendee in the managers\' notice or exposes anyone else to another attendee', () => {
    const notices = registrationNotifications(input);
    expect(notices.slice(1).every(item => !item.message.includes('a1') && item.recipientId !== 'a1')).toBe(true);
    expect(notices.filter(item => item.recipientId === 'a1')).toHaveLength(1);
  });
  it('words an unlimited event and an untitled event safely', () => {
    const [, manager] = registrationNotifications({ ...input, capacity: null, eventName: ' ', registered: 5 });
    expect(manager?.message).toBe('A new attendee registered for an untitled event request: 5 registered.');
  });
  it('keys each notice by registration and time so a repeat is ignored but a re-registration notifies again', () => {
    const first = registrationNotifications(input).map(item => item.dedupeKey);
    expect(first).toEqual(['REGISTRATION_CONFIRMED:r1:1000', 'REGISTRATION_RECEIVED:r1:1000', 'REGISTRATION_RECEIVED:r1:1000']);
    expect(registrationNotifications({ ...input, stamp: '2000' })[0]?.dedupeKey).not.toBe(first[0]);
  });
  it('drops duplicate managers and a manager who is also the attendee', () => {
    expect(registrationNotifications({ ...input, managerIds: ['o1', 'o1', 'a1'] }).map(item => item.recipientId)).toEqual(['a1', 'o1']);
    expect(registrationNotifications({ ...input, managerIds: [] })).toHaveLength(1);
  });
});
