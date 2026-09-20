import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import NewEventPage from './NewEventPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

type Role = 'EVENT_ORGANISER' | 'EVENT_COORDINATOR';
const session = authSession as {
  user: { id: string; email: string; displayName: string; role: Role } | null;
  loading: boolean;
};

function user(id = 'organiser-1', role: Role = 'EVENT_ORGANISER') {
  return { id, email: `${id}@example.com`, displayName: 'Test user', role };
}

const created = {
  id: 'draft-1', organiserId: 'organiser-1', coordinatorId: null, status: 'DRAFT',
  name: 'Career fair', purpose: null, description: null, startsAt: null, endsAt: null,
  expectedAttendance: null, venueRequirements: null, accessibilityNeeds: null,
  equipmentRequirements: null, registrationRequired: null, registrationCapacity: null,
  registrationOpensAt: null, registrationClosesAt: null,
  createdAt: '2026-09-19T00:00:00.000Z', updatedAt: '2026-09-19T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events/new', component: NewEventPage },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  });
  await router.push('/events/new');
  await router.isReady();
  return { ...render(NewEventPage, { global: { plugins: [router] } }), router };
}

beforeEach(() => {
  session.user = user();
  session.loading = false;
});

describe('CF-02 new event request page', () => {
  it('shows the request form to a signed-in organiser', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'New event request' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to event requests' })).toHaveAttribute('href', '/events');
    expect(screen.getByLabelText(/^Event name/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  });

  it('waits for the session check before deciding what to show', async () => {
    session.user = null;
    session.loading = true;
    await renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…');
    expect(screen.queryByLabelText(/^Event name/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('asks a signed-out visitor to sign in', async () => {
    session.user = null;
    await renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to create an event request.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText(/^Event name/)).not.toBeInTheDocument();
  });

  it('does not offer the form to other roles', async () => {
    session.user = user('coordinator-1', 'EVENT_COORDINATOR');
    await renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('This page is for event organisers.');
    expect(screen.queryByLabelText(/^Event name/)).not.toBeInTheDocument();
  });

  it('stays on the page after saving a draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(created, 201)));
    const { router } = await renderPage();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');

    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved.'));
    expect(router.currentRoute.value.fullPath).toBe('/events/new');
    expect(screen.getByLabelText(/^Event name/)).toHaveValue('Career fair');
  });

  it('opens the request after it is submitted', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(created, 201))
      .mockResolvedValueOnce(jsonResponse({ ...created, status: 'SUBMITTED' }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderPage();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');

    await fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }));

    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/events/draft-1'));
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/events/draft-1/submit');
  });

  it('replaces the form with a sign-in prompt when the session expires', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in.' },
    }, 401)));
    await renderPage();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');

    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session has expired.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
    expect(screen.queryByLabelText(/^Event name/)).not.toBeInTheDocument();
  });

  it('starts a clean form when a different organiser signs in', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(created, 201));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');
    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved.'));

    session.user = user('organiser-2');

    await waitFor(() => expect(screen.getByLabelText(/^Event name/)).toHaveValue(''));
    // The next save must create the new organiser's own draft, not patch the previous one.
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Open day');
    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/events');
  });
});
