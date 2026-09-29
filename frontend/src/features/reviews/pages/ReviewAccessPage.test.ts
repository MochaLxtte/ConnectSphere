import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { router as appRouter } from '../../../app/router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: true });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: SignedInUser | null; loading: boolean };
const paths = ['/reviews', '/reviews/request-1'];
const detail = {
  id: 'request-1', name: 'Private coordinator request', status: 'SUBMITTED',
  organiserId: 'organiser-1', coordinatorId: 'coordinator-1',
  startsAt: null, endsAt: null, registrationRequired: false,
  review: null, actions: { canEditDraft: false, canMakeInitialDecision: true },
};

function user(role: UserRole = 'EVENT_COORDINATOR', id = 'coordinator-1'): SignedInUser {
  return { id, role, email: `${id}@example.test`, displayName: id };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function content(path: string, name = detail.name) {
  return path === '/reviews' ? { items: [{ id: detail.id, name, status: 'SUBMITTED' }] }
    : { ...detail, name };
}

/** `/reviews` loads the pending queue and the KAN-56 decided history; detail pages load once. */
function readsFor(path: string) {
  return path === '/reviews' ? 2 : 1;
}

function respond(path: string, url: unknown, name = detail.name) {
  return jsonResponse(String(url).includes('scope=history') ? { items: [] } : content(path, name));
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((fulfil) => { resolve = fulfil; });
  return { promise, resolve };
}

async function settle(pending: ReturnType<typeof deferredResponse>, response: Response) {
  pending.resolve(response);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function openReview(path: string) {
  // Use the application's real route definitions: direct child-page mounts bypass the gate.
  const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes });
  await router.push(path);
  await router.isReady();
  return render(RouterView, { global: { plugins: [router], stubs: { EventPlanningPanels: true } } });
}

beforeEach(() => {
  session.user = null;
  session.loading = false;
});

describe('KAN-25/KAN-33/KAN-36 coordinator page access', () => {
  for (const path of [...paths, '/reviews/unassigned']) {
    it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
      `does not request or render review data for %s at ${path}`, async (role) => {
        session.user = user(role);
        // Even a successful shared-API response must not expose coordinator UI to another role.
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(content(path)));
        vi.stubGlobal('fetch', fetchMock);
        await openReview(path);

        expect(screen.getByRole('heading', { name: 'Coordinator access only' })).toBeInTheDocument();
        expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
        expect(screen.queryByRole('radio')).not.toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
        if (role === 'EVENT_ORGANISER') {
          expect(screen.getByRole('link', { name: 'Go to your event requests' })).toHaveAttribute('href', '/events');
        }
      },
    );

    it(`offers sign-in without requesting review data at ${path}`, async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await openReview(path);

      expect(screen.getByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }

  for (const path of paths) {
    it(`waits for session restoration before allowing a coordinator at ${path}`, async () => {
      session.user = user();
      session.loading = true;
      const fetchMock = vi.fn().mockImplementation(async (url: unknown) => respond(path, url));
      vi.stubGlobal('fetch', fetchMock);
      await openReview(path);

      expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
      expect(fetchMock).not.toHaveBeenCalled();
      session.loading = false;
      expect(await screen.findByText(detail.name)).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(readsFor(path));
    });

    it(`removes loaded data on sign-out at ${path}`, async () => {
      session.user = user();
      const fetchMock = vi.fn().mockImplementation(async (url: unknown) => respond(path, url));
      vi.stubGlobal('fetch', fetchMock);
      await openReview(path);
      await screen.findByText(detail.name);

      session.user = null;
      await screen.findByRole('heading', { name: 'Sign in required' });
      expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(readsFor(path));
    });

    it(`discards the old coordinator's pending read when the account changes at ${path}`, async () => {
      session.user = user();
      const reads = readsFor(path);
      const oldReads = Array.from({ length: reads }, deferredResponse);
      const newReads = Array.from({ length: reads }, deferredResponse);
      const responses = [...oldReads, ...newReads];
      const fetchMock = vi.fn();
      fetchMock.mockImplementation(() => responses[fetchMock.mock.calls.length - 1]!.promise);
      vi.stubGlobal('fetch', fetchMock);
      await openReview(path);
      const oldSignal = (fetchMock.mock.calls[0]![1] as RequestInit).signal!;

      session.user = user('EVENT_COORDINATOR', 'coordinator-2');
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2 * reads));
      expect(oldSignal.aborted).toBe(true);
      for (const [index, read] of newReads.entries()) {
        await settle(read, respond(path, fetchMock.mock.calls[reads + index]![0], 'New coordinator request'));
      }
      expect(await screen.findByText('New coordinator request')).toBeInTheDocument();

      // A late failure for the previous account must not sign out the new account.
      for (const read of oldReads) {
        await settle(read, jsonResponse({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401));
      }
      expect(session.user?.id).toBe('coordinator-2');
      expect(screen.getByText('New coordinator request')).toBeInTheDocument();
      expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
    });

    it(`aborts a pending read when the account becomes an organiser at ${path}`, async () => {
      session.user = user();
      const pending = deferredResponse();
      const fetchMock = vi.fn().mockReturnValue(pending.promise);
      vi.stubGlobal('fetch', fetchMock);
      await openReview(path);
      const signal = (fetchMock.mock.calls[0]![1] as RequestInit).signal!;

      session.user = user('EVENT_ORGANISER', 'organiser-1');
      await screen.findByRole('heading', { name: 'Coordinator access only' });
      expect(signal.aborted).toBe(true);
      await settle(pending, jsonResponse(content(path)));
      expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(readsFor(path));
    });

    it(`returns to sign-in when the active read reports an expired session at ${path}`, async () => {
      session.user = user();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in again.' },
      }, 401)));
      await openReview(path);

      expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
      expect(session.user).toBeNull();
      expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
    });
  }

  it.each([201, 401])('ignores a late %s decision response after changing coordinators', async (status) => {
    session.user = user();
    const pendingWrite = deferredResponse();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockReturnValueOnce(pendingWrite.promise)
      .mockResolvedValueOnce(jsonResponse({ ...detail, name: 'New coordinator request' }));
    vi.stubGlobal('fetch', fetchMock);
    await openReview('/reviews/request-1');
    await screen.findByText(detail.name);
    await fireEvent.click(screen.getByRole('radio', { name: /^Approve request/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));

    session.user = user('EVENT_COORDINATOR', 'coordinator-2');
    await screen.findByText('New coordinator request');
    await settle(pendingWrite, status === 201 ? jsonResponse({ decision: 'APPROVED' }, 201)
      : jsonResponse({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401));

    expect(session.user?.id).toBe('coordinator-2');
    expect(screen.getByText('New coordinator request')).toBeInTheDocument();
    expect(screen.queryByText('Request approved')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns to sign-in when the current decision request reports an expired session', async () => {
    session.user = user();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401)));
    await openReview('/reviews/request-1');
    await screen.findByText(detail.name);
    await fireEvent.click(screen.getByRole('radio', { name: /^Approve request/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));

    expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
    expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

describe('CF-05 unassigned request access', () => {
  const unassigned = (name = detail.name) => ({ items: [{
    id: detail.id, name, status: 'SUBMITTED', organiserName: 'Test organiser',
    startsAt: null, endsAt: null, expectedAttendance: 25, updatedAt: '2026-09-20T00:00:00Z',
  }] });

  it('waits for a verified coordinator and removes the list on sign-out', async () => {
    session.user = user();
    session.loading = true;
    const fetchMock = vi.fn().mockImplementation(async (path: string) => jsonResponse(
      path === '/api/events/unassigned' ? unassigned() : { items: [user()] },
    ));
    vi.stubGlobal('fetch', fetchMock);
    await openReview('/reviews/unassigned');

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(fetchMock).not.toHaveBeenCalled();
    session.loading = false;
    expect(await screen.findByText(detail.name)).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([path]) => path).sort()).toEqual([
      '/api/events/coordinators', '/api/events/unassigned',
    ]);

    session.user = null;
    await screen.findByRole('heading', { name: 'Sign in required' });
    expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts old account reads and ignores a late failure after changing coordinators', async () => {
    session.user = user();
    const oldRead = deferredResponse();
    const newRead = deferredResponse();
    const fetchMock = vi.fn().mockImplementation((path: string, _init?: RequestInit) => {
      if (path === '/api/events/coordinators') return Promise.resolve(jsonResponse({ items: [user()] }));
      return session.user?.id === 'coordinator-1' ? oldRead.promise : newRead.promise;
    });
    vi.stubGlobal('fetch', fetchMock);
    await openReview('/reviews/unassigned');
    const oldSignal = (fetchMock.mock.calls[0]![1] as RequestInit).signal!;

    session.user = user('EVENT_COORDINATOR', 'coordinator-2');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(oldSignal.aborted).toBe(true);
    await settle(newRead, jsonResponse(unassigned('New coordinator request')));
    expect(await screen.findByText('New coordinator request')).toBeInTheDocument();

    await settle(oldRead, jsonResponse({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' } }, 401));
    expect(session.user?.id).toBe('coordinator-2');
    expect(screen.getByText('New coordinator request')).toBeInTheDocument();
    expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
  });

  it('aborts pending reads when the account becomes an organiser', async () => {
    session.user = user();
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockImplementation((path: string, _init?: RequestInit) => path === '/api/events/unassigned'
      ? pending.promise : Promise.resolve(jsonResponse({ items: [user()] })));
    vi.stubGlobal('fetch', fetchMock);
    await openReview('/reviews/unassigned');
    const signal = (fetchMock.mock.calls[0]![1] as RequestInit).signal!;

    session.user = user('EVENT_ORGANISER', 'organiser-1');
    await screen.findByRole('heading', { name: 'Coordinator access only' });
    expect(signal.aborted).toBe(true);
    await settle(pending, jsonResponse(unassigned()));
    expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns to sign-in when the active unassigned read reports an expired session', async () => {
    session.user = user();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (path: string) => path === '/api/events/unassigned'
      ? jsonResponse({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in again.' } }, 401)
      : jsonResponse({ items: [user()] })));
    await openReview('/reviews/unassigned');

    expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
    expect(session.user).toBeNull();
    expect(screen.queryByText(detail.name)).not.toBeInTheDocument();
  });
});
