import { fireEvent, render, screen, within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import LifecyclePanel from './LifecyclePanel.vue';
import { apiError, stubApi } from './test-api';

const eventRequestId = 'event-one';
const base = `/api/events/${eventRequestId}`;
const history = { body: { items: [
  { id: 'h1', fromStatus: null, toStatus: 'DRAFT', changedById: null, changedByName: null, createdAt: '2026-09-01T02:00:00.000Z' },
  { id: 'h2', fromStatus: 'DRAFT', toStatus: 'SUBMITTED', changedById: 'olive', changedByName: 'Olive', createdAt: '2026-09-02T02:00:00.000Z' },
  { id: 'h3', fromStatus: 'SUBMITTED', toStatus: 'APPROVED', changedById: 'casey', changedByName: 'Casey', createdAt: '2026-09-03T02:00:00.000Z' },
] } };
const coordinator = { eventRequestId, status: 'APPROVED', viewerRole: 'EVENT_COORDINATOR' };
const owner = { eventRequestId, status: 'APPROVED', viewerRole: 'EVENT_ORGANISER', isOwner: true };

describe('CF-06 lifecycle panel', () => {
  it('shows the status history as an ordered timeline with actors', async () => {
    stubApi({ [`GET ${base}/history`]: history });
    render(LifecyclePanel, { props: owner });
    const items = within(await screen.findByRole('list', { name: 'Status history' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Draft');
    expect(items[2]).toHaveTextContent('Approved');
    expect(items[2]).toHaveTextContent('from Submitted');
    expect(items[2]).toHaveTextContent('Casey');
  });

  it('lets the coordinator confirm an approved event', async () => {
    const api = stubApi({
      [`GET ${base}/history`]: history,
      [`POST ${base}/confirm`]: { body: { eventRequestId, status: 'CONFIRMED' } },
    });
    const view = render(LifecyclePanel, { props: coordinator });
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm event' }));
    expect(await screen.findByText('The event is confirmed.')).toBeInTheDocument();
    expect(api.writes().map((call) => call.key)).toEqual([`POST ${base}/confirm`]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('explains why confirmation was refused', async () => {
    stubApi({
      [`GET ${base}/history`]: history,
      [`POST ${base}/confirm`]: apiError(409, 'VENUE_BOOKING_REQUIRED', 'An approved venue booking is required before the event can be confirmed.'),
    });
    const view = render(LifecyclePanel, { props: coordinator });
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm event' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('approved venue booking is required');
    expect(screen.getByRole('button', { name: 'Confirm event' })).toBeEnabled();
    expect(view.emitted('changed')).toBeUndefined();
  });

  it('requires a reason and an explicit second step to cancel', async () => {
    const api = stubApi({
      [`GET ${base}/history`]: history,
      [`POST ${base}/cancel`]: { body: { eventRequestId, status: 'CANCELLED', cancelledVenueBookings: 1, cancelledEquipmentRequests: 0, notifiedAttendees: 3 } },
    });
    const view = render(LifecyclePanel, { props: owner });
    expect(screen.queryByRole('button', { name: 'Confirm event' })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Cancel event…' }));
    const submit = screen.getByRole('button', { name: 'Cancel this event' });
    expect(submit).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Keep event' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(api.writes()).toEqual([]);

    await fireEvent.click(screen.getByRole('button', { name: 'Cancel event…' }));
    await fireEvent.update(screen.getByRole('textbox', { name: 'Reason for cancelling' }), '  Speaker unavailable. ');
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel this event' }));
    expect(await screen.findByText(/The event was cancelled/)).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: `POST ${base}/cancel`, body: { reason: 'Speaker unavailable.' } }]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('offers completion only to the coordinator of a confirmed event', async () => {
    const api = stubApi({
      [`GET ${base}/history`]: history,
      [`POST ${base}/complete`]: apiError(409, 'EVENT_NOT_ENDED', 'The event can be completed once its end time has passed.'),
    });
    const view = render(LifecyclePanel, { props: { ...coordinator, status: 'CONFIRMED' } });
    expect(screen.queryByRole('button', { name: 'Confirm event' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Mark as completed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('once its end time has passed');

    api.set(`POST ${base}/complete`, { body: { eventRequestId, status: 'COMPLETED' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Mark as completed' }));
    expect(await screen.findByText('The event was marked as completed.')).toBeInTheDocument();
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it.each(['DRAFT', 'REJECTED', 'CANCELLED', 'COMPLETED'])('offers no actions for a %s request', async (status) => {
    stubApi({ [`GET ${base}/history`]: history });
    render(LifecyclePanel, { props: { ...owner, status } });
    await screen.findByRole('list', { name: 'Status history' });
    expect(screen.queryAllByRole('button')).toEqual([]);
  });

  it('offers no actions to a non-owner organiser', async () => {
    stubApi({ [`GET ${base}/history`]: history });
    render(LifecyclePanel, { props: { ...owner, isOwner: false } });
    await screen.findByRole('list', { name: 'Status history' });
    expect(screen.queryAllByRole('button')).toEqual([]);
  });
});
