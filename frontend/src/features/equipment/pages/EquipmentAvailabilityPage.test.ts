import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { router as appRouter } from '../../../app/router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session';
import type { EquipmentAvailabilityAssessment, EquipmentAvailabilityContext } from '../api/equipment-availability';

vi.mock('../../auth/session', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'TECHNICAL_SUPPORT_STAFF', id = 'tech-a'): SignedInUser =>
  ({ id, role, email: `${id}@example.test`, displayName: id });
const base = '/api/equipment/availability/events';
const path = '/equipment/availability';
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const apiError = (status: number, code = 'REQUEST_FAILED', message = 'Temporary failure') => json({ error: { code, message } }, status);
const context = (): EquipmentAvailabilityContext => ({
  event: { id: 'a', name: 'Technology fair', status: 'APPROVED', startsAt: '2026-11-01T02:00:00.123456Z',
    endsAt: '2026-11-01T04:00:00.123456Z', equipmentRequirements: 'Projectors for workshops. Confirm exact quantities.' },
  requirementsVersion: 'v1', equipmentTypes: [{ id: 'p', name: 'Projector', category: 'AV', totalQuantity: 10,
    damagedQuantity: 2, maintenanceQuantity: 1, isActive: true },
  { id: 's', name: 'Speaker', category: null, totalQuantity: 4, damagedQuantity: 0, maintenanceQuantity: 0, isActive: false }],
  savedRequests: [{ id: 'r', equipmentTypeId: 'p', quantity: 3, status: 'REQUESTED',
    startsAt: '2026-11-01T02:00:00.123456Z', endsAt: '2026-11-01T04:00:00.123456Z', notes: 'Workshop rooms' }],
});
const result = (): EquipmentAvailabilityAssessment => ({ eventId: 'a', eventName: 'Technology fair', mode: 'saved',
  startsAt: '2026-11-01T02:00:00Z', endsAt: '2026-11-01T04:00:00Z', checkedAt: '2026-10-26T02:00:00Z',
  advisory: true, outcome: 'FULFILLABLE', items: [{ equipmentTypeId: 'p', equipmentTypeName: 'Projector',
    requestedQuantity: 3, totalQuantity: 10, damagedQuantity: 2, maintenanceQuantity: 1, operationalQuantity: 7,
    peakReservedQuantity: 4, availableQuantity: 3, shortfallQuantity: 0, isActive: true }] });
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
async function settle(pending: ReturnType<typeof deferred>, response: Response) {
  pending.resolve(response); await new Promise((resolve) => setTimeout(resolve, 0));
}
async function open(url = `${path}/a`) {
  const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes });
  await router.push(url); await router.isReady();
  return { ...render(RouterView, { global: { plugins: [router] } }), router };
}
function fixtures(data = context(), assessed = result()) {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => init?.method === 'POST'
    ? json({ assessment: assessed }) : url === base ? json({ items: [data.event] }) : json(data));
  vi.stubGlobal('fetch', fetch); return fetch;
}
async function checkSaved() { await fireEvent.click(await screen.findByRole('button', { name: 'Check availability' })); }
async function fillWhatIf() {
  await fireEvent.click(await screen.findByRole('radio', { name: 'Unsaved what-if check' }));
  await fireEvent.update(screen.getByRole('combobox', { name: 'Equipment type 1' }), 'p');
  await fireEvent.update(screen.getByRole('textbox', { name: 'Quantity 1' }), '3');
}
beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-9 technical support route and session isolation', () => {
  for (const url of [path, `${path}/a`]) {
    it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'ATTENDEE'] as const)(
      `denies %s before fetching equipment data at ${url}`, async (role) => {
        session.user = user(role); const fetch = fixtures(); await open(url);
        expect(screen.getByRole('heading', { name: 'Technical support access only' })).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
      });
    it(`requires sign-in and waits for session restoration at ${url}`, async () => {
      session.loading = true; const fetch = fixtures(); await open(url);
      expect(screen.getByRole('status')).toHaveTextContent('Checking your session'); expect(fetch).not.toHaveBeenCalled();
      session.loading = false; await screen.findByText('Technology fair');
      session.user = null; await screen.findByRole('heading', { name: 'Sign in required' });
      expect(screen.queryByText('Technology fair')).not.toBeInTheDocument();
    });
    it(`removes loaded private data after role loss at ${url}`, async () => {
      fixtures(); await open(url); await screen.findByText('Technology fair');
      session.user = user('EVENT_ORGANISER'); await screen.findByRole('heading', { name: 'Technical support access only' });
      expect(screen.queryByText('Technology fair')).not.toBeInTheDocument();
    });
    it.each([200, 401])(`ignores an old account read with status %s at ${url}`, async (status) => {
      const pending = deferred(); const data = context(); data.event.name = 'New account event';
      const fetch = vi.fn((endpoint: string) => session.user?.id === 'tech-a' ? pending.promise
        : json(endpoint === base ? { items: [data.event] } : data));
      vi.stubGlobal('fetch', fetch); await open(url);
      const signal = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal!;
      session.user = user('TECHNICAL_SUPPORT_STAFF', 'tech-b'); await screen.findByText('New account event');
      expect(signal.aborted).toBe(true);
      await settle(pending, status === 401 ? apiError(401) : json(url === path ? { items: [context().event] } : context()));
      expect(session.user?.id).toBe('tech-b'); expect(screen.queryByText('Technology fair')).not.toBeInTheDocument();
    });
    it(`clears a current expired session at ${url}`, async () => {
      vi.stubGlobal('fetch', vi.fn(async () => apiError(401))); await open(url);
      expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
    });
    it(`retries a transient read and handles permission errors at ${url}`, async () => {
      const fetch = vi.fn().mockResolvedValueOnce(apiError(500)).mockResolvedValue(apiError(403)); vi.stubGlobal('fetch', fetch);
      await open(url); await fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('permission'));
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });
  }
  it('lists eligible events and opens only the minimal equipment context', async () => {
    const fetch = fixtures(); const { router } = await open(path);
    expect(await screen.findByRole('link', { name: 'Technology fair' })).toHaveAttribute('href', `${path}/a`);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    await router.push(`${path}/a`); await screen.findByRole('heading', { name: 'Saved equipment requests' });
    expect(screen.queryByRole('link', { name: /review/i })).not.toBeInTheDocument();
    expect(fetch.mock.calls.every(([url]) => url.startsWith(base))).toBe(true);
  });
  it('refreshes the list into an explicit empty state', async () => {
    const fetch = fixtures(); await open(path); await screen.findByText('Technology fair');
    fetch.mockResolvedValue(json({ items: [] })); await fireEvent.click(screen.getByRole('button', { name: 'Refresh events' }));
    expect(await screen.findByText('No approved or confirmed events are available to check.')).toBeInTheDocument();
    expect(screen.queryByText('Technology fair')).not.toBeInTheDocument();
  });
  it('shows a fallback title for an unnamed event without inventing requirements', async () => {
    const data = context(); data.event.name = null; data.event.equipmentRequirements = null;
    data.savedRequests[0]!.equipmentTypeId = 'removed'; data.savedRequests[0]!.notes = null;
    const fetch = fixtures(data); const { router } = await open(path);
    expect(await screen.findByRole('link', { name: 'Untitled event' })).toBeInTheDocument();
    await router.push(`${path}/a`); await screen.findByRole('heading', { name: 'Untitled event' });
    expect(screen.getByText('Unavailable equipment type')).toBeInTheDocument();
    expect(screen.getByText('Not provided')).toBeInTheDocument(); expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('KAN-9 equipment checks and result lifecycle', () => {
  it('displays saved requirements and sends only the source version for a saved check', async () => {
    const fetch = fixtures(); await open(); await checkSaved();
    const assessment = await screen.findByRole('region', { name: 'Equipment assessment' });
    expect(within(assessment).getByRole('heading', { name: 'Fulfillable' })).toHaveClass('outcome-fulfillable');
    expect(screen.getByText('Workshop rooms')).toBeInTheDocument();
    expect(screen.getByText(/Quantity 3 · REQUESTED/)).toBeInTheDocument();
    expect(within(assessment).getByText(/Advisory only/)).toBeInTheDocument();
    expect(within(assessment).getByText(/26 Oct 2026, 10:00 am/)).toBeInTheDocument();
    expect(within(assessment).getByRole('row', { name: 'Projector 3 10 2 1 7 4 3 0 Available' })).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[1]![1]!.body as string)).toEqual({ mode: 'saved', requirementsVersion: 'v1' });
  });
  it('uses explicit unsaved quantities and precision-preserving hypothetical times without parsing free text', async () => {
    const data = context(); data.savedRequests = []; const fetch = fixtures(data, { ...result(), mode: 'what-if' });
    await open(); await fillWhatIf();
    expect(screen.getByRole('radio', { name: 'Saved equipment requests' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Check starts (Singapore time)' })).toHaveValue('2026-11-01T10:00:00.123456');
    await fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    await screen.findByRole('heading', { name: 'Fulfillable' });
    expect(JSON.parse(fetch.mock.calls[1]![1]!.body as string)).toEqual({ mode: 'what-if', requirementsVersion: 'v1',
      startsAt: '2026-11-01T10:00:00.123456+08:00', endsAt: '2026-11-01T12:00:00.123456+08:00', items: [{ equipmentTypeId: 'p', quantity: 3 }] });
    expect(screen.getByText(/does not save requirements/)).toBeInTheDocument();
  });
  it('highlights the specific shortfall in text and colour, including inactive stock', async () => {
    const assessed = result(); assessed.outcome = 'SHORTFALL';
    assessed.items.push({ ...assessed.items[0]!, equipmentTypeId: 's', equipmentTypeName: 'Speaker', isActive: false,
      operationalQuantity: 0, availableQuantity: 0, shortfallQuantity: 3 });
    fixtures(context(), assessed); await open(); await checkSaved();
    expect(await screen.findByRole('heading', { name: 'Shortfall / Unfulfillable' })).toHaveClass('outcome-shortfall');
    expect(screen.getByRole('row', { name: /Speaker \(inactive\).*Shortfall/ })).toHaveClass('shortfall-row');
    expect(screen.queryByRole('heading', { name: 'Fulfillable' })).not.toBeInTheDocument();
  });
  it('never shows green for empty or contradictory assessment items', async () => {
    const assessed = result(); assessed.items[0]!.shortfallQuantity = 1;
    const fetch = fixtures(context(), assessed); await open(); await checkSaved();
    await screen.findByRole('heading', { name: 'Shortfall / Unfulfillable' });
    fetch.mockResolvedValue(json({ assessment: { ...result(), items: [] } }));
    await fireEvent.click(screen.getByRole('button', { name: 'Recheck availability' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No equipment items were assessed');
    expect(screen.queryByRole('region', { name: 'Equipment assessment' })).not.toBeInTheDocument();
  });
  it('does not check an empty catalogue', async () => {
    const data = context(); data.equipmentTypes = []; const fetch = fixtures(data);
    await open(); expect(await screen.findByText('No equipment types are available. Refresh after the catalogue is updated.')).toBeInTheDocument();
    await checkSaved(); expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { name: 'Fulfillable' })).not.toBeInTheDocument();
  });
  it('validates impossible dates, range and quantities at the fields without sending a check', async () => {
    const fetch = fixtures(); await open(); await fillWhatIf();
    await fireEvent.update(screen.getByRole('textbox', { name: 'Check starts (Singapore time)' }), '2026-02-30T10:00');
    await fireEvent.update(screen.getByRole('textbox', { name: 'Quantity 1' }), '1.5');
    await checkSaved();
    expect(screen.getByRole('textbox', { name: 'Check starts (Singapore time)' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Enter a valid start/)).toBeInTheDocument(); expect(screen.getByText(/Enter a whole quantity/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    await fireEvent.update(screen.getByRole('textbox', { name: 'Check starts (Singapore time)' }), '2026-11-01T12:00:00.123456');
    expect(screen.getByText('End must be after start.')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Remove equipment item 1' })); await checkSaved();
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one');
    await fireEvent.click(screen.getByRole('button', { name: 'Add equipment item' }));
    expect(screen.getByText('Choose an equipment type.')).toBeInTheDocument();
  });
  it.each(['mode', 'quantity', 'type', 'start', 'end', 'add', 'remove'])(
    'clears a prior success after changing %s', async (field) => {
      fixtures(); await open(); await fillWhatIf(); await checkSaved(); await screen.findByRole('heading', { name: 'Fulfillable' });
      if (field === 'mode') await fireEvent.click(screen.getByRole('radio', { name: 'Saved equipment requests' }));
      if (field === 'quantity') await fireEvent.update(screen.getByRole('textbox', { name: 'Quantity 1' }), '4');
      if (field === 'type') await fireEvent.update(screen.getByRole('combobox', { name: 'Equipment type 1' }), 's');
      if (field === 'start') await fireEvent.update(screen.getByRole('textbox', { name: 'Check starts (Singapore time)' }), '2026-11-01T09:00');
      if (field === 'end') await fireEvent.update(screen.getByRole('textbox', { name: 'Check ends (Singapore time)' }), '2026-11-01T13:00');
      if (field === 'add') await fireEvent.click(screen.getByRole('button', { name: 'Add equipment item' }));
      if (field === 'remove') await fireEvent.click(screen.getByRole('button', { name: 'Remove equipment item 1' }));
      expect(screen.queryByRole('region', { name: 'Equipment assessment' })).not.toBeInTheDocument();
    });
  it('refreshes changed source requirements and clears hypothetical inputs on 409', async () => {
    const data = context(); data.requirementsVersion = 'v2'; data.event.equipmentRequirements = 'Updated requirements';
    const fetch = vi.fn().mockResolvedValueOnce(json(context())).mockResolvedValueOnce(apiError(409, 'EQUIPMENT_CONTEXT_CHANGED'))
      .mockResolvedValueOnce(json(data)).mockResolvedValue(json({ assessment: result() }));
    vi.stubGlobal('fetch', fetch); await open(); await fillWhatIf(); await checkSaved();
    expect(await screen.findByText('Updated requirements')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Unsaved inputs have been cleared');
    expect(screen.getByRole('radio', { name: 'Saved equipment requests' })).toBeChecked();
    await checkSaved(); await screen.findByRole('heading', { name: 'Fulfillable' });
    expect(JSON.parse(fetch.mock.calls[3]![1].body)).toEqual({ mode: 'saved', requirementsVersion: 'v2' });
  });
  it.each([400, 409, 500])('recheck error %s clears old success and allows retry', async (status) => {
    const fetch = fixtures(); await open(); await checkSaved(); await screen.findByRole('heading', { name: 'Fulfillable' });
    fetch.mockResolvedValueOnce(apiError(status)); await fireEvent.click(screen.getByRole('button', { name: 'Recheck availability' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporary failure');
    expect(screen.queryByRole('region', { name: 'Equipment assessment' })).not.toBeInTheDocument();
    await checkSaved(); expect(await screen.findByRole('heading', { name: 'Fulfillable' })).toBeInTheDocument();
  });
  it.each([403, 404])('removes protected context on check denial %s', async (status) => {
    const fetch = fixtures(); await open(); await screen.findByText('Technology fair'); fetch.mockResolvedValue(apiError(status));
    await checkSaved(); expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.queryByText('Technology fair')).not.toBeInTheDocument();
  });
  it('clears the current session if the check expires', async () => {
    const fetch = fixtures(); await open(); await screen.findByText('Technology fair'); fetch.mockResolvedValue(apiError(401));
    await checkSaved(); expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
  });
  it.each(['input', 'account', 'route', 'refresh', 'leave'])('ignores a late check after %s changes', async (change) => {
    const pending = deferred();
    const fetch = vi.fn((url: string, init?: RequestInit) => init?.method === 'POST' ? pending.promise
      : json(url === base ? { items: [] } : { ...context(), event: { ...context().event, id: url.split('/').pop() } }));
    vi.stubGlobal('fetch', fetch); const { router } = await open(); await fillWhatIf(); await checkSaved();
    await fireEvent.click(screen.getByRole('button', { name: 'Checking availability…' }));
    const writes = fetch.mock.calls.filter(([, init]) => init?.method === 'POST'); expect(writes).toHaveLength(1);
    if (change === 'input') await fireEvent.update(screen.getByRole('textbox', { name: 'Quantity 1' }), '4');
    if (change === 'account') session.user = user('TECHNICAL_SUPPORT_STAFF', 'tech-b');
    if (change === 'route') await router.push(`${path}/b`);
    if (change === 'refresh') await fireEvent.click(screen.getByRole('button', { name: 'Refresh equipment information' }));
    if (change === 'leave') await router.push(path);
    await waitFor(() => expect(writes[0]![1]!.signal!.aborted).toBe(true));
    await settle(pending, change === 'account' ? apiError(401) : json({ assessment: result() }));
    expect(screen.queryByRole('region', { name: 'Equipment assessment' })).not.toBeInTheDocument();
    if (change === 'account') expect(session.user?.id).toBe('tech-b');
  });
  it('ignores duplicate form submissions while the check is pending', async () => {
    const pending = deferred();
    const fetch = vi.fn((_url: string, init?: RequestInit) => init?.method === 'POST' ? pending.promise : json(context()));
    vi.stubGlobal('fetch', fetch); const view = await open(); await checkSaved();
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    await settle(pending, json({ assessment: result() }));
    expect(await screen.findByRole('heading', { name: 'Fulfillable' })).toBeInTheDocument();
  });
  it('ignores a late context response after navigating to another event', async () => {
    const pending = deferred(); const data = context(); data.event.name = 'Second event';
    vi.stubGlobal('fetch', vi.fn((url: string) => url === `${base}/a` ? pending.promise : json(data)));
    const { router } = await open(); await router.push(`${path}/b`); await screen.findByText('Second event');
    await settle(pending, json(context())); expect(screen.queryByText('Technology fair')).not.toBeInTheDocument();
  });
});
