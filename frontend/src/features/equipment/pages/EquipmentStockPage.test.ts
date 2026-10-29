import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { router as appRouter } from '../../../app/router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session';
import type { EquipmentStockDetail, EquipmentStockItem } from '../api/equipment-stock';

vi.mock('../../auth/session', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'TECHNICAL_SUPPORT_STAFF', id = 'tech-a'): SignedInUser =>
  ({ id, role, email: `${id}@example.test`, displayName: id });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const apiError = (status: number, code = 'REQUEST_FAILED', message = 'Temporary failure') => json({ error: { code, message } }, status);

const item = (over: Partial<EquipmentStockItem> = {}): EquipmentStockItem => ({
  id: 'p', name: 'Projector', category: 'AV', isActive: true, totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1,
  operationalQuantity: 7, unavailableQuantity: 3, status: 'PARTLY_UNAVAILABLE', revision: 4, shortfallEventCount: 0,
  updatedAt: '2026-10-26T02:00:00.000Z', ...over,
});
const speaker = item({ id: 's', name: 'Speaker', category: null, totalQuantity: 4, damagedQuantity: 0, maintenanceQuantity: 0,
  operationalQuantity: 4, unavailableQuantity: 0, status: 'AVAILABLE', revision: 0 });
const detail = (over: Partial<EquipmentStockDetail> = {}): EquipmentStockDetail => ({
  item: item(), history: [{ id: 'c1', revision: 4, changedById: 'tech-a', changedByName: 'Taylor', changedAt: '2026-10-25T04:00:00.000Z',
    reason: 'Two dropped.', previous: { totalQuantity: 10, damagedQuantity: 0, maintenanceQuantity: 1 },
    next: { totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1 } }],
  shortfalls: [], ...over,
});

function stub(options: { list?: EquipmentStockItem[]; detail?: EquipmentStockDetail; patch?: () => Response } = {}) {
  const list = options.list ?? [item(), speaker];
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') return options.patch ? options.patch() : json({ ...detail(), changed: true, notifiedEvents: 0 });
    if (url === '/api/equipment/stock') return json({ items: list });
    return json(options.detail ?? detail());
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
async function open(url = '/equipment/stock') {
  const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes });
  await router.push(url); await router.isReady();
  return { ...render(RouterView, { global: { plugins: [router] } }), router };
}
async function edit(name = 'Projector') {
  await fireEvent.click(await screen.findByRole('button', { name: `Update stock for ${name}` }));
  await screen.findByRole('heading', { name: `Update ${name}` });
}
const field = (label: string) => screen.getByRole('textbox', { name: label });
async function type(label: string, value: string) { await fireEvent.update(field(label), value); }
const save = () => screen.getByRole('button', { name: /Save stock change|Saving/ });
beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-18-AC101 route access and session isolation', () => {
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
    'denies %s before fetching any stock', async role => {
      session.user = user(role); const fetch = stub(); await open();
      expect(screen.getByRole('heading', { name: 'Technical support access only' })).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
  it('requires sign-in and waits for session restoration', async () => {
    session.loading = true; const fetch = stub(); await open();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session'); expect(fetch).not.toHaveBeenCalled();
    cleanup(); session.loading = false; session.user = null; await open();
    expect(screen.getByRole('heading', { name: 'Sign in required' })).toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled();
  });
  it('clears an open editor and reloads when the signed-in account changes', async () => {
    stub(); await open(); await edit();
    session.user = user('TECHNICAL_SUPPORT_STAFF', 'tech-b');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Update Projector' })).not.toBeInTheDocument());
    expect(await screen.findByText('Speaker')).toBeInTheDocument();
  });
  it('shows nothing and asks to sign in again after a 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => apiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in.')));
    await open();
    await waitFor(() => expect(session.user).toBeNull());
  });
});

describe('KAN-18-AC1 and AC3 the stock list', () => {
  it('shows every type with its quantities and operational status', async () => {
    stub(); await open();
    const rows = await screen.findAllByRole('listitem');
    const projector = rows.find(row => within(row).queryByRole('heading', { name: 'Projector' }))!;
    expect(within(projector).getByText('Partly unavailable')).toBeInTheDocument();
    expect(projector).toHaveTextContent(/Total\s*10/); expect(projector).toHaveTextContent(/Damaged\s*2/);
    expect(projector).toHaveTextContent(/Maintenance\s*1/); expect(projector).toHaveTextContent(/Usable\s*7/);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
  it('shows the wholly unavailable and out-of-catalogue states', async () => {
    stub({ list: [item({ id: 'x', name: 'Mixer', status: 'UNAVAILABLE', operationalQuantity: 0, isActive: false })] }); await open();
    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Not in the active catalogue/)).toBeInTheDocument();
  });
  it('warns when reservations exceed usable stock', async () => {
    stub({ list: [item({ shortfallEventCount: 2 })] }); await open();
    expect(await screen.findByText('2 events have more reserved than is usable.')).toBeInTheDocument();
    cleanup(); stub({ list: [item({ shortfallEventCount: 1 })] }); await open();
    expect(await screen.findByText('1 event has more reserved than is usable.')).toBeInTheDocument();
  });
  it('explains an empty catalogue, a denied read and a failed load with a retry', async () => {
    stub({ list: [] }); await open();
    expect(await screen.findByText('No equipment types have been set up yet.')).toBeInTheDocument();
    cleanup(); vi.stubGlobal('fetch', vi.fn(async () => apiError(403, 'ACTION_FORBIDDEN', 'No.'))); await open();
    expect(await screen.findByText(/unavailable or you do not have permission/)).toBeInTheDocument();
    const failing = vi.fn().mockResolvedValueOnce(apiError(500, 'X', 'Server down')).mockResolvedValue(json({ items: [speaker] }));
    cleanup(); vi.stubGlobal('fetch', failing); await open();
    expect(await screen.findByText('Server down')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Speaker')).toBeInTheDocument();
  });
  it('refreshes the list on request', async () => {
    const fetch = stub(); await open(); await screen.findByText('Speaker');
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh stock' }));
    await waitFor(() => expect(fetch.mock.calls.filter(call => call[0] === '/api/equipment/stock')).toHaveLength(2));
  });
});

describe('KAN-18-AC2, AC6 and AC101 the update form', () => {
  it('opens with the current quantities, the revision and the recent history', async () => {
    stub(); await open(); await edit();
    expect(field('Total quantity')).toHaveValue('10'); expect(field('Damaged')).toHaveValue('2'); expect(field('Under maintenance')).toHaveValue('1');
    expect(screen.getByText(/Based on revision 4/)).toBeInTheDocument();
    const history = screen.getByRole('list', { name: 'Recent stock changes' });
    expect(history).toHaveTextContent('Damaged 0 → 2'); expect(history).toHaveTextContent('Two dropped.'); expect(history).toHaveTextContent('Taylor');
    expect(screen.getByText('Every reservation of this equipment is covered by the usable stock.')).toBeInTheDocument();
    expect(save()).toBeDisabled();
    expect(screen.getByText('Change at least one quantity to save.')).toBeInTheDocument();
  });
  it('shows the usable quantity as it will be after the change', async () => {
    stub(); await open(); await edit();
    expect(screen.getByText(/Usable after this change/)).toHaveTextContent('7');
    await type('Damaged', '5'); expect(screen.getByText(/Usable after this change/)).toHaveTextContent('4');
    await type('Damaged', '0'); await type('Under maintenance', '0'); expect(screen.getByText(/Usable after this change/)).toHaveTextContent('10');
  });
  it.each([['-1'], ['1.5'], ['abc'], [''], ['1000001']])('refuses %j as a quantity and keeps Save disabled', async value => {
    stub(); await open(); await edit();
    await type('Damaged', value); await type('Under maintenance', '0'); await type('Reason for the change', 'Reason');
    expect(save()).toBeDisabled();
    expect(screen.getByText('Enter a whole number from 0 to 1,000,000.')).toBeInTheDocument();
  });
  it('refuses damaged plus maintenance above the total', async () => {
    stub(); await open(); await edit();
    await type('Damaged', '8'); await type('Under maintenance', '5'); await type('Reason for the change', 'Reason');
    expect(screen.getByText('Damaged plus maintenance cannot be more than the total quantity.')).toBeInTheDocument();
    expect(save()).toBeDisabled(); expect(screen.getByText(/Usable after this change/)).toHaveTextContent('—');
  });
  it('requires a reason of at most 500 characters', async () => {
    stub(); await open(); await edit();
    await type('Damaged', '3');
    expect(save()).toBeDisabled();
    await type('Reason for the change', 'x'.repeat(501));
    expect(screen.getByText('Keep the reason to 500 characters or fewer.')).toBeInTheDocument(); expect(save()).toBeDisabled();
    await type('Reason for the change', '  Dropped in transit ');
    expect(save()).toBeEnabled();
  });
  it('sends the revision the form was based on, the quantities and a trimmed reason, then shows the saved stock', async () => {
    const saved = detail({ item: item({ damagedQuantity: 5, operationalQuantity: 4, revision: 5 }),
      shortfalls: [{ eventId: 'e1', eventName: 'Career fair', startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T06:00:00.000Z',
        reservedQuantity: 7, peakReservedQuantity: 7, operationalQuantity: 4, shortfallQuantity: 3 }] });
    const fetch = stub({ patch: () => json({ ...saved, changed: true, notifiedEvents: 1 }) }); await open(); await edit();
    await type('Damaged', '5'); await type('Reason for the change', '  Fault found in batch  ');
    await fireEvent.click(save());
    const status = await screen.findByText(/Stock saved\./);
    expect(status).toHaveTextContent('1 coordinator was notified of a shortfall.');
    const patch = fetch.mock.calls.find(call => call[1]?.method === 'PATCH')!;
    expect(patch[0]).toBe('/api/equipment/stock/p');
    expect(JSON.parse(patch[1]!.body as string)).toEqual({ expectedRevision: 4, totalQuantity: 10, damagedQuantity: 5,
      maintenanceQuantity: 1, reason: 'Fault found in batch' });
    expect(field('Damaged')).toHaveValue('5'); expect(field('Reason for the change')).toHaveValue('');
    expect(screen.getByText(/Based on revision 5/)).toBeInTheDocument();
    const gaps = screen.getByRole('list', { name: 'Reservations not fully covered' });
    expect(gaps).toHaveTextContent('Career fair'); expect(gaps).toHaveTextContent('3 short'); expect(gaps).toHaveTextContent('7 reserved');
    const row = screen.getAllByRole('listitem').find(entry => within(entry).queryByRole('heading', { name: 'Projector' }))!;
    expect(row).toHaveTextContent(/Damaged\s*5/);
  });
  it('words the notice for several coordinators and for no change', async () => {
    stub({ patch: () => json({ ...detail(), changed: true, notifiedEvents: 3 }) }); await open(); await edit();
    await type('Damaged', '5'); await type('Reason for the change', 'Loss'); await fireEvent.click(save());
    expect(await screen.findByText(/3 coordinators were notified/)).toBeInTheDocument();
    cleanup(); stub({ patch: () => json({ ...detail(), changed: false, notifiedEvents: 0 }) }); await open(); await edit();
    await type('Damaged', '3'); await type('Reason for the change', 'Same'); await fireEvent.click(save());
    expect(await screen.findByText('No change was needed: the stock already matches these quantities.')).toBeInTheDocument();
  });
  it('KAN-18-AC103 explains a stale form and offers to reload the current quantities', async () => {
    const fetch = stub({ patch: () => apiError(409, 'EQUIPMENT_STOCK_REVISION_CONFLICT', 'This stock was changed after you opened it.') });
    await open(); await edit(); await type('Damaged', '5'); await type('Reason for the change', 'Loss'); await fireEvent.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent('This stock was changed after you opened it.');
    fetch.mockImplementation(async (url: string, init?: RequestInit) => init?.method === 'PATCH' ? apiError(500)
      : url === '/api/equipment/stock' ? json({ items: [item({ damagedQuantity: 9, revision: 6 })] })
        : json(detail({ item: item({ damagedQuantity: 9, revision: 6 }) })));
    await fireEvent.click(screen.getByRole('button', { name: 'Reload stock' }));
    await waitFor(() => expect(screen.getByText(/Based on revision 6/)).toBeInTheDocument());
    expect(field('Damaged')).toHaveValue('9');
  });
  it('shows a server refusal and a lost connection without losing what was typed', async () => {
    stub({ patch: () => apiError(400, 'INVALID_EQUIPMENT_STOCK_INPUT', 'Damaged plus maintenance quantities cannot be more than the total quantity.') });
    await open(); await edit(); await type('Damaged', '5'); await type('Reason for the change', 'Loss'); await fireEvent.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot be more than the total quantity');
    expect(field('Damaged')).toHaveValue('5'); expect(field('Reason for the change')).toHaveValue('Loss'); expect(save()).toBeEnabled();
  });
  it('prevents a second save while one is in flight', async () => {
    let release!: (response: Response) => void;
    const fetch = stub({ patch: () => { throw new Error('unused'); } });
    fetch.mockImplementation(async (url: string, init?: RequestInit) => init?.method === 'PATCH'
      ? new Promise<Response>(resolve => { release = resolve; }) : url === '/api/equipment/stock' ? json({ items: [item()] }) : json(detail()));
    await open(); await edit(); await type('Damaged', '5'); await type('Reason for the change', 'Loss');
    await fireEvent.click(save());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled());
    await fireEvent.click(screen.getByRole('button', { name: 'Saving…' }));
    expect(fetch.mock.calls.filter(call => call[1]?.method === 'PATCH')).toHaveLength(1);
    release(json({ ...detail(), changed: true, notifiedEvents: 0 }));
    await screen.findByText(/Stock saved\./);
  });
  it('ignores a save that finishes after another type was opened', async () => {
    let release!: (response: Response) => void;
    const fetch = stub();
    fetch.mockImplementation(async (url: string, init?: RequestInit) => init?.method === 'PATCH'
      ? new Promise<Response>(resolve => { release = resolve; }) : url === '/api/equipment/stock' ? json({ items: [item(), speaker] })
        : url.endsWith('/s') ? json(detail({ item: speaker, history: [] })) : json(detail()));
    await open(); await edit(); await type('Damaged', '5'); await type('Reason for the change', 'Loss'); await fireEvent.click(save());
    await fireEvent.click(await screen.findByRole('button', { name: 'Update stock for Speaker' }));
    await screen.findByRole('heading', { name: 'Update Speaker' });
    release(json({ ...detail({ item: item({ damagedQuantity: 5, revision: 5 }) }), changed: true, notifiedEvents: 0 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.getByRole('heading', { name: 'Update Speaker' })).toBeInTheDocument();
    expect(screen.queryByText(/Stock saved\./)).not.toBeInTheDocument();
    expect(field('Total quantity')).toHaveValue('4');
  });
  it('explains a failed detail load, allows a retry and closes cleanly', async () => {
    const fetch = stub(); await open(); await screen.findByText('Speaker');
    fetch.mockImplementation(async (url: string) => url === '/api/equipment/stock' ? json({ items: [item()] }) : apiError(500, 'X', 'Detail failed'));
    await fireEvent.click(screen.getByRole('button', { name: 'Update stock for Projector' }));
    expect(await screen.findByText('Detail failed')).toBeInTheDocument();
    fetch.mockImplementation(async (url: string) => url === '/api/equipment/stock' ? json({ items: [item()] }) : json(detail()));
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('heading', { name: 'Update Projector' });
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('heading', { name: 'Update Projector' })).not.toBeInTheDocument();
  });
  it('lists an empty history and names an untitled event and an unnamed technician', async () => {
    stub({ detail: detail({ history: [{ id: 'c', revision: 1, changedById: 'z', changedByName: null, changedAt: '2026-10-25T04:00:00.000Z', reason: 'Audit',
      previous: { totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1 }, next: { totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1 } }],
    shortfalls: [{ eventId: 'e', eventName: null, startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T06:00:00.000Z', reservedQuantity: 1,
      peakReservedQuantity: 1, operationalQuantity: 0, shortfallQuantity: 1 }] }) });
    await open(); await edit();
    expect(screen.getByText('Untitled event')).toBeInTheDocument();
    expect(screen.getByText('No quantity change')).toBeInTheDocument();
    expect(screen.getByText(/A Technical Support Staff member/)).toBeInTheDocument();
    cleanup(); stub({ detail: detail({ history: [] }) }); await open(); await edit();
    expect(screen.getByText('No change has been recorded for this equipment type.')).toBeInTheDocument();
  });
});
