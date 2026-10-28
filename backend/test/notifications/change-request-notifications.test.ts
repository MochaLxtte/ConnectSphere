import { describe, expect, it } from 'vitest';
import {
  CHANGE_REQUEST_NOTIFICATION_TYPES, changeRequestDecisionNotifications, changeRequestSubmittedNotifications,
  changeRequestWithdrawnNotifications,
} from '../../src/modules/notifications/change-request-notifications.js';
import { NOTIFICATION_TYPES } from '../../src/modules/notifications/trigger-matrix.js';

const event = { id: 'event-1', name: ' Career Fair ', organiserId: 'organiser-1', coordinatorId: 'coordinator-1' };

describe('KAN-15-AC10 change-request notifications', () => {
  it('keeps change triggers out of the KAN-64 matrix', () => {
    for (const type of CHANGE_REQUEST_NOTIFICATION_TYPES) expect(NOTIFICATION_TYPES).not.toContain(type);
  });

  it('notifies the coordinator and acknowledges the organiser on submission, once per request', () => {
    expect(changeRequestSubmittedNotifications(event, 'change-1')).toEqual([
      {
        recipientId: 'organiser-1', eventRequestId: 'event-1', type: 'CHANGE_REQUEST_SUBMITTED',
        title: 'Change request submitted',
        message: 'Your change request for “Career Fair” was sent to the coordinator for review. ' +
          'The event keeps its current details until the change is approved.',
        dedupeKey: 'CHANGE_REQUEST_SUBMITTED:change-1:organiser',
      },
      {
        recipientId: 'coordinator-1', eventRequestId: 'event-1', type: 'CHANGE_REQUEST_SUBMITTED',
        title: 'Change request to review',
        message: 'The organiser of “Career Fair” requested a change. Open the event to review it.',
        dedupeKey: 'CHANGE_REQUEST_SUBMITTED:change-1:coordinator',
      },
    ]);
  });

  it('only acknowledges the organiser when no coordinator is assigned', () => {
    const notices = changeRequestSubmittedNotifications({ ...event, name: null, coordinatorId: null }, 'change-1');
    expect(notices).toHaveLength(1);
    expect(notices[0]!.message).toContain('for an untitled event');
  });

  it('tells the organiser the outcome, the reason and how many pending arrangements were cancelled', () => {
    expect(changeRequestDecisionNotifications(event, { id: 'change-1', outcome: 'APPROVED', reason: null, cancelledCount: 2 }))
      .toEqual([{
        recipientId: 'organiser-1', eventRequestId: 'event-1', type: 'CHANGE_REQUEST_APPROVED',
        title: 'Change request approved',
        message: 'Your change request for “Career Fair” was approved and applied. ' +
          '2 pending arrangements were cancelled and must be requested again for the new details.',
        dedupeKey: 'CHANGE_REQUEST_APPROVED:change-1',
      }]);
    expect(changeRequestDecisionNotifications(event, { id: 'change-1', outcome: 'APPROVED', reason: 'Fine', cancelledCount: 1 })[0]!
      .message).toBe('Your change request for “Career Fair” was approved and applied. Reason: Fine. ' +
      '1 pending arrangement was cancelled and must be requested again for the new details.');
    expect(changeRequestDecisionNotifications(event, { id: 'change-2', outcome: 'REJECTED', reason: 'Hall is full!', cancelledCount: 0 }))
      .toEqual([expect.objectContaining({
        type: 'CHANGE_REQUEST_REJECTED', title: 'Change request rejected',
        message: 'Your change request for “Career Fair” was rejected. Reason: Hall is full!',
        dedupeKey: 'CHANGE_REQUEST_REJECTED:change-2',
      })]);
  });

  it('tells the coordinator about a withdrawal, and nobody when no coordinator is assigned', () => {
    expect(changeRequestWithdrawnNotifications(event, 'change-1')).toEqual([{
      recipientId: 'coordinator-1', eventRequestId: 'event-1', type: 'CHANGE_REQUEST_WITHDRAWN',
      title: 'Change request withdrawn', message: 'The organiser of “Career Fair” withdrew their change request.',
      dedupeKey: 'CHANGE_REQUEST_WITHDRAWN:change-1',
    }]);
    expect(changeRequestWithdrawnNotifications({ ...event, coordinatorId: null }, 'change-1')).toEqual([]);
  });
});
