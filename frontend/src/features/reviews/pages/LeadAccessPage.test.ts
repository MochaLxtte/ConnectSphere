import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { router as appRouter } from '../../../app/router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session';

vi.mock('../../auth/session', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

describe('KAN-65 reassignment session and route lifecycle', () => {
  const record = { id: 'version-one', coordinatorId: 'old', coordinatorName: 'Previous coordinator',
    assignmentMethod: 'MANUAL', assignedById: 'lead-1', assignedByName: 'Lead One', note: null,
    assignedAt: '2026-10-19T01:00:00Z', unassignedAt: null };
  function reads(url: string) {
    if (url.endsWith('/assignments')) return json({ items: [record] });
    if (url.startsWith('/api/events/oversight/')) return json({ ...item, id: url.split('/').pop(),
      name: url.endsWith('/b') ? 'Second event' : item.name, coordinatorId: 'old', coordinatorName: record.coordinatorName,
      assignmentVersion: record.id, actions: { canAssignCoordinator: false, canReassignCoordinator: true } });
    return response(url);
  }
  async function submitHandover() {
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Reassign to' }), 'coordinator');
    await fireEvent.update(screen.getByRole('textbox', { name: 'Reason for reassignment' }), 'Covering leave');
    await fireEvent.click(screen.getByRole('button', { name: 'Reassign coordinator' }));
  }
  it.each([200, 401])('ignores late reassignment HTTP %s after account change and suppresses duplicate clicks', async (status) => {
    const pending = deferred();
    const fetch = vi.fn((url: string, init?: RequestInit) => init?.method === 'POST' ? pending.promise : reads(url));
    vi.stubGlobal('fetch', fetch); await open('/lead/oversight/a'); await submitHandover();
    await fireEvent.click(screen.getByRole('button', { name: 'Saving…' }));
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    const signal = fetch.mock.calls.find(([, init]) => init?.method === 'POST')![1]!.signal!;
    session.user = user('EVENT_COORDINATOR_LEAD', 'lead-2');
    await screen.findByRole('button', { name: 'Reassign coordinator' }); expect(signal.aborted).toBe(true);
    await settle(pending, status === 200 ? json({ eventRequestId: 'a', assignmentId: 'version-two',
      coordinatorId: 'coordinator', previousCoordinatorId: 'old', changed: true })
      : json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401));
    expect(session.user?.id).toBe('lead-2'); expect(screen.queryByText(/Reassigned from/)).not.toBeInTheDocument();
  });
  it('ignores a saved handover response after navigation to another event', async () => {
    const pending = deferred();
    const fetch = vi.fn((url: string, init?: RequestInit) => init?.method === 'POST' ? pending.promise : reads(url));
    vi.stubGlobal('fetch', fetch); const { router } = await open('/lead/oversight/a'); await submitHandover();
    await router.push('/lead/oversight/b'); await screen.findByText('Second event');
    await settle(pending, json({ eventRequestId: 'a', assignmentId: 'version-two', coordinatorId: 'coordinator',
      previousCoordinatorId: 'old', changed: true }));
    expect(screen.queryByText(/Reassigned from/)).not.toBeInTheDocument();
    expect(screen.getByText('Second event')).toBeInTheDocument();
  });
  it('clears an expired session on reassignment', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => init?.method === 'POST'
      ? json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401) : reads(url)));
    await open('/lead/oversight/a'); await submitHandover();
    expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
  });
  it('removes the protected detail when access is denied during handover refresh', async () => {
    let denied = false;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') { denied = true; return json({ error: { code: 'ASSIGNMENT_FORBIDDEN', message: 'Denied' } }, 403); }
      return denied ? json({ error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'Unavailable' } }, 404) : reads(url);
    }));
    await open('/lead/oversight/a'); await submitHandover();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('unavailable'));
    expect(screen.queryByText(item.name)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reassign coordinator' })).not.toBeInTheDocument();
  });
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
function user(role: UserRole = 'EVENT_COORDINATOR_LEAD', id = 'lead-1'): SignedInUser {
  return { id, role, displayName: id, email: `${id}@example.test` };
}
const item = { id: 'a', name: 'Lead allocation event', status: 'SUBMITTED', organiserName: 'Organiser',
  startsAt: null, endsAt: null, expectedAttendance: 50, updatedAt: '2026-10-19T01:00:00Z',
  coordinatorId: null, coordinatorName: null, purpose: null, description: null, venueRequirements: null,
  accessibilityNeeds: null, equipmentRequirements: null, registrationRequired: false,
  actions: { canAssignCoordinator: true } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
async function settle(pending: ReturnType<typeof deferred>, response: Response) {
  pending.resolve(response);
  await new Promise((done) => setTimeout(done, 0));
}
async function open(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes });
  await router.push(path);
  await router.isReady();
  const view = render(RouterView, { global: { plugins: [router] } });
  return { ...view, router };
}
function response(path: string, name = item.name) {
  if (path === '/api/events/coordinators') return json({ items: [{ id: 'coordinator', displayName: 'Casey', email: 'casey@example.test' }] });
  if (path.endsWith('/assignments')) return json({ items: [] });
  if (path.startsWith('/api/events/oversight/')) return json({ ...item, name });
  return json({ items: [{ ...item, name }] });
}
beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-79 Lead route isolation and session safety', () => {
  const paths = ['/lead', '/lead/oversight', '/lead/oversight/a', '/reviews/unassigned'];
  for (const path of paths) {
    it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
      `denies %s without reading allocation data at ${path}`, async (role) => {
        session.user = user(role);
        const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
        await open(path);
        expect(screen.getByRole('heading', { name: 'Lead access only' })).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
      });
    it(`requires sign-in at ${path}`, async () => {
      session.user = null;
      const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
      await open(path);
      expect(screen.getByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
  }
  for (const path of ['/lead', '/lead/oversight', '/lead/oversight/a']) {
    it(`waits for restoration and removes loaded data after sign-out at ${path}`, async () => {
      session.loading = true;
      const fetch = vi.fn(async (url: string) => response(url)); vi.stubGlobal('fetch', fetch);
      await open(path);
      expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
      expect(fetch).not.toHaveBeenCalled();
      session.loading = false;
      await screen.findByText(item.name);
      session.user = null;
      await screen.findByRole('heading', { name: 'Sign in required' });
      expect(screen.queryByText(item.name)).not.toBeInTheDocument();
    });
    it(`ignores a late 401 read from the previous account at ${path}`, async () => {
      const pending = deferred();
      const fetch = vi.fn((url: string) => url === '/api/events/coordinators' ? response(url)
        : session.user?.id === 'lead-1' ? pending.promise : response(url, 'New account event'));
      vi.stubGlobal('fetch', fetch);
      await open(path);
      const oldSignal = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal!;
      session.user = user('EVENT_COORDINATOR_LEAD', 'lead-2');
      await screen.findByText('New account event');
      expect(oldSignal.aborted).toBe(true);
      await settle(pending, json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401));
      expect(session.user?.id).toBe('lead-2');
      expect(screen.getByText('New account event')).toBeInTheDocument();
    });
    it(`clears a current expired session at ${path}`, async () => {
      vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401)));
      await open(path);
      expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
    });
    it(`removes data on same-account role loss at ${path}`, async () => {
      vi.stubGlobal('fetch', vi.fn(async (url: string) => response(url)));
      await open(path);
      await screen.findByText(item.name);
      session.user = user('EVENT_COORDINATOR');
      expect(await screen.findByRole('heading', { name: 'Lead access only' })).toBeInTheDocument();
      expect(screen.queryByText(item.name)).not.toBeInTheDocument();
    });
  }
  it.each([200, 401])('ignores a late queue assignment %s response after account change', async (status) => {
    const pending = deferred();
    const fetch = vi.fn((url: string, init?: RequestInit) => init?.method === 'PUT' ? pending.promise : response(url));
    vi.stubGlobal('fetch', fetch);
    await open('/lead');
    await fireEvent.update(await screen.findByRole('combobox'), 'coordinator');
    await fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Assigning…' }));
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
    session.user = user('EVENT_COORDINATOR_LEAD', 'lead-2');
    await screen.findByRole('button', { name: 'Assign' });
    await settle(pending, status === 200 ? json({}) : json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401));
    expect(session.user?.id).toBe('lead-2');
    expect(screen.queryByText(/is now assigned/)).not.toBeInTheDocument();
  });
  it.each([200, 401])('ignores a late detail assignment %s response after account change', async (status) => {
    const pending = deferred();
    const fetch = vi.fn((url: string, init?: RequestInit) => init?.method === 'PUT' ? pending.promise : response(url));
    vi.stubGlobal('fetch', fetch);
    await open('/lead/oversight/a');
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Assign to' }), 'coordinator');
    await fireEvent.click(screen.getByRole('button', { name: 'Assign coordinator' }));
    const writeSignal = fetch.mock.calls.find(([, init]) => init?.method === 'PUT')![1]!.signal!;
    session.user = user('EVENT_COORDINATOR_LEAD', 'lead-2');
    await screen.findByRole('button', { name: 'Assign coordinator' });
    expect(writeSignal.aborted).toBe(true);
    await settle(pending, status === 200 ? json({}) : json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401));
    expect(session.user?.id).toBe('lead-2');
    expect(screen.queryByText(/is now the coordinator/)).not.toBeInTheDocument();
  });
  it('clears the current session when an allocation write expires', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => init?.method === 'PUT'
      ? json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401) : response(url)));
    await open('/lead/oversight/a');
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Assign to' }), 'coordinator');
    await fireEvent.click(screen.getByRole('button', { name: 'Assign coordinator' }));
    expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
  });
  it('ignores old detail responses when navigating between requests', async () => {
    const pending = deferred();
    vi.stubGlobal('fetch', vi.fn((url: string) => url === '/api/events/oversight/a' ? pending.promise : response(url, 'Second event')));
    const { router } = await open('/lead/oversight/a');
    await router.push('/lead/oversight/b');
    await screen.findByText('Second event');
    await settle(pending, json(item));
    expect(screen.queryByText(item.name)).not.toBeInTheDocument();
  });
  it('shows overview allocation and read-only detail without coordinator workflow controls', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => response(url)));
    const { router } = await open('/lead/oversight');
    expect(await screen.findByText('Unassigned')).toBeInTheDocument();
    await router.push('/lead/oversight/a');
    await screen.findByRole('combobox', { name: 'Assign to' });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mark as under review|Request clarification|Submit booking|Reassign/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /suitability|booking/i })).not.toBeInTheDocument();
  });
  it('shows unavailable detail without a retry button on 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'Missing' } }, 404)));
    await open('/lead/oversight/a');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
  it.each([false, true])('refreshes saved allocation and read-only history (first refresh fails: %s)', async (failRefresh) => {
    let assigned = false;
    let detailReads = 0;
    const fetch = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') { assigned = true; return json({ coordinatorId: 'coordinator' }); }
      if (url === '/api/events/oversight/a') {
        detailReads += 1;
        if (failRefresh && detailReads === 2) return json({ error: { code: 'INTERNAL_ERROR', message: 'Temporary failure' } }, 500);
        return json({ ...item, purpose: 'Community event', description: 'A family event', venueRequirements: 'Chairs',
          accessibilityNeeds: 'Ramp', equipmentRequirements: 'Speakers', startsAt: '2026-11-01T01:00:00Z',
          endsAt: '2026-11-01T03:00:00Z', registrationRequired: true,
          coordinatorId: assigned ? 'coordinator' : null, coordinatorName: assigned ? 'Casey' : null,
          actions: { canAssignCoordinator: !assigned } });
      }
      if (url.endsWith('/assignments')) return json({ items: assigned ? [{
        id: 'assignment', coordinatorId: 'coordinator', coordinatorName: 'Casey', assignmentMethod: 'MANUAL',
        assignedById: 'lead-1', assignedByName: 'Lead One', note: null, assignedAt: '2026-10-19T01:00:00Z', unassignedAt: null,
      }] : [] });
      return response(url);
    });
    vi.stubGlobal('fetch', fetch);
    await open('/lead/oversight/a');
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Assign to' }), 'coordinator');
    await fireEvent.click(screen.getByRole('button', { name: 'Assign coordinator' }));
    expect(await screen.findByText(/Assigned by Lead One on/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assignment history' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('Approved', { exact: true })).not.toBeInTheDocument();
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
    expect(detailReads).toBe(failRefresh ? 3 : 2);
  });
  it('retries a failed detail read', async () => {
    let failed = true;
    vi.stubGlobal('fetch', vi.fn((url: string) => failed
      ? json({ error: { code: 'INTERNAL_ERROR', message: 'Temporary failure' } }, 500) : response(url)));
    await open('/lead/oversight/a');
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporary failure');
    failed = false;
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(item.name)).toBeInTheDocument();
  });
  it('retries failed overview loading and shows an empty result', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ error: { code: 'INTERNAL_ERROR', message: 'Try later' } }, 500))
      .mockResolvedValue(json({ items: [] }));
    vi.stubGlobal('fetch', fetch);
    await open('/lead/oversight');
    await fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No active events.')).toBeInTheDocument();
  });
});
