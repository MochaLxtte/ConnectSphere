import { describe, expect, it } from 'vitest';
import {
  assignmentNotifications, bookingDecisionNotifications, bookingPeriod, clarificationNotifications,
  NOTIFICATION_TYPES, REASSIGNED_AWAY_MESSAGE, reviewNotifications, submissionNotifications,
} from '../../src/modules/notifications/trigger-matrix.js';

const organiserId = '10000000-0000-4000-8000-000000000001';
const coordinatorId = '20000000-0000-4000-8000-000000000001';
const previousId = '30000000-0000-4000-8000-000000000001';
const staffId = '40000000-0000-4000-8000-000000000001';
const event = { id: '50000000-0000-4000-8000-000000000001', name: 'Career fair', organiserId };
const pair = (rows: { recipientId: string; type: string }[]) => rows.map((row) => [row.recipientId, row.type]);

describe('KAN-64-AC201 request notifications go to the organiser', () => {
  it('acknowledges a submission to the organiser, who is also the actor', () => {
    const [only, ...rest] = submissionNotifications(event);
    expect(rest).toEqual([]);
    expect(only).toMatchObject({
      recipientId: organiserId, eventRequestId: event.id, type: 'REQUEST_SUBMITTED', title: 'Event request submitted',
      dedupeKey: `REQUEST_SUBMITTED:${event.id}`,
      message: 'Your event request “Career fair” was submitted. It is waiting to be allocated to a coordinator.',
    });
  });

  it('names the question and the next step in a clarification request, one per clarification', () => {
    const [only, ...rest] = clarificationNotifications(event, { id: 'c1', message: '  Which hall do you need?  ' });
    expect(rest).toEqual([]);
    expect(only).toMatchObject({
      recipientId: organiserId, type: 'CLARIFICATION_REQUESTED', dedupeKey: 'CLARIFICATION_REQUESTED:c1',
      message: 'Your coordinator needs more information about “Career fair”: Which hall do you need? Open the request to respond.',
    });
    expect(clarificationNotifications(event, { id: 'c2', message: 'Ends in a full stop.' })[0]!.message)
      .toBe('Your coordinator needs more information about “Career fair”: Ends in a full stop. Open the request to respond.');
  });

  it.each([
    ['APPROVED', 'REVIEW_APPROVED', 'Event request approved', null,
      'Your event request “Career fair” was approved.'],
    ['APPROVED', 'REVIEW_APPROVED', 'Event request approved', '  Fits the programme  ',
      'Your event request “Career fair” was approved. Reason: Fits the programme.'],
    ['REJECTED', 'REVIEW_REJECTED', 'Event request rejected', 'No budget.',
      'Your event request “Career fair” was rejected. Reason: No budget.'],
    ['REJECTED', 'REVIEW_REJECTED', 'Event request rejected', '   ',
      'Your event request “Career fair” was rejected.'],
  ] as const)('tells the organiser about a %s decision with reason %j', (decision, type, title, reason, message) => {
    expect(reviewNotifications(event, { id: 'r1', decision, reason })).toEqual([{
      recipientId: organiserId, eventRequestId: event.id, type, title, message, dedupeKey: `${type}:r1`,
    }]);
  });

  it('describes an unnamed request without inventing a title', () => {
    expect(reviewNotifications({ ...event, name: null }, { id: 'r1', decision: 'APPROVED', reason: null })[0]!.message)
      .toBe('Your untitled event request was approved.');
    expect(submissionNotifications({ ...event, name: '   ' })[0]!.message)
      .toBe('Your untitled event request was submitted. It is waiting to be allocated to a coordinator.');
    expect(clarificationNotifications({ ...event, name: null }, { id: 'c', message: 'Why?' })[0]!.message)
      .toContain('more information about an untitled event request: Why?');
    expect(assignmentNotifications({ ...event, name: null }, { id: 'a', coordinatorId, coordinatorName: 'Casey' }, null, false)[0]!.message)
      .toBe('Casey is now the coordinator for an untitled event request.');
  });
});

describe('KAN-64-AC202 assignment notifications', () => {
  const assignment = { id: 'a1', coordinatorId, coordinatorName: 'Casey' };

  it('tells the organiser and the new coordinator about an initial assignment, and nobody else', () => {
    const rows = assignmentNotifications(event, assignment, null, false);
    expect(pair(rows)).toEqual([[organiserId, 'COORDINATOR_ASSIGNED'], [coordinatorId, 'COORDINATOR_ASSIGNED']]);
    expect(rows[0]!.message).toBe('Casey is now the coordinator for “Career fair”.');
    expect(rows[1]!.message).toBe('You have been allocated “Career fair”. Open it to start the review.');
    expect(new Set(rows.map((row) => row.dedupeKey))).toEqual(new Set(['COORDINATOR_ASSIGNED:a1']));
  });

  it('adds a minimal notice for the previous coordinator on reassignment, naming no event detail', () => {
    const rows = assignmentNotifications(event, assignment, previousId, true);
    expect(pair(rows)).toEqual([
      [organiserId, 'COORDINATOR_REASSIGNED'], [coordinatorId, 'COORDINATOR_REASSIGNED'],
      [previousId, 'COORDINATOR_REASSIGNED_AWAY'],
    ]);
    const away = rows[2]!;
    expect(away.message).toBe(REASSIGNED_AWAY_MESSAGE);
    expect(JSON.stringify(away)).not.toContain('Career fair');
    expect(JSON.stringify(away)).not.toContain('Casey');
    expect(away.dedupeKey).toBe('COORDINATOR_REASSIGNED_AWAY:a1');
  });

  it('gives no previous-coordinator notice when there was none or when it is the same person', () => {
    expect(assignmentNotifications(event, assignment, null, true)).toHaveLength(2);
    expect(assignmentNotifications(event, assignment, coordinatorId, true)).toHaveLength(2);
    expect(assignmentNotifications(event, assignment, previousId, false)).toHaveLength(2);
  });
});

describe('KAN-64-AC203/AC208 venue booking decisions', () => {
  const booking = {
    id: 'b1', decision: 'APPROVED' as const, reason: null, venueName: 'Harbour Hall',
    startsAt: '2026-10-05T02:00:00.000Z', endsAt: '2026-10-05T04:00:00.000Z',
  };
  const withCoordinator = { ...event, coordinatorId };

  it('formats the period in Singapore time', () => {
    expect(bookingPeriod(booking.startsAt, booking.endsAt).replace(/\s/g, ' '))
      .toBe('5 Oct 2026, 10:00 to 5 Oct 2026, 12:00 (Singapore time)');
  });

  it('notifies the organiser, the current coordinator and the deciding staff member, who is also the actor', () => {
    const rows = bookingDecisionNotifications(withCoordinator, booking, staffId);
    expect(pair(rows)).toEqual([
      [organiserId, 'VENUE_BOOKING_APPROVED'], [coordinatorId, 'VENUE_BOOKING_APPROVED'], [staffId, 'VENUE_BOOKING_APPROVED'],
    ]);
    expect(rows.every((row) => row.venueBookingId === 'b1' && row.eventRequestId === event.id)).toBe(true);
    expect(rows.every((row) => row.dedupeKey === 'VENUE_BOOKING_APPROVED:b1')).toBe(true);
    const text = (row: { message: string }) => row.message.replace(/\s/g, ' ');
    expect(text(rows[0]!)).toBe('Venue staff approved the booking request for “Career fair” at Harbour Hall, '
      + '5 Oct 2026, 10:00 to 5 Oct 2026, 12:00 (Singapore time).');
    expect(text(rows[1]!)).toContain('Open the booking for details.');
    expect(text(rows[2]!)).toMatch(/^You approved the booking request for “Career fair”/);
  });

  it('includes the rejection reason and a next step for the coordinator', () => {
    const rows = bookingDecisionNotifications(withCoordinator, { ...booking, decision: 'REJECTED', reason: 'Double booked' }, staffId);
    expect(rows.map((row) => row.type)).toEqual(Array(3).fill('VENUE_BOOKING_REJECTED'));
    for (const row of rows) expect(row.message).toContain('Reason: Double booked.');
    expect(rows[1]!.message).toMatch(/Reason: Double booked\. Review the reason and request another venue if needed\.$/);
    expect(rows[0]!.title).toBe('Venue booking rejected');
  });

  it('skips the coordinator when the event has none assigned', () => {
    expect(pair(bookingDecisionNotifications({ ...event, coordinatorId: null }, booking, staffId)))
      .toEqual([[organiserId, 'VENUE_BOOKING_APPROVED'], [staffId, 'VENUE_BOOKING_APPROVED']]);
  });
});

describe('KAN-64 notification vocabulary', () => {
  it('uses only declared types and never overlaps the KAN-80 triggers', () => {
    expect(NOTIFICATION_TYPES).toEqual([
      'REQUEST_SUBMITTED', 'CLARIFICATION_REQUESTED', 'REVIEW_APPROVED', 'REVIEW_REJECTED', 'COORDINATOR_ASSIGNED',
      'COORDINATOR_REASSIGNED', 'COORDINATOR_REASSIGNED_AWAY', 'VENUE_BOOKING_APPROVED', 'VENUE_BOOKING_REJECTED',
    ]);
    expect(NOTIFICATION_TYPES.some((type) => /CONFIRM|CANCEL|REGISTRATION|EQUIPMENT|CHANGE/.test(type))).toBe(false);
    const every = [
      ...submissionNotifications(event), ...clarificationNotifications(event, { id: 'c', message: 'm' }),
      ...reviewNotifications(event, { id: 'r', decision: 'APPROVED', reason: null }),
      ...assignmentNotifications(event, { id: 'a', coordinatorId, coordinatorName: 'C' }, previousId, true),
    ];
    for (const row of every) expect(NOTIFICATION_TYPES).toContain(row.type);
  });
});
