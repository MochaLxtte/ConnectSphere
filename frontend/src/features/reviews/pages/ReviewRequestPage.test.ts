import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ReviewRequestPage from './ReviewRequestPage.vue';
import ReviewAccessPage from './ReviewAccessPage.vue';
import { authSession, type SignedInUser } from '../../auth/session.js';
import type { RecordedReview, ReviewRequestDetail } from '../types';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
beforeEach(() => {
  session.user = { id: 'coordinator-1', email: 'coordinator@example.test', displayName: 'Coordinator', role: 'EVENT_COORDINATOR' };
  session.loading = false;
});

const detail: ReviewRequestDetail = {
  id: 'a', organiserId: 'org-1', coordinatorId: 'coordinator-1', status: 'SUBMITTED',
  name: 'Career fair', purpose: 'Hiring', description: 'Annual fair', startsAt: '2026-10-01T09:00:00Z',
  endsAt: '2026-10-01T17:00:00Z', expectedAttendance: 200, venueRequirements: 'Hall A',
  accessibilityNeeds: 'Wheelchair access', equipmentRequirements: 'Projector',
  registrationRequired: true, createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
  review: null, actions: { canEditDraft: false, canMakeInitialDecision: true },
};

function recordedReview(decision: RecordedReview['decision'] = 'APPROVED'): RecordedReview {
  return {
    reviewId: 'r1', eventRequestId: 'a', reviewedBy: 'coordinator-1', decision,
    reason: 'Fits the event requirements.', createdAt: '2026-09-15T10:00:00Z',
  };
}

function decidedDetail(review = recordedReview()): ReviewRequestDetail {
  return {
    ...detail, status: review.decision, review,
    actions: { canEditDraft: false, canMakeInitialDecision: false },
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
  // Drain response parsing and Vue updates before asserting that stale work had no effect.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const planningPanel = {
  props: ['eventRequestId', 'status'], emits: ['changed'],
  template: '<section><label>Planning notes<input /></label><span data-testid="planning-context">{{ eventRequestId }}: {{ status }}</span><button @click="$emit(\'changed\')">Saved planning change</button></section>',
};

async function renderDetail(id = 'a', withPlanning = false, withAccessShell = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: withAccessShell
      ? [{ path: '/reviews', component: ReviewAccessPage, children: [{ path: ':id', component: ReviewRequestPage }] }]
      : [{ path: '/reviews/:id', component: ReviewRequestPage }],
  });
  await router.push(`/reviews/${id}`);
  await router.isReady();
  return { ...render(withAccessShell ? { template: '<RouterView />' } : ReviewRequestPage, {
    global: { plugins: [router], stubs: { EventPlanningPanels: withPlanning ? planningPanel : true } },
  }), router };
}

async function chooseApproval() {
  await screen.findByRole('heading', { name: 'Career fair' });
  await fireEvent.click(screen.getByRole('radio', { name: /^Approve request/ }));
  await fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));
}

describe('KAN-33 review request detail page', () => {
  it('KAN-65 removes stale detail after reassignment denies a review write', async () => {
    const denied = { error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' } };
    const fetch = vi.fn().mockResolvedValueOnce(jsonResponse(detail))
      .mockResolvedValueOnce(jsonResponse(denied, 404)).mockResolvedValue(jsonResponse(denied, 404));
    vi.stubGlobal('fetch', fetch);
    await renderDetail(); await chooseApproval();
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable or you do not have permission');
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });
  it('KAN-8 links the coordinator to booking outcomes for this event', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)));
    await renderDetail();
    expect(await screen.findByRole('link', { name: 'View venue booking requests and decisions' }))
      .toHaveAttribute('href', '/venue-bookings?eventRequestId=a');
  });

  it('KAN-51 links to venue availability for the Singapore week of the proposed start', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...detail, startsAt: '2026-10-04T16:30:00Z' })));
    await renderDetail();

    // 16:30 UTC on 4 October is 00:30 on Monday 5 October in Singapore.
    expect(await screen.findByRole('link', { name: 'Check venue availability for this week' }))
      .toHaveAttribute('href', '/venues/availability?week=2026-10-05');
  });

  it('KAN-51 offers no venue availability link when the request has no proposed start', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...detail, startsAt: null })));
    await renderDetail();

    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.queryByRole('link', { name: 'Check venue availability for this week' })).not.toBeInTheDocument();
  });

  it('displays the submitted request fields required for review', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)));
    await renderDetail();

    expect(await screen.findByRole('heading', { name: 'Career fair' })).toBeInTheDocument();
    expect(screen.getByText('Hiring')).toBeInTheDocument();
    expect(screen.getByText('Annual fair')).toBeInTheDocument();
    expect(screen.getByText('Hall A')).toBeInTheDocument();
    expect(screen.getByText('Wheelchair access')).toBeInTheDocument();
    expect(screen.getByText('Projector')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Record a decision' })).toBeInTheDocument();
  });

  it('shows the masked not-found message without leaking that the request exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'The event request was not found.' } }, 404),
      ),
    );
    await renderDetail();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This event request is unavailable or you do not have permission to review it.',
    );
  });

});

describe('KAN-66 review page revisions and coordinator edits', () => {
  it('KAN-66-AC101 sends the displayed revision and asks for a refresh after an organiser edit', async () => {
    const conflict = { error: { code: 'EVENT_REVISION_CONFLICT', message: 'Changed.' } };
    const fetch = vi.fn().mockResolvedValueOnce(jsonResponse({ ...detail, revision: 5 }))
      .mockResolvedValueOnce(jsonResponse(conflict, 409));
    vi.stubGlobal('fetch', fetch);
    await renderDetail(); await chooseApproval();
    expect(await screen.findByRole('alert')).toHaveTextContent('The organiser changed this request after you opened it.');
    const post = fetch.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(String(post[1].body))).toEqual({ decision: 'APPROVED', reason: null, expectedRevision: 5 });
    expect(screen.getByRole('button', { name: 'Refresh request' })).toBeInTheDocument();
  });

  it('KAN-66-AC102 links the assigned coordinator to the name/description edit only when offered', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      ...decidedDetail(), revision: 2,
      actions: { canEditDraft: false, canMakeInitialDecision: false, canEditDetails: true, editMode: 'PLANNING', editableFields: ['name', 'description'] },
    })));
    const { unmount } = await renderDetail();
    expect(await screen.findByRole('link', { name: 'Edit name or description' })).toHaveAttribute('href', '/events/a/details');
    unmount();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)));
    await renderDetail();
    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.queryByRole('link', { name: 'Edit name or description' })).not.toBeInTheDocument();
  });
});

describe('KAN-36 review page permissions and saved outcomes', () => {
  it('KAN-36/KAN-60 formats proposed times in Singapore across a date boundary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)));
    await renderDetail();
    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.getByText('All dates and times are in Singapore time.')).toBeInTheDocument();
    expect(screen.getByText('1 Oct 2026, 5:00 pm')).toBeInTheDocument();
    expect(screen.getByText('2 Oct 2026, 1:00 am')).toBeInTheDocument();
    expect(screen.queryByText(detail.startsAt!)).not.toBeInTheDocument();
    expect(screen.queryByText(detail.endsAt!)).not.toBeInTheDocument();
  });

  it('KAN-36 keeps missing proposed dates readable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...detail, startsAt: null, endsAt: null })));
    await renderDetail();
    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.getByText('Proposed start').nextElementSibling).toHaveTextContent('Not provided');
    expect(screen.getByText('Proposed end').nextElementSibling).toHaveTextContent('Not provided');
  });

  it.each([false, undefined])('hides decision inputs when the backend action flag is %s', async (canMakeInitialDecision) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      ...detail, actions: { canEditDraft: false, canMakeInitialDecision },
    }));
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail();

    await screen.findByRole('heading', { name: 'Career fair' });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Record/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['APPROVED', 'REJECTED'] as const)('refreshes the detail after %s and keeps its outcome visible on reopening', async (decision) => {
    const review = recordedReview(decision);
    const { createdAt: _createdAt, ...saved } = review;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockResolvedValueOnce(jsonResponse(saved, 201))
      .mockImplementation(async () => jsonResponse(decidedDetail(review)));
    vi.stubGlobal('fetch', fetchMock);
    const view = await renderDetail();

    await screen.findByRole('heading', { name: 'Career fair' });
    await fireEvent.click(screen.getByRole('radio', { name: decision === 'APPROVED' ? /^Approve request/ : /^Reject request/ }));
    await fireEvent.update(screen.getByRole('textbox', { name: /Reason/ }), `  ${review.reason}  `);
    await fireEvent.click(screen.getByRole('button', { name: decision === 'APPROVED' ? 'Record approval' : 'Record rejection' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(decision === 'APPROVED' ? 'Request approved' : 'Request rejected'),
    );
    expect(screen.getByText(decision)).toBeInTheDocument();
    expect(screen.getByText(review.reason!)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    const postCall = fetchMock.mock.calls[1]!;
    expect(postCall[0]).toBe('/api/events/a/reviews');
    expect(JSON.parse((postCall[1] as RequestInit).body as string)).toEqual({
      decision, reason: review.reason,
    });
    expect(fetchMock.mock.calls[2]![0]).toBe('/api/events/a');

    view.unmount();
    await renderDetail();
    expect(await screen.findByText(review.reason!)).toBeInTheDocument();
    expect(screen.getByText(decision)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it('reports a confirmed save separately from a failed refresh and retries only the read', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockResolvedValueOnce(jsonResponse(recordedReview(), 201))
      .mockRejectedValueOnce(new TypeError('Network failure'))
      .mockResolvedValueOnce(jsonResponse(decidedDetail()));
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail();
    await chooseApproval();

    expect(await screen.findByRole('alert')).toHaveTextContent('Your decision was recorded, but the latest request details could not be loaded.');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Request approved')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it.each(['NETWORK_ERROR', 'REVIEW_ALREADY_DECIDED'])('requires a refresh after %s before offering another decision', async (code) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(detail));
    if (code === 'NETWORK_ERROR') fetchMock.mockRejectedValueOnce(new TypeError('Network failure'));
    else fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code, message: 'A decision already exists.' } }, 409));
    fetchMock.mockResolvedValueOnce(jsonResponse(decidedDetail()));
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail();
    await chooseApproval();

    await screen.findByRole('alert');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh request' }));
    expect(await screen.findByText('Request approved')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it.each([
    [401, 'AUTHENTICATION_REQUIRED'],
    [404, 'EVENT_REQUEST_NOT_FOUND'],
  ])('hides stale request details when the post-save refresh returns %s', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockResolvedValueOnce(jsonResponse(recordedReview(), 201))
      .mockResolvedValueOnce(jsonResponse({ error: { code, message: 'Request unavailable.' } }, Number(status))));
    await renderDetail();
    await chooseApproval();

    await screen.findByRole('alert');
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it.each([201, 409])('ignores a late %s write response after navigating to another request', async (status) => {
    const pending = deferredResponse();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(jsonResponse({ ...detail, id: 'b', name: 'Community lunch' }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderDetail();
    await chooseApproval();
    await router.push('/reviews/b');
    await screen.findByRole('heading', { name: 'Community lunch' });

    await resolveResponse(pending, status === 201 ? jsonResponse(recordedReview(), status)
      : jsonResponse({ error: { code: 'REVIEW_ALREADY_DECIDED', message: 'Already decided.' } }, status));
    await waitFor(() => expect(screen.getByRole('radio', { name: /^Approve request/ })).toBeEnabled());
    expect(screen.queryByText('Request approved')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not refresh the page after it has been unmounted during a write', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockReturnValueOnce(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    const view = await renderDetail();
    await chooseApproval();
    view.unmount();

    await resolveResponse(pending, jsonResponse(recordedReview(), 201));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('ignores a late detail read after navigating to another request', async () => {
    const pending = deferredResponse();
    vi.stubGlobal('fetch', vi.fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(jsonResponse({ ...detail, id: 'b', name: 'Community lunch' })));
    const { router } = await renderDetail();
    await router.push('/reviews/b');
    await screen.findByRole('heading', { name: 'Community lunch' });

    await resolveResponse(pending, jsonResponse(detail));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Community lunch' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
  });
});


describe('KAN-33 / KAN-61 / KAN-84 coordinator parent planning refresh', () => {
  it('updates the saved lifecycle status while preserving a different planning form', async () => {
    const pending = deferredResponse();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(decidedDetail())).mockReturnValueOnce(pending.promise));
    await renderDetail('a', true);
    await fireEvent.update(await screen.findByLabelText('Planning notes'), 'Unsaved equipment notes');
    await fireEvent.click(screen.getByRole('button', { name: 'Saved planning change' }));
    expect(screen.getByLabelText('Planning notes')).toHaveValue('Unsaved equipment notes');
    await resolveResponse(pending, jsonResponse({ ...decidedDetail(), status: 'CONFIRMED', revision: 8 }));
    expect(screen.getByTestId('planning-context')).toHaveTextContent('a: CONFIRMED');
    expect(screen.getByText('Status').nextElementSibling).toHaveTextContent('CONFIRMED');
    expect(screen.getByLabelText('Planning notes')).toHaveValue('Unsaved equipment notes');
  });

  it('keeps the newest status after overlapping planning refreshes resolve out of order', async () => {
    const older = deferredResponse();
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(decidedDetail()))
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce(jsonResponse({ ...decidedDetail(), status: 'COMPLETED', revision: 9 }));
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail('a', true);
    await fireEvent.click(await screen.findByRole('button', { name: 'Saved planning change' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Saved planning change' }));
    await waitFor(() => expect(screen.getByTestId('planning-context')).toHaveTextContent('COMPLETED'));
    await resolveResponse(older, jsonResponse({ ...decidedDetail(), status: 'CONFIRMED', revision: 8 }));
    expect(screen.getByText('Status').nextElementSibling).toHaveTextContent('COMPLETED');
    expect(screen.getByTestId('planning-context')).toHaveTextContent('a: COMPLETED');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('ignores an older refresh failure instead of hiding the newest status and form', async () => {
    const older = deferredResponse();
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(decidedDetail()))
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce(jsonResponse({ ...decidedDetail(), status: 'CONFIRMED', revision: 8 }));
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail('a', true);
    await fireEvent.update(await screen.findByLabelText('Planning notes'), 'Keep latest notes');
    await fireEvent.click(screen.getByRole('button', { name: 'Saved planning change' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Saved planning change' }));
    await waitFor(() => expect(screen.getByTestId('planning-context')).toHaveTextContent('CONFIRMED'));
    await resolveResponse(older, jsonResponse({ error: { code: 'REQUEST_FAILED', message: 'Old failure.' } }, 503));
    expect(screen.getByLabelText('Planning notes')).toHaveValue('Keep latest notes');
    expect(screen.getByText('Status').nextElementSibling).toHaveTextContent('CONFIRMED');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([401, 404])('reconciles a denied planning refresh (%s) without retaining coordinator controls', async (status) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(decidedDetail()))
      .mockImplementation(() => Promise.resolve(jsonResponse({ error: {
        code: status === 401 ? 'AUTHENTICATION_REQUIRED' : 'EVENT_REQUEST_NOT_FOUND', message: 'Access expired.',
      } }, status)));
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail('a', true);
    await fireEvent.click(await screen.findByRole('button', { name: 'Saved planning change' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(status === 401 ? 'Access expired.' : 'unavailable or you do not have permission');
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Planning notes')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    if (status === 401) expect(session.user).toBeNull();
    expect(fetchMock.mock.calls.every(([, init]) => (init as RequestInit).method !== 'POST')).toBe(true);
  });

  it.each([200, 503])('ignores a late planning read (%s) after request navigation', async (status) => {
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(decidedDetail()))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(jsonResponse({ ...detail, id: 'b', name: 'Community lunch' }));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderDetail('a', true);
    await fireEvent.click(await screen.findByRole('button', { name: 'Saved planning change' }));
    const signal = (fetchMock.mock.calls[1]?.[1] as RequestInit).signal;
    await router.push('/reviews/b');
    await screen.findByRole('heading', { name: 'Community lunch' });
    expect(signal?.aborted).toBe(true);
    await resolveResponse(pending, status === 200 ? jsonResponse(decidedDetail())
      : jsonResponse({ error: { code: 'REQUEST_FAILED', message: 'Old failure.' } }, status));
    expect(screen.getByTestId('planning-context')).toHaveTextContent('b: SUBMITTED');
    expect(screen.queryByText('Fits the event requirements.')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('the real access shell discards a pending quiet refresh when the coordinator changes', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(decidedDetail()))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'EVENT_REQUEST_NOT_FOUND', message: 'Unavailable.' } }, 404));
    vi.stubGlobal('fetch', fetchMock);
    await renderDetail('a', true, true);
    await fireEvent.click(await screen.findByRole('button', { name: 'Saved planning change' }));
    const signal = (fetchMock.mock.calls[1]?.[1] as RequestInit).signal;
    session.user = { ...session.user!, id: 'coordinator-2' };
    await screen.findByRole('alert');
    expect(signal?.aborted).toBe(true);
    await resolveResponse(pending, jsonResponse(decidedDetail()));
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Planning notes')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('unavailable or you do not have permission');
  });
});
