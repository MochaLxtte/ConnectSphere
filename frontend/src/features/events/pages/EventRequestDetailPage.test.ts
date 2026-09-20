import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import type { RecordedReview, ReviewRequestDetail } from '../../reviews/types';
import EventRequestDetailPage from './EventRequestDetailPage.vue';

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

const detail: ReviewRequestDetail = {
  id: 'a', organiserId: 'organiser-1', coordinatorId: 'coordinator-1', status: 'SUBMITTED',
  name: 'Career fair', purpose: 'Hiring', description: 'Annual fair',
  startsAt: '2026-10-01T09:00:00Z', endsAt: '2026-10-01T17:00:00Z',
  expectedAttendance: 200, venueRequirements: 'Hall A', accessibilityNeeds: 'Wheelchair access',
  equipmentRequirements: 'Projector', registrationRequired: true,
  createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-17T17:30:00Z',
  review: null, actions: { canEditDraft: false, canMakeInitialDecision: false },
};

function decidedDetail(decision: RecordedReview['decision'] = 'APPROVED', reason: string | null = 'Suitable event.'): ReviewRequestDetail {
  return {
    ...detail, status: decision,
    review: {
      reviewId: 'review-1', eventRequestId: detail.id, reviewedBy: 'coordinator-1',
      decision, reason, createdAt: '2026-09-17T17:30:00Z',
    },
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

async function resolveResponse(pending: ReturnType<typeof deferredResponse>, response: Response) {
  pending.resolve(response);
  // Drain response parsing and Vue updates before checking that stale reads had no effect.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function field(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: 'dt' });
  const definition = term.nextElementSibling;
  expect(definition?.tagName).toBe('DD');
  return definition as HTMLElement;
}

async function renderDetail(id = 'a') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events/:id', component: EventRequestDetailPage },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  });
  await router.push(`/events/${id}`);
  await router.isReady();
  return { ...render(EventRequestDetailPage, { global: { plugins: [router], stubs: { EventPlanningPanels: true } } }), router };
}

beforeEach(() => {
  session.user = organiser();
  session.loading = false;
});

describe('KAN-16 organiser event request details', () => {
  it.each(['APPROVED', 'REJECTED'] as const)('shows a saved %s outcome and a plain-text reason without editing or decision controls', async (decision) => {
    const reason = '<img src=x onerror=alert(1)>\nReview notes are plain text.';
    const saved = decidedDetail(decision, reason);
    // This is a read-only view even if future server policies allow other actions.
    if (decision === 'REJECTED') saved.actions = { canEditDraft: true, canMakeInitialDecision: true };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(saved));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = await renderDetail();

    expect(await screen.findByRole('heading', { name: 'Career fair' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Event request' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to event requests' })).toHaveAttribute('href', '/events');
    expect(screen.getByRole('heading', { name: 'Review outcome' })).toBeInTheDocument();
    const label = decision === 'APPROVED' ? 'Approved' : 'Rejected';
    expect(field('Status')).toHaveTextContent(label);
    expect(field('Outcome')).toHaveTextContent(label);
    expect(field('Reason')).toHaveTextContent(reason.replace('\n', ' '));
    expect(field('Recorded on')).toHaveTextContent(/18 Sept? 2026/);
    expect(field('Recorded on')).toHaveTextContent(/1:30\s*am/i);
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve|reject|record|edit|submit/i })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/events/a');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([null, '   '])('explains an absent reason (%s) without inventing one', async (reason) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(decidedDetail('REJECTED', reason))));
    await renderDetail();
    await screen.findByRole('heading', { name: 'Career fair' });

    expect(field('Reason')).toHaveTextContent('No reason provided.');
    expect(field('Outcome')).toHaveTextContent('Rejected');
  });

  it.each([
    ['DRAFT', 'This request is still a draft and has not been submitted for review.'],
    ['SUBMITTED', 'No approval or rejection has been recorded yet.'],
    ['CLARIFICATION_REQUESTED', 'No approval or rejection has been recorded yet.'],
    ['APPROVED', 'Review details are unavailable.'],
  ])('describes %s without a recorded review accurately', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...detail, status })));
    await renderDetail();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText('Outcome', { selector: 'dt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('renders request fields while preserving zero, false and missing values', async () => {
    const pending = deferredResponse();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(pending.promise));
    const { container } = await renderDetail();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    await resolveResponse(pending, jsonResponse({
      ...detail, name: '   ', description: null, expectedAttendance: 0, registrationRequired: false,
      accessibilityNeeds: null,
    }));

    expect(await screen.findByRole('heading', { name: 'Untitled event request' })).toBeInTheDocument();
    expect(field('Purpose')).toHaveTextContent('Hiring');
    expect(field('Description')).toHaveTextContent('Not provided');
    expect(field('Expected attendance')).toHaveTextContent(/^0$/);
    expect(field('Registration required')).toHaveTextContent(/^No$/);
    expect(field('Venue requirements')).toHaveTextContent('Hall A');
    expect(field('Accessibility needs')).toHaveTextContent('Not provided');
    expect(field('Equipment requirements')).toHaveTextContent('Projector');
    const updated = container.querySelector('time[datetime="2026-09-17T17:30:00Z"]');
    expect(updated).toHaveTextContent(/18 Sept? 2026/);
    expect(updated).toHaveTextContent(/1:30\s*am/i);
  });

  it('can retry a temporary API failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable.' } }, 503))
      .mockResolvedValueOnce(jsonResponse(detail));
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Career fair' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes the persisted outcome and hides the previous state while loading', async () => {
    const pending = deferredResponse();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockReturnValueOnce(pending.promise));
    await renderDetail();
    await screen.findByRole('heading', { name: 'Career fair' });

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    await resolveResponse(pending, jsonResponse(decidedDetail('REJECTED', 'Venue is unavailable.')));
    expect(await screen.findByText('Venue is unavailable.')).toBeInTheDocument();
    expect(field('Status')).toHaveTextContent('Rejected');
    expect(field('Outcome')).toHaveTextContent('Rejected');
    expect(screen.queryByText('No approval or rejection has been recorded yet.')).not.toBeInTheDocument();
  });

  it.each([403, 404])('removes private fields and outcomes when a refresh returns %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(decidedDetail()))
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'Sensitive server explanation.' } }, status)));
    await renderDetail();
    await screen.findByText('Suitable event.');

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This event request is unavailable or you do not have permission to view it.',
    );
    expect(screen.queryByText('Sensitive server explanation.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByText('Suitable event.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('clears expired identity and private content and offers sign-in after 401', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(decidedDetail()))
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Session expired.' } }, 401)));
    await renderDetail();
    await screen.findByText('Suitable event.');

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to view this event request.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByText('Suitable event.')).not.toBeInTheDocument();
  });

  it('aborts and ignores an old request response after navigating to another request', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(jsonResponse({ ...detail, id: 'b', name: 'Community lunch' }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderDetail();
    const oldSignal = (fetchMock.mock.calls[0]?.[1] as RequestInit).signal;

    await router.push('/events/b');
    expect(await screen.findByRole('heading', { name: 'Community lunch' })).toBeInTheDocument();
    expect(oldSignal?.aborted).toBe(true);
    await resolveResponse(pending, jsonResponse(decidedDetail()));
    expect(screen.getByRole('heading', { name: 'Community lunch' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByText('Suitable event.')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/events/a', '/api/events/b']);
  });

  it('ignores an old account response after the organiser changes', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'Request not found.' } }, 404));
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail();
    const oldSignal = (fetchMock.mock.calls[0]?.[1] as RequestInit).signal;

    session.user = organiser('organiser-2');
    expect(await screen.findByRole('alert')).toHaveTextContent('This event request is unavailable');
    expect(oldSignal?.aborted).toBe(true);
    await resolveResponse(pending, jsonResponse(decidedDetail()));
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByText('Suitable event.')).not.toBeInTheDocument();
  });

  it('clears private details on sign-out and ignores a pending refresh', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(decidedDetail()))
      .mockReturnValueOnce(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail();
    await screen.findByText('Suitable event.');

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    const signal = (fetchMock.mock.calls[1]?.[1] as RequestInit).signal;
    session.user = null;
    await waitFor(() => expect(screen.queryByText('Suitable event.')).not.toBeInTheDocument());
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to view this event request.');
    expect(signal?.aborted).toBe(true);
    await resolveResponse(pending, jsonResponse(decidedDetail()));
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByText('Suitable event.')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts an outstanding read when unmounted', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockReturnValueOnce(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    const view = await renderDetail();
    const signal = (fetchMock.mock.calls[0]?.[1] as RequestInit).signal;
    expect(signal?.aborted).toBe(false);

    view.unmount();
    expect(signal?.aborted).toBe(true);
    await resolveResponse(pending, jsonResponse(decidedDetail()));
    expect(screen.queryByText('Suitable event.')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  describe('CF-03/CF-07 draft actions', () => {
    const draft: ReviewRequestDetail = {
      ...detail, status: 'DRAFT', actions: { canEditDraft: true, canMakeInitialDecision: false },
    };

    it('offers editing and submission only for an editable draft', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(draft)));
      await renderDetail();

      expect(await screen.findByRole('link', { name: 'Edit draft' })).toHaveAttribute('href', '/events/a/edit');
      expect(screen.getByRole('button', { name: 'Submit for review' })).toBeEnabled();
    });

    it('hides the draft actions when the server does not allow editing', async () => {
      const readOnly = { ...draft, actions: { canEditDraft: false, canMakeInitialDecision: false } };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(readOnly)));
      await renderDetail();
      await screen.findByRole('heading', { name: 'Career fair' });

      expect(screen.queryByRole('link', { name: 'Edit draft' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
    });

    it('submits the draft once and then shows the persisted status', async () => {
      const pending = deferredResponse();
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(jsonResponse(draft))
        .mockReturnValueOnce(pending.promise)
        .mockResolvedValueOnce(jsonResponse(detail));
      vi.stubGlobal('fetch', fetchMock);
      await renderDetail();

      await fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));
      const busy = screen.getByRole('button', { name: 'Submitting…' });
      expect(busy).toBeDisabled();
      await fireEvent.click(busy);
      await resolveResponse(pending, jsonResponse({ ...draft, status: 'SUBMITTED' }));

      await waitFor(() => expect(field('Status')).toHaveTextContent('Submitted'));
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/events/a/submit');
      expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
      expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
    });

    it('names the missing details and keeps the draft actions when submission is incomplete', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(jsonResponse(draft))
        .mockResolvedValueOnce(jsonResponse({
          error: { code: 'SUBMISSION_INCOMPLETE', message: 'Incomplete.', missingFields: ['purpose', 'endsAt'] },
        }, 400)));
      await renderDetail();

      await fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Edit the draft to complete these details before submitting: Purpose, Ends.',
      );
      expect(screen.getByRole('button', { name: 'Submit for review' })).toBeEnabled();
      expect(screen.getByRole('link', { name: 'Edit draft' })).toBeInTheDocument();
    });

    it('asks for a refresh when the request can no longer be submitted', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(jsonResponse(draft))
        .mockResolvedValueOnce(jsonResponse({
          error: { code: 'REQUEST_NOT_SUBMITTABLE', message: 'Not a draft.' },
        }, 409)));
      await renderDetail();

      await fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('This request can no longer be submitted.');
    });

    it('clears the session and offers sign-in when submission returns 401', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(jsonResponse(draft))
        .mockResolvedValueOnce(jsonResponse({
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in.' },
        }, 401)));
      await renderDetail();

      await fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));

      expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
      expect(session.user).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    });
  });
});
