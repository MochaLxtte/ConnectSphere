import { fireEvent, render, screen, within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import ChangeRequestPanel from './ChangeRequestPanel.vue';
import { apiError, stubApi } from './test-api';

const eventRequestId = 'event-one';
const base = `/api/events/${eventRequestId}/change-requests`;
const pending = {
  id: 'ch1', eventRequestId, requestedById: 'olive', requestedByName: 'Olive', status: 'PENDING',
  proposedChanges: { expectedAttendance: 120, registrationRequired: true, startsAt: '2026-12-02T02:00:00.000Z' },
  reason: 'More sign-ups than planned.', decidedById: null, decidedByName: null, decidedAt: null,
  decisionReason: null, createdAt: '2026-09-15T02:00:00.000Z', updatedAt: '2026-09-15T02:00:00.000Z',
};
const ownerProps = { eventRequestId, status: 'APPROVED', viewerRole: 'EVENT_ORGANISER', isOwner: true };
const coordinatorProps = { eventRequestId, status: 'CONFIRMED', viewerRole: 'EVENT_COORDINATOR' };

describe('CF-19 change request panel', () => {
  it('submits only the fields the organiser filled in', async () => {
    const api = stubApi({
      [`GET ${base}`]: { body: { items: [] } },
      [`POST ${base}`]: { status: 201, body: { changeRequestId: 'ch1', eventRequestId, status: 'PENDING' } },
    });
    const view = render(ChangeRequestPanel, { props: ownerProps });
    expect(await screen.findByText('No changes have been requested.')).toBeInTheDocument();

    await fireEvent.update(screen.getByRole('textbox', { name: 'Event name' }), '  Open day 2.0 ');
    await fireEvent.update(screen.getByRole('spinbutton', { name: 'Expected attendance' }), '120');
    await fireEvent.update(screen.getByRole('combobox', { name: 'Registration required' }), 'false');
    await fireEvent.update(screen.getByRole('textbox', { name: 'Why is this change needed?' }), ' More sign-ups. ');
    api.set(`GET ${base}`, { body: { items: [pending] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Submit change request' }));

    expect(await screen.findByText('Your change request was sent to the coordinator.')).toBeInTheDocument();
    expect(api.writes()).toEqual([{
      key: `POST ${base}`,
      body: {
        proposedChanges: { name: 'Open day 2.0', expectedAttendance: 120, registrationRequired: false },
        reason: 'More sign-ups.',
      },
    }]);
    expect(view.emitted('changed')).toHaveLength(1);
    // With a pending request the form is replaced by a notice and a withdraw action.
    expect(await screen.findByText(/awaiting a decision\. Withdraw it/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit change request' })).not.toBeInTheDocument();
  });

  it('validates the proposal before calling the API', async () => {
    const api = stubApi({ [`GET ${base}`]: { body: { items: [] } } });
    render(ChangeRequestPanel, { props: ownerProps });
    const submit = await screen.findByRole('button', { name: 'Submit change request' });

    await fireEvent.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('Explain why the change is needed.');
    await fireEvent.update(screen.getByRole('textbox', { name: 'Why is this change needed?' }), 'Reason');
    await fireEvent.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('Fill in at least one field');
    await fireEvent.update(screen.getByLabelText('Starts'), '2026-12-02T10:00');
    await fireEvent.update(screen.getByLabelText('Ends'), '2026-12-02T09:00');
    await fireEvent.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('The event must end after it starts.');
    expect(api.writes()).toEqual([]);
  });

  it('lets the owner withdraw a pending request', async () => {
    const api = stubApi({
      [`GET ${base}`]: { body: { items: [pending] } },
      [`POST ${base}/ch1/withdraw`]: { body: { changeRequestId: 'ch1', eventRequestId, status: 'WITHDRAWN' } },
    });
    const view = render(ChangeRequestPanel, { props: ownerProps });
    const changes = await screen.findByRole('list', { name: 'Proposed changes from Olive' });
    expect(within(changes).getByText(/Expected attendance/).parentElement).toHaveTextContent('Expected attendance: 120');
    expect(within(changes).getByText(/Registration required/).parentElement).toHaveTextContent('Yes');
    expect(screen.queryByRole('button', { name: 'Approve and apply' })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Withdraw request' }));
    expect(await screen.findByText('The change request was withdrawn.')).toBeInTheDocument();
    expect(api.writes().map((call) => call.key)).toEqual([`POST ${base}/ch1/withdraw`]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it.each([
    ['Approve and apply', 'APPROVED', 'The changes were approved and applied to the event.'],
    ['Reject changes', 'REJECTED', 'The change request was rejected.'],
  ] as const)('lets the coordinator use "%s"', async (button, decision, message) => {
    const api = stubApi({
      [`GET ${base}`]: { body: { items: [pending] } },
      [`POST ${base}/ch1/decision`]: { body: { changeRequestId: 'ch1', eventRequestId, status: decision, eventStatus: 'APPROVED', cancelledVenueBookings: 1, cancelledEquipmentRequests: 0 } },
    });
    const view = render(ChangeRequestPanel, { props: coordinatorProps });
    await fireEvent.update(await screen.findByRole('textbox', { name: /Decision reason/ }), '  Checked.  ');
    expect(screen.queryByRole('button', { name: 'Withdraw request' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit change request' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: button }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: `POST ${base}/ch1/decision`, body: { decision, reason: 'Checked.' } }]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('reports a decision conflict without emitting changed', async () => {
    stubApi({
      [`GET ${base}`]: { body: { items: [pending] } },
      [`POST ${base}/ch1/decision`]: apiError(409, 'CHANGE_REQUEST_NOT_PENDING', 'This change request has already been closed.'),
    });
    const view = render(ChangeRequestPanel, { props: coordinatorProps });
    await fireEvent.click(await screen.findByRole('button', { name: 'Reject changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already been closed');
    expect(view.emitted('changed')).toBeUndefined();
  });

  it('explains when changes cannot be requested yet', async () => {
    stubApi({ [`GET ${base}`]: { body: { items: [] } } });
    render(ChangeRequestPanel, { props: { ...ownerProps, status: 'SUBMITTED' } });
    expect(await screen.findByText(/once the event is approved or confirmed/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit change request' })).not.toBeInTheDocument();
  });
});
