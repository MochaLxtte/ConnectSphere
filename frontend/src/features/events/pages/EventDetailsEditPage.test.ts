import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import EventDetailsEditPage from './EventDetailsEditPage.vue';

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
const user = (role: Role, id = role === 'EVENT_ORGANISER' ? 'organiser-1' : 'coordinator-1') =>
  ({ id, email: `${id}@example.com`, displayName: id, role });

const allFields = [
  'name', 'description', 'purpose', 'startsAt', 'endsAt', 'expectedAttendance', 'venueRequirements',
  'accessibilityNeeds', 'equipmentRequirements', 'registrationRequired', 'registrationCapacity',
  'registrationOpensAt', 'registrationClosesAt',
];

/** Shared `GET /api/events/:id` response for a submitted request awaiting review. */
const submitted = {
  id: 'a', organiserId: 'organiser-1', coordinatorId: 'coordinator-1', status: 'UNDER_REVIEW',
  name: 'Career fair', purpose: 'Hiring', description: 'Annual fair',
  startsAt: '2026-12-01T01:00:00.000Z', endsAt: '2026-12-01T09:00:00.000Z',
  expectedAttendance: 200, venueRequirements: 'Hall A', accessibilityNeeds: null,
  equipmentRequirements: null, registrationRequired: false,
  registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null,
  revision: 7, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', review: null,
  actions: {
    canEditDraft: false, canMakeInitialDecision: false, canEditDetails: true,
    editMode: 'PRE_APPROVAL', editableFields: allFields,
  },
};
const approved = {
  ...submitted, status: 'APPROVED',
  actions: {
    canEditDraft: false, canMakeInitialDecision: false, canEditDetails: true,
    editMode: 'PLANNING', editableFields: ['name', 'description'],
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
const errorResponse = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  jsonResponse({ error: { code, message: `${code} message`, ...extra } }, status);

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events/:id/details', component: EventDetailsEditPage },
      { path: '/:pathMatch(.*)*', component: { template: '<div data-testid="elsewhere" />' } },
    ],
  });
  await router.push('/events/a/details');
  await router.isReady();
  return { ...render({ template: '<router-view />' }, { global: { plugins: [router] } }), router };
}

const patchBody = (fetchMock: ReturnType<typeof vi.fn>) => {
  const call = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH');
  return JSON.parse(String((call![1] as RequestInit).body));
};

beforeEach(() => {
  session.user = user('EVENT_ORGANISER');
  session.loading = false;
});

describe('KAN-66 edit event details', () => {
  it('KAN-66-AC101 lets the owner edit a submitted request and sends only changes with the revision', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(submitted))
      .mockResolvedValueOnce(jsonResponse({ ...submitted, revision: 8 }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderPage();

    expect(await screen.findByDisplayValue('Career fair')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('keeps its status');
    expect(screen.getByLabelText(/^Starts/)).toHaveValue('2026-12-01T09:00');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await fireEvent.input(screen.getByLabelText(/^Purpose/), { target: { value: 'Graduate hiring' } });
    await fireEvent.input(screen.getByLabelText(/^Expected attendance/), { target: { value: '250' } });
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes.');
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/events/a'));
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/events/a');
    expect(patchBody(fetchMock)).toEqual({ purpose: 'Graduate hiring', expectedAttendance: 250, expectedRevision: 7 });
  });

  it('shows registration settings only while registration is required, and clears them otherwise', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        ...submitted, registrationRequired: true, registrationCapacity: 40,
        registrationOpensAt: '2026-11-01T00:00:00.000Z', registrationClosesAt: '2026-11-20T00:00:00.000Z',
      }))
      .mockResolvedValueOnce(jsonResponse(submitted));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    expect(await screen.findByLabelText(/^Registration capacity/)).toHaveValue(40);
    await fireEvent.click(screen.getByRole('radio', { name: 'No registration' }));
    expect(screen.queryByLabelText(/^Registration capacity/)).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(patchBody(fetchMock)).toEqual({
      registrationRequired: false, registrationCapacity: null, registrationOpensAt: null,
      registrationClosesAt: null, expectedRevision: 7,
    });
  });

  it('KAN-66-AC102 shows only name and description to the coordinator of an approved event', async () => {
    session.user = user('EVENT_COORDINATOR');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(approved))
      .mockResolvedValueOnce(jsonResponse({ ...approved, name: 'Career fair 2026', revision: 8 }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderPage();

    expect(await screen.findByLabelText(/^Event name/)).toHaveValue('Career fair');
    expect(screen.getByLabelText(/^Description/)).toHaveValue('Annual fair');
    expect(screen.queryByLabelText(/^Purpose/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Starts/)).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('need a reviewed change request');

    await fireEvent.input(screen.getByLabelText(/^Event name/), { target: { value: 'Career fair 2026' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/reviews/a'));
    expect(patchBody(fetchMock)).toEqual({ name: 'Career fair 2026', expectedRevision: 7 });
  });

  it('refuses to clear a required detail before sending anything', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(submitted));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();
    const name = await screen.findByLabelText(/^Event name/);

    await fireEvent.input(name, { target: { value: '  ' } });
    await fireEvent.input(screen.getByLabelText(/^Expected attendance/), { target: { value: '-3' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Event name is required for a submitted request.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number of 0 or more.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Check the highlighted details');
    await waitFor(() => expect(name).toHaveFocus());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await fireEvent.input(name, { target: { value: 'Fixed' } });
    expect(screen.queryByText('Event name is required for a submitted request.')).not.toBeInTheDocument();
  });

  it('KAN-66-AC103 explains a stale revision, blocks further saves and reloads the latest details', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(submitted))
      .mockResolvedValueOnce(errorResponse(409, 'EVENT_REVISION_CONFLICT'))
      .mockResolvedValueOnce(jsonResponse({ ...submitted, purpose: 'Changed elsewhere', revision: 8 }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.input(await screen.findByLabelText(/^Purpose/), { target: { value: 'Mine' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('saved a newer version');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await fireEvent.click(screen.getByRole('button', { name: 'Reload latest details' }));
    expect(await screen.findByDisplayValue('Changed elsewhere')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('KAN-66-AC101 shows server submission errors beside the fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(submitted))
      .mockResolvedValueOnce(errorResponse(400, 'SUBMISSION_INVALID', {
        missingFields: ['venueRequirements'], fieldErrors: { endsAt: 'The end must be after the start.' },
      }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.input(await screen.findByLabelText(/^Ends/), { target: { value: '2026-12-01T08:00' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('The end must be after the start.')).toBeInTheDocument();
    expect(screen.getByText('A submitted request must keep this detail.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your changes were not saved.');
  });

  it('handles an incomplete-submission refusal', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(submitted))
      .mockResolvedValueOnce(errorResponse(400, 'SUBMISSION_INCOMPLETE', { missingFields: ['purpose', 'other'] })));
    await renderPage();
    await fireEvent.input(await screen.findByLabelText(/^Purpose/), { target: { value: 'x' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('A submitted request must keep this detail.')).toBeInTheDocument();
  });

  it.each([
    [409, 'SIGNIFICANT_CHANGE_REQUIRED', 'need a reviewed change request', false],
    [403, 'EDIT_ROLE_NOT_PERMITTED', 'can no longer be edited by you here', true],
    [409, 'EVENT_NOT_EDITABLE', 'can no longer be edited by you here', true],
    [500, 'INTERNAL_ERROR', 'could not be saved', false],
  ] as const)('explains a %i %s refusal', async (status, code, message, offersReload) => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(submitted))
      .mockResolvedValueOnce(errorResponse(status, code)));
    await renderPage();
    await fireEvent.input(await screen.findByLabelText(/^Description/), { target: { value: 'New' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(!!screen.queryByRole('button', { name: 'Reload latest details' })).toBe(offersReload);
  });

  it('sends the user to sign in when the session expired while saving', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(submitted))
      .mockResolvedValueOnce(errorResponse(401, 'AUTHENTICATION_REQUIRED')));
    await renderPage();
    await fireEvent.input(await screen.findByLabelText(/^Description/), { target: { value: 'New' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('explains that a draft is edited elsewhere, and that closed requests cannot be edited', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      ...submitted, status: 'DRAFT',
      actions: { canEditDraft: true, canMakeInitialDecision: false, canEditDetails: false, editMode: 'DRAFT', editableFields: allFields },
    })));
    const first = await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Drafts are edited from the draft page.');
    expect(screen.getByRole('link', { name: 'Edit draft' })).toHaveAttribute('href', '/events/a/edit');
    first.unmount();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      ...submitted, status: 'REJECTED',
      actions: { canEditDraft: false, canMakeInitialDecision: false, canEditDetails: false, editMode: null, editableFields: [] },
    })));
    await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('You cannot edit this rejected request here.');
    expect(screen.getByRole('link', { name: 'View request' })).toHaveAttribute('href', '/events/a');
  });

  it.each([
    [404, 'This event request is unavailable', false],
    [500, 'could not be loaded', true],
  ] as const)('explains a %i load failure', async (status, message, retryable) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(status, 'X')));
    await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(!!screen.queryByRole('button', { name: 'Try again' })).toBe(retryable);
  });

  it('asks the user to sign in after a 401 load, and when the session ends', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(401, 'AUTHENTICATION_REQUIRED')));
    await renderPage();
    expect(await screen.findByText('Sign in to edit this event request.')).toBeInTheDocument();
  });

  it('reloads for a new account and shows sign-in after sign-out', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(submitted));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();
    await screen.findByDisplayValue('Career fair');
    session.user = user('EVENT_ORGANISER', 'organiser-2');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    session.user = null;
    expect(await screen.findByText('Sign in to edit this event request.')).toBeInTheDocument();
  });

  it('warns before leaving with unsaved changes only', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(submitted)));
    await renderPage();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    await fireEvent.input(await screen.findByLabelText(/^Description/), { target: { value: 'Changed' } });
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});
