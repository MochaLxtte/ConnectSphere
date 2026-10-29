import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session';
import type { EquipmentReservationContext, EquipmentReservationRequest } from '../api/equipment-reservations';
import EquipmentReservationPanel from './EquipmentReservationPanel.vue';

vi.mock('../../auth/session', async () => {
  const { reactive } = await import('vue'); const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'TECHNICAL_SUPPORT_STAFF', id = 'tech-a'): SignedInUser =>
  ({ id, role, email: `${id}@example.test`, displayName: id });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const failure = (status = 409, code = 'EQUIPMENT_CONTEXT_CHANGED', message = 'Saved requirements changed.') =>
  json({ error: { code, message } }, status);
const base = '/api/equipment/reservations/events/a';
const request = (id: string, name: string): EquipmentReservationRequest => ({ id, equipmentTypeId: `type-${id}`,
  equipmentName: name, quantity: 3, status: 'REQUESTED', startsAt: '2026-11-01T02:00:00.123456Z',
  endsAt: '2026-11-01T04:00:00.123456Z', notes: null, decidedBy: null, decidedAt: null, decisionReason: null,
  releasedBy: null, releasedAt: null, releaseReason: null, releaseCause: null, canReserve: true, canCancel: false });
const context = (): EquipmentReservationContext => ({
  event: { id: 'a', name: 'Workshop', status: 'APPROVED', startsAt: '2026-11-01T02:00:00.123456Z',
    endsAt: '2026-11-01T04:00:00.123456Z', equipmentRequirements: 'Workshop equipment' },
  requirementsVersion: 'v1', requests: [request('r1', 'Projector'), { ...request('r2', 'Speaker'), quantity: 1 }],
  readiness: { status: 'PENDING', activeCount: 2, reservedCount: 0, message: 'Reserve every active saved requirement.' },
});
function fixtures(data = context()) {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => json(data)); vi.stubGlobal('fetch', fetch); return fetch;
}
function deferred() { let resolve!: (value: Response) => void;
  const promise = new Promise<Response>(done => { resolve = done; }); return { resolve, promise }; }
async function settle(pending: ReturnType<typeof deferred>, response: Response) {
  pending.resolve(response); await new Promise(resolve => setTimeout(resolve, 0));
}
async function load() { await fireEvent.click(screen.getByRole('button', { name: 'Load saved reservations' }));
  await screen.findByRole('button', { name: 'Refresh reservations' }); }
async function chooseReserve(id = 'r1', name = 'Projector') {
  await fireEvent.click(screen.getByRole('button', { name: `Reserve ${name} request ${id}` })); }
async function confirmReserve() { await fireEvent.click(screen.getByRole('button', { name: 'Confirm reservation' })); }
function reserved(data: EquipmentReservationContext, id: string) {
  const next = structuredClone(data), item = next.requests.find(row => row.id === id)!;
  item.status = 'RESERVED'; item.canReserve = false; item.canCancel = true; item.decidedAt = '2026-10-26T03:00:00Z'; item.decidedBy = 'tech-a';
  next.requirementsVersion += '-next'; next.readiness.reservedCount++;
  if (next.readiness.reservedCount === next.readiness.activeCount) { next.readiness.status = 'READY'; next.readiness.message = 'All active requests reserved within current stock.'; }
  return next;
}
beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-26 full saved reservations and readiness', () => {
  it('loads on explicit request and reserves each full line using only its saved identity and current version', async () => {
    const initial = context(), first = reserved(initial, 'r1'), all = reserved(first, 'r2');
    const fetch = fixtures(initial); const view = render(EquipmentReservationPanel, { props: { eventId: 'a' } });
    expect(fetch).not.toHaveBeenCalled(); await load(); await chooseReserve();
    const form = screen.getByRole('form', { name: 'Confirm equipment action' });
    expect(within(form).getByText(/Projector · 3 units/)).toBeInTheDocument();
    expect(within(form).queryByRole('spinbutton')).not.toBeInTheDocument();
    fetch.mockResolvedValueOnce(json({ changed: true, context: first })); await confirmReserve();
    expect(await screen.findByText(/reservation saved.*coordinator has been notified/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reservations pending' })).toBeInTheDocument();
    expect(screen.getByText('1 of 2 active requests reserved.')).toBeInTheDocument();
    expect(fetch.mock.calls[1]).toEqual([`${base}/requests/r1/reserve`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ requirementsVersion: 'v1' }) })]);
    await chooseReserve('r2', 'Speaker'); fetch.mockResolvedValueOnce(json({ changed: true, context: all })); await confirmReserve();
    expect(await screen.findByRole('heading', { name: 'Equipment ready' })).toHaveClass('ready');
    expect(JSON.parse(fetch.mock.calls[2]![1]!.body as string)).toEqual({ requirementsVersion: first.requirementsVersion });
    expect(view.emitted().invalidate).toHaveLength(2); expect(view.emitted().settled).toHaveLength(2);
  });
  it('keeps the current state when confirmation is dismissed', async () => {
    const fetch = fixtures(); render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load(); await chooseReserve();
    await fireEvent.click(screen.getByRole('button', { name: 'Keep current requests' }));
    expect(screen.queryByRole('form')).not.toBeInTheDocument(); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('records a reasoned cancellation and shows retained history without treating no remaining requirements as ready', async () => {
    const data = reserved(context(), 'r1'); data.requests = [data.requests[0]!]; data.readiness.activeCount = 1; data.readiness.status = 'READY';
    const fetch = fixtures(data); render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel Projector reservation r1' }));
    const submit = screen.getByRole('button', { name: 'Confirm cancellation' });
    await fireEvent.click(submit); expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    await fireEvent.update(screen.getByRole('textbox'), 'x'.repeat(2001)); await fireEvent.click(submit); expect(fetch).toHaveBeenCalledTimes(1);
    await fireEvent.update(screen.getByRole('textbox'), '  Cancelled equipment activity  ');
    const after = structuredClone(data); Object.assign(after.requests[0]!, { status: 'CANCELLED', canCancel: false,
      releasedBy: 'tech-a', releasedAt: '2026-10-26T04:00:00Z', releaseReason: 'Cancelled equipment activity', releaseCause: 'MANUAL_CANCELLATION',
      notes: 'Workshop room', decisionReason: 'Initial reservation' });
    after.readiness = { status: 'NO_REQUIREMENTS', activeCount: 0, reservedCount: 0, message: 'No active saved requirements.' };
    fetch.mockResolvedValueOnce(json({ changed: true, context: after })); await fireEvent.click(submit);
    expect(await screen.findByText(/reservation cancelled.*history has been retained/)).toBeInTheDocument();
    expect(screen.getByText('Release cause: Manual cancellation')).toBeInTheDocument();
    expect(screen.getByText('Release reason: Cancelled equipment activity')).toBeInTheDocument();
    expect(screen.getByText('Decision reason: Initial reservation')).toBeInTheDocument(); expect(screen.getByText('Workshop room')).toBeInTheDocument();
    expect(screen.getByText('Status: CANCELLED')).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Equipment ready' })).not.toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[1]![1]!.body as string)).toEqual({ requirementsVersion: data.requirementsVersion, reason: 'Cancelled equipment activity' });
  });
  it.each(['EVENT_CANCELLED', 'EVENT_COMPLETED'] as const)('shows retained %s release without a new action', async (cause) => {
    const data = context(); Object.assign(data.requests[0]!, { status: 'CANCELLED', canReserve: false, releaseCause: cause,
      releasedAt: '2026-10-26T02:00:00Z' }); fixtures(data); render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load();
    expect(screen.getByText(`Release cause: ${cause === 'EVENT_CANCELLED' ? 'Event cancelled' : 'Event completed'}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reserve Projector request r1' })).not.toBeInTheDocument();
  });
  it('refreshes stock-loss readiness even when all active requests were reserved', async () => {
    const data = reserved(reserved(context(), 'r1'), 'r2'); const fetch = fixtures(data);
    render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load(); expect(screen.getByRole('heading', { name: 'Equipment ready' })).toBeInTheDocument();
    data.readiness.status = 'SHORTFALL'; data.readiness.message = 'Operational stock no longer covers reservations.';
    fetch.mockResolvedValue(json(data)); await fireEvent.click(screen.getByRole('button', { name: 'Refresh reservations' }));
    expect(await screen.findByRole('heading', { name: 'Equipment shortfall' })).toHaveClass('not-ready');
    expect(screen.queryByRole('heading', { name: 'Equipment ready' })).not.toBeInTheDocument();
  });
  it.each(['NO_REQUIREMENTS', 'READY', 'INVALID_REQUIREMENTS'] as const)('does not show empty %s as ready or offer unsaved reservations', async (status) => {
    const data = context(); data.requests = []; data.readiness = { status, activeCount: 0, reservedCount: 0, message: 'No valid saved requirements.' };
    fixtures(data); render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load();
    expect(screen.getByText(/what-if items cannot be reserved/)).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Equipment ready' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reserve / })).not.toBeInTheDocument();
  });
  it('shows confirmed events read-only even if an inconsistent response offers action flags', async () => {
    const data = reserved(context(), 'r1'); data.event.status = 'CONFIRMED'; fixtures(data);
    render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load();
    expect(screen.getByText('This event is confirmed. Reservations are read-only.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reserve |^Cancel / })).not.toBeInTheDocument();
  });
  it('KAN-84-AC6/AC7: allows reservation changes on a confirmed event during technical safety remediation', async () => {
    const data = reserved(context(), 'r1'); data.event.status = 'CONFIRMED'; data.event.technicalRemediation = true; fixtures(data);
    render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load();
    expect(screen.getByText(/safety review requested technical changes/)).toBeInTheDocument();
    expect(screen.queryByText('This event is confirmed. Reservations are read-only.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancel / })).toBeInTheDocument();
  });
  it.each(['CANCELLED', 'COMPLETED'])('KAN-84-AC6/AC7: hides reservation actions for a %s event with an old remediation round', async status => {
    const data = reserved(context(), 'r1'); Object.assign(data.event, { status, technicalRemediation: true }); fixtures(data);
    render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load();
    expect(screen.queryByRole('button', { name: /^Reserve |^Cancel / })).not.toBeInTheDocument();
  });
  it.each([0, -1, 1.5])('does not offer an action for invalid saved quantity %s', async quantity => {
    const data = context(); data.requests[0]!.quantity = quantity; fixtures(data);
    render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load();
    expect(screen.queryByRole('button', { name: 'Reserve Projector request r1' })).not.toBeInTheDocument();
  });
  it('disables duplicate submission and records an idempotent repeat without claiming a new reservation', async () => {
    const pending = deferred(), fetch = fixtures(); render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load(); await chooseReserve();
    fetch.mockImplementationOnce(() => pending.promise); await confirmReserve();
    expect(screen.getByRole('button', { name: 'Refresh reservations' })).toBeDisabled();
    const submit = screen.getByRole('button', { name: 'Saving reservation action…' }); expect(submit).toBeDisabled(); await fireEvent.click(submit);
    await fireEvent.submit(screen.getByRole('form', { name: 'Confirm equipment action' }));
    expect(fetch).toHaveBeenCalledTimes(2); await settle(pending, json({ changed: false, context: reserved(context(), 'r1') }));
    expect(await screen.findByText(/action was already recorded/)).toBeInTheDocument(); expect(screen.queryByText(/coordinator has been notified/)).not.toBeInTheDocument();
  });
  it('removes the readiness claim while cancellation is pending', async () => {
    const data = reserved(reserved(context(), 'r1'), 'r2'), fetch = fixtures(data), pending = deferred();
    render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load();
    expect(screen.getByRole('heading', { name: 'Equipment ready' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel Projector reservation r1' }));
    await fireEvent.update(screen.getByRole('textbox', { name: 'Cancellation reason' }), 'Cancelled room activity');
    fetch.mockImplementationOnce(() => pending.promise); await fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(screen.queryByRole('heading', { name: 'Equipment ready' })).not.toBeInTheDocument();
    expect(screen.queryByText('All active requests reserved within current stock.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Updating equipment reservations' })).toBeInTheDocument();
  });
});

describe('KAN-26 conflict, failure and identity boundaries', () => {
  it.each([['EQUIPMENT_CONTEXT_CHANGED', 'Saved requirements changed.'], ['EQUIPMENT_STOCK_CONFLICT', 'Stock changed.'],
    ['EQUIPMENT_EVENT_NOT_APPROVED', 'The event was confirmed.']])('reloads %s and clears the old confirmation', async (code, message) => {
    const fetch = fixtures(); render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load(); await chooseReserve();
    const fresh = context(); fresh.requests[0]!.quantity = 4; fresh.requirementsVersion = 'v2';
    fetch.mockResolvedValueOnce(failure(409, code, message)).mockResolvedValueOnce(json(fresh)); await confirmReserve();
    expect(await screen.findByText(`${message} Review the refreshed saved requests before trying again.`)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Projector · 4 units' })).toBeInTheDocument(); expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByText(/reservation saved/)).not.toBeInTheDocument();
  });
  it('drops actionable stale data when a write and its refresh both fail', async () => {
    const fetch = fixtures(); render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load(); await chooseReserve();
    fetch.mockRejectedValueOnce(new TypeError('Network lost')).mockResolvedValueOnce(failure(500, 'READ_FAILED', 'Try again later.'));
    await confirmReserve(); expect(await screen.findByRole('alert')).toHaveTextContent('Try again later.');
    expect(screen.queryByRole('heading', { name: 'Projector · 3 units' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    fetch.mockResolvedValue(json(context())); await fireEvent.click(screen.getByRole('button', { name: 'Retry reservations' }));
    expect(await screen.findByRole('heading', { name: 'Projector · 3 units' })).toBeInTheDocument();
  });
  for (const stage of ['read', 'write'] as const) {
    it.each([401, 403, 404])(`handles current ${stage} denial %s without leaving private rows or buttons`, async status => {
      const fetch = fixtures(); render(EquipmentReservationPanel, { props: { eventId: 'a' } });
      if (stage === 'write') { await load(); await chooseReserve(); }
      fetch.mockResolvedValueOnce(failure(status));
      if (stage === 'read') await fireEvent.click(screen.getByRole('button', { name: 'Load saved reservations' })); else await confirmReserve();
      if (status === 401) await waitFor(() => expect(session.user).toBeNull());
      else expect(await screen.findByRole('alert')).toHaveTextContent('permission');
      expect(screen.queryByRole('heading', { name: 'Projector · 3 units' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Retry reservations' })).not.toBeInTheDocument();
    });
    for (const boundary of ['account', 'event', 'role', 'unmount'] as const) {
      it.each([200, 401])(`ignores a late ${stage} %s after ${boundary} changes`, async status => {
        const pending = deferred(), fetch = fixtures(); const view = render(EquipmentReservationPanel, { props: { eventId: 'a' } });
        if (stage === 'write') { await load(); await chooseReserve(); }
        fetch.mockImplementationOnce(() => pending.promise);
        if (stage === 'read') await fireEvent.click(screen.getByRole('button', { name: 'Load saved reservations' })); else await confirmReserve();
        const signal = fetch.mock.calls.at(-1)![1]!.signal!;
        if (boundary === 'account') session.user = user('TECHNICAL_SUPPORT_STAFF', 'tech-b');
        else if (boundary === 'event') await view.rerender({ eventId: 'b' });
        else if (boundary === 'role') session.user = user('EVENT_COORDINATOR'); else view.unmount();
        await waitFor(() => expect(signal.aborted).toBe(true));
        await settle(pending, status === 401 ? failure(401) : json(stage === 'read' ? context() : { changed: true, context: reserved(context(), 'r1') }));
        expect(session.user).not.toBeNull(); expect(screen.queryByText(/reservation saved/)).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Projector · 3 units' })).not.toBeInTheDocument();
        expect(view.emitted().settled).toBeUndefined();
      });
    }
  }
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'does not show or fetch reservation controls for %s', role => {
      session.user = user(role); const fetch = fixtures(); render(EquipmentReservationPanel, { props: { eventId: 'a' } });
      expect(screen.queryByRole('heading')).not.toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled();
    });
  it('waits for restored identity and rejects an empty event identity', async () => {
    session.loading = true; const fetch = fixtures(); const view = render(EquipmentReservationPanel, { props: { eventId: '' } });
    session.loading = false; await view.rerender({ eventId: '' });
    expect(screen.queryByRole('heading')).not.toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled();
  });
  it('ignores a queued load click after identity is lost before the DOM updates', async () => {
    const fetch = fixtures(); render(EquipmentReservationPanel, { props: { eventId: 'a' } });
    const button = screen.getByRole('button', { name: 'Load saved reservations' }); session.loading = true;
    await fireEvent.click(button); expect(fetch).not.toHaveBeenCalled();
  });
  it('ignores a queued reservation click after identity is lost before the DOM updates', async () => {
    const fetch = fixtures(); render(EquipmentReservationPanel, { props: { eventId: 'a' } }); await load();
    const button = screen.getByRole('button', { name: 'Reserve Projector request r1' }); session.loading = true;
    await fireEvent.click(button); expect(fetch).toHaveBeenCalledTimes(1); expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});
