import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser } from '../../auth/session.js';
import EventConfirmationPanel from './EventConfirmationPanel.vue';
import { apiError, stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const authSession = reactive({ user: null, loading: false });
  return { authSession, clearLocalSession: () => { authSession.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const coordinator = { id: 'coord', email: 'c@example.test', displayName: 'Casey', role: 'EVENT_COORDINATOR' as const };
const organiser = { id: 'owner', email: 'o@example.test', displayName: 'Owner', role: 'EVENT_ORGANISER' as const };
const READ = 'GET /api/events/event-one/confirmation';
const WRITE = 'POST /api/events/event-one/confirm';
const checks = (pending = false) => [
  { key: 'VENUE', ready: true, message: 'Every live venue arrangement is approved.' },
  { key: 'EQUIPMENT', ready: true, message: 'Equipment is recorded as Not Required.' },
  { key: 'CHANGE_REQUEST', ready: !pending, message: pending ? 'Decide the pending change request before confirming.' : 'No significant change is pending.' },
];
const approved = (overrides: Record<string, unknown> = {}) => ({ body: { eventRequestId: 'event-one', status: 'APPROVED',
  started: false, canConfirm: true, readiness: { ready: true, checks: checks() }, confirmation: null, ...overrides } });
const confirmed = { body: { eventRequestId: 'event-one', status: 'CONFIRMED', started: false, canConfirm: false, readiness: null,
  confirmation: { confirmedBy: 'coord', confirmedByName: 'Casey', confirmedAt: '2034-12-01T02:00:00.000Z' } } };
const renderPanel = (status = 'APPROVED') => render(EventConfirmationPanel, { props: { eventRequestId: 'event-one', status } });

beforeEach(() => { session.user = { ...coordinator }; session.loading = false; });

describe('KAN-61 event confirmation panel', () => {
  it('keeps the newest checklist when overlapping planning refreshes resolve out of order', async () => {
    let first!: (value: ReturnType<typeof approved>) => void;
    let second!: (value: ReturnType<typeof approved>) => void;
    const api = stubApi({ [READ]: approved() });
    const panel = render(EventConfirmationPanel, { props: { eventRequestId: 'event-one', status: 'APPROVED', refreshVersion: 0 } });
    await screen.findByRole('checkbox');
    api.set(READ, () => new Promise(resolve => { first = resolve; }));
    await panel.rerender({ eventRequestId: 'event-one', status: 'APPROVED', refreshVersion: 1 });
    api.set(READ, () => new Promise(resolve => { second = resolve; }));
    await panel.rerender({ eventRequestId: 'event-one', status: 'APPROVED', refreshVersion: 2 });
    second(approved({ canConfirm: false, readiness: { ready: false, checks: checks(true) } }));
    await screen.findByText(/Decide the pending change request/);
    first(approved());
    await flushPromises();
    expect(screen.queryByRole('button', { name: 'Confirm event' })).not.toBeInTheDocument();
    expect(screen.getByText(/Decide the pending change request/)).toBeInTheDocument();
  });

  it('discards stale readiness while a planning refresh loads or fails, then permits an explicit retry', async () => {
    let finish!: (value: ReturnType<typeof apiError>) => void;
    const api = stubApi({ [READ]: approved() });
    const panel = render(EventConfirmationPanel, { props: { eventRequestId: 'event-one', status: 'APPROVED', refreshVersion: 0 } });
    await fireEvent.click(await screen.findByRole('checkbox'));
    api.set(READ, () => new Promise(resolve => { finish = resolve; }));
    await panel.rerender({ eventRequestId: 'event-one', status: 'APPROVED', refreshVersion: 1 });
    expect(await screen.findByText('Loading confirmation details…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm event' })).not.toBeInTheDocument();
    finish(apiError(503, 'UNAVAILABLE', 'Readiness is temporarily unavailable.'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Readiness is temporarily unavailable.');
    expect(screen.queryByText('Every live venue arrangement is approved.')).not.toBeInTheDocument();
    api.set(READ, approved());
    await fireEvent.click(screen.getByRole('button', { name: 'Reload confirmation details' }));
    expect(await screen.findByRole('button', { name: 'Confirm event' })).toBeDisabled();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ignores an old readiness response after another event is opened', async () => {
    let finish!: (value: ReturnType<typeof approved>) => void;
    stubApi({ [READ]: () => new Promise(resolve => { finish = resolve; }),
      'GET /api/events/event-two/confirmation': approved({ eventRequestId: 'event-two', canConfirm: false,
        readiness: { ready: false, checks: checks(true) } }) });
    const panel = renderPanel();
    await panel.rerender({ eventRequestId: 'event-two', status: 'APPROVED' });
    await screen.findByText(/Decide the pending change request/);
    finish(approved());
    await flushPromises();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirm event' })).not.toBeInTheDocument());
    expect(screen.getByText(/Decide the pending change request/)).toBeInTheDocument();
  });

  it('KAN-61-AC3/AC4: shows the checklist, requires acknowledgement, then shows who confirmed and when', async () => {
    const api = stubApi({ [READ]: approved(), [WRITE]: { body: { confirmation: { status: 'CONFIRMED', changed: true, confirmation: null } } } });
    const view = renderPanel();
    expect(await screen.findByText(/Every live venue arrangement is approved/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Confirm event' });
    expect(button).toBeDisabled();
    await fireEvent.click(screen.getByRole('checkbox'));
    api.set(READ, confirmed);
    await fireEvent.click(button);
    expect(await screen.findByText('The event is confirmed.')).toBeInTheDocument();
    expect(await screen.findByTestId('confirmation-record')).toHaveTextContent('Confirmed by Casey');
    expect(api.writes()).toEqual([{ key: WRITE, body: {} }]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('keeps the confirmation outcome when the host page refreshes the status, but not for another event', async () => {
    const api = stubApi({ [READ]: approved(), [WRITE]: { body: { confirmation: { status: 'CONFIRMED', changed: true, confirmation: null } } },
      'GET /api/events/event-two/confirmation': approved({ eventRequestId: 'event-two' }) });
    const view = renderPanel();
    await fireEvent.click(await screen.findByRole('checkbox'));
    api.set(READ, confirmed);
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm event' }));
    expect(await screen.findByText('The event is confirmed.')).toBeInTheDocument();
    await view.rerender({ eventRequestId: 'event-one', status: 'CONFIRMED' });
    expect(await screen.findByTestId('confirmation-record')).toBeInTheDocument();
    expect(screen.getByText('The event is confirmed.')).toBeInTheDocument();
    await view.rerender({ eventRequestId: 'event-two', status: 'APPROVED' });
    expect(screen.queryByText('The event is confirmed.')).not.toBeInTheDocument();
  });

  it('KAN-61-AC3: explains each blocker and offers no confirm action while not ready', async () => {
    stubApi({ [READ]: approved({ canConfirm: false, readiness: { ready: false, checks: checks(true) } }) });
    renderPanel();
    expect(await screen.findByText(/Decide the pending change request/)).toBeInTheDocument();
    expect(screen.getAllByText('Not ready')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Confirm event' })).not.toBeInTheDocument();
  });

  it('re-reads the checklist after a refused confirmation instead of keeping stale readiness', async () => {
    const api = stubApi({ [READ]: approved(),
      [WRITE]: apiError(409, 'EVENT_NOT_READY', 'Decide the pending change request before confirming.') });
    renderPanel();
    await fireEvent.click(await screen.findByRole('checkbox'));
    api.set(READ, approved({ canConfirm: false, readiness: { ready: false, checks: checks(true) } }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm event' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Decide the pending change request before confirming.');
    expect(await screen.findByText('Not ready')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm event' })).not.toBeInTheDocument();
  });

  it('KAN-61-AC4: the organiser sees the saved confirmation outcome', async () => {
    session.user = { ...organiser };
    stubApi({ [READ]: confirmed });
    renderPanel('CONFIRMED');
    expect(await screen.findByTestId('confirmation-record')).toHaveTextContent('Confirmed by Casey');
  });

  it('KAN-61-AC1: the organiser of a ready event sees readiness but never the action', async () => {
    session.user = { ...organiser };
    stubApi({ [READ]: approved({ canConfirm: false }) });
    renderPanel();
    expect(await screen.findByText('Only the assigned coordinator can confirm this event.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm event' })).not.toBeInTheDocument();
  });

  it('says when the event has already started', async () => {
    stubApi({ [READ]: approved({ canConfirm: false, started: true }) });
    renderPanel();
    expect(await screen.findByText(/already started/)).toBeInTheDocument();
  });

  it('stays hidden outside approval/confirmation and for other roles, without calling the API', async () => {
    const api = stubApi({});
    renderPanel('SUBMITTED');
    session.user = { ...coordinator, role: 'VENUE_STAFF' as never };
    render(EventConfirmationPanel, { props: { eventRequestId: 'event-two', status: 'APPROVED' } });
    expect(screen.queryByRole('heading', { name: 'Event confirmation' })).not.toBeInTheDocument();
    expect(api.calls).toEqual([]);
  });

  it('shows the access error when the event is no longer available', async () => {
    stubApi({ [READ]: apiError(404, 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.') });
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent('The event request was not found.');
  });
});
