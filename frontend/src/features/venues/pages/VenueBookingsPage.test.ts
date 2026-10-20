import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import type { VenueBooking } from '../api/venue-bookings';
import VenueBookingsPage from './VenueBookingsPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: SignedInUser | null; loading: boolean };
function user(role: UserRole = 'VENUE_STAFF', id = 'staff-1'): SignedInUser {
  return { id, role, email: `${id}@example.test`, displayName: id };
}
const booking: VenueBooking = {
  id: 'booking-a', eventRequestId: 'event-a', eventName: 'Career fair', eventStatus: 'APPROVED',
  venueId: 'venue-a', venueName: 'Harbour Hall', status: 'PENDING',
  startsAt: '2026-10-05T02:00:00Z', endsAt: '2026-10-05T04:00:00Z',
  layout: 'Theatre', notes: 'Open the side entrance.', decidedBy: null, decidedAt: null, decisionReason: null,
  createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z',
  eventStartsAt: '2026-10-05T02:00:00Z', eventEndsAt: '2026-10-05T04:00:00Z',
  purpose: 'Hiring', description: 'Annual fair', expectedAttendance: 200,
  venueRequirements: 'Large hall', accessibilityNeeds: 'Wheelchair access',
  recovery: [],
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
async function open(path = '/venue-bookings') {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/venue-bookings', component: VenueBookingsPage },
    { path: '/venue-bookings/:id', component: { template: '<h1>Booking detail destination</h1>' } },
    { path: '/:pathMatch(.*)*', component: { template: '<p>Other page</p>' } },
  ] });
  await router.push(path);
  await router.isReady();
  return { ...render(RouterView, { global: { plugins: [router] } }), router };
}

beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-8 venue booking requests list', () => {
  it('shows staff the pending queue with venue, booking timing and detail links', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [booking] }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(await screen.findByRole('link', { name: 'Career fair · Harbour Hall' }))
      .toHaveAttribute('href', '/venue-bookings/booking-a');
    expect(screen.getByRole('heading', { name: 'Pending venue requests' })).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(/5 Oct 2026, 10:00 am/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/venue-bookings', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('shows coordinators outcomes and preserves an event filter', async () => {
    session.user = user('EVENT_COORDINATOR');
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [{ ...booking, status: 'REJECTED', decisionReason: 'The room is unsuitable.' }] }));
    vi.stubGlobal('fetch', fetchMock);
    await open('/venue-bookings?eventRequestId=event-a');
    expect(await screen.findByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('The room is unsuitable.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bookings for your assigned events' })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/venue-bookings?eventRequestId=event-a');
    expect(screen.getByRole('link', { name: 'Show all venue booking requests' })).toHaveAttribute('href', '/venue-bookings');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it.each(['VENUE_STAFF', 'EVENT_COORDINATOR'] as const)('shows a useful empty state for %s', async (role) => {
    session.user = user(role);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ items: [] })));
    await open();
    expect(await screen.findByRole('heading', { name: role === 'VENUE_STAFF' ? 'No pending venue requests' : 'No venue booking requests yet' })).toBeInTheDocument();
  });

  it.each(['EVENT_ORGANISER', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)('does not read booking data for %s', async (role) => {
    session.user = user(role);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(screen.getByRole('alert')).toHaveTextContent('Venue booking requests are for venue staff and event coordinators.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers sign-in to visitors without fetching', async () => {
    session.user = null;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits for session restoration before reading the queue', async () => {
    session.loading = true;
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [booking] }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(fetchMock).not.toHaveBeenCalled();
    session.loading = false;
    expect(await screen.findByText('Career fair · Harbour Hall')).toBeInTheDocument();
  });

  it('retries a failed read without keeping old results', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ items: [booking] }))
      .mockRejectedValueOnce(new TypeError('Offline')).mockResolvedValueOnce(json({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await screen.findByText('Career fair · Harbour Hall');
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the API');
    expect(screen.queryByText('Career fair · Harbour Hall')).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'No pending venue requests' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clears the session and prior results after an expired-session response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ items: [booking] }))
      .mockResolvedValueOnce(json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired session' } }, 401)));
    await open();
    await screen.findByText('Career fair · Harbour Hall');
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(session.user).toBeNull();
    expect(screen.queryByText('Career fair · Harbour Hall')).not.toBeInTheDocument();
  });

  it('ignores a previous account response after an account switch', async () => {
    const oldRead = deferred();
    const fetchMock = vi.fn().mockReturnValueOnce(oldRead.promise).mockResolvedValueOnce(json({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    session.user = user('EVENT_COORDINATOR', 'coordinator-2');
    expect(await screen.findByRole('heading', { name: 'No venue booking requests yet' })).toBeInTheDocument();
    oldRead.resolve(json({ items: [booking] }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('Career fair · Harbour Hall')).not.toBeInTheDocument();
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
  });

  it('removes private data immediately after sign-out without another request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [booking] }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await screen.findByText('Career fair · Harbour Hall');
    session.user = null;
    await nextTick();
    expect(screen.queryByText('Career fair · Harbour Hall')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reloads when the selected event changes and masks denied data', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ items: [booking] }))
      .mockResolvedValueOnce(json({ error: { code: 'ACTION_FORBIDDEN', message: 'Forbidden' } }, 403));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await open();
    await screen.findByText('Career fair · Harbour Hall');
    await router.push('/venue-bookings?eventRequestId=event-b');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable or you do not have permission');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/venue-bookings?eventRequestId=event-b');
    expect(screen.queryByText('Career fair · Harbour Hall')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('opens a filtered booking without reloading an unfiltered list before unmount', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ items: [booking] }));
    vi.stubGlobal('fetch', fetchMock);
    await open('/venue-bookings?eventRequestId=event-a');
    await fireEvent.click(await screen.findByRole('link', { name: 'Career fair · Harbour Hall' }));
    expect(await screen.findByRole('heading', { name: 'Booking detail destination' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/venue-bookings?eventRequestId=event-a');
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
  });
});
