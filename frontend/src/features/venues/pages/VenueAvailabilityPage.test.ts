import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { router as appRouter } from '../../../app/router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import type { VenueAvailability } from '../api/availability';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: SignedInUser | null; loading: boolean };
const thisWeek = { from: '2026-10-04T16:00:00.000Z', to: '2026-10-11T16:00:00.000Z' };
const nextWeek = { from: '2026-10-11T16:00:00.000Z', to: '2026-10-18T16:00:00.000Z' };

const hall: VenueAvailability = {
  id: 'venue-hall', name: 'Harbour Hall', location: 'Level 1, Main Building', capacity: 300,
  opensAt: '08:00', closesAt: '22:00',
  unavailable: [
    // Monday 10:00–12:00 and Tuesday 09:00–18:00, Singapore time.
    { id: 'booking-1', kind: 'BOOKING', startsAt: '2026-10-05T02:00:00.000Z', endsAt: '2026-10-05T04:00:00.000Z', event: null },
    { id: 'block-1', kind: 'BLOCKED', startsAt: '2026-10-06T01:00:00.000Z', endsAt: '2026-10-06T10:00:00.000Z', reason: 'Maintenance' },
  ],
};
const room: VenueAvailability = {
  id: 'venue-room', name: 'Orchid Seminar Room', location: null, capacity: 40, opensAt: null, closesAt: null,
  unavailable: [
    // Wednesday 14:00–16:00, Singapore time, for an event the reader coordinates.
    {
      id: 'booking-2', kind: 'BOOKING', startsAt: '2026-10-07T06:00:00.000Z', endsAt: '2026-10-07T08:00:00.000Z',
      event: { id: 'event-9', name: 'Career fair' },
    },
  ],
};

function user(role: UserRole = 'VENUE_STAFF', id = 'staff-1'): SignedInUser {
  return { id, role, email: `${id}@example.test`, displayName: id };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function windowOf(url: unknown) {
  const params = new URL(String(url), 'http://localhost').searchParams;
  return { from: params.get('from'), to: params.get('to') };
}

/** Answer every read with the given venues for whichever window was requested. */
function stubAvailability(items: VenueAvailability[] = [hall, room]) {
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => jsonResponse({ ...windowOf(url), items }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((fulfil) => { resolve = fulfil; });
  return { promise, resolve };
}

async function settle(pending: ReturnType<typeof deferredResponse>, response: Response) {
  pending.resolve(response);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function openCalendar(path = '/venues/availability') {
  // The application's own routes, so the page is reached exactly as users reach it.
  const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes });
  await router.push(path);
  await router.isReady();
  render(RouterView, { global: { plugins: [router] } });
  return router;
}

/** One day's agenda lines with whitespace normalised. */
function agendaFor(day: string): string[] {
  const list = screen.getByRole('list', { name: day });
  return [...list.querySelectorAll('li')].map((item) => item.textContent!.replace(/\s+/g, ' ').trim());
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  // Wednesday 7 October 2026, 12:00 in Singapore.
  vi.setSystemTime(new Date('2026-10-07T04:00:00.000Z'));
  session.user = user();
  session.loading = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('KAN-51 venue availability page access', () => {
  it('waits for the session to be restored before reading availability', async () => {
    session.loading = true;
    const fetchMock = stubAvailability();
    await openCalendar();

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(fetchMock).not.toHaveBeenCalled();
    session.loading = false;
    expect(await screen.findByRole('heading', { name: 'Harbour Hall' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('offers sign-in to a signed-out visitor without reading availability', async () => {
    session.user = null;
    const fetchMock = stubAvailability();
    await openCalendar();

    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to view venue availability.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['EVENT_ORGANISER', 'Go to your event requests', '/events'],
    ['ATTENDEE', 'Go to overview', '/'],
  ] as const)('does not read or show venue planning information to %s', async (role, linkName, href) => {
    session.user = user(role);
    const fetchMock = stubAvailability();
    await openCalendar();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Venue availability is for event coordinators, venue staff and technical support staff.',
    );
    expect(screen.getByRole('link', { name: linkName })).toHaveAttribute('href', href);
    expect(screen.queryByText('Harbour Hall')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF'] as const)(
    'loads the current Singapore week for %s', async (role) => {
      session.user = user(role);
      const fetchMock = stubAvailability();
      await openCalendar();

      expect(screen.getByRole('status')).toHaveTextContent('Loading venue availability');
      expect(await screen.findByRole('heading', { name: 'Harbour Hall' })).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(String(fetchMock.mock.calls[0]![0])).toMatch(/^\/api\/venues\/availability\?/);
      expect(windowOf(fetchMock.mock.calls[0]![0])).toEqual(thisWeek);
      expect(screen.getByText('5–11 Oct 2026')).toBeInTheDocument();
    },
  );

  it('returns to the sign-in prompt and hides the calendar when the session has expired', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to view venue availability.' },
    }, 401)));
    await openCalendar();

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next week' })).not.toBeInTheDocument();
  });

  it('discards the previous account\'s pending read when the account changes', async () => {
    const oldRead = deferredResponse();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(oldRead.promise)
      .mockResolvedValueOnce(jsonResponse({ ...thisWeek, items: [room] }));
    vi.stubGlobal('fetch', fetchMock);
    await openCalendar();
    const oldSignal = (fetchMock.mock.calls[0]![1] as RequestInit).signal!;

    session.user = user('EVENT_COORDINATOR', 'coordinator-2');
    expect(await screen.findByRole('heading', { name: 'Orchid Seminar Room' })).toBeInTheDocument();
    expect(oldSignal.aborted).toBe(true);
    await settle(oldRead, jsonResponse({ ...thisWeek, items: [hall] }));
    expect(screen.getByRole('heading', { name: 'Orchid Seminar Room' })).toBeInTheDocument();
    expect(screen.queryByText('Harbour Hall')).not.toBeInTheDocument();
  });
});

describe('KAN-51 venue availability calendar', () => {
  it('distinguishes available time from confirmed bookings and blocked periods', async () => {
    stubAvailability();
    await openCalendar();
    await screen.findByRole('heading', { name: 'Harbour Hall' });

    expect(screen.getByText(/Level 1, Main Building · Up to 300 people · Open 08:00 – 22:00 daily/))
      .toBeInTheDocument();
    expect([...screen.getByRole('list', { name: 'Legend' }).querySelectorAll('li')].map((item) => item.textContent))
      .toEqual([
        'Available', 'Booked: confirmed venue booking', 'Blocked: operational unavailability',
        'Closed: outside opening hours',
      ]);
    expect(agendaFor('Mon, 5 Oct')).toEqual([
      'Available 08:00 – 10:00', 'Booked 10:00 – 12:00', 'Available 12:00 – 22:00',
    ]);
    expect(agendaFor('Tue, 6 Oct')).toEqual([
      'Available 08:00 – 09:00', 'Blocked 09:00 – 18:00 · Maintenance', 'Available 18:00 – 22:00',
    ]);
    expect(agendaFor('Wed, 7 Oct')).toEqual(['Available 08:00 – 22:00']);
    expect(screen.getAllByText('Partly available')).toHaveLength(2);
    expect(screen.getAllByText('Today')).toHaveLength(1);
  });

  it('shows only the chosen venue\'s periods and keeps the choice in the address', async () => {
    stubAvailability();
    const router = await openCalendar();
    await screen.findByRole('heading', { name: 'Harbour Hall' });

    await fireEvent.update(screen.getByRole('combobox', { name: 'Venue' }), 'venue-room');
    expect(await screen.findByRole('heading', { name: 'Orchid Seminar Room' })).toBeInTheDocument();
    expect(screen.getByText(/Location not listed · Up to 40 people · No set opening hours/)).toBeInTheDocument();
    // Harbour Hall's Monday booking and Tuesday block do not appear against this venue.
    expect(agendaFor('Mon, 5 Oct')).toEqual(['Available all day']);
    expect(agendaFor('Tue, 6 Oct')).toEqual(['Available all day']);
    expect(agendaFor('Wed, 7 Oct')).toEqual([
      'Available 00:00 – 14:00', 'Booked 14:00 – 16:00 · Assigned to you: Career fair', 'Available 16:00 – 24:00',
    ]);
    await waitFor(() => expect(router.currentRoute.value.query).toEqual({ week: '2026-10-05', venue: 'venue-room' }));
  });

  it('links a booking to its request only when the API identifies the reader\'s own event', async () => {
    session.user = user('EVENT_COORDINATOR', 'coordinator-1');
    stubAvailability();
    await openCalendar('/venues/availability?venue=venue-room');

    expect(await screen.findByRole('link', { name: 'Career fair' })).toHaveAttribute('href', '/reviews/event-9');
    await fireEvent.update(screen.getByRole('combobox', { name: 'Venue' }), 'venue-hall');
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(agendaFor('Mon, 5 Oct')).toContain('Booked 10:00 – 12:00');
    expect(screen.queryByRole('link', { name: 'Career fair' })).not.toBeInTheDocument();
  });

  it('moves between weeks, updating the request, the label and the address', async () => {
    const fetchMock = stubAvailability();
    const router = await openCalendar();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(screen.getByRole('button', { name: 'This week' })).toBeDisabled();

    await fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading venue availability');
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(windowOf(fetchMock.mock.calls[1]![0])).toEqual(nextWeek);
    expect(screen.getByText('12–18 Oct 2026')).toBeInTheDocument();
    // The Monday booking belongs to the previous week only.
    expect(agendaFor('Mon, 12 Oct')).toEqual(['Available 08:00 – 22:00']);
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
    await waitFor(() => expect(router.currentRoute.value.query).toEqual({ week: '2026-10-12', venue: 'venue-hall' }));

    await fireEvent.click(screen.getByRole('button', { name: 'This week' }));
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(windowOf(fetchMock.mock.calls[2]![0])).toEqual(thisWeek);
    await fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(windowOf(fetchMock.mock.calls[3]![0]))
      .toEqual({ from: '2026-09-27T16:00:00.000Z', to: '2026-10-04T16:00:00.000Z' });
  });

  it('reopens a shared week and venue, and jumps to the week containing a chosen date', async () => {
    const fetchMock = stubAvailability();
    await openCalendar('/venues/availability?week=2026-10-14&venue=venue-room');

    expect(await screen.findByRole('heading', { name: 'Orchid Seminar Room' })).toBeInTheDocument();
    expect(windowOf(fetchMock.mock.calls[0]![0])).toEqual(nextWeek);

    const dateInput = screen.getByLabelText('Go to date');
    await fireEvent.update(dateInput, '2026-11-04');
    await fireEvent.change(dateInput);
    await screen.findByRole('heading', { name: 'Orchid Seminar Room' });
    expect(windowOf(fetchMock.mock.calls[1]![0]))
      .toEqual({ from: '2026-11-01T16:00:00.000Z', to: '2026-11-08T16:00:00.000Z' });
    expect(screen.getByText('2–8 Nov 2026')).toBeInTheDocument();
  });

  it('ignores an invalid shared week and shows the current one', async () => {
    const fetchMock = stubAvailability();
    await openCalendar('/venues/availability?week=2026-02-30');
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(windowOf(fetchMock.mock.calls[0]![0])).toEqual(thisWeek);
  });

  it('follows calendar links and browser history to the requested week and venue', async () => {
    const fetchMock = stubAvailability();
    const router = await openCalendar();
    await screen.findByRole('heading', { name: 'Harbour Hall' });

    await router.push('/venues/availability?week=2026-10-12&venue=venue-room');
    await screen.findByRole('heading', { name: 'Orchid Seminar Room' });
    expect(screen.getByText('12–18 Oct 2026')).toBeInTheDocument();
    expect(windowOf(fetchMock.mock.calls[1]![0])).toEqual(nextWeek);
    expect(agendaFor('Mon, 12 Oct')).toEqual(['Available all day']);

    router.back();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(screen.getByText('5–11 Oct 2026')).toBeInTheDocument();
    expect(windowOf(fetchMock.mock.calls[2]![0])).toEqual(thisWeek);
    expect(agendaFor('Mon, 5 Oct')).toContain('Booked 10:00 – 12:00');

    router.forward();
    await screen.findByRole('heading', { name: 'Orchid Seminar Room' });
    expect(screen.getByText('12–18 Oct 2026')).toBeInTheDocument();
    expect(windowOf(fetchMock.mock.calls[3]![0])).toEqual(nextWeek);
  });

  it('updates the venue from a calendar link within the already loaded week', async () => {
    const fetchMock = stubAvailability();
    const router = await openCalendar();
    await screen.findByRole('heading', { name: 'Harbour Hall' });

    await router.push('/venues/availability?venue=venue-room');
    await screen.findByRole('heading', { name: 'Orchid Seminar Room' });
    expect(agendaFor('Mon, 5 Oct')).toEqual(['Available all day']);
    expect(agendaFor('Wed, 7 Oct')).toContain('Booked 14:00 – 16:00 · Assigned to you: Career fair');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('discards a previous week\'s pending read when a different calendar link is opened', async () => {
    const oldRead = deferredResponse();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(oldRead.promise)
      .mockResolvedValueOnce(jsonResponse({ ...nextWeek, items: [hall, room] }));
    vi.stubGlobal('fetch', fetchMock);
    const router = await openCalendar();
    const oldSignal = (fetchMock.mock.calls[0]![1] as RequestInit).signal!;

    await router.push('/venues/availability?week=2026-10-12&venue=venue-room');
    await screen.findByRole('heading', { name: 'Orchid Seminar Room' });
    expect(oldSignal.aborted).toBe(true);
    expect(windowOf(fetchMock.mock.calls[1]![0])).toEqual(nextWeek);
    await settle(oldRead, jsonResponse({ ...thisWeek, items: [hall] }));
    expect(screen.getByRole('heading', { name: 'Orchid Seminar Room' })).toBeInTheDocument();
    expect(screen.getByText('12–18 Oct 2026')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Harbour Hall' })).not.toBeInTheDocument();
  });

  it('shows newly recorded periods after a refresh', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ...thisWeek, items: [{ ...hall, unavailable: [] }] }))
      .mockResolvedValueOnce(jsonResponse({ ...thisWeek, items: [hall] }));
    vi.stubGlobal('fetch', fetchMock);
    await openCalendar();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(agendaFor('Mon, 5 Oct')).toEqual(['Available 08:00 – 22:00']);

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(agendaFor('Mon, 5 Oct')).toContain('Booked 10:00 – 12:00');
    expect(windowOf(fetchMock.mock.calls[1]![0])).toEqual(thisWeek);
  });

  it('reports a failed read without stale data and recovers on retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      }, 500))
      .mockResolvedValueOnce(jsonResponse({ ...thisWeek, items: [hall] }));
    vi.stubGlobal('fetch', fetchMock);
    await openCalendar();

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.queryByText('Harbour Hall')).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Harbour Hall' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains a server-side refusal without offering a retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'ACTION_FORBIDDEN', message: 'Your role cannot perform this action.' },
    }, 403)));
    await openCalendar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Venue availability is for event coordinators, venue staff and technical support staff.',
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows an empty state when the catalogue has no active venues', async () => {
    stubAvailability([]);
    await openCalendar();
    expect(await screen.findByRole('heading', { name: 'No venues in the catalogue yet' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Venue' })).not.toBeInTheDocument();
  });
});

describe('KAN-83 live holds in the availability calendar', () => {
  it('KAN-83-AC4 labels a live hold as Held with its deadline, separately from a confirmed booking', async () => {
    stubAvailability([{ ...hall, unavailable: [
      { ...hall.unavailable[0]!, kind: 'BOOKING', event: null, heldUntil: '2026-10-04T10:00:00.000Z' },
    ] }]);
    await openCalendar();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    const [, held] = agendaFor('Mon, 5 Oct');
    expect(held).toMatch(/^Held 10:00 – 12:00 · Held until /);
    expect(screen.getByText('Held')).toHaveClass('agenda-tag--held');
  });
});

