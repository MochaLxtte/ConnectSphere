import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import type { EventDraftInput, SavedEventRequest } from '../api/event-requests';
import EventRequestForm from './EventRequestForm.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string } | null; loading: boolean };

const empty: EventDraftInput = {
  name: null, purpose: null, description: null, startsAt: null, endsAt: null,
  expectedAttendance: null, venueRequirements: null, accessibilityNeeds: null,
  equipmentRequirements: null, registrationRequired: null, registrationCapacity: null,
  registrationOpensAt: null, registrationClosesAt: null,
};

function saved(fields: Partial<EventDraftInput> = {}, status = 'DRAFT'): SavedEventRequest {
  return {
    ...empty, ...fields, id: 'draft-1', organiserId: 'organiser-1', coordinatorId: null, status,
    createdAt: '2026-09-19T00:00:00.000Z', updatedAt: '2026-09-19T00:00:00.000Z',
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((fulfil) => { resolve = fulfil; });
  return { promise, resolve };
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>, call: number): unknown {
  return JSON.parse(String((fetchMock.mock.calls[call]?.[1] as RequestInit).body));
}

function renderForm(request?: { id: string } & Partial<EventDraftInput>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  });
  return render(EventRequestForm, { props: request ? { request } : {}, global: { plugins: [router] } });
}

const saveButton = () => screen.getByRole('button', { name: 'Save draft' });
const submitButton = () => screen.getByRole('button', { name: 'Submit for review' });

beforeEach(() => {
  session.user = { id: 'organiser-1' };
});

describe('CF-02/CF-03 event request form', () => {
  it('labels every event field and only asks for registration settings when registration is required', async () => {
    renderForm();

    for (const label of [/^Event name/, /^Purpose/, /^Description/, /^Starts/, /^Ends/, /^Expected attendance/,
      /^Venue requirements/, /^Accessibility needs/, /^Equipment requirements/]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('radiogroup', { name: /Do attendees need to register/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Registration capacity/)).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('radio', { name: 'Registration required' }));
    expect(screen.getByLabelText(/^Registration capacity/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Registration opens/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Registration closes/)).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('radio', { name: 'No registration' }));
    expect(screen.queryByLabelText(/^Registration capacity/)).not.toBeInTheDocument();
  });

  it('has nothing to save or submit until something is entered', async () => {
    renderForm();
    expect(saveButton()).toBeDisabled();
    expect(submitButton()).toBeDisabled();

    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');
    expect(saveButton()).toBeEnabled();
    expect(submitButton()).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes.');
  });

  it('creates the draft on the first save, then patches only later changes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(saved({
        name: 'Career fair', startsAt: '2026-10-01T01:00:00.000Z', expectedAttendance: 200,
      }), 201))
      .mockResolvedValueOnce(jsonResponse(saved({
        name: 'Career fair', purpose: 'Hiring', startsAt: '2026-10-01T01:00:00.000Z', expectedAttendance: 200,
      })));
    vi.stubGlobal('fetch', fetchMock);
    const { emitted } = renderForm();

    await fireEvent.update(screen.getByLabelText(/^Event name/), '  Career fair ');
    await fireEvent.update(screen.getByLabelText(/^Starts/), '2026-10-01T09:00');
    await fireEvent.update(screen.getByLabelText(/^Expected attendance/), '200');
    await fireEvent.click(saveButton());

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved.'));
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/events');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
    // Singapore wall time is sent as an absolute instant; untouched fields are left out.
    expect(sentBody(fetchMock, 0)).toEqual({
      name: 'Career fair', startsAt: '2026-10-01T01:00:00.000Z', expectedAttendance: 200,
    });
    expect(emitted().saved).toEqual([['draft-1']]);
    expect(saveButton()).toBeDisabled();

    await fireEvent.update(screen.getByLabelText(/^Purpose/), 'Hiring');
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes.');
    await fireEvent.click(saveButton());

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved.'));
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/events/draft-1');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PATCH' });
    expect(sentBody(fetchMock, 1)).toEqual({ purpose: 'Hiring' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('disables the form and ignores repeat clicks while saving', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    renderForm();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');

    await fireEvent.click(saveButton());

    const busy = screen.getByRole('button', { name: 'Saving…' });
    expect(busy).toBeDisabled();
    expect(submitButton()).toBeDisabled();
    expect(screen.getByLabelText(/^Event name/)).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Saving your draft…');
    await fireEvent.click(busy);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    pending.resolve(jsonResponse(saved({ name: 'Career fair' }), 201));
    await waitFor(() => expect(screen.getByLabelText(/^Event name/)).toBeEnabled());
  });

  it('refuses an end that is not after the start without calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderForm();
    await fireEvent.update(screen.getByLabelText(/^Starts/), '2026-10-01T09:00');
    await fireEvent.update(screen.getByLabelText(/^Ends/), '2026-10-01T09:00');

    await fireEvent.click(saveButton());

    const ends = screen.getByLabelText(/^Ends/);
    expect(await screen.findByText('The end must be after the start.')).toBeInTheDocument();
    expect(ends).toHaveAttribute('aria-invalid', 'true');
    expect(ends).toHaveAccessibleDescription('The end must be after the start.');
    await waitFor(() => expect(ends).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();

    await fireEvent.update(ends, '2026-10-01T17:00');
    expect(screen.queryByText('The end must be after the start.')).not.toBeInTheDocument();
  });

  it('refuses a registration window that closes before it opens', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderForm();
    await fireEvent.click(screen.getByRole('radio', { name: 'Registration required' }));
    await fireEvent.update(screen.getByLabelText(/^Registration opens/), '2026-09-25T09:00');
    await fireEvent.update(screen.getByLabelText(/^Registration closes/), '2026-09-24T09:00');

    await fireEvent.click(submitButton());

    expect(await screen.findByText('Registration must close after it opens.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves first, then submits and reports the submitted request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(saved({ name: 'Career fair' }), 201))
      .mockResolvedValueOnce(jsonResponse(saved({ name: 'Career fair' }, 'SUBMITTED')));
    vi.stubGlobal('fetch', fetchMock);
    const { emitted } = renderForm();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');

    await fireEvent.click(submitButton());

    await waitFor(() => expect(emitted().submitted).toEqual([['draft-1']]));
    expect(fetchMock.mock.calls.map((call) => [call[0], (call[1] as RequestInit).method])).toEqual([
      ['/api/events', 'POST'], ['/api/events/draft-1/submit', 'POST'],
    ]);
  });

  it('shows the missing fields beside their inputs and keeps the saved draft', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(saved({ name: 'Career fair' }), 201))
      .mockResolvedValueOnce(jsonResponse({
        error: { code: 'SUBMISSION_INCOMPLETE', message: 'Incomplete.', missingFields: ['purpose', 'venueRequirements'] },
      }, 400))
      .mockResolvedValueOnce(jsonResponse(saved({ name: 'Career fair', purpose: 'Hiring' })))
      .mockResolvedValueOnce(jsonResponse(saved({ name: 'Career fair' }, 'SUBMITTED')));
    vi.stubGlobal('fetch', fetchMock);
    const { emitted } = renderForm();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');

    await fireEvent.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your draft is saved. Complete these details before submitting: Purpose, Venue requirements.',
    );
    const purpose = screen.getByLabelText(/^Purpose/);
    expect(purpose).toHaveAttribute('aria-invalid', 'true');
    expect(purpose).toHaveAccessibleDescription(/Complete this before submitting\./);
    expect(screen.getByLabelText(/^Venue requirements/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Event name/)).not.toHaveAttribute('aria-invalid');
    await waitFor(() => expect(purpose).toHaveFocus());
    expect(emitted().submitted).toBeUndefined();

    // The draft already exists, so the retry patches it instead of creating a second one.
    await fireEvent.update(purpose, 'Hiring');
    expect(purpose).not.toHaveAttribute('aria-invalid');
    await fireEvent.click(submitButton());
    await waitFor(() => expect(emitted().submitted).toEqual([['draft-1']]));
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/events/draft-1');
    expect(sentBody(fetchMock, 2)).toEqual({ purpose: 'Hiring' });
  });

  it('prefills a saved draft in Singapore time and submits it without an unnecessary save', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(saved({}, 'SUBMITTED')));
    vi.stubGlobal('fetch', fetchMock);
    const { emitted } = renderForm({
      id: 'draft-1', ...empty, name: 'Career fair', startsAt: '2026-10-01T01:00:00Z',
      endsAt: '2026-10-01T16:30:00.000Z', expectedAttendance: 0, registrationRequired: true,
      registrationCapacity: 50, registrationOpensAt: '2026-09-20T01:00:00.000Z',
    });

    expect(screen.getByLabelText(/^Event name/)).toHaveValue('Career fair');
    expect(screen.getByLabelText(/^Starts/)).toHaveValue('2026-10-01T09:00');
    expect(screen.getByLabelText(/^Ends/)).toHaveValue('2026-10-02T00:30');
    expect(screen.getByLabelText(/^Expected attendance/)).toHaveValue(0);
    expect(screen.getByRole('radio', { name: 'Registration required' })).toBeChecked();
    expect(screen.getByLabelText(/^Registration capacity/)).toHaveValue(50);
    expect(screen.getByLabelText(/^Registration opens/)).toHaveValue('2026-09-20T09:00');
    expect(saveButton()).toBeDisabled();

    await fireEvent.click(submitButton());

    await waitFor(() => expect(emitted().submitted).toEqual([['draft-1']]));
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/events/draft-1/submit', expect.anything());
  });

  it('clears fields explicitly and drops registration settings when registration is not required', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(saved({ name: 'Career fair', registrationRequired: false })));
    vi.stubGlobal('fetch', fetchMock);
    renderForm({
      id: 'draft-1', ...empty, name: 'Career fair', description: 'Annual fair',
      registrationRequired: true, registrationCapacity: 50,
    });

    await fireEvent.update(screen.getByLabelText(/^Description/), '   ');
    await fireEvent.click(screen.getByRole('radio', { name: 'No registration' }));
    await fireEvent.click(saveButton());

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved.'));
    expect(sentBody(fetchMock, 0)).toEqual({
      description: null, registrationRequired: false, registrationCapacity: null,
    });
  });

  it('never clears registration settings that the API did not report', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(saved({ name: 'Renamed' })));
    vi.stubGlobal('fetch', fetchMock);
    const { registrationCapacity: _c, registrationOpensAt: _o, registrationClosesAt: _x, ...reported } = empty;
    renderForm({ id: 'draft-1', ...reported, name: 'Career fair' });

    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Renamed');
    await fireEvent.click(saveButton());

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved.'));
    expect(sentBody(fetchMock, 0)).toEqual({ name: 'Renamed' });
  });

  it('clears the session and reports expiry after 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in.' },
    }, 401)));
    const { emitted } = renderForm();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');

    await fireEvent.click(saveButton());

    await waitFor(() => expect(emitted().sessionExpired).toHaveLength(1));
    expect(session.user).toBeNull();
  });

  it('locks the form and links to the request once it is no longer a draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'DRAFT_NOT_EDITABLE', message: 'No longer a draft.' },
    }, 409)));
    renderForm({ id: 'draft-1', ...empty, name: 'Career fair' });
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Renamed');

    await fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('This request is no longer an editable draft');
    expect(screen.getByRole('link', { name: 'View this request' })).toHaveAttribute('href', '/events/draft-1');
    expect(saveButton()).toBeDisabled();
    expect(submitButton()).toBeDisabled();
    expect(screen.getByLabelText(/^Event name/)).toBeDisabled();
  });

  it.each([
    ['NO_AVAILABLE_COORDINATOR', 'No event coordinator is currently available. Your request is still a draft. Please try again later.'],
    ['DRAFT_ALREADY_ASSIGNED', 'This draft already has a coordinator assignment. Ask the team to check its assignment before submitting.'],
  ])('KAN-29 keeps the saved draft editable after %s and can retry once the conflict is resolved', async (code, message) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(saved({ name: 'Career fair' }), 201))
      .mockResolvedValueOnce(jsonResponse({ error: { code, message } }, 409))
      .mockResolvedValueOnce(jsonResponse(saved({ name: 'Career fair', purpose: 'Hiring' })))
      .mockResolvedValueOnce(jsonResponse({ ...saved({ name: 'Career fair', purpose: 'Hiring' }, 'SUBMITTED'), coordinatorId: 'casey' }));
    vi.stubGlobal('fetch', fetchMock);
    const { emitted } = renderForm();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');
    await fireEvent.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText(/^Event name/)).toBeEnabled();
    expect(screen.getByLabelText(/^Event name/)).toHaveValue('Career fair');
    expect(submitButton()).toBeEnabled();
    expect(screen.queryByRole('link', { name: 'View this request' })).not.toBeInTheDocument();
    expect(emitted().submitted).toBeUndefined();

    // Editing and saving is still allowed; subsequent submission reuses this draft.
    await fireEvent.update(screen.getByLabelText(/^Purpose/), 'Hiring');
    expect(saveButton()).toBeEnabled();
    await fireEvent.click(saveButton());
    await waitFor(() => expect(emitted().saved).toEqual([['draft-1']]));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await fireEvent.click(submitButton());

    await waitFor(() => expect(emitted().submitted).toEqual([['draft-1']]));
    expect(fetchMock.mock.calls.map((call) => [call[0], (call[1] as RequestInit).method])).toEqual([
      ['/api/events', 'POST'], ['/api/events/draft-1/submit', 'POST'],
      ['/api/events/draft-1', 'PATCH'], ['/api/events/draft-1/submit', 'POST'],
    ]);
    expect(sentBody(fetchMock, 2)).toEqual({ purpose: 'Hiring' });
  });

  it('keeps the entered details and allows a retry after a failed save', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(jsonResponse(saved({ name: 'Career fair' }), 201));
    vi.stubGlobal('fetch', fetchMock);
    renderForm();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');

    await fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Your draft could not be saved.');
    expect(screen.getByLabelText(/^Event name/)).toHaveValue('Career fair');
    await fireEvent.click(saveButton());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved.'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains an uncertain submission without losing the saved draft', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(saved({ name: 'Career fair' }), 201))
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected.' } }, 500));
    vi.stubGlobal('fetch', fetchMock);
    const { emitted } = renderForm();
    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');

    await fireEvent.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Your draft is saved, but we could not confirm');
    expect(emitted().submitted).toBeUndefined();
    expect(saveButton()).toBeDisabled();
  });

  it('warns before the browser discards unsaved changes', async () => {
    renderForm();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    await fireEvent.update(screen.getByLabelText(/^Event name/), 'Career fair');
    const unsaved = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unsaved);
    expect(unsaved.defaultPrevented).toBe(true);
  });
});
