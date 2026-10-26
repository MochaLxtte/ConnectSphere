import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser } from '../../auth/session.js';
import EventCancellationPanel from './EventCancellationPanel.vue';
import { stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  return { authSession: reactive({ user: null, loading: false }) };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const organiser = { id: 'owner', email: 'owner@example.test', displayName: 'Owner', role: 'EVENT_ORGANISER' as const };
beforeEach(() => { session.user = { ...organiser }; session.loading = false; });

describe('KAN-62 event cancellation panel', () => {
  it('requires a reason and arrangement confirmation, then shows the persisted outcome', async () => {
    const api = stubApi({
      'POST /api/events/event-one/cancel': { body: { cancellation: {
        status: 'CANCELLED', cancelledAt: '2031-01-01T00:00:00.000Z', reason: 'Schedule changed',
      } } },
    });
    const view = render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'APPROVED' } });
    const button = screen.getByRole('button', { name: 'Cancel event' });
    expect(button).toBeDisabled();
    await fireEvent.update(screen.getByLabelText('Reason'), '  Schedule changed  ');
    expect(button).toBeDisabled();
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(button);
    expect(await screen.findByText('This event was cancelled. The saved reason is visible to event managers.')).toBeInTheDocument();
    expect(api.writes()[0]).toEqual({ key: 'POST /api/events/event-one/cancel',
      body: { reason: 'Schedule changed', confirmAffectedArrangements: true } });
    expect(view.emitted('changed')).toHaveLength(1);
  });
});
