import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { authSession, type SignedInUser } from '../../auth/session.js';
import EquipmentQueuePage from './EquipmentQueuePage.vue';
import { apiError, stubApi } from '../components/test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const authSession = reactive({ user: null, loading: false });
  return { authSession, clearLocalSession: () => { authSession.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const support = { id: 'support', email: 'support@example.test', displayName: 'Support', role: 'TECHNICAL_SUPPORT_STAFF' as const };
const revision = 'a'.repeat(64);
const line = { id: 'line-one', eventRequestId: 'event-one', eventName: 'Private equipment event', equipmentTypeId: 'projector',
  equipmentType: 'Projector', quantity: 2, startsAt: '2031-01-01T01:00:00.000Z', endsAt: '2031-01-01T03:00:00.000Z',
  technicalRequirements: 'HDMI', status: 'REQUESTED', eventStatus: 'APPROVED', revision, decisionReason: null };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => { session.user = { ...support }; session.loading = false; });

describe('KAN-63 Technical Support equipment queue', () => {
  it('sends the loaded revision when reserving and reloads saved status', async () => {
    let reserved = false;
    const api = stubApi({
      'GET /api/equipment-requests': () => ({ body: { items: [{ ...line, status: reserved ? 'RESERVED' : 'REQUESTED' }] } }),
      'POST /api/equipment-requests/line-one/review': () => { reserved = true; return { body: { request: { ...line, status: 'RESERVED' } } }; },
    });
    render(EquipmentQueuePage);
    await fireEvent.click(await screen.findByRole('button', { name: 'Reserve full line' }));
    expect(await screen.findByText('The full equipment line was reserved.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reserve full line' })).not.toBeInTheDocument();
    expect(api.writes()[0]?.body).toEqual({ decision: 'RESERVED', revision });
    expect(screen.getByRole('link', { name: 'Check availability and manage reservations' })).toHaveAttribute('href', '/equipment/availability/event-one');
  });

  it('requires an entered rejection reason', async () => {
    const api = stubApi({
      'GET /api/equipment-requests': { body: { items: [line] } },
      'POST /api/equipment-requests/line-one/review': { body: { request: { ...line, status: 'REJECTED' } } },
    });
    render(EquipmentQueuePage);
    const button = await screen.findByRole('button', { name: 'Reject request' });
    expect(button).toBeDisabled();
    await fireEvent.update(screen.getByLabelText('Rejection reason'), '  Stock cannot support this event  ');
    await fireEvent.click(button);
    await vi.waitFor(() => expect(api.writes()).toHaveLength(1));
    expect(api.writes()[0]?.body).toEqual({ decision: 'REJECTED', revision, reason: 'Stock cannot support this event' });
  });

  it.each([
    { status: 409, code: 'STALE_EQUIPMENT_REQUEST' },
    { status: 409, code: 'EQUIPMENT_CAPACITY_EXCEEDED' },
    { status: 500, code: 'INTERNAL_ERROR' },
  ])('requires refresh before retrying after $code and never automatically repeats a write', async failure => {
    const api = stubApi({
      'GET /api/equipment-requests': { body: { items: [line] } },
      'POST /api/equipment-requests/line-one/review': apiError(failure.status, failure.code, 'Refresh required'),
    });
    render(EquipmentQueuePage);
    await fireEvent.click(await screen.findByRole('button', { name: 'Reserve full line' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh required');
    expect(screen.getByRole('button', { name: 'Reserve full line' })).toBeDisabled();
    expect(api.writes()).toHaveLength(1);
    api.set('GET /api/equipment-requests', { body: { items: [{ ...line, revision: 'b'.repeat(64) }] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('button', { name: 'Reserve full line' })).toBeEnabled();
    expect(api.writes()).toHaveLength(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Reserve full line' }));
    await vi.waitFor(() => expect(api.writes()).toHaveLength(2));
    expect(api.writes()[1]?.body).toEqual({ decision: 'RESERVED', revision: 'b'.repeat(64) });
  });

  it('disables all line decisions during one pending write, and ignores its completion after account change', async () => {
    const pending = deferred<{ body: unknown }>();
    const api = stubApi({
      'GET /api/equipment-requests': { body: { items: [line, { ...line, id: 'line-two' }] } },
      'POST /api/equipment-requests/line-one/review': () => pending.promise,
    });
    render(EquipmentQueuePage);
    await screen.findAllByRole('button', { name: 'Reserve full line' });
    await fireEvent.click(screen.getAllByRole('button', { name: 'Reserve full line' })[0]!);
    for (const button of screen.getAllByRole('button', { name: 'Reserve full line' })) expect(button).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    session.user = { ...support, role: 'ATTENDEE' };
    await nextTick();
    expect(screen.queryByText('Private equipment event')).not.toBeInTheDocument();
    pending.resolve({ body: { request: { ...line, status: 'RESERVED' } } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('The full equipment line was reserved.')).not.toBeInTheDocument();
    expect(api.writes()).toHaveLength(1);
  });

  it('does not display late loaded data after sign out', async () => {
    const pending = deferred<{ body: unknown }>();
    stubApi({ 'GET /api/equipment-requests': () => pending.promise });
    render(EquipmentQueuePage);
    session.user = null; await nextTick();
    pending.resolve({ body: { items: [line] } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in as Technical Support');
    expect(screen.queryByText('Private equipment event')).not.toBeInTheDocument();
  });

  it.each(['EVENT_COORDINATOR', 'EVENT_ORGANISER', 'ATTENDEE'] as const)('blocks direct queue navigation by %s without a protected fetch', role => {
    session.user = { ...support, role };
    const api = stubApi({});
    render(EquipmentQueuePage);
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in as Technical Support');
    expect(api.calls).toHaveLength(0);
  });

  it('shows confirmed requests without decision controls', async () => {
    const api = stubApi({ 'GET /api/equipment-requests': { body: { items: [{ ...line, eventStatus: 'CONFIRMED' }] } } });
    render(EquipmentQueuePage);
    expect(await screen.findByText('Private equipment event')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reserve full line' })).not.toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it('removes protected rows after denied access and does not show a false empty result', async () => {
    const api = stubApi({ 'GET /api/equipment-requests': { body: { items: [line] } } });
    render(EquipmentQueuePage);
    await screen.findByText('Private equipment event');
    api.set('GET /api/equipment-requests', apiError(403, 'FORBIDDEN', 'Access denied'));
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByText('Private equipment event')).not.toBeInTheDocument();
    expect(screen.queryByText('No equipment requests are waiting.')).not.toBeInTheDocument();
  });

  it('clears an expired session', async () => {
    stubApi({ 'GET /api/equipment-requests': apiError(401, 'UNAUTHENTICATED', 'Session expired') });
    render(EquipmentQueuePage);
    await vi.waitFor(() => expect(session.user).toBeNull());
  });
});
