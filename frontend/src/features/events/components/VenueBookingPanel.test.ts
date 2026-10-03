import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import VenueBookingPanel from './VenueBookingPanel.vue';
import type { VenueBooking } from '../../venues/api/venue-bookings';
import { apiError, stubApi } from './test-api';

const eventRequestId = 'event-one';
const base = `/api/events/${eventRequestId}`;
const venues = { body: { items: [
  { id: 'hall', name: 'Main Hall', description: null, location: null, capacity: 200, layouts: [], facilities: [],
    accessibilityFeatures: [], wheelchairAccessible: false, opensAt: null, closesAt: null, updatedAt: '2026-09-01T00:00:00.000Z' },
] } };
const pending: VenueBooking = {
  id: 'b1', eventRequestId, eventName: 'Open day', eventStatus: 'APPROVED', venueId: 'hall', venueName: 'Main Hall',
  status: 'PENDING', startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
  layout: 'Theatre', notes: 'Projector required', decidedBy: null, decidedAt: null, decisionReason: null,
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  eventStartsAt: null, eventEndsAt: null, purpose: null, description: null, expectedAttendance: null,
  venueRequirements: null, accessibilityNeeds: null,
};

const coordinatorProps = { eventRequestId, status: 'APPROVED', viewerRole: 'EVENT_COORDINATOR' };

async function fillAndSubmit() {
  await fireEvent.update(await screen.findByRole('combobox', { name: 'Venue' }), 'hall');
  await fireEvent.update(screen.getByLabelText('Starts (Singapore time)'), '2026-12-01T10:00');
  await fireEvent.update(screen.getByLabelText('Ends (Singapore time)'), '2026-12-01T14:00');
  await fireEvent.click(screen.getByRole('button', { name: 'Request this venue' }));
}

describe('KAN-53 venue booking request panel', () => {
  it('lets the coordinator submit a request and shows it after reload', async () => {
    const api = stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: { status: 201, body: { booking: pending } },
    });
    const view = render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByText('No venue has been requested for this event yet.')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Request this venue' });
    expect(submit).toBeDisabled();

    api.set(`GET /api/venue-bookings?eventRequestId=${eventRequestId}`, { body: { items: [pending] } });
    await fillAndSubmit();

    expect(await screen.findByText('A venue booking request for Main Hall was submitted for review.')).toBeInTheDocument();
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.getAllByText('Main Hall').length).toBeGreaterThan(0);
    expect(api.writes()).toEqual([{
      key: `POST ${base}/venue-bookings`,
      body: { venueId: 'hall', startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z', layout: null, notes: null },
    }]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('shows a validation error when the end time is not after the start time', async () => {
    stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } },
      'GET /api/venues/search-venues': venues,
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Venue' }), 'hall');
    await fireEvent.update(screen.getByLabelText('Starts (Singapore time)'), '2026-12-01T10:00');
    await fireEvent.update(screen.getByLabelText('Ends (Singapore time)'), '2026-12-01T09:00');
    expect(await screen.findByRole('alert')).toHaveTextContent('The end time must be after the start time.');
    expect(screen.getByRole('button', { name: 'Request this venue' })).toBeDisabled();
  });

  it('shows a server refusal without emitting changed', async () => {
    stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: apiError(409, 'EVENT_NOT_ELIGIBLE', 'A venue booking cannot be requested for this event.'),
    });
    const view = render(VenueBookingPanel, { props: coordinatorProps });
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('A venue booking cannot be requested for this event.');
    expect(view.emitted('changed')).toBeUndefined();
  });

  it('lists existing requests with their decision outcome for the owning organiser', async () => {
    const decided: VenueBooking = { ...pending, status: 'REJECTED', decidedBy: 'staff', decisionReason: 'No capacity.' };
    const api = stubApi({ [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [decided] } } });
    render(VenueBookingPanel, { props: { eventRequestId, status: 'APPROVED', viewerRole: 'EVENT_ORGANISER', isOwner: true } });
    expect(await screen.findByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Decision note: No capacity.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]);
  });

  it.each(['REJECTED', 'CANCELLED', 'COMPLETED'])('is read-only for a coordinator once the event is %s', async (status) => {
    const api = stubApi({ [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } } });
    render(VenueBookingPanel, { props: { ...coordinatorProps, status } });
    await screen.findByText('No venue has been requested for this event yet.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]);
  });

  it('offers a read retry without exposing the request form when the list cannot be loaded', async () => {
    const api = stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'),
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    api.set(`GET /api/venue-bookings?eventRequestId=${eventRequestId}`, { body: { items: [] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('No venue has been requested for this event yet.')).toBeInTheDocument());
  });
});
