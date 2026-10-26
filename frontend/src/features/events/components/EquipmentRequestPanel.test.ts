import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser } from '../../auth/session.js';
import EquipmentRequestPanel from './EquipmentRequestPanel.vue';
import { stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  return { authSession: reactive({ user: null, loading: false }) };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const coordinator = { id: 'coord', email: 'coord@example.test', displayName: 'Coord', role: 'EVENT_COORDINATOR' as const };
const eventId = 'event-one';
const planPath = `/api/events/${eventId}/equipment-requests`;
beforeEach(() => { session.user = { ...coordinator }; session.loading = false; });

describe('KAN-63 coordinator equipment request panel', () => {
  it('records Not Required when no active lines exist', async () => {
    let saved = false;
    const api = stubApi({
      [`GET ${planPath}`]: () => ({ body: { plan: { status: saved ? 'NOT_REQUIRED' : 'REQUIRED', items: [] } } }),
      'GET /api/equipment-types': { body: { items: [] } },
      [`POST ${planPath}`]: () => { saved = true; return { status: 201, body: { request: { status: 'NOT_REQUIRED', lines: [] } } }; },
    });
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.click(await screen.findByLabelText('No equipment is required'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    expect(await screen.findByText('No equipment is required for this event.')).toBeInTheDocument();
    expect(api.writes()[0]).toEqual({ key: `POST ${planPath}`, body: { lines: [], notRequired: true } });
  });
});
