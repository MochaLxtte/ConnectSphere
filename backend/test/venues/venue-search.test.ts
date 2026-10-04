import { describe, expect, it, vi } from 'vitest';
import type { WorkflowActor, WorkflowDependencies } from '../../src/modules/events/workflow-support.js';
import { isOpenForRange, listVenueFilterOptions, parseVenueSearchQuery, searchVenues } from '../../src/modules/venues/venue-search.js';

/**
 * Venue search tests. Full descriptions: docs/venue-search-test-cases.md
 *
 * Test names read "TC-VS-nn [acceptance criterion, test type]". The criteria are:
 *   AC1  coordinator can search/filter by the listed criteria
 *   AC2  results reflect the current venue catalogue
 *   AC3  results correspond to the filters: failing venues are excluded, "no match" is clear,
 *        and no match never rejects the event request
 *   AC4  users not authorised for venue planning cannot search
 *   AC5  coordinator can change or clear filters and see updated results
 *   AC6  each result clearly identifies its venue
 */

const coordinator = { id: 'coordinator-1', role: 'EVENT_COORDINATOR' } as WorkflowActor;
const noFilters = parseVenueSearchQuery({});
const sgt = (value: string) => new Date(`${value}+08:00`).toISOString();
const range = (start: string, end: string) => parseVenueSearchQuery({ startsAt: sgt(start), endsAt: sgt(end) });

function venue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1', name: 'Harbourfront Hall', description: null, location: 'Marina Bay', capacity: 300,
    layouts: ['THEATRE'], facilities: ['WIFI'], accessibilityFeatures: [], wheelchairAccessible: true,
    opensAt: null, closesAt: null, updatedAt: new Date('2026-10-01T02:00:00Z'),
    ...overrides,
  };
}

/** Each call to pool.query returns the next result: first the venues, then (date searches only) bookings. */
function fakeDeps(...results: unknown[][]) {
  const query = vi.fn();
  for (const rows of results) query.mockResolvedValueOnce({ rows });
  query.mockResolvedValue({ rows: [] });
  return { deps: { pool: { query } } as unknown as WorkflowDependencies, query };
}

describe('AC1: search and filter by event requirements', () => {
  it('TC-VS-01 [AC1, positive] accepts date/time, attendance, location, capacity, accessibility, layout and facilities', () => {
    expect(parseVenueSearchQuery({
      startsAt: '2026-10-20T14:00:00+08:00', endsAt: '2026-10-20T18:00:00+08:00',
      attendance: '120', capacity: '150', location: ' Marina ', layout: 'THEATRE',
      wheelchairAccessible: 'true', accessibility: ['Lift', 'Hearing loop'], facilities: ['Projector', 'Wi-Fi'],
    })).toEqual({
      startsAt: '2026-10-20T06:00:00.000Z', endsAt: '2026-10-20T10:00:00.000Z',
      attendance: 120, capacity: 150, location: 'Marina', layout: 'THEATRE',
      wheelchairAccessible: true, accessibility: ['Lift', 'Hearing loop'], facilities: ['Projector', 'Wi-Fi'],
    });
  });

  it.each([
    [{ startsAt: '2026-10-20T06:00:00Z' }, /both a start and an end/],
    [{ startsAt: '2026-10-20T10:00:00Z', endsAt: '2026-10-20T06:00:00Z' }, /end time must be after/],
    [{ attendance: 'many' }, /whole number/],
    [{ capacity: '0' }, /at least 1/],
    [{ wheelchairAccessible: 'maybe' }, /true or false/],
  ])('TC-VS-02 [AC1, negative] rejects invalid input %j', (input, message) => {
    expect(() => parseVenueSearchQuery(input)).toThrow(message);
  });

  it('TC-VS-03 [AC1, positive] applies every filter, using the larger of attendance and capacity', async () => {
    const { deps, query } = fakeDeps();
    await searchVenues(deps, coordinator, parseVenueSearchQuery({
      attendance: '100', capacity: '150', location: 'marina', layout: 'THEATRE',
      facilities: 'Projector', accessibility: 'Lift', wheelchairAccessible: 'true',
    }));
    expect(query.mock.calls[0]![1]).toEqual([150, 'marina', 'THEATRE', ['Projector'], ['Lift'], true]);
  });
});

describe('AC2: results reflect the current venue catalogue', () => {
  it('TC-VS-04 [AC2, positive] reads active venues from the database on every search, with no caching', async () => {
    const { deps, query } = fakeDeps([venue({ id: 'old' })], [venue({ id: 'new' })]);
    const first = await searchVenues(deps, coordinator, noFilters);
    const second = await searchVenues(deps, coordinator, noFilters);
    expect(first.map((v) => v.id)).toEqual(['old']);
    expect(second.map((v) => v.id)).toEqual(['new']);
    expect(String(query.mock.calls[0]![0])).toMatch(/FROM public\.venues[\s\S]*WHERE v\.is_active/);
  });

  it('TC-VS-05 [AC2, positive] builds the filter choices from the live catalogue', async () => {
    const { deps } = fakeDeps([{ value: 'THEATRE' }], [{ value: 'WIFI' }], [{ value: 'Lift' }]);
    await expect(listVenueFilterOptions(deps, coordinator)).resolves.toEqual({
      layouts: ['THEATRE'], facilities: ['WIFI'], accessibility: ['Lift'],
    });
  });
});

describe('AC3: results correspond to the filters selected', () => {
  it('TC-VS-06 [AC3, positive] sends neutral parameters when no filter is set, so nothing is excluded', async () => {
    const { deps, query } = fakeDeps([venue()]);
    await searchVenues(deps, coordinator, noFilters);
    expect(query.mock.calls[0]![1]).toEqual([0, null, null, [], [], false]);
    expect(query).toHaveBeenCalledTimes(1); // no booking query without a date range
  });

  it('TC-VS-07 [AC3, negative] excludes a venue with an approved booking that overlaps the event', async () => {
    const { deps, query } = fakeDeps([venue({ id: 'booked' }), venue({ id: 'free' })], [{ venueId: 'booked' }]);
    const result = await searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-20T16:00'));
    expect(result.map((v) => v.id)).toEqual(['free']);
    expect(query.mock.calls[1]![1]).toEqual([sgt('2026-10-20T14:00'), sgt('2026-10-20T16:00')]);
    const sql = String(query.mock.calls[1]![0]);
    expect(sql).toContain("status = 'APPROVED'");
    expect(sql).toMatch(/starts_at < \$2/); // half-open overlap: back-to-back bookings are allowed
    expect(sql).toMatch(/ends_at > \$1/);
  });

  it('TC-VS-08 [AC3, negative] excludes a venue that is closed at the requested time', async () => {
    const { deps } = fakeDeps([venue({ opensAt: '09:00', closesAt: '17:00' })]);
    expect(await searchVenues(deps, coordinator, range('2026-10-20T18:00', '2026-10-20T20:00'))).toEqual([]);
  });

  it('TC-VS-09 [AC3, negative] excludes venues with opening hours for a multi-day event (20 Oct 2pm to 23 Oct 8pm)', async () => {
    const { deps } = fakeDeps([venue({ id: 'a', opensAt: '08:00', closesAt: '22:00' }), venue({ id: 'b', opensAt: '06:00', closesAt: '23:00' })]);
    expect(await searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-23T20:00'))).toEqual([]);
  });

  it('TC-VS-10 [AC3, positive] still offers a venue with no opening hours for a multi-day event, unless it is booked', async () => {
    const { deps } = fakeDeps([venue({ id: 'free' }), venue({ id: 'booked' })], [{ venueId: 'booked' }]);
    const result = await searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-23T20:00'));
    expect(result.map((v) => v.id)).toEqual(['free']);
  });

  describe('opening hours of 08:00 to 22:00 (Singapore time)', () => {
    const hours = { opensAt: '08:00', closesAt: '22:00' };
    it.each([
      { title: 'TC-VS-11 [AC3, positive] event inside the hours', start: '2026-10-20T14:00', end: '2026-10-20T18:00', open: true },
      { title: 'TC-VS-12 [AC3, boundary] event exactly from opening to closing', start: '2026-10-20T08:00', end: '2026-10-20T22:00', open: true },
      { title: 'TC-VS-13 [AC3, negative] event starting before opening', start: '2026-10-20T07:00', end: '2026-10-20T10:00', open: false },
      { title: 'TC-VS-14 [AC3, negative] event ending after closing', start: '2026-10-20T18:00', end: '2026-10-20T23:00', open: false },
      { title: 'TC-VS-15 [AC3, negative] event running overnight', start: '2026-10-20T20:00', end: '2026-10-21T01:00', open: false },
      { title: 'TC-VS-16 [AC3, negative] event spanning several days', start: '2026-10-20T14:00', end: '2026-10-23T20:00', open: false },
    ])('$title', ({ start, end, open }) => {
      expect(isOpenForRange(hours, sgt(start), sgt(end))).toBe(open);
    });

    it('TC-VS-17 [AC3, boundary] uses Singapore time, not UTC', () => {
      expect(isOpenForRange(hours, '2026-10-20T00:30:00.000Z', '2026-10-20T04:00:00.000Z')).toBe(true);
      expect(isOpenForRange(hours, '2026-10-20T15:00:00.000Z', '2026-10-20T17:00:00.000Z')).toBe(false);
    });

    it('TC-VS-18 [AC3, positive] treats a venue with no opening hours as always open', () => {
      expect(isOpenForRange({ opensAt: null, closesAt: null }, sgt('2026-10-20T14:00'), sgt('2026-10-23T20:00'))).toBe(true);
    });
  });

  it('TC-VS-19 [AC3, negative] a venue failing a filter is excluded, and "no match" is an empty list, not an error', async () => {
    const { deps } = fakeDeps([venue({ id: 'only' })], [{ venueId: 'only' }]);
    await expect(searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-20T16:00'))).resolves.toEqual([]);
  });

  it('TC-VS-20 [AC3, negative] searching only reads data and never touches event requests', async () => {
    const { deps, query } = fakeDeps([venue()], [{ venueId: 'v1' }]);
    await searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-20T16:00'));
    for (const [sql] of query.mock.calls) {
      expect(String(sql).trim()).toMatch(/^SELECT/i);
      expect(String(sql)).not.toMatch(/event_requests|\b(insert|update|delete)\b/i);
    }
  });
});

describe('AC4: users not authorised for venue planning cannot search', () => {
  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'])(
    'TC-VS-21 [AC4, security] refuses %s without touching the database',
    async (role) => {
      const { deps, query } = fakeDeps();
      const actor = { id: 'user-1', role } as WorkflowActor;
      await expect(searchVenues(deps, actor, noFilters)).rejects.toThrow('Only event coordinators can search venues.');
      await expect(listVenueFilterOptions(deps, actor)).rejects.toThrow('Only event coordinators can search venues.');
      expect(query).not.toHaveBeenCalled();
    },
  );
});

describe('AC5: change or clear filters and see updated results', () => {
  it('TC-VS-22 [AC5, positive] cleared (empty) filter values count as not supplied', () => {
    expect(parseVenueSearchQuery({
      startsAt: '', endsAt: '', attendance: '', capacity: '  ', location: '', layout: '',
      wheelchairAccessible: '', accessibility: [''], facilities: '',
    })).toEqual(noFilters);
  });

  it('TC-VS-23 [AC5, positive] a search after changing then clearing filters is independent of the earlier one', async () => {
    const { deps, query } = fakeDeps([venue({ id: 'big' })], [venue({ id: 'big' }), venue({ id: 'small', capacity: 20 })]);
    await searchVenues(deps, coordinator, parseVenueSearchQuery({ capacity: '200' }));
    const cleared = await searchVenues(deps, coordinator, noFilters);
    expect(query.mock.calls[0]![1]![0]).toBe(200);
    expect(query.mock.calls[1]![1]![0]).toBe(0);
    expect(cleared.map((v) => v.id)).toEqual(['big', 'small']);
  });
});

describe('AC6: each result clearly identifies its venue', () => {
  it('TC-VS-24 [AC6, positive] every result carries its venue id and name', async () => {
    const { deps } = fakeDeps([venue({ id: 'a', name: 'Hall A' }), venue({ id: 'b', name: 'Hall B' })]);
    const result = await searchVenues(deps, coordinator, noFilters);
    expect(result.map(({ id, name }) => ({ id, name }))).toEqual([{ id: 'a', name: 'Hall A' }, { id: 'b', name: 'Hall B' }]);
    expect(result[0]!.updatedAt).toBe('2026-10-01T02:00:00.000Z');
  });
});