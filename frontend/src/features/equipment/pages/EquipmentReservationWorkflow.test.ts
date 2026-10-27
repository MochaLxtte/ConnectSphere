import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { router as appRouter } from '../../../app/router';
import { authSession, type SignedInUser } from '../../auth/session';
import type { EquipmentAvailabilityAssessment, EquipmentAvailabilityContext } from '../api/equipment-availability';
import type { EquipmentReservationContext } from '../api/equipment-reservations';

vi.mock('../../auth/session', async () => {
  const { reactive } = await import('vue'); const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (id = 'tech-a'): SignedInUser => ({ id, role: 'TECHNICAL_SUPPORT_STAFF', email: `${id}@example.test`, displayName: id });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const error = (status: number) => json({ error: { code: 'REQUEST_FAILED', message: 'Refresh failed.' } }, status);
const availabilityUrl = '/api/equipment/availability/events/a', reservationUrl = '/api/equipment/reservations/events/a';
const context = (): EquipmentAvailabilityContext => ({
  event: { id: 'a', name: 'Workshop', status: 'APPROVED', startsAt: '2026-11-01T02:00:00Z', endsAt: '2026-11-01T04:00:00Z', equipmentRequirements: null },
  requirementsVersion: 'v1', equipmentTypes: [{ id: 'p', name: 'Projector', category: 'AV', totalQuantity: 5, damagedQuantity: 0, maintenanceQuantity: 0, isActive: true }],
  savedRequests: [{ id: 'r', equipmentTypeId: 'p', quantity: 3, status: 'REQUESTED', startsAt: '2026-11-01T02:00:00Z', endsAt: '2026-11-01T04:00:00Z', notes: null }],
});
const reservation = (): EquipmentReservationContext => ({ event: context().event, requirementsVersion: 'v1',
  requests: [{ ...context().savedRequests[0]!, equipmentName: 'Projector', canReserve: true, canCancel: false,
    decidedBy: null, decidedAt: null, decisionReason: null, releasedBy: null, releasedAt: null, releaseCause: null, releaseReason: null }],
  readiness: { status: 'PENDING', activeCount: 1, reservedCount: 0, message: 'Reservation pending.' } });
const assessment = (): EquipmentAvailabilityAssessment => ({ eventId: 'a', eventName: 'Workshop', mode: 'saved', advisory: true,
  checkedAt: '2026-10-26T03:00:00Z', startsAt: '2026-11-01T02:00:00Z', endsAt: '2026-11-01T04:00:00Z', outcome: 'FULFILLABLE',
  items: [{ equipmentTypeId: 'p', equipmentTypeName: 'Projector', requestedQuantity: 3, totalQuantity: 5, damagedQuantity: 0,
    maintenanceQuantity: 0, operationalQuantity: 5, peakReservedQuantity: 0, availableQuantity: 5, shortfallQuantity: 0, isActive: true }] });
function deferred() { let resolve!: (value: Response) => void; const promise = new Promise<Response>(done => { resolve = done; }); return { resolve, promise }; }
async function settle(pending: ReturnType<typeof deferred>, response: Response) {
  pending.resolve(response); await new Promise(resolve => setTimeout(resolve, 0));
}
function fixtures(options: { readFailure?: number; pendingRead?: ReturnType<typeof deferred>; pendingCheck?: ReturnType<typeof deferred> } = {}) {
  const data = context(), saved = reservation(); let changed = false;
  const fetch = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    if (url === availabilityUrl && init?.method === 'POST') return options.pendingCheck?.promise ?? json({ assessment: assessment() });
    if (url === reservationUrl) return json(saved);
    if (url === `${reservationUrl}/requests/r/reserve`) {
      changed = true; data.requirementsVersion = 'v2'; data.savedRequests[0]!.status = 'RESERVED';
      saved.requirementsVersion = 'v2'; Object.assign(saved.requests[0]!, { status: 'RESERVED', canReserve: false, canCancel: true });
      saved.readiness = { status: 'READY', activeCount: 1, reservedCount: 1, message: 'Reserved.' };
      return json({ changed: true, context: saved });
    }
    if (url === availabilityUrl && changed) {
      if (options.pendingRead) return options.pendingRead.promise;
      if (options.readFailure) return error(options.readFailure);
    }
    return json(data);
  });
  vi.stubGlobal('fetch', fetch); return { fetch, data, options };
}
async function open() {
  const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes });
  await router.push('/equipment/availability/a'); await router.isReady();
  const view = render(RouterView, { global: { plugins: [router] } }); await screen.findByRole('button', { name: 'Check availability' });
  return { ...view, router };
}
async function reserve() {
  await fireEvent.click(screen.getByRole('button', { name: 'Load saved reservations' }));
  await fireEvent.click(await screen.findByRole('button', { name: 'Reserve Projector request r' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Confirm reservation' }));
}
beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-26 reservation and KAN-9 advisory integration', () => {
  it('invalidates a prior successful check and refreshes its saved status/version after reservation', async () => {
    const fixture = fixtures(); await open(); await fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    await screen.findByRole('heading', { name: 'Fulfillable' }); await reserve();
    await screen.findByText(/Quantity 3 · RESERVED/); expect(screen.queryByRole('heading', { name: 'Fulfillable' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Equipment ready' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Check availability' })); await screen.findByRole('heading', { name: 'Fulfillable' });
    const checks = fixture.fetch.mock.calls.filter(([url, init]) => url === availabilityUrl && init?.method === 'POST');
    expect(JSON.parse(checks.at(-1)![1]!.body as string)).toEqual({ mode: 'saved', requirementsVersion: 'v2' });
  });
  it.each([200, 401])('aborts an in-flight advisory and ignores its late %s after a reservation', async status => {
    const pendingCheck = deferred(), fixture = fixtures({ pendingCheck }); await open();
    await fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    const signal = fixture.fetch.mock.calls.at(-1)![1]!.signal!; await reserve();
    await screen.findByText(/Quantity 3 · RESERVED/); expect(signal.aborted).toBe(true);
    await settle(pendingCheck, status === 401 ? error(401) : json({ assessment: assessment() }));
    expect(screen.queryByRole('heading', { name: 'Fulfillable' })).not.toBeInTheDocument(); expect(session.user).not.toBeNull();
  });
  it('keeps successful reservation feedback but disables checks until a failed availability refresh recovers', async () => {
    const fixture = fixtures({ readFailure: 500 }); await open(); await reserve();
    expect(await screen.findByRole('alert')).toHaveTextContent('availability information could not be refreshed');
    expect(screen.getByText(/reservation saved/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Check availability' })).toBeDisabled();
    fixture.options.readFailure = undefined; await fireEvent.click(screen.getByRole('button', { name: 'Refresh equipment information' }));
    await screen.findByText(/Quantity 3 · RESERVED/); expect(screen.getByRole('button', { name: 'Check availability' })).toBeEnabled();
  });
  it.each([401, 403, 404])('drops protected data after post-mutation source refresh returns %s', async status => {
    fixtures({ readFailure: status }); await open(); await reserve();
    if (status === 401) expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
    else expect(await screen.findByRole('alert')).toHaveTextContent('permission');
    expect(screen.queryByRole('heading', { name: 'Equipment ready' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check availability' })).not.toBeInTheDocument();
  });
  for (const boundary of ['account', 'route', 'refresh'] as const) {
    it.each([200, 401])(`ignores late post-mutation source %s on ${boundary} change`, async status => {
      const pendingRead = deferred(), fixture = fixtures({ pendingRead }); const view = await open(); await reserve();
      await waitFor(() => expect(fixture.fetch.mock.calls.filter(([url, init]) => url === availabilityUrl && init?.method !== 'POST')).toHaveLength(2));
      const signal = fixture.fetch.mock.calls.at(-1)![1]!.signal!;
      fixture.options.pendingRead = undefined;
      if (boundary === 'account') session.user = user('tech-b');
      else if (boundary === 'route') await view.router.push('/equipment/availability/b');
      else await fireEvent.click(screen.getByRole('button', { name: 'Refresh equipment information' }));
      await waitFor(() => expect(signal.aborted).toBe(true));
      const old = context(); old.event.name = 'Old private event'; await settle(pendingRead, status === 401 ? error(401) : json(old));
      expect(screen.queryByText('Old private event')).not.toBeInTheDocument(); expect(session.user).not.toBeNull();
    });
  }
});
