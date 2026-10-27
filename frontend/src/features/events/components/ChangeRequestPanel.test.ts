import { fireEvent, render, screen, within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import ChangeRequestPanel from './ChangeRequestPanel.vue';
import { apiError, stubApi } from './test-api';

const eventRequestId = 'event-one';
const base = `/api/events/${eventRequestId}/change-requests`;
const global = { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } };

const pending = {
  id: 'cr1', eventRequestId, status: 'PENDING', requestedById: 'olivia', requestedByName: 'Olivia',
  proposed: { expectedAttendance: 150, startsAt: '2026-12-01T02:00:00.000Z' },
  previous: { expectedAttendance: 120, startsAt: '2026-12-01T01:00:00.000Z' },
  baseRevision: 4, decidedById: null, decidedByName: null, decidedAt: null, decisionReason: null,
  appliedRevision: null, cancelledArrangements: null, createdAt: '2026-10-27T02:00:00.000Z',
  current: { expectedAttendance: 120, startsAt: '2026-12-01T01:00:00.000Z' }, outdated: false,
  impact: {
    affectedKinds: ['VENUE', 'EQUIPMENT', 'REGISTRATION'], confirmed: [],
    pending: [{ kind: 'VENUE_BOOKING', id: 'b1', label: 'Hall A', status: 'HELD', quantity: null }],
    activeRegistrations: 0, eventConfirmed: false, canApprove: true, blockedReason: null,
  },
};
const rejected = {
  ...pending, id: 'cr0', status: 'REJECTED', proposed: { purpose: 'New purpose' }, previous: { purpose: 'Old' },
  decidedById: 'casey', decidedByName: 'Casey', decidedAt: '2026-10-26T02:00:00.000Z', decisionReason: 'Too late.',
  current: undefined, outdated: undefined, impact: undefined,
};
const approved = {
  ...rejected, id: 'cr-2', status: 'APPROVED', decisionReason: null, appliedRevision: 6,
  cancelledArrangements: { venueBookings: ['b1'], equipmentRequests: ['e1'] },
};

const coordinatorProps = { eventRequestId, status: 'APPROVED', viewerRole: 'EVENT_COORDINATOR', revision: 5 };
const ownerProps = { eventRequestId, status: 'APPROVED', viewerRole: 'EVENT_ORGANISER', isOwner: true, revision: 5 };

describe('KAN-15 change request panel', () => {
  it('KAN-15-AC1 offers the owner a change request when nothing is pending', async () => {
    stubApi({ [`GET ${base}`]: { body: { items: [] } } });
    render(ChangeRequestPanel, { props: ownerProps, global });
    expect(await screen.findByText('No change has been requested.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a change' })).toHaveAttribute('href', '/events/event-one/change-request');
  });

  it('KAN-15-AC3/AC4 shows the coordinator current and requested values and the pending arrangements', async () => {
    stubApi({ [`GET ${base}`]: { body: { items: [pending, rejected] } } });
    render(ChangeRequestPanel, { props: coordinatorProps, global });
    const table = await screen.findByRole('table');
    const attendance = within(table).getByRole('row', { name: /Expected attendance/ });
    expect(within(attendance).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['120', '150']);
    expect(screen.getByRole('list', { name: 'Pending arrangements cancelled on approval' }))
      .toHaveTextContent('Venue booking at Hall A (held)');
    expect(screen.getByRole('button', { name: 'Approve and apply' })).toBeEnabled();
    expect(screen.getByText('Earlier change requests')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Too late.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Request a change' })).not.toBeInTheDocument();
  });

  it('KAN-15-AC6 approves with the displayed revision and emits changed', async () => {
    const api = stubApi({
      [`GET ${base}`]: { body: { items: [pending] } },
      [`POST ${base}/cr1/decision`]: { body: { ...pending, status: 'APPROVED' } },
    });
    const view = render(ChangeRequestPanel, { props: coordinatorProps, global });
    await fireEvent.click(await screen.findByRole('button', { name: 'Approve and apply' }));
    expect(await screen.findByText('The change was approved and applied to the event.')).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: `POST ${base}/cr1/decision`, body: { decision: 'APPROVED', expectedRevision: 5 } }]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('KAN-15-AC105 rejects only with a trimmed reason', async () => {
    const api = stubApi({
      [`GET ${base}`]: { body: { items: [pending] } },
      [`POST ${base}/cr1/decision`]: { body: { ...pending, status: 'REJECTED' } },
    });
    render(ChangeRequestPanel, { props: coordinatorProps, global });
    const reject = await screen.findByRole('button', { name: 'Reject change' });
    expect(reject).toBeDisabled();
    await fireEvent.update(screen.getByRole('textbox', { name: 'Reason for rejecting' }), '  Hall is full  ');
    await fireEvent.click(reject);
    expect(await screen.findByText('The change was rejected. The organiser has been told why.')).toBeInTheDocument();
    expect(api.writes()[0]!.body).toEqual({ decision: 'REJECTED', reason: 'Hall is full', expectedRevision: 5 });
  });

  it('KAN-15-AC103 explains why approval is blocked and disables it', async () => {
    stubApi({ [`GET ${base}`]: { body: { items: [{
      ...pending, impact: {
        ...pending.impact, pending: [], canApprove: false,
        confirmed: [{ kind: 'EQUIPMENT_REQUEST', id: 'e1', label: 'Microphone', status: 'RESERVED', quantity: 2 }],
        blockedReason: 'This change cannot be approved because it affects confirmed venue or equipment arrangements.',
      },
    }] } } });
    render(ChangeRequestPanel, { props: coordinatorProps, global });
    expect(await screen.findByText(/cannot be approved because it affects confirmed/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Confirmed arrangements affected' })).toHaveTextContent('2 × Microphone (reserved)');
    expect(screen.getByRole('button', { name: 'Approve and apply' })).toBeDisabled();
  });

  it('disables approval for an outdated request, and says when nothing is affected', async () => {
    stubApi({ [`GET ${base}`]: { body: { items: [{ ...pending, outdated: true, impact: { ...pending.impact, pending: [] } }] } } });
    render(ChangeRequestPanel, { props: coordinatorProps, global });
    expect(await screen.findByText(/changed after the change was requested/)).toBeInTheDocument();
    expect(screen.getByText('No existing arrangement is affected.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve and apply' })).toBeDisabled();
  });

  it('shows a server refusal from the decision', async () => {
    stubApi({
      [`GET ${base}`]: { body: { items: [pending] } },
      [`POST ${base}/cr1/decision`]: apiError(409, 'EVENT_REVISION_CONFLICT', 'This event request changed after you opened it.'),
    });
    render(ChangeRequestPanel, { props: coordinatorProps, global });
    await fireEvent.click(await screen.findByRole('button', { name: 'Approve and apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This event request changed after you opened it.');
  });

  it('lets the owner withdraw a pending request instead of starting another', async () => {
    const api = stubApi({
      [`GET ${base}`]: { body: { items: [pending, approved] } },
      [`POST ${base}/cr1/withdraw`]: { body: { ...pending, status: 'WITHDRAWN' } },
    });
    render(ChangeRequestPanel, { props: ownerProps, global });
    expect(await screen.findByText('The event keeps its current details until the coordinator approves the change.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Request a change' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve and apply' })).not.toBeInTheDocument();
    expect(screen.getByText('2 pending arrangements were cancelled for resubmission.')).toBeInTheDocument();
    api.set(`GET ${base}`, { body: { items: [{ ...pending, status: 'WITHDRAWN' }] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Withdraw change request' }));
    expect(await screen.findByText('Your change request was withdrawn.')).toBeInTheDocument();
    expect(await screen.findByText('Withdrawn')).toBeInTheDocument();
  });

  it('keeps history visible after the event ends and offers no new request', async () => {
    stubApi({ [`GET ${base}`]: { body: { items: [{ ...approved, cancelledArrangements: { venueBookings: ['b1'], equipmentRequests: [] } }] } } });
    render(ChangeRequestPanel, { props: { ...ownerProps, status: 'COMPLETED' }, global });
    expect(await screen.findByText('Approved and applied')).toBeInTheDocument();
    expect(screen.getByText('1 pending arrangement was cancelled for resubmission.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Request a change' })).not.toBeInTheDocument();
  });

  it('tells the owner a finished event can no longer be changed, and retries a failed load', async () => {
    const api = stubApi({ [`GET ${base}`]: apiError(500, 'INTERNAL_ERROR', 'Server unavailable.') });
    render(ChangeRequestPanel, { props: { ...ownerProps, status: 'CANCELLED' }, global });
    expect(await screen.findByText('Server unavailable.')).toBeInTheDocument();
    api.set(`GET ${base}`, { body: { items: [] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('This event can no longer be changed.')).toBeInTheDocument();
  });
});
