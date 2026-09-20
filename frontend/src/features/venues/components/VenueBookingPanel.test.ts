import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { VenueBooking } from '../api/venue-bookings';
import type { Venue } from '../api/venues';
import { errorBody, on, stubApi } from '../test-helpers';
import VenueBookingPanel from './VenueBookingPanel.vue';

vi.mock('../../auth/session.js', () => ({ clearLocalSession: vi.fn() }));

const hall: Venue = {
  id: 'venue-1', name: 'Grand Hall', description: null, location: 'Block A', capacity: 300,
  layouts: ['Theatre', 'Banquet'], facilities: [], accessibilityFeatures: [], wheelchairAccessible: true,
  opensAt: '08:00', closesAt: '22:00', isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
};
const booking: VenueBooking = {
  id: 'booking-1', eventRequestId: 'event-1', venueId: 'venue-1', venueName: 'Grand Hall', requestedBy: 'organiser-1',
  status: 'PENDING', startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T04:00:00.000Z', layout: null, notes: null,
  decidedBy: null, decidedAt: null, decisionReason: null,
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
};
const capacityWarning = { code: 'CAPACITY' as const, passed: false, message: 'Capacity 300 is below the expected attendance of 500.' };
const unsuitable = { suitable: false, checks: [{ code: 'ACTIVE' as const, passed: true, message: 'The venue is open for bookings.' }, capacityWarning] };

function renderPanel(props: Partial<{ status: string; viewerRole: string; isOwner: boolean }> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  });
  return render(VenueBookingPanel, {
    props: { eventRequestId: 'event-1', status: 'APPROVED', viewerRole: 'EVENT_ORGANISER', isOwner: true, ...props },
    global: { plugins: [router] },
  });
}

describe('CF-11/CF-12 venue booking panel', () => {
  it('lists the event\'s bookings with their status and decision reason', async () => {
    const { calls } = stubApi(on('GET', '/api/venue-bookings', {
      items: [{ ...booking, status: 'REJECTED', decisionReason: 'Hall under renovation', decidedAt: '2026-11-02T01:00:00.000Z' }],
    }));
    renderPanel();
    expect(await screen.findByRole('link', { name: 'Grand Hall' })).toHaveAttribute('href', '/venues/venue-1');
    expect(calls[0]!.url).toBe('/api/venue-bookings?eventRequestId=event-1');
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Reason: Hall under renovation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel the Grand Hall booking/ })).not.toBeInTheDocument();
  });

  it('shows the suitability result for the chosen venue, then requests it and reports the warnings', async () => {
    let items: VenueBooking[] = [];
    const { calls } = stubApi(
      on('GET', '/api/venue-bookings', () => ({ body: { items } })),
      on('GET', '/api/venues/venue-1/suitability', unsuitable),
      on('GET', '/api/venues', { items: [hall] }),
      on('POST', '/api/venue-bookings', () => {
        items = [booking];
        return { status: 201, body: { ...booking, suitability: unsuitable, warnings: [capacityWarning] } };
      }),
    );
    const view = renderPanel();
    expect(await screen.findByText('No venue has been requested for this event yet.')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Request a venue' }));
    await fireEvent.update(await screen.findByLabelText('Venue'), 'venue-1');

    expect(await screen.findByText('This venue may not suit the event')).toBeInTheDocument();
    expect(screen.getByText(capacityWarning.message)).toBeInTheDocument();
    expect(calls.some((call) => call.url === '/api/venues/venue-1/suitability?eventRequestId=event-1')).toBe(true);

    await fireEvent.update(screen.getByLabelText('Layout (optional)'), 'Banquet');
    await fireEvent.update(screen.getByLabelText('Notes for venue staff (optional)'), ' Setup from 8am ');
    await fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));

    expect(await screen.findByText('Your request for Grand Hall was sent to venue staff.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({
      eventRequestId: 'event-1', venueId: 'venue-1', layout: 'Banquet', notes: 'Setup from 8am',
    });
    const sent = screen.getByText('Your request for Grand Hall was sent to venue staff.').closest('[role="status"]') as HTMLElement;
    expect(within(sent).getByText(capacityWarning.message)).toBeInTheDocument();
    expect(await screen.findByText('Pending decision')).toBeInTheDocument();
    expect(view.emitted().changed).toHaveLength(1);
  });

  it('sends a custom period in Singapore time and surfaces a duplicate-request conflict', async () => {
    const { calls } = stubApi(
      on('GET', '/api/venue-bookings', { items: [] }),
      on('GET', '/api/venues/venue-1/suitability', { suitable: true, checks: [] }),
      on('GET', '/api/venues', { items: [hall] }),
      on('POST', '/api/venue-bookings', errorBody('VENUE_BOOKING_DUPLICATE', 'This event already has a pending or approved booking for this venue in this period.'), 409),
    );
    const view = renderPanel({ viewerRole: 'EVENT_COORDINATOR', isOwner: false });
    await fireEvent.click(await screen.findByRole('button', { name: 'Request a venue' }));
    await fireEvent.update(await screen.findByLabelText('Venue'), 'venue-1');
    await fireEvent.click(screen.getByLabelText(/Book a different period/));
    await fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter when the booking starts and ends.');

    await fireEvent.update(screen.getByLabelText('Booking starts'), '2026-12-01T08:00');
    await fireEvent.update(screen.getByLabelText('Booking ends'), '2026-12-01T12:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already has a pending or approved booking');
    expect(calls.find((call) => call.method === 'POST')!.body).toMatchObject({
      startsAt: '2026-12-01T00:00:00.000Z', endsAt: '2026-12-01T04:00:00.000Z',
    });
    expect(view.emitted().changed).toBeUndefined();
  });

  it('cancels a booking only after confirmation', async () => {
    let items: VenueBooking[] = [{ ...booking, status: 'APPROVED' }];
    const { calls } = stubApi(
      on('POST', '/api/venue-bookings/booking-1/cancel', () => {
        items = [{ ...booking, status: 'CANCELLED' }];
        return { body: items[0] };
      }),
      on('GET', '/api/venue-bookings', () => ({ body: { items } })),
    );
    const view = renderPanel();
    await fireEvent.click(await screen.findByRole('button', { name: 'Cancel the Grand Hall booking' }));
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
    await fireEvent.click(screen.getByRole('button', { name: 'Keep booking' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel the Grand Hall booking' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel booking' }));
    expect(await screen.findByText('The Grand Hall booking was cancelled.')).toBeInTheDocument();
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(view.emitted().changed).toHaveLength(1);
  });

  it('does not offer requests before approval, and renders nothing for roles that cannot arrange venues', async () => {
    const pending = stubApi(on('GET', '/api/venue-bookings', { items: [] }));
    const first = renderPanel({ status: 'SUBMITTED' });
    expect(await screen.findByText('Venues can be requested once the event request is approved.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request a venue' })).not.toBeInTheDocument();
    expect(pending.calls).toHaveLength(1);
    first.unmount();

    for (const props of [{ viewerRole: 'VENUE_STAFF' }, { viewerRole: 'ATTENDEE' }, { viewerRole: 'EVENT_ORGANISER', isOwner: false }]) {
      const hidden = stubApi();
      const view = renderPanel(props);
      expect(screen.queryByRole('heading', { name: 'Venue bookings' })).not.toBeInTheDocument();
      expect(hidden.calls).toHaveLength(0);
      view.unmount();
    }
  });

  it('shows a retryable error when bookings cannot be loaded', async () => {
    let attempts = 0;
    stubApi(on('GET', '/api/venue-bookings', () => (attempts++ === 0
      ? { status: 500, body: errorBody('INTERNAL_ERROR', 'Unexpected.') } : { body: { items: [] } })));
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load venue bookings');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled());
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No venue has been requested for this event yet.')).toBeInTheDocument();
  });
});
