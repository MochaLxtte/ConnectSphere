import { render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser } from '../../auth/session.js';
import EventPlanningPanels from './EventPlanningPanels.vue';
import { stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
beforeEach(() => {
  session.user = { id: 'coordinator-a', role: 'EVENT_COORDINATOR', email: 'coordinator@example.test', displayName: 'Coordinator' };
  session.loading = false;
});

const eventRequestId = 'event-one';
const list = `GET /api/venue-bookings?eventRequestId=${eventRequestId}`;
const props = {
  eventRequestId, currentCoordinatorId: 'coordinator-a', status: 'APPROVED', viewerRole: 'EVENT_COORDINATOR', revision: 8,
};

describe('KAN-15 O-1: planning panels after a change-request decision', () => {
  it('reloads the venue booking list when the event revision advances, and not otherwise', async () => {
    // Other panels' reads are left unstubbed; only the venue panel's reads matter here.
    const api = stubApi({ [list]: { body: { items: [] } }, 'GET /api/venues/search-venues': { body: { items: [] } } });
    const view = render(EventPlanningPanels, { props });
    await screen.findByText('No venue has been requested for this event yet.');
    const loads = () => api.calls.filter((call) => call.key === list).length;
    expect(loads()).toBe(1);

    // An approved change request applies new values (revision 9) and may cancel pending bookings.
    await view.rerender({ ...props, revision: 9 });
    await waitFor(() => expect(loads()).toBe(2));

    // A parent refresh with the same revision keeps the panel and its form as they are.
    await view.rerender({ ...props, revision: 9, currentCoordinatorId: 'coordinator-a' });
    await screen.findByText('No venue has been requested for this event yet.');
    expect(loads()).toBe(2);
  });
});
