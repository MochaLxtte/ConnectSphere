import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import type { VenueFilterOptions, VenueResult } from '../api/venues';
import VenueSearchPage from './VenueSearchPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'EVENT_COORDINATOR'): SignedInUser =>
  ({ id: 'coordinator-a', role, email: 'coordinator-a@example.test', displayName: 'Coordinator A' });

const hall: VenueResult = {
  id: 'venue-a', name: 'Harbour Hall', description: 'A large hall by the water.', location: '1 Marina Way',
  capacity: 200, layouts: ['Theatre', 'Banquet'], facilities: ['Projector', 'Wi-Fi'],
  accessibilityFeatures: ['Hearing loop'], wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00',
  updatedAt: '2026-10-01T02:00:00Z',
};
const room: VenueResult = {
  id: 'venue-b', name: 'Garden Room', description: null, location: null, capacity: 40, layouts: [],
  facilities: [], accessibilityFeatures: [], wheelchairAccessible: false, opensAt: null, closesAt: null,
  updatedAt: '2026-10-02T02:00:00Z',
};
const filterOptions: VenueFilterOptions = {
  layouts: ['Theatre', 'Banquet'], facilities: ['Projector', 'Wi-Fi'], accessibility: ['Hearing loop', 'Lift'],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const apiError = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

interface Backend {
  search?: (url: URL) => Response | Promise<Response>;
  options?: () => Response | Promise<Response>;
}

/** Routes the page's two requests by path so tests can see exactly what was asked. */
function mockBackend({ search = () => json({ items: [hall, room] }), options = () => json(filterOptions) }: Backend = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/venues/filter-options') return options();
    if (url.pathname === '/api/venues/search-venues') return search(url);
    throw new Error(`Unexpected request ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  const searches = () => fetchMock.mock.calls
    .map(([input]) => new URL(String(input), 'http://localhost'))
    .filter((url) => url.pathname === '/api/venues/search-venues');
  return { fetchMock, searches, lastSearch: () => searches().at(-1)!.searchParams };
}

async function open() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', component: VenueSearchPage },
    { path: '/login', component: { template: '<h1>Login destination</h1>' } },
  ] });
  await router.push('/');
  await router.isReady();
  return render(RouterView, { global: { plugins: [router] } });
}
const type = (label: string, value: string) => fireEvent.update(screen.getByLabelText(label), value);
const search = () => fireEvent.click(screen.getByRole('button', { name: /Search venues/ }));

beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-12 coordinator venue search: results (KAN-12-AC8, AC9, AC12)', () => {
  it('loads every active venue on arrival, with no filter applied', async () => {
    const { searches } = mockBackend();
    await open();
    expect(await screen.findByText('2 venues found')).toBeInTheDocument();
    expect(searches()).toHaveLength(1);
    expect(searches()[0]!.search).toBe('');
  });

  it('identifies each venue by name with its capacity, location, hours and catalogue details (AC12)', async () => {
    mockBackend();
    await open();
    const list = await screen.findByRole('list', { name: 'Matching venues' });
    const [first, second] = within(list).getAllByRole('listitem');
    expect(within(first!).getByRole('heading', { name: 'Harbour Hall' })).toBeInTheDocument();
    for (const text of ['Up to 200 guests', '1 Marina Way', 'A large hall by the water.', '08:00 to 22:00',
      'Theatre', 'Banquet', 'Projector', 'Wi-Fi', 'Hearing loop', 'Wheelchair accessible']) {
      expect(within(first!).getByText(text)).toBeInTheDocument();
    }
    expect(within(first!).getByText('1 Oct 2026, 10:00 am')).toBeInTheDocument();
    expect(within(second!).getByRole('heading', { name: 'Garden Room' })).toBeInTheDocument();
    expect(within(second!).getByText('Location not listed')).toBeInTheDocument();
    expect(within(second!).getByText('Not listed')).toBeInTheDocument();
    expect(within(second!).queryByText('Room layouts')).not.toBeInTheDocument();
    expect(within(second!).queryByText('Accessibility')).not.toBeInTheDocument();
  });

  it('describes partly listed opening hours', async () => {
    mockBackend({ search: () => json({ items: [
      { ...room, id: 'v1', name: 'Early', opensAt: '09:00' }, { ...room, id: 'v2', name: 'Late', closesAt: '21:00' },
    ] }) });
    await open();
    expect(await screen.findByText('From 09:00')).toBeInTheDocument();
    expect(screen.getByText('Until 21:00')).toBeInTheDocument();
  });

  it('uses the singular when exactly one venue matches', async () => {
    mockBackend({ search: () => json({ items: [hall] }) });
    await open();
    expect(await screen.findByText('1 venue found')).toBeInTheDocument();
  });

  it('shows the filter lists the catalogue currently offers (AC6, AC7, AC8)', async () => {
    mockBackend();
    await open();
    await screen.findByText('2 venues found');
    expect(screen.getByRole('option', { name: 'Banquet' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Projector' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Lift' })).toBeInTheDocument();
  });

  it('hides the facility group when the catalogue lists no facilities', async () => {
    mockBackend({ options: () => json({ ...filterOptions, facilities: [] }) });
    await open();
    await screen.findByText('2 venues found');
    expect(screen.queryByText('Required facilities')).not.toBeInTheDocument();
  });
});

describe('KAN-12 coordinator venue search: each criterion reaches the query (KAN-12-AC1 to AC7, AC10)', () => {
  it('sends the event start and end as Singapore time instants (AC1)', async () => {
    const { lastSearch } = mockBackend();
    await open();
    await screen.findByText('2 venues found');
    await type('Event start (Singapore time)', '2026-10-05T10:00');
    await type('Event end (Singapore time)', '2026-10-05T12:30');
    await search();
    await waitFor(() => expect(lastSearch().get('startsAt')).toBe('2026-10-05T02:00:00.000Z'));
    expect(lastSearch().get('endsAt')).toBe('2026-10-05T04:30:00.000Z');
  });

  it.each([
    ['Expected attendance', '150', 'attendance', '150'],
    ['Minimum capacity', '80', 'capacity', '80'],
    ['Location', '  Marina  ', 'location', 'Marina'],
  ])('sends %s (AC2, AC3, AC4)', async (label, entered, key, expected) => {
    const { lastSearch } = mockBackend();
    await open();
    await screen.findByText('2 venues found');
    await type(label, entered);
    await search();
    await waitFor(() => expect(lastSearch().get(key)).toBe(expected));
  });

  it('sends the room layout, accessibility needs and required facilities (AC5, AC6, AC7)', async () => {
    const { lastSearch } = mockBackend();
    await open();
    await screen.findByText('2 venues found');
    await type('Room layout', 'Theatre');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Wheelchair accessible' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Hearing loop' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Projector' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Wi-Fi' }));
    await search();
    await waitFor(() => expect(lastSearch().get('layout')).toBe('Theatre'));
    expect(lastSearch().get('wheelchairAccessible')).toBe('true');
    expect(lastSearch().getAll('accessibility')).toEqual(['Hearing loop']);
    expect(lastSearch().getAll('facilities')).toEqual(['Projector', 'Wi-Fi']);
  });

  it('combines all criteria in one request', async () => {
    const { lastSearch } = mockBackend();
    await open();
    await screen.findByText('2 venues found');
    await type('Event start (Singapore time)', '2026-10-05T10:00');
    await type('Event end (Singapore time)', '2026-10-05T12:00');
    await type('Expected attendance', '100');
    await type('Location', 'Marina');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Projector' }));
    await search();
    await waitFor(() => expect(lastSearch().get('attendance')).toBe('100'));
    expect([...lastSearch().keys()].sort()).toEqual(['attendance', 'endsAt', 'facilities', 'location', 'startsAt']);
  });

  it('shows only what the server returned, never a venue the filters excluded (AC9, AC10)', async () => {
    mockBackend({ search: (url) => json({ items: url.searchParams.get('capacity') === '150' ? [hall] : [hall, room] }) });
    await open();
    await screen.findByText('2 venues found');
    await type('Minimum capacity', '150');
    await search();
    expect(await screen.findByText('1 venue found')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Garden Room' })).not.toBeInTheDocument();
  });

  it('keeps the previous results out of view while a new search runs', async () => {
    let release!: (response: Response) => void;
    let calls = 0;
    mockBackend({ search: () => (++calls === 1 ? json({ items: [hall] })
      : new Promise<Response>((resolve) => { release = resolve; })) });
    await open();
    await screen.findByText('1 venue found');
    await type('Location', 'Garden');
    await search();
    expect(await screen.findByText('Loading venues…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Harbour Hall' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search venues/ })).toBeDisabled();
    release(json({ items: [room] }));
    expect(await screen.findByRole('heading', { name: 'Garden Room' })).toBeInTheDocument();
  });
});

describe('KAN-12 coordinator venue search: changing and clearing filters (KAN-12-AC11)', () => {
  it('searches again with a changed filter', async () => {
    const { searches, lastSearch } = mockBackend();
    await open();
    await screen.findByText('2 venues found');
    await type('Location', 'Marina');
    await search();
    await waitFor(() => expect(lastSearch().get('location')).toBe('Marina'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Search venues/ })).toBeEnabled());
    await type('Location', 'Garden');
    await search();
    await waitFor(() => expect(lastSearch().get('location')).toBe('Garden'));
    expect(searches()).toHaveLength(3);
  });

  it('clears every filter and searches again with none', async () => {
    const { searches, lastSearch } = mockBackend();
    await open();
    await screen.findByText('2 venues found');
    await type('Expected attendance', '100');
    await type('Location', 'Marina');
    await type('Room layout', 'Banquet');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Lift' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Wheelchair accessible' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(searches()).toHaveLength(2));
    expect(lastSearch().toString()).toBe('');
    expect(screen.getByLabelText('Location')).toHaveValue('');
    expect(screen.getByLabelText('Expected attendance')).toHaveValue(null);
    expect(screen.getByLabelText('Room layout')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Lift' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Wheelchair accessible' })).not.toBeChecked();
  });

  it('explains a search with no matches and offers to widen it', async () => {
    let calls = 0;
    const { searches } = mockBackend({ search: () => json({ items: ++calls === 1 ? [hall] : calls === 2 ? [] : [hall] }) });
    await open();
    await screen.findByText('1 venue found');
    await type('Minimum capacity', '5000');
    await search();
    expect(await screen.findByRole('heading', { name: 'No venue matches these filters' })).toBeInTheDocument();
    expect(screen.getByText('0 venues found')).toBeInTheDocument();
    await fireEvent.click(within(screen.getByText('No venue matches these filters').parentElement!)
      .getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('1 venue found')).toBeInTheDocument();
    expect(searches()).toHaveLength(3);
  });

  it('says so when the catalogue itself has no venues, rather than blaming the filters', async () => {
    mockBackend({ search: () => json({ items: [] }) });
    await open();
    expect(await screen.findByRole('heading', { name: 'No venues in the catalogue yet' })).toBeInTheDocument();
    expect(screen.queryByText('No venue matches these filters')).not.toBeInTheDocument();
  });
});

describe('KAN-12 coordinator venue search: invalid time filters (proposed robustness for S2-T08)', () => {
  it.each([
    ['only a start', '2026-10-05T10:00', '', 'Enter both a start and an end time, or leave both empty.'],
    ['only an end', '', '2026-10-05T10:00', 'Enter both a start and an end time, or leave both empty.'],
    ['an end before the start', '2026-10-05T12:00', '2026-10-05T10:00', 'The end time must be after the start time.'],
    ['an end equal to the start', '2026-10-05T10:00', '2026-10-05T10:00', 'The end time must be after the start time.'],
  ])('does not search with %s', async (_name, start, end, message) => {
    const { searches } = mockBackend();
    await open();
    await screen.findByText('2 venues found');
    if (start) await type('Event start (Singapore time)', start);
    if (end) await type('Event end (Singapore time)', end);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: /Search venues/ })).toBeDisabled();
    await fireEvent.submit(screen.getByRole('form', { name: 'Venue filters' }));
    expect(searches()).toHaveLength(1);
  });

  it('accepts a valid period and removes the warning', async () => {
    mockBackend();
    await open();
    await screen.findByText('2 venues found');
    await type('Event start (Singapore time)', '2026-10-05T10:00');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await type('Event end (Singapore time)', '2026-10-05T11:00');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search venues/ })).toBeEnabled();
  });
});

describe('KAN-12 coordinator venue search: access and failures (KAN-12-AC13)', () => {
  it('sends a signed-out visitor to sign in without requesting any venue data', async () => {
    session.user = null;
    const { fetchMock } = mockBackend();
    await open();
    expect(screen.getAllByText('Sign in to search venues.').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('form', { name: 'Venue filters' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as UserRole[])(
    'keeps the page closed to a %s without requesting venue data', async (role) => {
      session.user = user(role);
      const { fetchMock } = mockBackend();
      await open();
      expect(screen.getByRole('alert')).toHaveTextContent('This page is for event coordinators.');
      expect(screen.queryByRole('form', { name: 'Venue filters' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Harbour Hall' })).not.toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('waits for the session before deciding who may search', async () => {
    session.loading = true;
    session.user = null;
    const { fetchMock } = mockBackend();
    await open();
    expect(screen.getByText('Checking your access…')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    session.user = user();
    session.loading = false;
    expect(await screen.findByText('2 venues found')).toBeInTheDocument();
  });

  it('asks the user to sign in again when the session has expired (401)', async () => {
    mockBackend({ search: () => apiError(401, 'UNAUTHENTICATED', 'Sign in required.') });
    await open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to search venues.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Harbour Hall' })).not.toBeInTheDocument();
    expect(session.user).toBeNull();
  });

  it('shows the server refusal without a retry when the account is not a coordinator (403)', async () => {
    mockBackend({ search: () => apiError(403, 'ACTION_FORBIDDEN', 'Forbidden.') });
    await open();
    expect(await screen.findByText('This page is for event coordinators.', { selector: '.venue-error p' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows the server message and lets the user try again after a failure', async () => {
    let calls = 0;
    const { searches } = mockBackend({ search: () => (++calls === 1
      ? apiError(500, 'INTERNAL_ERROR', 'Venues are unavailable right now.') : json({ items: [hall] })) });
    await open();
    expect(await screen.findByText('Venues are unavailable right now.')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('1 venue found')).toBeInTheDocument();
    expect(searches()).toHaveLength(2);
  });

  it('still searches when the filter lists cannot be loaded, and says what is missing', async () => {
    const { lastSearch } = mockBackend({ options: () => apiError(500, 'INTERNAL_ERROR', 'Options failed.') });
    await open();
    expect(await screen.findByText('2 venues found')).toBeInTheDocument();
    expect(screen.getByText(/The layout, accessibility and facility lists could not be loaded/)).toBeInTheDocument();
    await type('Location', 'Marina');
    await search();
    await waitFor(() => expect(lastSearch().get('location')).toBe('Marina'));
  });

  it('ignores a slower earlier response that arrives after a newer search (stale results)', async () => {
    const pending: ((response: Response) => void)[] = [];
    mockBackend({ search: () => new Promise<Response>((resolve) => { pending.push(resolve); }) });
    await open();
    await waitFor(() => expect(pending).toHaveLength(1));
    await type('Location', 'Garden');
    await fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[1]!(json({ items: [room] }));
    expect(await screen.findByRole('heading', { name: 'Garden Room' })).toBeInTheDocument();
    pending[0]!(json({ items: [hall] }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('heading', { name: 'Harbour Hall' })).not.toBeInTheDocument();
    expect(screen.getByText('1 venue found')).toBeInTheDocument();
  });
});
