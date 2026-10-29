import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import type { VenueBooking, VenueBookingDecision } from '../api/venue-bookings';
import VenueBookingDetailPage from './VenueBookingDetailPage.vue';

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
  eventStartsAt: '2026-10-05T02:30:00Z', eventEndsAt: '2026-10-05T03:30:00Z',
  purpose: 'Hiring', description: 'Annual fair', expectedAttendance: 200,
  venueRequirements: 'Large hall', accessibilityNeeds: 'Wheelchair access',
  recovery: [],
  replacesBookingId: null, replacedByBookingIds: [],
  holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
  cancelledBy: null, cancelledAt: null, cancellationReason: null,
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const errorResponse = (status: number, code: string, message = 'The booking could not be updated.') =>
  json({ error: { code, message } }, status);
function decided(status: VenueBookingDecision = 'APPROVED'): VenueBooking {
  return { ...booking, status, decidedBy: 'staff-1', decidedAt: '2026-10-04T01:00:00Z', decisionReason: 'Suitable booking outcome.' };
}
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
async function settle(pending: ReturnType<typeof deferred>, response: Response) {
  pending.resolve(response);
  await new Promise((resolve) => setTimeout(resolve, 0));
}
async function open(id = 'booking-a') {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/venue-bookings/:id', component: VenueBookingDetailPage },
    { path: '/venue-bookings', component: { template: '<h1>Venue booking queue</h1>' } },
    { path: '/reviews/:id', component: { template: '<h1>Event review destination</h1>' } },
    { path: '/:pathMatch(.*)*', component: { template: '<p>Other page</p>' } },
  ] });
  await router.push(`/venue-bookings/${id}`);
  await router.isReady();
  return { ...render(RouterView, { global: { plugins: [router] } }), router };
}
async function choose(decision: VenueBookingDecision = 'APPROVED', reason?: string) {
  await screen.findByRole('heading', { name: 'Career fair' });
  await fireEvent.click(screen.getByRole('radio', { name: decision === 'APPROVED' ? 'Approve booking' : 'Reject booking' }));
  if (reason !== undefined) await fireEvent.update(screen.getByRole('textbox', { name: 'Reason or information (optional)' }), reason);
  await fireEvent.click(screen.getByRole('button', { name: 'Record decision' }));
}

beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-8 booking detail and staff decisions', () => {
  it('shows the requested period separately from latest event requirements', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ booking })));
    await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    for (const value of ['Harbour Hall', 'Theatre', 'Open the side entrance.', 'Hiring', 'Annual fair', '200', 'Large hall', 'Wheelchair access']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText('5 Oct 2026, 10:00 am')).toBeInTheDocument();
    expect(screen.getByText('5 Oct 2026, 10:30 am')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View venue availability' })).toHaveAttribute('href', '/venues/availability?venue=venue-a&week=2026-10-05');
    expect(screen.queryByRole('link', { name: 'View event request' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record decision' })).toBeDisabled();
  });

  it.each(['APPROVED', 'REJECTED'] as const)('records %s with a trimmed reason and displays the saved result', async (decision) => {
    const saved = decided(decision);
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking })).mockResolvedValueOnce(json({ booking: saved }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await choose(decision, `  ${saved.decisionReason}  `);
    expect(await screen.findByRole('status')).toHaveTextContent(decision === 'APPROVED' ? 'Venue booking approved.' : 'Venue booking rejected.');
    expect(screen.getByText(saved.decisionReason!)).toBeInTheDocument();
    expect(screen.getByText('4 Oct 2026, 9:00 am')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/venue-bookings/booking-a/decision');
    expect(JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string)).toEqual({ decision, reason: saved.decisionReason });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('allows an optional blank rejection reason', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking }))
      .mockResolvedValueOnce(json({ booking: { ...decided('REJECTED'), decisionReason: null } }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await choose('REJECTED', '   ');
    expect(await screen.findByText('No reason provided.')).toBeInTheDocument();
    expect(JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string)).toEqual({ decision: 'REJECTED', reason: null });
  });

  it('prevents reasons over 2,000 characters from being submitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ booking }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await screen.findByRole('radio', { name: 'Reject booking' });
    await fireEvent.click(screen.getByRole('radio', { name: 'Reject booking' }));
    await fireEvent.update(screen.getByRole('textbox', { name: 'Reason or information (optional)' }), 'x'.repeat(2001));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at most 2,000 characters');
    expect(screen.getByRole('button', { name: 'Record decision' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('disables approval for an event that is no longer approved but permits rejection', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking: { ...booking, eventStatus: 'REJECTED' } }))
      .mockResolvedValueOnce(json({ booking: decided('REJECTED') }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(await screen.findByRole('radio', { name: 'Approve booking' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Reject booking' })).toBeEnabled();
    await choose('REJECTED');
    expect(await screen.findByRole('status')).toHaveTextContent('Venue booking rejected.');
  });

  it('prevents duplicate clicks and refreshes while the write is pending', async () => {
    const pending = deferred();
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking })).mockReturnValueOnce(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await choose();
    expect(screen.getByRole('button', { name: 'Saving decision…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh booking' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Reject booking' })).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Saving decision…' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await settle(pending, json({ booking: decided() }));
    expect(await screen.findByRole('status')).toHaveTextContent('Venue booking approved.');
  });

  it('reloads a competing decision after 409 and never repeats the write', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking }))
      .mockResolvedValueOnce(errorResponse(409, 'BOOKING_ALREADY_DECIDED', 'This booking is no longer pending a decision.'))
      .mockResolvedValueOnce(json({ booking: decided('REJECTED') }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await choose();
    expect(await screen.findByText('Suitable booking outcome.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('no longer pending');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
    expect(fetchMock.mock.calls[2]![0]).toBe('/api/venue-bookings/booking-a');
  });

  it.each(['VENUE_BOOKING_CONFLICT', 'VENUE_UNAVAILABLE', 'VENUE_INACTIVE', 'EVENT_NOT_APPROVED'])(
    'shows %s and refreshes the latest state before another choice', async (code) => {
      const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking }))
        .mockResolvedValueOnce(errorResponse(409, code, 'Approval is no longer possible.'))
        .mockResolvedValueOnce(json({ booking }));
      vi.stubGlobal('fetch', fetchMock);
      await open();
      await choose();
      expect(await screen.findByRole('alert')).toHaveTextContent('Approval is no longer possible.');
      await screen.findByRole('radio', { name: 'Reject booking' });
      expect(screen.getByRole('button', { name: 'Record decision' })).toBeDisabled();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );

  it('requires a read after an uncertain write and never automatically resubmits', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking }))
      .mockRejectedValueOnce(new TypeError('Offline')).mockResolvedValueOnce(json({ booking: decided() }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await choose();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not confirm whether your decision was recorded');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh booking' }));
    expect(await screen.findByText('Suitable booking outcome.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  });

  it('preserves editable input when the server rejects validation', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking }))
      .mockResolvedValueOnce(errorResponse(400, 'INVALID_INPUT', 'Check the reason.'));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await choose('REJECTED', 'Needs another room');
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the reason.');
    expect(screen.getByRole('textbox')).toHaveValue('Needs another room');
    expect(screen.getByRole('button', { name: 'Record decision' })).toBeEnabled();
  });

  it.each(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const)('shows a read-only %s outcome to the coordinator', async (status) => {
    session.user = user('EVENT_COORDINATOR');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ booking: { ...decided(), status } })));
    await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View event request' })).toHaveAttribute('href', '/reviews/event-a');
    if (status === 'PENDING') expect(screen.getByText('Venue staff have not recorded an approval or rejection yet.')).toBeInTheDocument();
    if (status === 'CANCELLED') expect(screen.getByText(/has been cancelled/)).toBeInTheDocument();
  });

  it.each(['APPROVED', 'REJECTED', 'CANCELLED'] as const)('hides staff decision controls on a saved %s booking', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ booking: { ...decided(), status } })));
    await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('retries a failed detail read and masks a later not-found result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Offline'))
      .mockResolvedValueOnce(errorResponse(404, 'VENUE_BOOKING_NOT_FOUND')));
    await open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the API');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable or you do not have permission');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it.each([403, 404])('removes private details when the decision response is %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ booking }))
      .mockResolvedValueOnce(errorResponse(status, status === 404 ? 'VENUE_BOOKING_NOT_FOUND' : 'ACTION_FORBIDDEN')));
    await open();
    await choose();
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer have permission');
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it.each(['read', 'write'] as const)('clears private data and session after a 401 during %s', async (when) => {
    const fetchMock = vi.fn();
    if (when === 'write') fetchMock.mockResolvedValueOnce(json({ booking }));
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'AUTHENTICATION_REQUIRED'));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    if (when === 'write') await choose();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(session.user).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
  });

  it.each(['EVENT_ORGANISER', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)('does not read detail for %s', async (role) => {
    session.user = user(role);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(screen.getByRole('alert')).toHaveTextContent('Venue booking requests are for venue staff and event coordinators.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not read for visitors or until their session is resolved', async () => {
    session.loading = true;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    session.user = null;
    session.loading = false;
    await nextTick();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores a pending old-account response after sign-out', async () => {
    const pending = deferred();
    const fetchMock = vi.fn().mockReturnValueOnce(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    await open();
    session.user = null;
    await settle(pending, json({ booking }));
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
  });

  it('ignores a completed write after navigating to another booking', async () => {
    const pending = deferred();
    const other = { ...booking, id: 'booking-b', eventName: 'Dinner' };
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking })).mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(json({ booking: other }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await open();
    await choose();
    await router.push('/venue-bookings/booking-b');
    await screen.findByRole('heading', { name: 'Dinner' });
    await settle(pending, json({ booking: decided() }));
    expect(screen.getByRole('heading', { name: 'Dinner' })).toBeInTheDocument();
    expect(screen.queryByText('Venue booking approved.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record decision' })).toBeDisabled();
    expect((fetchMock.mock.calls[1]![1] as RequestInit).signal?.aborted).toBe(true);
  });

  it('returns to the queue without fetching an undefined booking before unmount', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    await fireEvent.click(screen.getByRole('link', { name: 'Back to venue booking requests' }));
    expect(await screen.findByRole('heading', { name: 'Venue booking queue' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
  });

  it.each(['event-b', 'booking-a'])('does not treat the next route id %s as a booking id', async (id) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    await router.push(`/reviews/${id}`);
    expect(await screen.findByRole('heading', { name: 'Event review destination' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('removes private data immediately when a permitted role becomes forbidden', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ booking }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    session.user = user('TECHNICAL_SUPPORT_STAFF');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument());
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('KAN-81 phase 2: recovery state on the booking detail page (AC6, AC12)', () => {
  const outage = (status: 'RECOVERY_REQUIRED' | 'RESOLVED' | 'CLEARED', impactId = `i-${status}`) => ({
    impactId, status, outageStartsAt: '2026-12-01T03:00:00.000Z', outageEndsAt: '2026-12-01T05:00:00.000Z',
    outageReason: 'Burst pipe',
  });
  const affected = (...recovery: ReturnType<typeof outage>[]): VenueBooking => ({ ...decided('APPROVED'), recovery });

  it('tells the assigned coordinator to arrange a replacement and lists the outage', async () => {
    session.user = user('EVENT_COORDINATOR', 'coordinator-1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ booking: affected(outage('RECOVERY_REQUIRED')) })));
    await open();
    const panel = await screen.findByRole('region', { name: 'Venue unavailability' });
    expect(panel).toHaveTextContent('The event and its other arrangements are unchanged; arrange a replacement venue for this period.');
    expect(panel).toHaveTextContent('Recovery required');
    expect(panel).toHaveTextContent('Burst pipe');
  });

  it('tells Venue Staff the coordinator has been notified', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ booking: affected(outage('RECOVERY_REQUIRED')) })));
    await open();
    expect(await screen.findByRole('region', { name: 'Venue unavailability' }))
      .toHaveTextContent('The assigned coordinator has been notified to arrange a replacement venue.');
  });

  it('distinguishes resolved and cleared outages when nothing needs recovery', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({
      booking: affected(outage('CLEARED'), outage('RESOLVED')),
    })));
    await open();
    const panel = await screen.findByRole('region', { name: 'Venue unavailability' });
    expect(panel).toHaveTextContent('No outage currently requires recovery for this booking.');
    expect(panel).toHaveTextContent('Cleared');
    expect(panel).toHaveTextContent('Resolved');
    expect(panel).not.toHaveTextContent('Recovery required');
  });

  it('shows no unavailability section for an unaffected booking', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ booking })));
    await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.queryByRole('region', { name: 'Venue unavailability' })).not.toBeInTheDocument();
  });
});

describe('KAN-81 phase 3: replacement link on the booking page (AC8)', () => {
  it('KAN-81-AC7 lets Venue Staff approve a replacement for a confirmed event', async () => {
    const replacement = { ...booking, eventStatus: 'CONFIRMED', replacesBookingId: 'original-1' };
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ booking: replacement }))
      .mockResolvedValueOnce(json({ booking: { ...replacement, status: 'APPROVED', decidedBy: 'staff-1' } }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(await screen.findByRole('radio', { name: 'Approve booking' })).toBeEnabled();
    expect(screen.queryByText(/current status does not allow/)).not.toBeInTheDocument();
    await choose('APPROVED');
    expect(await screen.findByText('Venue booking approved.')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string))
      .toEqual({ decision: 'APPROVED', reason: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['CONFIRMED', null], ['REJECTED', 'original-1'], ['CANCELLED', 'original-1'],
    ['COMPLETED', 'original-1'], ['SUBMITTED', 'original-1'],
  ])('KAN-81 keeps approval disabled for %s with replacement %s', async (eventStatus, replacesBookingId) => {
    const fetchMock = vi.fn().mockResolvedValue(json({ booking: { ...booking, eventStatus, replacesBookingId } }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(await screen.findByRole('radio', { name: 'Approve booking' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Reject booking' })).toBeEnabled();
    expect(screen.getByText(/current status does not allow/)).toBeInTheDocument();
    await fireEvent.submit(screen.getByRole('button', { name: 'Record decision' }).closest('form')!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('KAN-81-AC10 does not give the coordinator staff decision controls on a confirmed replacement', async () => {
    session.user = user('EVENT_COORDINATOR');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ booking: {
      ...booking, eventStatus: 'CONFIRMED', replacesBookingId: 'original-1',
    } })));
    await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument();
  });

  it('links a replacement to the booking it replaces', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ booking: { ...booking, replacesBookingId: 'original-1' } })));
    await open();
    expect(await screen.findByRole('link', { name: 'The outage-affected booking' }))
      .toHaveAttribute('href', '/venue-bookings/original-1');
  });

  it('shows no replacement link for an ordinary booking', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ booking })));
    await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.queryByRole('link', { name: 'The outage-affected booking' })).not.toBeInTheDocument();
  });
});
