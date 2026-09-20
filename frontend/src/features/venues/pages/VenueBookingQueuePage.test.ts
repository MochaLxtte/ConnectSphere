import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import type { VenueBookingQueueItem } from '../api/venue-bookings';
import { errorBody, on, stubApi } from '../test-helpers';
import VenueBookingQueuePage from './VenueBookingQueuePage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string; role: string } | null; loading: boolean };
const passed = { suitable: true, checks: [{ code: 'CAPACITY' as const, passed: true, message: 'Capacity is fine.' }] };
const alpha: VenueBookingQueueItem = {
  id: 'booking-1', eventRequestId: 'event-1', venueId: 'venue-1', venueName: 'Grand Hall', requestedBy: 'organiser-1',
  status: 'PENDING', startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T04:00:00.000Z', layout: 'Theatre',
  notes: 'Doors at 9am', decidedBy: null, decidedAt: null, decisionReason: null,
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
  eventName: 'Career fair', organiserName: 'Olivia Organiser', expectedAttendance: 80, suitability: passed, conflicts: [],
};
const beta: VenueBookingQueueItem = {
  ...alpha, id: 'booking-2', eventRequestId: 'event-2', eventName: 'Hackathon', expectedAttendance: 500,
  suitability: { suitable: false, checks: [{ code: 'CAPACITY', passed: false, message: 'Capacity 300 is below the expected attendance of 500.' }] },
  conflicts: [{ bookingId: 'booking-1', status: 'PENDING', eventName: 'Career fair', startsAt: alpha.startsAt, endsAt: alpha.endsAt }],
};

function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: VenueBookingQueuePage }],
  });
  return render(VenueBookingQueuePage, { global: { plugins: [router] } });
}

const card = (name: string) => screen.getByRole('heading', { name }).closest('li')!;

beforeEach(() => { session.user = { id: 'staff-1', role: 'VENUE_STAFF' }; });

describe('CF-13/CF-14 venue booking queue page', () => {
  it('shows each request with suitability warnings and conflicts before a decision', async () => {
    const { calls } = stubApi(on('GET', '/api/venue-bookings', { items: [alpha, beta] }));
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Career fair' })).toBeInTheDocument();
    expect(calls[0]!.url).toBe('/api/venue-bookings?status=PENDING');
    expect(within(card('Career fair')).getByText('All suitability checks passed.')).toBeInTheDocument();
    expect(within(card('Career fair')).getByText('Olivia Organiser')).toBeInTheDocument();
    const hackathon = within(card('Hackathon'));
    expect(hackathon.getByText('Capacity 300 is below the expected attendance of 500.')).toBeInTheDocument();
    expect(hackathon.getByText(/Career fair \(pending\)/)).toBeInTheDocument();
  });

  it('approves a request and reloads the queue', async () => {
    let items = [alpha, beta];
    const { calls } = stubApi(
      on('POST', '/api/venue-bookings/booking-1/decision', () => { items = [beta]; return { body: { ...alpha, status: 'APPROVED' } }; }),
      on('GET', '/api/venue-bookings', () => ({ body: { items } })),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Career fair' });
    await fireEvent.click(screen.getByRole('button', { name: 'Approve Grand Hall for Career fair' }));
    expect(await screen.findByText('Approved the Grand Hall booking for Career fair.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({ decision: 'APPROVED', reason: null });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument());
  });

  it('requires a reason before rejecting', async () => {
    const { calls } = stubApi(
      on('POST', '/api/venue-bookings/booking-1/decision', { ...alpha, status: 'REJECTED' }),
      on('GET', '/api/venue-bookings', { items: [alpha] }),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Career fair' });
    await fireEvent.click(screen.getByRole('button', { name: 'Reject Grand Hall for Career fair' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a reason');
    expect(calls.some((call) => call.method === 'POST')).toBe(false);

    await fireEvent.update(screen.getByLabelText(/Reason/), ' Hall under renovation ');
    await fireEvent.click(screen.getByRole('button', { name: 'Reject Grand Hall for Career fair' }));
    await waitFor(() => expect(calls.find((call) => call.method === 'POST')?.body)
      .toEqual({ decision: 'REJECTED', reason: 'Hall under renovation' }));
  });

  it('explains a conflicting approval and refreshes the queue', async () => {
    const { calls } = stubApi(
      on('POST', '/api/venue-bookings/booking-2/decision',
        errorBody('VENUE_BOOKING_CONFLICT', 'The venue already has an approved booking in this period.'), 409),
      on('GET', '/api/venue-bookings', { items: [beta] }),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Hackathon' });
    await fireEvent.click(screen.getByRole('button', { name: 'Approve Grand Hall for Hackathon' }));
    expect(await screen.findByText('The venue already has an approved booking in this period.')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'GET')).toHaveLength(2);
  });

  it('switches status lists and shows an empty state', async () => {
    const { calls } = stubApi(on('GET', '/api/venue-bookings', { items: [] }));
    renderPage();
    expect(await screen.findByText('No booking requests are waiting for a decision')).toBeInTheDocument();
    await fireEvent.update(screen.getByLabelText('Show'), 'APPROVED');
    await waitFor(() => expect(calls.at(-1)!.url).toBe('/api/venue-bookings?status=APPROVED'));
    expect(await screen.findByText('No bookings with this status')).toBeInTheDocument();
  });

  it('keeps other roles out without calling the API and handles an expired session', async () => {
    session.user = { id: 'organiser-1', role: 'EVENT_ORGANISER' };
    const denied = stubApi();
    const first = renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Only venue staff can decide');
    expect(denied.calls).toHaveLength(0);
    first.unmount();

    session.user = { id: 'staff-1', role: 'VENUE_STAFF' };
    stubApi(on('GET', '/api/venue-bookings', errorBody('AUTHENTICATION_REQUIRED', 'Sign in.'), 401));
    renderPage();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
  });
});
