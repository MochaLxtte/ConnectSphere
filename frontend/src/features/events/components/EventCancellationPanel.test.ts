import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { authSession, type SignedInUser } from '../../auth/session.js';
import EventCancellationPanel from './EventCancellationPanel.vue';
import { apiError, stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const authSession = reactive({ user: null, loading: false });
  return { authSession, clearLocalSession: () => { authSession.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const organiser = { id: 'owner', email: 'owner@example.test', displayName: 'Owner', role: 'EVENT_ORGANISER' as const };
const cancellation = { status: 'CANCELLED', cancelledAt: '2031-01-01T00:00:00.000Z', reason: 'Schedule changed' };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
async function fill() {
  await fireEvent.update(screen.getByLabelText('Reason'), '  Schedule changed  ');
  await fireEvent.click(screen.getByRole('checkbox'));
}
beforeEach(() => { session.user = { ...organiser }; session.loading = false; });

describe('KAN-62 event cancellation panel', () => {
  it('requires a reason and arrangement confirmation, then shows the persisted outcome', async () => {
    const api = stubApi({ 'POST /api/events/event-one/cancel': { body: { cancellation } } });
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
    expect(screen.queryByRole('button', { name: 'Cancel event' })).not.toBeInTheDocument();
  });

  it('clears entered reasons and confirmation when the route or displayed event revision changes', async () => {
    stubApi({});
    const view = render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'APPROVED', revision: 1 } });
    await fill();
    await view.rerender({ eventRequestId: 'event-one', status: 'APPROVED', revision: 2 });
    expect(screen.getByLabelText('Reason')).toHaveValue('');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await fill();
    await view.rerender({ eventRequestId: 'event-two', status: 'APPROVED', revision: 2 });
    expect(screen.getByLabelText('Reason')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Cancel event' })).toBeDisabled();
  });

  it('does not show a cancellation belonging to the previous route after a late response', async () => {
    const pending = deferred<{ body: unknown }>();
    stubApi({ 'GET /api/events/event-one/cancellation': () => pending.promise });
    const view = render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'CANCELLED' } });
    expect(screen.getByRole('status')).toHaveTextContent('Loading cancellation');
    expect(screen.queryByText('Cancellation is unavailable in this event state.')).not.toBeInTheDocument();
    await view.rerender({ eventRequestId: 'event-two', status: 'APPROVED' });
    pending.resolve({ body: { cancellation } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('Schedule changed')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel event' })).toBeDisabled();
  });

  it('does not display or emit a late cancellation after account switching', async () => {
    const pending = deferred<{ body: unknown }>();
    const api = stubApi({ 'POST /api/events/event-one/cancel': () => pending.promise });
    const view = render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'APPROVED' } });
    await fill();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel event' }));
    expect(screen.getByRole('button', { name: 'Cancelling…' })).toBeDisabled();
    session.user = { ...organiser, id: 'second-owner' }; await nextTick();
    expect(screen.getByLabelText('Reason')).toHaveValue('');
    pending.resolve({ body: { cancellation } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('Schedule changed')).not.toBeInTheDocument();
    expect(view.emitted('changed')).toBeUndefined();
    expect(api.writes()).toHaveLength(1);
  });

  it.each([
    { status: 409, code: 'EVENT_ARRANGEMENTS_CHANGED' },
    { status: 500, code: 'INTERNAL_ERROR' },
  ])('requires an explicit fresh read and new confirmation after $code', async failure => {
    const api = stubApi({
      'POST /api/events/event-one/cancel': apiError(failure.status, failure.code, 'Details changed'),
      'GET /api/events/event-one': { body: { id: 'event-one', status: 'APPROVED', revision: 2 } },
    });
    render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'APPROVED' } });
    await fill(); await fireEvent.click(screen.getByRole('button', { name: 'Cancel event' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Details changed');
    expect(screen.getByRole('button', { name: 'Cancel event' })).toBeDisabled();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh cancellation details' }));
    await vi.waitFor(() => expect(screen.getByRole('checkbox')).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Cancel event' })).toBeDisabled();
    expect(api.writes()).toHaveLength(1);
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel event' }));
    await vi.waitFor(() => expect(api.writes()).toHaveLength(2));
  });

  it('reconciles an uncertain result that actually cancelled the event without a second write', async () => {
    const api = stubApi({
      'POST /api/events/event-one/cancel': () => { throw new Error('Connection lost'); },
      'GET /api/events/event-one': { body: { id: 'event-one', status: 'CANCELLED' } },
      'GET /api/events/event-one/cancellation': { body: { cancellation } },
    });
    render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'APPROVED' } });
    await fill(); await fireEvent.click(screen.getByRole('button', { name: 'Cancel event' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Refresh cancellation details' }));
    expect(await screen.findByText('This event was cancelled. The saved reason is visible to event managers.')).toBeInTheDocument();
    expect(api.writes()).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Cancel event' })).not.toBeInTheDocument();
  });

  it('clears private cancellation details on sign out', async () => {
    stubApi({ 'GET /api/events/event-one/cancellation': { body: { cancellation } } });
    render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'CANCELLED' } });
    expect(await screen.findByText('Schedule changed')).toBeInTheDocument();
    session.user = null; await nextTick();
    expect(screen.queryByText('Schedule changed')).not.toBeInTheDocument();
    expect(screen.queryByText('Event cancellation')).not.toBeInTheDocument();
  });

  it.each(['ATTENDEE', 'TECHNICAL_SUPPORT_STAFF', 'VENUE_STAFF'] as const)('does not request manager audit data for %s', role => {
    session.user = { ...organiser, role };
    const api = stubApi({});
    render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'CANCELLED' } });
    expect(api.calls).toHaveLength(0);
    expect(screen.queryByText('Event cancellation')).not.toBeInTheDocument();
  });

  it('removes form details after the server refuses manager access', async () => {
    stubApi({ 'POST /api/events/event-one/cancel': apiError(403, 'FORBIDDEN', 'No access') });
    render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'APPROVED' } });
    await fill(); await fireEvent.click(screen.getByRole('button', { name: 'Cancel event' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No access');
    expect(screen.queryByLabelText('Reason')).not.toBeInTheDocument();
  });

  it('clears expired sessions during audit loading', async () => {
    stubApi({ 'GET /api/events/event-one/cancellation': apiError(401, 'UNAUTHENTICATED', 'Expired') });
    render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'CANCELLED' } });
    await vi.waitFor(() => expect(session.user).toBeNull());
  });

  it('reports audit loading failure without a false cancellation success', async () => {
    stubApi({ 'GET /api/events/event-one/cancellation': apiError(500, 'INTERNAL', 'Cannot load audit') });
    render(EventCancellationPanel, { props: { eventRequestId: 'event-one', status: 'CANCELLED' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot load audit');
    expect(screen.queryByText('This event was cancelled. The saved reason is visible to event managers.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh cancellation details' })).toBeEnabled();
  });
});
