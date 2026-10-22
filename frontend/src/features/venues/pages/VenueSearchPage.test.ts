import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getJson } from '../../../lib/api-client';
import { authSession } from '../../auth/session.js';
import {
  emptyFilters, END_NOT_AFTER_START, INCOMPLETE_DATE, isRealLocalDateTime, localToIso, MISSING_END,
  MISSING_START, NOT_A_REAL_DATE, searchVenues, validatePeriod, type VenueResult,
} from '../api/venues';
import VenueSearchPage from './VenueSearchPage.vue';

/**
 * KAN-12 venue search: page and API-client tests. Full descriptions: docs/venue-search-test-cases.md
 * (the backend rules are tested in backend/test/venues/venue-search.test.ts).
 *
 * Test names read "TC-VS-nn [KAN-12-ACn, test type]". AC15 (stale results) and AC16 (missing lists,
 * no match versus empty catalogue) can only be checked here, because they are page behaviour.
 * Only the network (getJson) and the signed-in user are replaced; the page and API client run for real.
 */

vi.mock('../../../lib/api-client', () => {
  class ApiError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return { ApiError, getJson: vi.fn() };
});

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  return { authSession: reactive({ user: null, loading: false }), clearLocalSession: vi.fn() };
});

const getJsonMock = getJson as unknown as ReturnType<typeof vi.fn>;
const session = authSession as unknown as { user: unknown; loading: boolean };

const OPTIONS = { layouts: ['Theatre', 'Banquet'], facilities: ['Projector', 'Wi-Fi'], accessibility: ['Lift'] };
const hall: VenueResult = {
  id: 'v1', name: 'Harbourfront Hall', description: 'Large hall by the water', location: 'Marina Bay',
  capacity: 300, layouts: ['Theatre'], facilities: ['Projector'], accessibilityFeatures: ['Lift'],
  wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00', updatedAt: '2026-10-01T02:00:00.000Z',
};
const room: VenueResult = { ...hall, id: 'v2', name: 'Sengkang Community Room', location: 'Sengkang', capacity: 80 };

const START = 'Event start (Singapore time)';
const END = 'Event end (Singapore time)';

function signInAs(role: string | null) {
  session.loading = false;
  session.user = role ? { id: 'user-1', email: 'user@example.com', displayName: 'Test user', role } : null;
}

/** Answer the two endpoints. `search` and `options` may return a value, a promise, or throw. */
function route(
  search: (url: string) => unknown = () => ({ items: [hall] }),
  options: () => unknown = () => OPTIONS,
) {
  getJsonMock.mockReset();
  getJsonMock.mockImplementation(async (url: string) => (url.startsWith('/api/venues/filter-options') ? options() : search(url)));
}

const searchUrls = () => getJsonMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/api/venues/search-venues'));
const lastSearchUrl = () => searchUrls().at(-1)!;
const paramsOf = (url: string) => new URLSearchParams(url.split('?')[1] ?? '');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const settle = () => new Promise((done) => setTimeout(done, 25));

function renderPage() {
  return render(VenueSearchPage, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } });
}
const searchButton = () => screen.getByRole('button', { name: /search venues/i }) as HTMLButtonElement;
const search = () => fireEvent.click(searchButton());
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
/** The first search has returned and the filter lists have loaded. */
async function ready() {
  await screen.findByText('Harbourfront Hall');
  await screen.findByLabelText('Lift');
}

beforeEach(() => {
  route();
  signInAs('EVENT_COORDINATOR');
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC1 to AC7: the filters on the page', () => {
  it('TC-VS-47 [KAN-12-AC1, positive] the event start and end are sent as Singapore time converted to UTC', async () => {
    renderPage();
    await ready();
    await fireEvent.update(field(START), '2026-10-20T14:00');
    await fireEvent.update(field(END), '2026-10-20T18:00');
    await search();
    const params = paramsOf(lastSearchUrl());
    expect(params.get('startsAt')).toBe('2026-10-20T06:00:00.000Z');
    expect(params.get('endsAt')).toBe('2026-10-20T10:00:00.000Z');
  });

  it.each([
    { title: 'TC-VS-48 [KAN-12-AC2, positive] expected attendance', act: () => fireEvent.update(field('Expected attendance'), '120'), expected: { attendance: '120' } },
    { title: 'TC-VS-49 [KAN-12-AC3, positive] location', act: () => fireEvent.update(field('Location'), 'Marina'), expected: { location: 'Marina' } },
    { title: 'TC-VS-50 [KAN-12-AC4, positive] minimum capacity', act: () => fireEvent.update(field('Minimum capacity'), '150'), expected: { capacity: '150' } },
    { title: 'TC-VS-51 [KAN-12-AC5, positive] an accessibility feature', act: () => fireEvent.click(field('Lift')), expected: { accessibility: 'Lift' } },
    { title: 'TC-VS-52 [KAN-12-AC5, positive] wheelchair accessible', act: () => fireEvent.click(field('Wheelchair accessible')), expected: { wheelchairAccessible: 'true' } },
    { title: 'TC-VS-53 [KAN-12-AC6, positive] supported room layout', act: () => fireEvent.update(screen.getByLabelText('Room layout'), 'Theatre'), expected: { layout: 'Theatre' } },
    { title: 'TC-VS-54 [KAN-12-AC7, positive] a required facility', act: () => fireEvent.click(field('Projector')), expected: { facilities: 'Projector' } },
  ])('$title is sent when searching', async ({ act, expected }) => {
    renderPage();
    await ready();
    await act();
    await search();
    expect(Object.fromEntries(paramsOf(lastSearchUrl()))).toEqual(expected);
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC8 to AC12: results, no match, change or clear, identity', () => {
  it('TC-VS-55 [KAN-12-AC8, positive] every search shows what the catalogue returns at that moment', async () => {
    renderPage();
    await ready();
    route(() => ({ items: [room] }));
    await search();
    expect(await screen.findByText('Sengkang Community Room')).toBeTruthy();
    expect(screen.queryByText('Harbourfront Hall')).toBeNull();
  });

  it('TC-VS-56 [KAN-12-AC9, positive] only the filters that were selected are sent', async () => {
    renderPage();
    await ready();
    await fireEvent.update(field('Expected attendance'), '60');
    await fireEvent.click(field('Projector'));
    await fireEvent.update(field('Location'), 'Sengkang');
    await search();
    expect(Object.fromEntries(paramsOf(lastSearchUrl()))).toEqual({
      attendance: '60', facilities: 'Projector', location: 'Sengkang',
    });
  });

  it('TC-VS-57 [KAN-12-AC10, negative] says clearly when no venue matches, and that the event request is not affected', async () => {
    route((url) => ({ items: url.includes('attendance=') ? [] : [hall] }));
    renderPage();
    await ready();
    await fireEvent.update(field('Expected attendance'), '99999');
    await search();
    expect(await screen.findByText('No venue matches these filters')).toBeTruthy();
    expect(screen.getByText(/doesn't affect the event request/)).toBeTruthy();
    expect(screen.getByText('0 venues found')).toBeTruthy();
    expect(screen.queryByText('Harbourfront Hall')).toBeNull();
  });

  it('TC-VS-58 [KAN-12-AC11, positive] changing a filter shows the updated results', async () => {
    route((url) => ({ items: url.includes('location=Sengkang') ? [room] : [hall] }));
    renderPage();
    await ready();
    await fireEvent.update(field('Location'), 'Sengkang');
    await search();
    expect(await screen.findByText('Sengkang Community Room')).toBeTruthy();
    expect(screen.queryByText('Harbourfront Hall')).toBeNull();
  });

  it('TC-VS-59 [KAN-12-AC11, positive] clearing the filters empties every field and shows the full results again', async () => {
    route((url) => ({ items: url.includes('?') ? [room] : [hall, room] }));
    renderPage();
    await screen.findByText('Harbourfront Hall');
    await screen.findByLabelText('Lift');
    await fireEvent.update(field('Location'), 'Sengkang');
    await fireEvent.click(field('Projector'));
    await search();
    await screen.findByText('1 venue found');

    await fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('2 venues found')).toBeTruthy();
    expect(lastSearchUrl()).toBe('/api/venues/search-venues');
    expect(field('Location').value).toBe('');
    expect((field('Projector') as HTMLInputElement).checked).toBe(false);
  });

  it('TC-VS-60 [KAN-12-AC12, positive] each result shows its venue name, location and capacity', async () => {
    route(() => ({ items: [hall, room] }));
    renderPage();
    expect(await screen.findByText('Harbourfront Hall')).toBeTruthy();
    expect(screen.getByText('Sengkang Community Room')).toBeTruthy();
    expect(screen.getByText('Marina Bay')).toBeTruthy();
    expect(screen.getByText('Up to 80 guests')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC13: users not authorised for venue planning', () => {
  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'])(
    'TC-VS-61 [KAN-12-AC13, security] shows %s a denial and makes no request at all',
    async (role) => {
      signInAs(role);
      renderPage();
      expect(await screen.findByText('This page is for event coordinators.')).toBeTruthy();
      expect(screen.queryByLabelText('Expected attendance')).toBeNull();
      expect(getJsonMock).not.toHaveBeenCalled();
    },
  );

  it('TC-VS-62 [KAN-12-AC13, security] asks a signed-out visitor to sign in and makes no request', async () => {
    signInAs(null);
    renderPage();
    expect(await screen.findByText('Sign in to search venues.')).toBeTruthy();
    expect(getJsonMock).not.toHaveBeenCalled();
  });

  it('TC-VS-63 [KAN-12-AC13, security] shows the coordinator-only message, without a retry, when the server answers 403', async () => {
    route(() => { throw new ApiError('Forbidden', 403, 'VENUE_SEARCH_FORBIDDEN'); });
    renderPage();
    expect(await screen.findByText('This page is for event coordinators.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC14: an incomplete or backwards period is refused before any search is sent', () => {
  const form = () => screen.getByRole('form', { name: 'Venue filters' });

  it('TC-VS-64 [KAN-12-AC14, negative] a start without an end is refused on the end field', async () => {
    renderPage();
    await ready();
    const sent = searchUrls().length;
    await fireEvent.update(field(START), '2026-10-20T14:00');
    expect(await screen.findByText(MISSING_END)).toBeTruthy();
    expect(field(END).getAttribute('aria-invalid')).toBe('true');
    expect(searchButton().disabled).toBe(true);
    await fireEvent.submit(form());
    expect(searchUrls()).toHaveLength(sent);
  });

  it('TC-VS-65 [KAN-12-AC14, negative] an end without a start is refused on the start field', async () => {
    renderPage();
    await ready();
    const sent = searchUrls().length;
    await fireEvent.update(field(END), '2026-10-20T14:00');
    expect(await screen.findByText(MISSING_START)).toBeTruthy();
    expect(field(START).getAttribute('aria-invalid')).toBe('true');
    await fireEvent.submit(form());
    expect(searchUrls()).toHaveLength(sent);
  });

  it.each([
    { title: 'TC-VS-66 [KAN-12-AC14, negative] an end before the start', end: '2026-10-20T10:00' },
    { title: 'TC-VS-67 [KAN-12-AC14, boundary] an end equal to the start', end: '2026-10-20T14:00' },
  ])('$title is refused with a clear message', async ({ end }) => {
    renderPage();
    await ready();
    const sent = searchUrls().length;
    await fireEvent.update(field(START), '2026-10-20T14:00');
    await fireEvent.update(field(END), end);
    expect(await screen.findByText(END_NOT_AFTER_START)).toBeTruthy();
    expect(searchButton().disabled).toBe(true);
    await fireEvent.submit(form());
    expect(searchUrls()).toHaveLength(sent);
  });

  it('TC-VS-68 [KAN-12-AC14, positive] fixing the period removes the message and the search goes through', async () => {
    renderPage();
    await ready();
    await fireEvent.update(field(START), '2026-10-20T14:00');
    await screen.findByText(MISSING_END);
    await fireEvent.update(field(END), '2026-10-20T18:00');
    expect(screen.queryByText(MISSING_END)).toBeNull();
    expect(searchButton().disabled).toBe(false);
    await search();
    expect(paramsOf(lastSearchUrl()).get('startsAt')).toBe('2026-10-20T06:00:00.000Z');
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC15: earlier results never replace newer ones', () => {
  /** After the first load, hand out one controllable answer per later search. */
  function slowSearches() {
    const answers = [deferred<{ items: VenueResult[] }>(), deferred<{ items: VenueResult[] }>()];
    getJsonMock.mockImplementation(async (url: string) => (
      url.startsWith('/api/venues/filter-options') ? OPTIONS : answers.shift()!.promise
    ));
    return [...answers] as [typeof answers[number], typeof answers[number]];
  }

  it('TC-VS-69 [KAN-12-AC15, positive] a slow earlier search that answers last does not replace the newer results', async () => {
    renderPage();
    await ready();
    const [older, newer] = slowSearches();
    await fireEvent.update(field('Location'), 'Marina');
    await search(); // older search, still waiting
    await fireEvent.update(field('Location'), 'Sengkang');
    await search(); // newer search

    newer.resolve({ items: [room] });
    expect(await screen.findByText('Sengkang Community Room')).toBeTruthy();
    older.resolve({ items: [hall] });
    await settle();
    expect(screen.queryByText('Harbourfront Hall')).toBeNull();
    expect(screen.getByText('Sengkang Community Room')).toBeTruthy();
  });

  it('TC-VS-70 [KAN-12-AC15, negative] an earlier search that fails late does not show an error over the newer results', async () => {
    renderPage();
    await ready();
    const [older, newer] = slowSearches();
    await fireEvent.update(field('Location'), 'Marina');
    await search();
    await fireEvent.update(field('Location'), 'Sengkang');
    await search();

    newer.resolve({ items: [room] });
    await screen.findByText('Sengkang Community Room');
    older.reject(new Error('The old search failed.'));
    await settle();
    expect(screen.queryByText('The old search failed.')).toBeNull();
    expect(screen.getByText('Sengkang Community Room')).toBeTruthy();
  });

  it('TC-VS-71 [KAN-12-AC15, positive] earlier results are hidden while a new search runs', async () => {
    renderPage();
    await ready();
    const [pending] = slowSearches();
    await fireEvent.update(field('Location'), 'Sengkang');
    await search();

    expect(screen.queryByText('Harbourfront Hall')).toBeNull();
    expect(screen.getByText('Loading venues…')).toBeTruthy();
    pending.resolve({ items: [room] });
    expect(await screen.findByText('Sengkang Community Room')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC16: missing lists, and no match versus an empty catalogue', () => {
  it('TC-VS-72 [KAN-12-AC16, negative] when the lists cannot load, the user is told and the other filters still work', async () => {
    route(undefined, () => { throw new Error('lists unavailable'); });
    renderPage();
    expect(await screen.findByText(/room layout, accessibility and facility lists could not be loaded.*other filters still work/)).toBeTruthy();
    expect(screen.queryByLabelText('Projector')).toBeNull();

    await fireEvent.update(field('Location'), 'Marina');
    await fireEvent.click(field('Wheelchair accessible'));
    await search();
    expect(Object.fromEntries(paramsOf(lastSearchUrl()))).toEqual({ location: 'Marina', wheelchairAccessible: 'true' });
    expect(await screen.findByText('Harbourfront Hall')).toBeTruthy();
  });

  it('TC-VS-73 [KAN-12-AC16, positive] "no venue matches" and "no venues in the catalogue" are different messages', async () => {
    route(() => ({ items: [] }));
    renderPage();
    expect(await screen.findByText('No venues in the catalogue yet')).toBeTruthy();
    expect(screen.queryByText('No venue matches these filters')).toBeNull();

    await fireEvent.update(field('Location'), 'nowhere');
    await search();
    expect(await screen.findByText('No venue matches these filters')).toBeTruthy();
    expect(screen.getByText(/No venue in the catalogue meets every filter you applied/)).toBeTruthy();
    expect(screen.queryByText('No venues in the catalogue yet')).toBeNull();
  });
});

/* ------------------------------------------------------------------------------------------ */
describe('KAN-12-AC101: impossible dates on the page', () => {
  it('TC-VS-74 [KAN-12-AC101, negative] an impossible date gets field feedback and no search is sent', async () => {
    renderPage();
    await ready();
    const sent = searchUrls().length;
    const start = field(START);
    // A browser's date picker will not produce 30 February, but a script or autofill can supply any text.
    Object.defineProperty(start, 'value', { configurable: true, get: () => '2026-02-30T10:00', set: () => {} });
    await fireEvent.input(start);
    await fireEvent.update(field(END), '2026-03-05T10:00');

    expect(await screen.findByText(NOT_A_REAL_DATE)).toBeTruthy();
    expect(start.getAttribute('aria-invalid')).toBe('true');
    expect(searchButton().disabled).toBe(true);
    await fireEvent.submit(screen.getByRole('form', { name: 'Venue filters' }));
    expect(searchUrls()).toHaveLength(sent);
  });

  it('TC-VS-75 [KAN-12-AC101, negative] a date the browser cannot read shows as incomplete, not as left blank', async () => {
    renderPage();
    await ready();
    const sent = searchUrls().length;
    const start = field(START);
    const validity = { badInput: true };
    Object.defineProperty(start, 'validity', { configurable: true, get: () => validity });
    await fireEvent.update(start, '');
    await fireEvent.update(field(END), '2026-10-20T18:00');

    expect(await screen.findByText(INCOMPLETE_DATE)).toBeTruthy();
    expect(searchUrls()).toHaveLength(sent);
    validity.badInput = false;
    await fireEvent.update(start, '2026-10-20T14:00');
    expect(screen.queryByText(INCOMPLETE_DATE)).toBeNull();
    expect(searchButton().disabled).toBe(false);
  });
});

/* ==== API CLIENT TESTS: no page needed (marker used to run this part on its own) ============ */
describe('KAN-12-AC101 and AC14: event period rules in the API client', () => {
  it.each([
    { title: '30 February 2026', value: '2026-02-30T10:00' },
    { title: '29 February 2026 (not a leap year)', value: '2026-02-29T10:00' },
    { title: '31 April', value: '2026-04-31T10:00' },
    { title: 'day 00', value: '2026-10-00T10:00' },
    { title: 'month 13', value: '2026-13-01T10:00' },
    { title: 'hour 24', value: '2026-10-20T24:00' },
    { title: 'minute 60', value: '2026-10-20T10:60' },
    { title: 'text that is not a date', value: 'soon' },
  ])('TC-VS-76 [KAN-12-AC101, negative] $title is not a real date and time', ({ value }) => {
    expect(isRealLocalDateTime(value)).toBe(false);
  });

  it.each([
    { title: '29 February 2028 (leap day)', value: '2028-02-29T10:00', utc: '2028-02-29T02:00:00.000Z' },
    { title: '28 February 2026', value: '2026-02-28T23:30', utc: '2026-02-28T15:30:00.000Z' },
    { title: '31 December 2026', value: '2026-12-31T10:00:00', utc: '2026-12-31T02:00:00.000Z' },
    { title: '1 January 2027 at midnight', value: '2027-01-01T00:00', utc: '2026-12-31T16:00:00.000Z' },
  ])('TC-VS-77 [KAN-12-AC101, positive] $title is accepted and converted exactly', ({ value, utc }) => {
    expect(isRealLocalDateTime(value)).toBe(true);
    expect(localToIso(value)).toBe(utc);
  });

  it('TC-VS-78 [KAN-12-AC101, negative] converting an impossible date fails instead of moving it to another day', () => {
    expect(() => localToIso('2026-02-30T10:00')).toThrow(/not a real date/);
  });

  it.each([
    { title: 'neither field set is fine', start: '', end: '', expected: { startsAt: '', endsAt: '' } },
    { title: 'a valid period is fine', start: '2026-10-20T14:00', end: '2026-10-20T18:00', expected: { startsAt: '', endsAt: '' } },
    { title: 'a start without an end', start: '2026-10-20T14:00', end: '', expected: { startsAt: '', endsAt: MISSING_END } },
    { title: 'an end without a start', start: '', end: '2026-10-20T14:00', expected: { startsAt: MISSING_START, endsAt: '' } },
    { title: 'an end before the start', start: '2026-10-20T14:00', end: '2026-10-20T10:00', expected: { startsAt: '', endsAt: END_NOT_AFTER_START } },
    { title: 'an end equal to the start', start: '2026-10-20T14:00', end: '2026-10-20T14:00', expected: { startsAt: '', endsAt: END_NOT_AFTER_START } },
    { title: 'an impossible start date', start: '2026-02-30T10:00', end: '2026-03-05T10:00', expected: { startsAt: NOT_A_REAL_DATE, endsAt: '' } },
    { title: 'an impossible end date', start: '2026-02-01T10:00', end: '2026-02-30T10:00', expected: { startsAt: '', endsAt: NOT_A_REAL_DATE } },
  ])('TC-VS-79 [KAN-12-AC14 and AC101, negative] field feedback: $title', ({ start, end, expected }) => {
    expect(validatePeriod(start, end)).toEqual(expected);
  });

  it('TC-VS-80 [KAN-12-AC101, negative] text the browser could not read is reported on that field', () => {
    expect(validatePeriod('', '2026-10-20T14:00', { startsAt: true })).toEqual({ startsAt: INCOMPLETE_DATE, endsAt: '' });
  });

  it.each([
    { title: 'an impossible date', filters: { startsAt: '2026-02-30T10:00', endsAt: '2026-03-05T10:00' } },
    { title: 'only a start', filters: { startsAt: '2026-10-20T14:00', endsAt: '' } },
    { title: 'an end before the start', filters: { startsAt: '2026-10-20T14:00', endsAt: '2026-10-20T10:00' } },
  ])('TC-VS-81 [KAN-12-AC14 and AC101, negative] refuses $title before any request is sent', async ({ filters }) => {
    await expect(searchVenues({ ...emptyFilters(), ...filters })).rejects.toThrow();
    expect(getJsonMock).not.toHaveBeenCalled();
  });

  it('TC-VS-82 [KAN-12-AC2 and AC4, positive] number inputs (numbers, not text) are accepted: regression for "value.trim is not a function"', async () => {
    route();
    await searchVenues({ ...emptyFilters(), attendance: 200, capacity: 300 });
    expect(Object.fromEntries(paramsOf(lastSearchUrl()))).toEqual({ attendance: '200', capacity: '300' });
  });

  it('TC-VS-83 [KAN-12-AC11, positive] cleared filters send no parameters at all', async () => {
    route();
    await searchVenues(emptyFilters());
    expect(lastSearchUrl()).toBe('/api/venues/search-venues');
  });
});