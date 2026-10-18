import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { apiError, stubApi } from '../../events/components/test-api';
import UnassignedRequestsPage from './UnassignedRequestsPage.vue';

vi.mock('../../auth/session', () => ({
  authSession: { user: { id: 'casey', email: 'casey@example.test', displayName: 'Casey', role: 'EVENT_COORDINATOR_LEAD' }, loading: false },
}));

const coordinators = { body: { items: [
  { id: 'blair', displayName: 'Blair', email: 'blair@example.test' },
  { id: 'casey', displayName: 'Casey', email: 'casey@example.test' },
] } };
const items = [
  { id: 'a', name: 'Career fair', status: 'SUBMITTED', organiserName: 'Olive', startsAt: '2026-12-01T02:00:00.000Z',
    endsAt: '2026-12-01T06:00:00.000Z', expectedAttendance: 200, updatedAt: '2026-09-07T00:00:00.000Z' },
  { id: 'b', name: null, status: 'APPROVED', organiserName: 'Omar', startsAt: null, endsAt: null,
    expectedAttendance: null, updatedAt: '2026-09-08T00:00:00.000Z' },
];

function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: UnassignedRequestsPage }],
  });
  return render(UnassignedRequestsPage, { global: { plugins: [router] } });
}

describe('KAN-79 Lead assignment queue', () => {
  it('requires an explicit available coordinator and removes the assigned queue row', async () => {
    const api = stubApi({
      'GET /api/events/unassigned': { body: { items } },
      'GET /api/events/coordinators': coordinators,
      'PUT /api/events/a/coordinator': { body: { eventRequestId: 'a', assignmentId: 'x', coordinatorId: 'casey', previousCoordinatorId: null } },
    });
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(await screen.findByText('Career fair')).toBeInTheDocument();
    expect(screen.getByText('Untitled event request')).toBeInTheDocument();
    expect(screen.getByText(/Submitted · Olive/)).toHaveTextContent('200 expected');
    const select = screen.getByRole('combobox', { name: 'Coordinator for Career fair' });
    expect(select).toHaveValue('');
    expect(screen.getAllByRole('button', { name: 'Assign' })[0]).toBeDisabled();
    await fireEvent.update(select, 'casey');

    await fireEvent.click(screen.getAllByRole('button', { name: 'Assign' })[0]!);
    expect(await screen.findByText(/is now assigned to Casey/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open allocation' })).toHaveAttribute('href', '/lead/oversight/a');
    expect(api.writes()).toEqual([{ key: 'PUT /api/events/a/coordinator', body: { coordinatorId: 'casey' } }]);
    expect(screen.queryByRole('combobox', { name: 'Coordinator for Career fair' })).not.toBeInTheDocument();
    expect(screen.getByText('Untitled event request')).toBeInTheDocument();
  });

  it('assigns to an available coordinator and retains Lead oversight', async () => {
    const api = stubApi({
      'GET /api/events/unassigned': { body: { items } },
      'GET /api/events/coordinators': coordinators,
      'PUT /api/events/a/coordinator': { body: {} },
    });
    renderPage();
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Coordinator for Career fair' }), 'blair');
    await fireEvent.click(screen.getAllByRole('button', { name: 'Assign' })[0]!);
    expect(await screen.findByText(/is now assigned to Blair/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open allocation' })).toHaveAttribute('href', '/lead/oversight/a');
    expect(api.writes()[0]!.body).toEqual({ coordinatorId: 'blair' });
  });

  it('refreshes the queue when another Lead assigned the request first', async () => {
    const api = stubApi({
      'GET /api/events/unassigned': { body: { items } },
      'GET /api/events/coordinators': coordinators,
      'PUT /api/events/a/coordinator': apiError(409, 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.'),
    });
    renderPage();
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Coordinator for Career fair' }), 'casey');
    api.set('GET /api/events/unassigned', { body: { items: [] } });
    await fireEvent.click(screen.getAllByRole('button', { name: 'Assign' })[0]!);
    expect(await screen.findByText(/assigned by another Lead/)).toBeInTheDocument();
    expect(screen.queryByText('Career fair')).not.toBeInTheDocument();
  });

  it('shows an empty state, and a retryable error when loading fails', async () => {
    const api = stubApi({
      'GET /api/events/unassigned': apiError(403, 'ACTION_FORBIDDEN', 'Your role cannot perform this action.'),
      'GET /api/events/coordinators': coordinators,
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Your role cannot perform this action.');
    api.set('GET /api/events/unassigned', { body: { items: [] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No requests are awaiting assignment')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps requests visible and disables allocation when no coordinator is available', async () => {
    const api = stubApi({
      'GET /api/events/unassigned': { body: { items } },
      'GET /api/events/coordinators': { body: { items: [] } },
    });
    renderPage();
    expect(await screen.findByText(/No event coordinators are currently available/)).toBeInTheDocument();
    expect(screen.getByText('Career fair')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Assign' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(api.writes()).toEqual([]);
  });

  it('requires a refresh after an uncertain write instead of allowing a blind retry', async () => {
    const api = stubApi({
      'GET /api/events/unassigned': { body: { items } },
      'GET /api/events/coordinators': coordinators,
      'PUT /api/events/a/coordinator': apiError(500, 'INTERNAL_ERROR', 'Unexpected error.'),
    });
    renderPage();
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Coordinator for Career fair' }), 'casey');
    await fireEvent.click(screen.getAllByRole('button', { name: 'Assign' })[0]!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh the queue before trying again');
    expect(screen.getAllByRole('button', { name: 'Assign' })[0]).toBeDisabled();
    api.set('GET /api/events/unassigned', { body: { items: [] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('No requests are awaiting assignment')).toBeInTheDocument();
    expect(api.writes()).toHaveLength(1);
  });

  it('shows a refused unavailable target without removing the request', async () => {
    const api = stubApi({
      'GET /api/events/unassigned': { body: { items } },
      'GET /api/events/coordinators': coordinators,
      'PUT /api/events/a/coordinator': apiError(400, 'INVALID_COORDINATOR', 'Select an available event coordinator.'),
    });
    renderPage();
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Coordinator for Career fair' }), 'casey');
    await fireEvent.click(screen.getAllByRole('button', { name: 'Assign' })[0]!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Select an available event coordinator.');
    expect(screen.getByText('Career fair')).toBeInTheDocument();
    expect(api.writes()).toHaveLength(1);
  });
});
