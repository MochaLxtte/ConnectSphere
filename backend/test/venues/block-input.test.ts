import { describe, expect, it } from 'vitest';
import { parseBlockSubmission } from '../../src/modules/venues/block-input.js';

const startsAt = '2026-12-01T02:00:00.000Z';
const endsAt = '2026-12-01T06:00:00.000Z';

describe('KAN-55 venue-unavailability block submission input', () => {
  it('accepts a submission and normalises dates and the trimmed reason', () => {
    expect(parseBlockSubmission({ startsAt, endsAt, reason: '  Scheduled maintenance  ' }))
      .toEqual({ startsAt, endsAt, reason: 'Scheduled maintenance' });
  });
  it('normalises a date-time to an ISO string', () => {
    expect(parseBlockSubmission({ startsAt: '2026-12-01T10:00:00+08:00', endsAt, reason: 'Renovation' }).startsAt)
      .toBe('2026-12-01T02:00:00.000Z');
  });
  it('accepts the maximum reason length', () => {
    expect(parseBlockSubmission({ startsAt, endsAt, reason: 'a'.repeat(2000) }).reason).toHaveLength(2000);
  });
  it.each([
    null, [], '', {},
    { startsAt, endsAt },
    { startsAt, endsAt, reason: '' },
    { startsAt, endsAt, reason: '   ' },
    { startsAt, endsAt, reason: 'a'.repeat(2001) },
    { startsAt, endsAt, reason: 1 },
    { endsAt, reason: 'Maintenance' },
    { startsAt, reason: 'Maintenance' },
    { startsAt: 'not-a-date', endsAt, reason: 'Maintenance' },
    { startsAt, endsAt: 'not-a-date', reason: 'Maintenance' },
    { startsAt: endsAt, endsAt: startsAt, reason: 'Maintenance' },
    { startsAt, endsAt: startsAt, reason: 'Maintenance' },
    { startsAt, endsAt, reason: 'Maintenance', venueId: '12345678-1234-1234-1234-123456789abc' },
    { startsAt, endsAt, reason: 'Maintenance', createdBy: 'spoofed' },
  ])('rejects malformed input %j', (input) => {
    expect(() => parseBlockSubmission(input)).toThrow();
  });
});
