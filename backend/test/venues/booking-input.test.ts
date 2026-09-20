import { describe, expect, it } from 'vitest';
import {
  BookingInputError, parseBookingDecisionInput, parseBookingListQuery, parseBookingRequestInput,
} from '../../src/modules/venues/booking-input.js';

const eventRequestId = '10000000-0000-4000-8000-000000000001';
const venueId = '20000000-0000-4000-8000-000000000001';

describe('CF-12 booking request input', () => {
  it('defaults the period to the event interval when none is supplied', () => {
    expect(parseBookingRequestInput({ eventRequestId, venueId })).toEqual({
      eventRequestId, venueId, startsAt: null, endsAt: null, layout: null, notes: null,
    });
  });

  it('normalises a supplied period and trims text', () => {
    expect(parseBookingRequestInput({
      eventRequestId, venueId, startsAt: '2026-10-01T09:00:00+08:00', endsAt: '2026-10-01T11:00:00+08:00',
      layout: ' Theatre ', notes: '  Setup from 8am ',
    })).toEqual({
      eventRequestId, venueId, startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T03:00:00.000Z',
      layout: 'Theatre', notes: 'Setup from 8am',
    });
  });

  it.each([
    [null], [[]],
    [{ venueId }],
    [{ eventRequestId: 'abc', venueId }],
    [{ eventRequestId, venueId: 5 }],
    [{ eventRequestId, venueId, startsAt: '2026-10-01T09:00:00Z' }],
    [{ eventRequestId, venueId, startsAt: '2026-10-01', endsAt: '2026-10-02' }],
    [{ eventRequestId, venueId, startsAt: '2026-10-01T09:00:00Z', endsAt: '2026-10-01T09:00:00Z' }],
    [{ eventRequestId, venueId, layout: 7 }],
    [{ eventRequestId, venueId, notes: 'x'.repeat(2001) }],
    [{ eventRequestId, venueId, requestedBy: eventRequestId }],
    [{ eventRequestId, venueId, status: 'APPROVED' }],
  ])('rejects %j', (input) => {
    expect(() => parseBookingRequestInput(input)).toThrowError(
      expect.objectContaining({ code: 'INVALID_VENUE_BOOKING_INPUT' }),
    );
  });
});

describe('CF-13 booking decision input', () => {
  it('accepts an approval without a reason and a rejection with one', () => {
    expect(parseBookingDecisionInput({ decision: 'APPROVED' })).toEqual({ decision: 'APPROVED', reason: null });
    expect(parseBookingDecisionInput({ decision: 'REJECTED', reason: ' Double booked ' }))
      .toEqual({ decision: 'REJECTED', reason: 'Double booked' });
  });

  it.each([
    [{ decision: 'REJECTED' }],
    [{ decision: 'REJECTED', reason: '   ' }],
    [{ decision: 'CANCELLED' }],
    [{ decision: 'APPROVED', reason: 4 }],
    [{ decision: 'APPROVED', decidedBy: 'someone' }],
    ['APPROVED'],
  ])('rejects %j', (input) => {
    expect(() => parseBookingDecisionInput(input)).toThrowError(BookingInputError);
  });
});

describe('booking list query', () => {
  it('gives venue staff the pending queue by default and any valid status on request', () => {
    expect(parseBookingListQuery({}, true)).toEqual({ kind: 'QUEUE', status: 'PENDING' });
    expect(parseBookingListQuery({ status: 'APPROVED' }, true)).toEqual({ kind: 'QUEUE', status: 'APPROVED' });
  });

  it('requires an event for organisers and coordinators', () => {
    expect(parseBookingListQuery({ eventRequestId }, false)).toEqual({ kind: 'EVENT', eventRequestId });
  });

  it.each([
    [{ status: 'pending' }, true], [{ status: ['PENDING', 'APPROVED'] }, true], [{ eventRequestId }, true],
    [{}, false], [{ eventRequestId: 'x' }, false], [{ status: 'PENDING' }, false],
  ])('rejects %j (staff: %s)', (query, staff) => {
    expect(() => parseBookingListQuery(query, staff)).toThrowError(
      expect.objectContaining({ code: 'INVALID_VENUE_BOOKING_QUERY' }),
    );
  });
});
