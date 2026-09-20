import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import AssignmentPanel from './AssignmentPanel.vue';
import { apiError, stubApi } from './test-api';

const eventRequestId = 'event-one';
const base = `/api/events/${eventRequestId}`;
const coordinators = { body: { items: [
  { id: 'casey', displayName: 'Casey', email: 'casey@example.test' },
  { id: 'blair', displayName: 'Blair', email: 'blair@example.test' },
] } };
const active = {
  id: 'a1', coordinatorId: 'casey', coordinatorName: 'Casey', assignedById: 'casey', assignedByName: 'Casey',
  note: 'Picked up from the queue.', assignedAt: '2026-09-15T02:00:00.000Z', unassignedAt: null,
};

function renderPanel(props: Partial<{ status: string; viewerRole: string; isOwner: boolean }> = {}) {
  return render(AssignmentPanel, {
    props: { eventRequestId, status: 'SUBMITTED', viewerRole: 'EVENT_COORDINATOR', ...props },
  });
}

describe('CF-05 assignment panel', () => {
  it('lets a coordinator hand over to a colleague, then reports success and emits changed', async () => {
    const api = stubApi({
      [`GET ${base}/assignments`]: { body: { items: [active] } },
      'GET /api/events/coordinators': coordinators,
      [`PUT ${base}/coordinator`]: { body: { eventRequestId, assignmentId: 'a2', coordinatorId: 'blair', previousCoordinatorId: 'casey' } },
    });
    const view = renderPanel();

    expect(await screen.findByText('Picked up from the queue.')).toBeInTheDocument();
    const select = await screen.findByRole('combobox', { name: 'Hand over to' });
    await waitFor(() => expect(screen.getByRole('option', { name: /Blair/ })).toBeInTheDocument());
    // The current coordinator is not offered as a target.
    expect(screen.queryByRole('option', { name: /Casey/ })).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Reassign coordinator' });
    expect(button).toBeDisabled();

    await fireEvent.update(select, 'blair');
    await fireEvent.update(screen.getByRole('textbox', { name: /Note/ }), '  On leave next week.  ');
    await fireEvent.click(button);

    expect(await screen.findByText('Blair is now the coordinator for this request.')).toBeInTheDocument();
    expect(api.writes()).toEqual([{
      key: `PUT ${base}/coordinator`, body: { coordinatorId: 'blair', note: 'On leave next week.' },
    }]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('keeps the success message when the previous coordinator loses access to the history', async () => {
    const api = stubApi({
      [`GET ${base}/assignments`]: { body: { items: [active] } },
      'GET /api/events/coordinators': coordinators,
      [`PUT ${base}/coordinator`]: { body: {} },
    });
    renderPanel();
    await fireEvent.update(await screen.findByRole('combobox'), 'blair');
    api.set(`GET ${base}/assignments`, apiError(404, 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.'));
    await fireEvent.click(screen.getByRole('button', { name: 'Reassign coordinator' }));
    expect(await screen.findByText(/Blair is now the coordinator/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the server explanation and keeps the form when the assignment is refused', async () => {
    stubApi({
      [`GET ${base}/assignments`]: { body: { items: [] } },
      'GET /api/events/coordinators': coordinators,
      [`PUT ${base}/coordinator`]: apiError(409, 'ASSIGNMENT_NOT_ALLOWED', 'A closed event request cannot be assigned.'),
    });
    const view = renderPanel();
    expect(await screen.findByText('No coordinator has been assigned yet.')).toBeInTheDocument();
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Assign to' }), 'casey');
    await fireEvent.click(screen.getByRole('button', { name: 'Assign coordinator' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A closed event request cannot be assigned.');
    expect(screen.getByRole('combobox')).toHaveValue('casey');
    expect(view.emitted('changed')).toBeUndefined();
  });

  it.each([
    ['an organiser', { viewerRole: 'EVENT_ORGANISER', isOwner: true }],
    ['a closed request', { status: 'CANCELLED' }],
  ])('is read-only for %s', async (_name, props) => {
    const api = stubApi({ [`GET ${base}/assignments`]: { body: { items: [active] } } });
    renderPanel(props);
    expect(await screen.findByText('Assignment history')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([`GET ${base}/assignments`]);
  });

  it('offers a retry when the history cannot be loaded', async () => {
    const api = stubApi({
      [`GET ${base}/assignments`]: apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'),
    });
    renderPanel({ viewerRole: 'EVENT_ORGANISER', isOwner: true });
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    api.set(`GET ${base}/assignments`, { body: { items: [] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No coordinator has been assigned yet.')).toBeInTheDocument();
  });
});
