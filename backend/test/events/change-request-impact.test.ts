import { describe, expect, it } from 'vitest';
import {
  AFFECTED_ARRANGEMENTS, affectedKinds, assessChangeImpact, isSignificantField, type ArrangementRecord,
} from '../../src/modules/events/change-request-impact.js';
import { SIGNIFICANT_FIELDS } from '../../src/modules/events/planning-edit-policy.js';

const venue = (status: string, id = `venue-${status}`): ArrangementRecord =>
  ({ kind: 'VENUE_BOOKING', id, label: 'Hall A', status, quantity: null });
const equipment = (status: string, id = `equipment-${status}`): ArrangementRecord =>
  ({ kind: 'EQUIPMENT_REQUEST', id, label: 'Microphone', status, quantity: 2 });

describe('KAN-15 change impact rules (design D4/D5)', () => {
  it('KAN-15-AC102 maps every significant field, and only those, to arrangement kinds', () => {
    expect(Object.keys(AFFECTED_ARRANGEMENTS).sort()).toEqual([...SIGNIFICANT_FIELDS].sort());
    expect(isSignificantField('startsAt')).toBe(true);
    expect(isSignificantField('name')).toBe(false);
    expect(isSignificantField('description')).toBe(false);
  });

  it('KAN-15-AC7 treats dates as affecting venue, equipment and registrations, in a stable order', () => {
    expect(affectedKinds(['endsAt'])).toEqual(['VENUE', 'EQUIPMENT', 'REGISTRATION']);
    expect(affectedKinds(['equipmentRequirements', 'expectedAttendance'])).toEqual(['VENUE', 'EQUIPMENT']);
    expect(affectedKinds(['registrationCapacity'])).toEqual(['REGISTRATION']);
    expect(affectedKinds(['purpose'])).toEqual([]);
  });

  it('KAN-15-AC104 lists pending arrangements of affected kinds for cancellation and allows approval', () => {
    const impact = assessChangeImpact({
      fields: ['expectedAttendance'], eventStatus: 'APPROVED', activeRegistrations: 3,
      arrangements: [venue('PENDING'), venue('HELD'), equipment('REQUESTED')],
    });
    expect(impact).toEqual({
      affectedKinds: ['VENUE'], confirmed: [], pending: [venue('PENDING'), venue('HELD')],
      activeRegistrations: 0, eventConfirmed: false, canApprove: true, blockedReason: null,
    });
  });

  it('KAN-15-AC103 blocks approval when a confirmed venue booking or equipment reservation is affected', () => {
    const impact = assessChangeImpact({
      fields: ['startsAt'], eventStatus: 'APPROVED', activeRegistrations: 0,
      arrangements: [venue('APPROVED'), equipment('RESERVED'), equipment('REQUESTED')],
    });
    expect(impact.confirmed).toEqual([venue('APPROVED'), equipment('RESERVED')]);
    expect(impact.pending).toEqual([equipment('REQUESTED')]);
    expect(impact.canApprove).toBe(false);
    expect(impact.blockedReason).toBe('This change cannot be approved because it affects confirmed venue or ' +
      'equipment arrangements. Cancel the event and submit a new request instead.');
  });

  it('KAN-15-AC103 blocks approval for active registrations and a confirmed event, naming every reason', () => {
    const impact = assessChangeImpact({
      fields: ['registrationClosesAt'], eventStatus: 'CONFIRMED', activeRegistrations: 2, arrangements: [venue('APPROVED')],
    });
    expect(impact).toMatchObject({ confirmed: [], activeRegistrations: 2, eventConfirmed: true, canApprove: false });
    expect(impact.blockedReason).toBe('This change cannot be approved because the event is confirmed and it ' +
      'affects active registrations. Cancel the event and submit a new request instead.');
  });

  it('allows a purpose-only change on a confirmed event because no arrangement is affected', () => {
    const impact = assessChangeImpact({
      fields: ['purpose'], eventStatus: 'CONFIRMED', activeRegistrations: 9, arrangements: [venue('APPROVED')],
    });
    expect(impact).toMatchObject({
      affectedKinds: [], confirmed: [], pending: [], activeRegistrations: 0, eventConfirmed: false, canApprove: true,
    });
  });
});
