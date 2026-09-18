import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import type { EventRequestDetail } from '../api/event-requests';
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

const draft: EventRequestDetail = {
  id: 'a', organiserId: 'organiser-1', coordinatorId: null, status: 'DRAFT',
  name: 'Career fair', purpose: 'Hiring', description: 'Annual fair',
  startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T09:00:00.000Z',
  expectedAttendance: 200, venueRequirements: 'Hall A', accessibilityNeeds: 'Wheelchair access',
  equipmentRequirements: 'Projector', registrationRequired: true,
  createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-17T17:30:00Z',
  review: null, actions: { canEditDraft: true, canMakeInitialDecision: false },
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
  return { ...render(EventDraftEditPage, { global: { plugins: [router] } }), router };
}

beforeEach(() => {
  session.user = organiser();
  session.loading = false;
});

describe('KAN-34 draft editing', () => {
  it('populates the form from the loaded draft, converting times to Singapore local input values', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(draft)));
    await renderEditPage();

    expect(await screen.findByDisplayValue('Career fair')).toBeInTheDocument();
    expect(screen.getByLabelText('Purpose')).toHaveValue('Hiring');
    expect(screen.getByLabelText('Description')).toHaveValue('Annual fair');
    expect(screen.getByLabelText('Starts')).toHaveValue('2026-10-01T09:00');
    expect(screen.getByLabelText('Ends')).toHaveValue('2026-10-01T17:00');
    expect(screen.getByLabelText('Expected attendance')).toHaveValue(200);
    expect(screen.getByLabelText('Venue requirements')).toHaveValue('Hall A');
    expect(screen.getByLabelText('Accessibility needs')).toHaveValue('Wheelchair access');
    expect(screen.getByLabelText('Equipment requirements')).toHaveValue('Projector');
    expect(screen.getByLabelText('Registration required')).toHaveValue('true');
  });

  it('preserves zero, false and blank/null values instead of treating them as unset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      ...draft, name: null, description: null, expectedAttendance: 0, registrationRequired: false,
      startsAt: null, endsAt: null,
    })));
    await renderEditPage();

    expect(await screen.findByLabelText('Event name')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('Expected attendance')).toHaveValue(0);
    expect(screen.getByLabelText('Registration required')).toHaveValue('false');
    expect(screen.getByLabelText('Starts')).toHaveValue('');
    expect(screen.getByLabelText('Ends')).toHaveValue('');
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
    expect(screen.queryByLabelText('Event name')).not.toBeInTheDocument();
  });

  it('saves edited fields as a PATCH, converting Singapore local times back to UTC instants', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(draft))
      .mockResolvedValueOnce(jsonResponse({ ...draft, name: 'Career fair 2026', accessibilityNeeds: null }));
    vi.stubGlobal('fetch', fetchMock);
    await renderEditPage();
    await screen.findByDisplayValue('Career fair');

    await fireEvent.update(screen.getByLabelText('Event name'), 'Career fair 2026');
    await fireEvent.update(screen.getByLabelText('Accessibility needs'), '');
    await fireEvent.update(screen.getByLabelText('Starts'), '2026-11-05T10:30');
    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Draft saved.')).toBeInTheDocument();
    const [path, options] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(path).toBe('/api/events/a');
    expect(options.method).toBe('PATCH');
    const body = JSON.parse(options.body as string);
    expect(body).toMatchObject({
      name: 'Career fair 2026',
      accessibilityNeeds: null,
      startsAt: '2026-11-05T02:30:00.000Z',
      purpose: 'Hiring',
      expectedAttendance: 200,
      registrationRequired: true,
    });
    expect(await screen.findByDisplayValue('Career fair 2026')).toBeInTheDocument();
  });

  it('shows a save error and keeps the entered values when the save fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(draft))
      .mockResolvedValueOnce(jsonResponse({
        error: { code: 'DRAFT_NOT_EDITABLE', message: 'This event request is no longer a draft and cannot be edited.' },
      }, 409));
    vi.stubGlobal('fetch', fetchMock);
    await renderEditPage();
    await screen.findByDisplayValue('Career fair');

    await fireEvent.update(screen.getByLabelText('Event name'), 'Renamed while someone else submitted it');
    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This request is no longer a draft and can no longer be edited here. Reload to see its current status.',
    );
    expect(screen.getByLabelText('Event name')).toHaveValue('Renamed while someone else submitted it');
    expect(screen.queryByRole('status', { name: /saved/i })).not.toBeInTheDocument();
  });

  it('clears identity and offers sign-in when a save fails with an expired session', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(draft))
      .mockResolvedValueOnce(jsonResponse({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Session expired.' },
      }, 401));
    vi.stubGlobal('fetch', fetchMock);
    await renderEditPage();
    await screen.findByDisplayValue('Career fair');

    await fireEvent.update(screen.getByLabelText('Event name'), 'Still editing');
    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to edit this event request.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
    expect(screen.queryByLabelText('Event name')).not.toBeInTheDocument();
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
});
