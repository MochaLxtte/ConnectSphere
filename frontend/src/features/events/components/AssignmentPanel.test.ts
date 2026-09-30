import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import AssignmentPanel from './AssignmentPanel.vue';
import type { AssignmentRecord } from '../api/assignments';
import { apiError, stubApi } from './test-api';

const eventRequestId = 'event-one';
const base = `/api/events/${eventRequestId}`;
const coordinators = { body: { items: [
  { id: 'casey', displayName: 'Casey', email: 'casey@example.test' },
  { id: 'blair', displayName: 'Blair', email: 'blair@example.test' },
] } };
const active: AssignmentRecord = {
  id: 'a1', coordinatorId: 'casey', coordinatorName: 'Casey', assignedById: 'casey', assignedByName: 'Casey',
  assignmentMethod: 'MANUAL',
  note: 'Picked up from the queue.', assignedAt: '2026-09-15T02:00:00.000Z', unassignedAt: null,
};

function renderPanel(props: Partial<{
  status: string; viewerRole: string; isOwner: boolean; currentCoordinatorId: string | null;
}> = {}) {
  return render(AssignmentPanel, {
    props: { eventRequestId, status: 'SUBMITTED', viewerRole: 'EVENT_COORDINATOR', currentCoordinatorId: null, ...props },
  });
}

describe('CF-05 initial assignment and history panel', () => {
  it.each([['casey', 'Casey'], ['blair', 'Blair']])('initially assigns an unassigned request to %s', async (coordinatorId, name) => {
    const api = stubApi({
      [`GET ${base}/assignments`]: { body: { items: [] } },
      'GET /api/events/coordinators': coordinators,
      [`PUT ${base}/coordinator`]: { body: { eventRequestId, assignmentId: 'a1', coordinatorId, previousCoordinatorId: null } },
    });
    const view = renderPanel();
    const select = await screen.findByRole('combobox', { name: 'Assign to' });
    await waitFor(() => expect(screen.getByRole('option', { name: /Blair/ })).toBeInTheDocument());
    expect(screen.getByRole('option', { name: /Casey/ })).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Assign coordinator' });
    expect(button).toBeDisabled();
    await fireEvent.update(select, coordinatorId);
    await fireEvent.update(screen.getByRole('textbox', { name: /Note/ }), '  Picked up from the queue.  ');
    api.set(`GET ${base}/assignments`, { body: { items: [{ ...active, coordinatorId, coordinatorName: name }] } });
    await fireEvent.click(button);
    expect(await screen.findByText(`${name} is now the coordinator for this request.`)).toBeInTheDocument();
    expect(api.writes()).toEqual([{
      key: `PUT ${base}/coordinator`, body: { coordinatorId, note: 'Picked up from the queue.' },
    }]);
    expect(view.emitted('changed')).toHaveLength(1);
    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
  });

  it('reports a server refusal when the request was assigned after the form loaded', async () => {
    stubApi({
      [`GET ${base}/assignments`]: { body: { items: [] } },
      'GET /api/events/coordinators': coordinators,
      [`PUT ${base}/coordinator`]: apiError(409, 'REASSIGNMENT_NOT_AVAILABLE', 'This request already has a coordinator.'),
    });
    const view = renderPanel();
    const select = await screen.findByRole('combobox', { name: 'Assign to' });
    await waitFor(() => expect(screen.getByRole('option', { name: /Casey/ })).toBeInTheDocument());
    await fireEvent.update(select, 'casey');
    await fireEvent.click(screen.getByRole('button', { name: 'Assign coordinator' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This request already has a coordinator.');
    expect(view.emitted('changed')).toBeUndefined();
  });

  it.each([
    ['an organiser', { viewerRole: 'EVENT_ORGANISER', isOwner: true }] as const,
    ...['DRAFT', 'REJECTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].map((status) => [status, { status }] as const),
  ])('is read-only for %s', async (_name, props) => {
    const api = stubApi({ [`GET ${base}/assignments`]: { body: { items: [] } } });
    renderPanel(props);
    await screen.findByText('No coordinator has been assigned yet.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([`GET ${base}/assignments`]);
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR'])(
    'KAN-29 shows automatic assignment read-only to %s without inventing an actor', async (viewerRole) => {
      const automatic: AssignmentRecord = {
        ...active, assignmentMethod: 'AUTOMATIC', assignedById: null, assignedByName: null, note: null,
      };
      const api = stubApi({ [`GET ${base}/assignments`]: { body: { items: [automatic] } } });
      renderPanel({ viewerRole, isOwner: viewerRole === 'EVENT_ORGANISER', currentCoordinatorId: 'casey' });
      expect(await screen.findByText(/is coordinating this request/)).toHaveTextContent('Casey is coordinating this request');
      expect(screen.getByText(/Assigned automatically on/)).toHaveTextContent(/15 Sept? 2026/);
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.queryByText(/Assigned by/)).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /assign coordinator/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Hand over/)).not.toBeInTheDocument();
      expect(api.calls.map((call) => call.key)).toEqual([`GET ${base}/assignments`]);
      expect(api.writes()).toEqual([]);
    },
  );

  it('blocks handover when the request is assigned but history is empty', async () => {
    const api = stubApi({ [`GET ${base}/assignments`]: { body: { items: [] } } });
    renderPanel({ currentCoordinatorId: 'casey' });
    await screen.findByText('A coordinator is assigned to this request. Assignment history is unavailable.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('No coordinator has been assigned yet.')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([`GET ${base}/assignments`]);
  });

  it('blocks handover from current history when the host still reports an unassigned request', async () => {
    const api = stubApi({ [`GET ${base}/assignments`]: { body: { items: [active] } } });
    renderPanel();
    await screen.findByText('Picked up from the queue.');
    expect(screen.getByText(/Assigned by Casey on/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([`GET ${base}/assignments`]);
  });

  it('offers a read retry without exposing assignment when history cannot be loaded', async () => {
    const api = stubApi({ [`GET ${base}/assignments`]: apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.') });
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([`GET ${base}/assignments`]);
    api.set(`GET ${base}/assignments`, { body: { items: [active] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Picked up from the queue.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(api.writes()).toEqual([]);
  });
});
