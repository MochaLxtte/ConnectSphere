import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ReviewRequestPage from './ReviewRequestPage.vue';
import type { RecordedReview, ReviewRequestDetail } from '../types';

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

async function renderDetail(id = 'a') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/reviews/:id', component: ReviewRequestPage }],
  });
  await router.push(`/reviews/${id}`);
  await router.isReady();
  return { ...render(ReviewRequestPage, { global: { plugins: [router], stubs: { EventPlanningPanels: true } } }), router };
}

async function chooseApproval() {
  await screen.findByRole('heading', { name: 'Career fair' });
  await fireEvent.click(screen.getByRole('radio', { name: /^Approve request/ }));
  await fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));
}

describe('KAN-33 review request detail page', () => {
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

describe('KAN-36 review page permissions and saved outcomes', () => {
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
