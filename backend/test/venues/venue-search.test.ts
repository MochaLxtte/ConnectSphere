import { describe, expect, it, vi } from 'vitest';
import type { WorkflowActor, WorkflowDependencies } from '../../src/modules/events/workflow-support.js';
import { isOpenForRange, listVenueFilterOptions, parseVenueSearchQuery, searchVenues } from '../../src/modules/venues/venue-search.js';

/**
 * KAN-12 venue search: backend tests. Full descriptions: docs/venue-search-test-cases.md
 *
 * Test names read "TC-VS-nn [KAN-12-ACn, test type]". The acceptance criteria are:
 *   AC1 date and time        AC2 expected attendance   AC3 location          AC4 capacity
 *   AC5 accessibility        AC6 room layout           AC7 facilities
 *   AC8 current catalogue    AC9 results match filters AC10 excluded / no match
 *   AC11 change or clear     AC12 result identifies venue
 *   AC13 authorisation       AC14 incomplete or backwards period
 *   AC15 and AC16 are page behaviour, covered in frontend/src/features/venues/pages/VenueSearchPage.test.ts
 *   AC101 impossible calendar dates are refused, never silently changed
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

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC1: date and time', () => {
  it('TC-VS-01 [KAN-12-AC1, positive] accepts a start and end and normalises them to UTC', () => {
    const filters = parseVenueSearchQuery({
      startsAt: '2026-10-20T14:00:00+08:00', endsAt: '2026-10-20T10:00:00.000Z',
    });
    expect(filters.startsAt).toBe('2026-10-20T06:00:00.000Z');
    expect(filters.endsAt).toBe('2026-10-20T10:00:00.000Z');
  });

  it('TC-VS-02 [KAN-12-AC1, negative] excludes a venue with an approved booking overlapping the event', async () => {
    const { deps, query } = fakeDeps([venue({ id: 'booked' }), venue({ id: 'free' })], [{ venueId: 'booked' }]);
    const result = await searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-20T16:00'));
    expect(result.map((v) => v.id)).toEqual(['free']);
    expect(query.mock.calls[1]![1]).toEqual([sgt('2026-10-20T14:00'), sgt('2026-10-20T16:00')]);
    const sql = String(query.mock.calls[1]![0]);
    expect(sql).toContain("status = 'APPROVED'");
    expect(sql).toMatch(/starts_at < \$2/); // half-open overlap: back-to-back bookings are allowed
    expect(sql).toMatch(/ends_at > \$1/);
  });

  it('TC-VS-03 [KAN-12-AC1, negative] excludes a venue that is closed at the requested time', async () => {
    const { deps } = fakeDeps([venue({ opensAt: '09:00', closesAt: '17:00' })]);
    expect(await searchVenues(deps, coordinator, range('2026-10-20T18:00', '2026-10-20T20:00'))).toEqual([]);
  });

  it('TC-VS-04 [KAN-12-AC1, negative] excludes venues with opening hours for a multi-day event (20 Oct 2pm to 23 Oct 8pm)', async () => {
    const { deps } = fakeDeps([venue({ id: 'a', opensAt: '08:00', closesAt: '22:00' }), venue({ id: 'b', opensAt: '06:00', closesAt: '23:00' })]);
    expect(await searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-23T20:00'))).toEqual([]);
  });

  it('TC-VS-05 [KAN-12-AC1, positive] still offers a venue with no opening hours for a multi-day event, unless it is booked', async () => {
    const { deps } = fakeDeps([venue({ id: 'free' }), venue({ id: 'booked' })], [{ venueId: 'booked' }]);
    const result = await searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-23T20:00'));
    expect(result.map((v) => v.id)).toEqual(['free']);
  });

  describe('opening hours of 08:00 to 22:00 (Singapore time)', () => {
    const hours = { opensAt: '08:00', closesAt: '22:00' };
    it.each([
      { title: 'TC-VS-06 [KAN-12-AC1, positive] event inside the hours', start: '2026-10-20T14:00', end: '2026-10-20T18:00', open: true },
      { title: 'TC-VS-07 [KAN-12-AC1, boundary] event exactly from opening to closing', start: '2026-10-20T08:00', end: '2026-10-20T22:00', open: true },
      { title: 'TC-VS-08 [KAN-12-AC1, negative] event starting before opening', start: '2026-10-20T07:00', end: '2026-10-20T10:00', open: false },
      { title: 'TC-VS-09 [KAN-12-AC1, negative] event ending after closing', start: '2026-10-20T18:00', end: '2026-10-20T23:00', open: false },
      { title: 'TC-VS-10 [KAN-12-AC1, negative] event running overnight', start: '2026-10-20T20:00', end: '2026-10-21T01:00', open: false },
      { title: 'TC-VS-11 [KAN-12-AC1, negative] event spanning several days', start: '2026-10-20T14:00', end: '2026-10-23T20:00', open: false },
    ])('$title', ({ start, end, open }) => {
      expect(isOpenForRange(hours, sgt(start), sgt(end))).toBe(open);
    });

    it('TC-VS-12 [KAN-12-AC1, boundary] uses Singapore time, not UTC', () => {
      expect(isOpenForRange(hours, '2026-10-20T00:30:00.000Z', '2026-10-20T04:00:00.000Z')).toBe(true);
      expect(isOpenForRange(hours, '2026-10-20T15:00:00.000Z', '2026-10-20T17:00:00.000Z')).toBe(false);
    });

    it('TC-VS-13 [KAN-12-AC1, positive] treats a venue with no opening hours as always open', () => {
      expect(isOpenForRange({ opensAt: null, closesAt: null }, sgt('2026-10-20T14:00'), sgt('2026-10-23T20:00'))).toBe(true);
    });
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC2 to AC7: each filter reaches the search', () => {
  // The query parameters are [minimum capacity, location, layout, facilities, accessibility, wheelchair].
  const neutral = [0, null, null, [], [], false];
  const withParam = (index: number, value: unknown) => neutral.map((entry, i) => (i === index ? value : entry));

  it.each([
    { title: 'TC-VS-14 [KAN-12-AC2, positive] expected attendance becomes a minimum capacity', input: { attendance: '120' }, params: withParam(0, 120) },
    { title: 'TC-VS-15 [KAN-12-AC3, positive] location is trimmed and matched as text', input: { location: ' Marina ' }, params: withParam(1, 'Marina') },
    { title: 'TC-VS-16 [KAN-12-AC4, positive] capacity becomes a minimum capacity', input: { capacity: '150' }, params: withParam(0, 150) },
    { title: 'TC-VS-17 [KAN-12-AC4, positive] with both attendance and capacity the larger number applies', input: { attendance: '100', capacity: '150' }, params: withParam(0, 150) },
    { title: 'TC-VS-18 [KAN-12-AC5, positive] accessibility features must all be present', input: { accessibility: ['Lift', 'Hearing loop'] }, params: withParam(4, ['Lift', 'Hearing loop']) },
    { title: 'TC-VS-19 [KAN-12-AC5, positive] wheelchair accessible can be required', input: { wheelchairAccessible: 'true' }, params: withParam(5, true) },
    { title: 'TC-VS-20 [KAN-12-AC6, positive] a supported room layout can be required', input: { layout: 'THEATRE' }, params: withParam(2, 'THEATRE') },
    { title: 'TC-VS-21 [KAN-12-AC7, positive] required facilities must all be present, duplicates removed', input: { facilities: ['Projector', 'Wi-Fi, fast', 'Projector'] }, params: withParam(3, ['Projector', 'Wi-Fi, fast']) },
  ])('$title', async ({ input, params }) => {
    const { deps, query } = fakeDeps();
    await searchVenues(deps, coordinator, parseVenueSearchQuery(input));
    expect(query.mock.calls[0]![1]).toEqual(params);
  });

  it.each([
    { title: 'TC-VS-22 [KAN-12-AC2, negative] attendance that is not a whole number', input: { attendance: 'many' }, message: /whole number/ },
    { title: 'TC-VS-23 [KAN-12-AC4, negative] capacity of zero', input: { capacity: '0' }, message: /at least 1/ },
    { title: 'TC-VS-24 [KAN-12-AC5, negative] wheelchair value other than true or false', input: { wheelchairAccessible: 'maybe' }, message: /true or false/ },
    { title: 'TC-VS-25 [KAN-12-AC3, negative] location longer than 100 characters', input: { location: 'x'.repeat(101) }, message: /at most 100/ },
  ])('$title is refused', ({ input, message }) => {
    expect(() => parseVenueSearchQuery(input)).toThrow(message);
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC8: results reflect the current venue catalogue', () => {
  it('TC-VS-26 [KAN-12-AC8, positive] reads active venues from the database on every search, with no caching', async () => {
    const { deps, query } = fakeDeps([venue({ id: 'old' })], [venue({ id: 'new' })]);
    const first = await searchVenues(deps, coordinator, noFilters);
    const second = await searchVenues(deps, coordinator, noFilters);
    expect(first.map((v) => v.id)).toEqual(['old']);
    expect(second.map((v) => v.id)).toEqual(['new']);
    expect(String(query.mock.calls[0]![0])).toMatch(/FROM public\.venues[\s\S]*WHERE v\.is_active/);
  });

  it('TC-VS-27 [KAN-12-AC8, positive] builds the filter choices from the live catalogue', async () => {
    const { deps } = fakeDeps([{ value: 'THEATRE' }], [{ value: 'WIFI' }], [{ value: 'Lift' }]);
    await expect(listVenueFilterOptions(deps, coordinator)).resolves.toEqual({
      layouts: ['THEATRE'], facilities: ['WIFI'], accessibility: ['Lift'],
    });
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC9: results correspond to the filters selected', () => {
  it('TC-VS-28 [KAN-12-AC9, positive] every selected filter is applied together', async () => {
    const { deps, query } = fakeDeps();
    await searchVenues(deps, coordinator, parseVenueSearchQuery({
      attendance: '100', capacity: '150', location: 'marina', layout: 'THEATRE',
      facilities: 'Projector', accessibility: 'Lift', wheelchairAccessible: 'true',
    }));
    expect(query.mock.calls[0]![1]).toEqual([150, 'marina', 'THEATRE', ['Projector'], ['Lift'], true]);
  });

  it('TC-VS-29 [KAN-12-AC9, positive] with no filter selected nothing is excluded and no booking query runs', async () => {
    const { deps, query } = fakeDeps([venue()]);
    await searchVenues(deps, coordinator, noFilters);
    expect(query.mock.calls[0]![1]).toEqual([0, null, null, [], [], false]);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC10: venues that fail a filter are excluded; no match is clear', () => {
  it('TC-VS-30 [KAN-12-AC10, negative] when the only venue fails a filter the result is an empty list, not an error', async () => {
    const { deps } = fakeDeps([venue({ id: 'only' })], [{ venueId: 'only' }]);
    await expect(searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-20T16:00'))).resolves.toEqual([]);
  });

  it('TC-VS-31 [KAN-12-AC10, negative] searching only reads data and never touches event requests', async () => {
    const { deps, query } = fakeDeps([venue()], [{ venueId: 'v1' }]);
    await searchVenues(deps, coordinator, range('2026-10-20T14:00', '2026-10-20T16:00'));
    for (const [sql] of query.mock.calls) {
      expect(String(sql).trim()).toMatch(/^SELECT/i);
      expect(String(sql)).not.toMatch(/event_requests|\b(insert|update|delete)\b/i);
    }
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC11: change or clear filters and see updated results', () => {
  it('TC-VS-32 [KAN-12-AC11, positive] cleared (empty or blank) filter values count as not supplied', () => {
    expect(parseVenueSearchQuery({
      startsAt: '', endsAt: '', attendance: '', capacity: '  ', location: '', layout: '',
      wheelchairAccessible: '', accessibility: [''], facilities: '',
    })).toEqual(noFilters);
  });

  it('TC-VS-33 [KAN-12-AC11, positive] a search after changing then clearing filters is independent of the earlier one', async () => {
    const { deps, query } = fakeDeps([venue({ id: 'big' })], [venue({ id: 'big' }), venue({ id: 'small', capacity: 20 })]);
    await searchVenues(deps, coordinator, parseVenueSearchQuery({ capacity: '200' }));
    const cleared = await searchVenues(deps, coordinator, noFilters);
    expect(query.mock.calls[0]![1]![0]).toBe(200);
    expect(query.mock.calls[1]![1]![0]).toBe(0);
    expect(cleared.map((v) => v.id)).toEqual(['big', 'small']);
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC12: each result clearly identifies its venue', () => {
  it('TC-VS-34 [KAN-12-AC12, positive] every result carries its venue id and name', async () => {
    const { deps } = fakeDeps([venue({ id: 'a', name: 'Hall A' }), venue({ id: 'b', name: 'Hall B' })]);
    const result = await searchVenues(deps, coordinator, noFilters);
    expect(result.map(({ id, name }) => ({ id, name }))).toEqual([{ id: 'a', name: 'Hall A' }, { id: 'b', name: 'Hall B' }]);
    expect(result[0]!.updatedAt).toBe('2026-10-01T02:00:00.000Z');
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC13: users not authorised for venue planning cannot search', () => {
  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'])(
    'TC-VS-35 [KAN-12-AC13, security] refuses %s without touching the database',
    async (role) => {
      const { deps, query } = fakeDeps();
      const actor = { id: 'user-1', role } as WorkflowActor;
      await expect(searchVenues(deps, actor, noFilters)).rejects.toThrow('Only event coordinators can search venues.');
      await expect(listVenueFilterOptions(deps, actor)).rejects.toThrow('Only event coordinators can search venues.');
      expect(query).not.toHaveBeenCalled();
    },
  );
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC14: an incomplete or backwards period is refused', () => {
  it.each([
    { title: 'TC-VS-36 [KAN-12-AC14, negative] only a start', input: { startsAt: '2026-10-20T06:00:00Z' } },
    { title: 'TC-VS-37 [KAN-12-AC14, negative] only an end', input: { endsAt: '2026-10-20T06:00:00Z' } },
  ])('$title is refused with a clear message', ({ input }) => {
    expect(() => parseVenueSearchQuery(input)).toThrow('Provide both a start and an end time, or neither.');
  });

  it.each([
    { title: 'TC-VS-38 [KAN-12-AC14, negative] an end before the start', endsAt: '2026-10-20T06:00:00Z' },
    { title: 'TC-VS-39 [KAN-12-AC14, boundary] an end equal to the start', endsAt: '2026-10-20T10:00:00Z' },
  ])('$title is refused with a clear message', ({ endsAt }) => {
    expect(() => parseVenueSearchQuery({ startsAt: '2026-10-20T10:00:00Z', endsAt }))
      .toThrow('The end time must be after the start time.');
  });

  it('TC-VS-40 [KAN-12-AC14, boundary] an end one minute after the start is accepted', () => {
    expect(() => parseVenueSearchQuery({ startsAt: '2026-10-20T10:00:00Z', endsAt: '2026-10-20T10:01:00Z' })).not.toThrow();
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC101: impossible calendar dates are refused, never silently changed', () => {
  const valid = '2026-10-20T14:00:00+08:00';

  it.each([
    { title: '30 February 2026 (the reported bug; it used to become 2 March)', value: '2026-02-30T10:00:00+08:00' },
    { title: '29 February 2026 (2026 is not a leap year)', value: '2026-02-29T10:00:00+08:00' },
    { title: '31 April', value: '2026-04-31T10:00:00+08:00' },
    { title: '31 November', value: '2026-11-31T10:00:00Z' },
    { title: 'day 00', value: '2026-10-00T10:00:00+08:00' },
    { title: 'day 32', value: '2026-10-32T10:00:00+08:00' },
    { title: 'month 13', value: '2026-13-01T10:00:00+08:00' },
    { title: 'month 00', value: '2026-00-10T10:00:00+08:00' },
    { title: 'hour 24', value: '2026-10-20T24:00:00+08:00' },
    { title: 'minute 60', value: '2026-10-20T10:60:00+08:00' },
    { title: 'second 60', value: '2026-10-20T10:00:60+08:00' },
    { title: 'a time zone offset of +24:00', value: '2026-10-20T10:00:00+24:00' },
  ])('TC-VS-41 [KAN-12-AC101, negative] refuses $title as the start', ({ value }) => {
    expect(() => parseVenueSearchQuery({ startsAt: value, endsAt: '2027-01-01T00:00:00Z' })).toThrow(/startsAt must be a real date/);
  });

  it('TC-VS-42 [KAN-12-AC101, negative] refuses an impossible date as the end, and names that field', () => {
    expect(() => parseVenueSearchQuery({ startsAt: valid, endsAt: '2026-02-30T10:00:00+08:00' }))
      .toThrow(/endsAt must be a real date/);
  });

  it('TC-VS-43 [KAN-12-AC101, negative] the request is refused before any database query runs', async () => {
    const { query } = fakeDeps([venue()]);
    expect(() => parseVenueSearchQuery({ startsAt: '2026-02-30T10:00:00+08:00', endsAt: '2026-03-05T10:00:00+08:00' })).toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('TC-VS-44 [KAN-12-AC101, positive] a real leap day (29 February 2028) is accepted and not moved', () => {
    const filters = parseVenueSearchQuery({ startsAt: '2028-02-29T10:00:00+08:00', endsAt: '2028-02-29T12:00:00+08:00' });
    expect(filters.startsAt).toBe('2028-02-29T02:00:00.000Z');
  });

  it('TC-VS-45 [KAN-12-AC101, boundary] the last valid day of each month is accepted unchanged', () => {
    for (const [date, utc] of [
      ['2026-01-31', '2026-01-31T02:00:00.000Z'], ['2026-02-28', '2026-02-28T02:00:00.000Z'],
      ['2026-04-30', '2026-04-30T02:00:00.000Z'], ['2026-12-31', '2026-12-31T02:00:00.000Z'],
    ] as const) {
      const filters = parseVenueSearchQuery({ startsAt: `${date}T10:00:00+08:00`, endsAt: '2030-01-01T00:00:00Z' });
      expect(filters.startsAt).toBe(utc);
    }
  });

  it.each([
    { title: 'a date with no time', value: '2026-10-20' },
    { title: 'a date-time with no time zone (its meaning would depend on the server)', value: '2026-10-20T14:00:00' },
    { title: 'free text', value: 'next tuesday' },
    { title: 'a non-ISO date', value: '20 Oct 2026 14:00' },
  ])('TC-VS-46 [KAN-12-AC101, negative] refuses $title', ({ value }) => {
    expect(() => parseVenueSearchQuery({ startsAt: value, endsAt: '2027-01-01T00:00:00Z' })).toThrow(/startsAt must be a real date/);
  });
});