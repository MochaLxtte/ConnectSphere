import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import type { ReviewRequestDetail } from '../../reviews/types';
import EditDraftPage from './EditDraftPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as {
  user: { id: string; email: string; displayName: string; role: 'EVENT_ORGANISER' } | null;
  loading: boolean;
};

function organiser(id = 'organiser-1') {
  return { id, email: `${id}@example.com`, displayName: 'Test organiser', role: 'EVENT_ORGANISER' as const };
}

const draft: ReviewRequestDetail = {
  id: 'a', organiserId: 'organiser-1', coordinatorId: null, status: 'DRAFT',
  name: 'Career fair', purpose: 'Hiring', description: null,
  startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T09:00:00.000Z',
  expectedAttendance: 200, venueRequirements: null, accessibilityNeeds: null,
  equipmentRequirements: null, registrationRequired: null,
  createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-17T17:30:00Z',
  review: null, actions: { canEditDraft: true, canMakeInitialDecision: false },
};
const registration = { registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null };

/** The flat record returned by the PATCH and submit routes. */
function flat(fields: Record<string, unknown> = {}) {
  const { review: _review, actions: _actions, ...record } = draft;
  return { ...record, ...registration, ...fields };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((fulfil) => { resolve = fulfil; });
  return { promise, resolve };
}

async function renderPage(id = 'a') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events/:id/edit', component: EditDraftPage },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  });
  await router.push(`/events/${id}/edit`);
  await router.isReady();
  return { ...render(EditDraftPage, { global: { plugins: [router] } }), router };
}

beforeEach(() => {
  session.user = organiser();
  session.loading = false;
});

describe('CF-03/CF-07 edit draft page', () => {
  it('loads the saved draft into the form', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading your draft…');
    pending.resolve(jsonResponse(draft));

    expect(await screen.findByLabelText(/^Event name/)).toHaveValue('Career fair');
    expect(screen.getByRole('heading', { level: 1, name: 'Edit draft request' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to this request' })).toHaveAttribute('href', '/events/a');
    expect(screen.getByLabelText(/^Starts/)).toHaveValue('2026-10-01T09:00');
    expect(screen.getByLabelText(/^Ends/)).toHaveValue('2026-10-01T17:00');
    expect(screen.getByLabelText(/^Expected attendance/)).toHaveValue(200);
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/events/a');
  });

  it('saves only the edited fields and stays on the page', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(draft))
      .mockResolvedValueOnce(jsonResponse(flat({ venueRequirements: 'Hall A' })));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderPage();

    await fireEvent.update(await screen.findByLabelText(/^Venue requirements/), 'Hall A');
    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved.'));
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/events/a');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))).toEqual({
      venueRequirements: 'Hall A',
    });
    expect(router.currentRoute.value.fullPath).toBe('/events/a/edit');
  });

  it('opens the request after submitting it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(draft))
      .mockResolvedValueOnce(jsonResponse(flat({ status: 'SUBMITTED' })));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));

    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/events/a'));
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/events/a/submit');
  });

  it('shows missing submission details beside their inputs', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(draft))
      .mockResolvedValueOnce(jsonResponse({
        error: { code: 'SUBMISSION_INCOMPLETE', message: 'Incomplete.', missingFields: ['venueRequirements'] },
      }, 400)));
    const { router } = await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Venue requirements');
    expect(screen.getByLabelText(/^Venue requirements/)).toHaveAccessibleDescription(/Complete this before submitting\./);
    expect(router.currentRoute.value.fullPath).toBe('/events/a/edit');
  });

  it('does not offer the form for a request that is no longer a draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      ...draft, status: 'SUBMITTED', actions: { canEditDraft: false, canMakeInitialDecision: false },
    })));
    await renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('no longer a draft');
    expect(screen.getByRole('link', { name: 'View this request' })).toHaveAttribute('href', '/events/a');
    expect(screen.queryByLabelText(/^Event name/)).not.toBeInTheDocument();
  });

  it('treats a hidden or missing request as unavailable without a retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' },
    }, 404)));
    await renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable or you do not have permission to edit it');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('can retry a temporary load failure', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected.' } }, 500))
      .mockResolvedValueOnce(jsonResponse(draft)));
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByLabelText(/^Event name/)).toHaveValue('Career fair');
  });

  it('clears the session and offers sign-in when loading returns 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in.' },
    }, 401)));
    await renderPage();

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
  });

  it('hides the draft and explains an expired session while saving', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(draft))
      .mockResolvedValueOnce(jsonResponse({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in.' },
      }, 401)));
    await renderPage();

    await fireEvent.update(await screen.findByLabelText(/^Event name/), 'Renamed');
    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session has expired.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Event name/)).not.toBeInTheDocument();
  });

  it('clears the draft on sign-out and ignores a pending load', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    session.user = null;

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal?.aborted).toBe(true);
    pending.resolve(jsonResponse(draft));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByLabelText(/^Event name/)).not.toBeInTheDocument();
  });
});
