import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import EventDraftEditPage from './EventDraftEditPage.vue';

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

/** Shared `GET /api/events/:id` response. Includes the CF-18 registration window/capacity
 *  fields the backend already returns, even though the frontend's ReviewRequestDetail type
 *  does not declare them — EventRequestForm reads them structurally at runtime regardless. */
const draft = {
  id: 'a', organiserId: 'organiser-1', coordinatorId: null, status: 'DRAFT',
  name: 'Career fair', purpose: 'Hiring', description: 'Annual fair',
  startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T09:00:00.000Z',
  expectedAttendance: 200, venueRequirements: 'Hall A', accessibilityNeeds: 'Wheelchair access',
  equipmentRequirements: 'Projector', registrationRequired: true,
  registrationCapacity: 50, registrationOpensAt: '2026-09-15T00:00:00.000Z',
  registrationClosesAt: '2026-09-29T00:00:00.000Z',
  createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-17T17:30:00Z',
  review: null, actions: { canEditDraft: true, canMakeInitialDecision: false },
};

/** `PATCH`/`POST .../submit` write-response shape: a plain draft record, no `actions`/`review`. */
const draftRecord = {
  id: 'a', organiserId: 'organiser-1', coordinatorId: null, status: 'DRAFT',
  name: 'Career fair', purpose: 'Hiring', description: 'Annual fair',
  startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T09:00:00.000Z',
  expectedAttendance: 200, venueRequirements: 'Hall B', accessibilityNeeds: 'Wheelchair access',
  equipmentRequirements: 'Projector', registrationRequired: true,
  registrationCapacity: 50, registrationOpensAt: '2026-09-15T00:00:00.000Z',
  registrationClosesAt: '2026-09-29T00:00:00.000Z',
  createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-17T17:30:00Z',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function renderEditPage(id = 'a') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events/:id/edit', component: EventDraftEditPage },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  });
  await router.push(`/events/${id}/edit`);
  await router.isReady();
  // Mount through a real router-view so navigating away actually unmounts this page.
  return { ...render({ template: '<router-view />' }, { global: { plugins: [router] } }), router };
}

beforeEach(() => {
  session.user = organiser();
  session.loading = false;
});

describe('KAN-34 draft editing', () => {
  it('loads the shared request form pre-filled with the saved draft, including registration settings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(draft)));
    await renderEditPage();

    expect(await screen.findByDisplayValue('Career fair')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Purpose/)).toHaveValue('Hiring');
    expect(screen.getByLabelText(/^Starts/)).toHaveValue('2026-10-01T09:00');
    expect(screen.getByLabelText(/^Expected attendance/)).toHaveValue(200);
    // The fields this page was previously missing entirely:
    expect(screen.getByRole('radio', { name: 'Registration required' })).toBeChecked();
    expect(screen.getByLabelText(/^Registration capacity/)).toHaveValue(50);
    expect(screen.getByLabelText(/^Registration opens/)).toHaveValue('2026-09-15T08:00');
    expect(screen.getByLabelText(/^Registration closes/)).toHaveValue('2026-09-29T08:00');
  });

  it('shows a not-editable message instead of a form once the request is no longer a draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      ...draft, status: 'SUBMITTED', actions: { canEditDraft: false, canMakeInitialDecision: false },
    })));
    await renderEditPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This request is no longer a draft and can no longer be edited here.',
    );
    expect(screen.getByRole('link', { name: 'View request' })).toHaveAttribute('href', '/events/a');
    expect(screen.queryByLabelText(/^Event name/)).not.toBeInTheDocument();
  });

  it('saves changes and submits through the shared form, then navigates to the read-only detail page', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(draft))
      .mockResolvedValueOnce(jsonResponse(draftRecord))
      .mockResolvedValueOnce(jsonResponse({ ...draftRecord, status: 'SUBMITTED' }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderEditPage();
    await screen.findByDisplayValue('Career fair');

    await fireEvent.update(screen.getByLabelText(/^Venue requirements/), 'Hall B');
    await fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }));

    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/events/a'));
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/events/a');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/events/a/submit');
  });

  it('clears identity and offers sign-in when loading fails with an expired session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Session expired.' },
    }, 401)));
    await renderEditPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to edit this event request.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
  });

  it('offers a retry for a transient load failure and hides it once the draft loads', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Down.' } }, 503))
      .mockResolvedValueOnce(jsonResponse(draft));
    vi.stubGlobal('fetch', fetchMock);
    await renderEditPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('This draft could not be loaded. Please try again.');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByDisplayValue('Career fair')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a non-retryable message for an unavailable or forbidden draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'Sensitive server explanation.' },
    }, 404)));
    await renderEditPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This draft is unavailable or you do not have permission to edit it.',
    );
    expect(screen.queryByText('Sensitive server explanation.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('clears the form and reloads private data when the organiser signs out mid-edit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(draft)));
    await renderEditPage();
    await screen.findByDisplayValue('Career fair');

    session.user = null;

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to edit this event request.');
    expect(screen.queryByDisplayValue('Career fair')).not.toBeInTheDocument();
  });
});
