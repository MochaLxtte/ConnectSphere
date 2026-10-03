import { describe, expect, it, vi } from 'vitest';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import {
  listVenueAvailability, MAX_WINDOW_DAYS, parseAvailabilityWindow, VENUE_CALENDAR_ROLES,
} from '../../src/modules/venues/availability.js';

const coordinator: WorkflowActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const venueStaff: WorkflowActor = { id: '20000000-0000-4000-8000-000000000002', role: 'VENUE_STAFF' };
const technician: WorkflowActor = { id: '20000000-0000-4000-8000-000000000003', role: 'TECHNICAL_SUPPORT_STAFF' };
const week = { from: '2026-10-04T16:00:00.000Z', to: '2026-10-11T16:00:00.000Z' };

function fakePool(rows: unknown[] = []) {
  return { query: vi.fn().mockResolvedValue({ rows }), connect: vi.fn() };
}

describe('KAN-51 availability window input', () => {
  it('normalises a Singapore-time week to UTC instants', () => {
    expect(parseAvailabilityWindow({ from: '2026-10-05T00:00:00+08:00', to: '2026-10-12T00:00+08:00' }))
      .toEqual(week);
  });

  it(`accepts a window of exactly ${MAX_WINDOW_DAYS} days`, () => {
    expect(parseAvailabilityWindow({ from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00.000Z' }))
      .toEqual({ from: '2026-10-01T00:00:00.000Z', to: '2026-11-01T00:00:00.000Z' });
  });

  it.each([
    [{}, /^from /],
    [{ from: '2026-10-05T00:00:00Z' }, /^to /],
    [{ from: ['2026-10-05T00:00:00Z', '2026-10-06T00:00:00Z'], to: '2026-10-07T00:00:00Z' }, /^from /],
    [{ from: '2026-10-05', to: '2026-10-06' }, /^from .*offset/],
    [{ from: '2026-10-05T00:00:00', to: '2026-10-06T00:00:00' }, /^from .*offset/],
    [{ from: 'next Monday', to: '2026-10-06T00:00:00Z' }, /^from /],
    [{ from: '2026-02-30T00:00:00Z', to: '2026-03-06T00:00:00Z' }, /^from must be a valid/],
    [{ from: '2026-10-05T25:00:00Z', to: '2026-10-06T00:00:00Z' }, /^from must be a valid/],
    [{ from: '2026-10-06T00:00:00Z', to: '2026-10-05T00:00:00Z' }, /after/],
    [{ from: '2026-10-05T00:00:00Z', to: '2026-10-05T00:00:00Z' }, /after/],
    [{ from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:01Z' }, /at most 31 days/],
  ])('rejects %j', (query, message) => {
    expect(() => parseAvailabilityWindow(query)).toThrowError(expect.objectContaining({
      kind: 'INVALID_INPUT', code: 'INVALID_AVAILABILITY_WINDOW', message: expect.stringMatching(message),
    }));
  });
});

describe('KAN-51 venue availability query', () => {
  it('limits the calendar to the three internal planning roles', () => {
    expect(VENUE_CALENDAR_ROLES).toEqual(['EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF']);
  });

  it.each(['EVENT_ORGANISER', 'ATTENDEE'] as const)('refuses %s before reading venue data', async (role) => {
    const pool = fakePool();
    await expect(listVenueAvailability({ pool }, { id: coordinator.id, role }, week))
      .rejects.toMatchObject({ kind: 'FORBIDDEN', code: 'VENUE_AVAILABILITY_FORBIDDEN' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each([coordinator, venueStaff, technician])('reads active venues for $role with parameterised values', async (actor) => {
    const pool = fakePool();
    expect(await listVenueAvailability({ pool }, actor, week)).toEqual([]);
    expect(pool.query).toHaveBeenCalledOnce();
    const [sql, values] = pool.query.mock.calls[0]!;
    expect(sql).toContain('WHERE v.is_active');
    expect(sql).toContain("b.status = 'APPROVED'");
    expect(sql).toContain('FROM venue_unavailability u');
    expect(sql).not.toContain(actor.id);
    expect(values).toEqual([week.from, week.to, actor.role, actor.id]);
  });

  it('returns each venue with typed periods as ISO instants', async () => {
    const pool = fakePool([
      {
        id: 'venue-1', name: 'Harbour Hall', location: 'Level 1', capacity: 300,
        opensAt: '08:00', closesAt: '22:00',
        unavailable: [
          {
            id: 'booking-1', kind: 'BOOKING', reason: null, event: null,
            startsAt: '2026-10-05T10:00:00+08:00', endsAt: '2026-10-05T12:00:00+08:00',
          },
          {
            id: 'block-1', kind: 'BLOCKED', reason: 'Maintenance', event: null,
            startsAt: '2026-10-06T01:00:00+00:00', endsAt: '2026-10-07T10:00:00+00:00',
          },
          {
            id: 'booking-2', kind: 'BOOKING', reason: null, event: { id: 'event-1', name: 'Career fair' },
            startsAt: '2026-10-08T06:00:00+00:00', endsAt: '2026-10-08T09:30:00+00:00',
          },
        ],
      },
      {
        id: 'venue-2', name: 'Orchid Seminar Room', location: null, capacity: 40,
        opensAt: null, closesAt: null, unavailable: [],
      },
    ]);

    expect(await listVenueAvailability({ pool }, coordinator, week)).toEqual([
      {
        id: 'venue-1', name: 'Harbour Hall', location: 'Level 1', capacity: 300,
        opensAt: '08:00', closesAt: '22:00',
        unavailable: [
          { id: 'booking-1', kind: 'BOOKING', startsAt: '2026-10-05T02:00:00.000Z', endsAt: '2026-10-05T04:00:00.000Z', event: null },
          { id: 'block-1', kind: 'BLOCKED', startsAt: '2026-10-06T01:00:00.000Z', endsAt: '2026-10-07T10:00:00.000Z', reason: 'Maintenance' },
          {
            id: 'booking-2', kind: 'BOOKING', startsAt: '2026-10-08T06:00:00.000Z', endsAt: '2026-10-08T09:30:00.000Z',
            event: { id: 'event-1', name: 'Career fair' },
          },
        ],
      },
      {
        id: 'venue-2', name: 'Orchid Seminar Room', location: null, capacity: 40,
        opensAt: null, closesAt: null, unavailable: [],
      },
    ]);
  });

  it('propagates a database failure to the caller', async () => {
    const pool = { query: vi.fn().mockRejectedValue(new Error('connection lost')), connect: vi.fn() };
    await expect(listVenueAvailability({ pool }, venueStaff, week)).rejects.toThrow('connection lost');
  });
});
