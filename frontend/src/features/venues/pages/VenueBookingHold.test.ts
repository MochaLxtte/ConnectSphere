import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import type { VenueBooking } from '../api/venue-bookings';
import VenueBookingDetailPage from './VenueBookingDetailPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'VENUE_STAFF'): SignedInUser =>
  ({ id: `${role}-1`, role, email: 'person@example.test', displayName: role });

const pending: VenueBooking = {
  id: 'booking-h', eventRequestId: 'event-h', eventName: 'Careers fair', eventStatus: 'APPROVED',
  venueId: 'venue-h', venueName: 'Harbour Hall', status: 'PENDING',
  startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
  layout: null, notes: null, decidedBy: null, decidedAt: null, decisionReason: null,
  createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z',
  eventStartsAt: '2026-12-01T02:00:00Z', eventEndsAt: '2026-12-01T06:00:00Z',
  purpose: null, description: null, expectedAttendance: 50, venueRequirements: null, accessibilityNeeds: null,
  holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
  cancelledBy: null, cancelledAt: null, cancellationReason: null,
  recovery: [], replacesBookingId: null,
};
const held: VenueBooking = {
  ...pending, status: 'HELD', holdExpiresAt: '2026-11-28T10:00:00.000Z', heldBy: 'VENUE_STAFF-1',
  heldAt: '2026-10-21T01:00:00.000Z',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const refusal = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
function serve(read: VenueBooking, write?: Handler) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const reads: VenueBooking[] = [read];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === 'GET') return json({ booking: reads[reads.length - 1] });
    if (!write) throw new Error(`Unexpected ${method} ${url}`);
    return write(url, init);
  }));
  return { calls, setRead: (next: VenueBooking) => reads.push(next) };
}

async function open() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/venue-bookings/:id', component: VenueBookingDetailPage },
    { path: '/:pathMatch(.*)*', component: { template: '<p>Other page</p>' } },
  ] });
  await router.push('/venue-bookings/booking-h');
  await router.isReady();
  render(RouterView, { global: { plugins: [router] } });
  await screen.findByRole('heading', { name: 'Careers fair' });
}

beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-83 placing a hold from the booking page', () => {
  it('KAN-83-AC1 sends the Singapore-time deadline as an instant and shows the saved hold', async () => {
    const { calls } = serve(pending, () => json({ booking: held }));
    await open();
    const button = screen.getByRole('button', { name: 'Place hold' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/no later than the booking start \(1 Dec 2026, 10:00 am\)/)).toBeInTheDocument();
    await fireEvent.update(screen.getByLabelText('Hold deadline (Singapore time)'), '2026-11-28T18:00');
    expect(button).toBeEnabled();
    await fireEvent.click(button);

    await screen.findByText('Held until 28 Nov 2026, 6:00 pm');
    expect(calls.find((call) => call.method === 'POST')).toEqual({
      url: '/api/venue-bookings/booking-h/hold', method: 'POST', body: { expiresAt: '2026-11-28T10:00:00.000Z' },
    });
    expect(screen.getByRole('status')).toHaveTextContent('Venue held until 28 Nov 2026, 6:00 pm. Approve it before then, or it is released.');
    expect(screen.getByRole('heading', { name: 'Temporary hold' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Place hold' })).not.toBeInTheDocument();
  });

  it('KAN-83-AC1 explains a deadline after the booked start and keeps the hold button disabled', async () => {
    serve(pending);
    await open();
    await fireEvent.update(screen.getByLabelText('Hold deadline (Singapore time)'), '2026-12-01T10:01');
    expect(screen.getByRole('alert')).toHaveTextContent('The hold deadline must be no later than the start of the booked period.');
    expect(screen.getByRole('button', { name: 'Place hold' })).toBeDisabled();
  });

  it('KAN-83-AC1 shows the server refusal for a deadline it rejects', async () => {
    serve(pending, () => refusal(400, 'INVALID_HOLD_EXPIRY', 'The hold deadline must be in the future.'));
    await open();
    await fireEvent.update(screen.getByLabelText('Hold deadline (Singapore time)'), '2026-11-28T18:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Place hold' }));
    expect(await screen.findByText('The hold deadline must be in the future.')).toBeInTheDocument();
    expect(screen.getByLabelText('Hold deadline (Singapore time)')).toHaveValue('2026-11-28T18:00');
  });

  it('KAN-83-AC12 reloads the saved booking after a conflict instead of retrying', async () => {
    const server = serve(pending, () => {
      server.setRead({ ...pending, status: 'APPROVED', decidedBy: 'other', decidedAt: '2026-10-21T02:00:00Z' });
      return refusal(409, 'VENUE_HELD', 'The venue is temporarily held for another request during this period.');
    });
    await open();
    await fireEvent.update(screen.getByLabelText('Hold deadline (Singapore time)'), '2026-11-28T18:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Place hold' }));
    expect(await screen.findByText(/temporarily held for another request.*Review the current booking status/)).toBeInTheDocument();
    await waitFor(() => expect(server.calls.filter((call) => call.method === 'GET')).toHaveLength(2));
    expect(server.calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });

  it('KAN-83-AC12 asks for a refresh when the outcome of a hold is uncertain', async () => {
    serve(pending, () => { throw new TypeError('Network failure'); });
    await open();
    await fireEvent.update(screen.getByLabelText('Hold deadline (Singapore time)'), '2026-11-28T18:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Place hold' }));
    expect(await screen.findByText('We could not confirm whether your hold was recorded. Refresh the booking before trying again.'))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Place hold' })).not.toBeInTheDocument();
  });

  it('does not offer a hold when the event is not approved', async () => {
    serve({ ...pending, eventStatus: 'SUBMITTED' });
    await open();
    expect(screen.queryByRole('heading', { name: 'Place a temporary hold' })).not.toBeInTheDocument();
  });
});

describe('KAN-83 working with a live hold', () => {
  it('KAN-83-AC2/AC12 shows the hold deadline and that the server checks it', async () => {
    serve(held);
    await open();
    expect(screen.getByText('Held until 28 Nov 2026, 6:00 pm')).toBeInTheDocument();
    expect(screen.getByText('Held')).toBeInTheDocument();
    expect(screen.getByText(/The server checks the deadline when a change is saved/)).toBeInTheDocument();
    expect(screen.getByText('Approval converts the hold into the confirmed booking for this period. It does not change the event\'s status.'))
      .toBeInTheDocument();
  });

  it('KAN-83-AC5 approves a hold through the decision form', async () => {
    const { calls } = serve(held, () => json({ booking: { ...held, status: 'APPROVED', decidedBy: 'VENUE_STAFF-1',
      decidedAt: '2026-10-21T02:00:00Z' } }));
    await open();
    await fireEvent.click(screen.getByRole('radio', { name: 'Approve booking' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Record decision' }));
    expect(await screen.findByText('Venue booking approved.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')?.url).toBe('/api/venue-bookings/booking-h/decision');
    expect(screen.getByText('Earlier hold deadline')).toBeInTheDocument();
  });

  it('KAN-83-AC10 requires a reason to cancel and sends it trimmed', async () => {
    const { calls } = serve(held, () => json({ booking: { ...held, status: 'CANCELLED', cancelledBy: 'VENUE_STAFF-1',
      cancelledAt: '2026-10-21T03:00:00Z', cancellationReason: 'Organiser withdrew' } }));
    await open();
    const cancel = screen.getByRole('button', { name: 'Cancel hold' });
    expect(cancel).toBeDisabled();
    await fireEvent.update(screen.getByLabelText('Reason for cancelling (required)'), '   ');
    expect(cancel).toBeDisabled();
    await fireEvent.update(screen.getByLabelText('Reason for cancelling (required)'), '  Organiser withdrew  ');
    await fireEvent.click(cancel);
    expect(await screen.findByText('Venue hold cancelled and released.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')).toEqual({
      url: '/api/venue-bookings/booking-h/hold/cancel', method: 'POST', body: { reason: 'Organiser withdrew' },
    });
    expect(screen.getByText('Organiser withdrew')).toBeInTheDocument();
  });

  it('KAN-83-AC10 explains an over-long cancellation reason', async () => {
    serve(held);
    await open();
    await fireEvent.update(screen.getByLabelText('Reason for cancelling (required)'), 'x'.repeat(2001));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at most 2,000 characters for the reason.');
    expect(screen.getByRole('button', { name: 'Cancel hold' })).toBeDisabled();
  });

  it('KAN-83-AC12 asks for a refresh when a cancellation outcome is uncertain', async () => {
    serve(held, () => { throw new TypeError('Network failure'); });
    await open();
    await fireEvent.update(screen.getByLabelText('Reason for cancelling (required)'), 'Released');
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel hold' }));
    expect(await screen.findByText(/whether your hold cancellation was recorded/)).toBeInTheDocument();
  });

  it('KAN-83-AC11 shows the coordinator the hold without any staff controls', async () => {
    session.user = user('EVENT_COORDINATOR');
    serve(held);
    await open();
    expect(screen.getByText('Held until 28 Nov 2026, 6:00 pm')).toBeInTheDocument();
    expect(screen.getByText('Venue staff have not recorded an approval or rejection yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel hold' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument();
  });
});

describe('KAN-83 expired and cancelled holds', () => {
  it('KAN-83-AC6/AC11 shows an expired hold as released with no way to approve or renew it', async () => {
    serve({ ...held, status: 'EXPIRED', expiredAt: '2026-11-28T10:00:30.000Z' });
    await open();
    expect(screen.getAllByText('Hold expired').length).toBeGreaterThan(0);
    // The deadline and the processed release time (30 s later) both show at minute precision.
    expect(screen.getAllByText('28 Nov 2026, 6:00 pm')).toHaveLength(2);
    expect(screen.getByText('Released on')).toBeInTheDocument();
    expect(screen.getByText(/released\. It cannot be approved or renewed/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toHaveTextContent('Refresh booking');
  });

  it('shows an expired hold that has not been processed yet without a release time', async () => {
    serve({ ...held, status: 'EXPIRED' });
    await open();
    expect(screen.queryByText('Released on')).not.toBeInTheDocument();
  });

  it('shows a cancelled booking without a reason as before', async () => {
    serve({ ...pending, status: 'CANCELLED' });
    await open();
    expect(screen.getByText('This booking has been cancelled and is not awaiting a decision.')).toBeInTheDocument();
    expect(screen.queryByText('Cancellation reason')).not.toBeInTheDocument();
  });
});

describe('KAN-83 disabled hold forms', () => {
  it('ignores a hold submission while the deadline is missing', async () => {
    const { calls } = serve(pending);
    await open();
    await fireEvent.submit(screen.getByRole('button', { name: 'Place hold' }).closest('form')!);
    expect(calls.filter((call) => call.method === 'POST')).toEqual([]);
  });

  it('ignores a cancellation submission while the reason is blank', async () => {
    const { calls } = serve(held);
    await open();
    await fireEvent.submit(screen.getByRole('button', { name: 'Cancel hold' }).closest('form')!);
    expect(calls.filter((call) => call.method === 'POST')).toEqual([]);
  });
});

