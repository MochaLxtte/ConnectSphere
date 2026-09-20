import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { apiError, stubApi } from '../../events/components/test-api';
import UnassignedRequestsPage from './UnassignedRequestsPage.vue';

vi.mock('../../auth/session', () => ({
  authSession: { user: { id: 'casey', email: 'casey@example.test', displayName: 'Casey', role: 'EVENT_COORDINATOR' }, loading: false },
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

describe('CF-05 unassigned requests page', () => {
  it('lists unassigned requests and assigns one to the signed-in coordinator by default', async () => {
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
    expect(select).toHaveValue('casey');

    await fireEvent.click(screen.getAllByRole('button', { name: 'Assign' })[0]!);
    expect(await screen.findByText(/is now assigned to you/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the request' })).toHaveAttribute('href', '/reviews/a');
    expect(api.writes()).toEqual([{ key: 'PUT /api/events/a/coordinator', body: { coordinatorId: 'casey' } }]);
    expect(screen.queryByRole('combobox', { name: 'Coordinator for Career fair' })).not.toBeInTheDocument();
    expect(screen.getByText('Untitled event request')).toBeInTheDocument();
  });

  it('assigns to a colleague without offering a link the viewer cannot open', async () => {
    const api = stubApi({
      'GET /api/events/unassigned': { body: { items } },
      'GET /api/events/coordinators': coordinators,
      'PUT /api/events/a/coordinator': { body: {} },
    });
    renderPage();
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Coordinator for Career fair' }), 'blair');
    await fireEvent.click(screen.getAllByRole('button', { name: 'Assign' })[0]!);
    expect(await screen.findByText(/is now assigned to Blair/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open the request' })).not.toBeInTheDocument();
    expect(api.writes()[0]!.body).toEqual({ coordinatorId: 'blair' });
  });

  it('explains when another coordinator claimed the request first', async () => {
    stubApi({
      'GET /api/events/unassigned': { body: { items } },
      'GET /api/events/coordinators': coordinators,
      'PUT /api/events/a/coordinator': apiError(404, 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.'),
    });
    renderPage();
    await screen.findByText('Career fair');
    await fireEvent.click(screen.getAllByRole('button', { name: 'Assign' })[0]!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Another coordinator has already picked up this request');
    expect(screen.getByText('Career fair')).toBeInTheDocument();
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
    expect(await screen.findByText('Every request has a coordinator')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
