import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api-client';
import {
  buildWeekAgenda, describeActionFailure, describeLoadFailure, formatClock, formatOperatingHours,
  singaporeInputToIso, singaporeWeekStart, splitTags,
} from './presentation';

const clearLocalSession = vi.hoisted(() => vi.fn());
vi.mock('../auth/session.js', () => ({ clearLocalSession }));

describe('venue presentation helpers', () => {
  it('reads datetime-local values as Singapore time', () => {
    expect(singaporeInputToIso('2026-10-01T09:30')).toBe('2026-10-01T01:30:00.000Z');
    expect(singaporeInputToIso('')).toBeNull();
    expect(singaporeInputToIso('2026-10-01')).toBeNull();
  });

  it('starts the week on Monday 00:00 Singapore time, even when UTC is still Sunday', () => {
    // Sunday 20:00 UTC is already Monday 04:00 in Singapore.
    expect(new Date(singaporeWeekStart(Date.parse('2026-10-04T20:00:00Z'))).toISOString()).toBe('2026-10-04T16:00:00.000Z');
    expect(new Date(singaporeWeekStart(Date.parse('2026-10-04T10:00:00Z'))).toISOString()).toBe('2026-09-27T16:00:00.000Z');
    expect(new Date(singaporeWeekStart(Date.parse('2026-10-04T20:00:00Z'), 1)).toISOString()).toBe('2026-10-11T16:00:00.000Z');
  });

  it('clips busy intervals to each Singapore day and hides details it was not given', () => {
    const weekStart = Date.parse('2026-10-04T16:00:00Z');
    const agenda = buildWeekAgenda(weekStart, [
      { kind: 'BLOCKED', id: 'block-1', reason: 'Maintenance', startsAt: '2026-10-05T14:00:00Z', endsAt: '2026-10-06T02:00:00Z' },
      { kind: 'BOOKING', startsAt: '2026-10-05T01:00:00Z', endsAt: '2026-10-05T03:00:00Z' },
    ]);
    expect(agenda).toHaveLength(7);
    expect(agenda[0]!.label).toContain('Monday');
    expect(agenda[0]!.slots.map((slot) => [slot.label, slot.kind, slot.detail, slot.blockId])).toEqual([
      ['09:00 to 11:00', 'BOOKING', null, null],
      ['22:00 to 24:00', 'BLOCKED', 'Maintenance', 'block-1'],
    ]);
    expect(agenda[1]!.slots.map((slot) => slot.label)).toEqual(['00:00 to 10:00']);
    expect(agenda[2]!.slots).toEqual([]);
  });

  it('formats clocks, hours and tag lists', () => {
    expect(formatClock('2026-10-05T01:05:00Z')).toBe('09:05');
    expect(formatOperatingHours(null, null)).toBe('Open all day');
    expect(formatOperatingHours('08:00', null)).toBe('08:00 to 24:00');
    expect(splitTags(' Projector, ,Stage,Projector ')).toEqual(['Projector', 'Stage']);
  });

  it('classifies load and action failures and forgets the session on 401', () => {
    expect(describeLoadFailure(new ApiError('x', 401, 'AUTHENTICATION_REQUIRED'), 'venues'))
      .toEqual({ message: 'Sign in to view venues.', signIn: true, retryable: false });
    expect(clearLocalSession).toHaveBeenCalledOnce();
    expect(describeLoadFailure(new ApiError('x', 404, 'VENUE_NOT_FOUND'), 'this venue'))
      .toMatchObject({ retryable: false, signIn: false, message: expect.stringContaining('This venue is unavailable') });
    expect(describeLoadFailure(new Error('boom'), 'venues')).toMatchObject({ retryable: true });
    expect(describeActionFailure(new ApiError('Name taken.', 409, 'VENUE_NAME_TAKEN'), 'fallback')).toBe('Name taken.');
    expect(describeActionFailure(new ApiError('secret', 500, 'INTERNAL_ERROR'), 'fallback')).toBe('fallback');
  });
});
